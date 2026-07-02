import { Request, Response } from "express";
import CreateOpportunityService from "../services/OpportunityServices/CreateOpportunityService";
import ListOpportunitiesService from "../services/OpportunityServices/ListOpportunitiesService";
import MoveOpportunityService from "../services/OpportunityServices/MoveOpportunityService";
import Opportunity from "../models/Opportunity";
import PipelineStage from "../models/PipelineStage";
import Contact from "../models/Contact";
import User from "../models/User";
import OpportunityMovement from "../models/OpportunityMovement";
import OpportunityEvent from "../models/OpportunityEvent";
import AISuggestionFeedback from "../models/AISuggestionFeedback";
import AppError from "../errors/AppError";
import CreateOpportunityEventService from "../services/OpportunityServices/CreateOpportunityEventService";
import UpdateOpportunityEventService from "../services/OpportunityServices/UpdateOpportunityEventService";
import DeleteOpportunityEventService from "../services/OpportunityServices/DeleteOpportunityEventService";
import ListOpportunityEventsService from "../services/OpportunityServices/ListOpportunityEventsService";
import { getIO } from "../libs/socket";
import EventBus from "../libs/EventBus";
import { dispatchFlowTrigger } from "../services/FlowBuilderService/FlowTriggerDispatchService";

export const remove = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;

    const opportunity = await Opportunity.findOne({ where: { id, companyId } });
    if (!opportunity) {
        throw new AppError("Oportunidade não encontrada.", 404);
    }

    const CrmLead = (await import("../models/CrmLead")).default;
    let updatedLead = null;

    if (opportunity.leadId) {
        const lead = await CrmLead.findOne({ where: { id: opportunity.leadId, companyId } });

        if (lead) {
            const leadUpdate: Record<string, any> = {
                pipelineId: null,
                stageId: null
            };

            const currentStage = opportunity.stageId
                ? await PipelineStage.findOne({ where: { id: opportunity.stageId, companyId } })
                : null;

            if (
                currentStage?.linkedStatus &&
                (lead.status === currentStage.linkedStatus || lead.leadStatus === currentStage.linkedStatus)
            ) {
                leadUpdate.status = "novo";
                leadUpdate.leadStatus = "novo";
            }

            await lead.update(leadUpdate);
            updatedLead = lead;
        }
    }

    await opportunity.destroy();

    const io = getIO();
    io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
        action: "delete",
        opportunityId: Number(id)
    });

    if (updatedLead) {
        io.to(companyId.toString()).emit(`company-${companyId}-lead`, {
            action: "update",
            lead: updatedLead
        });
    }

    return res.status(200).json({ message: "Oportunidade removida do funil." });
};

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { pipelineId, contactId, ticketId, status } = req.query;
    const { companyId } = req.user;

    const opportunities = await ListOpportunitiesService({
        companyId,
        pipelineId: pipelineId ? Number(pipelineId) : undefined,
        contactId: contactId ? Number(contactId) : undefined,
        ticketId: ticketId ? Number(ticketId) : undefined,
        status: status ? String(status) : undefined
    });

    return res.status(200).json(opportunities);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { pipelineId, stageId, contactId, ticketId, leadId, title, value, assignedUserId } = req.body;

    if (!pipelineId || !stageId) {
        throw new AppError("O estágio (stageId) e o funil (pipelineId) devem ser informados.", 400);
    }

    const opportunity = await CreateOpportunityService({
        companyId,
        pipelineId,
        stageId,
        contactId,
        ticketId,
        leadId,
        title,
        value,
        assignedUserId
    });

    return res.status(201).json(opportunity);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;

    const opportunity = await Opportunity.findOne({
        where: { id, companyId },
        include: [
            { model: Contact, as: "contact" },
            { model: User, as: "assignedUser" },
            { model: PipelineStage, as: "stage" },
            {
                model: OpportunityMovement,
                as: "movements",
                include: [
                    { model: PipelineStage, as: "fromStage" },
                    { model: PipelineStage, as: "toStage" }
                ]
            }
        ]
    });

    return res.status(200).json(opportunity);
};

export const move = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { toStageId, stageId, reason, movedBy } = req.body;
    const { companyId } = req.user;
    const destinationStageId = Number(toStageId || stageId);

    if (!destinationStageId) {
        throw new AppError("Informe o estágio de destino.", 400);
    }

    const opportunity = await MoveOpportunityService({
        opportunityId: Number(id),
        toStageId: destinationStageId,
        companyId,
        movedBy: movedBy || "USER",
        reason
    });

    return res.status(200).json(opportunity);
};

export const feedback = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { suggestedStageId, actualStageId, feedback } = req.body;
    const { companyId } = req.user;

    const record = await AISuggestionFeedback.create({
        opportunityId: Number(id),
        companyId,
        suggestedStageId,
        actualStageId,
        feedback
    } as any);

    return res.status(200).json(record);
};

export const addEvent = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { type, metadata } = req.body;
    const { companyId } = req.user;
    const opportunity = await Opportunity.findOne({
        where: { id, companyId }
    });

    if (!opportunity) {
        throw new AppError("Oportunidade nÃ£o encontrada", 404);
    }

    const event = await CreateOpportunityEventService({
        opportunityId: Number(id),
        companyId,
        type,
        metadata
    });

    await EventBus.publish("OPPORTUNITY_UPDATED", {
        opportunityId: Number(id),
        pipelineId: opportunity.pipelineId,
        stageId: opportunity.stageId,
        changes: {
            manualEvent: {
                before: null,
                after: {
                    type,
                    metadata
                }
            }
        },
        assignedUserId: opportunity.assignedUserId,
        status: opportunity.status,
        value: opportunity.value,
        updatedAt: event.createdAt,
        version: `manual:${event.id}`
    }, companyId);

    const contact = opportunity.contactId
        ? await Contact.findOne({ where: { id: opportunity.contactId, companyId } })
        : null;

    dispatchFlowTrigger("opportunity_updated", companyId, {
        ticketId: opportunity.ticketId || undefined,
        contactNumber: contact?.number || "",
        contactName: contact?.name || opportunity.title,
        contactEmail: contact?.email || "",
        metadata: {
            opportunityId: opportunity.id,
            pipelineId: opportunity.pipelineId,
            stageId: opportunity.stageId,
            leadId: opportunity.leadId,
            contactId: opportunity.contactId,
            value: opportunity.value,
            status: opportunity.status,
            changes: {
                manualEvent: {
                    type,
                    metadata
                }
            }
        }
    }).catch(() => null);

    return res.status(201).json(event);
};

export const listEvents = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;

    const events = await ListOpportunityEventsService({
        opportunityId: Number(id),
        companyId
    });

    return res.status(200).json(events);
};

export const updateEvent = async (req: Request, res: Response): Promise<Response> => {
    const { eventId } = req.params;
    const { metadata } = req.body;
    const { companyId } = req.user;

    const event = await UpdateOpportunityEventService({
        eventId: Number(eventId),
        companyId,
        metadata
    });

    return res.status(200).json(event);
};

export const removeEvent = async (req: Request, res: Response): Promise<Response> => {
    const { eventId } = req.params;
    const { companyId } = req.user;

    await DeleteOpportunityEventService({
        eventId: Number(eventId),
        companyId
    });

    return res.status(200).json({ message: "Evento removido" });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { status, title, value, assignedUserId } = req.body;
    const { companyId } = req.user;

    const opportunity = await Opportunity.findOne({
        where: { id, companyId }
    });

    if (!opportunity) {
        throw new AppError("Oportunidade não encontrada", 404);
    }

    const isClosingStatus = status === "WON" || status === "LOST";

    const updateData: any = {};
    const changes: Record<string, { before: any; after: any }> = {};
    // GANHO/PERDIDO é fluxo centralizado (CloseOpportunityService); demais
    // status (ex.: reabertura para OPEN) seguem pelo update genérico.
    if (status !== undefined && !isClosingStatus) {
        updateData.status = status;
        changes.status = { before: opportunity.status, after: status };
    }
    if (title !== undefined) {
        updateData.title = title;
        changes.title = { before: opportunity.title, after: title };
    }
    if (value !== undefined) {
        updateData.value = value;
        changes.value = { before: opportunity.value, after: value };
    }
    if (assignedUserId !== undefined) {
        updateData.assignedUserId = assignedUserId || null;
        changes.assignedUserId = { before: opportunity.assignedUserId, after: assignedUserId || null };
    }

    await opportunity.update(updateData);
    await opportunity.reload();

    await OpportunityEvent.create({
        opportunityId: opportunity.id,
        companyId,
        type: "UPDATED",
        metadata: {
            changes
        }
    });

    await EventBus.publish("OPPORTUNITY_UPDATED", {
        opportunityId: opportunity.id,
        pipelineId: opportunity.pipelineId,
        stageId: opportunity.stageId,
        changes,
        assignedUserId: opportunity.assignedUserId,
        status: opportunity.status,
        value: opportunity.value,
        updatedAt: opportunity.updatedAt,
        version: opportunity.version
    }, companyId);

    const contact = opportunity.contactId
        ? await Contact.findOne({ where: { id: opportunity.contactId, companyId } })
        : null;

    dispatchFlowTrigger("opportunity_updated", companyId, {
        ticketId: opportunity.ticketId || undefined,
        contactNumber: contact?.number || "",
        contactName: contact?.name || opportunity.title,
        contactEmail: contact?.email || "",
        metadata: {
            opportunityId: opportunity.id,
            pipelineId: opportunity.pipelineId,
            stageId: opportunity.stageId,
            leadId: opportunity.leadId,
            contactId: opportunity.contactId,
            value: opportunity.value,
            status: opportunity.status,
            changes
        }
    }).catch(() => null);

    const io = getIO();
    io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
        action: "update",
        opportunity
    });

    // Fechamento GANHO/PERDIDO centralizado (Fase C): atualiza Opportunity,
    // sincroniza Lead, converte em Cliente (WON), dispara eventos e sockets.
    if (isClosingStatus) {
        const { default: CloseOpportunityService } = await import(
            "../services/OpportunityServices/CloseOpportunityService"
        );
        await CloseOpportunityService({
            opportunityId: opportunity.id,
            companyId,
            status: status as "WON" | "LOST",
            userId: Number(req.user.id) || null,
            reason: (req.body as any)?.reason || null
        });
        await opportunity.reload();
    } else if (status !== undefined) {
        // Reabertura/ajuste de status genérico: reaplica o cache do lead.
        const { default: SyncLeadFromOpportunityService } = await import(
            "../services/CrmSyncService/SyncLeadFromOpportunityService"
        );
        await SyncLeadFromOpportunityService({
            opportunity,
            companyId,
            emitSocket: true
        }).catch(() => null);
    }

    return res.status(200).json(opportunity);
};
