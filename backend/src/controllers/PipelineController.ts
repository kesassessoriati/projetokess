import { Request, Response } from "express";
import CreatePipelineService from "../services/PipelineServices/CreatePipelineService";
import ListPipelineBoardService from "../services/PipelineServices/ListPipelineBoardService";
import GetPipelineMetricsService from "../services/PipelineServices/GetPipelineMetricsService";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import logger from "../utils/logger";

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { name, isDefault, stages } = req.body;
    const { companyId } = req.user;

    const pipeline = await CreatePipelineService({
        name,
        companyId,
        isDefault,
        stages
    });

    return res.status(200).json(pipeline);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;

    const pipelines = await Pipeline.findAll({
        where: { companyId },
        include: [{ model: PipelineStage, as: "stages" }],
        order: [["name", "ASC"]]
    });

    return res.status(200).json(pipelines);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;
    const { name, isDefault } = req.body;

    if (!id) {
        return res.status(400).json({ error: "Funnel ID is required for update" });
    }

    const pipeline = await Pipeline.findOne({ where: { id, companyId } });
    if (!pipeline) {
        return res.status(404).json({ error: "Pipeline not found" });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    await pipeline.update(updateData);

    return res.status(200).json(pipeline);
};

export const board = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId, profile, id: userId } = req.user;
    const {
        stageId,
        cursor,
        limit,
        riskLevel,
        minProbability,
        onlyAI,
        onlyExpired,
        sort,
        ownerUserId,
        viewMode,
        searchKeyword
    } = req.query;

    const pipelineBoard = await ListPipelineBoardService({
        pipelineId: parseInt(id, 10),
        companyId,
        stageId: stageId ? parseInt(stageId as string, 10) : undefined,
        cursor: cursor as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        filter: {
            riskLevel: riskLevel as string,
            minProbability: minProbability ? parseFloat(minProbability as string) : undefined,
            onlyAI: onlyAI === "true",
            onlyExpired: onlyExpired === "true"
        },
        sort: sort as any,
        profile,
        userId: Number(userId),
        ownerUserId: ownerUserId ? parseInt(ownerUserId as string, 10) : undefined,
        viewMode: viewMode as "team" | "personal" | undefined,
        searchKeyword: searchKeyword as string | undefined
    });

    return res.status(200).json(pipelineBoard);
};

export const metrics = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;

    const pipelineMetrics = await GetPipelineMetricsService({
        pipelineId: parseInt(id, 10),
        companyId
    });

    return res.status(200).json(pipelineMetrics);
};

export const updateStageOrder = async (req: Request, res: Response): Promise<Response> => {
    const { id: pipelineId } = req.params;
    const { stages } = req.body; // Array of { id, order }

    const updates = stages.map((s: any) =>
        PipelineStage.update({ order: s.order }, { where: { id: s.id, pipelineId } })
    );

    await Promise.all(updates);

    return res.status(200).json({ message: "Stages reordered" });
};

export const storeStage = async (req: Request, res: Response): Promise<Response> => {
    const { id: pipelineId } = req.params;
    const { companyId } = req.user;
    const { name, color, order, probability, slaDays, linkedStatus } = req.body;

    const stage = await PipelineStage.create({
        pipelineId: parseInt(pipelineId, 10),
        companyId,
        name,
        color,
        order,
        probability,
        slaDays,
        linkedStatus: linkedStatus || null
    });

    return res.status(200).json(stage);
};

export const updateStage = async (req: Request, res: Response): Promise<Response> => {
    const { stageId } = req.params;
    const { companyId } = req.user;
    const { name, color, order, probability, slaDays, linkedStatus } = req.body;

    const stage = await PipelineStage.findOne({ where: { id: stageId, companyId } });
    if (!stage) return res.status(404).json({ error: "Stage not found" });

    await stage.update({
        name,
        color,
        order,
        probability,
        slaDays,
        linkedStatus: linkedStatus !== undefined ? (linkedStatus || null) : stage.linkedStatus
    });

    return res.status(200).json(stage);
};

export const deleteStage = async (req: Request, res: Response): Promise<Response> => {
    const { stageId } = req.params;
    const { companyId } = req.user;
    const { targetStageId } = req.body || {};

    const stage = await PipelineStage.findOne({ where: { id: stageId, companyId } });
    if (!stage) return res.status(404).json({ error: "Stage not found" });

    const Opportunity = (await import("../models/Opportunity")).default;
    const CrmLead = (await import("../models/CrmLead")).default;

    const opCount = await Opportunity.count({ where: { stageId, companyId } });
    const leadCount = await CrmLead.count({ where: { stageId, companyId } });

    const hasLinkedItems = opCount > 0 || leadCount > 0;

    // Há itens vinculados e nenhum destino informado → exige escolha de destino
    if (hasLinkedItems && !targetStageId) {
        return res.status(400).json({
            error: "Este estágio possui oportunidades/leads vinculados. Escolha um estágio de destino para movê-los antes de excluir.",
            requiresTargetStage: true,
            counts: { opportunities: opCount, leads: leadCount }
        });
    }

    // Validação do estágio de destino (quando informado): mesma empresa, mesmo funil e diferente do atual
    let destStage: PipelineStage | null = null;
    if (targetStageId) {
        if (Number(targetStageId) === Number(stageId)) {
            return res.status(400).json({ error: "Estágio de destino inválido." });
        }
        destStage = await PipelineStage.findOne({ where: { id: targetStageId, companyId } });
        if (!destStage || Number(destStage.pipelineId) !== Number(stage.pipelineId)) {
            return res.status(400).json({ error: "Estágio de destino inválido." });
        }
    }

    const sequelize = (await import("../database")).default;
    const pipelineId = stage.pipelineId;

    await sequelize.transaction(async (t) => {
        // Mover registros vinculados para o estágio de destino (nunca apagar via cascade)
        if (destStage) {
            await Opportunity.update(
                { stageId: destStage.id },
                { where: { stageId, companyId }, transaction: t }
            );
            await CrmLead.update(
                { stageId: destStage.id },
                { where: { stageId, companyId }, transaction: t }
            );
        }

        await stage.destroy({ transaction: t });

        const remainingStages = await PipelineStage.findAll({
            where: { pipelineId, companyId },
            order: [["order", "ASC"]],
            transaction: t
        });

        for (let i = 0; i < remainingStages.length; i++) {
            if (remainingStages[i].order !== i) {
                await remainingStages[i].update({ order: i }, { transaction: t });
            }
        }
    });

    return res.status(200).json({
        message: "Stage deleted successfully",
        movedOpportunities: destStage ? opCount : 0,
        movedLeads: destStage ? leadCount : 0,
        targetStageId: destStage ? destStage.id : null
    });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;

    const pipeline = await Pipeline.findOne({
        where: { id, companyId }
    });

    if (!pipeline) {
        return res.status(404).json({ error: "Pipeline not found" });
    }

    const Opportunity = (await import("../models/Opportunity")).default;
    const opportunitiesCount = await Opportunity.count({
        where: { pipelineId: id, companyId }
    });

    if (opportunitiesCount > 0) {
        return res.status(400).json({ error: "Cannot delete pipeline with existing opportunities." });
    }

    await pipeline.destroy();
    return res.status(200).json({ message: "Pipeline deleted successfully" });
};

export const getStageAutomation = async (req: Request, res: Response): Promise<Response> => {
    const { stageId } = req.params;
    const { companyId } = req.user;

    const stage = await PipelineStage.findOne({ where: { id: stageId, companyId } });
    if (!stage) return res.status(404).json({ error: "Stage not found" });

    const Automation = (await import("../models/Automation")).default;
    const AutomationAction = (await import("../models/AutomationAction")).default;

    const automations = await Automation.findAll({
        where: { companyId, triggerType: "crm_stage" },
        include: [{ model: AutomationAction, as: "actions" }]
    });

    const automation = automations.find(a => Number(a.triggerConfig?.stageId) === Number(stageId)) || null;

    return res.status(200).json(automation);
};

export const updateStageAutomation = async (req: Request, res: Response): Promise<Response> => {
    const { stageId } = req.params;
    const { companyId } = req.user;
    const { isActive, actions } = req.body;

    const stage = await PipelineStage.findOne({ where: { id: stageId, companyId } });
    if (!stage) return res.status(404).json({ error: "Stage not found" });

    // Validar ações antes de salvar
    if (actions && Array.isArray(actions)) {
        const Tag = (await import("../models/Tag")).default;
        const PipelineStageModel = (await import("../models/PipelineStage")).default;

        for (const act of actions) {
            if (act.actionType === "add_tag" || act.actionType === "remove_tag") {
                const tagId = act.actionConfig?.tagId;
                if (!tagId) {
                    return res.status(400).json({ error: "tagId é obrigatório para ações de etiqueta." });
                }
                const tag = await Tag.findOne({ where: { id: tagId, companyId } });
                if (!tag) {
                    return res.status(400).json({ error: `Etiqueta não encontrada ou não pertence a esta empresa.` });
                }
            }

            if (act.actionType === "move_lead") {
                const destinationStageId = act.actionConfig?.destinationStageId;
                if (!destinationStageId) {
                    return res.status(400).json({ error: "destinationStageId é obrigatório para a ação de mover lead." });
                }
                if (Number(destinationStageId) === Number(stageId)) {
                    return res.status(400).json({ error: "Não é permitido mover o lead para a mesma etapa." });
                }
                const destStage = await PipelineStageModel.findOne({
                    where: { id: destinationStageId, companyId }
                });
                if (!destStage) {
                    return res.status(400).json({ error: "Etapa de destino não encontrada." });
                }
                if (Number(destStage.pipelineId) !== Number(stage.pipelineId)) {
                    return res.status(400).json({ error: "A etapa de destino deve pertencer ao mesmo funil." });
                }
            }
        }
    }

    const Automation = (await import("../models/Automation")).default;
    const AutomationAction = (await import("../models/AutomationAction")).default;
    const sequelize = (await import("../database")).default;

    let automation: any = null;
    const automations = await Automation.findAll({
        where: { companyId, triggerType: "crm_stage" }
    });
    automation = automations.find(a => Number(a.triggerConfig?.stageId) === Number(stageId));

    await sequelize.transaction(async (t) => {
        if (!automation) {
            automation = await Automation.create({
                companyId,
                name: `Automação Etapa - ${stage.name}`,
                description: `Automação automática para a etapa ${stage.name}`,
                triggerType: "crm_stage",
                triggerConfig: { stageId: Number(stageId), pipelineId: stage.pipelineId },
                isActive: isActive !== undefined ? isActive : true
            }, { transaction: t });
        } else {
            await automation.update({
                isActive: isActive !== undefined ? isActive : automation.isActive
            }, { transaction: t });
        }

        // Deletar as ações antigas
        await AutomationAction.destroy({
            where: { automationId: automation.id },
            transaction: t
        });

        // Criar as novas ações
        if (actions && Array.isArray(actions)) {
            const actionsToCreate = actions.map((act: any, idx: number) => {
                let actionConfig = act.actionConfig || {};
                if (
                    act.actionType === "ai_actions" &&
                    (actionConfig.aiAction === "disable_in_stage" || actionConfig.aiAction === "pause_for")
                ) {
                    actionConfig = { ...actionConfig, stageId: Number(stageId) };
                }
                return {
                    automationId: automation.id,
                    actionType: act.actionType,
                    actionConfig,
                    delayMinutes: Number(act.delayMinutes || 0),
                    order: act.order !== undefined ? act.order : idx
                };
            });
            await AutomationAction.bulkCreate(actionsToCreate, { transaction: t });
        }
    });

    const updatedAutomation = await Automation.findByPk(automation.id, {
        include: [{ model: AutomationAction, as: "actions" }]
    });

    return res.status(200).json(updatedAutomation);
};

export const testStageAutomation = async (req: Request, res: Response): Promise<Response> => {
    const { stageId } = req.params;
    const { companyId } = req.user;
    const { opportunityId, skipDelays = true } = req.body;

    const stage = await PipelineStage.findOne({ where: { id: stageId, companyId } });
    if (!stage) return res.status(404).json({ error: "Etapa não encontrada" });

    if (!opportunityId) {
        return res.status(400).json({ error: "Informe uma oportunidade para o teste (opportunityId)" });
    }

    const AutomationModel = (await import("../models/Automation")).default;
    const AutomationAction = (await import("../models/AutomationAction")).default;

    const automations = await AutomationModel.findAll({
        where: { companyId, triggerType: "crm_stage", isActive: true }
    });
    const automation = automations.find(a => Number(a.triggerConfig?.stageId) === Number(stageId));

    if (!automation) {
        return res.status(404).json({ error: "Nenhuma automação ativa para esta etapa. Ative a automação e configure ações antes de testar." });
    }

    const actions = await AutomationAction.findAll({
        where: { automationId: automation.id },
        order: [["order", "ASC"]]
    });

    if (actions.length === 0) {
        return res.status(404).json({ error: "Nenhuma ação configurada nesta automação" });
    }

    const {
        executeAction,
        resolveOpportunityAutomationContext
    } = await import("../services/AutomationServices/ProcessAutomationService");

    const context = await resolveOpportunityAutomationContext({
        companyId,
        opportunityId: Number(opportunityId),
        actions
    });
    const { opportunity, contact, ticket } = context;
    if (!opportunity) return res.status(404).json({ error: "Oportunidade não encontrada" });
    const results: Array<{ order: number; type: string; success: boolean; message: string }> = [];

    for (const action of actions) {
        try {
            const result = await executeAction(action, contact, ticket, companyId, Number(opportunityId));
            results.push({
                order: action.order + 1,
                type: action.actionType,
                success: result.success,
                message: result.message
            });
        } catch (err: any) {
            results.push({
                order: action.order + 1,
                type: action.actionType,
                success: false,
                message: err.message
            });
        }
    }

    logger.info(`[testStageAutomation] Etapa ${stageId}, oportunidade ${opportunityId}: ${results.filter(r => r.success).length}/${results.length} ações com sucesso`);

    return res.status(200).json({
        success: results.every(r => r.success),
        executedActions: results
    });
};
