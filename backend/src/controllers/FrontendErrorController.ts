import { Request, Response } from "express";
import CreateFrontendErrorService from "../services/FrontendErrorServices/CreateFrontendErrorService";
import ListFrontendErrorsService from "../services/FrontendErrorServices/ListFrontendErrorsService";
import FrontendError from "../models/FrontendError";
import AppError from "../errors/AppError";

export const store = async (req: Request, res: Response): Promise<Response> => {
    const {
        message,
        stack,
        componentStack,
        url,
        userId,
        companyId,
        userAgent
    } = req.body;

    const frontendError = await CreateFrontendErrorService({
        message,
        stack,
        componentStack,
        url,
        userId,
        companyId,
        userAgent
    });

    return res.status(200).json(frontendError);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, severity, status, dateFrom, dateTo, pageNumber } = req.query;

    const { frontendErrors, count, hasMore } = await ListFrontendErrorsService({
        companyId: companyId as string,
        severity: severity as string,
        status: status as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        pageNumber: pageNumber as string
    });

    return res.json({ frontendErrors, count, hasMore });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    const { errorId } = req.params;
    const { status } = req.body;

    const error = await FrontendError.findByPk(errorId);

    if (!error) {
        throw new AppError("ERR_NO_FRONTEND_ERROR_FOUND", 404);
    }

    await error.update({ status });

    return res.status(200).json(error);
};
