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
import ListOpportunityEventsService from "../services/OpportunityServices/ListOpportunityEventsService";
import { getIO } from "../libs/socket";

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { pipelineId, contactId, ticketId } = req.query;
    const { companyId } = req.user;

    const opportunities = await ListOpportunitiesService({
        companyId,
        pipelineId: pipelineId ? Number(pipelineId) : undefined,
        contactId: contactId ? Number(contactId) : undefined,
        ticketId: ticketId ? Number(ticketId) : undefined
    });

    return res.status(200).json(opportunities);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { pipelineId, stageId, contactId, leadId, title, value, assignedUserId } = req.body;

    if (!pipelineId || !stageId) {
        throw new AppError("O estágio (stageId) e o funil (pipelineId) devem ser informados.", 400);
    }

    const opportunity = await CreateOpportunityService({
        companyId,
        pipelineId,
        stageId,
        contactId,
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
    const { toStageId, reason, movedBy } = req.body;
    const { companyId } = req.user;

    const opportunity = await MoveOpportunityService({
        opportunityId: Number(id),
        toStageId,
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

    const event = await CreateOpportunityEventService({
        opportunityId: Number(id),
        companyId,
        type,
        metadata
    });

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

export const update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { status, title, value } = req.body;
    const { companyId } = req.user;

    const opportunity = await Opportunity.findOne({
        where: { id, companyId }
    });

    if (!opportunity) {
        throw new AppError("Oportunidade não encontrada", 404);
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (value !== undefined) updateData.value = value;

    await opportunity.update(updateData);

    const io = getIO();
    io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
        action: "update",
        opportunity
    });

    return res.status(200).json(opportunity);
};
