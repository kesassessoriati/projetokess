import { Request, Response } from "express";
import SearchInternetLeadsService from "../services/FirecrawlService/SearchInternetLeadsService";
import ImportInternetLeadsService from "../services/FirecrawlService/ImportInternetLeadsService";
import {
  getPersonalFirecrawlConfig,
  updatePersonalFirecrawlConfig,
  getGlobalFirecrawlConfig,
  updateGlobalFirecrawlConfig
} from "../services/FirecrawlService/FirecrawlConfigService";

export const showPersonalConfig = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: userId } = req.user;

  const config = await getPersonalFirecrawlConfig(companyId, Number(userId));

  return res.status(200).json(config);
};

export const updatePersonalConfig = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const { apiKey } = req.body;

  const config = await updatePersonalFirecrawlConfig(
    companyId,
    Number(userId),
    apiKey
  );

  return res.status(200).json(config);
};

export const showGlobalConfig = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  const config = await getGlobalFirecrawlConfig();

  return res.status(200).json(config);
};

export const updateGlobalConfig = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { apiKey } = req.body;
  const config = await updateGlobalFirecrawlConfig(apiKey);

  return res.status(200).json(config);
};

export const searchInternetLeads = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const { niche, city, state, country, maxResults } = req.body;

  const result = await SearchInternetLeadsService({
    companyId,
    userId: Number(userId),
    niche,
    city,
    state,
    country,
    maxResults: Number(maxResults) || 5
  });

  return res.status(200).json(result);
};

export const importInternetLeads = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: userId, profile } = req.user;
  const { items, pipelineId, stageId, ownerUserId, niche } = req.body;

  const result = await ImportInternetLeadsService({
    companyId,
    ownerUserId:
      profile === "admin" && ownerUserId ? Number(ownerUserId) : Number(userId),
    pipelineId: Number(pipelineId),
    stageId: Number(stageId),
    niche,
    items
  });

  return res.status(200).json(result);
};
