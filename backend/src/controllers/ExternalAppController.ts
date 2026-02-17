import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import ExternalApp from "../models/ExternalApp";

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;

    const apps = await ExternalApp.findAll({
        where: { companyId, isActive: true },
        order: [["name", "ASC"]]
    });

    return res.json(apps);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const data = req.body;

    const schema = Yup.object().shape({
        name: Yup.string().required(),
        url: Yup.string().required()
    });

    try {
        await schema.validate(data);
    } catch (err: any) {
        throw new AppError(err.message);
    }

    const app = await ExternalApp.create({ ...data, companyId });

    return res.status(200).json(app);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;

    const app = await ExternalApp.findOne({
        where: { id, companyId }
    });

    if (!app) {
        throw new AppError("ERR_NO_APP_FOUND", 404);
    }

    return res.json(app);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;
    const data = req.body;

    const app = await ExternalApp.findOne({
        where: { id, companyId }
    });

    if (!app) {
        throw new AppError("ERR_NO_APP_FOUND", 404);
    }

    await app.update(data);

    return res.status(200).json(app);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;

    const app = await ExternalApp.findOne({
        where: { id, companyId }
    });

    if (!app) {
        throw new AppError("ERR_NO_APP_FOUND", 404);
    }

    await app.destroy();

    return res.status(200).json({ message: "App removed" });
};
