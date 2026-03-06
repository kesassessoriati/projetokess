import { Request, Response } from "express";
import WhatsappWarmup from "../models/WhatsappWarmup";
import WhatsappWarmupLog from "../models/WhatsappWarmupLog";
import AppError from "../errors/AppError";

export const show = async (req: Request, res: Response): Promise<Response> => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;

    const warmup = await WhatsappWarmup.findOne({
        where: { whatsappId, companyId }
    });

    return res.status(200).json(warmup);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    const data = req.body;

    let warmup = await WhatsappWarmup.findOne({
        where: { whatsappId, companyId }
    });

    if (!warmup) {
        warmup = await WhatsappWarmup.create({
            ...data,
            whatsappId,
            companyId
        });
    } else {
        await warmup.update(data);
    }

    return res.status(200).json(warmup);
};

export const logs = async (req: Request, res: Response): Promise<Response> => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;

    const logs = await WhatsappWarmupLog.findAll({
        where: { whatsappId, companyId },
        order: [["createdAt", "DESC"]],
        limit: 50
    });

    return res.status(200).json(logs);
};
