import { Op } from "sequelize";
import AiExternalAppointment from "../../models/AiExternalAppointment";
import AiExternalReminder from "../../models/AiExternalReminder";
import Appointment from "../../models/Appointment";
import CrmLead from "../../models/CrmLead";
import LeadMessage from "../../models/LeadMessage";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import UpdateAppointmentService from "../AppointmentServices/UpdateAppointmentService";
import CreateCrmLeadService from "../CrmLeadService/CreateCrmLeadService";
import UpdateCrmLeadService from "../CrmLeadService/UpdateCrmLeadService";
import { dispatchFlowTrigger } from "../FlowBuilderService/FlowTriggerDispatchService";
import logger from "../../utils/logger";

type JourneyStageKey = "appointment" | "confirmed" | "reschedule" | "cancelled";
type ReminderReplyAction = "confirm" | "reschedule" | "cancel";

const STAGE_ALIASES: Record<JourneyStageKey, string[]> = {
  appointment: ["agendamento", "agendado", "agenda", "consulta agendada", "reuniao agendada"],
  confirmed: ["agendamento confirmado", "confirmado", "confirmacao", "presenca confirmada"],
  reschedule: ["reagendamento", "remarcar", "remarcacao", "remarcando"],
  cancelled: ["cancelado", "cancelamento", "desmarcado"]
};

const normalizePhone = (value?: string | null): string =>
  String(value || "").replace(/\D/g, "");

const normalizeText = (value?: string | null): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const appendMetadataEvent = (
  metadata: Record<string, any> | null | undefined,
  event: Record<string, any>
) => {
  const previousEvents = Array.isArray(metadata?.journeyEvents)
    ? metadata?.journeyEvents.slice(-20)
    : [];

  return {
    ...(metadata || {}),
    journeyEvents: [
      ...previousEvents,
      {
        ...event,
        at: new Date().toISOString()
      }
    ]
  };
};

const stageConfigValue = (
  metadata: Record<string, any> | null | undefined,
  key: JourneyStageKey
) => {
  const automation = metadata?.journeyAutomation || metadata?.pipelineAutomation || {};
  return automation?.stages?.[key] || automation?.[`${key}Stage`] || automation?.[`${key}StageId`];
};

const findActivePipeline = async (companyId: number, pipelineId?: number | null) => {
  if (pipelineId) {
    const pipeline = await Pipeline.findOne({ where: { id: pipelineId, companyId, isActive: true } });
    if (pipeline) return pipeline;
  }

  return Pipeline.findOne({
    where: { companyId, isActive: true },
    order: [
      ["isDefault", "DESC"],
      ["id", "ASC"]
    ]
  });
};

const resolvePipelineStage = async ({
  companyId,
  key,
  pipelineId,
  metadata
}: {
  companyId: number;
  key: JourneyStageKey;
  pipelineId?: number | null;
  metadata?: Record<string, any> | null;
}): Promise<PipelineStage | null> => {
  const configured = stageConfigValue(metadata, key);
  const pipeline = await findActivePipeline(companyId, pipelineId);
  if (!pipeline) return null;

  if (configured && Number(configured)) {
    const configuredStage = await PipelineStage.findOne({
      where: {
        id: Number(configured),
        companyId,
        pipelineId: pipeline.id
      }
    });
    if (configuredStage) return configuredStage;
  }

  const stages = await PipelineStage.findAll({
    where: { companyId, pipelineId: pipeline.id },
    order: [["order", "ASC"]]
  });

  const configuredName = configured && !Number(configured) ? normalizeText(configured) : "";
  const aliases = configuredName ? [configuredName, ...STAGE_ALIASES[key]] : STAGE_ALIASES[key];
  const normalizedAliases = aliases.map(normalizeText);

  return (
    stages.find(stage => normalizedAliases.some(alias => normalizeText(stage.name).includes(alias))) ||
    (key === "appointment" ? stages[0] : null)
  );
};

const findLeadByAppointment = async (
  aiAppointment: AiExternalAppointment
): Promise<CrmLead | null> => {
  if (aiAppointment.crmLeadId) {
    const lead = await CrmLead.findOne({
      where: { id: aiAppointment.crmLeadId, companyId: aiAppointment.companyId }
    });
    if (lead) return lead;
  }

  if (aiAppointment.contactId) {
    const lead = await CrmLead.findOne({
      where: { contactId: aiAppointment.contactId, companyId: aiAppointment.companyId },
      order: [["updatedAt", "DESC"]]
    });
    if (lead) return lead;
  }

  const phone = normalizePhone(aiAppointment.leadPhone);
  if (!phone) return null;

  return CrmLead.findOne({
    where: {
      companyId: aiAppointment.companyId,
      [Op.or]: [
        { phone },
        { phone: aiAppointment.leadPhone },
        { phone: phone.replace(/^55/, "") },
        { decisionMakerPhone: phone },
        { decisionMakerPhone: phone.replace(/^55/, "") }
      ]
    },
    order: [["updatedAt", "DESC"]]
  });
};

const ensureLeadForAppointment = async (
  aiAppointment: AiExternalAppointment
): Promise<CrmLead | null> => {
  const existingLead = await findLeadByAppointment(aiAppointment);
  if (existingLead) return existingLead;

  if (!aiAppointment.leadPhone && !aiAppointment.leadEmail) return null;

  const lead = await CreateCrmLeadService({
    companyId: aiAppointment.companyId,
    name: aiAppointment.leadName || aiAppointment.leadPhone || "Lead IA",
    email: aiAppointment.leadEmail || undefined,
    phone: aiAppointment.leadPhone || undefined,
    contactId: aiAppointment.contactId || undefined,
    primaryTicketId: aiAppointment.ticketId || undefined,
    source: "Agente IA",
    status: "novo",
    leadStatus: "novo"
  }).catch(error => {
    logger.warn(`[AiExternalJourney] Nao foi possivel criar lead do agendamento ${aiAppointment.id}: ${error?.message || error}`);
    return null;
  });

  return lead;
};

const registerLeadMessage = async (
  leadId: number | null | undefined,
  message: string
) => {
  if (!leadId) return;
  await LeadMessage.create({
    leadId,
    senderType: "system",
    message
  }).catch(() => undefined);
};

const moveLeadToStage = async ({
  lead,
  stage,
  status,
  leadStatus,
  note
}: {
  lead: CrmLead | null;
  stage: PipelineStage | null;
  status?: string;
  leadStatus?: string;
  note: string;
}) => {
  if (!lead) return null;

  const updateData: any = {
    id: lead.id,
    companyId: lead.companyId,
    lastActivityAt: new Date()
  };

  if (stage) {
    updateData.pipelineId = stage.pipelineId;
    updateData.stageId = stage.id;
  }
  if (status) updateData.status = status;
  if (leadStatus) updateData.leadStatus = leadStatus;

  const updatedLead = await UpdateCrmLeadService(updateData).catch(error => {
    logger.warn(`[AiExternalJourney] Nao foi possivel mover lead ${lead.id}: ${error?.message || error}`);
    return lead;
  });

  await registerLeadMessage(lead.id, note);
  return updatedLead;
};

export const registerAiAppointmentCreatedJourney = async ({
  aiAppointment,
  metadata
}: {
  aiAppointment: AiExternalAppointment;
  metadata?: Record<string, any> | null;
}) => {
  const lead = await ensureLeadForAppointment(aiAppointment);
  const stage = await resolvePipelineStage({
    companyId: aiAppointment.companyId,
    key: "appointment",
    pipelineId: aiAppointment.pipelineId || lead?.pipelineId,
    metadata
  });

  const updatedLead = await moveLeadToStage({
    lead,
    stage,
    status: "reuniao_agendada",
    leadStatus: "reuniao_agendada",
    note: `Agendamento criado pela IA: ${aiAppointment.title || "compromisso"}`
  });

  await aiAppointment.update({
    crmLeadId: updatedLead?.id || aiAppointment.crmLeadId || null,
    pipelineId: stage?.pipelineId || updatedLead?.pipelineId || aiAppointment.pipelineId || null,
    stageId: stage?.id || updatedLead?.stageId || aiAppointment.stageId || null,
    metadata: appendMetadataEvent(aiAppointment.metadata, {
      type: "appointment_created",
      crmLeadId: updatedLead?.id || aiAppointment.crmLeadId,
      pipelineId: stage?.pipelineId || updatedLead?.pipelineId,
      stageId: stage?.id || updatedLead?.stageId
    })
  });
};

export const registerReminderSentJourney = async (reminder: AiExternalReminder) => {
  const aiAppointment = reminder.aiAppointmentId
    ? await AiExternalAppointment.findOne({
        where: { id: reminder.aiAppointmentId, companyId: reminder.companyId }
      })
    : null;

  await reminder.update({
    metadata: appendMetadataEvent(reminder.metadata, {
      type: "reminder_sent",
      aiAppointmentId: reminder.aiAppointmentId
    })
  });

  if (aiAppointment) {
    const lead = await findLeadByAppointment(aiAppointment);
    await registerLeadMessage(lead?.id || aiAppointment.crmLeadId, `Lembrete enviado ao lead em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`);
    await aiAppointment.update({
      metadata: appendMetadataEvent(aiAppointment.metadata, {
        type: "reminder_sent",
        reminderId: reminder.id
      })
    });
  }
};

const normalizeReplyAction = (value?: string | null): ReminderReplyAction | null => {
  const text = normalizeText(value);
  if (!text) return null;
  if (["1", "confirmar", "confirmo", "confirmado", "sim", "vou", "presente"].includes(text)) return "confirm";
  if (["2", "remarcar", "reagendar", "reagendamento", "remarcacao", "outro horario"].includes(text)) return "reschedule";
  if (["3", "cancelar", "cancelado", "cancela", "nao", "nao vou"].includes(text)) return "cancel";
  return null;
};

const findLatestActionableReminder = async ({
  companyId,
  contactId,
  phone
}: {
  companyId: number;
  contactId?: number | null;
  phone?: string | null;
}) => {
  const normalizedPhone = normalizePhone(phone);
  const orWhere: any[] = [];
  if (contactId) orWhere.push({ contactId });
  if (normalizedPhone) {
    orWhere.push(
      { leadPhone: normalizedPhone },
      { leadPhone: { [Op.like]: `%${normalizedPhone}%` } },
      { leadPhone: { [Op.like]: `%${normalizedPhone.replace(/^55/, "")}%` } }
    );
  }
  if (!orWhere.length) return null;

  return AiExternalReminder.findOne({
    where: {
      companyId,
      status: { [Op.in]: ["sent", "processing"] },
      updatedAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      [Op.or]: orWhere
    },
    include: [{ model: AiExternalAppointment, as: "aiAppointment", required: false }],
    order: [["updatedAt", "DESC"]]
  });
};

export const handleAiReminderReply = async ({
  companyId,
  contactId,
  phone,
  body,
  buttonId
}: {
  companyId: number;
  contactId?: number | null;
  phone?: string | null;
  body?: string | null;
  buttonId?: string | null;
}): Promise<{ handled: boolean; continueAutomation: boolean; action?: ReminderReplyAction }> => {
  const action = normalizeReplyAction(buttonId) || normalizeReplyAction(body);
  if (!action) return { handled: false, continueAutomation: true };

  const reminder = await findLatestActionableReminder({ companyId, contactId, phone });
  if (!reminder) return { handled: false, continueAutomation: true };

  const aiAppointment =
    (reminder as any).aiAppointment ||
    (reminder.aiAppointmentId
      ? await AiExternalAppointment.findOne({ where: { id: reminder.aiAppointmentId, companyId } })
      : null);

  if (!aiAppointment) return { handled: false, continueAutomation: true };

  const stageKey: JourneyStageKey =
    action === "confirm" ? "confirmed" : action === "reschedule" ? "reschedule" : "cancelled";
  const lead = await findLeadByAppointment(aiAppointment);
  const stage = await resolvePipelineStage({
    companyId,
    key: stageKey,
    pipelineId: aiAppointment.pipelineId || lead?.pipelineId,
    metadata: aiAppointment.metadata
  });

  const now = new Date();
  const responseMetadata = {
    type: `reminder_${action}`,
    reminderId: reminder.id,
    response: body || buttonId,
    respondedAt: now.toISOString()
  };

  if (action === "confirm") {
    if (aiAppointment.appointmentId) {
      await UpdateAppointmentService({
        id: aiAppointment.appointmentId,
        companyId,
        status: "confirmed",
        operationalNote: "Presenca confirmada pelo lead via lembrete IA"
      }).catch(() => undefined);
    }

    await aiAppointment.update({
      status: "confirmed",
      metadata: appendMetadataEvent(aiAppointment.metadata, responseMetadata)
    });
    await reminder.update({
      status: "confirmed",
      metadata: appendMetadataEvent(reminder.metadata, responseMetadata)
    });
    await moveLeadToStage({
      lead,
      stage,
      status: "reuniao_agendada",
      leadStatus: "agendamento_confirmado",
      note: "Lead confirmou presenca pelo lembrete da IA."
    });
  } else if (action === "reschedule") {
    await aiAppointment.update({
      status: "reschedule_requested",
      metadata: appendMetadataEvent(aiAppointment.metadata, responseMetadata)
    });
    await reminder.update({
      status: "reschedule_requested",
      metadata: appendMetadataEvent(reminder.metadata, responseMetadata)
    });
    await moveLeadToStage({
      lead,
      stage,
      status: "reuniao_agendada",
      leadStatus: "reagendamento_solicitado",
      note: "Lead pediu para remarcar pelo lembrete da IA."
    });
  } else {
    if (aiAppointment.appointmentId) {
      await UpdateAppointmentService({
        id: aiAppointment.appointmentId,
        companyId,
        status: "cancelled",
        operationalNote: "Cancelado pelo lead via lembrete IA"
      }).catch(() => undefined);
    }

    await aiAppointment.update({
      status: "cancelled",
      cancellationReason: "Cancelado pelo lead via lembrete IA",
      metadata: appendMetadataEvent(aiAppointment.metadata, responseMetadata)
    });
    await AiExternalReminder.update(
      {
        status: "cancelled",
        metadata: appendMetadataEvent(reminder.metadata, responseMetadata)
      },
      {
        where: {
          companyId,
          aiAppointmentId: aiAppointment.id,
          status: { [Op.in]: ["pending", "processing", "sent"] }
        }
      }
    );
    await moveLeadToStage({
      lead,
      stage,
      status: "perdido",
      leadStatus: "agendamento_cancelado",
      note: "Lead cancelou o agendamento pelo lembrete da IA."
    });
  }

  dispatchFlowTrigger(`ai_reminder_${action}`, companyId, {
    ticketId: reminder.ticketId || aiAppointment.ticketId || undefined,
    contactNumber: reminder.leadPhone || aiAppointment.leadPhone || "",
    contactName: reminder.leadName || aiAppointment.leadName || "",
    metadata: {
      reminderId: reminder.id,
      aiAppointmentId: aiAppointment.id,
      appointmentId: aiAppointment.appointmentId,
      crmLeadId: lead?.id || aiAppointment.crmLeadId,
      action
    }
  }).catch(() => undefined);

  return {
    handled: true,
    continueAutomation: action === "reschedule",
    action
  };
};

export const syncAiAppointmentCancellationJourney = async (
  aiAppointment: AiExternalAppointment,
  reason?: string | null
) => {
  const lead = await findLeadByAppointment(aiAppointment);
  const stage = await resolvePipelineStage({
    companyId: aiAppointment.companyId,
    key: "cancelled",
    pipelineId: aiAppointment.pipelineId || lead?.pipelineId,
    metadata: aiAppointment.metadata
  });

  await AiExternalReminder.update(
    {
      status: "cancelled",
      metadata: appendMetadataEvent({}, {
        type: "appointment_cancelled",
        aiAppointmentId: aiAppointment.id,
        reason
      })
    },
    {
      where: {
        companyId: aiAppointment.companyId,
        aiAppointmentId: aiAppointment.id,
        status: { [Op.in]: ["pending", "processing", "sent"] }
      }
    }
  );

  await moveLeadToStage({
    lead,
    stage,
    status: "perdido",
    leadStatus: "agendamento_cancelado",
    note: `Agendamento IA cancelado${reason ? `: ${reason}` : "."}`
  });
};

export const syncAiAppointmentRescheduleJourney = async (
  aiAppointment: AiExternalAppointment
) => {
  const lead = await findLeadByAppointment(aiAppointment);
  const stage = await resolvePipelineStage({
    companyId: aiAppointment.companyId,
    key: "appointment",
    pipelineId: aiAppointment.pipelineId || lead?.pipelineId,
    metadata: aiAppointment.metadata
  });

  await moveLeadToStage({
    lead,
    stage,
    status: "reuniao_agendada",
    leadStatus: "reuniao_agendada",
    note: "Agendamento IA remarcado e sincronizado."
  });

  await registerLeadMessage(lead?.id || aiAppointment.crmLeadId, "Novo horario de agendamento IA sincronizado.");

  const appointment = aiAppointment.appointmentId
    ? await Appointment.findOne({ where: { id: aiAppointment.appointmentId, companyId: aiAppointment.companyId } })
    : null;

  if (appointment) {
    await appointment.update({
      operationalNote: "Remarcado pelo fluxo do Agente IA"
    }).catch(() => undefined);
  }
};
