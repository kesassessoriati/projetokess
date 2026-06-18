import { Op } from "sequelize";
import * as Yup from "yup";
import AppError from "../../errors/AppError";
import CrmLead from "../../models/CrmLead";
import syncLeadToClient from "./helpers/syncLeadToClient";
import { syncCrmLeadTags } from "./helpers/syncCrmLeadTags";
import SyncTagsService from "../TagServices/SyncTagsService";
import {
  resolveLeadContactId,
  resolveLeadPrimaryTicketId
} from "./helpers/resolveLeadRelations";
import { dispatch as webhookDispatch } from "../WebhookDispatch/WebhookDispatchService";
import { dispatchFlowTrigger } from "../FlowBuilderService/FlowTriggerDispatchService";

interface Request {
  id: number | string;
  companyId: number;
  name?: string;
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
  followUp?: string;
  followUp2?: string;
  follow_up?: string;
  follow_up2?: string;
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
  pipelineId?: number;
  stageId?: number;
  tags?: any[];
  contactTags?: any[];
  cardColor?: string;
  clientSince?: Date;
  acquisitionDate?: Date;
  expirationDate?: Date;
}

const sanitizeDigits = (value?: string): string => (value || "").replace(/\D/g, "");
const validTemperatures = ["frio", "morno", "quente"];

const normalizeLeadTemperature = (value?: string | null): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value || "").trim().toLowerCase();
  return validTemperatures.includes(normalized) ? normalized : null;
};

const UpdateCrmLeadService = async ({
  id,
  companyId,
  ...data
}: Request): Promise<CrmLead> => {
  const lead = await CrmLead.findOne({
    where: { id, companyId }
  });

  if (!lead) {
    throw new AppError("Lead não encontrado.", 404);
  }

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    email: Yup.string().email().nullable(),
    phone: Yup.string().nullable(),
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
      .oneOf(["novo", "contactado", "qualificado", "reuniao_agendada", "nao_qualificado", "convertido", "perdido", "follow_up", "follow_up_enviado"])
      .nullable(),
    leadStatus: Yup.string().nullable(),
    score: Yup.number().min(0).nullable(),
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

  data.followUp = data.followUp ?? data.follow_up;
  data.followUp2 = data.followUp2 ?? data.follow_up2;
  delete data.follow_up;
  delete data.follow_up2;

  if (data.document !== undefined || data.cnpj !== undefined) {
    data.document = sanitizeDigits(data.document || data.cnpj);
    data.cnpj = data.document && data.document.length === 14 ? data.document : "";
  }

  if (data.product !== undefined) {
    data.product = data.product?.trim() || "";
  }

  if (data.address !== undefined) {
    data.address = data.address?.trim() || "";
  }

  data.temperature = normalizeLeadTemperature(data.temperature);
  const contactTags = data.contactTags;
  delete data.contactTags;

  await schema.validate(data);

  if (data.email) {
    const existingLead = await CrmLead.findOne({
      where: {
        companyId,
        email: data.email,
        id: { [Op.ne]: id }
      }
    });

    if (existingLead) {
      throw new AppError("Outro lead já usa esse e-mail nesta empresa.");
    }
  }

  const previousStatus = lead.status;
  const previousLeadStatus = lead.leadStatus;
  const previousPipelineId = lead.pipelineId;
  const previousStageId = lead.stageId;

  const contactId = await resolveLeadContactId({
    companyId,
    providedContactId: data.contactId,
    phone: data.phone,
    currentContactId: lead.contactId
  });

  const primaryTicketId = await resolveLeadPrimaryTicketId({
    companyId,
    providedPrimaryTicketId: data.primaryTicketId,
    currentPrimaryTicketId: lead.primaryTicketId
  });

  let meetingScheduledAt = lead.meetingScheduledAt;
  if (data.status === "reuniao_agendada" && previousStatus !== "reuniao_agendada") {
    meetingScheduledAt = new Date();
  } else if (data.leadStatus === "reuniao_agendada" && previousLeadStatus !== "reuniao_agendada") {
    meetingScheduledAt = new Date();
  }

  const isConvertingToClient =
    (data.status === "convertido" && previousStatus !== "convertido") ||
    (data.leadStatus === "convertido" && previousLeadStatus !== "convertido");

  if (isConvertingToClient) {
    const conversionDate = new Date();
    data.clientSince = conversionDate;
    data.acquisitionDate = conversionDate;
  }

  const resolvedLeadStatus = data.leadStatus ?? data.status ?? lead.leadStatus;

  await lead.update({
    ...data,
    contactId,
    primaryTicketId,
    leadStatus: resolvedLeadStatus,
    lastActivityAt: data.lastActivityAt || lead.lastActivityAt,
    meetingScheduledAt
  });

  if (data.tags !== undefined) {
    await syncCrmLeadTags(lead.id, companyId, data.tags);
  }

  if (contactTags !== undefined && contactId) {
    await SyncTagsService({
      tags: Array.isArray(contactTags) ? contactTags : [],
      contactId,
      companyId
    });
  }

  const shouldSyncByStatus =
    data.status === "convertido" && previousStatus !== "convertido";
  const shouldSyncByLeadStatus =
    data.leadStatus === "convertido" && previousLeadStatus !== "convertido";

  if (shouldSyncByStatus || shouldSyncByLeadStatus) {
    await syncLeadToClient(lead);
  }

  const { getIO } = await import("../../libs/socket");
  const io = getIO();

  // Update existing Opportunity if pipeline or owner changed
  const Opportunity = (await import("../../models/Opportunity")).default;
  const opp = await Opportunity.findOne({
    where: { leadId: lead.id, companyId },
    order: [["updatedAt", "DESC"]]
  });

  const targetPipelineId = data.pipelineId !== undefined ? data.pipelineId : lead.pipelineId;
  const targetStageId = data.stageId !== undefined ? data.stageId : lead.stageId;
  const isReactivatingLead =
    (previousStatus === "convertido" || previousStatus === "perdido" || previousLeadStatus === "convertido" || previousLeadStatus === "perdido") &&
    ((lead.status !== "convertido" && lead.status !== "perdido") || (lead.leadStatus !== "convertido" && lead.leadStatus !== "perdido")) &&
    targetPipelineId &&
    targetStageId;

  if (opp) {
    const oppUpdates: any = {};
    if (data.pipelineId !== undefined) oppUpdates.pipelineId = data.pipelineId;
    if (data.stageId !== undefined) oppUpdates.stageId = data.stageId;
    if (data.purchaseValue !== undefined) {
      oppUpdates.value =
        data.purchaseValue === null || data.purchaseValue === undefined
          ? 0
          : Number(data.purchaseValue);
    }
    // Permitir enviar null para ownerUserId se remover
    if (data.ownerUserId !== undefined) oppUpdates.assignedUserId = data.ownerUserId === null ? null : data.ownerUserId;
    if (data.contactId !== undefined) oppUpdates.contactId = data.contactId;
    if (data.name !== undefined && data.name !== null && String(data.name).trim() !== "") {
      oppUpdates.title = String(data.name).trim();
    }
    if (isReactivatingLead || ((data.pipelineId !== undefined || data.stageId !== undefined) && opp.status !== "OPEN")) {
      oppUpdates.status = "OPEN";
    }

    if (Object.keys(oppUpdates).length > 0) {
      await opp.update(oppUpdates);
      io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
        action: "update",
        opportunity: opp
      });
    }
  } else {
    // If no Opportunity exists but pipeline and stage are available, create one
    if (targetPipelineId && targetStageId) {
      const oppData: any = {
        companyId: companyId,
        pipelineId: targetPipelineId,
        stageId: targetStageId,
        title: data.name || lead.name,
        value:
          data.purchaseValue === null || data.purchaseValue === undefined
            ? 0
            : Number(data.purchaseValue),
        assignedUserId: data.ownerUserId || null,
        status: "OPEN",
        leadId: lead.id
      };
      // Só inclui contactId se existir; evita NOT NULL violation em bancos não migrados
      if (contactId) {
        oppData.contactId = contactId;
      }
      const newOpp = await Opportunity.create(oppData);
      io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
        action: "create",
        opportunity: newOpp
      });
    }
  }

  io.to(companyId.toString()).emit(`company-${companyId}-lead`, {
    action: "update",
    lead
  });

  // ── Webhook events ────────────────────────────────────────────────────────
  const leadPayload = {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    leadStatus: lead.leadStatus,
    pipelineId: lead.pipelineId,
    stageId: lead.stageId,
    ownerUserId: lead.ownerUserId
  };

  const statusChanged =
    (data.status !== undefined && data.status !== previousStatus) ||
    (data.leadStatus !== undefined && data.leadStatus !== previousLeadStatus);

  if (statusChanged) {
    webhookDispatch("LEAD_STATUS_CHANGED", companyId, {
      lead: leadPayload,
      oldStatus: previousStatus,
      newStatus: lead.status,
      oldLeadStatus: previousLeadStatus,
      newLeadStatus: lead.leadStatus
    });

    if (lead.status === "convertido" || lead.leadStatus === "convertido") {
      webhookDispatch("LEAD_CONVERTED", companyId, { lead: leadPayload });
      dispatchFlowTrigger("lead_converted", companyId, {
        contactNumber: lead.phone || "",
        contactName: lead.name || "",
        contactEmail: lead.email || "",
        metadata: { leadId: lead.id, pipelineId: lead.pipelineId, stageId: lead.stageId }
      }).catch(() => null);
    } else if (lead.status === "perdido" || lead.leadStatus === "perdido") {
      webhookDispatch("LEAD_LOST", companyId, { lead: leadPayload });
      dispatchFlowTrigger("lead_lost", companyId, {
        contactNumber: lead.phone || "",
        contactName: lead.name || "",
        contactEmail: lead.email || "",
        metadata: { leadId: lead.id, pipelineId: lead.pipelineId, stageId: lead.stageId }
      }).catch(() => null);
    }

    dispatchFlowTrigger("lead_status_changed", companyId, {
      contactNumber: lead.phone || "",
      contactName: lead.name || "",
      contactEmail: lead.email || "",
      metadata: {
        leadId: lead.id,
        oldStatus: previousStatus,
        newStatus: lead.status,
        oldLeadStatus: previousLeadStatus,
        newLeadStatus: lead.leadStatus,
        pipelineId: lead.pipelineId,
        stageId: lead.stageId
      }
    }).catch(() => null);
  }

  webhookDispatch("LEAD_UPDATED", companyId, { lead: leadPayload });
  dispatchFlowTrigger("lead_updated", companyId, {
    contactNumber: lead.phone || "",
    contactName: lead.name || "",
    contactEmail: lead.email || "",
    metadata: { leadId: lead.id, pipelineId: lead.pipelineId, stageId: lead.stageId }
  }).catch(() => null);

  if (
    (data.pipelineId !== undefined && Number(previousPipelineId) !== Number(lead.pipelineId)) ||
    (data.stageId !== undefined && Number(previousStageId) !== Number(lead.stageId))
  ) {
    const movePayload = {
      leadId: lead.id,
      fromPipelineId: previousPipelineId,
      pipelineId: lead.pipelineId,
      fromStageId: previousStageId,
      stageId: lead.stageId,
      toStageId: lead.stageId
    };

    dispatchFlowTrigger("lead_stage_changed", companyId, {
      contactNumber: lead.phone || "",
      contactName: lead.name || "",
      contactEmail: lead.email || "",
      metadata: movePayload
    }).catch(() => null);
    dispatchFlowTrigger("move_lead", companyId, {
      contactNumber: lead.phone || "",
      contactName: lead.name || "",
      contactEmail: lead.email || "",
      metadata: movePayload
    }).catch(() => null);
    dispatchFlowTrigger("kanban_event", companyId, {
      contactNumber: lead.phone || "",
      contactName: lead.name || "",
      contactEmail: lead.email || "",
      metadata: { ...movePayload, event: "lead_stage_changed" }
    }).catch(() => null);
  }
  // ── fim Webhook events ────────────────────────────────────────────────────

  return lead;
};

export default UpdateCrmLeadService;
