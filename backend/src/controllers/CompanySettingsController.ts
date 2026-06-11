/**
 * @TercioSantos-0 |
 * controller/get/todas as configurações de 1 empresa |
 * controller/get/1 configuração específica |
 * controller/put/atualização de 1 configuração |
 * @param:companyId
 */
import { Request, Response } from "express";
import FindCompanySettingsService from "../services/CompaniesSettings/FindCompanySettingsService";
import UpdateCompanySettingsService from "../services/CompaniesSettings/UpdateCompanySettingService";
import FindCompanySettingOneService from "../services/CompaniesSettings/FindCompanySettingOneService";
import { isAllowedCompanySettingColumn } from "../constants/companySettingsColumns";
import AppError from "../errors/AppError";
import logger from "../utils/logger";

type IndexGetCompanySettingQuery = {
  companyId: number;
  column: string;
  data:string;
};

type IndexGetCompanySettingOneQuery = {
  column: string;
};

// Valida a coluna recebida e registra tentativa suspeita sem expor schema/SQL/token.
const ensureValidColumn = (req: Request, column: string): void => {
  if (!isAllowedCompanySettingColumn(column)) {
    logger.warn("[CompanySettings] invalid settings column", {
      companyId: req.user?.companyId,
      userId: req.user?.id,
      column
    });
    throw new AppError("Configuração inválida.", 400);
  }
};

export const show = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { companyId } = req.user;

    const settings = await FindCompanySettingsService({
      companyId
    });

    return res.status(200).json(settings);
  };


  export const showOne = async (req: Request, res: Response): Promise<Response> => {
    const { column } = req.query as IndexGetCompanySettingOneQuery;
    const { companyId } = req.user;

    ensureValidColumn(req, column);

    const setting = await FindCompanySettingOneService({
      companyId,
      column
    });

    return res.status(200).json(setting[0]);
  };

  export const showOnePayment = async (req: Request, res: Response): Promise<Response> => {
    const { column } = req.query as IndexGetCompanySettingOneQuery;
    const { companyId } = req.user;

    ensureValidColumn(req, column);

    const setting = await FindCompanySettingOneService({
      companyId,
      column
    });

    return res.status(200).json(setting[0]);
  };

export const update = async(
  req: Request,
  res: Response
): Promise<Response> => {
  const {  column, data } = req.body as IndexGetCompanySettingQuery;
  const { companyId } = req.user;

  ensureValidColumn(req, column);

  const result = await UpdateCompanySettingsService({
    companyId,
    column,
    data
  })

  return res.status(200).json({response:true, result:result});
}
