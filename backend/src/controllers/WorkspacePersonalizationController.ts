import { Request, Response } from "express";
import {
  buildMenuPreferencesResponse,
  getCompanyMenuPreferences,
  saveCompanyMenuPreferences
} from "../services/WorkspaceMenuPreferenceService";

export const showMenuPreferences = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const menus = await getCompanyMenuPreferences(companyId);

  return res.json(buildMenuPreferencesResponse(menus));
};

export const updateMenuPreferences = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const menus = await saveCompanyMenuPreferences(companyId, req.body?.menus);

  return res.json(buildMenuPreferencesResponse(menus));
};
