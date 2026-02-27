import { Request, Response } from "express";
import CreateOpportunityService from "../services/OpportunityServices/CreateOpportunityService";
import ListOpportunitiesService from "../services/OpportunityServices/ListOpportunitiesService";
import MoveOpportunityService from "../services/OpportunityServices/MoveOpportunityService";
import Opportunity from "../models/Opportunity";
import PipelineStage from "../models/PipelineStage";
import Contact from "../models/Contact";
import User from "../models/User";
import OpportunityMovement from "../models/OpportunityMovement";
import AISuggestionFeedback from "../models/AISuggestionFeedback";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { pipelineId } = req.query;
    const { companyId } = req.user;

    const opportunities = await ListOpportunitiesService({
        companyId,
        pipelineId: Number(pipelineId)
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
