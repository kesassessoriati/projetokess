import { Request, Response } from "express";
import ListBackendErrorsService from "../services/BackendErrorServices/ListBackendErrorsService";
import BackendError from "../models/BackendError";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, severity, status, route, dateFrom, dateTo, pageNumber } = req.query;

    const { backendErrors, count, hasMore } = await ListBackendErrorsService({
        companyId: companyId as string,
        severity: severity as string,
        status: status as string,
        route: route as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        pageNumber: pageNumber as string
    });

    return res.json({ backendErrors, count, hasMore });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    const { errorId } = req.params;
    const { status } = req.body;

    const error = await BackendError.findByPk(errorId);

    if (!error) {
        throw new AppError("ERR_NO_BACKEND_ERROR_FOUND", 404);
    }

    await error.update({ status });

    return res.status(200).json(error);
};
