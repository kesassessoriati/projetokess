import moment from "moment-timezone";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import CrmClient from "../../models/CrmClient";
import FinanceiroFatura from "../../models/FinanceiroFatura";
import Whatsapp from "../../models/Whatsapp";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import { resolveDispatchWhatsapp } from "../ChipServices/ChipRoutingService";
import { buildVariables } from "./DispatchSchedulerService";
import { executeScheduledDispatchDelivery } from "./DispatchProcessorService";

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

  const contact = await CreateOrUpdateContactService({
    name: `Teste ${normalizedNumber}`,
    number: normalizedNumber,
    isGroup: false,
    companyId,
    remoteJid: `${normalizedNumber}@s.whatsapp.net`
  });

  const client = await findExistingClient(companyId, contact);
  const invoice = await findContextInvoice({
    companyId,
    client,
    eventType,
    daysBeforeDue,
    daysAfterDue
  });

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
