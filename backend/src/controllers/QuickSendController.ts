// @ts-nocheck
import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";

import Whatsapp from "../models/Whatsapp";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import CompaniesSettings from "../models/CompaniesSettings";

import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import { getWbot } from "../libs/wbot";
import { sendButtonMessage } from "../helpers/SendInteractiveMessage";
import fs from "fs";
import path from "path";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import CreateLogTicketService from "../services/TicketServices/CreateLogTicketService";
import { Op } from "sequelize";
import logger from "../utils/logger";
import { Mutex } from "async-mutex";

const quickSendMutex = new Mutex();

// ─── Tipagens ──────────────────────────────────────────────────────────────────
interface QuickSendBody {
    number: string;
    message: string;
    whatsappId: number;
    name?: string;
    queueId?: number;
    createIfNotExists?: boolean;
    buttons?: string | any[]; // JSON string ou array de InteractiveButton[]
}

// ─── Função auxiliar: normaliza número ────────────────────────────────────────
const normalizeNumber = (raw: string): string => {
    return raw.replace(/\D/g, "");
};

// ─── POST /quick-send ─────────────────────────────────────────────────────────
export const quickSend = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;
    const {
        number,
        message,
        whatsappId,
        name,
        queueId,
        createIfNotExists = true,
        buttons: buttonsRaw
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

    logger.info({ companyId, userId, number, whatsappId }, "QuickSend request started");

    try {
        // ─── Validação de entrada ──────────────────────────────────────────────────
        const schema = Yup.object().shape({
            number: Yup.string()
                .matches(/^\d{10,15}$/, "Número inválido. Use apenas dígitos (DDD+número, sem código do país ou com 55)")
                .required("Número é obrigatório"),
            message: Yup.string().nullable(),
            whatsappId: Yup.number().required("Selecione uma conexão WhatsApp")
        });

        try {
            await schema.validate({ number: normalizeNumber(number), message, whatsappId });
        } catch (err) {
            logger.warn({ number, err: err.message }, "QuickSend validation failed");
            return res.status(400).json({ error: err.message });
        }

        const normalized = normalizeNumber(number);

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

        try {
            logger.debug({ normalized, whatsappId }, "QuickSend: Checking number on WhatsApp");
            // Usar o whatsappId selecionado para validação
            const checkedNumber = await CheckContactNumber(normalized, companyId, false, whatsappId);
            if (checkedNumber) {
                validatedNumber = checkedNumber;
                remoteJid = `${validatedNumber}@s.whatsapp.net`;
            }
        } catch (err) {
            console.warn(`[QuickSend] Validação opcional de número falhou para ${normalized}:`, err.message);
        }

        // ─── 3. Buscar ou criar contato ───────────────────────────────────────────
        let contact = await Contact.findOne({
            where: { number: validatedNumber, companyId }
        });

        if (!contact && validatedNumber !== normalized) {
            contact = await Contact.findOne({
                where: { number: normalized, companyId }
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
                name: name || validatedNumber,
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
        logger.debug({ contactId: contact.id }, "QuickSend: Seeking or creating ticket");
        
        const io = getIO();

        let ticket = await quickSendMutex.runExclusive(async () => {
            // Priorizar tickets JÁ ABERTOS para o contato, independentemente da conexão
            let t = await Ticket.findOne({
                where: {
                    contactId: contact.id,
                    companyId,
                    status: { [Op.in]: ["open", "pending"] },
                    channel: "whatsapp"
                },
                order: [["updatedAt", "DESC"]]
            });

            // Se não houver nenhum aberto, procurar o último (mesmo fechado) na conexão especificada
            if (!t) {
                t = await Ticket.findOne({
                    where: {
                        contactId: contact.id,
                        companyId,
                        whatsappId: whatsapp.id
                    },
                    order: [["updatedAt", "DESC"]]
                });
            }

            if (t && ["closed", "nps", "lgpd"].includes(t.status)) {
                await UpdateTicketService({
                    ticketId: t.id,
                    companyId,
                    ticketData: {
                        status: "open",
                        userId,
                        queueId: queueId || t.queueId,
                        whatsappId: whatsapp.id
                    }
                });
                t = await ShowTicketService(t.id, companyId);
                io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
                    action: "update",
                    ticket: t
                });
            } else if (!t) {
                t = await Ticket.create({
                    contactId: contact.id,
                    whatsappId: whatsapp.id,
                    companyId,
                    userId,
                    queueId: queueId || null,
                    status: "open",
                    isGroup: false,
                    unreadMessages: 0,
                    isActiveDemand: true,
                    channel: "whatsapp",
                    isBot: false
                });

                await CreateLogTicketService({ ticketId: t.id, type: "create" });
                t = await ShowTicketService(t.id, companyId);

                io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
                    action: "update",
                    ticket: t
                });
            } else {
                // Ticket está aberto: atualizamos userId/queueId se fornecidos, 
                // mas NÃO mudamos o whatsappId para evitar "context hijacking" se a conversa
                // está acontecendo por outra conexão ativa do cliente.
                await UpdateTicketService({
                    ticketId: t.id,
                    companyId,
                    ticketData: {
                        status: "open",
                        userId,
                        queueId: queueId || t.queueId
                        // Explicitamente não atualizando whatsappId
                    }
                });
                t = await ShowTicketService(t.id, companyId);
            }
            return t;
        });

        // ─── 5. Enviar mensagem ───────────────────────────────────────────────────
        const medias = req.files as Express.Multer.File[];

        try {
            logger.info({ ticketId: ticket.id, hasButtons: !!parsedButtons }, "QuickSend: Sending message(s)");

            if (parsedButtons && parsedButtons.length > 0) {
                // Envio com botões interativos
                const wbot = getWbot(Number(whatsappId));
                const jid = remoteJid;
                await sendButtonMessage(wbot, jid, message || "", "", parsedButtons);

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
export const listConnections = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;

    const connections = await Whatsapp.findAll({
        where: { companyId },
        attributes: ["id", "name", "number", "status", "battery", "plugged", "channel"],
        order: [["name", "ASC"]]
    });

    return res.status(200).json(connections);
};
