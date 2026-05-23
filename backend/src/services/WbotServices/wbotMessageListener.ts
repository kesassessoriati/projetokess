// @ts-nocheck
import path, { join } from "path";
import { promisify } from "util";
import { readFile, writeFile } from "fs";
import fs from "fs";
import * as Sentry from "@sentry/node";
import { isNil, isArray } from "lodash";
import ShowPromptService from "../PromptServices/ShowPromptService";
import ListPromptToolSettingsService from "../PromptToolSettingService/ListPromptToolSettingsService";
import { REDIS_URI_MSG_CONN } from "../../config/redis";
import axios, { AxiosError } from "axios";

import {
  downloadMediaMessage,
  extractMessageContent,
  getContentType,
  GroupMetadata,
  jidNormalizedUser,
  delay,
  MediaType,
  MessageUpsertType,
  proto,
  WAMessage,
  WAMessageStubType,
  WAMessageUpdate,
  WASocket,
  downloadContentFromMessage,
  AnyMessageContent,
  generateWAMessageContent,
  generateWAMessageFromContent
} from "@whiskeysockets/baileys";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import { Mutex } from "async-mutex";
import { getIO } from "../../libs/socket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import EnqueueInternalMessageSyncService from "../InternalMessageSync/EnqueueInternalMessageSyncService";
import logger from "../../utils/logger";
import { buildPromptRuntimeConfig, finalizeAIUsage } from "../AIProviderService/AIProviderService";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { debounce } from "../../helpers/Debounce";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import formatBody from "../../helpers/Mustache";
import TicketTraking from "../../models/TicketTraking";
import UserRating from "../../models/UserRating";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import sendFaceMessage from "../FacebookServices/sendFacebookMessage";
import moment from "moment";
import Queue from "../../models/Queue";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import VerifyCurrentSchedule from "../CompanyService/VerifyCurrentSchedule";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import { Op } from "sequelize";
import { campaignQueue, parseToMilliseconds, randomValue } from "../../queues";
import User from "../../models/User";
import { sayChatbot } from "./ChatBotListener";
import MarkDeleteWhatsAppMessage from "./MarkDeleteWhatsAppMessage";
import ListUserQueueServices from "../UserQueueServices/ListUserQueueServices";
import cacheLayer from "../../libs/cache";
import { addLogs } from "../../helpers/addLogs";
import SendWhatsAppMedia, { getMessageOptions } from "./SendWhatsAppMedia";
import {
  buildRemoteJidFromNumber,
  normalizePhoneNumber,
  resolveContactNumber,
  sanitizeRemoteJid
} from "../../helpers/normalizeContactNumber";
import resolveWhatsAppContactName from "../../helpers/resolveWhatsAppContactName";

import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import { createDialogflowSessionWithModel } from "../QueueIntegrationServices/CreateSessionDialogflow";
import { queryDialogFlow } from "../QueueIntegrationServices/QueryDialogflow";
import CompaniesSettings from "../../models/CompaniesSettings";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import Whatsapp from "../../models/Whatsapp";
import QueueIntegrations from "../../models/QueueIntegrations";
import ShowFileService from "../FileServices/ShowService";
import { ShouldSaveToPhone, SaveContactToPhone } from "../ContactServices/ContactPhoneService";
import { trackProductEvent } from "../SystemMetricService";
import GroupCampaign from "../../models/GroupCampaign";
import GroupCampaignLog from "../../models/GroupCampaignLog";
import GroupCampaignTarget from "../../models/GroupCampaignTarget";

import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import {
  SpeechConfig,
  SpeechSynthesizer,
  AudioConfig
} from "microsoft-cognitiveservices-speech-sdk";
import typebotListener from "../TypebotServices/typebotListener";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";
import pino from "pino";
import BullQueues from "../../libs/queue";
import { Transform } from "stream";
import { msgDB } from "../../libs/wbot";
import {
  CheckSettings1,
  CheckCompanySetting
} from "../../helpers/CheckSettings";
import { title } from "process";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import { IConnections, INodes } from "../WebhookService/DispatchWebHookService";
import { FlowDefaultModel } from "../../models/FlowDefault";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";
import WaitQuestionService from "../FlowBuilderService/WaitQuestionService";
import { WebhookModel } from "../../models/Webhook";
import { add, differenceInMilliseconds } from "date-fns";
import { FlowCampaignModel } from "../../models/FlowCampaign";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { dispatch as webhookDispatch } from "../WebhookDispatch/WebhookDispatchService";
import FlowExecution from "../../models/FlowExecution";
import { handleOpenAi } from "../IntegrationsServices/OpenAiService";
import { IOpenAi } from "../../@types/openai";
import { handleAiReminderReply } from "../AiExternalAgentServices/AiExternalJourneyService";

const os = require("os");

const request = require("request");

let i = 0;

setInterval(() => {
  i = 0;
}, 5000);

// === 🔁 Buffer temporário para agrupar mensagens antes de enviar à IA ===
const messageBuffer: Record<number, { texts: string[]; timeout?: ReturnType<typeof setTimeout> }> = {};

type Session = WASocket & {
  id?: number;
};

interface ImessageUpsert {
  messages: proto.IWebMessageInfo[];
  type: MessageUpsertType;
}

interface IMe {
  name: string;
  id: string;
  remoteJidAlt?: string;  // ✅ Número real quando há LID
  addressingMode?: string;  // ✅ 'lid' ou 'pn'
}

interface SessionOpenAi extends OpenAI {
  id?: number;
}
const sessionsOpenAi: SessionOpenAi[] = [];
const ticketMutexes = new Map<string, Mutex>();

const getTicketMutex = (key: string): Mutex => {
  let mutex = ticketMutexes.get(key);
  if (!mutex) {
    mutex = new Mutex();
    ticketMutexes.set(key, mutex);
  }
  return mutex;
};

const writeFileAsync = promisify(writeFile);

function removeFile(directory) {
  fs.unlink(directory, error => {
    if (error) throw error;
  });
}

const getTimestampMessage = (msgTimestamp: any) => {
  return msgTimestamp * 1;
};

const multVecardGet = function (param: any) {
  let output = " ";

  let name = param
    .split("\n")[2]
    .replace(";;;", "\n")
    .replace("N:", "")
    .replace(";", "")
    .replace(";", " ")
    .replace(";;", " ")
    .replace("\n", "");
  let inicio = param.split("\n")[4].indexOf("=");
  let fim = param.split("\n")[4].indexOf(":");
  let contact = param
    .split("\n")[4]
    .substring(inicio + 1, fim)
    .replace(";", "");
  let contactSemWhats = param.split("\n")[4].replace("item1.TEL:", "");
  //console.log(contact);
  if (contact != "item1.TEL") {
    output = output + name + ": 📞" + contact + "" + "\n";
  } else output = output + name + ": 📞" + contactSemWhats + "" + "\n";
  return output;
};

const contactsArrayMessageGet = (msg: any) => {
  let contactsArray = msg.message?.contactsArrayMessage?.contacts;
  let vcardMulti = contactsArray.map(function (item, indice) {
    return item.vcard;
  });

  let bodymessage = ``;
  vcardMulti.forEach(function (vcard, indice) {
    bodymessage += vcard + "\n\n" + "";
  });

  let contacts = bodymessage.split("BEGIN:");

  contacts.shift();
  let finalContacts = "";
  for (let contact of contacts) {
    finalContacts = finalContacts + multVecardGet(contact);
  }

  return finalContacts;
};

const getTypeMessage = (msg: proto.IWebMessageInfo): string => {
  const msgType = getContentType(msg.message);
  if (
    msg.message?.extendedTextMessage &&
    msg.message?.extendedTextMessage?.contextInfo &&
    msg.message?.extendedTextMessage?.contextInfo?.externalAdReply
  ) {
    return "adMetaPreview"; // Adicionado para tratar mensagens de anúncios;
  }
  if (msg.message?.viewOnceMessageV2) {
    return "viewOnceMessageV2";
  }
  return msgType;
};

const hasCompanionDeviceSuffix = (jid?: string | null): boolean =>
  Boolean(jid && /:\d+@(?:s\.whatsapp\.net|lid)$/.test(jid));

type OutgoingWebhookOriginOverride = "system" | "cellphone" | "companion";

const getOutgoingWebhookOrigin = (
  msg: proto.IWebMessageInfo,
  fromAgent: boolean = false,
  originOverride?: OutgoingWebhookOriginOverride
) => {
  if (fromAgent || originOverride === "system") {
    return {
      source: "system",
      fromExternalDevice: false,
      fromCellphone: false,
      fromCompanion: false,
      deviceOrigin: "system"
    };
  }

  if (originOverride === "companion") {
    return {
      source: "channel",
      fromExternalDevice: true,
      fromCellphone: false,
      fromCompanion: true,
      deviceOrigin: "companion"
    };
  }

  if (originOverride === "cellphone") {
    return {
      source: "channel",
      fromExternalDevice: true,
      fromCellphone: true,
      fromCompanion: false,
      deviceOrigin: "cellphone"
    };
  }

  const participantAlt = (msg.key as any)?.participantAlt as string | undefined;
  const participant = msg.key?.participant as string | undefined;
  const remoteJidAlt = (msg.key as any)?.remoteJidAlt as string | undefined;
  const messageContent = msg.message as any;

  const fromCompanion =
    hasCompanionDeviceSuffix(participantAlt) ||
    hasCompanionDeviceSuffix(participant) ||
    hasCompanionDeviceSuffix(remoteJidAlt) ||
    Boolean(messageContent?.deviceSentMessage);

  return {
    source: "channel",
    fromExternalDevice: true,
    fromCellphone: !fromCompanion,
    fromCompanion,
    deviceOrigin: fromCompanion ? "companion" : "cellphone"
  };
};

const getAd = (msg: any): string => {
  if (
    msg.key.fromMe &&
    msg.message?.listResponseMessage?.contextInfo?.externalAdReply
  ) {
    let bodyMessage = `*${msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.title}*`;

    bodyMessage += `\n\n${msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.body}`;

    return bodyMessage;
  }
};

const serializeInteractiveButtons = (buttons: any[] = []) =>
  (buttons || []).map((btn: any) => {
    try {
      const params =
        typeof btn?.buttonParamsJson === "string"
          ? JSON.parse(btn.buttonParamsJson)
          : btn?.buttonParamsJson || {};

      return {
        tipo: btn?.name,
        texto: params.display_text || "",
        conteudo:
          params.phone_number ||
          params.phoneNumber ||
          params.url ||
          params.copy_code ||
          params.id ||
          params.title ||
          ""
      };
    } catch {
      return { tipo: btn?.name, texto: "", conteudo: "" };
    }
  });

const serializeInteractiveMessageBody = (interactiveMsg: any): string => {
  if (!interactiveMsg) return "";

  const buttons = interactiveMsg?.nativeFlowMessage?.buttons || [];
  const firstButtonName = buttons?.[0]?.name;

  if (interactiveMsg?.carouselMessage?.cards?.length) {
    const cards = interactiveMsg.carouselMessage.cards.map((card: any, index: number) => ({
      titulo:
        card?.header?.title ||
        card?.body?.text?.split("\n")?.[0] ||
        `Card ${index + 1}`,
      descricao: card?.body?.text || "",
      rodape: card?.footer?.text || "",
      botoes: serializeInteractiveButtons(card?.nativeFlowMessage?.buttons || [])
    }));

    return `[CAROUSEL]${JSON.stringify({ cards })}`;
  }

  if (firstButtonName === "review_and_pay") {
    return "[PIX]";
  }

  if (firstButtonName === "single_select") {
    try {
      const params =
        typeof buttons?.[0]?.buttonParamsJson === "string"
          ? JSON.parse(buttons[0].buttonParamsJson)
          : buttons?.[0]?.buttonParamsJson || {};

      const sections = Array.isArray(params?.sections)
        ? params.sections.map((section: any, sectionIndex: number) => ({
            titulo: section?.title || `Seção ${sectionIndex + 1}`,
            linhas: (section?.rows || []).map((row: any, rowIndex: number) => ({
              titulo: row?.title || `Opção ${rowIndex + 1}`,
              descricao: row?.description || "",
              idLinha: row?.id || row?.rowId || `row_${sectionIndex + 1}_${rowIndex + 1}`
            }))
          }))
        : [];

      return `[LIST]${JSON.stringify({
        titulo: interactiveMsg?.body?.text || "",
        descricao: interactiveMsg?.body?.text || "",
        textoBotao: params?.title || "Ver opções",
        rodape: interactiveMsg?.footer?.text || "",
        secoes: sections
      })}`;
    } catch {
      return "[LIST]";
    }
  }

  if (interactiveMsg?.body?.text || buttons.length) {
    try {
      return `[BOTOES]${JSON.stringify({
        titulo: interactiveMsg?.body?.text || "",
        rodape: interactiveMsg?.footer?.text || "",
        botoes: serializeInteractiveButtons(buttons)
      })}`;
    } catch {
      return "[BOTOES]";
    }
  }

  return "";
};

const getBodyButton = (msg: any): string => {
  try {
    if (
      msg?.messageType === "buttonsMessage" ||
      msg?.message?.buttonsMessage?.contentText
    ) {
      let bodyMessage = `[BUTTON]\n\n*${msg?.message?.buttonsMessage?.contentText}*\n\n`;
      // eslint-disable-next-line no-restricted-syntax
      for (const button of msg.message?.buttonsMessage?.buttons) {
        bodyMessage += `*${button.buttonId}* - ${button.buttonText.displayText}\n`;
      }

      return bodyMessage;
    }
    if (
      msg?.messageType === "viewOnceMessage" ||
      msg?.message?.viewOnceMessage?.message?.interactiveMessage
    ) {
      return serializeInteractiveMessageBody(
        msg?.message?.viewOnceMessage?.message?.interactiveMessage
      );
    }

    if (
      msg?.messageType === "interactiveMessage" ||
      msg?.message?.interactiveMessage
    ) {
      return serializeInteractiveMessageBody(msg?.message?.interactiveMessage) || null;
    }

    // Note: viewOnceMessage with interactiveMessage is handled above (lines ~260-310)

    if (
      msg?.messageType === "listMessage" ||
      msg?.message?.listMessage?.description
    ) {
      let bodyMessage = `[LIST]\n\n`;
      bodyMessage += msg?.message?.listMessage?.title
        ? `*${msg?.message?.listMessage?.title}**\n`
        : "sem titulo\n";
      bodyMessage += msg?.message?.listMessage?.description
        ? `*${msg?.message?.listMessage?.description}*\n\n`
        : "sem descrição\n\n";
      bodyMessage += msg?.message?.listMessage?.footerText
        ? `${msg?.message?.listMessage?.footerText}\n\n`
        : "\n\n";
      const sections = msg?.message?.listMessage?.sections;
      if (sections && sections.length > 0) {
        for (const section of sections) {
          bodyMessage += section?.title ? `*${section.title}*\n` : "Sem titulo";
          const rows = section?.rows;
          if (rows && rows.length > 0) {
            for (const row of rows) {
              const rowTitle = row?.title || "";
              const rowDescription = row?.description || "Sem descrição";
              const rowId = row?.rowId || "";
              bodyMessage += `${rowTitle} - ${rowDescription} - ${rowId}\n`;
            }
          }
          bodyMessage += `\n`;
        }
      }
      return bodyMessage;
    }
  } catch (error) {
    logger.error(error);
  }
};

const getBodyPIX = (msg: any): string => {
  try {
    // Verifica se é uma mensagem interativa
    if (
      msg?.messageType === "interactiveMessage" ||
      msg?.message?.interactiveMessage
    ) {
      let bodyMessage = "[PIX]"; // Inicializa bodyMessage com [PIX]
      console.log("mensagem enviada pelo cel", msg);

      // Verifica se há botões na mensagem
      const buttons =
        msg?.message?.interactiveMessage?.nativeFlowMessage?.buttons;
      console.log("Buttons:", buttons);

      // Se buttons existe e contém o botão 'review_and_pay'
      const bodyTextWithPix =
        Array.isArray(buttons) &&
        buttons.some(button => (button.name = "review_and_pay"));

      // Se o botão específico foi encontrado
      if (bodyTextWithPix) {
        console.log("Mensagem de PIX detectada.");
      } else {
        console.log("Nenhuma mensagem de PIX encontrada.");
        return ""; // Retorna vazio se não encontrar o botão
      }

      // Log do bodyMessage final antes do retorno
      console.log("bodyMessage final:", bodyMessage);
      return bodyMessage; // Retorna [PIX]
    }
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
  }

  return ""; // Retorna uma string vazia se a condição inicial não for satisfeita
};

const msgLocation = (image, latitude, longitude) => {
  if (image) {
    var b64 = Buffer.from(image).toString("base64");

    let data = `data:image/png;base64, ${b64} | https://maps.google.com/maps?q=${latitude}%2C${longitude}&z=17&hl=pt-BR|${latitude}, ${longitude} `;
    return data;
  }
};

export const getBodyMessage = (msg: proto.IWebMessageInfo): string | null => {
  try {
    let type = getTypeMessage(msg);

    if (type === undefined) console.log(JSON.stringify(msg));

    const types = {
      conversation: msg.message?.conversation,
      imageMessage: msg.message?.imageMessage?.caption,
      videoMessage: msg.message?.videoMessage?.caption,
      ptvMessage: msg.message?.ptvMessage?.caption,
      extendedTextMessage: msg?.message?.extendedTextMessage?.text,
      buttonsResponseMessage:
        msg.message?.buttonsResponseMessage?.selectedDisplayText,
      listResponseMessage:
        msg.message?.listResponseMessage?.title ||
        msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
      templateButtonReplyMessage:
        msg.message?.templateButtonReplyMessage?.selectedId,
      messageContextInfo:
        msg.message?.buttonsResponseMessage?.selectedButtonId ||
        msg.message?.listResponseMessage?.title,
      buttonsMessage:
        getBodyButton(msg) || msg.message?.listResponseMessage?.title,
      stickerMessage: "sticker",
      contactMessage: msg.message?.contactMessage?.vcard,
      contactsArrayMessage:
        msg.message?.contactsArrayMessage?.contacts &&
        contactsArrayMessageGet(msg),
      //locationMessage: `Latitude: ${msg.message.locationMessage?.degreesLatitude} - Longitude: ${msg.message.locationMessage?.degreesLongitude}`,
      locationMessage: msgLocation(
        msg.message?.locationMessage?.jpegThumbnail,
        msg.message?.locationMessage?.degreesLatitude,
        msg.message?.locationMessage?.degreesLongitude
      ),
      liveLocationMessage: `Latitude: ${msg.message?.liveLocationMessage?.degreesLatitude} - Longitude: ${msg.message?.liveLocationMessage?.degreesLongitude}`,
      documentMessage: msg.message?.documentMessage?.caption,
      audioMessage: "Áudio",
      interactiveMessage: getBodyPIX(msg),
      listMessage:
        getBodyButton(msg) || msg.message?.listResponseMessage?.title,
      viewOnceMessage:
        getBodyButton(msg) ||
        msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
      reactionMessage: msg.message?.reactionMessage?.text || "reaction",
      senderKeyDistributionMessage:
        msg?.message?.senderKeyDistributionMessage
          ?.axolotlSenderKeyDistributionMessage,
      documentWithCaptionMessage:
        msg.message?.documentWithCaptionMessage?.message?.documentMessage
          ?.caption,
      viewOnceMessageV2:
        msg.message?.viewOnceMessageV2?.message?.imageMessage?.caption,
      adMetaPreview: msgAdMetaPreview(
        msg.message?.extendedTextMessage?.contextInfo?.externalAdReply
          ?.thumbnail,
        msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.title,
        msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.body,
        msg.message?.extendedTextMessage?.contextInfo?.externalAdReply
          ?.sourceUrl,
        msg.message?.extendedTextMessage?.text
      ), // Adicionado para tratar mensagens de anúncios;
      editedMessage:
        msg?.message?.protocolMessage?.editedMessage?.conversation ||
        msg?.message?.editedMessage?.message?.protocolMessage?.editedMessage
          ?.conversation,
      ephemeralMessage:
        msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text,
      imageWhitCaptionMessage:
        msg?.message?.ephemeralMessage?.message?.imageMessage,
      highlyStructuredMessage: msg.message?.highlyStructuredMessage,
      protocolMessage:
        msg?.message?.protocolMessage?.editedMessage?.conversation,
      advertising:
        getAd(msg) ||
        msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.title,
      pollCreationMessageV3: msg?.message?.pollCreationMessageV3
        ? `*Enquete*\n${msg.message.pollCreationMessageV3.name
        }\n\n${msg.message.pollCreationMessageV3.options
          .map(option => option.optionName)
          .join("\n")}`
        : null,
      eventMessage: msg?.message?.eventMessage?.name
        ? `*Nome do Evento: ${msg.message.eventMessage.name}*\n`
        : "sem nome do evento\n"
    };

    const objKey = Object.keys(types).find(key => key === type);

    if (!objKey) {
      logger.warn(
        `#### Nao achou o type 152: ${type} ${JSON.stringify(msg.message)}`
      );
      Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, type });
      Sentry.captureException(
        new Error("Novo Tipo de Mensagem em getTypeMessage")
      );
    }
    return types[type];
  } catch (error) {
    Sentry.setExtra("Error getTypeMessage", { msg, BodyMsg: msg.message });
    Sentry.captureException(error);
    console.log(error);
  }
};

const msgAdMetaPreview = (image, title, body, sourceUrl, messageUser) => {
  if (image) {
    var b64 = Buffer.from(image).toString("base64");
    let data = `data:image/png;base64, ${b64} | ${sourceUrl} | ${title} | ${body} | ${messageUser}`;
    return data;
  }
};

export const getQuotedMessage = (msg: proto.IWebMessageInfo) => {
  const body = extractMessageContent(msg.message)[
    Object.keys(msg?.message).values().next().value
  ];

  if (!body?.contextInfo?.quotedMessage) return;
  const quoted = extractMessageContent(
    body?.contextInfo?.quotedMessage[
    Object.keys(body?.contextInfo?.quotedMessage).values().next().value
    ]
  );

  return quoted;
};

export const getQuotedMessageId = (msg: proto.IWebMessageInfo) => {
  const body = extractMessageContent(msg.message)[
    Object.keys(msg?.message).values().next().value
  ];
  let reaction = msg?.message?.reactionMessage
    ? msg?.message?.reactionMessage?.key?.id
    : "";

  return reaction ? reaction : body?.contextInfo?.stanzaId;
};

const getMeSocket = (wbot: Session): IMe => {
  return {
    id: jidNormalizedUser((wbot as WASocket).user.id),
    name: (wbot as WASocket).user.name
  };
};

const getSenderMessage = async (
  msg: any,
  wbot: Session
): Promise<string> => {
  const me = await getMeSocket(wbot);
  if (msg.key.fromMe) return me.id;

  let senderId;

  // ✅ Usar extractCleanNumber para evitar DEVICE_ID
  if (msg.key.remoteJidAlt) {
    const cleanNumber = extractCleanNumber(msg.key.remoteJidAlt);
    senderId = cleanNumber ? `${cleanNumber}@s.whatsapp.net` : msg.key.remoteJidAlt;
  } else if (msg.key.participantAlt) {
    const cleanNumber = extractCleanNumber(msg.key.participantAlt);
    senderId = cleanNumber ? `${cleanNumber}@s.whatsapp.net` : msg.key.participantAlt;
  } else {
    senderId = msg.participant || msg.key.participant || msg.key.remoteJid || undefined;
  }

  return senderId && jidNormalizedUser(senderId);
};

const getContactMessage = async (msg: any, wbot: Session, senderPn?: string) => {
  logger.info("=== GET CONTACT MESSAGE START ===");
  const remoteJid = msg?.key?.remoteJid || "";
  const remoteJidAlt = msg?.key?.remoteJidAlt || "";
  const participant = msg?.key?.participant || "";
  const participantAlt = msg?.key?.participantAlt || "";

  logger.info("Message key info:", {
    remoteJid,
    remoteJidAlt,
    fromMe: msg?.key?.fromMe,
    participant,
    participantAlt,
    addressingMode: msg?.key?.addressingMode
  });

  const isGroup = remoteJid.includes("g.us");
  const isNewsletter = remoteJid.includes("newsletter");

  // Ignorar mensagens de newsletter
  if (isNewsletter) {
    logger.info(`[newsletter] Ignorando mensagem de newsletter: ${remoteJid}`);
    return null;
  }

  const resolvedRemoteJidAlt =
    remoteJidAlt ||
    senderPn ||
    (msg?.key?.fromMe && !isGroup ? sanitizeRemoteJid(remoteJid, resolveContactNumber({
      rawNumber: remoteJid,
      remoteJid,
      remoteJidAlt: remoteJidAlt || senderPn
    }), false) : "");

  const baseNumber = resolveContactNumber({
    rawNumber: resolvedRemoteJidAlt || remoteJid,
    remoteJid,
    remoteJidAlt: resolvedRemoteJidAlt
  });
  const normalizedContactJid = sanitizeRemoteJid(resolvedRemoteJidAlt || remoteJid, baseNumber, false);
  const contactId = isGroup
    ? remoteJid
    : normalizedContactJid || remoteJid;

  const rawNumber = baseNumber || (contactId || "").replace(/\D/g, "");

  logger.info("Contact processing:", {
    isGroup,
    rawNumber,
    contactId,
    addressingMode: msg?.key?.addressingMode,
    hasRemoteJidAlt: !!resolvedRemoteJidAlt
  });

  const participantBase = participantAlt || participant || remoteJid;
  const senderDigits = resolveContactNumber({
    rawNumber: participantBase,
    remoteJid: participantBase,
    remoteJidAlt: participantAlt
  });
  const senderId = isGroup
    ? participantBase
    : sanitizeRemoteJid(participantAlt || participant || remoteJid, senderDigits, false) || participantBase;

  const result = isGroup
    ? {
      id: senderId,
      name: msg.pushName,
      remoteJidAlt: resolvedRemoteJidAlt,
      addressingMode: msg?.key?.addressingMode
    }
    : {
      id: contactId,
      name: msg.key.fromMe ? rawNumber : msg.pushName,
      remoteJidAlt: resolvedRemoteJidAlt || (baseNumber ? contactId : ""),
      addressingMode: msg?.key?.addressingMode
    };

  logger.debug("Contact message result:", result);
  logger.debug("=== GET CONTACT MESSAGE END ===");

  return result;
};

function findCaption(obj) {
  if (typeof obj !== "object" || obj === null) {
    return null;
  }

  for (const key in obj) {
    if (key === "caption" || key === "text" || key === "conversation") {
      return obj[key];
    }

    const result = findCaption(obj[key]);
    if (result) {
      return result;
    }
  }

  return null;
}



const getUnpackedMessage = (msg: proto.IWebMessageInfo) => {
  return (
    msg.message?.documentWithCaptionMessage?.message ||
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    msg.message?.ephemeralMessage?.message ||
    msg.message?.viewOnceMessage?.message ||
    msg.message?.viewOnceMessageV2?.message ||
    msg.message?.ephemeralMessage?.message ||
    msg.message?.templateMessage?.hydratedTemplate ||
    msg.message?.templateMessage?.hydratedFourRowTemplate ||
    msg.message?.templateMessage?.fourRowTemplate ||
    msg.message?.interactiveMessage?.header ||
    msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate ||
    msg.message
  );
};
const getMessageMedia = (message: proto.IMessage) => {
  return (
    message?.imageMessage ||
    message?.audioMessage ||
    message?.videoMessage ||
    message?.stickerMessage ||
    message?.documentMessage ||
    null
  );
};
const downloadMedia = async (
  msg: proto.IWebMessageInfo,
  isImported: Date = null,
  wbot: Session,
  ticket: Ticket
) => {
  const unpackedMessage = getUnpackedMessage(msg);
  const message = getMessageMedia(unpackedMessage);
  if (!message) {
    return null;
  }
  const fileLimit = parseInt(await CheckSettings1("downloadLimit", "15"), 10);
  if (
    wbot &&
    message?.fileLength &&
    +message.fileLength > fileLimit * 1024 * 1024
  ) {
    const fileLimitMessage = {
      text: `\u200e*Mensagem Automática*:\nNosso sistema aceita apenas arquivos com no máximo ${fileLimit} MiB`
    };
    const sendMsg = await wbot.sendMessage(
      `${ticket.contact.number}@${"s.whatsapp.net"}`,
      fileLimitMessage
    );
    sendMsg.message.extendedTextMessage.text =
      "\u200e*Mensagem do sistema*:\nArquivo recebido além do limite de tamanho do sistema, se for necessário ele pode ser obtido no aplicativo do whatsapp.";
    // eslint-disable-next-line no-use-before-define
    await verifyMessage(sendMsg, ticket, ticket.contact);
    throw new Error("ERR_FILESIZE_OVER_LIMIT");
  }

  if (msg.message?.stickerMessage) {
    const urlAnt = "https://web.whatsapp.net";
    const directPath = msg.message?.stickerMessage?.directPath;
    const newUrl = "https://mmg.whatsapp.net";
    const final = newUrl + directPath;
    if (msg.message?.stickerMessage?.url?.includes(urlAnt)) {
      msg.message.stickerMessage.url = msg.message?.stickerMessage.url.replace(
        urlAnt,
        final
      );
    }
  }

  let buffer;
  try {
    buffer = await downloadMediaMessage(
      msg,
      "buffer",
      {},
      {
        logger,
        reuploadRequest: wbot.updateMediaMessage
      }
    );
  } catch (err) {
    if (isImported) {
      console.log(
        "Falha ao fazer o download de uma mensagem importada, provavelmente a mensagem já não esta mais disponível"
      );
    } else {
      console.error("Erro ao baixar mídia:", err);
    }
  }

  if (!buffer) {
    logger.warn(`[downloadMedia] buffer indefinido após tentativa de download (msgId=${msg.key?.id}, remoteJid=${msg.key?.remoteJid}). Retornando null.`);
    return null;
  }

  let filename = msg.message?.documentMessage?.fileName || "";

  const mineType =
    msg.message?.imageMessage ||
    msg.message?.audioMessage ||
    msg.message?.videoMessage ||
    msg.message?.stickerMessage ||
    msg.message?.ephemeralMessage?.message?.stickerMessage ||
    msg.message?.documentMessage ||
    msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
    msg.message?.ephemeralMessage?.message?.audioMessage ||
    msg.message?.ephemeralMessage?.message?.documentMessage ||
    msg.message?.ephemeralMessage?.message?.videoMessage ||
    msg.message?.ephemeralMessage?.message?.imageMessage ||
    msg.message?.viewOnceMessage?.message?.imageMessage ||
    msg.message?.viewOnceMessage?.message?.videoMessage ||
    msg.message?.viewOnceMessageV2?.message?.imageMessage ||
    msg.message?.viewOnceMessageV2?.message?.videoMessage ||
    msg.message?.viewOnceMessageV2?.message?.audioMessage ||
    msg.message?.viewOnceMessageV2?.message?.documentMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
      ?.imageMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
      ?.videoMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
      ?.audioMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
      ?.documentMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessageV2?.message
      ?.imageMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessageV2?.message
      ?.videoMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessageV2?.message
      ?.audioMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessageV2?.message
      ?.documentMessage ||
    msg.message?.templateMessage?.hydratedTemplate?.imageMessage ||
    msg.message?.templateMessage?.hydratedTemplate?.documentMessage ||
    msg.message?.templateMessage?.hydratedTemplate?.videoMessage ||
    msg.message?.templateMessage?.hydratedFourRowTemplate?.imageMessage ||
    msg.message?.templateMessage?.hydratedFourRowTemplate?.documentMessage ||
    msg.message?.templateMessage?.hydratedFourRowTemplate?.videoMessage ||
    msg.message?.templateMessage?.fourRowTemplate?.imageMessage ||
    msg.message?.templateMessage?.fourRowTemplate?.documentMessage ||
    msg.message?.templateMessage?.fourRowTemplate?.videoMessage ||
    msg.message?.interactiveMessage?.header?.imageMessage ||
    msg.message?.interactiveMessage?.header?.documentMessage ||
    msg.message?.interactiveMessage?.header?.videoMessage;

  if (!filename) {
    const ext = mineType.mimetype.split("/")[1].split(";")[0];
    filename = `${new Date().getTime()}.${ext}`;
  } else {
    filename = `${new Date().getTime()}_${filename}`;
  }

  const media = {
    data: buffer,
    mimetype: mineType.mimetype,
    filename
  };

  return media;
};

const verifyContact = async (
  msgContact: IMe,
  wbot: Session,
  companyId: number,
  msg?: proto.IWebMessageInfo
): Promise<Contact> => {
  logger.info("=== VERIFY CONTACT START ===");
  logger.info("msgContact received:", {
    id: msgContact.id,
    name: msgContact.name,
    remoteJidAlt: msgContact.remoteJidAlt,
    addressingMode: msgContact.addressingMode
  });

  let profilePicUrl: string = "";
  const isGroup = (msgContact.id || "").includes("g.us");

  const number = resolveContactNumber({
    rawNumber: msgContact.id,
    remoteJid: msgContact.id,
    remoteJidAlt: msgContact.remoteJidAlt,
    forGroup: isGroup
  });

  if (!number && !isGroup) {
    logger.warn("Não foi possível extrair número válido para contato LID", {
      id: msgContact.id,
      remoteJidAlt: msgContact.remoteJidAlt
    });
  }

  logger.info("Extracted number:", number);

  const name = msgContact?.name || number;

  // ✅ Construir remoteJid com número real
  let remoteJid: string;

  remoteJid = sanitizeRemoteJid(msgContact.id, number, isGroup);

  // ✅ Tentar obter foto (contatos e grupos) com timeout para não bloquear o fluxo
  if (wbot) {
    try {
      const picPromise = wbot.profilePictureUrl(remoteJid, "image");
      const picTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("profilePictureUrl timeout")), 3000)
      );
      profilePicUrl = await Promise.race([picPromise, picTimeout]);
      logger.info("Got profile picture URL:", profilePicUrl);
    } catch (err) {
      logger.debug("Could not get profile picture:", err?.message);
      profilePicUrl = "";
    }
  }

  logger.info("Final contact data:", {
    number,
    remoteJid,
    isGroup,
    addressingMode: msgContact.addressingMode
  });

  const contactData: any = {
    name,
    number,
    profilePicUrl,
    isGroup,
    companyId,
    remoteJid: msgContact.id,
    remoteJidAlt: msgContact.remoteJidAlt,
    whatsappId: wbot.id,
    wbot,
    addressingMode: msgContact.addressingMode,
    msgBody: msg?.body || ""
  };

  if (contactData.isGroup) {
    // Para grupos, extrair o ID diretamente do JID (não normalizar como telefone)
    contactData.number = resolveContactNumber({
      rawNumber: msgContact.id,
      remoteJid: msgContact.id,
      forGroup: true
    });
  }

  const contact = await CreateOrUpdateContactService(contactData);

  logger.debug("Contact created/updated:", {
    id: contact.id,
    name: contact.name,
    number: contact.number,
    remoteJid: contact.remoteJid,
    addressingMode: contact.addressingMode
  });
  logger.debug("=== VERIFY CONTACT END ===");

  return contact;
};

const verifyQuotedMessage = async (
  msg: proto.IWebMessageInfo
): Promise<Message | null> => {
  if (!msg) return null;
  const quoted = getQuotedMessageId(msg);

  if (!quoted) return null;

  const quotedMsg = await Message.findOne({
    where: { wid: quoted }
  });

  if (!quotedMsg) return null;

  return quotedMsg;
};

export const verifyMediaMessage = async (
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  ticketTraking: TicketTraking,
  isForwarded: boolean = false,
  isPrivate: boolean = false,
  wbot: Session,
  isMessageImported: boolean = false
): Promise<Message> => {
  const io = getIO();
  const quotedMsg = await verifyQuotedMessage(msg);
  const companyId = ticket.companyId;

  try {
    const media = await downloadMedia(msg, ticket?.imported, wbot, ticket);

    if (!media && ticket.imported) {
      const body =
        "*System:* \nFalha no download da mídia verifique no dispositivo";
      const messageData = {
        //mensagem de texto
        wid: msg.key.id,
        ticketId: ticket.id,
        contactId: msg.key.fromMe ? undefined : ticket.contactId,
        body,
        reactionMessage: msg.message?.reactionMessage,
        fromMe: msg.key.fromMe,
        mediaType: getTypeMessage(msg),
        read: msg.key.fromMe,
        quotedMsgId: quotedMsg?.id || msg.message?.reactionMessage?.key?.id,
        ack: msg.status,
        companyId: companyId,
        remoteJid: (msg.key as any).remoteJidAlt || msg.key.remoteJid,
        participant: (msg.key as any).participantAlt || msg.key.participant,
        timestamp: getTimestampMessage(msg.messageTimestamp),
        createdAt: new Date(
          Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)
        ).toISOString(),
        dataJson: JSON.stringify(msg),
        ticketImported: isMessageImported,
        isForwarded,
        isPrivate
      };

      await ticket.update({
        lastMessage: body
      });
      logger.error(Error("ERR_WAPP_DOWNLOAD_MEDIA"));
      return CreateMessageService({ messageData, companyId: companyId });
    }

    if (!media) {
      throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
    }

    // if (!media.filename || media.mimetype === "audio/mp4") {
    //   const ext = media.mimetype === "audio/mp4" ? "m4a" : media.mimetype.split("/")[1].split(";")[0];
    //   media.filename = `${new Date().getTime()}.${ext}`;
    // } else {
    //   // ext = tudo depois do ultimo .
    //   const ext = media.filename.split(".").pop();
    //   // name = tudo antes do ultimo .
    //   const name = media.filename.split(".").slice(0, -1).join(".").replace(/\s/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    //   media.filename = `${name.trim()}_${new Date().getTime()}.${ext}`;
    // }
    if (!media.filename) {
      const ext = media.mimetype.split("/")[1].split(";")[0];
      media.filename = `${new Date().getTime()}.${ext}`;
    } else {
      // ext = tudo depois do ultimo .
      const ext = media.filename.split(".").pop();
      // name = tudo antes do ultimo .
      const name = media.filename
        .split(".")
        .slice(0, -1)
        .join(".")
        .replace(/\s/g, "_")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      media.filename = `${name.trim()}_${new Date().getTime()}.${ext}`;
    }

    try {
      const folder = path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "public",
        `company${companyId}`
      );

      // const folder = `public/company${companyId}`; // Correção adicionada por Altemir 16-08-2023
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true }); // Correção adicionada por Altemir 16-08-2023
        fs.chmodSync(folder, 0o777);
      }

      await writeFileAsync(
        join(folder, media.filename),
        media.data.toString("base64"),
        "base64"
      ) // Correção adicionada por Altemir 16-08-2023
        .then(() => {
          // console.log("Arquivo salvo com sucesso!");
          if (media.mimetype.includes("audio")) {
            console.log(media.mimetype);
            const inputFile = path.join(folder, media.filename);
            let outputFile: string;

            if (inputFile.endsWith(".mpeg")) {
              outputFile = inputFile.replace(".mpeg", ".mp3");
            } else if (inputFile.endsWith(".ogg")) {
              outputFile = inputFile.replace(".ogg", ".mp3");
            } else {
              // Trate outros formatos de arquivo conforme necessário
              //console.error("Formato de arquivo não suportado:", inputFile);
              return;
            }

            return new Promise<void>((resolve, reject) => {
              ffmpeg(inputFile)
                .toFormat("mp3")
                .save(outputFile)
                .on("end", () => {
                  resolve();
                })
                .on("error", (err: any) => {
                  reject(err);
                });
            });
          }
        });
      // .then(() => {
      //   //console.log("Conversão concluída!");
      //   // Aqui você pode fazer o que desejar com o arquivo MP3 convertido.
      // })
    } catch (err) {
      Sentry.setExtra("Erro media", {
        companyId: companyId,
        ticket,
        contact,
        media,
        quotedMsg
      });
      Sentry.captureException(err);
      logger.error(`[verifyMediaMessage] Falha ao salvar arquivo de mídia no disco (msgId=${msg.key?.id}, arquivo=${media.filename}):`, err);
      // Rethrow para evitar que um registro com mediaUrl inválido seja salvo no banco
      throw err;
    }

    const body = getBodyMessage(msg);

    const messageData = {
      wid: msg.key.id,
      ticketId: ticket.id,
      contactId: msg.key.fromMe ? undefined : contact.id,
      body: body || media.filename,
      fromMe: msg.key.fromMe,
      read: msg.key.fromMe,
      mediaUrl: media.filename,
      mediaType: media.mimetype.split("/")[0],
      quotedMsgId: quotedMsg?.id,
      ack:
        Number(
          String(msg.status).replace("PENDING", "2").replace("NaN", "1")
        ) || 2,
      remoteJid: (msg.key as any).remoteJidAlt ?? msg.key.remoteJid,
      participant: (msg.key as any).participantAlt ?? msg.key.participant,
      dataJson: JSON.stringify(msg),
      ticketTrakingId: ticketTraking?.id,
      createdAt: new Date(
        Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)
      ).toISOString(),
      ticketImported: isMessageImported,
      isForwarded,
      isPrivate
    };

    await ticket.update({
      lastMessage: body || media.filename
    });

    const newMessage = await CreateMessageService({
      messageData,
      companyId: companyId
    });

    if (!msg.key.fromMe && ticket.status === "closed") {
      await ticket.update({ status: "pending" });
      await ticket.reload({
        attributes: [
          "id",
          "uuid",
          "queueId",
          "isGroup",
          "channel",
          "status",
          "contactId",
          "useIntegration",
          "lastMessage",
          "updatedAt",
          "unreadMessages",
          "companyId",
          "whatsappId",
          "imported",
          "lgpdAcceptedAt",
          "amountUsedBotQueues",
          "useIntegration",
          "integrationId",
          "userId",
          "amountUsedBotQueuesNPS",
          "lgpdSendMessageAt",
          "isBot"
        ],
        include: [
          { model: Queue, as: "queue" },
          { model: User, as: "user" },
          { model: Contact, as: "contact" },
          { model: Whatsapp, as: "whatsapp" }
        ]
      });

      io.of(String(companyId))
        // .to("closed")
        .emit(`company-${companyId}-ticket`, {
          action: "delete",
          ticket,
          ticketId: ticket.id
        });
      // console.log("emitiu socket 902", ticket.id)
      io.of(String(companyId))
        // .to(ticket.status)
        //   .to(ticket.id.toString())
        .emit(`company-${companyId}-ticket`, {
          action: "update",
          ticket,
          ticketId: ticket.id
        });
    }

    return newMessage;
  } catch (error) {
    console.log(error);
    logger.warn("Erro ao baixar media: ", JSON.stringify(msg));
  }
};

export const verifyMessage = async (
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  ticketTraking?: TicketTraking,
  isPrivate?: boolean,
  isForwarded: boolean = false,
  isMessageImported: boolean = false,
  fromAgent: boolean = false,
  userId?: number,
  outgoingOriginOverride?: OutgoingWebhookOriginOverride
) => {
  // console.log("Mensagem recebida:", JSON.stringify(msg, null, 2));
  const io = getIO();
  const quotedMsg = await verifyQuotedMessage(msg);
  const body = getBodyMessage(msg);
  const companyId = ticket.companyId;

  // Se a mensagem é fromMe e não tem userId específico, usa o userId do ticket
  const messageUserId = userId || (msg.key.fromMe && !fromAgent ? ticket.userId : undefined);

  const messageData = {
    wid: msg.key.id,
    ticketId: ticket.id,
    contactId: msg.key.fromMe ? undefined : contact.id,
    body,
    fromMe: msg.key.fromMe,
    mediaType: getTypeMessage(msg),
    read: msg.key.fromMe,
    quotedMsgId: quotedMsg?.id,
    ack:
      Number(String(msg.status).replace("PENDING", "2").replace("NaN", "1")) ||
      2,
    remoteJid: (msg.key as any).remoteJidAlt ?? msg.key.remoteJid,
    participant: (msg.key as any).participantAlt ?? msg.key.participant,
    dataJson: JSON.stringify(msg),
    ticketTrakingId: ticketTraking?.id,
    isPrivate,
    createdAt: new Date(
      Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)
    ).toISOString(),
    ticketImported: isMessageImported,
    isForwarded,
    fromAgent,
    userId: messageUserId
  };

  await ticket.update({
    lastMessage: body
  });

  const createdMessage = await CreateMessageService({ messageData, companyId: companyId });

  if (msg.key.fromMe && fromAgent && !isPrivate && !isMessageImported) {
    EnqueueInternalMessageSyncService({
      message: createdMessage,
      ticket,
      contact
    }).catch(error => {
      logger.warn(
        {
          wid: createdMessage?.wid,
          error: error?.message
        },
        "[InternalSync] enqueue after message create failed"
      );
    });
  }

  if (msg.key.fromMe && !isPrivate && !isMessageImported) {
    const outgoingOrigin = getOutgoingWebhookOrigin(
      msg,
      fromAgent,
      outgoingOriginOverride
    );
    webhookDispatch("MESSAGE_SENT", companyId, {
      ticket: {
        id: ticket.id,
        status: ticket.status,
        contactId: ticket.contactId,
        queueId: ticket.queueId,
        userId: ticket.userId,
        whatsappId: ticket.whatsappId
      },
      contact: {
        id: contact.id,
        name: contact.name,
        number: contact.number,
        email: contact.email
      },
      message: {
        id: msg.key.id,
        body,
        type: getTypeMessage(msg),
        timestamp: new Date(
          Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)
        ).toISOString(),
        fromMe: true,
        fromAgent,
        userId: messageUserId ?? null,
        source: outgoingOrigin.source,
        fromExternalDevice: outgoingOrigin.fromExternalDevice,
        fromCellphone: outgoingOrigin.fromCellphone,
        fromCompanion: outgoingOrigin.fromCompanion,
        deviceOrigin: outgoingOrigin.deviceOrigin
      },
      whatsapp: {
        id: ticket.whatsappId,
        name: (ticket as any)?.whatsapp?.name,
        number: (ticket as any)?.whatsapp?.number,
        token: (ticket as any)?.whatsapp?.token,
        channel: ticket.channel
      }
    });
  }

  trackProductEvent("MESSAGE_SENT", {
    companyId,
    userId: messageUserId,
    metadata: { fromMe: msg.key.fromMe }
  });

  if (!msg.key.fromMe && ticket.status === "closed") {
    console.log("===== CHANGE =====");
    await ticket.update({ status: "pending" });
    await ticket.reload({
      include: [
        { model: Queue, as: "queue" },
        { model: User, as: "user" },
        { model: Contact, as: "contact" },
        { model: Whatsapp, as: "whatsapp" }
      ]
    });

    // io.to("closed").emit(`company-${companyId}-ticket`, {
    //   action: "delete",
    //   ticket,
    //   ticketId: ticket.id
    // });

    if (!ticket.imported) {
      io.of(String(companyId))
        // .to(ticket.status)
        // .to(ticket.id.toString())
        .emit(`company-${companyId}-ticket`, {
          action: "update",
          ticket,
          ticketId: ticket.id
        });
    }
  }
};

const isValidMsg = (msg: proto.IWebMessageInfo): boolean => {
  const keyAny: any = msg.key as any;
  const remoteJid = keyAny.remoteJidAlt ?? msg.key.remoteJid;
  if (remoteJid === "status@broadcast") return false;
  try {
    const msgType = getTypeMessage(msg);
    if (!msgType) {
      return;
    }

    const ifType =
      msgType === "conversation" ||
      msgType === "extendedTextMessage" ||
      msgType === "audioMessage" ||
      msgType === "videoMessage" ||
      msgType === "ptvMessage" ||
      msgType === "imageMessage" ||
      msgType === "documentMessage" ||
      msgType === "stickerMessage" ||
      msgType === "buttonsResponseMessage" ||
      msgType === "buttonsMessage" ||
      msgType === "messageContextInfo" ||
      msgType === "locationMessage" ||
      msgType === "liveLocationMessage" ||
      msgType === "contactMessage" ||
      msgType === "voiceMessage" ||
      msgType === "mediaMessage" ||
      msgType === "contactsArrayMessage" ||
      msgType === "reactionMessage" ||
      msgType === "ephemeralMessage" ||
      msgType === "protocolMessage" ||
      msgType === "listResponseMessage" ||
      msgType === "listMessage" ||
      msgType === "interactiveMessage" ||
      msgType === "pollCreationMessageV3" ||
      msgType === "viewOnceMessage" ||
      msgType === "documentWithCaptionMessage" ||
      msgType === "viewOnceMessageV2" ||
      msgType === "editedMessage" ||
      msgType === "advertisingMessage" ||
      msgType === "highlyStructuredMessage" ||
      msgType === "eventMessage" ||
      msgType === "adMetaPreview"; // Adicionado para tratar mensagens de anúncios

    if (!ifType) {
      logger.warn(`#### Nao achou o type em isValidMsg: ${msgType}
${JSON.stringify(msg?.message)}`);
      Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, msgType });
      Sentry.captureException(new Error("Novo Tipo de Mensagem em isValidMsg"));
    }

    return !!ifType;
  } catch (error) {
    Sentry.setExtra("Error isValidMsg", { msg });
    Sentry.captureException(error);
  }
};

const sendDialogflowAwswer = async (
  wbot: Session,
  ticket: Ticket,
  msg: WAMessage,
  contact: Contact,
  inputAudio: string | undefined,
  companyId: number,
  queueIntegration: QueueIntegrations
) => {
  const session = await createDialogflowSessionWithModel(queueIntegration);

  if (session === undefined) {
    return;
  }

  wbot.presenceSubscribe(contact.remoteJid);
  await delay(500);

  let dialogFlowReply = await queryDialogFlow(
    session,
    queueIntegration.projectName,
    contact.remoteJid,
    getBodyMessage(msg),
    queueIntegration.language,
    inputAudio
  );

  if (!dialogFlowReply) {
    wbot.sendPresenceUpdate("composing", contact.remoteJid);

    const bodyDuvida = formatBody(
      `\u200e *${queueIntegration?.name}:* Não consegui entender sua dúvida.`
    );

    await delay(1000);

    await wbot.sendPresenceUpdate("paused", contact.remoteJid);

    const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, {
      text: bodyDuvida
    });

    await verifyMessage(sentMessage, ticket, contact);
    return;
  }

  if (dialogFlowReply.endConversation) {
    await ticket.update({
      contactId: ticket.contact.id,
      useIntegration: false
    });
  }

  const image = dialogFlowReply.parameters.image?.stringValue ?? undefined;

  const react = dialogFlowReply.parameters.react?.stringValue ?? undefined;

  const audio = dialogFlowReply.encodedAudio.toString("base64") ?? undefined;

  wbot.sendPresenceUpdate("composing", contact.remoteJid);
  await delay(500);

  let lastMessage;

  for (let message of dialogFlowReply.responses) {
    lastMessage = message.text.text[0] ? message.text.text[0] : lastMessage;
  }
  for (let message of dialogFlowReply.responses) {
    if (message.text) {
      await sendDelayedMessages(
        wbot,
        ticket,
        contact,
        message.text.text[0],
        lastMessage,
        audio,
        queueIntegration
      );
    }
  }
};

async function sendDelayedMessages(
  wbot: Session,
  ticket: Ticket,
  contact: Contact,
  message: string,
  lastMessage: string,
  audio: string | undefined,
  queueIntegration: QueueIntegrations
) {
  const companyId = ticket.companyId;
  // console.log("GETTING WHATSAPP SEND DELAYED MESSAGES", ticket.whatsappId, wbot.id)
  const whatsapp = await ShowWhatsAppService(wbot.id!, companyId);
  const farewellMessage = whatsapp.farewellMessage.replace(/[_*]/g, "");

  // if (react) {
  //   const test =
  //     /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g.test(
  //       react
  //     );
  //   if (test) {
  //     msg.react(react);
  //     await delay(1000);
  //   }
  // }
  const sentMessage = await wbot.sendMessage(contact.remoteJid, {
    text: `\u200e *${queueIntegration?.name}:* ` + message
  });

  await verifyMessage(sentMessage, ticket, contact);
  if (message != lastMessage) {
    await delay(500);
    wbot.sendPresenceUpdate("composing", contact.remoteJid);
  } else if (audio) {
    wbot.sendPresenceUpdate("recording", contact.remoteJid);
    await delay(500);

    // if (audio && message === lastMessage) {
    //   const newMedia = new MessageMedia("audio/ogg", audio);

    //   const sentMessage = await wbot.sendMessage(
    //     `${contact.number}@c.us`,
    //     newMedia,
    //     {
    //       sendAudioAsVoice: true
    //     }
    //   );

    //   await verifyMessage(sentMessage, ticket, contact);
    // }

    // if (sendImage && message === lastMessage) {
    //   const newMedia = await MessageMedia.fromUrl(sendImage, {
    //     unsafeMime: true
    //   });
    //   const sentMessage = await wbot.sendMessage(
    //     `${contact.number}@c.us`,
    //     newMedia,
    //     {
    //       sendAudioAsVoice: true
    //     }
    //   );

    //   await verifyMessage(sentMessage, ticket, contact);
    //   await ticket.update({ lastMessage: "📷 Foto" });
    // }

    if (farewellMessage && message.includes(farewellMessage)) {
      await delay(1000);
      setTimeout(async () => {
        await ticket.update({
          contactId: ticket.contact.id,
          useIntegration: true
        });
        await UpdateTicketService({
          ticketId: ticket.id,
          ticketData: { status: "closed" },
          companyId: companyId
        });
      }, 3000);
    }
  }
}

const verifyQueue = async (
  wbot: Session,
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  settings?: any,
  ticketTraking?: TicketTraking
) => {
  const companyId = ticket.companyId;

  console.log("verifyQueue");
  // console.log("GETTING WHATSAPP VERIFY QUEUE", ticket.whatsappId, wbot.id)
  const { queues, greetingMessage, maxUseBotQueues, timeUseBotQueues } =
    await ShowWhatsAppService(wbot.id!, companyId);

  let chatbot = false;

  if (queues.length === 1) {
    console.log("log... 1186");
    chatbot = queues[0]?.chatbots.length > 1;
  }

  const enableQueuePosition = settings.sendQueuePosition === "enabled";

  if (queues.length === 1 && !chatbot) {
    const sendGreetingMessageOneQueues =
      settings.sendGreetingMessageOneQueues === "enabled" || false;

    console.log("log... 1195");

    //inicia integração dialogflow/n8n
    if (!msg.key.fromMe && !ticket.isGroup && queues[0].integrationId) {
      const integrations = await ShowQueueIntegrationService(
        queues[0].integrationId,
        companyId
      );

      console.log("log... 1206");

      await handleMessageIntegration(
        msg,
        wbot,
        companyId,
        integrations,
        ticket,
        null,
        null,
        null,
        null
      );

      if (msg.key.fromMe) {
        console.log("log... 1211");

        await ticket.update({
          typebotSessionTime: moment().toDate(),
          useIntegration: true,
          integrationId: integrations.id
        });
      } else {
        await ticket.update({
          useIntegration: true,
          integrationId: integrations.id
        });
      }

      // return;
    }

    if (greetingMessage.length > 1 && sendGreetingMessageOneQueues) {
      console.log("log... 1226");
      const body = formatBody(`${greetingMessage}`, ticket);

      if (ticket.whatsapp.greetingMediaAttachment !== null) {
        const filePath = path.resolve(
          "public",
          `company${companyId}`,
          ticket.whatsapp.greetingMediaAttachment
        );

        const fileExists = fs.existsSync(filePath);

        if (fileExists) {
          console.log("log... 1235");
          const messagePath = ticket.whatsapp.greetingMediaAttachment;
          const optionsMsg = await getMessageOptions(
            messagePath,
            filePath,
            String(companyId),
            body
          );
          const debouncedSentgreetingMediaAttachment = debounce(
            async () => {
              const sentMessage = await wbot.sendMessage(
                `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                }`,
                { ...optionsMsg }
              );

              await verifyMediaMessage(
                sentMessage,
                ticket,
                contact,
                ticketTraking,
                false,
                false,
                wbot
              );
            },
            1000,
            ticket.id
          );
          debouncedSentgreetingMediaAttachment();
        } else {
          console.log("log... 1250");
          await wbot.sendMessage(
            `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            {
              text: body
            }
          );
        }
      } else {
        console.log("log... 1259");
        await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: body
          }
        );
      }
    }

    if (!isNil(queues[0].fileListId)) {
      console.log("log... 1278");
      try {
        const publicFolder = path.resolve(
          __dirname,
          "..",
          "..",
          "..",
          "public"
        );

        const files = await ShowFileService(
          queues[0].fileListId,
          ticket.companyId
        );

        const folder = path.resolve(
          publicFolder,
          `company${ticket.companyId}`,
          "fileList",
          String(files.id)
        );

        for (const [index, file] of files.options.entries()) {
          const mediaSrc = {
            fieldname: "medias",
            originalname: file.path,
            encoding: "7bit",
            mimetype: file.mediaType,
            filename: file.path,
            path: path.resolve(folder, file.path)
          } as Express.Multer.File;

          await SendWhatsAppMedia({
            media: mediaSrc,
            ticket,
            body: file.name,
            isPrivate: false,
            isForwarded: false
          });
        }
      } catch (error) {
        logger.info(error);
      }
    }

    if (queues[0].closeTicket) {
      console.log("log... 1297");
      await UpdateTicketService({
        ticketData: {
          status: "closed",
          queueId: queues[0].id
          // sendFarewellMessage: false
        },
        ticketId: ticket.id,
        companyId
      });

      return;
    } else {
      console.log("log... 1310");
      await UpdateTicketService({
        ticketData: {
          queueId: queues[0].id,
          status: ticket.status === "lgpd" ? "pending" : ticket.status
        },
        ticketId: ticket.id,
        companyId
      });
    }

    const count = await Ticket.findAndCountAll({
      where: {
        userId: null,
        status: "pending",
        companyId,
        queueId: queues[0].id,
        isGroup: false
      }
    });

    if (enableQueuePosition) {
      console.log("log... 1329");
      // Lógica para enviar posição da fila de atendimento
      const qtd = count.count === 0 ? 1 : count.count;
      const msgFila = `${settings.sendQueuePositionMessage} *${qtd}*`;
      // const msgFila = `*Assistente Virtual:*\n{{ms}} *{{name}}*, sua posição na fila de atendimento é: *${qtd}*`;
      const bodyFila = formatBody(`${msgFila}`, ticket);
      const debouncedSentMessagePosicao = debounce(
        async () => {
          await wbot.sendMessage(
            `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            {
              text: bodyFila
            }
          );
        },
        3000,
        ticket.id
      );
      debouncedSentMessagePosicao();
    }

    return;
  }

  // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
  if (contact.disableBot) {
    return;
  }

  let selectedOption = "";

  if (ticket.status !== "lgpd") {
    console.log("log... 1367");
    selectedOption =
      msg?.message?.buttonsResponseMessage?.selectedButtonId ||
      msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
      getBodyMessage(msg);
  } else {
    if (!isNil(ticket.lgpdAcceptedAt))
      await ticket.update({
        status: "pending"
      });

    await ticket.reload();
  }

  if (String(selectedOption).toLocaleLowerCase() == "sair") {
    // Encerra atendimento

    console.log("log... 1384");

    const ticketData = {
      isBot: false,
      status: "closed",
      sendFarewellMessage: true,
      maxUseBotQueues: 0
    };

    await UpdateTicketService({ ticketData, ticketId: ticket.id, companyId });
    // await ticket.update({ queueOptionId: null, chatbot: false, queueId: null, userId: null, status: "closed"});
    //await verifyQueue(wbot, msg, ticket, ticket.contact);

    // const complationMessage = ticket.whatsapp?.complationMessage;

    // console.log(complationMessage)
    // const textMessage = {
    //   text: formatBody(`\u200e${complationMessage}`, ticket),
    // };

    // if (!isNil(complationMessage)) {
    //   const sendMsg = await wbot.sendMessage(
    //     `${ticket?.contact?.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
    //     textMessage
    //   );

    //   await verifyMessage(sendMsg, ticket, ticket.contact);
    // }

    return;
  }

  let choosenQueue =
    chatbot && queues.length === 1
      ? queues[+selectedOption]
      : queues[+selectedOption - 1];

  console.log("log... 1419");

  const typeBot = settings?.chatBotType || "text";

  // Serviço p/ escolher consultor aleatório para o ticket, ao selecionar fila.
  let randomUserId;

  if (choosenQueue) {
    console.log("log... 1427");
    try {
      const userQueue = await ListUserQueueServices(choosenQueue.id);

      if (userQueue.userId > -1) {
        randomUserId = userQueue.userId;
      }
    } catch (error) {
      console.error(error);
    }
  }

  // Ativar ou desativar opção de escolher consultor aleatório.
  /*   let settings = await CompaniesSettings.findOne({
      where: {
        companyId: companyId
      }
    }); */

  const botText = async () => {
    console.log("log... 1449");

    if (choosenQueue || (queues.length === 1 && chatbot)) {
      console.log("log... 1452");
      // console.log("entrou no choose", ticket.isOutOfHour, ticketTraking.chatbotAt)
      if (queues.length === 1) choosenQueue = queues[0];
      const queue = await Queue.findByPk(choosenQueue.id);

      console.log("log... 1457");

      if (ticket.isOutOfHour === false && ticketTraking.chatbotAt !== null) {
        console.log("log... 1460");
        await ticketTraking.update({
          chatbotAt: null
        });
        await ticket.update({
          amountUsedBotQueues: 0
        });
      }

      let currentSchedule;

      if (settings?.scheduleType === "queue") {
        console.log("log... 1472");
        currentSchedule = await VerifyCurrentSchedule(companyId, queue.id, 0);
      }

      if (
        settings?.scheduleType === "queue" &&
        ticket.status !== "open" &&
        !isNil(currentSchedule) &&
        (ticket.amountUsedBotQueues < maxUseBotQueues ||
          maxUseBotQueues === 0) &&
        (!currentSchedule || currentSchedule.inActivity === false) &&
        (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")
      ) {
        if (timeUseBotQueues !== "0") {
          console.log("log... 1483");
          //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
          //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
          let dataLimite = new Date();
          let Agora = new Date();

          if (ticketTraking.chatbotAt !== null) {
            console.log("log... 1491");
            dataLimite.setMinutes(
              ticketTraking.chatbotAt.getMinutes() + Number(timeUseBotQueues)
            );

            if (
              ticketTraking.chatbotAt !== null &&
              Agora < dataLimite &&
              timeUseBotQueues !== "0" &&
              ticket.amountUsedBotQueues !== 0
            ) {
              return;
            }
          }
          await ticketTraking.update({
            chatbotAt: null
          });
        }

        const outOfHoursMessage = queue.outOfHoursMessage;

        if (outOfHoursMessage !== "") {
          // console.log("entrei3");
          const body = formatBody(`${outOfHoursMessage}`, ticket);

          console.log("log... 1509");

          const debouncedSentMessage = debounce(
            async () => {
              await wbot.sendMessage(
                `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                }`,
                {
                  text: body
                }
              );
            },
            1000,
            ticket.id
          );
          debouncedSentMessage();

          //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
          // await ticket.update({
          //   queueId: queue.id,
          //   isOutOfHour: true,
          //   amountUsedBotQueues: ticket.amountUsedBotQueues + 1
          // });

          // return;
        }
        //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
        await ticket.update({
          queueId: queue.id,
          isOutOfHour: true,
          amountUsedBotQueues: ticket.amountUsedBotQueues + 1
        });
        return;
      }

      await UpdateTicketService({
        ticketData: {
          // amountUsedBotQueues: 0,
          queueId: choosenQueue.id
        },
        // ticketData: { queueId: queues.length ===1 ? null : choosenQueue.id },
        ticketId: ticket.id,
        companyId
      });
      // }

      if (choosenQueue.chatbots.length > 0 && !ticket.isGroup) {
        console.log("log... 1554");
        let options = "";
        choosenQueue.chatbots.forEach((chatbot, index) => {
          options += `*[ ${index + 1} ]* - ${chatbot.name}\n`;
        });

        const body = formatBody(
          `\u200e ${choosenQueue.greetingMessage}\n\n${options}\n*[ # ]* Voltar para o menu principal\n*[ Sair ]* Encerrar atendimento`,
          ticket
        );

        const sentMessage = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,

          {
            text: body
          }
        );

        await verifyMessage(sentMessage, ticket, contact, ticketTraking);

        if (settings?.settingsUserRandom === "enabled") {
          console.log("log... 1576");
          await UpdateTicketService({
            ticketData: { userId: randomUserId },
            ticketId: ticket.id,
            companyId
          });
        }
      }

      if (
        !choosenQueue.chatbots.length &&
        choosenQueue.greetingMessage.length !== 0
      ) {
        console.log("log... 1586");
        console.log(choosenQueue.greetingMessage);
        const body = formatBody(
          `\u200e${choosenQueue.greetingMessage}`,
          ticket
        );
        const sentMessage = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: body
          }
        );

        await verifyMessage(sentMessage, ticket, contact, ticketTraking);
      }

      if (!isNil(choosenQueue.fileListId)) {
        try {
          const publicFolder = path.resolve(
            __dirname,
            "..",
            "..",
            "..",
            "public"
          );

          const files = await ShowFileService(
            choosenQueue.fileListId,
            ticket.companyId
          );

          const folder = path.resolve(
            publicFolder,
            `company${ticket.companyId}`,
            "fileList",
            String(files.id)
          );

          for (const [index, file] of files.options.entries()) {
            const mediaSrc = {
              fieldname: "medias",
              originalname: file.path,
              encoding: "7bit",
              mimetype: file.mediaType,
              filename: file.path,
              path: path.resolve(folder, file.path)
            } as Express.Multer.File;

            // const debouncedSentMessagePosicao = debounce(
            //   async () => {
            const sentMessage = await SendWhatsAppMedia({
              media: mediaSrc,
              ticket,
              body: `\u200e ${file.name}`,
              isPrivate: false,
              isForwarded: false
            });

            await verifyMediaMessage(
              sentMessage,
              ticket,
              ticket.contact,
              ticketTraking,
              false,
              false,
              wbot
            );
            //   },
            //   2000,
            //   ticket.id
            // );
            // debouncedSentMessagePosicao();
          }
        } catch (error) {
          logger.info(error);
        }
      }

      await delay(4000);

      //se fila está parametrizada para encerrar ticket automaticamente
      if (choosenQueue.closeTicket) {
        try {
          await UpdateTicketService({
            ticketData: {
              status: "closed",
              queueId: choosenQueue.id
              // sendFarewellMessage: false,
            },
            ticketId: ticket.id,
            companyId
          });
        } catch (error) {
          logger.info(error);
        }

        return;
      }

      const count = await Ticket.findAndCountAll({
        where: {
          userId: null,
          status: "pending",
          companyId,
          queueId: choosenQueue.id,
          whatsappId: wbot.id,
          isGroup: false
        }
      });

      console.log("======== choose queue ========");
      await CreateLogTicketService({
        ticketId: ticket.id,
        type: "queue",
        queueId: choosenQueue.id
      });

      if (enableQueuePosition && !choosenQueue.chatbots.length) {
        // Lógica para enviar posição da fila de atendimento
        const qtd = count.count === 0 ? 1 : count.count;
        const msgFila = `${settings.sendQueuePositionMessage} *${qtd}*`;
        // const msgFila = `*Assistente Virtual:*\n{{ms}} *{{name}}*, sua posição na fila de atendimento é: *${qtd}*`;
        const bodyFila = formatBody(`${msgFila}`, ticket);
        const debouncedSentMessagePosicao = debounce(
          async () => {
            await wbot.sendMessage(
              `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              {
                text: bodyFila
              }
            );
          },
          3000,
          ticket.id
        );
        debouncedSentMessagePosicao();
      }
    } else {
      if (ticket.isGroup) return;

      if (
        maxUseBotQueues &&
        maxUseBotQueues !== 0 &&
        ticket.amountUsedBotQueues >= maxUseBotQueues
      ) {
        // await UpdateTicketService({
        //   ticketData: { queueId: queues[0].id },
        //   ticketId: ticket.id
        // });

        return;
      }

      if (timeUseBotQueues !== "0") {
        //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
        //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
        let dataLimite = new Date();
        let Agora = new Date();

        console.log("log... 1749");

        if (ticketTraking.chatbotAt !== null) {
          dataLimite.setMinutes(
            ticketTraking.chatbotAt.getMinutes() + Number(timeUseBotQueues)
          );

          console.log("log... 1754");

          if (
            ticketTraking.chatbotAt !== null &&
            Agora < dataLimite &&
            timeUseBotQueues !== "0" &&
            ticket.amountUsedBotQueues !== 0
          ) {
            return;
          }
        }
        await ticketTraking.update({
          chatbotAt: null
        });
      }

      // if (wbot.waitForSocketOpen()) {
      //   console.log("AGUARDANDO")
      //   console.log(wbot.waitForSocketOpen())
      // }

      wbot.presenceSubscribe(contact.remoteJid);

      let options = "";

      wbot.sendPresenceUpdate("composing", contact.remoteJid);

      console.log("============= queue menu =============");
      queues.forEach((queue, index) => {
        options += `*[ ${index + 1} ]* - ${queue.name}\n`;
      });
      options += `\n*[ Sair ]* - Encerrar atendimento`;

      const body = formatBody(`\u200e${greetingMessage}\n\n${options}`, ticket);

      await CreateLogTicketService({
        ticketId: ticket.id,
        type: "chatBot"
      });

      await delay(1000);

      await wbot.sendPresenceUpdate("paused", contact.remoteJid);

      if (ticket.whatsapp.greetingMediaAttachment !== null) {
        console.log("log... 1799");

        const filePath = path.resolve(
          "public",
          `company${companyId}`,
          ticket.whatsapp.greetingMediaAttachment
        );

        const fileExists = fs.existsSync(filePath);
        // console.log(fileExists);
        if (fileExists) {
          const messagePath = ticket.whatsapp.greetingMediaAttachment;
          const optionsMsg = await getMessageOptions(
            messagePath,
            filePath,
            String(companyId),
            body
          );

          console.log("log... 1809");

          const debouncedSentgreetingMediaAttachment = debounce(
            async () => {
              let sentMessage = await wbot.sendMessage(
                `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                }`,
                { ...optionsMsg }
              );

              await verifyMediaMessage(
                sentMessage,
                ticket,
                contact,
                ticketTraking,
                false,
                false,
                wbot
              );
            },
            1000,
            ticket.id
          );
          debouncedSentgreetingMediaAttachment();
        } else {
          console.log("log... 1824");
          const debouncedSentMessage = debounce(
            async () => {
              const sentMessage = await wbot.sendMessage(
                `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                }`,
                {
                  text: body
                }
              );

              await verifyMessage(sentMessage, ticket, contact, ticketTraking);
            },
            1000,
            ticket.id
          );
          debouncedSentMessage();
        }

        console.log("log... 1843");

        await UpdateTicketService({
          ticketData: {
            // amountUsedBotQueues: ticket.amountUsedBotQueues + 1
          },
          ticketId: ticket.id,
          companyId
        });

        return;
      } else {
        console.log("log... 1854");

        const debouncedSentMessage = debounce(
          async () => {
            const sentMessage = await wbot.sendMessage(
              `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              {
                text: body
              }
            );

            await verifyMessage(sentMessage, ticket, contact, ticketTraking);
          },
          1000,
          ticket.id
        );

        await UpdateTicketService({
          ticketData: {},
          ticketId: ticket.id,
          companyId
        });

        debouncedSentMessage();
      }
    }
  };

  const botList = async () => {
    console.log("log... 1449");

    if (choosenQueue || (queues.length === 1 && chatbot)) {
      console.log("log... 1452");
      // console.log("entrou no choose", ticket.isOutOfHour, ticketTraking.chatbotAt)
      if (queues.length === 1) choosenQueue = queues[0];
      const queue = await Queue.findByPk(choosenQueue.id);

      console.log("log... 1457");

      if (ticket.isOutOfHour === false && ticketTraking.chatbotAt !== null) {
        console.log("log... 1460");
        await ticketTraking.update({
          chatbotAt: null
        });
        await ticket.update({
          amountUsedBotQueues: 0
        });
      }

      let currentSchedule;

      if (settings?.scheduleType === "queue") {
        console.log("log... 1472");
        currentSchedule = await VerifyCurrentSchedule(companyId, queue.id, 0);
      }

      if (
        settings?.scheduleType === "queue" &&
        ticket.status !== "open" &&
        !isNil(currentSchedule) &&
        (ticket.amountUsedBotQueues < maxUseBotQueues ||
          maxUseBotQueues === 0) &&
        (!currentSchedule || currentSchedule.inActivity === false) &&
        (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")
      ) {
        if (timeUseBotQueues !== "0") {
          console.log("log... 1483");
          //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
          //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
          let dataLimite = new Date();
          let Agora = new Date();

          if (ticketTraking.chatbotAt !== null) {
            console.log("log... 1491");
            dataLimite.setMinutes(
              ticketTraking.chatbotAt.getMinutes() + Number(timeUseBotQueues)
            );

            if (
              ticketTraking.chatbotAt !== null &&
              Agora < dataLimite &&
              timeUseBotQueues !== "0" &&
              ticket.amountUsedBotQueues !== 0
            ) {
              return;
            }
          }
          await ticketTraking.update({
            chatbotAt: null
          });
        }

        const outOfHoursMessage = queue.outOfHoursMessage;

        if (outOfHoursMessage !== "") {
          // console.log("entrei3");
          const body = formatBody(`${outOfHoursMessage}`, ticket);

          console.log("log... 1509");

          const debouncedSentMessage = debounce(
            async () => {
              await wbot.sendMessage(
                `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                }`,
                {
                  text: body
                }
              );
            },
            1000,
            ticket.id
          );
          debouncedSentMessage();

          //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
          // await ticket.update({
          //   queueId: queue.id,
          //   isOutOfHour: true,
          //   amountUsedBotQueues: ticket.amountUsedBotQueues + 1
          // });

          // return;
        }
        //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
        await ticket.update({
          queueId: queue.id,
          isOutOfHour: true,
          amountUsedBotQueues: ticket.amountUsedBotQueues + 1
        });
        return;
      }

      await UpdateTicketService({
        ticketData: {
          // amountUsedBotQueues: 0,
          queueId: choosenQueue.id
        },
        // ticketData: { queueId: queues.length ===1 ? null : choosenQueue.id },
        ticketId: ticket.id,
        companyId
      });
      // }

      if (choosenQueue.chatbots.length > 0 && !ticket.isGroup) {
        console.log("log... 1554");

        const sectionsRows = [];

        choosenQueue.chatbots.forEach((chatbot, index) => {
          sectionsRows.push({
            title: chatbot.name,
            rowId: `${index + 1}`
          });
        });
        sectionsRows.push({
          title: "Voltar Menu Inicial",
          rowId: "#"
        });
        const sections = [
          {
            title: "Lista de Botões",
            rows: sectionsRows
          }
        ];

        const listMessage = {
          text: formatBody(`\u200e${queue.greetingMessage}\n`),
          title: "Lista\n",
          buttonText: "Clique aqui",
          //footer: ".",
          //listType: 2,
          sections
        };
        const sendMsg = await wbot.sendMessage(
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
          }`,
          listMessage
        );

        await verifyMessage(sendMsg, ticket, contact, ticketTraking);

        if (settings?.settingsUserRandom === "enabled") {
          console.log("log... 1576");
          await UpdateTicketService({
            ticketData: { userId: randomUserId },
            ticketId: ticket.id,
            companyId
          });
        }
      }

      if (
        !choosenQueue.chatbots.length &&
        choosenQueue.greetingMessage.length !== 0
      ) {
        console.log("log... 1586");
        console.log(choosenQueue.greetingMessage);
        const body = formatBody(
          `\u200e${choosenQueue.greetingMessage}`,
          ticket
        );
        const sentMessage = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: body
          }
        );

        await verifyMessage(sentMessage, ticket, contact, ticketTraking);
      }

      if (!isNil(choosenQueue.fileListId)) {
        try {
          const publicFolder = path.resolve(
            __dirname,
            "..",
            "..",
            "..",
            "public"
          );

          const files = await ShowFileService(
            choosenQueue.fileListId,
            ticket.companyId
          );

          const folder = path.resolve(
            publicFolder,
            `company${ticket.companyId}`,
            "fileList",
            String(files.id)
          );

          for (const [index, file] of files.options.entries()) {
            const mediaSrc = {
              fieldname: "medias",
              originalname: file.path,
              encoding: "7bit",
              mimetype: file.mediaType,
              filename: file.path,
              path: path.resolve(folder, file.path)
            } as Express.Multer.File;

            // const debouncedSentMessagePosicao = debounce(
            //   async () => {
            const sentMessage = await SendWhatsAppMedia({
              media: mediaSrc,
              ticket,
              body: `\u200e ${file.name}`,
              isPrivate: false,
              isForwarded: false
            });

            await verifyMediaMessage(
              sentMessage,
              ticket,
              ticket.contact,
              ticketTraking,
              false,
              false,
              wbot
            );
            //   },
            //   2000,
            //   ticket.id
            // );
            // debouncedSentMessagePosicao();
          }
        } catch (error) {
          logger.info(error);
        }
      }

      await delay(4000);

      //se fila está parametrizada para encerrar ticket automaticamente
      if (choosenQueue.closeTicket) {
        try {
          await UpdateTicketService({
            ticketData: {
              status: "closed",
              queueId: choosenQueue.id
              // sendFarewellMessage: false,
            },
            ticketId: ticket.id,
            companyId
          });
        } catch (error) {
          logger.info(error);
        }

        return;
      }

      const count = await Ticket.findAndCountAll({
        where: {
          userId: null,
          status: "pending",
          companyId,
          queueId: choosenQueue.id,
          whatsappId: wbot.id,
          isGroup: false
        }
      });

      console.log("======== choose queue ========");
      await CreateLogTicketService({
        ticketId: ticket.id,
        type: "queue",
        queueId: choosenQueue.id
      });

      if (enableQueuePosition && !choosenQueue.chatbots.length) {
        // Lógica para enviar posição da fila de atendimento
        const qtd = count.count === 0 ? 1 : count.count;
        const msgFila = `${settings.sendQueuePositionMessage} *${qtd}*`;
        // const msgFila = `*Assistente Virtual:*\n{{ms}} *{{name}}*, sua posição na fila de atendimento é: *${qtd}*`;
        const bodyFila = formatBody(`${msgFila}`, ticket);
        const debouncedSentMessagePosicao = debounce(
          async () => {
            await wbot.sendMessage(
              `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              {
                text: bodyFila
              }
            );
          },
          3000,
          ticket.id
        );
        debouncedSentMessagePosicao();
      }
    } else {
      if (ticket.isGroup) return;

      if (
        maxUseBotQueues &&
        maxUseBotQueues !== 0 &&
        ticket.amountUsedBotQueues >= maxUseBotQueues
      ) {
        // await UpdateTicketService({
        //   ticketData: { queueId: queues[0].id },
        //   ticketId: ticket.id
        // });

        return;
      }

      if (timeUseBotQueues !== "0") {
        //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
        //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
        let dataLimite = new Date();
        let Agora = new Date();

        console.log("log... 1749");

        if (ticketTraking.chatbotAt !== null) {
          dataLimite.setMinutes(
            ticketTraking.chatbotAt.getMinutes() + Number(timeUseBotQueues)
          );

          console.log("log... 1754");

          if (
            ticketTraking.chatbotAt !== null &&
            Agora < dataLimite &&
            timeUseBotQueues !== "0" &&
            ticket.amountUsedBotQueues !== 0
          ) {
            return;
          }
        }
        await ticketTraking.update({
          chatbotAt: null
        });
      }

      // if (wbot.waitForSocketOpen()) {
      //   console.log("AGUARDANDO")
      //   console.log(wbot.waitForSocketOpen())
      // }

      wbot.presenceSubscribe(contact.remoteJid);

      let options = "";

      wbot.sendPresenceUpdate("composing", contact.remoteJid);

      console.log("============= queue menu =============");
      const sectionsRows = [];

      queues.forEach((queue, index) => {
        sectionsRows.push({
          title: `${queue.name}`, //queue.name,
          description: `_`,
          rowId: `${index + 1}`
        });
      });

      sectionsRows.push({
        title: "Voltar Menu Inicial",
        rowId: "#"
      });

      await CreateLogTicketService({
        ticketId: ticket.id,
        type: "chatBot"
      });

      await delay(1000);
      const body = formatBody(`\u200e${greetingMessage}\n\n${options}`, ticket);

      await wbot.sendPresenceUpdate("paused", contact.remoteJid);

      if (ticket.whatsapp.greetingMediaAttachment !== null) {
        console.log("log... 1799");

        const filePath = path.resolve(
          "public",
          `company${companyId}`,
          ticket.whatsapp.greetingMediaAttachment
        );

        const fileExists = fs.existsSync(filePath);
        // console.log(fileExists);
        if (fileExists) {
          const messagePath = ticket.whatsapp.greetingMediaAttachment;
          const optionsMsg = await getMessageOptions(
            messagePath,
            filePath,
            String(companyId),
            body
          );

          console.log("log... 1809");

          const debouncedSentgreetingMediaAttachment = debounce(
            async () => {
              let sentMessage = await wbot.sendMessage(
                `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                }`,
                { ...optionsMsg }
              );

              await verifyMediaMessage(
                sentMessage,
                ticket,
                contact,
                ticketTraking,
                false,
                false,
                wbot
              );
            },
            1000,
            ticket.id
          );
          debouncedSentgreetingMediaAttachment();
        } else {
          console.log("log... 1824");
          const debouncedSentMessage = debounce(
            async () => {
              const sections = [
                {
                  title: "Lista de Botões",
                  rows: sectionsRows
                }
              ];

              const listMessage = {
                title: "Lista\n",
                text: formatBody(`\u200e${greetingMessage}\n`),
                buttonText: "Clique aqui",
                //footer: "_",
                sections
              };

              const sendMsg = await wbot.sendMessage(
                `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                }`,
                listMessage
              );

              await verifyMessage(sendMsg, ticket, contact, ticketTraking);
            },
            1000,
            ticket.id
          );
          debouncedSentMessage();
        }

        console.log("log... 1843");

        await UpdateTicketService({
          ticketData: {
            // amountUsedBotQueues: ticket.amountUsedBotQueues + 1
          },
          ticketId: ticket.id,
          companyId
        });

        return;
      } else {
        console.log("log... 1854 - Lista");

        const debouncedSentMessage = debounce(
          async () => {
            const sections = [
              {
                title: "Lista de Botões",
                rows: sectionsRows
              }
            ];

            const listMessage = {
              title: "Lista\n",
              text: formatBody(`\u200e${greetingMessage}\n`),
              buttonText: "Clique aqui",
              //footer: "_",
              sections
            };

            const sendMsg = await wbot.sendMessage(
              `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              listMessage
            );

            await verifyMessage(sendMsg, ticket, contact, ticketTraking);
          },
          1000,
          ticket.id
        );

        await UpdateTicketService({
          ticketData: {},
          ticketId: ticket.id,
          companyId
        });

        debouncedSentMessage();
      }
    }
  };

  const botButton = async () => {
    console.log("log... 1449");

    if (choosenQueue || (queues.length === 1 && chatbot)) {
      console.log("log... 1452");
      // console.log("entrou no choose", ticket.isOutOfHour, ticketTraking.chatbotAt)
      if (queues.length === 1) choosenQueue = queues[0];
      const queue = await Queue.findByPk(choosenQueue.id);

      console.log("log... 1457");

      if (ticket.isOutOfHour === false && ticketTraking.chatbotAt !== null) {
        console.log("log... 1460");
        await ticketTraking.update({
          chatbotAt: null
        });
        await ticket.update({
          amountUsedBotQueues: 0
        });
      }

      let currentSchedule;

      if (settings?.scheduleType === "queue") {
        console.log("log... 1472");
        currentSchedule = await VerifyCurrentSchedule(companyId, queue.id, 0);
      }

      if (
        settings?.scheduleType === "queue" &&
        ticket.status !== "open" &&
        !isNil(currentSchedule) &&
        (ticket.amountUsedBotQueues < maxUseBotQueues ||
          maxUseBotQueues === 0) &&
        (!currentSchedule || currentSchedule.inActivity === false) &&
        (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")
      ) {
        if (timeUseBotQueues !== "0") {
          console.log("log... 1483");
          //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
          //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
          let dataLimite = new Date();
          let Agora = new Date();

          if (ticketTraking.chatbotAt !== null) {
            console.log("log... 1491");
            dataLimite.setMinutes(
              ticketTraking.chatbotAt.getMinutes() + Number(timeUseBotQueues)
            );

            if (
              ticketTraking.chatbotAt !== null &&
              Agora < dataLimite &&
              timeUseBotQueues !== "0" &&
              ticket.amountUsedBotQueues !== 0
            ) {
              return;
            }
          }
          await ticketTraking.update({
            chatbotAt: null
          });
        }

        const outOfHoursMessage = queue.outOfHoursMessage;

        if (outOfHoursMessage !== "") {
          // console.log("entrei3");
          const body = formatBody(`${outOfHoursMessage}`, ticket);

          console.log("log... 1509");

          const debouncedSentMessage = debounce(
            async () => {
              await wbot.sendMessage(
                `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                }`,
                {
                  text: body
                }
              );
            },
            1000,
            ticket.id
          );
          debouncedSentMessage();
        }

        await ticket.update({
          queueId: queue.id,
          isOutOfHour: true,
          amountUsedBotQueues: ticket.amountUsedBotQueues + 1
        });
        return;
      }

      await UpdateTicketService({
        ticketData: {
          queueId: choosenQueue.id
        },
        ticketId: ticket.id,
        companyId
      });
      // }

      if (choosenQueue.chatbots.length > 0 && !ticket.isGroup) {
        console.log("log... 1554");
        const debouncedSentMessage = debounce(
          async () => {
            try {
              console.log("log... enviando as opcoes das filas");
              // Busca o número do WhatsApp associado ao ticket
              const whatsapp = await Whatsapp.findOne({
                where: { id: ticket.whatsappId }
              });
              if (!whatsapp || !whatsapp.number) {
                console.error(
                  "Número de WhatsApp não encontrado para o ticket:",
                  ticket.whatsappId
                );
                throw new Error("Número de WhatsApp não encontrado");
              }
              const botNumber = whatsapp.number;

              const buttons = [];

              // Adiciona os chatbots como botões
              choosenQueue.chatbots.forEach((chatbot, index) => {
                buttons.push({
                  name: "quick_reply", // Substitua por 'quick_reply' se necessário, dependendo do contexto
                  buttonParamsJson: JSON.stringify({
                    display_text: chatbot.name,
                    id: `${index + 1}`
                  })
                });
              });

              buttons.push({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "Voltar Menu Inicial",
                  id: "#"
                })
              });
              const interactiveMsg = {
                viewOnceMessage: {
                  message: {
                    interactiveMessage: {
                      body: {
                        text: `\u200e${choosenQueue.greetingMessage}`
                      },
                      nativeFlowMessage: {
                        buttons: buttons,
                        messageParamsJson: JSON.stringify({
                          from: "apiv2",
                          templateId: "4194019344155670"
                        })
                      }
                    }
                  }
                }
              };
              const jid = `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                }`;
              const newMsg = generateWAMessageFromContent(jid, interactiveMsg, {
                userJid: botNumber
              });
              await wbot.relayMessage(jid, newMsg.message!, {
                messageId: newMsg.key.id
              });
              if (newMsg) {
                await wbot.upsertMessage(newMsg, "notify");
              }
            } catch (error) {
              console.error(
                "Erro ao enviar ou fazer upsert da mensagem:",
                error
              );
            }
          },
          1000,
          ticket.id
        );
        debouncedSentMessage();

        if (settings?.settingsUserRandom === "enabled") {
          console.log("log... 1576");
          await UpdateTicketService({
            ticketData: { userId: randomUserId },
            ticketId: ticket.id,
            companyId
          });
        }
      }

      if (
        !choosenQueue.chatbots.length &&
        choosenQueue.greetingMessage.length !== 0
      ) {
        console.log("log... 1586");
        console.log(choosenQueue.greetingMessage);
        const body = formatBody(
          `\u200e${choosenQueue.greetingMessage}`,
          ticket
        );
        const sentMessage = await wbot.sendMessage(
          `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: body
          }
        );

        await verifyMessage(sentMessage, ticket, contact, ticketTraking);
      }

      if (!isNil(choosenQueue.fileListId)) {
        try {
          const publicFolder = path.resolve(
            __dirname,
            "..",
            "..",
            "..",
            "public"
          );

          const files = await ShowFileService(
            choosenQueue.fileListId,
            ticket.companyId
          );

          const folder = path.resolve(
            publicFolder,
            `company${ticket.companyId}`,
            "fileList",
            String(files.id)
          );

          for (const [index, file] of files.options.entries()) {
            const mediaSrc = {
              fieldname: "medias",
              originalname: file.path,
              encoding: "7bit",
              mimetype: file.mediaType,
              filename: file.path,
              path: path.resolve(folder, file.path)
            } as Express.Multer.File;

            // const debouncedSentMessagePosicao = debounce(
            //   async () => {
            const sentMessage = await SendWhatsAppMedia({
              media: mediaSrc,
              ticket,
              body: `\u200e ${file.name}`,
              isPrivate: false,
              isForwarded: false
            });

            await verifyMediaMessage(
              sentMessage,
              ticket,
              ticket.contact,
              ticketTraking,
              false,
              false,
              wbot
            );
            //   },
            //   2000,
            //   ticket.id
            // );
            // debouncedSentMessagePosicao();
          }
        } catch (error) {
          logger.info(error);
        }
      }

      await delay(4000);

      //se fila está parametrizada para encerrar ticket automaticamente
      if (choosenQueue.closeTicket) {
        try {
          await UpdateTicketService({
            ticketData: {
              status: "closed",
              queueId: choosenQueue.id
              // sendFarewellMessage: false,
            },
            ticketId: ticket.id,
            companyId
          });
        } catch (error) {
          logger.info(error);
        }

        return;
      }

      const count = await Ticket.findAndCountAll({
        where: {
          userId: null,
          status: "pending",
          companyId,
          queueId: choosenQueue.id,
          whatsappId: wbot.id,
          isGroup: false
        }
      });

      console.log("======== choose queue ========");
      await CreateLogTicketService({
        ticketId: ticket.id,
        type: "queue",
        queueId: choosenQueue.id
      });

      if (enableQueuePosition && !choosenQueue.chatbots.length) {
        // Lógica para enviar posição da fila de atendimento
        const qtd = count.count === 0 ? 1 : count.count;
        const msgFila = `${settings.sendQueuePositionMessage} *${qtd}*`;
        // const msgFila = `*Assistente Virtual:*\n{{ms}} *{{name}}*, sua posição na fila de atendimento é: *${qtd}*`;
        const bodyFila = formatBody(`${msgFila}`, ticket);
        const debouncedSentMessagePosicao = debounce(
          async () => {
            await wbot.sendMessage(
              `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              {
                text: bodyFila
              }
            );
          },
          3000,
          ticket.id
        );
        debouncedSentMessagePosicao();
      }
    } else {
      if (ticket.isGroup) return;

      if (
        maxUseBotQueues &&
        maxUseBotQueues !== 0 &&
        ticket.amountUsedBotQueues >= maxUseBotQueues
      ) {
        // await UpdateTicketService({
        //   ticketData: { queueId: queues[0].id },
        //   ticketId: ticket.id
        // });

        return;
      }

      if (timeUseBotQueues !== "0") {
        //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
        //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
        let dataLimite = new Date();
        let Agora = new Date();

        console.log("log... 1749");

        if (ticketTraking.chatbotAt !== null) {
          dataLimite.setMinutes(
            ticketTraking.chatbotAt.getMinutes() + Number(timeUseBotQueues)
          );

          console.log("log... 1754");

          if (
            ticketTraking.chatbotAt !== null &&
            Agora < dataLimite &&
            timeUseBotQueues !== "0" &&
            ticket.amountUsedBotQueues !== 0
          ) {
            return;
          }
        }
        await ticketTraking.update({
          chatbotAt: null
        });
      }

      wbot.presenceSubscribe(contact.remoteJid);

      let options = "";

      wbot.sendPresenceUpdate("composing", contact.remoteJid);

      console.log("============= queue menu =============");

      const body = formatBody(`\u200e${greetingMessage}\n\n${options}`, ticket);

      await CreateLogTicketService({
        ticketId: ticket.id,
        type: "chatBot"
      });

      await delay(1000);

      await wbot.sendPresenceUpdate("paused", contact.remoteJid);

      if (ticket.whatsapp.greetingMediaAttachment !== null) {
        console.log("log... 1799");

        const filePath = path.resolve(
          "public",
          `company${companyId}`,
          ticket.whatsapp.greetingMediaAttachment
        );

        const fileExists = fs.existsSync(filePath);
        // console.log(fileExists);
        if (fileExists) {
          console.log("log... botao com midia");
          const debouncedSentgreetingMediaAttachment = debounce(
            async () => {
              try {
                const whatsapp = await Whatsapp.findOne({
                  where: { id: ticket.whatsappId }
                });
                if (!whatsapp || !whatsapp.number) {
                  console.error(
                    "Número de WhatsApp não encontrado para o ticket:",
                    ticket.whatsappId
                  );
                  throw new Error("Número de WhatsApp não encontrado");
                }
                const botNumber = whatsapp.number;

                const buttons = [];

                queues.forEach((queue, index) => {
                  buttons.push({
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: queue.name,
                      id: `${index + 1}`
                    })
                  });
                });

                buttons.push({
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "Encerrar atendimento",
                    id: "Sair"
                  })
                });

                // Verifica se há uma mídia para enviar
                if (ticket.whatsapp.greetingMediaAttachment) {
                  const filePath = path.resolve(
                    "public",
                    `company${companyId}`,
                    ticket.whatsapp.greetingMediaAttachment
                  );
                  const fileExists = fs.existsSync(filePath);

                  if (fileExists) {
                    // Carrega a imagem local
                    const imageMessageContent = await generateWAMessageContent(
                      { image: { url: filePath } }, // Caminho da imagem local
                      { upload: wbot.waUploadToServer! }
                    );
                    const imageMessage = imageMessageContent.imageMessage;

                    // Mensagem interativa com mídia
                    const interactiveMsg = {
                      viewOnceMessage: {
                        message: {
                          interactiveMessage: {
                            body: {
                              text: `\u200e${greetingMessage}`
                            },
                            header: {
                              imageMessage, // Anexa a imagem
                              hasMediaAttachment: true
                            },
                            nativeFlowMessage: {
                              buttons: buttons,
                              messageParamsJson: JSON.stringify({
                                from: "apiv2",
                                templateId: "4194019344155670"
                              })
                            }
                          }
                        }
                      }
                    };

                    const jid = `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                      }`;
                    const newMsg = generateWAMessageFromContent(
                      jid,
                      interactiveMsg,
                      { userJid: botNumber }
                    );
                    await wbot.relayMessage(jid, newMsg.message!, {
                      messageId: newMsg.key.id
                    });

                    if (newMsg) {
                      await wbot.upsertMessage(newMsg, "notify");
                    }
                  }
                }
              } catch (error) {
                console.error(
                  "Erro ao enviar ou fazer upsert da mensagem:",
                  error
                );
              }
            },
            1000,
            ticket.id
          );
          debouncedSentgreetingMediaAttachment();
        } else {
          console.log("log... Botao sem midia");
          const debouncedSentButton = debounce(
            async () => {
              try {
                const whatsapp = await Whatsapp.findOne({
                  where: { id: ticket.whatsappId }
                });
                if (!whatsapp || !whatsapp.number) {
                  console.error(
                    "Número de WhatsApp não encontrado para o ticket:",
                    ticket.whatsappId
                  );
                  throw new Error("Número de WhatsApp não encontrado");
                }
                const botNumber = whatsapp.number;

                const buttons = [];

                queues.forEach((queue, index) => {
                  buttons.push({
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: queue.name,
                      id: `${index + 1}`
                    })
                  });
                });

                buttons.push({
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "Encerrar atendimento",
                    id: "Sair"
                  })
                });

                const interactiveMsg = {
                  viewOnceMessage: {
                    message: {
                      interactiveMessage: {
                        body: {
                          text: `\u200e${greetingMessage}`
                        },
                        nativeFlowMessage: {
                          buttons: buttons,
                          messageParamsJson: JSON.stringify({
                            from: "apiv2",
                            templateId: "4194019344155670"
                          })
                        }
                      }
                    }
                  }
                };

                const jid = `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                  }`;
                const newMsg = generateWAMessageFromContent(
                  jid,
                  interactiveMsg,
                  { userJid: botNumber }
                );
                await wbot.relayMessage(jid, newMsg.message!, {
                  messageId: newMsg.key.id
                });

                if (newMsg) {
                  await wbot.upsertMessage(newMsg, "notify");
                }
              } catch (error) {
                console.error(
                  "Erro ao enviar ou fazer upsert da mensagem:",
                  error
                );
              }
            },
            1000,
            ticket.id
          );

          debouncedSentButton();
        }

        console.log("log... 1843");

        await UpdateTicketService({
          ticketData: {},
          ticketId: ticket.id,
          companyId
        });

        return;
      } else {
        console.log("log... 1854 - botao");

        const debouncedSentButton = debounce(
          async () => {
            try {
              const whatsapp = await Whatsapp.findOne({
                where: { id: ticket.whatsappId }
              });
              if (!whatsapp || !whatsapp.number) {
                console.error(
                  "Número de WhatsApp não encontrado para o ticket:",
                  ticket.whatsappId
                );
                throw new Error("Número de WhatsApp não encontrado");
              }
              const botNumber = whatsapp.number;

              const buttons = [];

              queues.forEach((queue, index) => {
                buttons.push({
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: queue.name,
                    id: `${index + 1}`
                  })
                });
              });

              buttons.push({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "Encerrar atendimento",
                  id: "Sair"
                })
              });

              const interactiveMsg = {
                viewOnceMessage: {
                  message: {
                    interactiveMessage: {
                      body: {
                        text: `\u200e${greetingMessage}`
                      },
                      nativeFlowMessage: {
                        buttons: buttons,
                        messageParamsJson: JSON.stringify({
                          from: "apiv2",
                          templateId: "4194019344155670"
                        })
                      }
                    }
                  }
                }
              };

              const jid = `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                }`;
              const newMsg = generateWAMessageFromContent(jid, interactiveMsg, {
                userJid: botNumber
              });
              await wbot.relayMessage(jid, newMsg.message!, {
                messageId: newMsg.key.id
              });

              if (newMsg) {
                await wbot.upsertMessage(newMsg, "notify");
              }
            } catch (error) {
              console.error(
                "Erro ao enviar ou fazer upsert da mensagem:",
                error
              );
            }
          },
          1000,
          ticket.id
        );

        await UpdateTicketService({
          ticketData: {},
          ticketId: ticket.id,
          companyId
        });
        debouncedSentButton();
      }
    }
  };

  if (typeBot === "text") {
    return botText();
  }

  if (typeBot === "list") {
    return botList();
  }

  if (typeBot === "button") {
    return botButton();
  }

  if (typeBot === "button" && queues.length > 3) {
    return botText();
  }
};

export const verifyRating = (ticketTraking: TicketTraking) => {
  console.log("2029", { verifyRating });
  if (
    ticketTraking &&
    ticketTraking.finishedAt === null &&
    ticketTraking.closedAt !== null &&
    ticketTraking.userId !== null &&
    ticketTraking.ratingAt === null
  ) {
    return true;
  }
  return false;
};

export const handleRating = async (
  rate: number,
  ticket: Ticket,
  ticketTraking: TicketTraking
) => {
  const io = getIO();
  const companyId = ticket.companyId;

  console.log("2050", { handleRating });

  // console.log("GETTING WHATSAPP HANDLE RATING", ticket.whatsappId, ticket.id)
  const { complationMessage } = await ShowWhatsAppService(
    ticket.whatsappId,

    companyId
  );

  let finalRate = rate;

  if (rate < 0) {
    finalRate = 0;
  }
  if (rate > 10) {
    finalRate = 10;
  }

  await UserRating.create({
    ticketId: ticketTraking.ticketId,
    companyId: ticketTraking.companyId,
    userId: ticketTraking.userId,
    rate: finalRate
  });

  if (
    !isNil(complationMessage) &&
    complationMessage !== "" &&
    !ticket.isGroup
  ) {
    const body = formatBody(`\u200e${complationMessage}`, ticket);
    if (ticket.channel === "whatsapp") {
      const msg = await SendWhatsAppMessage({ body, ticket });

      await verifyMessage(msg, ticket, ticket.contact, ticketTraking);
    }

    if (["facebook", "instagram"].includes(ticket.channel)) {
      await sendFaceMessage({ body, ticket });
    }
  }

  await ticket.update({
    isBot: false,
    status: "closed",
    amountUsedBotQueuesNPS: 0
  });

  //loga fim de atendimento
  await CreateLogTicketService({
    userId: ticket.userId,
    queueId: ticket.queueId,
    ticketId: ticket.id,
    type: "closed"
  });

  io.of(String(companyId))
    // .to("open")
    .emit(`company-${companyId}-ticket`, {
      action: "delete",
      ticket,
      ticketId: ticket.id
    });

  io.of(String(companyId))
    // .to(ticket.status)
    // .to(ticket.id.toString())
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket,
      ticketId: ticket.id
    });
};

const sanitizeName = (name: string): string => {
  let sanitized = name.split(" ")[0];
  sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, "");
  return sanitized.substring(0, 60);
};

const deleteFileSync = (path: string): void => {
  try {
    fs.unlinkSync(path);
  } catch (error) {
    console.error("Erro ao deletar o arquivo:", error);
  }
};

export const convertTextToSpeechAndSaveToFile = (
  text: string,
  filename: string,
  subscriptionKey: string,
  serviceRegion: string,
  voice: string = "pt-BR-FabioNeural",
  audioToFormat: string = "mp3"
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const speechConfig = SpeechConfig.fromSubscription(
      subscriptionKey,
      serviceRegion
    );
    speechConfig.speechSynthesisVoiceName = voice;
    const audioConfig = AudioConfig.fromAudioFileOutput(`${filename}.wav`);
    const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
    synthesizer.speakTextAsync(
      text,
      result => {
        if (result) {
          convertWavToAnotherFormat(
            `${filename}.wav`,
            `${filename}.${audioToFormat}`,
            audioToFormat
          )
            .then(output => {
              resolve();
            })
            .catch(error => {
              console.error(error);
              reject(error);
            });
        } else {
          reject(new Error("No result from synthesizer"));
        }
        synthesizer.close();
      },
      error => {
        console.error(`Error: ${error}`);
        synthesizer.close();
        reject(error);
      }
    );
  });
};

const convertWavToAnotherFormat = (
  inputPath: string,
  outputPath: string,
  toFormat: string
) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .toFormat(toFormat)
      .on("end", () => resolve(outputPath))
      .on("error", (err: { message: any }) =>
        reject(new Error(`Error converting file: ${err.message}`))
      )
      .save(outputPath);
  });
};

export const keepOnlySpecifiedChars = (str: string) => {
  return str.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôûÂÊÎÔÛãõÃÕçÇ!?.,;:\s]/g, "");
};

export const transferQueue = async (
  queueId: number,
  ticket: Ticket,
  contact: Contact
): Promise<void> => {
  await UpdateTicketService({
    ticketData: { queueId: queueId },
    ticketId: ticket.id,
    companyId: ticket.companyId
  });
};

const flowbuilderIntegration = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  companyId: number,
  queueIntegration: QueueIntegrations,
  ticket: Ticket,
  contact: Contact,
  isFirstMsg?: Ticket,
  isTranfered?: boolean
) => {
  const io = getIO();
  const quotedMsg = await verifyQuotedMessage(msg);
  const body = getBodyMessage(msg);

  // Recarregar ticket do banco para garantir que waitingQuestion está atualizado
  await ticket.reload();

  // Verificar se ticket está aguardando resposta de waitQuestion
  if (ticket.waitingQuestion && !msg.key.fromMe) {
    console.log(`[WaitQuestion] Processando resposta do ticket ${ticket.id}: "${body}"`);

    try {
      const response = await WaitQuestionService.processResponse(ticket.id, body);

      if (response) {
        console.log(`[WaitQuestion] Resposta match encontrada: ${response.option}, ação: ${response.action}`);

        // Executar ação baseada na resposta
        switch (response.action) {
          case "close":
            await ticket.update({ status: "closed" });
            console.log(`[WaitQuestion] Ticket ${ticket.id} fechado pela resposta`);
            break;

          case "transfer":
            // Encontrar próxima conexão baseada na opção (X ou Y)
            const flow = await FlowBuilderModel.findOne({
              where: { id: ticket.flowStopped }
            });

            if (flow && flow.flow) {
              const connections = flow.flow["connections"] || [];
              console.log(`[WaitQuestion/Transfer] nodeId=${response.nodeId}, option=${response.option}`);
              const targetConnection = connections.find(conn =>
                conn.source === response.nodeId &&
                conn.sourceHandle === response.option
              );

              if (targetConnection) {
                await ActionsWebhookService(
                  ticket.whatsappId,
                  parseInt(ticket.flowStopped),
                  ticket.companyId,
                  flow.flow["nodes"] || [],
                  connections,
                  targetConnection.target,
                  ticket.dataWebhook,
                  "",
                  "",
                  body,
                  ticket.id,
                  {
                    number: contact.number,
                    name: contact.name,
                    email: contact.email
                  },
                  msg
                );
                console.log(`[WaitQuestion] Fluxo continuado para ${targetConnection.target}`);
              }
            }
            break;

          case "continue":
          default:
            // Continuar pelo handle correspondente (próximo nó no mesmo fluxo)
            const flowContinue = await FlowBuilderModel.findOne({
              where: { id: ticket.flowStopped }
            });

            console.log(`[WaitQuestion] Continue: flowStopped=${ticket.flowStopped}, flowFound=${!!flowContinue}`);
            console.log(`[WaitQuestion] Continue: nodeId=${response.nodeId}, option=${response.option}`);

            if (flowContinue && flowContinue.flow) {
              const connectionsContinue = flowContinue.flow["connections"] || [];
              const nodeConnections = connectionsContinue.filter(conn => conn.source === response.nodeId);
              console.log(`[WaitQuestion] Conexões do nó ${response.nodeId}:`, JSON.stringify(nodeConnections.map(c => ({ sourceHandle: c.sourceHandle, target: c.target }))));

              const targetConnectionContinue = connectionsContinue.find(conn =>
                conn.source === response.nodeId &&
                conn.sourceHandle === response.option
              );

              if (targetConnectionContinue) {
                console.log(`[WaitQuestion] Conexão encontrada! Target: ${targetConnectionContinue.target}`);
                await ActionsWebhookService(
                  ticket.whatsappId,
                  parseInt(ticket.flowStopped),
                  ticket.companyId,
                  flowContinue.flow["nodes"] || [],
                  connectionsContinue,
                  targetConnectionContinue.target,
                  ticket.dataWebhook,
                  "",
                  "",
                  body,
                  ticket.id,
                  {
                    number: contact.number,
                    name: contact.name,
                    email: contact.email
                  },
                  msg
                );
                console.log(`[WaitQuestion] Fluxo continuado para próximo nó: ${targetConnectionContinue.target}`);
              } else {
                console.log(`[WaitQuestion] ERRO: Conexão NÃO encontrada para source=${response.nodeId} handle=${response.option === "x" ? "x" : "y"}`);
                console.log(`[WaitQuestion] Handles disponíveis:`, nodeConnections.map(c => c.sourceHandle));
              }
            } else {
              console.log(`[WaitQuestion] ERRO: Fluxo ${ticket.flowStopped} não encontrado`);
            }
            break;
        }
      } else {
        console.log(`[WaitQuestion] Resposta não match com nenhuma opção: "${body}"`);
      }
    } catch (error) {
      console.error(`[WaitQuestion] Erro ao processar resposta:`, error);
    }

    // Retornar para não continuar com o fluxo normal
    return;
  }

  /*
  const messageData = {
    wid: msg.key.id,
    ticketId: ticket.id,
    contactId: msg.key.fromMe ? undefined : contact.id,
    body: body,
    fromMe: msg.key.fromMe,
    read: msg.key.fromMe,
    quotedMsgId: quotedMsg?.id,
    ack: Number(String(msg.status).replace('PENDING', '2').replace('NaN', '1')) || 2,
    remoteJid: (msg.key as any).remoteJidAlt ?? msg.key.remoteJid,
    participant: (msg.key as any).participantAlt ?? msg.key.participant,
    dataJson: JSON.stringify(msg),
    createdAt: new Date(
      Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)
    ).toISOString(),
    ticketImported: isMessageImported,
  };


  await CreateMessageService({ messageData, companyId: ticket.companyId });

  */

  if (!msg.key.fromMe && ticket.status === "closed") {
    console.log("===== CHANGE =====");
    await ticket.update({ status: "pending" });
    await ticket.reload({
      include: [
        { model: Queue, as: "queue" },
        { model: User, as: "user" },
        { model: Contact, as: "contact" }
      ]
    });
    await UpdateTicketService({
      ticketData: { status: "pending", integrationId: ticket.integrationId },
      ticketId: ticket.id,
      companyId
    });

    io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
      action: "delete",
      ticket,
      ticketId: ticket.id
    });

    io.to(ticket.status).emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket,
      ticketId: ticket.id
    });
  }

  if (msg.key.fromMe) {
    return;
  }

  const whatsapp = await ShowWhatsAppService(wbot.id!, companyId);

  const listPhrase = await FlowCampaignModel.findAll({
    where: {
      whatsappId: whatsapp.id
    }
  });

  const normalizeText = (text: string | null | undefined): string => {
    if (!text) return "";
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  };

  const bodyNorm = normalizeText(body);

  const campaignMatchesBody = (campaign: any): boolean => {
    const matchType = campaign.matchType || "contains";

    let phrases: string[] = [];
    if (Array.isArray(campaign.phrases) && campaign.phrases.length) {
      phrases = campaign.phrases;
    } else if (typeof campaign.phrases === "string" && campaign.phrases.trim().length) {
      try {
        const parsed = JSON.parse(campaign.phrases);
        if (Array.isArray(parsed)) {
          phrases = parsed;
        }
      } catch (e) {
        // ignore parse errors, fallback to phrase
      }
    }

    if (!phrases.length && campaign.phrase) {
      phrases = [campaign.phrase];
    }

    for (const p of phrases) {
      const phraseNorm = normalizeText(p);
      if (!phraseNorm) continue;

      if (matchType === "exact") {
        if (bodyNorm === phraseNorm) return true;
      } else {
        if (bodyNorm.includes(phraseNorm)) return true;
      }
    }

    return false;
  };

  if (
    !isFirstMsg &&
    listPhrase.filter(item => campaignMatchesBody(item)).length === 0
  ) {
    const flow = await FlowBuilderModel.findOne({
      where: {
        id: whatsapp.flowIdWelcome
      }
    });
    if (flow) {
      const nodes: INodes[] = flow.flow["nodes"];
      const connections: IConnections[] = flow.flow["connections"];

      const mountDataContact = {
        number: contact.number,
        name: contact.name,
        email: contact.email
      };

      // const worker = new Worker("./src/services/WebhookService/WorkerAction.ts");

      // // Enviar as variáveis como parte da mensagem para o Worker
      // console.log('DISPARO1')
      // const data = {
      //   idFlowDb: flowUse.flowIdWelcome,
      //   companyId: ticketUpdate.companyId,
      //   nodes: nodes,
      //   connects: connections,
      //   nextStage: flow.flow["nodes"][0].id,
      //   dataWebhook: null,
      //   details: "",
      //   hashWebhookId: "",
      //   pressKey: null,
      //   idTicket: ticketUpdate.id,
      //   numberPhrase: mountDataContact
      // };
      // worker.postMessage(data);
      // worker.on("message", message => {
      //   console.log(`Mensagem do worker: ${message}`);
      // });

      await ActionsWebhookService(
        whatsapp.id,
        whatsapp.flowIdWelcome,
        ticket.companyId,
        nodes,
        connections,
        flow.flow["nodes"][0].id,
        null,
        "",
        "",
        null,
        ticket.id,
        mountDataContact,
        msg || null
      );
    }
  }

  const dateTicket = new Date(
    isFirstMsg?.updatedAt ? isFirstMsg.updatedAt : ""
  );
  const dateNow = new Date();
  const diferencaEmMilissegundos = Math.abs(
    differenceInMilliseconds(dateTicket, dateNow)
  );
  const seisHorasEmMilissegundos = 1000;

  if (
    listPhrase.filter(item => campaignMatchesBody(item)).length === 0 &&
    diferencaEmMilissegundos >= seisHorasEmMilissegundos &&
    isFirstMsg
  ) {
    console.log("2427", "handleMessageIntegration");

    const flow = await FlowBuilderModel.findOne({
      where: {
        id: whatsapp.flowIdNotPhrase
      }
    });

    if (flow) {
      const nodes: INodes[] = flow.flow["nodes"];
      const connections: IConnections[] = flow.flow["connections"];

      const mountDataContact = {
        number: contact.number,
        name: contact.name,
        email: contact.email
      };

      await ActionsWebhookService(
        whatsapp.id,
        whatsapp.flowIdNotPhrase,
        ticket.companyId,
        nodes,
        connections,
        flow.flow["nodes"][0].id,
        null,
        "",
        "",
        null,
        ticket.id,
        mountDataContact,
        msg || null
      );
    }
  }

  // Campaign fluxo
  const matchingCampaigns = listPhrase.filter(item => campaignMatchesBody(item));
  if (matchingCampaigns.length !== 0) {
    const flowDispar = matchingCampaigns[0];
    const flow = await FlowBuilderModel.findOne({
      where: {
        id: flowDispar.flowId
      }
    });
    const nodes: INodes[] = flow.flow["nodes"];
    const connections: IConnections[] = flow.flow["connections"];

    const mountDataContact = {
      number: contact.number,
      name: contact.name,
      email: contact.email
    };

    const execStart = Date.now();
    const execution = await FlowExecution.create({
      companyId: ticket.companyId,
      flowId: flowDispar.flowId,
      ticketId: ticket.id,
      contactNumber: contact.number,
      trigger: "campaign",
      triggerPhrase: body,
      status: "started",
      nodesExecuted: 0
    }).catch(() => null);

    try {
      await ActionsWebhookService(
        whatsapp.id,
        flowDispar.flowId,
        ticket.companyId,
        nodes,
        connections,
        flow.flow["nodes"][0].id,
        null,
        "",
      "",
      null,
      ticket.id,
      mountDataContact,
      msg || null,
      execution?.id
    );
      if (execution) await execution.update({ status: "completed", durationMs: Date.now() - execStart }).catch(() => null);
    } catch (err) {
      if (execution) await execution.update({ status: "error", errorMessage: err?.message || String(err), durationMs: Date.now() - execStart }).catch(() => null);
      throw err;
    }
    return;
  }

  // Fire message_received flow triggers when no active flow is running on this ticket
  if (!ticket.flowWebhook) {
    try {
      const { dispatchFlowTrigger } = await import("../FlowBuilderService/FlowTriggerDispatchService");
      if (ticket.isGroup || contact.isGroup) {
        await dispatchFlowTrigger("group_event_received", ticket.companyId, {
          ticketId: ticket.id,
          whatsappId: whatsapp.id,
          message: body,
          contactNumber: contact.number,
          contactName: contact.name,
          metadata: {
            groupJid: msg?.key?.remoteJid,
            participant: msg?.key?.participant || msg?.participant,
            fromMe: msg?.key?.fromMe
          }
        });
      }
      const triggered = await dispatchFlowTrigger("message_received", ticket.companyId, {
        ticketId: ticket.id,
        whatsappId: whatsapp.id,
        message: body,
        contactNumber: contact.number,
        contactName: contact.name,
      });
      if (triggered) return; // A flow was started — stop further processing
    } catch (_) {}
  }

  if (ticket.flowWebhook) {
    console.log(`🔄 FlowWebhook ativo - hashFlowId: ${ticket.hashFlowId}, flowStopped: ${ticket.flowStopped}, lastFlowId: ${ticket.lastFlowId}`);

    // Se hashFlowId é undefined, usar flowStopped diretamente
    let webhook = null;
    if (ticket.hashFlowId) {
      webhook = await WebhookModel.findOne({
        where: {
          company_id: ticket.companyId,
          hash_id: ticket.hashFlowId
        }
      });
    }

    if (webhook && webhook.config["details"]) {
      console.log(`✅ Webhook encontrado - usando flow do webhook: ${webhook.config["details"].idFlow}`);

      const flow = await FlowBuilderModel.findOne({
        where: {
          id: webhook.config["details"].idFlow
        }
      });
      const nodes: INodes[] = flow.flow["nodes"];
      const connections: IConnections[] = flow.flow["connections"];

      // const worker = new Worker("./src/services/WebhookService/WorkerAction.ts");

      // console.log('DISPARO4')
      // // Enviar as variáveis como parte da mensagem para o Worker
      // const data = {
      //   idFlowDb: webhook.config["details"].idFlow,
      //   companyId: ticketUpdate.companyId,
      //   nodes: nodes,
      //   connects: connections,
      //   nextStage: ticketUpdate.lastFlowId,
      //   dataWebhook: ticketUpdate.dataWebhook,
      //   details: webhook.config["details"],
      //   hashWebhookId: ticketUpdate.hashFlowId,
      //   pressKey: body,
      //   idTicket: ticketUpdate.id,
      //   numberPhrase: ""
      // };
      // worker.postMessage(data);

      // worker.on("message", message => {
      //   console.log(`Mensagem do worker: ${message}`);
      // });

      await ActionsWebhookService(
        whatsapp.id,
        webhook.config["details"].idFlow,
        ticket.companyId,
        nodes,
        connections,
        ticket.lastFlowId,
        ticket.dataWebhook,
        webhook.config["details"],
        ticket.hashFlowId,
        body,
        ticket.id,
        null,
        msg || null
      );
    } else {
      console.log(`⚠️ Webhook não encontrado - usando flowStopped: ${ticket.flowStopped}`);

      const flow = await FlowBuilderModel.findOne({
        where: {
          id: ticket.flowStopped
        }
      });

      if (!flow) {
        console.log(`❌ Fluxo ${ticket.flowStopped} não encontrado!`);
        return;
      }

      console.log(`✅ Fluxo ${ticket.flowStopped} encontrado`);

      const nodes: INodes[] = flow.flow["nodes"];
      const connections: IConnections[] = flow.flow["connections"];

      // Se lastFlowId é null ou undefined, começar do nó start
      if (ticket.lastFlowId === null || ticket.lastFlowId === undefined) {
        console.log(`⚠️ lastFlowId é null/undefined, buscando nó start`);

        const startNode = nodes.find((n: any) => n.type === "start");
        if (!startNode) {
          logger.error("Nó start não encontrado no fluxo");
          return;
        }

        // Encontrar a conexão que sai do start
        const startConnection = connections.find((c: any) => c.source === startNode.id);
        if (!startConnection) {
          logger.error("Conexão do nó start não encontrada");
          return;
        }

        console.log(`📍 Atualizando lastFlowId de null para: ${startConnection.target}`);

        // Atualizar ticket com o primeiro nó
        await ticket.update({
          lastFlowId: startConnection.target
        });

        // Executar o primeiro nó
        await ActionsWebhookService(
          whatsapp.id,
          parseInt(ticket.flowStopped),
          ticket.companyId,
          nodes,
          connections,
          startConnection.target,
          null,
          "",
          "",
          body,
          ticket.id,
          {
            number: contact.number,
            name: contact.name,
            email: contact.email
          },
          msg || null
        );
        return;
      }

      console.log(`✅ Usando lastFlowId existente: ${ticket.lastFlowId}`);

      const mountDataContact = {
        number: contact.number,
        name: contact.name,
        email: contact.email
      };

      // const worker = new Worker("./src/services/WebhookService/WorkerAction.ts");

      // console.log('DISPARO5')
      // // Enviar as variáveis como parte da mensagem para o Worker
      // const data = {
      //   idFlowDb: parseInt(ticketUpdate.flowStopped),
      //   companyId: ticketUpdate.companyId,
      //   nodes: nodes,
      //   connects: connections,
      //   nextStage: ticketUpdate.lastFlowId,
      //   dataWebhook: null,
      //   details: "",
      //   hashWebhookId: "",
      //   pressKey: body,
      //   idTicket: ticketUpdate.id,
      //   numberPhrase: mountDataContact
      // };
      // worker.postMessage(data);
      // worker.on("message", message => {
      //   console.log(`Mensagem do worker: ${message}`);
      // });

      await ActionsWebhookService(
        whatsapp.id,
        parseInt(ticket.flowStopped),
        ticket.companyId,
        nodes,
        connections,
        ticket.lastFlowId,
        null,
        "",
        "",
        body,
        ticket.id,
        mountDataContact,
        msg || null
      );
    }
  }
};
export const handleMessageIntegration = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  companyId: number,
  queueIntegration: QueueIntegrations,
  ticket: Ticket,
  isMenu: boolean,
  whatsapp: Whatsapp,
  contact: Contact,
  isFirstMsg: Ticket | null
): Promise<void> => {
  const msgType = getTypeMessage(msg);

  if (queueIntegration.type === "n8n" || queueIntegration.type === "webhook") {
    if (queueIntegration?.urlN8N) {
      const options = {
        method: "POST",
        url: queueIntegration?.urlN8N,
        headers: {
          "Content-Type": "application/json"
        },
        json: msg
      };
      try {
        request(options, function (error, response) {
          if (error) {
            throw new Error(error);
          } else {
            console.log(response.body);
          }
        });
      } catch (error) {
        throw new Error(error);
      }
    }
  } else if (queueIntegration.type === "dialogflow") {
    let inputAudio: string | undefined;

    if (msgType === "audioMessage") {
      let filename = `${msg.messageTimestamp}.ogg`;
      readFile(
        join(
          __dirname,
          "..",
          "..",
          "..",
          "public",
          `company${companyId}`,
          filename
        ),
        "base64",
        (err, data) => {
          inputAudio = data;
          if (err) {
            logger.error(err);
          }
        }
      );
    } else {
      inputAudio = undefined;
    }

    const debouncedSentMessage = debounce(
      async () => {
        await sendDialogflowAwswer(
          wbot,
          ticket,
          msg,
          ticket.contact,
          inputAudio,
          companyId,
          queueIntegration
        );
      },
      500,
      ticket.id
    );
    debouncedSentMessage();
  } else if (queueIntegration.type === "typebot") {
    // await typebots(ticket, msg, wbot, queueIntegration);
    await typebotListener({ ticket, msg, wbot, typebot: queueIntegration });
  } else if (queueIntegration.type === "flowbuilder") {
    if (!isMenu) {
      // const integrations = await ShowQueueIntegrationService(
      //   whatsapp.integrationId,
      //   companyId
      // );
      await flowbuilderIntegration(
        msg,
        wbot,
        companyId,
        undefined, //integrations,
        ticket,
        contact || ticket.contact,
        isFirstMsg
      );
    } else {
      if (
        ticket.flowStopped &&
        ticket.status !== "open" &&
        ticket.status !== "closed"
      ) {
        await flowBuilderQueue(
          ticket,
          msg,
          wbot,
          whatsapp,
          companyId,
          contact,
          isFirstMsg
        );
      }
    }
  } else if (queueIntegration.type === "openai") {
    if (!queueIntegration.promptId) {
      console.warn("Integração OpenAI sem promptId configurado, ignorando.");
      return;
    }

    let prompt;
    try {
      prompt = await ShowPromptService({
        promptId: queueIntegration.promptId,
        companyId
      });
    } catch (err) {
      console.error("Erro ao buscar prompt para integração OpenAI:", err);
      return;
    }

    if (prompt) {
      const openAiSettings: IOpenAi = {
        name: prompt.name,
        prompt: prompt.prompt,
        voice: prompt.voice,
        voiceKey: prompt.voiceKey,
        voiceRegion: prompt.voiceRegion,
        maxTokens: Number(prompt.maxTokens),
        temperature: Number(prompt.temperature),
        apiKey: prompt.apiKey,
        queueId: Number(prompt.queueId),
        maxMessages: Number(prompt.maxMessages),
        promptId: Number(prompt.id),
        provider: prompt.provider || "openai",
        model: prompt.model,
        aiUsageMode: prompt.aiUsageMode,
        knowledgeBase: prompt.knowledgeBase || []
      };

      const runtimeConfig = await buildPromptRuntimeConfig(prompt, companyId);
      openAiSettings.apiKey = runtimeConfig.apiKey;
      openAiSettings.provider = runtimeConfig.provider;
      openAiSettings.aiUsageMode = runtimeConfig.usageMode;

      try {
        const toolsEnabled = await ListPromptToolSettingsService({
          companyId,
          promptId: openAiSettings.promptId ?? null
        });
        openAiSettings.toolsEnabled = toolsEnabled;
      } catch (error) {
        console.error("Erro ao carregar toolsEnabled (Integrations):", error);
      }

      await handleOpenAi(
        openAiSettings,
        msg,
        wbot,
        ticket,
        contact,
        undefined,
        undefined
      );

      await finalizeAIUsage({
        companyId,
        promptId: Number(prompt.id),
        provider: runtimeConfig.provider,
        usageMode: runtimeConfig.usageMode,
        requestType: "agent",
        model: prompt.model,
        status: "success",
        metadata: { ticketId: ticket.id, source: "queue_integration" }
      }).catch(() => undefined);
    }
  }
};

const flowBuilderQueue = async (
  ticket: Ticket,
  msg: proto.IWebMessageInfo,
  wbot: Session,
  whatsapp: Whatsapp,
  companyId: number,
  contact: Contact,
  isFirstMsg: Ticket
) => {
  const body = getBodyMessage(msg);

  // Recarregar ticket do banco para garantir que waitingQuestion está atualizado
  await ticket.reload();

  // Verificar se ticket está aguardando resposta de waitQuestion
  if (ticket.waitingQuestion && !msg.key.fromMe) {
    console.log(`[WaitQuestion/Queue] Processando resposta do ticket ${ticket.id}: "${body}"`);
    console.log(`[WaitQuestion/Queue] questionNodeId=${ticket.questionNodeId}, questionOptions=`, JSON.stringify(ticket.questionOptions));

    try {
      const response = await WaitQuestionService.processResponse(ticket.id, body);

      if (response) {
        console.log(`[WaitQuestion/Queue] Match encontrado: opção=${response.option}, action=${response.action}, nodeId=${response.nodeId}`);

        const flowWQ = await FlowBuilderModel.findOne({
          where: { id: ticket.flowStopped }
        });

        console.log(`[WaitQuestion/Queue] flowStopped=${ticket.flowStopped}, flowFound=${!!flowWQ}`);

        if (flowWQ && flowWQ.flow) {
          const connectionsWQ = flowWQ.flow["connections"] || [];
          const nodeConns = connectionsWQ.filter(conn => conn.source === response.nodeId);
          console.log(`[WaitQuestion/Queue] Conexões do nó ${response.nodeId}:`, JSON.stringify(nodeConns.map(c => ({ sourceHandle: c.sourceHandle, target: c.target }))));

          const handleToFind = response.option;
          console.log(`[WaitQuestion/Queue] Buscando handle: "${handleToFind}"`);

          const targetConnection = connectionsWQ.find(conn =>
            conn.source === response.nodeId &&
            conn.sourceHandle === handleToFind
          );

          if (targetConnection) {
            console.log(`[WaitQuestion/Queue] Conexão encontrada! Target: ${targetConnection.target}`);
            const mountDataContact = {
              number: contact.number,
              name: contact.name,
              email: contact.email
            };

            await ActionsWebhookService(
              whatsapp.id,
              parseInt(ticket.flowStopped),
              ticket.companyId,
              flowWQ.flow["nodes"] || [],
              connectionsWQ,
              targetConnection.target,
              ticket.dataWebhook,
              "",
              "",
              body,
              ticket.id,
              mountDataContact,
              msg
            );
            console.log(`[WaitQuestion/Queue] Fluxo continuado para próximo nó: ${targetConnection.target}`);
          } else {
            console.log(`[WaitQuestion/Queue] ERRO: Conexão NÃO encontrada para source=${response.nodeId} handle=${handleToFind}`);
          }
        }
      } else {
        console.log(`[WaitQuestion/Queue] Resposta não match com nenhuma opção: "${body}"`);
      }
    } catch (error) {
      console.error(`[WaitQuestion/Queue] Erro ao processar resposta:`, error);
    }

    return;
  }

  const flow = await FlowBuilderModel.findOne({
    where: {
      id: ticket.flowStopped
    }
  });

  const mountDataContact = {
    number: contact.number,
    name: contact.name,
    email: contact.email
  };

  const nodes: INodes[] = flow.flow["nodes"];
  const connections: IConnections[] = flow.flow["connections"];

  // Se lastFlowId é null, começar do nó start
  if (!ticket.lastFlowId) {
    const startNode = nodes.find((n: any) => n.type === "start");
    if (!startNode) {
      logger.error("Nó start não encontrado no fluxo");
      return;
    }

    // Encontrar a conexão que sai do start
    const startConnection = connections.find((c: any) => c.source === startNode.id);
    if (!startConnection) {
      logger.error("Conexão do nó start não encontrada");
      return;
    }

    // Atualizar ticket com o primeiro nó
    await ticket.update({
      lastFlowId: startConnection.target
    });

    // Executar o primeiro nó
    await ActionsWebhookService(
      whatsapp.id,
      parseInt(ticket.flowStopped),
      ticket.companyId,
      nodes,
      connections,
      startConnection.target,
      null,
      "",
      "",
      body,
      ticket.id,
      mountDataContact,
      msg || null
    );
    return;
  }

  if (
    ticket.status === "closed" ||
    ticket.status === "interrupted" ||
    ticket.status === "open"
  ) {
    return;
  }

  await ActionsWebhookService(
    whatsapp.id,
    parseInt(ticket.flowStopped),
    ticket.companyId,
    nodes,
    connections,
    ticket.lastFlowId,
    null,
    "",
    "",
    body,
    ticket.id,
    mountDataContact,
    msg || null
  );

  //const integrations = await ShowQueueIntegrationService(whatsapp.integrationId, companyId);
  //await handleMessageIntegration(msg, wbot, companyId, integrations, ticket, contact, isFirstMsg)
};

const handleMessage = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  companyId: number,
  isImported: boolean = false
): Promise<void> => {
  logWhatsappDiagnostic("handleMessage.enter", msg, companyId, wbot.id, {
    isImported
  });

  console.log("log... 2874");

  // Ignorar mensagens de newsletter
  if ((msg?.key?.remoteJid || "").includes("newsletter")) {
    logger.info(`[newsletter] Ignorando mensagem de newsletter em handleMessage: ${msg?.key?.remoteJid || ""}`);
    return;
  }

  if (!isValidMsg(msg)) {
    logWhatsappDiagnostic("handleMessage.invalid-message", msg, companyId, wbot.id);
    console.log("log... 2877");
    return;
  }

  try {
    let msgContact: IMe;
    let groupContact: Contact | undefined;
    let queueId: number = null;
    let tagsId: number = null;
    let userId: number = null;

    let bodyMessage = getBodyMessage(msg);
    const msgType = getTypeMessage(msg);

    console.log("log... 2891");

    const hasMedia =
      msg.message?.imageMessage ||
      msg.message?.audioMessage ||
      msg.message?.videoMessage ||
      msg.message?.stickerMessage ||
      msg.message?.documentMessage ||
      msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
      // msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
      // msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ||
      // msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage ||
      msg.message?.ephemeralMessage?.message?.audioMessage ||
      msg.message?.ephemeralMessage?.message?.documentMessage ||
      msg.message?.ephemeralMessage?.message?.videoMessage ||
      msg.message?.ephemeralMessage?.message?.stickerMessage ||
      msg.message?.ephemeralMessage?.message?.imageMessage ||
      msg.message?.viewOnceMessage?.message?.imageMessage ||
      msg.message?.viewOnceMessage?.message?.videoMessage ||
      msg.message?.viewOnceMessageV2?.message?.imageMessage ||
      msg.message?.viewOnceMessageV2?.message?.videoMessage ||
      msg.message?.viewOnceMessageV2?.message?.audioMessage ||
      msg.message?.viewOnceMessageV2?.message?.documentMessage ||
      msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
        ?.imageMessage ||
      msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
        ?.videoMessage ||
      msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
        ?.audioMessage ||
      msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
        ?.documentMessage ||
      msg.message?.ephemeralMessage?.message?.viewOnceMessageV2?.message
        ?.imageMessage ||
      msg.message?.ephemeralMessage?.message?.viewOnceMessageV2?.message
        ?.videoMessage ||
      msg.message?.ephemeralMessage?.message?.viewOnceMessageV2?.message
        ?.audioMessage ||
      msg.message?.ephemeralMessage?.message?.viewOnceMessageV2?.message
        ?.documentMessage ||
      msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
      msg.message?.templateMessage?.hydratedTemplate?.imageMessage ||
      msg.message?.templateMessage?.hydratedTemplate?.documentMessage ||
      msg.message?.templateMessage?.hydratedTemplate?.videoMessage ||
      msg.message?.templateMessage?.hydratedFourRowTemplate?.imageMessage ||
      msg.message?.templateMessage?.hydratedFourRowTemplate?.documentMessage ||
      msg.message?.templateMessage?.hydratedFourRowTemplate?.videoMessage ||
      msg.message?.templateMessage?.fourRowTemplate?.imageMessage ||
      msg.message?.templateMessage?.fourRowTemplate?.documentMessage ||
      msg.message?.templateMessage?.fourRowTemplate?.videoMessage ||
      msg.message?.interactiveMessage?.header?.imageMessage ||
      msg.message?.interactiveMessage?.header?.documentMessage ||
      msg.message?.interactiveMessage?.header?.videoMessage ||
      msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
        ?.documentMessage ||
      msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
        ?.videoMessage ||
      msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
        ?.imageMessage ||
      msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
        ?.locationMessage;

    if (msg.key.fromMe) {
      if (/\u200e/.test(bodyMessage)) return;

      console.log("log... 2935");

      if (
        !hasMedia &&
        msgType !== "conversation" &&
        msgType !== "extendedTextMessage" &&
        msgType !== "contactMessage" &&
        msgType !== "reactionMessage" &&
        msgType !== "ephemeralMessage" &&
        msgType !== "protocolMessage" &&
        msgType !== "viewOnceMessage" &&
        msgType !== "viewOnceMessageV2" &&
        msgType !== "editedMessage" &&
        msgType !== "hydratedContentText"
      )
        return;
      msgContact = await getContactMessage(msg, wbot);
    } else {
      msgContact = await getContactMessage(msg, wbot);
    }

    const isGroup = msg.key.remoteJid?.endsWith("@g.us");

    // Verificar se é mensagem de comunidade do WhatsApp
    // Comunidades usam messageStubType ou participant de anúncio da comunidade
    // NÃO usar regex /^\d+@g\.us$/ pois isso bloqueia TODOS os grupos (todos têm IDs numéricos)
    const isCommunityAnnouncement = isGroup && (
      msg.key.remoteJid?.includes("@newsletter") ||
      msg.messageStubType === 78 || // WAMessageStubType.COMMUNITY_ANNOUNCEMENT
      msg.messageStubType === 79 || // WAMessageStubType.COMMUNITY_PARTICIPANT_ADD
      msg.messageStubType === 80    // WAMessageStubType.COMMUNITY_PARTICIPANT_REMOVE
    );

    // Bloquear apenas mensagens de anúncios de comunidades
    if (isCommunityAnnouncement) {
      console.log(`[Community] Mensagem de anúncio de comunidade bloqueada: ${msg.key.remoteJid}`);
      return;
    }

    const whatsapp = await ShowWhatsAppService(wbot.id!, companyId);

    console.log("log... 2961");

    if (!whatsapp.allowGroup && isGroup) return;

    if (isGroup) {
      console.log("log... 2966");
      let grupoMeta: { id: string; subject: string };
      const groupCacheKey = `groupMeta:${msg.key.remoteJid}:${companyId}`;
      const cachedMeta = await cacheLayer.get(groupCacheKey);

      if (cachedMeta) {
        grupoMeta = JSON.parse(cachedMeta);
      } else {
        try {
          const metaPromise = wbot.groupMetadata(msg.key.remoteJid);
          const metaTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("groupMetadata timeout")), 5000)
          );
          const fullMeta = await Promise.race([metaPromise, metaTimeout]);
          grupoMeta = { id: fullMeta.id, subject: fullMeta.subject || fullMeta.id.split("@")[0] };
          await cacheLayer.set(groupCacheKey, JSON.stringify(grupoMeta), "EX", 300);
        } catch (err) {
          logger.warn(`[Groups] groupMetadata failed for ${msg.key.remoteJid}: ${err?.message}`);
          grupoMeta = {
            id: msg.key.remoteJid,
            subject: msg.key.remoteJid.split("@")[0]
          };
        }
      }

      const msgGroupContact = {
        id: grupoMeta.id,
        name: grupoMeta.subject
      };
      groupContact = await verifyContact(msgGroupContact, wbot, companyId, null);
    }

    const contact = await verifyContact(msgContact, wbot, companyId, msg);

    let unreadMessages = 0;

    if (msg.key.fromMe) {
      console.log("log... 2980");
      await cacheLayer.set(`contacts:${contact.id}:unreads`, "0");
    } else {
      console.log("log... 2983");
      const unreads = await cacheLayer.get(`contacts:${contact.id}:unreads`);
      unreadMessages = +unreads + 1;
      await cacheLayer.set(
        `contacts:${contact.id}:unreads`,
        `${unreadMessages}`
      );
    }

    const settings =
      (await CompaniesSettings.findOne({
        where: {
          companyId
        }
      })) || ({} as CompaniesSettings);

    const enableLGPD = settings.enableLGPD === "enabled";

    const isFirstMsg = await Ticket.findOne({
      where: {
        contactId: groupContact ? groupContact.id : contact.id,
        companyId,
        whatsappId: whatsapp.id
      },
      order: [["id", "DESC"]]
    });

    const mutexKey = `${companyId}:${groupContact ? groupContact.id : contact.id}:${whatsapp.id}`;
    const ticketMutex = getTicketMutex(mutexKey);
    // Inclui a busca de ticket aqui, se realmente não achar um ticket, então vai para o findorcreate
    const ticket = await ticketMutex.runExclusive(async () => {
      const result = await FindOrCreateTicketService(
        contact,
        whatsapp,
        unreadMessages,
        companyId,
        queueId,
        userId,
        groupContact,
        "whatsapp",
        isImported,
        false,
        settings
      );
      return result;
    });
    if (!ticketMutex.isLocked()) {
      ticketMutexes.delete(mutexKey);
    }

    const aiMessageKey = `tickets:${ticket.id}:aiMessage:${msg.key.id}`;
    const botPauseKey = `tickets:${ticket.id}:botPauseUntil`;
    if (msg.key.fromMe) {
      const isAiMessage = await cacheLayer.get(aiMessageKey);
      if (isAiMessage) {
        await cacheLayer.del(aiMessageKey);
      } else {
        const pauseUntil = add(new Date(), { minutes: 30 }).getTime();
        await cacheLayer.set(botPauseKey, pauseUntil.toString(), "EX", 60 * 60);

        if (ticket.isBot) {
          await ticket.update({ isBot: false });
          ticket.isBot = false;
        }
      }
    } else {
      const pauseUntil = await cacheLayer.get(botPauseKey);
      if (pauseUntil) {
        const pauseUntilNumber = Number(pauseUntil);
        if (!Number.isNaN(pauseUntilNumber)) {
          if (Date.now() >= pauseUntilNumber) {
            await cacheLayer.del(botPauseKey);
            if (!ticket.userId && !ticket.isBot) {
              await ticket.update({ isBot: true });
              ticket.isBot = true;
            }
          }
        }
      }
    }

    let bodyRollbackTag = "";
    let bodyNextTag = "";
    let rollbackTag;
    let nextTag;
    let ticketTag = undefined;
    // console.log(ticket.id)
    if (ticket?.company?.plan?.useKanban) {
      ticketTag = await TicketTag.findOne({
        where: {
          ticketId: ticket.id
        }
      });

      if (ticketTag) {
        const tag = await Tag.findByPk(ticketTag.tagId);
        console.log("log... 3033");
        if (tag.nextLaneId) {
          nextTag = await Tag.findByPk(tag.nextLaneId);
          console.log("log... 3036");
          bodyNextTag = nextTag.greetingMessageLane;
        }
        if (tag.rollbackLaneId) {
          rollbackTag = await Tag.findByPk(tag.rollbackLaneId);
          console.log("log... 3041");
          bodyRollbackTag = rollbackTag.greetingMessageLane;
        }
      }
    }

    if (
      ticket.status === "closed" ||
      (unreadMessages === 0 &&
        whatsapp.complationMessage &&
        formatBody(whatsapp.complationMessage, ticket) === bodyMessage)
    ) {
      return;
    }

    if (
      rollbackTag &&
      formatBody(bodyNextTag, ticket) !== bodyMessage &&
      formatBody(bodyRollbackTag, ticket) !== bodyMessage
    ) {
      await TicketTag.destroy({
        where: { ticketId: ticket.id, tagId: ticketTag.tagId }
      });
      await TicketTag.create({ ticketId: ticket.id, tagId: rollbackTag.id });
    }

    if (isImported) {
      console.log("log... 3063");
      await ticket.update({
        queueId: whatsapp.queueIdImportMessages
      });
    }

    // console.log(msg.message?.editedMessage)
    // console.log(ticket)
    if (msgType === "editedMessage" || msgType === "protocolMessage") {
      const msgKeyIdEdited =
        msgType === "editedMessage"
          ? msg.message.editedMessage.message.protocolMessage.key.id
          : msg.message?.protocolMessage.key.id;
      let bodyEdited = findCaption(msg.message);

      console.log("log... 3075");

      // console.log("bodyEdited", bodyEdited)
      const io = getIO();
      try {
        const messageToUpdate = await Message.findOne({
          where: {
            wid: msgKeyIdEdited,
            companyId,
            ticketId: ticket.id
          }
        });

        if (!messageToUpdate) return;

        await messageToUpdate.update({ isEdited: true, body: bodyEdited });

        await ticket.update({ lastMessage: bodyEdited });

        console.log("log... 3094");

        io.of(String(companyId))
          // .to(String(ticket.id))
          .emit(`company-${companyId}-appMessage`, {
            action: "update",
            message: messageToUpdate
          });

        io.of(String(companyId))
          // .to(ticket.status)
          // .to("notification")
          // .to(String(ticket.id))
          .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket
          });
      } catch (err) {
        Sentry.captureException(err);
        logger.error(`Error handling message ack. Err: ${err}`);
      }
      return;
    }

    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      companyId,
      userId,
      whatsappId: whatsapp?.id
    });

    let useLGPD = false;

    try {
      if (!msg.key.fromMe) {
        //MENSAGEM DE FÉRIAS COLETIVAS

        console.log("log... 3131");

        if (!isNil(whatsapp.collectiveVacationMessage && !isGroup)) {
          const currentDate = moment();

          console.log("log... 3136");

          if (
            currentDate.isBetween(
              moment(whatsapp.collectiveVacationStart),
              moment(whatsapp.collectiveVacationEnd)
            )
          ) {
            console.log("log... 3140");

            if (hasMedia) {
              console.log("log... 3144");

              await verifyMediaMessage(
                msg,
                ticket,
                contact,
                ticketTraking,
                false,
                false,
                wbot
              );
            } else {
              console.log("log... 3148");
              await verifyMessage(msg, ticket, contact, ticketTraking);
            }

            console.log("log... 3152");
            wbot.sendMessage(contact.remoteJid, {
              text: whatsapp.collectiveVacationMessage
            });

            return;
          }
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }

    const isMsgForwarded =
      msg.message?.extendedTextMessage?.contextInfo?.isForwarded ||
      msg.message?.imageMessage?.contextInfo?.isForwarded ||
      msg.message?.audioMessage?.contextInfo?.isForwarded ||
      msg.message?.videoMessage?.contextInfo?.isForwarded ||
      msg.message?.documentMessage?.contextInfo?.isForwarded;

    let mediaSent: Message | undefined;

    if (!useLGPD) {
      console.log("log... 3391");
      if (hasMedia) {
        console.log("log... 3393");
        mediaSent = await verifyMediaMessage(
          msg,
          ticket,
          contact,
          ticketTraking,
          isMsgForwarded,
          false,
          wbot
        );

        // Dispara MESSAGE_SENT para mídia enviada por agente via dispositivo móvel
        // (fromAgent=false). Mensagens do sistema UI já disparam em verifyMessage
        // via MessageController antes que handleMessage seja chamado.
        if (msg.key.fromMe && !isImported) {
          const outgoingOrigin = getOutgoingWebhookOrigin(msg, false);
          webhookDispatch("MESSAGE_SENT", companyId, {
            ticket: {
              id: ticket.id,
              status: ticket.status,
              contactId: ticket.contactId,
              queueId: ticket.queueId,
              userId: ticket.userId,
              whatsappId: ticket.whatsappId
            },
            contact: {
              id: contact.id,
              name: contact.name,
              number: contact.number,
              email: contact.email
            },
            message: {
              id: msg.key.id,
              body: mediaSent?.body ?? getBodyMessage(msg),
              type: getTypeMessage(msg),
              timestamp: new Date(
                Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)
              ).toISOString(),
              fromMe: true,
              fromAgent: false,
              userId: ticket.userId ?? null,
              source: outgoingOrigin.source,
              fromExternalDevice: outgoingOrigin.fromExternalDevice,
              fromCellphone: outgoingOrigin.fromCellphone,
              fromCompanion: outgoingOrigin.fromCompanion,
              deviceOrigin: outgoingOrigin.deviceOrigin
            },
            whatsapp: {
              id: ticket.whatsappId,
              name: (ticket as any)?.whatsapp?.name,
              number: (ticket as any)?.whatsapp?.number,
              token: (ticket as any)?.whatsapp?.token,
              channel: ticket.channel
            }
          });
        }
      } else {
        console.log("log... 3396");
        // console.log("antes do verifyMessage")
        await verifyMessage(
          msg,
          ticket,
          contact,
          ticketTraking,
          false,
          isMsgForwarded
        );
      }
    }

    if (!msg.key.fromMe && !isGroup && !hasMedia) {
      const reminderReplyResult = await handleAiReminderReply({
        companyId,
        contactId: contact?.id,
        phone: contact?.number || msgContact?.id,
        body: bodyMessage,
        buttonId:
          msg?.message?.buttonsResponseMessage?.selectedButtonId ||
          msg?.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
          msg?.message?.templateButtonReplyMessage?.selectedId ||
          null
      }).catch(error => {
        logger.warn(`[AiExternalJourney] Falha ao processar resposta de lembrete: ${error?.message || error}`);
        return { handled: false, continueAutomation: true };
      });

      if (reminderReplyResult?.handled && !reminderReplyResult?.continueAutomation) {
        return;
      }
    }

    try {
      if (!msg.key.fromMe) {
        console.log("log... 3226");
        console.log("log... 3227", { ticketTraking });
        if (ticketTraking !== null && verifyRating(ticketTraking)) {
          handleRating(parseFloat(bodyMessage), ticket, ticketTraking);
          return;
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }

    // Dispara evento MESSAGE_RECEIVED para webhooks configurados.
    // Suprimido se o agente ativou "Desabilitar chatbot" (pause por 1 hora, por ticket).
    const _webhookSuppressed =
      !!ticket.webhookDisabled ||
      (!!ticket.webhookPausedUntil &&
        new Date(ticket.webhookPausedUntil) > new Date());
    if (!msg.key.fromMe && !ticket.isGroup && !_webhookSuppressed) {
      // Inclui base64 da mídia no payload quando houver arquivo de mídia
      let _mediaBase64: string | undefined;
      let _mediaMimeType: string | undefined;
      let _mediaFilename: string | undefined;

      // mediaUrlPublic: URL pública completa vinda do getter do model (ex: https://domain/public/company1/file.ogg)
      // _rawMediaFilename: apenas o nome do arquivo gravado no DB (ex: file.ogg) — necessário para ler do filesystem
      let _mediaUrlPublic: string | undefined;
      if (hasMedia && mediaSent?.mediaUrl) {
        _mediaUrlPublic = mediaSent.mediaUrl; // getter retorna URL completa
        const _rawMediaFilename = mediaSent.getDataValue("mediaUrl") as string | null;
        const _mediaMeta = getMessageMedia(getUnpackedMessage(msg));
        _mediaMimeType = _mediaMeta?.mimetype || `${mediaSent.mediaType}/octet-stream`;
        _mediaFilename = _rawMediaFilename || undefined;

        if (_rawMediaFilename) {
          // Usa o nome cru do arquivo (não a URL pública) para montar o caminho no filesystem
          const _mediaFilePath = path.resolve(
            __dirname,
            "..",
            "..",
            "..",
            "public",
            `company${companyId}`,
            _rawMediaFilename
          );
          logger.info(
            `[WebhookDispatch] Lendo mídia para webhook: arquivo=${_rawMediaFilename} path=${_mediaFilePath} mimeType=${_mediaMimeType}`
          );
          try {
            _mediaBase64 = fs.readFileSync(_mediaFilePath, "base64");
          } catch (_fsErr: any) {
            logger.warn(
              `[WebhookDispatch] Não foi possível ler mídia do filesystem (${_mediaFilePath}): ${_fsErr.message}. Payload incluirá apenas mediaUrl.`
            );
          }
        }
      }

      webhookDispatch("MESSAGE_RECEIVED", companyId, {
        ticket: {
          id: ticket.id,
          status: ticket.status,
          contactId: ticket.contactId,
          queueId: ticket.queueId,
          userId: ticket.userId,
          whatsappId: ticket.whatsappId
        },
        contact: {
          id: contact.id,
          name: contact.name,
          number: contact.number,
          email: contact.email
        },
        message: {
          body: bodyMessage,
          type: getTypeMessage(msg),
          timestamp: msg.messageTimestamp,
          fromMe: false,
          ...(hasMedia && _mediaUrlPublic !== undefined && {
            mediaUrl: _mediaUrlPublic,
            mimeType: _mediaMimeType,
            filename: _mediaFilename,
            ...(_mediaBase64 !== undefined && { mediaBase64: _mediaBase64 })
          })
        },
        whatsapp: {
          id: whatsapp?.id,
          name: whatsapp?.name,
          number: whatsapp?.number,
          token: whatsapp?.token
        }
      });
    }

    // Atualiza o ticket se a ultima mensagem foi enviada por mim, para que possa ser finalizado.
    try {
      console.log("log... 3258");
      await ticket.update({
        fromMe: msg.key.fromMe
      });
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }

    let currentSchedule;

    if (settings.scheduleType === "company") {
      console.log("log... 3270");
      currentSchedule = await VerifyCurrentSchedule(companyId, 0, 0);
    } else if (settings.scheduleType === "connection") {
      console.log("log... 3273");
      currentSchedule = await VerifyCurrentSchedule(companyId, 0, whatsapp.id);
    }

    try {
      if (
        !msg.key.fromMe &&
        settings.scheduleType &&
        (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
        !["open", "group"].includes(ticket.status)
      ) {
        /**
         * Tratamento para envio de mensagem quando a empresa está fora do expediente
         */
        console.log("log... 3280");
        if (
          (settings.scheduleType === "company" ||
            settings.scheduleType === "connection") &&
          !isNil(currentSchedule) &&
          (!currentSchedule || currentSchedule.inActivity === false)
        ) {
          console.log("log... 3289");
          if (
            whatsapp.maxUseBotQueues &&
            whatsapp.maxUseBotQueues !== 0 &&
            ticket.amountUsedBotQueues >= whatsapp.maxUseBotQueues
          ) {
            // await UpdateTicketService({
            //   ticketData: { queueId: queues[0].id },
            //   ticketId: ticket.id
            // });

            return;
          }

          if (whatsapp.timeUseBotQueues !== "0") {
            console.log("log... 3300");
            if (
              ticket.isOutOfHour === false &&
              ticketTraking.chatbotAt !== null
            ) {
              console.log("log... 3302");
              await ticketTraking.update({
                chatbotAt: null
              });
              await ticket.update({
                amountUsedBotQueues: 0
              });
            }

            //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
            let dataLimite = new Date();
            let Agora = new Date();

            if (ticketTraking.chatbotAt !== null) {
              dataLimite.setMinutes(
                ticketTraking.chatbotAt.getMinutes() +
                Number(whatsapp.timeUseBotQueues)
              );
              console.log("log... 3318");
              if (
                ticketTraking.chatbotAt !== null &&
                Agora < dataLimite &&
                whatsapp.timeUseBotQueues !== "0" &&
                ticket.amountUsedBotQueues !== 0
              ) {
                return;
              }
            }

            await ticketTraking.update({
              chatbotAt: null
            });
          }

          //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
          await ticket.update({
            isOutOfHour: true,
            amountUsedBotQueues: ticket.amountUsedBotQueues + 1
          });

          return;
        }
        console.log("a56cas32ca3651svf");
      }
      console.log("165132as");
    } catch (e) {
      console.log("DEU CATCH!");
      Sentry.captureException(e);
      console.log(e);
    }

    console.log("log... 4444444");

    const flow = await FlowBuilderModel.findOne({
      where: {
        id: ticket.flowStopped
      }
    });

    let isMenu = false;
    let isOpenai = false;
    let isQuestion = false;

    if (flow) {
      isMenu =
        flow.flow["nodes"].find((node: any) => node.id === ticket.lastFlowId)
          ?.type === "menu";
      isOpenai =
        flow.flow["nodes"].find((node: any) => node.id === ticket.lastFlowId)
          ?.type === "openai";
      isQuestion =
        flow.flow["nodes"].find((node: any) => node.id === ticket.lastFlowId)
          ?.type === "question";
    }

    const asaasState = ticket.dataWebhook?.asaasState;

    if (
      !isNil(flow) &&
      asaasState?.awaiting === true &&
      asaasState?.nodeId === ticket.lastFlowId &&
      !msg.key.fromMe
    ) {
      console.log("|============= ASAAS CPF =============|");
      const body = getBodyMessage(msg);
      if (!body) {
        console.warn("Asaas CPF: mensagem sem corpo, ignorando.");
        return;
      }

      const nodes: INodes[] = flow.flow["nodes"];
      const connections: IConnections[] = flow.flow["connections"];
      const nodeSelected = nodes.find(
        (node: any) => node.id === ticket.lastFlowId
      );

      if (!nodeSelected) {
        console.warn("Asaas CPF: nodeSelected não encontrado");
        return;
      }

      const mountDataContact = {
        number: contact.number,
        name: contact.name,
        email: contact.email
      };

      await ActionsWebhookService(
        whatsapp.id,
        parseInt(ticket.flowStopped),
        ticket.companyId,
        nodes,
        connections,
        ticket.lastFlowId,
        ticket.dataWebhook,
        "",
        "",
        body,
        ticket.id,
        mountDataContact,
        msg || null
      );

      return;
    }

    if (!isNil(flow) && isQuestion && !msg.key.fromMe) {
      console.log(
        "|============= QUESTION =============|",
        JSON.stringify(flow, null, 4)
      );
      const body = getBodyMessage(msg);
      if (body) {
        const nodes: INodes[] = flow.flow["nodes"];
        const nodeSelected = nodes.find(
          (node: any) => node.id === ticket.lastFlowId
        );

        if (!nodeSelected) {
          console.warn("Question: nodeSelected não encontrado");
          return;
        }

        const connections: IConnections[] = flow.flow["connections"];
        const questionConfig = nodeSelected.data.typebotIntegration || {};
        const answerKey =
          questionConfig.answerKey || `question_${nodeSelected.id}`;

        const oldDataWebhook = ticket.dataWebhook || {};
        const oldVariables = oldDataWebhook.variables || {};
        const updatedWebhookData: any = {
          ...oldDataWebhook,
          variables: {
            ...oldVariables,
            [answerKey]: body
          }
        };

        if (
          updatedWebhookData.questionState?.nodeId === nodeSelected.id &&
          updatedWebhookData.questionState?.awaiting
        ) {
          delete updatedWebhookData.questionState;
        }

        const outgoingConnection = connections.find(
          connection => connection.source === nodeSelected.id
        );
        const nodeIndex = nodes.findIndex(node => node.id === nodeSelected.id);
        const fallbackNode = nodes[nodeIndex + 1];
        const nextFlowId = outgoingConnection
          ? outgoingConnection.target
          : fallbackNode?.id;

        if (!nextFlowId) {
          console.warn("Question: próximo nó não encontrado, encerrando fluxo.");
          return;
        }

        await ticket.update({
          lastFlowId: nextFlowId,
          dataWebhook: updatedWebhookData
        });

        const mountDataContact = {
          number: contact.number,
          name: contact.name,
          email: contact.email
        };

        await ActionsWebhookService(
          whatsapp.id,
          parseInt(ticket.flowStopped),
          ticket.companyId,
          nodes,
          connections,
          nextFlowId,
          updatedWebhookData,
          "",
          "",
          "",
          ticket.id,
          mountDataContact,
          msg || null
        );
      }

      return;
    }

    // IA do FlowBuilder: só responde se ticket NÃO tiver usuário vinculado
    if (ticket.isBot && isOpenai && !isNil(flow) && !ticket.queue && !ticket.userId) {
      console.log(`=== OPENAI DIRETO - wbotMessageListener ===`);
      console.log(`ticket.isBot=${ticket.isBot}, isOpenai=${isOpenai}, flowId=${ticket.lastFlowId}`);
      console.log(`ticket.queue=${ticket.queue}, ticket.userId=${ticket.userId}`);

      const nodes: INodes[] = flow.flow["nodes"];
      const nodeIndex = nodes.findIndex(node => node.id === ticket.lastFlowId);
      const nodeSelected = nodes[nodeIndex];

      console.log(`Nó encontrado: id=${nodeSelected?.id}, type=${nodeSelected?.type}`);

      const cfg: any = nodeSelected.data.typebotIntegration || {};
      console.log(`OPENAI DIRETO: Configuração inicial=`, JSON.stringify(cfg, null, 2));

      let openAiSettings: any;

      const promptIdNumber = cfg.iaId ? Number(cfg.iaId) : NaN;

      if (cfg.iaMode === "system" && !Number.isNaN(promptIdNumber)) {
        const prompt = await ShowPromptService({
          promptId: promptIdNumber,
          companyId
        });

        openAiSettings = {
          name: prompt.name,
          prompt: prompt.prompt,
          voice: prompt.voice,
          voiceKey: prompt.voiceKey,
          voiceRegion: prompt.voiceRegion,
          maxTokens: Number(prompt.maxTokens),
          temperature: Number(prompt.temperature),
          apiKey: prompt.apiKey,
          queueId: Number(prompt.queueId),
          maxMessages: Number(prompt.maxMessages),
          promptId: Number(prompt.id)
        };
      } else {
        let {
          name,
          prompt,
          voice,
          voiceKey,
          voiceRegion,
          maxTokens,
          temperature,
          apiKey,
          queueId,
          maxMessages
        } = cfg as IOpenAi;

        openAiSettings = {
          name,
          prompt,
          voice,
          voiceKey,
          voiceRegion,
          maxTokens: parseInt(maxTokens),
          temperature: parseInt(temperature),
          apiKey,
          queueId: parseInt(queueId),
          maxMessages: parseInt(maxMessages),
          promptId: Number.isNaN(promptIdNumber) ? null : promptIdNumber
        };
      }

      try {
        const toolsEnabled = await ListPromptToolSettingsService({
          companyId,
          promptId: openAiSettings.promptId ?? null
        });
        openAiSettings.toolsEnabled = toolsEnabled;
      } catch (error) {
        console.error("Erro ao carregar toolsEnabled (FlowBuilder):", error);
      }

      // 🎧🖼️ Se for áudio ou imagem, envia direto sem buffer (será normalizado no OpenAiService)
      if (msg.message?.audioMessage || msg.message?.imageMessage) {
        console.log("🎧🖼️ Mídia detectada, enviando direto para normalização (sem buffer)");
        console.log(`OPENAI DIRETO: Chamando handleOpenAi com mídia`);
        await handleOpenAi(
          openAiSettings,
          msg,
          wbot,
          ticket,
          contact,
          mediaSent,
          ticketTraking
        );
        return;
      }

      // Buffer de mensagens de TEXTO para agrupar antes de enviar à IA
      const bodyMessage = getBodyMessage(msg);
      if (!bodyMessage) return;

      // Cria o buffer se ainda não existir
      if (!messageBuffer[ticket.id]) {
        messageBuffer[ticket.id] = { texts: [] };
      }

      // Adiciona o texto recebido ao buffer
      messageBuffer[ticket.id].texts.push(bodyMessage);

      // Se já tiver um timeout ativo, cancela e reinicia
      if (messageBuffer[ticket.id].timeout) {
        clearTimeout(messageBuffer[ticket.id].timeout);
      }

      // Define o novo timeout de 8 segundos
      messageBuffer[ticket.id].timeout = setTimeout(async () => {
        try {
          // Junta todas as mensagens acumuladas
          const combinedText = messageBuffer[ticket.id].texts.join(". ");
          delete messageBuffer[ticket.id];

          // Clona a mensagem original e substitui o texto
          const combinedMsg = JSON.parse(JSON.stringify(msg));
          combinedMsg.message.conversation = combinedText;

          console.log(`🧠 Agrupando mensagens em 8s (FlowBuilder): ${combinedText}`);

          // Chama a IA com o texto combinado
          console.log(`OPENAI DIRETO: Chamando handleOpenAi com mensagem combinada`);
          await handleOpenAi(
            openAiSettings,
            combinedMsg,
            wbot,
            ticket,
            contact,
            mediaSent,
            ticketTraking
          );
        } catch (error) {
          console.error("❌ Erro ao processar mensagens agrupadas (FlowBuilder):", error);
        }
      }, 8000); // 8 segundos

      return;
    }

    // openai na conexão
    // IA só responde se ticket NÃO tiver usuário vinculado
    // (independente de ter fila ou não)
    if (
      !isGroup &&
      !msg.key.fromMe &&
      !isNil(whatsapp.promptId) &&
      !ticket.userId
    ) {
      const { prompt } = whatsapp;

      if (prompt) {
        try {
          const toolsEnabled = await ListPromptToolSettingsService({
            companyId,
            promptId: (prompt as any)?.id ?? null
          });
          (prompt as any).toolsEnabled = toolsEnabled;
        } catch (error) {
          console.error("Erro ao carregar toolsEnabled (WhatsApp prompt):", error);
        }
      }

      // 🎧🖼️ Se for áudio ou imagem, envia direto sem buffer (será normalizado no OpenAiService)
      if (msg.message?.audioMessage || msg.message?.imageMessage) {
        console.log("🎧🖼️ Mídia detectada, enviando direto para normalização (sem buffer)");
        await handleOpenAi(
          prompt,
          msg,
          wbot,
          ticket,
          contact,
          mediaSent,
          ticketTraking
        );
        return;
      }

      // Buffer de mensagens de TEXTO para agrupar antes de enviar à IA
      const bodyMessage = getBodyMessage(msg);
      if (!bodyMessage) return;

      // Cria o buffer se ainda não existir
      if (!messageBuffer[ticket.id]) {
        messageBuffer[ticket.id] = { texts: [] };
      }

      // Adiciona o texto recebido ao buffer
      messageBuffer[ticket.id].texts.push(bodyMessage);

      // Se já tiver um timeout ativo, cancela e reinicia
      if (messageBuffer[ticket.id].timeout) {
        clearTimeout(messageBuffer[ticket.id].timeout);
      }

      // Define o novo timeout de 8 segundos
      messageBuffer[ticket.id].timeout = setTimeout(async () => {
        try {
          // Junta todas as mensagens acumuladas
          const combinedText = messageBuffer[ticket.id].texts.join(". ");
          delete messageBuffer[ticket.id];

          // Clona a mensagem original e substitui o texto
          const combinedMsg = JSON.parse(JSON.stringify(msg));
          combinedMsg.message.conversation = combinedText;

          console.log(`🧠 Agrupando mensagens em 8s (Conexão): ${combinedText}`);

          // Chama a IA com o texto combinado
          await handleOpenAi(
            prompt,
            combinedMsg,
            wbot,
            ticket,
            contact,
            mediaSent,
            ticketTraking
          );
        } catch (error) {
          console.error("❌ Erro ao processar mensagens agrupadas (Conexão):", error);
        }
      }, 8000); // 8 segundos
    }

    console.log("log... 4444", { ticket });
    //integraçao na conexao
    if (
      !ticket.imported &&
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !ticket.queue &&
      !ticket.user &&
      ticket.isBot &&
      !isNil(whatsapp.integrationId) &&
      !ticket.useIntegration
    ) {
      console.log("3245");
      const integrations = await ShowQueueIntegrationService(
        whatsapp.integrationId,
        companyId
      );

      await handleMessageIntegration(
        msg,
        wbot,
        companyId,
        integrations,
        ticket,
        isMenu,
        whatsapp,
        contact,
        isFirstMsg
      );
      return;
    }

    // integração flowbuilder
    if (
      !ticket.imported &&
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !ticket.queue &&
      !ticket.user &&
      !isNil(whatsapp.integrationId) &&
      !ticket.useIntegration
    ) {
      const integrations = await ShowQueueIntegrationService(
        whatsapp.integrationId,
        companyId
      );
      await handleMessageIntegration(
        msg,
        wbot,
        companyId,
        integrations,
        ticket,
        isMenu,
        whatsapp,
        contact,
        isFirstMsg
      );
    }

    // FlowCampaign / FlowDefault sem integração configurada no canal
    if (
      !ticket.imported &&
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !ticket.useIntegration &&
      isNil(whatsapp.integrationId)
    ) {
      await flowbuilderIntegration(
        msg,
        wbot,
        companyId,
        undefined,
        ticket,
        contact,
        isFirstMsg
      );
    }

    console.log("I - check typebot");
    console.log("Ticket.typebotSessionId: ", ticket.typebotSessionId);
    if (
      ticket.typebotStatus &&
      !msg.key.fromMe &&
      !isNil(ticket.typebotSessionTime) &&
      ticket.useIntegration
    ) {
      console.log("|================== CONTINUE TYPEBO ==============|");
      const flow = await FlowBuilderModel.findOne({
        where: {
          id: ticket.flowStopped
        }
      });
      const nodes: INodes[] = flow.flow["nodes"];
      const lastFlow = nodes.find(f => f.id === ticket.lastFlowId);
      const typebot = lastFlow.data.typebotIntegration;

      console.log("typebot", typebot);

      try {
        await typebotListener({
          wbot: wbot,
          msg,
          ticket,
          typebot: lastFlow.data.typebotIntegration
        });
      } catch (error) {
        console.log('Erro no typebotListener: ', error)
        // get axios error  data and status code
        const axiosError = error as AxiosError;
        const { data, status } = axiosError.response || {};

        console.log('axiosError', axiosError)
        console.log('data', data)
        console.log('status: ', status)

        if (status === 404 && (data as any)?.message === "Session not found.") {
          await ticket.destroy();
          // await ticket.update({
          //   typebotSessionId: null,
          //   typebotSessionTime: null,
          //   typebotStatus: false,
          // });

          // // tentar novamente
          // await typebotListener({
          //   wbot: wbot,
          //   msg,
          //   ticket,
          //   typebot: lastFlow.data.typebotIntegration
          // });
          handleMessage(msg, wbot, companyId);
        }
      }

      return;
    } else {
      //check motives
      console.log(
        "!isNil(ticket.typebotSessionId): ",
        !isNil(ticket.typebotSessionId)
      );
      console.log("ticket.typebotStatus: ", ticket.typebotStatus);
      console.log("!msg.key.fromMe: ", !msg.key.fromMe);
      console.log(
        "!isNil(ticket.typebotSessionTime): ",
        !isNil(ticket.typebotSessionTime)
      );
      console.log("ticket.useIntegration: ", ticket.useIntegration);
    }
    console.log("F - check typebot");
    if (
      !ticket.imported &&
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !ticket.userId &&
      ticket.integrationId &&
      ticket.useIntegration
    ) {
      const integrations = await ShowQueueIntegrationService(
        ticket.integrationId,
        companyId
      );

      console.log("3264");
      console.log("3257", { ticket });
      await handleMessageIntegration(
        msg,
        wbot,
        companyId,
        integrations,
        ticket,
        null,
        null,
        contact,
        null
      );

      if (msg.key.fromMe) {
        await ticket.update({
          typebotSessionTime: moment().toDate()
        });
      }
    }

    if (
      !ticket.imported &&
      !ticket.queue &&
      (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
      !msg.key.fromMe &&
      !ticket.userId &&
      whatsapp.queues.length >= 1 &&
      !ticket.useIntegration
    ) {
      // console.log("antes do verifyqueue")
      await verifyQueue(wbot, msg, ticket, contact, settings, ticketTraking);

      if (ticketTraking.chatbotAt === null) {
        await ticketTraking.update({
          chatbotAt: moment().toDate()
        });
      }
    }

    if (ticket.queueId > 0) {
      await ticketTraking.update({
        queueId: ticket.queueId
      });
    }

    // Verificação se aceita audio do contato
    if (
      getTypeMessage(msg) === "audioMessage" &&
      !msg.key.fromMe &&
      (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
      (!contact?.acceptAudioMessage ||
        settings?.acceptAudioMessageContact === "disabled")
    ) {
      const sentMessage = await wbot.sendMessage(
        `${contact.number}@c.us`,
        {
          text: `\u200e*Assistente Virtual*:\nInfelizmente não conseguimos escutar nem enviar áudios por este canal de atendimento, por favor, envie uma mensagem de *texto*.`
        },
        {
          quoted: {
            key: msg.key,
            message: {
              extendedTextMessage: msg.message.extendedTextMessage
            }
          }
        }
      );
      await verifyMessage(sentMessage, ticket, contact, ticketTraking);
    }

    try {
      if (
        !msg.key.fromMe &&
        settings?.scheduleType &&
        ticket.queueId !== null &&
        (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
        ticket.status !== "open"
      ) {
        /**
         * Tratamento para envio de mensagem quando a empresa/fila está fora do expediente
         */
        const queue = await Queue.findByPk(ticket.queueId);

        if (settings?.scheduleType === "queue") {
          currentSchedule = await VerifyCurrentSchedule(companyId, queue.id, 0);
        }

        if (
          settings?.scheduleType === "queue" &&
          !isNil(currentSchedule) &&
          ticket.amountUsedBotQueues < whatsapp.maxUseBotQueues &&
          (!currentSchedule || currentSchedule.inActivity === false) &&
          !ticket.imported
        ) {
          if (Number(whatsapp.timeUseBotQueues) > 0) {
            if (
              ticket.isOutOfHour === false &&
              ticketTraking.chatbotAt !== null
            ) {
              await ticketTraking.update({
                chatbotAt: null
              });
              await ticket.update({
                amountUsedBotQueues: 0
              });
            }

            //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
            let dataLimite = new Date();
            let Agora = new Date();

            if (ticketTraking.chatbotAt !== null) {
              dataLimite.setMinutes(
                ticketTraking.chatbotAt.getMinutes() +
                Number(whatsapp.timeUseBotQueues)
              );

              if (
                ticketTraking.chatbotAt !== null &&
                Agora < dataLimite &&
                whatsapp.timeUseBotQueues !== "0" &&
                ticket.amountUsedBotQueues !== 0
              ) {
                return;
              }
            }

            await ticketTraking.update({
              chatbotAt: null
            });
          }

          const outOfHoursMessage = queue.outOfHoursMessage;

          if (outOfHoursMessage !== "") {
            // console.log("entrei2");
            const body = formatBody(`${outOfHoursMessage}`, ticket);

            const debouncedSentMessage = debounce(
              async () => {
                await wbot.sendMessage(
                  `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                  }`,
                  {
                    text: body
                  }
                );
              },
              1000,
              ticket.id
            );
            debouncedSentMessage();
          }
          //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
          await ticket.update({
            isOutOfHour: true,
            amountUsedBotQueues: ticket.amountUsedBotQueues + 1
          });
          return;
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }

    if (ticket.queue && ticket.queueId && !msg.key.fromMe) {
      if (!ticket.user || ticket.queue?.chatbots?.length > 0) {
        await sayChatbot(
          ticket.queueId,
          wbot,
          ticket,
          contact,
          msg,
          ticketTraking
        );
      }

      //atualiza mensagem para indicar que houve atividade e aí contar o tempo novamente para enviar mensagem de inatividade
      await ticket.update({
        sendInactiveMessage: false
      });
    }

    await ticket.reload();
  } catch (err) {
    Sentry.captureException(err);
    console.log(err);
    logger.error(`Error handling whatsapp message: Err: ${err}`);
  }
};
const handleMsgAck = async (
  msg: WAMessage,
  chat: number | null | undefined
) => {
  await new Promise(r => setTimeout(r, 500));
  const io = getIO();

  try {
    const messageToUpdate = await Message.findOne({
      where: {
        wid: msg.key.id
      },
      include: [
        "contact",
        {
          model: Ticket,
          as: "ticket",
          include: [
            {
              model: Contact,
              attributes: [
                "id",
                "name",
                "number",
                "email",
                "profilePicUrl",
                "acceptAudioMessage",
                "active",
                "urlPicture",
                "companyId"
              ],
              include: ["extraInfo", "tags"]
            },
            {
              model: Queue,
              attributes: ["id", "name", "color"]
            },
            {
              model: Whatsapp,
              attributes: ["id", "name", "groupAsTicket"]
            },
            {
              model: User,
              attributes: ["id", "name"]
            },
            {
              model: Tag,
              as: "tags",
              attributes: ["id", "name", "color"]
            }
          ]
        },
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });
    if (!messageToUpdate || messageToUpdate.ack > chat) return;

    await messageToUpdate.update({ ack: chat });
    io.of(messageToUpdate.companyId.toString())
      // .to(messageToUpdate.ticketId.toString())
      .emit(`company-${messageToUpdate.companyId}-appMessage`, {
        action: "update",
        message: messageToUpdate
      });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message ack. Err: ${err}`);
  }
};

const verifyRecentCampaign = async (
  message: proto.IWebMessageInfo,
  companyId: number
) => {
  if (!isValidMsg(message)) {
    return;
  }
  if (!message.key.fromMe) {
    const number = message.key.remoteJid.replace(/\D/g, "");
    const campaigns = await Campaign.findAll({
      where: { companyId, status: "EM_ANDAMENTO", confirmation: true }
    });
    if (campaigns) {
      const ids = campaigns.map(c => c.id);
      const campaignShipping = await CampaignShipping.findOne({
        where: {
          campaignId: { [Op.in]: ids },
          number,
          confirmation: null,
          deliveredAt: { [Op.ne]: null }
        }
      });

      if (campaignShipping) {
        await campaignShipping.update({
          confirmedAt: moment(),
          confirmation: true
        });
        await campaignQueue.add(
          "DispatchCampaign",
          {
            campaignShippingId: campaignShipping.id,
            campaignId: campaignShipping.campaignId
          },
          {
            delay: parseToMilliseconds(randomValue(0, 10))
          }
        );
      }
    }
  }
};

const processRecoveredMessageUpdate = async (
  messageUpdate: WAMessageUpdate,
  wbot: Session,
  companyId: number
): Promise<boolean> => {
  const recoveredContent = messageUpdate?.update?.message;

  if (!recoveredContent || !messageUpdate?.key?.id) {
    return false;
  }

  const recoveredMessage = {
    key: { ...messageUpdate.key },
    message: recoveredContent,
    messageTimestamp:
      (messageUpdate.update as any)?.messageTimestamp ||
      (messageUpdate as any)?.messageTimestamp ||
      Math.floor(Date.now() / 1000)
  } as proto.IWebMessageInfo;

  if (!isValidMsg(recoveredMessage)) {
    return false;
  }

  const messageExists = await Message.count({
    where: { wid: recoveredMessage.key.id, companyId }
  });

  if (messageExists) {
    return false;
  }

  let body = await getBodyMessage(recoveredMessage);
  let isCampaign = false;

  if (recoveredMessage.key.fromMe) {
    isCampaign = /\u200c/.test(body);
  } else {
    if (/\u200c/.test(body)) body = body.replace(/\u200c/, "");
    logger.debug(
      "[messages.update] Validacao de mensagem recuperada: " + body
    );
  }

  if (isCampaign) {
    return false;
  }

  logger.info(
    `[messages.update] Processando mensagem recuperada ${recoveredMessage.key.id}`
  );

  if (REDIS_URI_MSG_CONN !== "") {
    const queueJobId = `${wbot.id}-handleMessageUpdate-${recoveredMessage.key.id}-${Date.now()}`;
    await BullQueues.add(
      `${process.env.DB_NAME}-handleMessage`,
      { message: recoveredMessage, wbot: wbot.id, companyId },
      {
        priority: 1,
        jobId: queueJobId
      }
    );
  } else {
    await handleMessage(recoveredMessage, wbot, companyId);
  }

  return true;
};

const normalizeGroupCampaignKeyword = (value?: string | null): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const verifyGroupCampaignAutoResponse = async (
  message: proto.IWebMessageInfo,
  companyId: number,
  wbot: Session
) => {
  try {
    if (!isValidMsg(message) || message.key.fromMe) {
      return;
    }

    const groupJid = message.key.remoteJid;
    if (!groupJid?.endsWith("@g.us")) {
      return;
    }

    const participantJid = jidNormalizedUser(
      message.key.participantAlt || message.key.participant || ""
    );
    if (!participantJid || participantJid.endsWith("@g.us")) {
      return;
    }

    const inboundBodyRaw = getBodyMessage(message);
    const inboundBody = normalizeGroupCampaignKeyword(inboundBodyRaw);
    if (!inboundBody) {
      return;
    }

    const target = await GroupCampaignTarget.findOne({
      where: {
        companyId,
        groupJid,
        status: "SENT",
        sentAt: { [Op.ne]: null }
      },
      include: [
        {
          model: GroupCampaign,
          as: "campaign",
          required: true,
          where: {
            companyId,
            whatsappId: wbot.id,
            responseEnabled: true,
            responseKeyword: { [Op.ne]: null },
            responseMessage: { [Op.ne]: null },
            status: { [Op.in]: ["PROCESSING", "PAUSED", "SENT"] }
          }
        }
      ],
      order: [["sentAt", "DESC"], ["id", "DESC"]]
    });

    const campaign = target?.campaign as GroupCampaign | undefined;
    if (!campaign) {
      return;
    }

    const normalizedKeyword = normalizeGroupCampaignKeyword(
      campaign.responseKeyword
    );
    if (!normalizedKeyword) {
      return;
    }

    const hasKeywordMatch =
      inboundBody === normalizedKeyword ||
      inboundBody.includes(normalizedKeyword);
    if (!hasKeywordMatch) {
      return;
    }

    const msgContact = await getContactMessage(message, wbot);
    if (!msgContact) {
      return;
    }

    const contact = await verifyContact(msgContact, wbot, companyId, message);
    if (!contact?.remoteJid) {
      return;
    }

    const whatsapp = await ShowWhatsAppService(wbot.id!, companyId);
    const settings =
      (await CompaniesSettings.findOne({
        where: {
          companyId
        }
      })) || ({} as CompaniesSettings);

    const ticket = await FindOrCreateTicketService(
      contact,
      whatsapp,
      0,
      companyId,
      null,
      null,
      undefined,
      "whatsapp",
      false,
      false,
      settings,
      false,
      true
    );
    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      companyId
    });

    const replyBody = formatBody(String(campaign.responseMessage || ""), ticket);
    if (!replyBody.trim()) {
      return;
    }

    const sentMessage = await wbot.sendMessage(contact.remoteJid, {
      text: replyBody
    });
    await verifyMessage(sentMessage, ticket, contact, ticketTraking);

    await GroupCampaignLog.create({
      companyId,
      campaignId: campaign.id,
      type: "AUTO_RESPONSE_SENT",
      groupJid,
      message: `Resposta privada enviada para ${contact.name || contact.number}`,
      payload: {
        participantJid,
        keyword: campaign.responseKeyword,
        inboundBody: inboundBodyRaw,
        triggerMessageId: message.key.id
      }
    });
  } catch (err) {
    logger.error(
      `[GroupCampaignAutoResponse] Falha ao responder campanha de grupos: ${err?.message || err}`
    );
  }
};

const verifyCampaignMessageAndCloseTicket = async (
  message: proto.IWebMessageInfo,
  companyId: number,
  wbot: Session
) => {
  if (!isValidMsg(message)) {
    return;
  }

  const io = getIO();
  const body = await getBodyMessage(message);
  const isCampaign = /\u200c/.test(body);

  if (message.key.fromMe && isCampaign) {
    let msgContact: IMe;
    msgContact = await getContactMessage(message, wbot);
    const contact = await verifyContact(msgContact, wbot, companyId, message);

    const messageRecord = await Message.findOne({
      where: {
        [Op.or]: [{ wid: message.key.id! }, { contactId: contact.id }],
        companyId
      }
    });

    if (!isNil(messageRecord)) {
      const ticket = await Ticket.findByPk(messageRecord.ticketId);
      // Não fechar o ticket automaticamente aqui.
      // O status do ticket é gerenciado por handleDispatchCampaign em queues.ts
      // com base em campaign.statusTicket e campaign.openTicket.
      // Só emitir evento de exclusão se o ticket JÁ foi fechado intencionalmente.
      if (ticket && ticket.status === "closed") {
        io.of(String(companyId))
          .emit(`company-${companyId}-ticket`, {
            action: "delete",
            ticket,
            ticketId: ticket.id
          });

        io.of(String(companyId))
          .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket,
            ticketId: ticket.id
          });
      }
    }
  }
};

const filterMessages = (msg: WAMessage): boolean => {
  msgDB.save(msg);

  if (msg.message?.protocolMessage?.editedMessage) return true;
  if (msg.message?.protocolMessage) return false;

  if (
    [
      WAMessageStubType.REVOKE,
      WAMessageStubType.E2E_DEVICE_CHANGED,
      WAMessageStubType.E2E_IDENTITY_CHANGED,
      WAMessageStubType.CIPHERTEXT
    ].includes(msg.messageStubType)
  )
    return false;

  return true;
};

const whatsappDecryptDiagnosticsEnabled = (): boolean =>
  String(process.env.WHATSAPP_DECRYPT_DIAGNOSTICS || "").toLowerCase() ===
  "enabled";

const parseDiagnosticList = (value?: string): string[] =>
  String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

const getSafeMessageDiagnosticMeta = (
  msg: proto.IWebMessageInfo | WAMessageUpdate,
  companyId: number,
  whatsappId?: number | string,
  stage?: string
) => {
  const key = (msg as any)?.key || {};
  const message = (msg as any)?.message || (msg as any)?.update?.message;
  const update = (msg as any)?.update;

  return {
    stage,
    companyId,
    whatsappId,
    wid: key?.id,
    remoteJid: key?.remoteJid,
    remoteJidAlt: key?.remoteJidAlt,
    fromMe: key?.fromMe,
    participant: key?.participant,
    participantAlt: key?.participantAlt,
    addressingMode: key?.addressingMode,
    messageType: message ? getContentType(message) : undefined,
    messageStubType: (msg as any)?.messageStubType || update?.messageStubType,
    status: (msg as any)?.status || update?.status,
    timestamp: (msg as any)?.messageTimestamp || update?.messageTimestamp
  };
};

const shouldLogWhatsappDiagnostic = (
  msg: proto.IWebMessageInfo | WAMessageUpdate
): boolean => {
  if (!whatsappDecryptDiagnosticsEnabled()) return false;

  const key = (msg as any)?.key || {};
  const messageIds = parseDiagnosticList(process.env.WHATSAPP_DIAG_MESSAGE_IDS);
  const remoteJids = parseDiagnosticList(process.env.WHATSAPP_DIAG_REMOTE_JIDS);

  if (messageIds.length > 0 && !messageIds.includes(String(key?.id || ""))) {
    return false;
  }

  if (
    remoteJids.length > 0 &&
    !remoteJids.some(item =>
      [
        key?.remoteJid,
        key?.remoteJidAlt,
        key?.participant,
        key?.participantAlt
      ]
        .filter(Boolean)
        .map(String)
        .some(value => value.includes(item))
    )
  ) {
    return false;
  }

  return true;
};

const logWhatsappDiagnostic = (
  stage: string,
  msg: proto.IWebMessageInfo | WAMessageUpdate,
  companyId: number,
  whatsappId?: number | string,
  extra: Record<string, any> = {}
) => {
  if (!shouldLogWhatsappDiagnostic(msg)) return;

  logger.info(
    {
      ...getSafeMessageDiagnosticMeta(msg, companyId, whatsappId, stage),
      ...extra
    },
    "[WhatsAppDecryptDiagnostic] message metadata"
  );
};

const wbotMessageListener = (wbot: Session, companyId: number): void => {
  wbot.ev.on("messages.upsert", async (messageUpsert: ImessageUpsert) => {
    const rawMessages = messageUpsert.messages || [];

    rawMessages.forEach(message =>
      logWhatsappDiagnostic("messages.upsert.raw", message, companyId, wbot.id)
    );

    const messages = rawMessages.filter(filterMessages).map(msg => msg);

    messages.forEach(message =>
      logWhatsappDiagnostic("messages.upsert.filtered", message, companyId, wbot.id)
    );

    if (!messages) return;

    // console.log("CIAAAAAAA WBOT " , companyId)
    for (const message of messages) {
      try {
        // Ignorar mensagens de newsletter
        if (message.key.remoteJid.includes("newsletter")) {
          logger.info(`[newsletter] Ignorando mensagem de newsletter no listener: ${message.key.remoteJid}`);
          continue;
        }

        if (
          message?.messageStubParameters?.length &&
          message.messageStubParameters[0].includes("absent")
        ) {
          const msg = {
            companyId: companyId,
            whatsappId: wbot.id,
            message: message
          };
          logger.warn("MENSAGEM PERDIDA", JSON.stringify(msg));
        }
        const messageExists = await Message.count({
          where: { wid: message.key.id!, companyId }
        });

        logWhatsappDiagnostic(
          "messages.upsert.exists-check",
          message,
          companyId,
          wbot.id,
          { messageExists }
        );

        if (!messageExists) {
          let isCampaign = false;
          let body = await getBodyMessage(message);
          const fromMe = message?.key?.fromMe;
          if (fromMe) {
            isCampaign = /\u200c/.test(body);
          } else {
            if (/\u200c/.test(body)) body = body.replace(/\u200c/, "");
            logger.debug(
              "Validação de mensagem de campanha enviada por terceiros: " + body
            );
          }

          if (!isCampaign) {
            if (REDIS_URI_MSG_CONN !== "") {
              try {
                const queueJobId = `${wbot.id}-handleMessage-${message.key.id}-${Date.now()}`;
                await BullQueues.add(
                  `${process.env.DB_NAME}-handleMessage`,
                  { message, wbot: wbot.id, companyId },
                  {
                    priority: 1,
                    jobId: queueJobId
                  }
                );
                logWhatsappDiagnostic(
                  "messages.upsert.enqueued-handleMessage",
                  message,
                  companyId,
                  wbot.id,
                  { queueJobId }
                );
              } catch (e) {
                Sentry.captureException(e);
                logger.error(
                  `[messages.upsert] Falha ao enfileirar mensagem ${message?.key?.id}: ${e?.message || e}`
                );
              }
            } else {
              console.log("log... 3970");
              logWhatsappDiagnostic(
                "messages.upsert.direct-handleMessage",
                message,
                companyId,
                wbot.id
              );
              await handleMessage(message, wbot, companyId);
            }
          }

          await verifyGroupCampaignAutoResponse(message, companyId, wbot);
          await verifyRecentCampaign(message, companyId);
          await verifyCampaignMessageAndCloseTicket(message, companyId, wbot);
        }

        if (message.key.remoteJid?.endsWith("@g.us")) {
          if (REDIS_URI_MSG_CONN !== "") {
            BullQueues.add(
              `${process.env.DB_NAME}-handleMessageAck`,
              { msg: message, chat: 2 },
              {
                priority: 1,
                jobId: `${wbot.id}-handleMessageAck-${message.key.id}`
              }
            );
          } else {
            handleMsgAck(message, 2);
          }
        }
      } catch (err) {
        Sentry.captureException(err);
        logger.error(
          `[messages.upsert] Falha ao processar mensagem ${message?.key?.id}: ${err?.message || err}`
        );
      }
    }

    // messages.forEach(async (message: proto.IWebMessageInfo) => {
    //   const messageExists = await Message.count({
    //     where: { id: message.key.id!, companyId }
    //   });

    //   if (!messageExists) {
    //     await handleMessage(message, wbot, companyId);
    //     await verifyRecentCampaign(message, companyId);
    //     await verifyCampaignMessageAndCloseTicket(message, companyId);
    //   }
    // });
  });

  wbot.ev.on("messages.update", (messageUpdate: WAMessageUpdate[]) => {
    if (messageUpdate.length === 0) return;
    messageUpdate.forEach(async (message: WAMessageUpdate) => {
      logWhatsappDiagnostic("messages.update.raw", message, companyId, wbot.id);

      (wbot as WASocket)!.readMessages([message.key]);

      try {
        await processRecoveredMessageUpdate(message, wbot, companyId);
      } catch (error) {
        Sentry.captureException(error);
        logger.error(
          `[messages.update] Falha ao processar mensagem recuperada ${message?.key?.id}: ${error?.message || error}`
        );
      }

      const msgUp = { ...messageUpdate };

      if (
        msgUp["0"]?.update.messageStubType === 1 &&
        msgUp["0"]?.key.remoteJid !== "status@broadcast"
      ) {
        MarkDeleteWhatsAppMessage(
          msgUp["0"]?.key.remoteJid,
          null,
          msgUp["0"]?.key.id,
          companyId
        );
      }

      let ack;
      if (message.update.status === 3 && message?.key?.fromMe) {
        ack = 2;
      } else {
        ack = message.update.status;
      }

      if (REDIS_URI_MSG_CONN !== "") {
        BullQueues.add(
          `${process.env.DB_NAME}-handleMessageAck`,
          { msg: message, chat: ack },
          {
            priority: 1,
            jobId: `${wbot.id}-handleMessageAck-${message.key.id}`
          }
        );
      } else {
        handleMsgAck(message, ack);
      }
    });
  });

  // wbot.ev.on('message-receipt.update', (events: any) => {
  //   events.forEach(async (msg: any) => {
  //     const ack = msg?.receipt?.receiptTimestamp ? 3 : msg?.receipt?.readTimestamp ? 4 : 0;
  //     if (!ack) return;
  //     await handleMsgAck(msg, ack);
  //   });
  // })
  // wbot.ev.on("presence.update", (events: any) => {
  //   console.log(events)
  // })

  wbot.ev.on("contacts.update", (contacts: any) => {
    contacts.forEach(async (contact: any) => {
      if (!contact?.id) return;

      const newUrl =
        typeof contact.imgUrl === "undefined"
          ? undefined
          : contact.imgUrl === ""
            ? ""
            : await wbot!.profilePictureUrl(contact.id!).catch(() => null);

        let contactRemoteJid = contact.id;
        let contactNumber = "";

        const normalizedRemoteJidAlt = normalizePhoneNumber(contact.remoteJidAlt);

        if (normalizedRemoteJidAlt) {
          contactRemoteJid = `${normalizedRemoteJidAlt}@s.whatsapp.net`;
          contactNumber = normalizedRemoteJidAlt;
          logger.info(`[contacts.update] Using validated remoteJidAlt: ${contactRemoteJid}`);
        }
        else if (contact.remoteJidAlt) {
          logger.warn(`[contacts.update] Ignoring invalid remoteJidAlt: ${contact.remoteJidAlt}`);
        }

        if (!contactNumber && contact.id.includes("@lid")) {
          logger.warn(`⚠️ Contato com LID detectado: ${contact.id}`);

          // Buscar contato existente no banco pelo LID
          const existingContact = await Contact.findOne({
            where: {
              companyId: companyId,
              remoteJid: contact.id
            }
          });

          if (existingContact && existingContact.number && existingContact.number.length <= 15) {
            // ✅ Recuperar número real do banco
            contactNumber = existingContact.number;
            contactRemoteJid = `${contactNumber}@s.whatsapp.net`;
            logger.info(`✅ Número recuperado do banco: ${contactNumber}`);
          } else {
            // ❌ Não conseguiu encontrar número real, IGNORAR atualização
            logger.error(`❌ Não foi possível encontrar número real para LID: ${contact.id}`);
            return; // ✅ NÃO SALVAR contatos com LID
          }
        }
        // ✅ Se for @s.whatsapp.net, extrair número
        else if (!contactNumber) {
          contactNumber = contact.id.replace(/\D/g, "");
        }

        // ✅ Normalizar e validar número brasileiro (sempre 55 + DDD + número)
        const normalizedNumber = normalizePhoneNumber(contactNumber);
        if (!normalizedNumber) {
          logger.error(`❌ Número inválido, ignorando: ${contactNumber}`);
          return;
        }

        contactNumber = normalizedNumber;
        contactRemoteJid = `${contactNumber}@s.whatsapp.net`;

        const resolvedName = resolveWhatsAppContactName(contact, contact.id);

        const contactData = {
          name: resolvedName || contactNumber,
          number: contactNumber,
          isGroup: contactRemoteJid.includes("@g.us") ? true : false,
          companyId: companyId,
          remoteJid: contact.id,
          remoteJidAlt: contact.remoteJidAlt || contactRemoteJid,
          profilePicUrl: newUrl,
          whatsappId: wbot.id,
          wbot: wbot,
          msgBody: "" // contacts.update não possui mensagem
        };

        logger.info("✅ Atualizando contato:", {
          name: contactData.name,
          number: contactData.number,
          remoteJid: contactData.remoteJid
        });

        const updatedContact = await CreateOrUpdateContactService(contactData);

        // 📱 Verificar se deve salvar no celular após atualizar contato
        if (!contactData.isGroup && updatedContact) {
          try {
            const shouldSave = await ShouldSaveToPhone({
              contact: updatedContact,
              messageBody: "",
              companyId
            });

            if (shouldSave && !updatedContact.savedToPhone) {
              logger.info(`📱 Salvando contato ${updatedContact.id} no celular automaticamente`);
              await SaveContactToPhone({
                contact: updatedContact,
                whatsappId: wbot.id,
                companyId
              });
            }
          } catch (saveError) {
            logger.warn(`Erro ao verificar salvamento no celular: ${saveError.message}`);
          }
        }
    });
  });

  wbot.ev.on("groups.update", async (groupUpdate: GroupMetadata[]) => {
    if (!groupUpdate || groupUpdate.length === 0 || !groupUpdate[0]?.id) return;

    await Promise.all(groupUpdate.map(async (group: GroupMetadata) => {
      const number = group.id.split("@")[0] || group.id.replace(/\D/g, "");
      const nameGroup = group.subject || number;

      let profilePicUrl: string = "";
      try {
        const picPromise = wbot.profilePictureUrl(group.id, "image");
        const picTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("profilePictureUrl timeout")), 3000)
        );
        profilePicUrl = await Promise.race([picPromise, picTimeout]);
      } catch (e) {
        profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
      }

      const contactData = {
        name: nameGroup,
        number,
        isGroup: true,
        companyId,
        remoteJid: group.id,
        profilePicUrl,
        whatsappId: wbot.id,
        wbot,
        msgBody: ""
      };

      try {
        await CreateOrUpdateContactService(contactData);
        // Atualiza o cache do grupo com nome e foto novos
        const groupCacheKey = `groupMeta:${group.id}:${companyId}`;
        await cacheLayer.set(groupCacheKey, JSON.stringify({ id: group.id, subject: nameGroup }), "EX", 300);
      } catch (err) {
        logger.warn(`[Groups] Falha ao atualizar contato do grupo ${group.id}: ${err?.message}`);
      }
    }));
  });
};

export {
  wbotMessageListener,
  handleMessage,
  isValidMsg,
  getTypeMessage,
  handleMsgAck
};
