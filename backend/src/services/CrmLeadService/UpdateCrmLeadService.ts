import { Op } from "sequelize";
import * as Yup from "yup";
import AppError from "../../errors/AppError";
import CrmLead from "../../models/CrmLead";
import syncLeadToClient from "./helpers/syncLeadToClient";
import {
  resolveLeadContactId,
  resolveLeadPrimaryTicketId
} from "./helpers/resolveLeadRelations";

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
  pipelineId?: number;
  stageId?: number;
}

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
    status: Yup.string()
      .oneOf(["novo", "contactado", "qualificado", "reuniao_agendada", "nao_qualificado", "convertido", "perdido"])
      .nullable(),
    leadStatus: Yup.string().nullable(),
    score: Yup.number().min(0).nullable(),
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

  await lead.update({
    ...data,
    contactId,
    primaryTicketId,
    leadStatus: data.leadStatus ?? lead.leadStatus,
    lastActivityAt: data.lastActivityAt || lead.lastActivityAt,
    meetingScheduledAt
  });

  const shouldSyncByStatus =
    data.status === "convertido" && previousStatus !== "convertido";
  const shouldSyncByLeadStatus =
    (data.leadStatus === "convertido" && previousLeadStatus !== "convertido") ||
    (lead.leadStatus === "convertido" && previousLeadStatus !== "convertido");

  if (shouldSyncByStatus || shouldSyncByLeadStatus) {
    await syncLeadToClient(lead);
  }

  const { getIO } = await import("../../libs/socket");
  const io = getIO();

  // Update existing Opportunity if pipeline or owner changed
  const Opportunity = (await import("../../models/Opportunity")).default;
  const opp = await Opportunity.findOne({ where: { leadId: lead.id, companyId } });

  if (opp) {
    const oppUpdates: any = {};
    if (data.pipelineId !== undefined) oppUpdates.pipelineId = data.pipelineId;
    if (data.stageId !== undefined) oppUpdates.stageId = data.stageId;
    // Permitir enviar null para ownerUserId se remover
    if (data.ownerUserId !== undefined) oppUpdates.assignedUserId = data.ownerUserId === null ? null : data.ownerUserId;
    if (data.contactId !== undefined) oppUpdates.contactId = data.contactId;

    if (Object.keys(oppUpdates).length > 0) {
      await opp.update(oppUpdates);
      io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
        action: "update",
        opportunity: opp
      });
    }
  } else {
    // If no Opportunity exists but pipeline and stage are provided, create one
    if (data.pipelineId && data.stageId) {
      const oppData: any = {
        companyId: companyId,
        pipelineId: data.pipelineId,
        stageId: data.stageId,
        title: data.name || lead.name,
        value: 0,
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

  return lead;
};

export default UpdateCrmLeadService;
