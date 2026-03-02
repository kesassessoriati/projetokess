import * as Yup from "yup";
import AppError from "../../errors/AppError";
import CrmLead from "../../models/CrmLead";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { Op } from "sequelize";
import syncLeadToClient from "./helpers/syncLeadToClient";
import { dispatch as webhookDispatch } from "../WebhookDispatch/WebhookDispatchService";

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
  gmn?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
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
    status: Yup.string()
      .oneOf(["novo", "contactado", "qualificado", "reuniao_agendada", "nao_qualificado", "convertido", "perdido"])
      .default("novo"),
    leadStatus: Yup.string().default("novo").nullable(),
    score: Yup.number().min(0).default(0),
    temperature: Yup.string().oneOf([null, "frio", "morno", "quente"]).nullable(),
    contactId: Yup.number().nullable(),
    primaryTicketId: Yup.number().nullable()
  });

  // Mapeamento retroativo de status
  if (data.status === "new") data.status = "novo";
  if (data.status === "won") data.status = "convertido";
  if (data.status === "lost") data.status = "perdido";

  if (data.leadStatus === "new") data.leadStatus = "novo";
  if (data.leadStatus === "won") data.leadStatus = "convertido";
  if (data.leadStatus === "lost") data.leadStatus = "perdido";

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

  const contactId = await resolveContactId(
    data.companyId,
    data.contactId,
    data.phone
  );

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

  let meetingScheduledAt = undefined;
  if (enrichedData.status === "reuniao_agendada" || (data.leadStatus && data.leadStatus === "reuniao_agendada")) {
    meetingScheduledAt = new Date();
  }

  const lead = await CrmLead.create({
    ...enrichedData,
    contactId,
    primaryTicketId,
    leadStatus: data.leadStatus || "novo",
    score,
    notes,
    lastActivityAt: data.lastActivityAt || new Date(),
    pipelineId,
    stageId,
    meetingScheduledAt
  });

  if (lead.status === "convertido" || lead.leadStatus === "convertido") {
    await syncLeadToClient(lead);
  }

  // Create Opportunity if pipeline info is given
  if (pipelineId && stageId) {
    const Opportunity = (await import("../../models/Opportunity")).default;
    const oppData: any = {
      companyId: data.companyId,
      pipelineId,
      stageId,
      title: data.name,
      value: 0,
      assignedUserId: data.ownerUserId || null,
      status: "OPEN",
      leadId: lead.id
    };
    // Só inclui contactId se existir; evita NOT NULL violation em bancos não migrados
    if (contactId) {
      oppData.contactId = contactId;
    }
    await Opportunity.create(oppData);
  }

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

  return lead;
};

export default CreateCrmLeadService;
