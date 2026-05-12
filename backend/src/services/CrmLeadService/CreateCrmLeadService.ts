import * as Yup from "yup";
import AppError from "../../errors/AppError";
import CrmLead from "../../models/CrmLead";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { Op } from "sequelize";
import syncLeadToClient from "./helpers/syncLeadToClient";
import { syncCrmLeadTags } from "./helpers/syncCrmLeadTags";
import { dispatch as webhookDispatch } from "../WebhookDispatch/WebhookDispatchService";
import { dispatchFlowTrigger } from "../FlowBuilderService/FlowTriggerDispatchService";
import CheckContactNumber from "../WbotServices/CheckNumber";
import logger from "../../utils/logger";
import serializeCrmLead from "./helpers/serializeCrmLead";

interface Request {
  companyId: number;
  name: string;
  email?: string;
  phone?: string;
  birthDate?: Date;
  document?: string;
  companyName?: string;
  position?: string;
  decisionMakerName?: string;
  decisionMakerPhone?: string;
  cnpj?: string;
  address?: string;
  product?: string;
  paymentType?: string;
  purchaseType?: string;
  purchaseValue?: number;
  gmn?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  sessionid?: string;
  source?: string;
  campaign?: string;
  medium?: string;
  status?: string;
  leadStatus?: string;
  score?: number;
  temperature?: string;
  ownerUserId?: number;
  notes?: string;
  lastActivityAt?: Date;
  contactId?: number;
  primaryTicketId?: number;
  // **METADADOS: Enviados via adMetadata para processar**
  adMetadata?: {
    platform: string;
    adTitle: string;
    adDescription: string;
    trackingUrl: string;
    trackingId: string;
  };
  pipelineId?: number;
  stageId?: number;
  tags?: any[];
  cardColor?: string;
  clientSince?: Date;
  acquisitionDate?: Date;
  expirationDate?: Date;
}

const normalizeNumber = (phone?: string): string | null => {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");

  // Remove leading zeros that some users type (e.g. 011999999999)
  digits = digits.replace(/^0+/, "");

  if (digits.length === 10 || digits.length === 11) {
    return digits.startsWith("55") ? digits : `55${digits}`;
  }

  return digits || null;
};

const sanitizeDigits = (value?: string): string => (value || "").replace(/\D/g, "");

const resolveContactId = async (
  companyId: number,
  providedContactId?: number,
  phone?: string
): Promise<number | undefined> => {
  if (providedContactId) {
    const contact = await Contact.findOne({
      where: { id: providedContactId, companyId }
    });

    if (!contact) {
      throw new AppError("Contato informado não encontrado para esta empresa.");
    }

    return contact.id;
  }

  const normalizedPhone = normalizeNumber(phone);

  if (!normalizedPhone) {
    return undefined;
  }

  const contact =
    (await Contact.findOne({
      where: {
        companyId,
        number: normalizedPhone
      }
    })) ||
    (await Contact.findOne({
      where: {
        companyId,
        number: normalizedPhone.replace(/^55/, "")
      }
    }));

  return contact?.id;
};

/**
 * Valida o número no WhatsApp e cria o contato se ainda não existir.
 * Retorna o id do contato criado/encontrado, ou undefined se o número não for válido.
 */
const syncLeadPhoneToContact = async (
  companyId: number,
  name: string,
  phone: string,
  email?: string
): Promise<number | undefined> => {
  try {
    const validatedNumber = await CheckContactNumber(phone, companyId);
    if (!validatedNumber) return undefined;

    const [contact] = await Contact.findOrCreate({
      where: { number: validatedNumber, companyId },
      defaults: {
        name: name || validatedNumber,
        number: validatedNumber,
        email: email || "",
        isGroup: false,
        companyId,
        channel: "whatsapp",
        profilePicUrl: "",
        acceptAudioMessage: true,
        active: true
      }
    });

    return contact.id;
  } catch (err) {
    logger.warn(`[CreateCrmLead] Não foi possível sincronizar contato para ${phone}: ${err}`);
    return undefined;
  }
};

const resolvePrimaryTicketId = async (
  companyId: number,
  primaryTicketId?: number
): Promise<number | undefined> => {
  if (!primaryTicketId) return undefined;

  const ticket = await Ticket.findOne({
    where: { id: primaryTicketId, companyId }
  });

  if (!ticket) {
    throw new AppError("Ticket informado não encontrado para esta empresa.");
  }

  return ticket.id;
};

const CreateCrmLeadService = async (data: Request): Promise<CrmLead> => {
  const schema = Yup.object().shape({
    companyId: Yup.number().required(),
    name: Yup.string().required(),
    email: Yup.string()
      .transform(v => (!v || String(v).trim() === "" ? null : String(v).trim()))
      .nullable(),
    phone: Yup.string()
      .transform(v => (!v || String(v).trim() === "" ? null : String(v).trim()))
      .nullable(),
    document: Yup.string()
      .transform(v => {
        const digits = sanitizeDigits(v);
        return digits === "" ? null : digits;
      })
      .test("document-length", "Documento deve ter 11 ou 14 dígitos.", value => !value || value.length === 11 || value.length === 14)
      .nullable(),
    birthDate: Yup.date().nullable(),
    clientSince: Yup.date().nullable(),
    expirationDate: Yup.date().nullable(),
    address: Yup.string()
      .transform(v => (!v || String(v).trim() === "" ? null : String(v).trim()))
      .nullable(),
    product: Yup.string()
      .transform(v => (!v || String(v).trim() === "" ? null : String(v).trim()))
      .nullable(),
    status: Yup.string()
      .oneOf(["novo", "contactado", "qualificado", "reuniao_agendada", "nao_qualificado", "convertido", "perdido"])
      .default("novo"),
    leadStatus: Yup.string().default("novo").nullable(),
    score: Yup.number().min(0).default(0),
    temperature: Yup.string().oneOf([null, "frio", "morno", "quente"]).nullable(),
    contactId: Yup.number().nullable(),
    primaryTicketId: Yup.number().nullable(),
    cardColor: Yup.string().nullable()
  });

  // Mapeamento retroativo de status
  if (data.status === "new") data.status = "novo";
  if (data.status === "won") data.status = "convertido";
  if (data.status === "lost") data.status = "perdido";

  if (data.leadStatus === "new") data.leadStatus = "novo";
  if (data.leadStatus === "won") data.leadStatus = "convertido";
  if (data.leadStatus === "lost") data.leadStatus = "perdido";

  data.document = sanitizeDigits(data.document || data.cnpj);
  data.address = data.address?.trim();
  data.product = data.product?.trim();
  data.cnpj = data.document && data.document.length === 14 ? data.document : "";

  await schema.validate(data);

  if (data.email && data.email.trim() !== "") {
    const existingLead = await CrmLead.findOne({
      where: {
        companyId: data.companyId,
        email: data.email.trim()
      }
    });

    if (existingLead) {
      // Retorna o lead existente ao invés de bloquear
      return existingLead;
    }
  }

  let contactId = await resolveContactId(
    data.companyId,
    data.contactId,
    data.phone
  );

  // Se não encontrou contato existente mas tem telefone, tenta validar no WhatsApp e criar o contato
  if (!contactId && data.phone) {
    contactId = await syncLeadPhoneToContact(
      data.companyId,
      data.name,
      data.phone,
      data.email
    );
  }

  if (contactId) {
    const existingLeadByContact = await CrmLead.findOne({
      where: {
        companyId: data.companyId,
        contactId
      }
    });

    if (existingLeadByContact) {
      // Retorna o lead existente ao invés de bloquear
      return existingLeadByContact;
    }
  } else if (data.phone) {
    const normPhone = normalizeNumber(data.phone) || data.phone;

    const existingLeadByPhone = await CrmLead.findOne({
      where: {
        companyId: data.companyId,
        [Op.or]: [
          { phone: normPhone },
          { phone: data.phone },
          { phone: normPhone.replace(/^55/, "") }
        ]
      }
    });

    if (existingLeadByPhone) {
      // Retorna o lead existente ao invés de bloquear
      return existingLeadByPhone;
    }
  }

  const primaryTicketId = await resolvePrimaryTicketId(
    data.companyId,
    data.primaryTicketId
  );

  // **ENRIQUECIMENTO: Usa campos existentes com metadados de anúncios**
  let enrichedData = { ...data };
  let score = data.score || 0;
  let notes = data.notes || "";

  // **GARANTE CAMPOS SOURCE/CAMPAIGN/MEDIUM SEJAM PREENCHIDOS**
  if (!enrichedData.source || enrichedData.source === '') {
    enrichedData.source = data.adMetadata?.platform || 'Facebook/Instagram Ads';
  }

  if (!enrichedData.campaign || enrichedData.campaign === '') {
    enrichedData.campaign = data.adMetadata?.adTitle || 'Anúncio Patrocinado';
  }

  if (!enrichedData.medium || enrichedData.medium === '') {
    enrichedData.medium = 'paid_social';
  }

  if (data.adMetadata) {
    // Aumenta score baseado na qualidade do anúncio
    if (data.adMetadata.adTitle && data.adMetadata.adDescription) {
      score = Math.min(score + 20, 100);
    }

    // Força sobreescrever com dados do anúncio se existirem
    if (data.adMetadata.platform) {
      enrichedData.source = data.adMetadata.platform;
    }
    if (data.adMetadata.adTitle) {
      enrichedData.campaign = data.adMetadata.adTitle;
    }

    // Adiciona insights aos notes (campo existente)
    const insights = `\n\n📊 Insights do Anúncio:\n` +
      `• Plataforma: ${data.adMetadata.platform}\n` +
      `• Título: ${data.adMetadata.adTitle}\n` +
      `• Descrição: ${data.adMetadata.adDescription}\n` +
      `• Tracking: ${data.adMetadata.trackingUrl}\n` +
      `• Tracking ID: ${data.adMetadata.trackingId}`;
    notes = notes + insights;
  }

  let { pipelineId, stageId } = data;

  if (!pipelineId || !stageId) {
    const Pipeline = (await import("../../models/Pipeline")).default;
    const PipelineStage = (await import("../../models/PipelineStage")).default;

    const activePipeline = await Pipeline.findOne({
      where: { companyId: data.companyId, isActive: true },
      include: [{ model: PipelineStage, as: "stages" }],
      order: [
        ["isDefault", "DESC"],
        ["id", "ASC"],
        [{ model: PipelineStage, as: "stages" }, "order", "ASC"]
      ]
    });

    if (activePipeline && activePipeline.stages && activePipeline.stages.length > 0) {
      pipelineId = activePipeline.id;
      stageId = activePipeline.stages[0].id;
    }
  }

  // If the target stage has a linkedStatus and no explicit status was provided by caller,
  // use the stage's linked status so imports/automations into advanced stages are consistent.
  let resolvedStatus = enrichedData.status || "novo";
  if (stageId && (!data.status || data.status === "novo" || data.status === "new")) {
    try {
      const PipelineStageModel = (await import("../../models/PipelineStage")).default;
      const targetStage = await PipelineStageModel.findOne({ where: { id: stageId } });
      if (targetStage?.linkedStatus) {
        resolvedStatus = targetStage.linkedStatus;
      }
    } catch (_) { /* non-critical — fallback to "novo" */ }
  }

  let meetingScheduledAt = undefined;
  if (resolvedStatus === "reuniao_agendada" || (data.leadStatus && data.leadStatus === "reuniao_agendada")) {
    meetingScheduledAt = new Date();
  }

  const lead = await CrmLead.create({
    ...enrichedData,
    status: resolvedStatus,
    contactId,
    primaryTicketId,
    leadStatus: data.leadStatus || resolvedStatus,
    score,
    notes,
    lastActivityAt: data.lastActivityAt || new Date(),
    pipelineId,
    stageId,
    meetingScheduledAt
  });

  if (data.tags && data.tags.length > 0) {
    await syncCrmLeadTags(lead.id, data.companyId, data.tags);
  }

  if (lead.status === "convertido" || lead.leadStatus === "convertido") {
    await syncLeadToClient(lead);
  }

  // Create Opportunity if pipeline info is given
  if (pipelineId && stageId) {
    const { default: CreateOpportunityService } = await import("../OpportunityServices/CreateOpportunityService");
    const oppData: any = {
      companyId: data.companyId,
      pipelineId,
      stageId,
      title: data.name,
      value: data.purchaseValue != null ? Number(data.purchaseValue) : 0,
      assignedUserId: data.ownerUserId || null,
      leadId: lead.id
    };
    // Só inclui contactId se existir; evita NOT NULL violation em bancos não migrados
    if (contactId) {
      oppData.contactId = contactId;
    }
    await CreateOpportunityService(oppData);
  }

  const { getIO } = await import("../../libs/socket");
  const io = getIO();
  io.to(data.companyId.toString()).emit(`company-${data.companyId}-lead`, {
    action: "create",
    lead: serializeCrmLead(lead)
  });

  webhookDispatch("LEAD_CREATED", data.companyId, {
    lead: {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      leadStatus: lead.leadStatus,
      source: lead.source,
      pipelineId: lead.pipelineId,
      stageId: lead.stageId,
      ownerUserId: lead.ownerUserId
    }
  });

  // Dispatch flow triggers for lead_created event (fire-and-forget)
  dispatchFlowTrigger("lead_created", data.companyId, {
    contactNumber: lead.phone || "",
    contactName: lead.name || "",
    metadata: { leadId: lead.id, pipelineId: lead.pipelineId, stageId: lead.stageId }
  }).catch(() => null);

  return lead;
};

export default CreateCrmLeadService;
