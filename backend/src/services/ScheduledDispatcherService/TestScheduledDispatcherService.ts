import moment from "moment-timezone";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import CrmClient from "../../models/CrmClient";
import FinanceiroFatura from "../../models/FinanceiroFatura";
import Whatsapp from "../../models/Whatsapp";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CheckContactNumber from "../WbotServices/CheckNumber";
import { resolveDispatchWhatsapp } from "../ChipServices/ChipRoutingService";
import { buildVariables } from "./DispatchSchedulerService";
import { executeScheduledDispatchDelivery } from "./DispatchProcessorService";
import { getBrazilianPhoneVariants } from "../../helpers/normalizeContactNumber";
import logger from "../../utils/logger";

const TZ = process.env.TZ || "America/Sao_Paulo";
const OPEN_INVOICE_STATUS = ["aberta", "vencida"];

const normalizePhone = (value: string) => String(value || "").replace(/\D/g, "");

const findExistingClient = async (
  companyId: number,
  contact: Contact
): Promise<CrmClient | null> => {
  return CrmClient.findOne({
    where: {
      companyId,
      contactId: contact.id,
      status: "active"
    },
    order: [["updatedAt", "DESC"]]
  });
};

const findContextInvoice = async ({
  companyId,
  client,
  eventType,
  daysBeforeDue,
  daysAfterDue
}: {
  companyId: number;
  client: CrmClient | null;
  eventType?: string;
  daysBeforeDue?: number | null;
  daysAfterDue?: number | null;
}): Promise<FinanceiroFatura | null> => {
  if (!client?.id) return null;

  const now = moment().tz(TZ);
  const where: Record<string, any> = {
    companyId,
    clientId: client.id,
    status: { [Op.in]: OPEN_INVOICE_STATUS }
  };

  if (eventType === "invoice_reminder") {
    where.dataVencimento = now
      .clone()
      .add(Number(daysBeforeDue || 0), "days")
      .format("YYYY-MM-DD");
  } else if (eventType === "invoice_overdue") {
    where.dataVencimento = {
      [Op.lte]: now
        .clone()
        .subtract(Number(daysAfterDue || 0), "days")
        .format("YYYY-MM-DD")
    };
  } else {
    where.dataVencimento = { [Op.gte]: now.clone().format("YYYY-MM-DD") };
  }

  return FinanceiroFatura.findOne({
    where,
    order: [["dataVencimento", eventType === "invoice_overdue" ? "DESC" : "ASC"]]
  });
};

interface TestScheduledDispatcherPayload {
  companyId: number;
  targetNumber: string;
  title?: string;
  messageTemplate?: string;
  eventType?: string;
  whatsappId?: number | null;
  dispatchMode?: "fixed" | "round_robin";
  chipIds?: number[];
  rotationCursor?: number;
  daysBeforeDue?: number | null;
  daysAfterDue?: number | null;
  mediaUrl?: string | null;
  mediaCaption?: string | null;
}

const TestScheduledDispatcherService = async ({
  companyId,
  targetNumber,
  title = "Teste de automacao",
  messageTemplate = "",
  eventType = "birthday",
  whatsappId = null,
  dispatchMode = "fixed",
  chipIds = [],
  rotationCursor = 0,
  daysBeforeDue = null,
  daysAfterDue = null,
  mediaUrl = null,
  mediaCaption = null
}: TestScheduledDispatcherPayload) => {
  const normalizedNumber = normalizePhone(targetNumber);
  if (!normalizedNumber || normalizedNumber.length < 10 || normalizedNumber.length > 15) {
    throw new Error("INVALID_TARGET_NUMBER");
  }

  if (!messageTemplate.trim() && !mediaUrl) {
    throw new Error("EMPTY_MESSAGE");
  }

  // Resolve WhatsApp routing early — needed for canonical number validation
  const routing = await resolveDispatchWhatsapp({
    companyId,
    dispatchMode,
    chipIds,
    fallbackWhatsappId: whatsappId,
    rotationCursor
  });

  if (!routing.whatsappId) {
    throw new Error("WHATSAPP_NOT_FOUND");
  }

  const whatsapp = await Whatsapp.findByPk(routing.whatsappId);
  if (!whatsapp) {
    throw new Error("WHATSAPP_NOT_FOUND");
  }

  // Obter número canônico do WhatsApp (resolve automaticamente com/sem nono dígito)
  let canonicalNumber = normalizedNumber;
  let remoteJid = `${normalizedNumber}@s.whatsapp.net`;
  try {
    const checkedNumber = await CheckContactNumber(normalizedNumber, companyId, false, routing.whatsappId);
    if (checkedNumber) {
      canonicalNumber = checkedNumber;
      remoteJid = `${canonicalNumber}@s.whatsapp.net`;
    }
  } catch (err: any) {
    logger.warn(`[TestDispatcher] Numero nao validado no WhatsApp ${normalizedNumber}: ${err?.message}`);
  }

  // Buscar contato existente com variantes do nono dígito antes de criar
  const numberVariants = getBrazilianPhoneVariants(canonicalNumber);
  let contact = await Contact.findOne({
    where: { companyId, number: { [Op.in]: numberVariants } }
  });

  if (!contact) {
    contact = await CreateOrUpdateContactService({
      name: `Teste ${canonicalNumber}`,
      number: canonicalNumber,
      isGroup: false,
      companyId,
      remoteJid
    });
  }

  const client = await findExistingClient(companyId, contact);
  const invoice = await findContextInvoice({
    companyId,
    client,
    eventType,
    daysBeforeDue,
    daysAfterDue
  });

  const dispatcherLike = {
    title,
    eventType,
    daysBeforeDue,
    daysAfterDue
  } as any;

  const variables = buildVariables(
    dispatcherLike,
    contact,
    invoice ? { invoice } : undefined,
    client
  );

  const { ticket } = await executeScheduledDispatchDelivery({
    contact,
    whatsapp,
    companyId,
    template: messageTemplate,
    variables,
    mediaUrl,
    mediaCaption
  });

  return {
    contactId: contact.id,
    ticketId: ticket.id,
    whatsappId: whatsapp.id
  };
};

export default TestScheduledDispatcherService;
