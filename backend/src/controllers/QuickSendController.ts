// @ts-nocheck
import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";

import Whatsapp from "../models/Whatsapp";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import CrmLead from "../models/CrmLead";
import CompaniesSettings from "../models/CompaniesSettings";
import Campaign from "../models/Campaign";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";
import Tag from "../models/Tag";

import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import { getWbot } from "../libs/wbot";
import { sendButtonMessage, sendListMessage } from "../helpers/SendInteractiveMessage";
import fs from "fs";
import path from "path";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import CreateLogTicketService from "../services/TicketServices/CreateLogTicketService";
import { normalizePhoneNumber } from "../helpers/normalizeContactNumber";
import { Op } from "sequelize";
import logger from "../utils/logger";
import { Mutex } from "async-mutex";
import CreateCampaignService from "../services/CampaignService/CreateService";
import { RestartService as RestartCampaignService } from "../services/CampaignService/RestartService";
import { ImportContacts } from "../services/ContactListService/ImportContacts";

const quickSendMutex = new Mutex();

// ─── Tipagens ──────────────────────────────────────────────────────────────────
interface QuickSendBody {
    number: string;
    message: string;
    whatsappId: number;
    leadId?: number | string;
    name?: string;
    queueId?: number;
    createIfNotExists?: boolean;
    buttons?: string | any[];        // JSON string ou array de InteractiveButton[]
    messageType?: string;            // text | buttons | list | carousel | poll
    carouselCards?: string | any[];  // JSON string ou array de CarouselCard[]
    listButtonText?: string;
    listFooter?: string;
    listSections?: string | any[];
    pollName?: string;
    pollOptions?: string | string[];
    pollSelectableCount?: string | number;
}

interface QuickSendCampaignBody extends QuickSendBody {
    campaignName?: string;
    recipientMode?: "single" | "tags" | "contactList" | "upload";
    contactListId?: string | number;
    tagIds?: string | number[] | number[];
    sendNow?: string | boolean;
    scheduledAt?: string;
}

const parseBoolean = (value: unknown): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        return ["true", "1", "yes", "sim", "on"].includes(value.trim().toLowerCase());
    }
    return false;
};

const parseJsonArray = <T = any>(value: unknown): T[] | null => {
    if (!value) return null;
    if (Array.isArray(value)) return value as T[];
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }
    return null;
};

const getQuickSendCampaignName = (baseName?: string | null, prefix = "Disparo Rápido"): string => {
    const trimmed = String(baseName || "").trim();
    if (trimmed) return trimmed;

    const now = new Date();
    const date = now.toLocaleDateString("pt-BR");
    const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    return `${prefix} - ${date} ${time}`;
};

const createContactListFromContacts = async ({
    companyId,
    name,
    contacts
}: {
    companyId: number;
    name: string;
    contacts: Array<{ name: string; number: string; email?: string; isGroup?: boolean }>;
}) => {
    const record = await ContactList.create({ companyId, name });

    const uniqueContacts = Array.from(
        new Map(
            contacts
                .filter(contact => String(contact.number || "").trim())
                .map(contact => [
                    String(contact.number || "").replace(/\D/g, ""),
                    {
                        name: String(contact.name || contact.number || "").trim(),
                        number: String(contact.number || "").replace(/\D/g, ""),
                        email: String(contact.email || "").trim(),
                        companyId,
                        contactListId: record.id,
                        isWhatsappValid: true,
                        isGroup: Boolean(contact.isGroup)
                    }
                ])
        ).values()
    );

    if (!uniqueContacts.length) {
        await record.destroy();
        throw new AppError("Nenhum contato válido encontrado para criar a lista.", 400);
    }

    await ContactListItem.bulkCreate(uniqueContacts);

    return {
        record,
        contactsCount: uniqueContacts.length
    };
};

const reloadCampaignRecord = async (campaignId: number) => {
    return Campaign.findByPk(campaignId, {
        include: [
            { model: ContactList },
            { model: Whatsapp, attributes: ["id", "name"] }
        ]
    });
};

// ─── Função auxiliar: normaliza número ────────────────────────────────────────
const getAreaCodeFromReference = (reference?: string | null): string => {
    const digits = String(reference || "").replace(/\D/g, "").replace(/^0+/, "");
    const normalized = normalizePhoneNumber(digits) || digits;
    const national = normalized.startsWith("55") ? normalized.slice(2) : normalized;

    return national.length >= 10 ? national.slice(0, 2) : "";
};

const normalizeNumber = (raw: string, referenceNumber?: string | null): string => {
    let digits = raw.replace(/\D/g, "").replace(/^0+/, "");

    if (digits.length === 8 || digits.length === 9) {
        const areaCode = getAreaCodeFromReference(referenceNumber);
        if (areaCode) {
            digits = `${areaCode}${digits}`;
        }
    }

    return normalizePhoneNumber(digits) || digits;
};

/**
 * Gera todas as variantes de um número brasileiro (com e sem o nono dígito).
 * Garante que a busca por contato funcione independentemente do formato armazenado.
 */
const getBrazilianPhoneVariants = (number: string): string[] => {
    const variants = new Set<string>([number]);
    if (!number) return [];

    const hasBrPrefix = number.startsWith("55");
    const national = hasBrPrefix ? number.slice(2) : number;
    const ddd = national.slice(0, 2);
    const subscriber = national.slice(2);

    // Se assinante tem 9 dígitos começando com "9" → adiciona variante sem o nono dígito (8 dígitos)
    if (subscriber.length === 9 && subscriber[0] === "9") {
        const without9 = subscriber.slice(1);
        variants.add(`55${ddd}${without9}`); // com DDI, sem nono
        variants.add(`${ddd}${without9}`);   // sem DDI, sem nono
    }

    // Se assinante tem 8 dígitos → adiciona variante com o nono dígito (9 dígitos)
    if (subscriber.length === 8) {
        const with9 = `9${subscriber}`;
        variants.add(`55${ddd}${with9}`);    // com DDI, com nono
        variants.add(`${ddd}${with9}`);      // sem DDI, com nono
    }

    // Adiciona variantes com/sem prefixo 55
    if (hasBrPrefix) {
        variants.add(national); // sem DDI
    } else if (number.length >= 10) {
        variants.add(`55${number}`); // com DDI
    }

    return Array.from(variants).filter(v => v.length >= 10 && v.length <= 13);
};

// ─── POST /quick-send ─────────────────────────────────────────────────────────
export const quickSend = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;
    const {
        number,
        message,
        whatsappId,
        leadId,
        name,
        queueId,
        createIfNotExists = true,
        buttons: buttonsRaw,
        messageType = 'text',
        carouselCards: carouselRaw,
        listButtonText,
        listFooter,
        listSections: listSectionsRaw,
        pollName,
        pollOptions: pollOptionsRaw,
        pollSelectableCount: pollSelectableCountRaw
    }: QuickSendBody = req.body;

    // Parse botões se enviados
    let parsedButtons: any[] | null = null;
    if (buttonsRaw) {
        try {
            parsedButtons = Array.isArray(buttonsRaw)
                ? buttonsRaw
                : JSON.parse(buttonsRaw as string);
            if (!Array.isArray(parsedButtons) || parsedButtons.length === 0) parsedButtons = null;
        } catch {
            return res.status(400).json({ error: "Campo 'buttons' inválido. Envie um JSON array." });
        }
    }

    // Parse carrossel
    let parsedCarouselCards: any[] | null = null;
    if (carouselRaw) {
        try {
            parsedCarouselCards = Array.isArray(carouselRaw)
                ? carouselRaw
                : JSON.parse(carouselRaw as string);
            if (!Array.isArray(parsedCarouselCards) || parsedCarouselCards.length === 0) parsedCarouselCards = null;
        } catch {
            return res.status(400).json({ error: "Campo 'carouselCards' inválido. Envie um JSON array." });
        }
    }

    let parsedListSections: any[] | null = null;
    if (listSectionsRaw) {
        try {
            parsedListSections = Array.isArray(listSectionsRaw)
                ? listSectionsRaw
                : JSON.parse(listSectionsRaw as string);
            if (!Array.isArray(parsedListSections) || parsedListSections.length === 0) parsedListSections = null;
        } catch {
            return res.status(400).json({ error: "Campo 'listSections' inválido. Envie um JSON array." });
        }
    }

    // Parse enquete
    let parsedPollOptions: string[] | null = null;
    if (pollOptionsRaw) {
        try {
            parsedPollOptions = Array.isArray(pollOptionsRaw)
                ? pollOptionsRaw
                : JSON.parse(pollOptionsRaw as string);
            if (!Array.isArray(parsedPollOptions) || parsedPollOptions.length < 2) parsedPollOptions = null;
        } catch {
            return res.status(400).json({ error: "Campo 'pollOptions' inválido. Envie um JSON array." });
        }
    }
    const pollSelectableCount = parseInt(String(pollSelectableCountRaw || 1)) || 1;

    if (messageType === "list") {
        const hasListItems = (parsedListSections && parsedListSections.length > 0) || (parsedButtons && parsedButtons.length > 0);
        if (!String(message || "").trim() || !String(listButtonText || "").trim() || !hasListItems) {
            return res.status(400).json({ error: "Preencha o texto, o botão e ao menos um item da lista." });
        }
    }

    logger.info({ companyId, userId, number, whatsappId }, "QuickSend request started");

    try {
        let lead: CrmLead | null = null;
        if (leadId) {
            lead = await CrmLead.findOne({
                where: {
                    id: Number(leadId),
                    companyId
                },
                include: [
                    {
                        model: Contact,
                        as: "contact",
                        attributes: ["id", "number", "remoteJid", "name"]
                    }
                ]
            });
        }

        const referenceNumber = lead?.phone || lead?.contact?.number || "";
        const normalizedInput = normalizeNumber(number, referenceNumber);
        // ─── Validação de entrada ──────────────────────────────────────────────────
        const schema = Yup.object().shape({
            number: Yup.string()
                .matches(/^\d{10,15}$/, "Número inválido. Use apenas dígitos (DDD+número, sem código do país ou com 55)")
                .required("Número é obrigatório"),
            message: Yup.string().nullable(),
            whatsappId: Yup.number().required("Selecione uma conexão WhatsApp")
        });

        try {
            await schema.validate({ number: normalizedInput, message, whatsappId });
        } catch (err) {
            logger.warn({ number, err: err.message }, "QuickSend validation failed");
            return res.status(400).json({ error: err.message });
        }

        const normalized = normalizedInput;

        // ─── 1. Verificar conexão WhatsApp (pertence à empresa) ───────────────────
        const whatsapp = await Whatsapp.findOne({
            where: { id: whatsappId, companyId, status: "CONNECTED" }
        });

        if (!whatsapp) {
            logger.warn({ whatsappId, companyId }, "QuickSend: Connection not found or not connected");
            return res.status(404).json({ error: "Conexão WhatsApp não encontrada ou não está conectada." });
        }

        // ─── 2. Verificar se número existe no WhatsApp (validação real) ───────────
        let remoteJid = `${normalized}@s.whatsapp.net`;
        let validatedNumber = normalized;
        // Flag: indica se o número foi confirmado pelo WhatsApp (via onWhatsApp).
        // Quando true, remoteJid contém o JID canônico retornado pelo servidor WhatsApp.
        let whatsappValidated = false;

        try {
            logger.debug({ normalized, whatsappId }, "QuickSend: Checking number on WhatsApp");
            // Usar o whatsappId selecionado para validação
            const checkedNumber = await CheckContactNumber(normalized, companyId, false, whatsappId);
            if (checkedNumber) {
                validatedNumber = checkedNumber;
                remoteJid = `${validatedNumber}@s.whatsapp.net`;
                whatsappValidated = true;
            }
        } catch (err) {
            console.warn(`[QuickSend] Validação opcional de número falhou para ${normalized}:`, err.message);
        }

        // ─── 3. Buscar ou criar contato ───────────────────────────────────────────
        // Busca flexível: inclui variantes com e sem o nono dígito brasileiro
        const numberVariants = [
            ...new Set([
                ...getBrazilianPhoneVariants(validatedNumber),
                ...getBrazilianPhoneVariants(normalized)
            ])
        ];
        const createContactName =
            name ||
            lead?.name ||
            lead?.contact?.name ||
            validatedNumber;

        // O contato do lead pode ter o número no formato antigo (sem nono dígito).
        // Verificamos se é equivalente ao número solicitado antes de aceitar.
        let contact = (lead?.contact && numberVariants.includes(lead.contact.number))
            ? lead.contact
            : null;

        if (!contact) {
            contact = await Contact.findOne({
                where: {
                    companyId,
                    number: { [Op.in]: numberVariants }
                }
            });
        }

        if (!contact) {
            if (!createIfNotExists) {
                return res.status(404).json({ error: "Contato não encontrado." });
            }

            logger.info({ normalized, companyId }, "QuickSend: Creating new contact");
            const settings = await CompaniesSettings.findOne({ where: { companyId } });
            const acceptAudio = settings?.acceptAudioMessageContact === "enabled";

            contact = await CreateOrUpdateContactService({
                name: createContactName,
                number: validatedNumber,
                remoteJid,
                companyId,
                isGroup: false,
                channel: "whatsapp",
                profilePicUrl: "",
                acceptAudioMessage: acceptAudio,
                active: true
            });
        }

        // ─── 4. Buscar ticket aberto ou criar novo ────────────────────────────────
        // Reconcilia contato somente se o número não é equivalente (considerando o nono dígito)
        // ou se nome foi fornecido e difere. Evita reconciliar quando a diferença é apenas o nono dígito.
        const contactNumberVariants = getBrazilianPhoneVariants(validatedNumber);
        const contactNumberIsEquivalent = contact && contactNumberVariants.includes(contact.number);

        // Verifica se os remoteJids são equivalentes (mesma pessoa, diferença só no nono dígito)
        const remoteJidNum = remoteJid.split("@")[0];
        const contactRemoteJidNum = (contact?.remoteJid || "").split("@")[0];
        const remoteJidsAreEquivalent =
            remoteJidNum === contactRemoteJidNum ||
            getBrazilianPhoneVariants(remoteJidNum).includes(contactRemoteJidNum) ||
            getBrazilianPhoneVariants(contactRemoteJidNum).includes(remoteJidNum);

        // Quando o WhatsApp confirmou um JID canônico diferente do remoteJid armazenado
        // (mas ainda equivalentes pelo nono dígito), devemos atualizar o remoteJid do contato
        // para garantir que o envio vá para o destino real atual no WhatsApp.
        // Ex: contato armazenado com "557788719888@s.whatsapp.net" mas WhatsApp retornou
        // "5577988719888@s.whatsapp.net" → força reconciliação para atualizar só o remoteJid.
        const canonicalJidMismatch =
            whatsappValidated &&
            !!contact?.remoteJid &&
            remoteJid !== contact.remoteJid &&
            remoteJidsAreEquivalent; // são variantes do nono dígito, não incompatíveis

        const shouldReconcileContact =
            !contact ||
            (!contactNumberIsEquivalent && contact.number !== validatedNumber) ||
            !remoteJidsAreEquivalent ||
            canonicalJidMismatch ||
            (!!name && contact.name !== name);

        if (shouldReconcileContact) {
            logger.info(
                { normalized, companyId, existingContactId: contact?.id || null },
                "QuickSend: Reconciling contact"
            );

            contact = await CreateOrUpdateContactService({
                name: name || contact?.name || lead?.name || lead?.contact?.name || validatedNumber,
                number: validatedNumber,
                remoteJid,
                companyId,
                isGroup: false,
                channel: "whatsapp",
                profilePicUrl: "",
                whatsappId: Number(whatsappId)
            });
        }

        if (lead) {
            const leadUpdates: Record<string, any> = {};

            if (lead.contactId !== contact.id) {
                leadUpdates.contactId = contact.id;
            }

            if (lead.phone !== validatedNumber) {
                leadUpdates.phone = validatedNumber;
            }

            if (Object.keys(leadUpdates).length > 0) {
                await lead.update(leadUpdates, { hooks: false });
            }
        }

        logger.debug({ contactId: contact.id }, "QuickSend: Seeking or creating ticket");
        
        const io = getIO();

        const ticket = await quickSendMutex.runExclusive(async () => {
             // Usar FindOrCreateTicketService para garantir consistência e evitar duplicados
             const ticket = await FindOrCreateTicketService(
                contact,
                whatsapp,
                0, // unreadMessages
                companyId,
                null,
                null,
                undefined, // groupContact
                "whatsapp" // channel
            );

            // Sempre garantir que o ticket está associado ao usuário correto e aberto
            await UpdateTicketService({
                ticketId: ticket.id,
                companyId,
                ticketData: {
                    status: "open",
                    userId,
                    queueId: queueId || ticket.queueId,
                    whatsappId: whatsapp.id
                }
            });

            if (lead && ticket.crmLeadId !== lead.id) {
                await Ticket.update(
                    { crmLeadId: lead.id },
                    { where: { id: ticket.id, companyId } }
                );
            }

            if (lead && lead.primaryTicketId !== ticket.id) {
                await lead.update({ primaryTicketId: ticket.id }, { hooks: false });
            }

            return await ShowTicketService(ticket.id, companyId);
        });

        // ─── 5. Enviar mensagem ───────────────────────────────────────────────────
        const medias = req.files as Express.Multer.File[];

        try {
            logger.info({ ticketId: ticket.id, hasButtons: !!parsedButtons }, "QuickSend: Sending message(s)");
            const { verifyMessage } = require("../services/WbotServices/wbotMessageListener");

            if (messageType === 'buttons' && parsedButtons && parsedButtons.length > 0) {
                // Envio com botões interativos (formato legado: reply/url/call/copy)
                const wbot = getWbot(Number(whatsappId));
                const sentMsg = await sendButtonMessage(wbot, remoteJid, message || "", "", parsedButtons);
                if (sentMsg?.key) {
                    await verifyMessage(sentMsg, ticket, contact, undefined, false, false, false, true, userId);
                }

            } else if (messageType === 'list' && ((parsedListSections && parsedListSections.length > 0) || (parsedButtons && parsedButtons.length > 0))) {
                const wbot = getWbot(Number(whatsappId));
                const sentMsg = await sendListMessage(
                    wbot,
                    remoteJid,
                    message || "",
                    listButtonText || "Ver opções",
                    parsedListSections || parsedButtons || [],
                    listFooter
                );
                if (sentMsg?.key) {
                    await verifyMessage(sentMsg, ticket, contact, undefined, false, false, false, true, userId);
                }

            } else if (messageType === 'carousel' && parsedCarouselCards && parsedCarouselCards.length > 0) {
                // Envio de carrossel
                const { sendCarouselMessage } = require("../helpers/SendInteractiveMessage");
                const wbot = getWbot(Number(whatsappId));
                const sentMsg = await sendCarouselMessage(wbot, remoteJid, parsedCarouselCards);
                if (sentMsg?.key) {
                    await verifyMessage(sentMsg, ticket, contact, undefined, false, false, false, true, userId);
                }

            } else if (messageType === 'poll' && pollName && parsedPollOptions && parsedPollOptions.length >= 2) {
                // Envio de enquete
                const wbot = getWbot(Number(whatsappId));
                const sentMsg = await wbot.sendMessage(remoteJid, {
                    poll: {
                        name: pollName,
                        values: parsedPollOptions,
                        selectableCount: pollSelectableCount,
                    },
                } as any);
                if (sentMsg?.key) {
                    await verifyMessage(sentMsg, ticket, contact, undefined, false, false, false, true, userId);
                }

            } else if (medias && medias.length > 0) {
                await Promise.all(
                    medias.map(async (media: Express.Multer.File, index: number) => {
                        const bodyMsg = index === 0 ? (message || "") : "";
                        await SendWhatsAppMedia({
                            media,
                            ticket,
                            body: bodyMsg,
                            isPrivate: false,
                            isForwarded: false
                        });

                        const filePath = path.resolve("public", `company${companyId}`, media.filename);
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    })
                );
            } else if (message) {
                const sentMsg = await SendWhatsAppMessage({
                    body: message,
                    ticket,
                    quotedMsg: null
                });
                if (sentMsg && sentMsg.key) {
                    const { verifyMessage } = require("../../services/WbotServices/wbotMessageListener");
                    await verifyMessage(sentMsg, ticket, contact, undefined, false, false, false, true, userId);
                }
            } else {
                logger.debug({ ticketId: ticket.id }, "QuickSend: Ticket created without message.");
            }

            logger.info({ ticketId: ticket.id }, "QuickSend: Message/Media sent successfully");
        } catch (sendErr) {
            logger.error({ ticketId: ticket.id, err: sendErr.message }, "QuickSend: Error sending message");
            return res.status(206).json({
                warning: "Ticket criado, mas houve erro ao enviar a mensagem. Abra o ticket para tentar novamente.",
                ticket,
                sendError: sendErr.message
            });
        }

        logger.info({ ticketId: ticket.id }, "QuickSend request finished");
        return res.status(200).json({
            message: "Mensagem enviada com sucesso!",
            ticket,
            contact
        });

    } catch (err) {
        logger.error({ err: err.message, stack: err.stack }, "QuickSend: Unexpected error");
        return res.status(500).json({ error: "Erro interno no servidor ao processar envio rápido." });
    }
};

// ─── GET /quick-send/connections ─────────────────────────────────────────────
// Lista conexões WhatsApp disponíveis (para o dropdown no modal)
export const createCampaign = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;
    const {
        campaignName,
        recipientMode = "single",
        number,
        name,
        contactListId,
        tagIds: tagIdsRaw,
        whatsappId,
        queueId,
        sendNow: sendNowRaw,
        scheduledAt,
        message,
        messageType = "text",
        buttons: buttonsRaw,
        carouselCards: carouselRaw,
        listSections: listSectionsRaw,
        listButtonText,
        listFooter,
        pollName,
        pollOptions: pollOptionsRaw
    }: QuickSendCampaignBody = req.body;

    const sendNow = parseBoolean(sendNowRaw) || !String(scheduledAt || "").trim();
    const parsedButtons = parseJsonArray(buttonsRaw) || [];
    const parsedCarouselCards = parseJsonArray(carouselRaw) || [];
    const parsedListSections = parseJsonArray(listSectionsRaw) || [];
    const parsedPollOptions = parseJsonArray<string>(pollOptionsRaw) || [];
    const files = (req.files as Express.Multer.File[]) || [];
    const mediaFiles = files.filter(file => file.fieldname === "medias");
    const contactsFile = files.find(file => file.fieldname === "contactsFile");

    try {
        const whatsapp = await Whatsapp.findOne({
            where: { id: Number(whatsappId), companyId }
        });

        if (!whatsapp) {
            throw new AppError("Conexão WhatsApp não encontrada.", 404);
        }

        let resolvedContactListId = Number(contactListId) || 0;
        let createdContactList: ContactList | null = null;
        let resolvedContactsCount = 0;

        if (recipientMode === "contactList") {
            const existingList = await ContactList.findOne({
                where: { id: Number(contactListId), companyId }
            });

            if (!existingList) {
                throw new AppError("Lista de contatos não encontrada.", 404);
            }

            resolvedContactListId = existingList.id;
            resolvedContactsCount = await ContactListItem.count({
                where: { companyId, contactListId: existingList.id }
            });
        } else if (recipientMode === "tags") {
            const tagIds = (parseJsonArray<number>(tagIdsRaw) || [])
                .map(value => Number(value))
                .filter(Boolean);

            if (!tagIds.length) {
                throw new AppError("Selecione ao menos uma etiqueta.", 400);
            }

            const contacts = await Contact.findAll({
                where: {
                    companyId,
                    isGroup: false
                },
                include: [
                    {
                        model: Tag,
                        as: "tags",
                        where: {
                            id: {
                                [Op.in]: tagIds
                            }
                        },
                        required: true,
                        through: { attributes: [] }
                    }
                ]
            });

            const { record, contactsCount } = await createContactListFromContacts({
                companyId,
                name: getQuickSendCampaignName(campaignName, "Lista Quick Send por Etiquetas"),
                contacts: contacts.map(contact => ({
                    name: contact.name,
                    number: contact.number,
                    email: contact.email,
                    isGroup: contact.isGroup
                }))
            });

            createdContactList = record;
            resolvedContactListId = record.id;
            resolvedContactsCount = contactsCount;
        } else if (recipientMode === "upload") {
            if (!contactsFile) {
                throw new AppError("Selecione um arquivo de contatos para importar.", 400);
            }

            const record = await ContactList.create({
                companyId,
                name: getQuickSendCampaignName(campaignName, "Lista Importada Quick Send")
            });

            await ImportContacts(record.id, companyId, contactsFile);

            createdContactList = record;
            resolvedContactListId = record.id;
            resolvedContactsCount = await ContactListItem.count({
                where: { companyId, contactListId: record.id }
            });
        } else {
            const normalizedInput = normalizeNumber(String(number || ""), "");

            if (!normalizedInput) {
                throw new AppError("Informe um número válido para o disparo.", 400);
            }

            let validatedNumber = normalizedInput;
            try {
                const checkedNumber = await CheckContactNumber(normalizedInput, companyId, false, Number(whatsappId));
                if (checkedNumber) {
                    validatedNumber = checkedNumber;
                }
            } catch (error: any) {
                throw new AppError(error?.message || "Número não encontrado no WhatsApp.", 400);
            }

            const { record, contactsCount } = await createContactListFromContacts({
                companyId,
                name: getQuickSendCampaignName(campaignName, "Lista Quick Send Individual"),
                contacts: [
                    {
                        name: String(name || validatedNumber).trim(),
                        number: validatedNumber,
                        email: "",
                        isGroup: false
                    }
                ]
            });

            createdContactList = record;
            resolvedContactListId = record.id;
            resolvedContactsCount = contactsCount;
        }

        if (!resolvedContactListId) {
            throw new AppError("Não foi possível montar a lista de contatos do disparo.", 400);
        }

        if (messageType === "buttons" && !parsedButtons.length) {
            throw new AppError("Adicione ao menos um botão para o disparo.", 400);
        }

        if (messageType === "list" && !parsedListSections.length) {
            throw new AppError("Configure ao menos uma seção da lista.", 400);
        }

        if (messageType === "carousel" && !parsedCarouselCards.length) {
            throw new AppError("Configure ao menos um card do carrossel.", 400);
        }

        let normalizedButtons = parsedButtons;
        if (messageType === "poll") {
            if (!String(pollName || "").trim()) {
                throw new AppError("Informe a pergunta da enquete.", 400);
            }

            if (parsedPollOptions.length < 2) {
                throw new AppError("A enquete precisa de pelo menos duas opções.", 400);
            }

            normalizedButtons = parsedPollOptions
                .map(option => String(option || "").trim())
                .filter(Boolean)
                .map(option => ({ displayText: option, type: "reply", value: option }));
        }

        const payload: any = {
            name: getQuickSendCampaignName(campaignName),
            status: "INATIVA",
            confirmation: false,
            scheduledAt: sendNow ? "" : String(scheduledAt || "").trim(),
            companyId,
            contactListId: resolvedContactListId,
            whatsappId: Number(whatsappId),
            userId,
            queueId: queueId ? Number(queueId) : null,
            statusTicket: "open",
            openTicket: "disabled",
            campaignType: "whatsapp",
            messageType,
            message1: messageType === "poll" ? String(pollName || "").trim() : String(message || "").trim(),
            buttons: messageType === "list"
                ? parsedListSections.flatMap((section: any) => section?.rows || [])
                : normalizedButtons,
            carouselCards: messageType === "carousel" ? parsedCarouselCards : [],
            listSections: messageType === "list" ? parsedListSections : [],
            listButtonText: messageType === "list" ? String(listButtonText || "Ver opções").trim() : "",
            listFooter: messageType === "list" ? String(listFooter || "").trim() : ""
        };

        const campaign = await CreateCampaignService(payload);

        if (mediaFiles.length > 0) {
            const [primaryMedia] = mediaFiles;
            campaign.mediaPath = primaryMedia.filename;
            campaign.mediaName = primaryMedia.originalname;
            await campaign.save();
        }

        const io = getIO();

        if (createdContactList) {
            io.of(String(companyId)).emit(`company-${companyId}-ContactList`, {
                action: "create",
                record: createdContactList
            });
        }

        io.of(String(companyId)).emit(`company-${companyId}-campaign`, {
            action: "create",
            record: campaign
        });

        let responseCampaign = campaign;
        if (sendNow) {
            await RestartCampaignService(campaign.id);
            responseCampaign = await reloadCampaignRecord(campaign.id);

            io.of(String(companyId)).emit(`company-${companyId}-campaign`, {
                action: "update",
                record: responseCampaign
            });
        }

        return res.status(200).json({
            message: sendNow ? "Disparo criado e iniciado com sucesso." : "Disparo agendado com sucesso.",
            campaign: responseCampaign,
            contactList: createdContactList,
            contactsCount: resolvedContactsCount
        });
    } catch (err: any) {
        logger.error({ err: err.message, stack: err.stack }, "QuickSendCampaign: Unexpected error");
        return res.status(err?.statusCode || 500).json({
            error: err?.message || "Erro interno no servidor ao criar disparo rápido."
        });
    }
};

export const listConnections = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;

    const connections = await Whatsapp.findAll({
        where: { companyId },
        attributes: ["id", "name", "number", "status", "battery", "plugged", "channel"],
        order: [["name", "ASC"]]
    });

    return res.status(200).json(connections);
};

// ─── GET /quick-send/validate ─────────────────────────────────────────────────
// Valida se o número existe no WhatsApp e busca contato existente na base
export const validateNumber = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { number, whatsappId } = req.query as { number: string; whatsappId: string };

    if (!number || !whatsappId) {
        return res.status(400).json({ valid: false, error: "Parâmetros obrigatórios: number e whatsappId" });
    }

    const digits = String(number).replace(/\D/g, "").replace(/^0+/, "");
    const normalized = normalizePhoneNumber(digits) || digits;

    if (!normalized || normalized.length < 10) {
        return res.status(200).json({ valid: false, error: "Número muito curto" });
    }

    // Busca contato existente por variantes brasileiras
    const variants = getBrazilianPhoneVariants(normalized);
    const existingContact = await Contact.findOne({
        where: { companyId, number: { [Op.in]: variants } },
        attributes: ["id", "name", "number", "profilePicUrl"]
    });

    // Valida no WhatsApp real
    try {
        const validatedNumber = await CheckContactNumber(normalized, companyId, false, Number(whatsappId));
        return res.status(200).json({
            valid: true,
            normalizedNumber: validatedNumber || normalized,
            existingContact: existingContact || null
        });
    } catch (err) {
        return res.status(200).json({
            valid: false,
            error: "Número não encontrado no WhatsApp",
            existingContact: existingContact || null
        });
    }
};
