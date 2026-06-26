// @ts-nocheck
import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";

import Whatsapp from "../models/Whatsapp";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import CrmLead from "../models/CrmLead";
import CrmClient from "../models/CrmClient";
import Opportunity from "../models/Opportunity";
import CompaniesSettings from "../models/CompaniesSettings";
import Campaign from "../models/Campaign";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";
import Tag from "../models/Tag";
import PipelineStage from "../models/PipelineStage";

import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import { verifyMessage } from "../services/WbotServices/wbotMessageListener";
import { getWbot } from "../libs/wbot";
import {
  sendButtonMessage,
  sendListMessage
} from "../helpers/SendInteractiveMessage";
import fs from "fs";
import path from "path";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import CreateLogTicketService from "../services/TicketServices/CreateLogTicketService";
import { normalizePhoneNumber } from "../helpers/normalizeContactNumber";
import renderCampaignTemplate from "../helpers/RenderCampaignTemplate";
import { Op } from "sequelize";
import logger from "../utils/logger";
import { Mutex } from "async-mutex";
import CreateCampaignService from "../services/CampaignService/CreateService";
import { RestartService as RestartCampaignService } from "../services/CampaignService/RestartService";
import { ImportContacts } from "../services/ContactListService/ImportContacts";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import QuickSendMessageEngineService from "../services/QuickSendServices/QuickSendMessageEngineService";

const quickSendMutex = new Mutex();

const isTrustedDirectRemoteJid = (remoteJid?: string | null): boolean =>
  Boolean(
    remoteJid &&
      remoteJid.includes("@") &&
      remoteJid.endsWith("@s.whatsapp.net") &&
      !remoteJid.includes("@lid")
  );

// â”€â”€â”€ Tipagens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface QuickSendBody {
  number: string;
  message: string;
  whatsappId: number;
  leadId?: number | string;
  name?: string;
  queueId?: number;
  createIfNotExists?: boolean;
  buttons?: string | any[]; // JSON string ou array de InteractiveButton[]
  messageType?: string; // text | buttons | list | carousel | poll
  carouselCards?: string | any[]; // JSON string ou array de CarouselCard[]
  listButtonText?: string;
  listFooter?: string;
  listSections?: string | any[];
  pollName?: string;
  pollOptions?: string | string[];
  pollSelectableCount?: string | number;
}

interface QuickSendCampaignBody extends QuickSendBody {
  campaignName?: string;
  recipientMode?: "single" | "tags" | "contactList" | "upload" | "crmStage" | "product";
  contactListId?: string | number;
  tagIds?: string | number[] | number[];
  product?: string;
  stageId?: string | number;
  ownerUserId?: string | number;
  viewMode?: "team" | "personal";
  sendNow?: string | boolean;
  scheduledAt?: string;
}

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "1", "yes", "sim", "on"].includes(
      value.trim().toLowerCase()
    );
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

const getQuickSendCampaignName = (
  baseName?: string | null,
  prefix = "Disparo RÃ¡pido"
): string => {
  const trimmed = String(baseName || "").trim();
  if (trimmed) return trimmed;

  const now = new Date();
  const date = now.toLocaleDateString("pt-BR");
  const time = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${prefix} - ${date} ${time}`;
};

const normalizeScheduledAtValue = (value?: string | null): string | null => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const createContactListFromContacts = async ({
  companyId,
  name,
  contacts
}: {
  companyId: number;
  name: string;
  contacts: Array<{
    name: string;
    number: string;
    email?: string;
    isGroup?: boolean;
  }>;
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
    throw new AppError(
      "Nenhum contato vÃ¡lido encontrado para criar a lista.",
      400
    );
  }

  await ContactListItem.bulkCreate(uniqueContacts);

  return {
    record,
    contactsCount: uniqueContacts.length
  };
};

const reloadCampaignRecord = async (campaignId: number, companyId: number) => {
  return Campaign.findOne({
    where: { id: campaignId, companyId },
    include: [
      { model: ContactList },
      { model: Whatsapp, attributes: ["id", "name"] }
    ]
  });
};

// â”€â”€â”€ FunÃ§Ã£o auxiliar: normaliza nÃºmero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const getAreaCodeFromReference = (reference?: string | null): string => {
  const digits = String(reference || "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");
  const normalized = normalizePhoneNumber(digits) || digits;
  const national = normalized.startsWith("55")
    ? normalized.slice(2)
    : normalized;

  return national.length >= 10 ? national.slice(0, 2) : "";
};

const normalizeNumber = (
  raw: string,
  referenceNumber?: string | null
): string => {
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
 * Gera todas as variantes de um nÃºmero brasileiro (com e sem o nono dÃ­gito).
 * Garante que a busca por contato funcione independentemente do formato armazenado.
 */
const getBrazilianPhoneVariants = (number: string): string[] => {
  const variants = new Set<string>([number]);
  if (!number) return [];

  const hasBrPrefix = number.startsWith("55");
  const national = hasBrPrefix ? number.slice(2) : number;
  const ddd = national.slice(0, 2);
  const subscriber = national.slice(2);

  // Se assinante tem 9 dÃ­gitos comeÃ§ando com "9" â†’ adiciona variante sem o nono dÃ­gito (8 dÃ­gitos)
  if (subscriber.length === 9 && subscriber[0] === "9") {
    const without9 = subscriber.slice(1);
    variants.add(`55${ddd}${without9}`); // com DDI, sem nono
    variants.add(`${ddd}${without9}`); // sem DDI, sem nono
  }

  // Se assinante tem 8 dÃ­gitos â†’ adiciona variante com o nono dÃ­gito (9 dÃ­gitos)
  if (subscriber.length === 8) {
    const with9 = `9${subscriber}`;
    variants.add(`55${ddd}${with9}`); // com DDI, com nono
    variants.add(`${ddd}${with9}`); // sem DDI, com nono
  }

  // Adiciona variantes com/sem prefixo 55
  if (hasBrPrefix) {
    variants.add(national); // sem DDI
  } else if (number.length >= 10) {
    variants.add(`55${number}`); // com DDI
  }

  return Array.from(variants).filter(v => v.length >= 10 && v.length <= 13);
};

// â”€â”€â”€ POST /quick-send â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const quickSend = async (
  req: Request,
  res: Response
): Promise<Response> => {
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
    messageType = "text",
    carouselCards: carouselRaw,
    listButtonText,
    listFooter,
    listSections: listSectionsRaw,
    pollName,
    pollOptions: pollOptionsRaw,
    pollSelectableCount: pollSelectableCountRaw
  }: QuickSendBody = req.body;

  // Parse botÃµes se enviados
  let parsedButtons: any[] | null = null;
  if (buttonsRaw) {
    try {
      parsedButtons = Array.isArray(buttonsRaw)
        ? buttonsRaw
        : JSON.parse(buttonsRaw as string);
      if (!Array.isArray(parsedButtons) || parsedButtons.length === 0)
        parsedButtons = null;
    } catch {
      return res
        .status(400)
        .json({ error: "Campo 'buttons' invÃ¡lido. Envie um JSON array." });
    }
  }

  // Parse carrossel
  let parsedCarouselCards: any[] | null = null;
  if (carouselRaw) {
    try {
      parsedCarouselCards = Array.isArray(carouselRaw)
        ? carouselRaw
        : JSON.parse(carouselRaw as string);
      if (
        !Array.isArray(parsedCarouselCards) ||
        parsedCarouselCards.length === 0
      )
        parsedCarouselCards = null;
    } catch {
      return res.status(400).json({
        error: "Campo 'carouselCards' invÃ¡lido. Envie um JSON array."
      });
    }
  }

  let parsedListSections: any[] | null = null;
  if (listSectionsRaw) {
    try {
      parsedListSections = Array.isArray(listSectionsRaw)
        ? listSectionsRaw
        : JSON.parse(listSectionsRaw as string);
      if (!Array.isArray(parsedListSections) || parsedListSections.length === 0)
        parsedListSections = null;
    } catch {
      return res
        .status(400)
        .json({
          error: "Campo 'listSections' invÃ¡lido. Envie um JSON array."
        });
    }
  }

  // Parse enquete
  let parsedPollOptions: string[] | null = null;
  if (pollOptionsRaw) {
    try {
      parsedPollOptions = Array.isArray(pollOptionsRaw)
        ? pollOptionsRaw
        : JSON.parse(pollOptionsRaw as string);
      if (!Array.isArray(parsedPollOptions) || parsedPollOptions.length < 2)
        parsedPollOptions = null;
    } catch {
      return res
        .status(400)
        .json({ error: "Campo 'pollOptions' invÃ¡lido. Envie um JSON array." });
    }
  }
  const pollSelectableCount =
    parseInt(String(pollSelectableCountRaw || 1)) || 1;

  if (messageType === "list") {
    const hasListItems =
      (parsedListSections && parsedListSections.length > 0) ||
      (parsedButtons && parsedButtons.length > 0);
    if (
      !String(message || "").trim() ||
      !String(listButtonText || "").trim() ||
      !hasListItems
    ) {
      return res.status(400).json({
        error: "Preencha o texto, o botÃ£o e ao menos um item da lista."
      });
    }
  }

  const medias = req.files as Express.Multer.File[];
  if ((!medias || medias.length === 0) && ["text", "buttons"].includes(messageType)) {
    try {
      const result = await QuickSendMessageEngineService({
        companyId,
        userId,
        number,
        message,
        whatsappId,
        leadId,
        name,
        queueId,
        createIfNotExists,
        buttons: parsedButtons,
        messageType
      });

      return res.status(result.warning ? 206 : 200).json({
        message: result.warning || "Mensagem enviada com sucesso!",
        ticket: result.ticket,
        contact: result.contact,
        sendError: result.sendError
      });
    } catch (err) {
      const statusCode = err instanceof AppError ? err.statusCode : 500;
      logger.error(
        { companyId, userId, errName: err.name, err: err.message },
        "QuickSend engine error"
      );
      return res.status(statusCode).json({
        error:
          err instanceof AppError
            ? err.message
            : "Erro interno no servidor ao processar envio rápido."
      });
    }
  }

  logger.info(
    { companyId, userId, number, whatsappId },
    "QuickSend request started"
  );

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
    // â”€â”€â”€ ValidaÃ§Ã£o de entrada â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const schema = Yup.object().shape({
      number: Yup.string()
        .matches(
          /^\d{10,15}$/,
          "NÃºmero invÃ¡lido. Use apenas dÃ­gitos (DDD+nÃºmero, sem cÃ³digo do paÃ­s ou com 55)"
        )
        .required("NÃºmero Ã© obrigatÃ³rio"),
      message: Yup.string().nullable(),
      whatsappId: Yup.number().required("Selecione uma conexÃ£o WhatsApp")
    });

    try {
      await schema.validate({ number: normalizedInput, message, whatsappId });
    } catch (err) {
      logger.warn({ number, err: err.message }, "QuickSend validation failed");
      return res.status(400).json({ error: err.message });
    }

    const normalized = normalizedInput;

    // â”€â”€â”€ 1. Verificar conexÃ£o WhatsApp (pertence Ã  empresa) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const whatsapp = await Whatsapp.findOne({
      where: { id: whatsappId, companyId, status: "CONNECTED" }
    });

    if (!whatsapp) {
      logger.warn(
        { whatsappId, companyId },
        "QuickSend: Connection not found or not connected"
      );
      return res.status(404).json({
        error: "ConexÃ£o WhatsApp nÃ£o encontrada ou nÃ£o estÃ¡ conectada."
      });
    }

    // â”€â”€â”€ 2. Verificar se nÃºmero existe no WhatsApp (validaÃ§Ã£o real) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let remoteJid = `${normalized}@s.whatsapp.net`;
    let validatedNumber = normalized;
    // Flag: indica se o nÃºmero foi confirmado pelo WhatsApp (via onWhatsApp).
    // Quando true, remoteJid contÃ©m o JID canÃ´nico retornado pelo servidor WhatsApp.
    let whatsappValidated = false;

    try {
      logger.debug(
        { normalized, whatsappId },
        "QuickSend: Checking number on WhatsApp"
      );
      // Usar o whatsappId selecionado para validaÃ§Ã£o
      const checkedNumber = await CheckContactNumber(
        normalized,
        companyId,
        false,
        whatsappId
      );
      if (checkedNumber) {
        validatedNumber = checkedNumber;
        remoteJid = `${validatedNumber}@s.whatsapp.net`;
        whatsappValidated = true;
      }
    } catch (err) {
      console.warn(
        `[QuickSend] ValidaÃ§Ã£o opcional de nÃºmero falhou para ${normalized}:`,
        err.message
      );
    }

    // â”€â”€â”€ 3. Buscar ou criar contato â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Busca flexÃ­vel: inclui variantes com e sem o nono dÃ­gito brasileiro
    const numberVariants = [
      ...new Set([
        ...getBrazilianPhoneVariants(validatedNumber),
        ...getBrazilianPhoneVariants(normalized)
      ])
    ];
    const createContactName =
      name || lead?.name || lead?.contact?.name || validatedNumber;

    // O contato do lead pode ter o nÃºmero no formato antigo (sem nono dÃ­gito).
    // Verificamos se Ã© equivalente ao nÃºmero solicitado antes de aceitar.
    let contact =
      lead?.contact && numberVariants.includes(lead.contact.number)
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
        return res.status(404).json({ error: "Contato nÃ£o encontrado." });
      }

      logger.info({ normalized, companyId }, "QuickSend: Creating new contact");
      const settings = await CompaniesSettings.findOne({
        where: { companyId }
      });
      const acceptAudio = settings?.acceptAudioMessageContact === "enabled";

      contact = await CreateOrUpdateContactService({
        name: createContactName,
        number: validatedNumber,
        remoteJid,
        remoteJidValidated: whatsappValidated,
        companyId,
        isGroup: false,
        channel: "whatsapp",
        profilePicUrl: "",
        acceptAudioMessage: acceptAudio,
        active: true
      });
    }

    if (!whatsappValidated && isTrustedDirectRemoteJid(contact?.remoteJid)) {
      logger.info(
        {
          companyId,
          contactId: contact.id,
          normalized,
          attemptedRemoteJid: remoteJid,
          preservedRemoteJid: contact.remoteJid
        },
        "QuickSend: preserving existing remoteJid because onWhatsApp did not confirm new variant"
      );
      remoteJid = contact.remoteJid;
      validatedNumber = remoteJid.split("@")[0] || validatedNumber;
    }

    // â”€â”€â”€ 4. Buscar ticket aberto ou criar novo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Reconcilia contato somente se o nÃºmero nÃ£o Ã© equivalente (considerando o nono dÃ­gito)
    // ou se nome foi fornecido e difere. Evita reconciliar quando a diferenÃ§a Ã© apenas o nono dÃ­gito.
    const contactNumberVariants = getBrazilianPhoneVariants(validatedNumber);
    const contactNumberIsEquivalent =
      contact && contactNumberVariants.includes(contact.number);

    // Verifica se os remoteJids sÃ£o equivalentes (mesma pessoa, diferenÃ§a sÃ³ no nono dÃ­gito)
    const remoteJidNum = remoteJid.split("@")[0];
    const contactRemoteJidNum = (contact?.remoteJid || "").split("@")[0];
    const remoteJidsAreEquivalent =
      remoteJidNum === contactRemoteJidNum ||
      getBrazilianPhoneVariants(remoteJidNum).includes(contactRemoteJidNum) ||
      getBrazilianPhoneVariants(contactRemoteJidNum).includes(remoteJidNum);

    // Quando o WhatsApp confirmou um JID canÃ´nico diferente do remoteJid armazenado
    // (mas ainda equivalentes pelo nono dÃ­gito), devemos atualizar o remoteJid do contato
    // para garantir que o envio vÃ¡ para o destino real atual no WhatsApp.
    // Ex: contato armazenado com "557788719888@s.whatsapp.net" mas WhatsApp retornou
    // "5577988719888@s.whatsapp.net" â†’ forÃ§a reconciliaÃ§Ã£o para atualizar sÃ³ o remoteJid.
    const canonicalJidMismatch =
      whatsappValidated &&
      !!contact?.remoteJid &&
      remoteJid !== contact.remoteJid &&
      remoteJidsAreEquivalent; // sÃ£o variantes do nono dÃ­gito, nÃ£o incompatÃ­veis

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
        name:
          name ||
          contact?.name ||
          lead?.name ||
          lead?.contact?.name ||
          validatedNumber,
        number: validatedNumber,
        remoteJid,
        remoteJidValidated: whatsappValidated,
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
        // Prevent unique constraint violation if another lead already has this phone number
        const existingLeadWithPhone = await CrmLead.findOne({
          where: {
            companyId,
            phone: { [Op.in]: getBrazilianPhoneVariants(validatedNumber) },
            id: { [Op.ne]: lead.id }
          }
        });
        if (!existingLeadWithPhone) {
          leadUpdates.phone = validatedNumber;
        } else {
          logger.warn(
            { leadId: lead.id, existingLeadId: existingLeadWithPhone.id, validatedNumber },
            "QuickSend: Skip updating lead phone to avoid unique constraint violation"
          );
        }
      }

      if (Object.keys(leadUpdates).length > 0) {
        try {
          await lead.update(leadUpdates, { hooks: false });
        } catch (updateErr) {
          logger.error(
            { leadId: lead.id, err: updateErr.message },
            "QuickSend: Error updating lead, ignoring to proceed"
          );
        }
      }
    }

    logger.debug(
      { contactId: contact.id },
      "QuickSend: Seeking or creating ticket"
    );

    const io = getIO();

    const ticket = await quickSendMutex.runExclusive(async () => {
      // Usar FindOrCreateTicketService para garantir consistÃªncia e evitar duplicados
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

      // Sempre garantir que o ticket estÃ¡ associado ao usuÃ¡rio correto e aberto
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

    // â”€â”€â”€ 5. Enviar mensagem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    try {
      logger.info(
        { ticketId: ticket.id, hasButtons: !!parsedButtons },
        "QuickSend: Sending message(s)"
      );
      const templateContact = {
        name: contact.name,
        email: contact.email,
        number: contact.number
      };
      const renderedMessage = renderCampaignTemplate(
        String(message || ""),
        templateContact,
        []
      );
      const renderedButtons = renderCampaignTemplate(
        parsedButtons || [],
        templateContact,
        []
      );
      const renderedListSections = renderCampaignTemplate(
        parsedListSections || [],
        templateContact,
        []
      );
      const renderedCarouselCards = renderCampaignTemplate(
        parsedCarouselCards || [],
        templateContact,
        []
      );
      const renderedPollName = renderCampaignTemplate(
        String(pollName || ""),
        templateContact,
        []
      );
      const renderedPollOptions = renderCampaignTemplate(
        parsedPollOptions || [],
        templateContact,
        []
      );
      const renderedListButtonText = renderCampaignTemplate(
        String(listButtonText || "Ver opÃ§Ãµes"),
        templateContact,
        []
      );
      const renderedListFooter = renderCampaignTemplate(
        String(listFooter || ""),
        templateContact,
        []
      );

      if (
        messageType === "buttons" &&
        renderedButtons &&
        renderedButtons.length > 0
      ) {
        // Envio com botÃµes interativos (formato legado: reply/url/call/copy)
        const wbot = getWbot(Number(whatsappId));
        const sentMsg = await sendButtonMessage(
          wbot,
          remoteJid,
          renderedMessage || "",
          "",
          renderedButtons
        );
        if (sentMsg?.key) {
          await verifyMessage(
            sentMsg,
            ticket,
            contact,
            undefined,
            false,
            false,
            false,
            true,
            userId
          );
        }
      } else if (
        messageType === "list" &&
        ((renderedListSections && renderedListSections.length > 0) ||
          (renderedButtons && renderedButtons.length > 0))
      ) {
        const wbot = getWbot(Number(whatsappId));
        const sentMsg = await sendListMessage(
          wbot,
          remoteJid,
          renderedMessage || "",
          renderedListButtonText,
          renderedListSections || renderedButtons || [],
          renderedListFooter
        );
        if (sentMsg?.key) {
          await verifyMessage(
            sentMsg,
            ticket,
            contact,
            undefined,
            false,
            false,
            false,
            true,
            userId
          );
        }
      } else if (
        messageType === "carousel" &&
        renderedCarouselCards &&
        renderedCarouselCards.length > 0
      ) {
        // Envio de carrossel
        const {
          sendCarouselMessage
        } = require("../helpers/SendInteractiveMessage");
        const wbot = getWbot(Number(whatsappId));
        const sentMsg = await sendCarouselMessage(
          wbot,
          remoteJid,
          renderedCarouselCards
        );
        if (sentMsg?.key) {
          await verifyMessage(
            sentMsg,
            ticket,
            contact,
            undefined,
            false,
            false,
            false,
            true,
            userId
          );
        }
      } else if (
        messageType === "poll" &&
        renderedPollName &&
        renderedPollOptions &&
        renderedPollOptions.length >= 2
      ) {
        // Envio de enquete
        const wbot = getWbot(Number(whatsappId));
        const sentMsg = await wbot.sendMessage(remoteJid, {
          poll: {
            name: renderedPollName,
            values: renderedPollOptions,
            selectableCount: pollSelectableCount
          }
        } as any);
        if (sentMsg?.key) {
          await verifyMessage(
            sentMsg,
            ticket,
            contact,
            undefined,
            false,
            false,
            false,
            true,
            userId
          );
        }
      } else if (medias && medias.length > 0) {
        await Promise.all(
          medias.map(async (media: Express.Multer.File, index: number) => {
            const bodyMsg = index === 0 ? renderedMessage : "";
            await SendWhatsAppMedia({
              media,
              ticket,
              body: bodyMsg,
              isPrivate: false,
              isForwarded: false
            });

            const filePath = path.resolve(
              "public",
              `company${companyId}`,
              media.filename
            );
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          })
        );
      } else if (message) {
        const sentMsg = await SendWhatsAppMessage({
          body: renderedMessage,
          ticket,
          quotedMsg: null
        });
        if (sentMsg && sentMsg.key) {
          await verifyMessage(
            sentMsg,
            ticket,
            contact,
            undefined,
            false,
            false,
            false,
            true,
            userId
          );
        }
      } else {
        logger.debug(
          { ticketId: ticket.id },
          "QuickSend: Ticket created without message."
        );
      }

      logger.info(
        { ticketId: ticket.id },
        "QuickSend: Message/Media sent successfully"
      );
    } catch (sendErr) {
      logger.error(
        { ticketId: ticket.id, err: sendErr.message },
        "QuickSend: Error sending message"
      );
      return res.status(206).json({
        warning:
          "Ticket criado, mas houve erro ao enviar a mensagem. Abra o ticket para tentar novamente.",
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
    const seqDetails =
      err.name === "SequelizeUniqueConstraintError"
        ? {
            constraint: err.parent?.constraint,
            table: err.parent?.table,
            detail: err.parent?.detail,
            code: err.parent?.code,
            fields: (err.errors || []).map((e: any) => ({
              path: e.path,
              value: e.value,
              message: e.message
            }))
          }
        : undefined;

    logger.error(
      { companyId, userId, errName: err.name, err: err.message, seqDetails },
      "QuickSend: Unexpected error"
    );
    return res
      .status(500)
      .json({ error: "Erro interno no servidor ao processar envio rÃ¡pido." });
  }
};

// â”€â”€â”€ GET /quick-send/connections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Lista conexÃµes WhatsApp disponÃ­veis (para o dropdown no modal)
export const createCampaign = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const {
    campaignName,
    recipientMode = "single",
    number,
    name,
    contactListId,
    tagIds: tagIdsRaw,
    product,
    stageId,
    ownerUserId,
    viewMode,
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

  const normalizedScheduledAt = normalizeScheduledAtValue(scheduledAt);
  const sendNow = parseBoolean(sendNowRaw) || !normalizedScheduledAt;
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
      throw new AppError("ConexÃ£o WhatsApp nÃ£o encontrada.", 404);
    }

    let resolvedContactListId = Number(contactListId) || 0;
    let createdContactList: ContactList | null = null;
    let resolvedContactsCount = 0;

    if (recipientMode === "contactList") {
      const existingList = await ContactList.findOne({
        where: { id: Number(contactListId), companyId }
      });

      if (!existingList) {
        throw new AppError("Lista de contatos nÃ£o encontrada.", 404);
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
        name: getQuickSendCampaignName(
          campaignName,
          "Lista Quick Send por Etiquetas"
        ),
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
        throw new AppError(
          "Selecione um arquivo de contatos para importar.",
          400
        );
      }

      const record = await ContactList.create({
        companyId,
        name: getQuickSendCampaignName(
          campaignName,
          "Lista Importada Quick Send"
        )
      });

      await ImportContacts(record.id, companyId, contactsFile);

      createdContactList = record;
      resolvedContactListId = record.id;
      resolvedContactsCount = await ContactListItem.count({
        where: { companyId, contactListId: record.id }
      });
    } else if (recipientMode === "product") {
      const normalizedProduct = String(product || "").trim();

      if (!normalizedProduct) {
        throw new AppError("Selecione ou informe um produto para o disparo.", 400);
      }

      const clients = await CrmClient.findAll({
        where: {
          companyId,
          status: { [Op.ne]: "blocked" },
          acquiredProduct: { [Op.iLike]: `%${normalizedProduct}%` }
        },
        include: [
          {
            model: Contact,
            as: "contacts",
            attributes: ["id", "name", "number", "email", "isGroup"],
            through: { attributes: [] },
            required: false
          }
        ]
      });

      const leads = await CrmLead.findAll({
        where: {
          companyId,
          product: { [Op.iLike]: `%${normalizedProduct}%` }
        },
        attributes: ["id", "name", "phone", "email", "companyName"]
      });

      const contacts = [
        ...clients
        .flatMap(client => {
          const linkedContacts = Array.isArray((client as any).contacts)
            ? (client as any).contacts
            : [];

          if (linkedContacts.length > 0) {
            return linkedContacts.map((contact: Contact) => ({
              name: contact.name || client.name,
              number: contact.number,
              email: contact.email || client.email,
              isGroup: contact.isGroup
            }));
          }

          return [{
            name: client.name,
            number: client.phone,
            email: client.email,
            isGroup: false
          }];
        }),
        ...leads.map(lead => ({
          name: lead.name || lead.companyName || lead.phone,
          number: lead.phone,
          email: lead.email,
          isGroup: false
        }))
      ]
        .map(contact => ({
          ...contact,
          number: normalizeNumber(String(contact.number || ""), String(contact.number || ""))
        }))
        .filter(contact => contact.number) as Array<{
        name: string;
        number: string;
        email?: string;
        isGroup?: boolean;
      }>;

      if (!contacts.length) {
        throw new AppError("Nenhum cliente com telefone válido foi encontrado para este produto.", 400);
      }

      const { record, contactsCount } = await createContactListFromContacts({
        companyId,
        name: getQuickSendCampaignName(campaignName, `Produto ${normalizedProduct}`),
        contacts
      });

      createdContactList = record;
      resolvedContactListId = record.id;
      resolvedContactsCount = contactsCount;
    } else if (recipientMode === "crmStage") {
      const normalizedStageId = Number(stageId);

      if (!normalizedStageId) {
        throw new AppError(
          "Informe um estÃ¡gio do funil para o disparo em massa.",
          400
        );
      }

      const stage = await PipelineStage.findOne({
        where: { id: normalizedStageId, companyId }
      });

      if (!stage) {
        throw new AppError("EstÃ¡gio do funil nÃ£o encontrado.", 404);
      }

      const opportunityWhere: any = {
        stageId: normalizedStageId,
        companyId,
        status: "OPEN"
      };

      if (req.user.profile !== "admin") {
        opportunityWhere.assignedUserId = userId;
      } else if (ownerUserId) {
        opportunityWhere.assignedUserId = Number(ownerUserId);
      } else if (viewMode === "personal") {
        opportunityWhere.assignedUserId = userId;
      }

      const opportunities = await Opportunity.findAll({
        where: opportunityWhere,
        include: [
          {
            model: Contact,
            as: "contact",
            attributes: ["id", "name", "number", "email", "isGroup"]
          },
          {
            model: CrmLead,
            as: "lead",
            attributes: ["id", "name", "phone", "email", "companyName"]
          }
        ]
      });

      const contacts = opportunities
        .map(opportunity => {
          const contact = opportunity.contact as Contact | undefined;
          const lead = opportunity.lead as CrmLead | undefined;
          const normalizedNumber = normalizeNumber(
            String(contact?.number || lead?.phone || ""),
            String(contact?.number || lead?.phone || "")
          );

          if (!normalizedNumber) {
            return null;
          }

          return {
            name: String(
              contact?.name ||
                lead?.name ||
                lead?.companyName ||
                opportunity.title ||
                normalizedNumber
            ).trim(),
            number: normalizedNumber,
            email: String(contact?.email || lead?.email || "").trim(),
            isGroup: Boolean(contact?.isGroup)
          };
        })
        .filter(Boolean) as Array<{
        name: string;
        number: string;
        email?: string;
        isGroup?: boolean;
      }>;

      if (!contacts.length) {
        throw new AppError(
          "Nenhum contato vÃ¡lido foi encontrado nesta etapa do funil.",
          400
        );
      }

      const { record, contactsCount } = await createContactListFromContacts({
        companyId,
        name: getQuickSendCampaignName(campaignName, `Funil ${stage.name}`),
        contacts
      });

      createdContactList = record;
      resolvedContactListId = record.id;
      resolvedContactsCount = contactsCount;
    } else {
      const normalizedInput = normalizeNumber(String(number || ""), "");

      if (!normalizedInput) {
        throw new AppError("Informe um nÃºmero vÃ¡lido para o disparo.", 400);
      }

      let validatedNumber = normalizedInput;
      try {
        const checkedNumber = await CheckContactNumber(
          normalizedInput,
          companyId,
          false,
          Number(whatsappId)
        );
        if (checkedNumber) {
          validatedNumber = checkedNumber;
        }
      } catch (error: any) {
        throw new AppError(
          error?.message || "NÃºmero nÃ£o encontrado no WhatsApp.",
          400
        );
      }

      const { record, contactsCount } = await createContactListFromContacts({
        companyId,
        name: getQuickSendCampaignName(
          campaignName,
          "Lista Quick Send Individual"
        ),
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
      throw new AppError(
        "NÃ£o foi possÃ­vel montar a lista de contatos do disparo.",
        400
      );
    }

    if (messageType === "buttons" && !parsedButtons.length) {
      throw new AppError("Adicione ao menos um botÃ£o para o disparo.", 400);
    }

    if (messageType === "list" && !parsedListSections.length) {
      throw new AppError("Configure ao menos uma seÃ§Ã£o da lista.", 400);
    }

    if (messageType === "carousel" && !parsedCarouselCards.length) {
      throw new AppError("Configure ao menos um card do carrossel.", 400);
    }

    if (!sendNow && !normalizedScheduledAt) {
      throw new AppError("Informe uma data vÃ¡lida para o agendamento.", 400);
    }

    let normalizedButtons = parsedButtons;
    if (messageType === "poll") {
      if (!String(pollName || "").trim()) {
        throw new AppError("Informe a pergunta da enquete.", 400);
      }

      if (parsedPollOptions.length < 2) {
        throw new AppError(
          "A enquete precisa de pelo menos duas opÃ§Ãµes.",
          400
        );
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
      scheduledAt: sendNow ? null : normalizedScheduledAt,
      companyId,
      contactListId: resolvedContactListId,
      whatsappId: Number(whatsappId),
      userId,
      queueId: queueId ? Number(queueId) : null,
      statusTicket: "open",
      openTicket: "enabled",
      campaignType: "whatsapp",
      randomizedDispatch: true,
      dispatchMinDelaySeconds: 5,
      dispatchMaxDelaySeconds: 60,
      messageType,
      message1:
        messageType === "poll"
          ? String(pollName || "").trim()
          : String(message || "").trim(),
      buttons:
        messageType === "list"
          ? parsedListSections.flatMap((section: any) => section?.rows || [])
          : normalizedButtons,
      carouselCards: messageType === "carousel" ? parsedCarouselCards : [],
      listSections: messageType === "list" ? parsedListSections : [],
      listButtonText:
        messageType === "list"
          ? String(listButtonText || "Ver opÃ§Ãµes").trim()
          : "",
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
      await RestartCampaignService(campaign.id, companyId);
      responseCampaign = await reloadCampaignRecord(campaign.id, companyId);

      io.of(String(companyId)).emit(`company-${companyId}-campaign`, {
        action: "update",
        record: responseCampaign
      });
    }

    return res.status(200).json({
      message: sendNow
        ? "Disparo criado e iniciado com sucesso."
        : "Disparo agendado com sucesso.",
      campaign: responseCampaign,
      contactList: createdContactList,
      contactsCount: resolvedContactsCount
    });
  } catch (err: any) {
    logger.error(
      { err: err.message, stack: err.stack },
      "QuickSendCampaign: Unexpected error"
    );
    return res.status(err?.statusCode || 500).json({
      error:
        err?.message || "Erro interno no servidor ao criar disparo rÃ¡pido."
    });
  }
};

export const listConnections = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: userId } = req.user;

  const connections = await ListWhatsAppsService({
    companyId,
    session: 0,
    userId: Number(userId)
  });

  return res.status(200).json(connections);
};

// â”€â”€â”€ GET /quick-send/validate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Valida se o nÃºmero existe no WhatsApp e busca contato existente na base
export const validateNumber = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { number, whatsappId } = req.query as {
    number: string;
    whatsappId: string;
  };

  if (!number || !whatsappId) {
    return res.status(400).json({
      valid: false,
      error: "ParÃ¢metros obrigatÃ³rios: number e whatsappId"
    });
  }

  const digits = String(number).replace(/\D/g, "").replace(/^0+/, "");
  const normalized = normalizePhoneNumber(digits) || digits;

  if (!normalized || normalized.length < 10) {
    return res.status(200).json({ valid: false, error: "NÃºmero muito curto" });
  }

  // Busca contato existente por variantes brasileiras
  const variants = getBrazilianPhoneVariants(normalized);
  const existingContact = await Contact.findOne({
    where: { companyId, number: { [Op.in]: variants } },
    attributes: ["id", "name", "number", "profilePicUrl"]
  });

  // Valida no WhatsApp real
  try {
    const validatedNumber = await CheckContactNumber(
      normalized,
      companyId,
      false,
      Number(whatsappId)
    );
    return res.status(200).json({
      valid: true,
      normalizedNumber: validatedNumber || normalized,
      existingContact: existingContact || null
    });
  } catch (err) {
    return res.status(200).json({
      valid: false,
      error: "NÃºmero nÃ£o encontrado no WhatsApp",
      existingContact: existingContact || null
    });
  }
};
