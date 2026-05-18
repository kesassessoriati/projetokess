import { Request, Response } from "express";
import UserWorkspacePreference from "../models/UserWorkspacePreference";

export const showMenuPreferences = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;

  const preferences = await UserWorkspacePreference.findAll({
    where: { companyId, userId: Number(userId) },
    attributes: ["menuKey", "visible"]
  });

  const menus = preferences.reduce((acc, preference) => {
    acc[preference.menuKey] = Boolean(preference.visible);
    return acc;
  }, {} as Record<string, boolean>);

  return res.json({ menus });
};

export const updateMenuPreferences = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const menus = req.body?.menus || {};
  const entries = Object.entries(menus).filter(([key]) => typeof key === "string" && key.trim() !== "");

  await Promise.all(
    entries.map(([menuKey, visible]) =>
      UserWorkspacePreference.upsert({
        companyId,
        userId: Number(userId),
        menuKey,
        visible: Boolean(visible)
      })
    )
  );

  return showMenuPreferences(req, res);
};
