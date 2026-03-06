import { Request, Response } from "express";
import KanbanAutomation from "../models/KanbanAutomation";

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;
    const { nome_automacao, estrutura_fluxo, status } = req.body;

    const automation = await KanbanAutomation.create({
        nome_automacao,
        estrutura_fluxo,
        status: status !== undefined ? status : true,
        company_id: companyId,
        user_id: userId
    });

    return res.status(200).json(automation);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;

    const automations = await KanbanAutomation.findAll({
        where: { company_id: companyId },
        order: [["id", "ASC"]]
    });

    return res.status(200).json(automations);
};

export const update = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const { companyId } = req.user;
    const { id } = req.params;
    const { nome_automacao, estrutura_fluxo, status } = req.body;

    const automation = await KanbanAutomation.findOne({
        where: { id, company_id: companyId }
    });

    if (!automation) {
        return res.status(404).json({ error: "KanbanAutomation não encontrada" });
    }

    await automation.update({
        nome_automacao,
        estrutura_fluxo,
        status
    });

    return res.status(200).json(automation);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { id } = req.params;

    const automation = await KanbanAutomation.findOne({
        where: { id, company_id: companyId }
    });

    if (!automation) {
        return res.status(404).json({ error: "KanbanAutomation não encontrada" });
    }

    return res.status(200).json(automation);
};

export const remove = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const { companyId } = req.user;
    const { id } = req.params;

    const automation = await KanbanAutomation.findOne({
        where: { id, company_id: companyId }
    });

    if (!automation) {
        return res.status(404).json({ error: "KanbanAutomation não encontrada" });
    }

    await automation.destroy();

    return res.status(200).json({ message: "KanbanAutomation deletada" });
};
