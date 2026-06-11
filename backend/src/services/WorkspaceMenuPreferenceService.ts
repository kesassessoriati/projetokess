import CompanyWorkspaceMenuPreference from "../models/CompanyWorkspaceMenuPreference";
import {
  WORKSPACE_MENU_OPTIONS,
  WorkspaceMenuOption
} from "../constants/workspaceMenuOptions";

export type MenuPreferencesMap = Record<string, boolean>;

export interface LegacyWorkspacePreference {
  companyId: number;
  userId: number;
  menuKey: string;
  visible: boolean;
  updatedAt: Date | string;
  id?: number;
  userProfile?: string;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const coerceVisible = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

export const normalizeMenuPreferences = (input?: unknown): MenuPreferencesMap => {
  const source = isObject(input) ? input : {};

  return WORKSPACE_MENU_OPTIONS.reduce((acc, option) => {
    const rawValue = Object.prototype.hasOwnProperty.call(source, option.menuKey)
      ? source[option.menuKey]
      : option.defaultVisible;

    acc[option.menuKey] = option.protected
      ? true
      : coerceVisible(rawValue, option.defaultVisible);

    return acc;
  }, {} as MenuPreferencesMap);
};

export const serializeMenuOptions = (
  menus: MenuPreferencesMap
): Array<WorkspaceMenuOption & { visible: boolean }> =>
  WORKSPACE_MENU_OPTIONS.map(option => ({
    ...option,
    visible: menus[option.menuKey] !== false
  }));

export const rowsToMenuMap = (rows: Array<{ menuKey: string; visible: boolean }>): MenuPreferencesMap =>
  rows.reduce((acc, row) => {
    acc[row.menuKey] = Boolean(row.visible);
    return acc;
  }, {} as MenuPreferencesMap);

export const persistCompanyMenuPreferences = async (
  companyId: number,
  menus: MenuPreferencesMap
): Promise<void> => {
  await Promise.all(
    WORKSPACE_MENU_OPTIONS.map(option =>
      CompanyWorkspaceMenuPreference.upsert({
        companyId,
        menuKey: option.menuKey,
        visible: menus[option.menuKey] !== false
      })
    )
  );
};

export const getCompanyMenuPreferences = async (companyId: number): Promise<MenuPreferencesMap> => {
  const saved = await CompanyWorkspaceMenuPreference.findAll({
    where: { companyId },
    attributes: ["menuKey", "visible"]
  });

  const savedMap = rowsToMenuMap(saved);
  const menus = normalizeMenuPreferences(savedMap);
  const shouldRepairSavedState = WORKSPACE_MENU_OPTIONS.some(
    option =>
      !Object.prototype.hasOwnProperty.call(savedMap, option.menuKey) ||
      savedMap[option.menuKey] !== menus[option.menuKey]
  );

  if (shouldRepairSavedState) {
    await persistCompanyMenuPreferences(companyId, menus);
  }

  return menus;
};

export const saveCompanyMenuPreferences = async (
  companyId: number,
  payload: unknown
): Promise<MenuPreferencesMap> => {
  const menus = normalizeMenuPreferences(payload);
  await persistCompanyMenuPreferences(companyId, menus);
  return menus;
};

export const buildMenuPreferencesResponse = (menus: MenuPreferencesMap) => ({
  menus,
  options: serializeMenuOptions(menus)
});

export const pickLegacyMenuPreferencesForMigration = (
  rows: LegacyWorkspacePreference[]
): MenuPreferencesMap => {
  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.menuKey]) acc[row.menuKey] = [];
    acc[row.menuKey].push(row);
    return acc;
  }, {} as Record<string, LegacyWorkspacePreference[]>);

  const selected = Object.entries(grouped).reduce((acc, [menuKey, candidates]) => {
    const sorted = [...candidates].sort((a, b) => {
      const aAdmin = a.userProfile === "admin" || a.userProfile === "super" ? 0 : 1;
      const bAdmin = b.userProfile === "admin" || b.userProfile === "super" ? 0 : 1;
      if (aAdmin !== bAdmin) return aAdmin - bAdmin;

      const bTime = new Date(b.updatedAt).getTime();
      const aTime = new Date(a.updatedAt).getTime();
      if (bTime !== aTime) return bTime - aTime;

      return (b.id || 0) - (a.id || 0);
    });

    acc[menuKey] = sorted[0]?.visible;
    return acc;
  }, {} as Record<string, boolean>);

  return normalizeMenuPreferences(selected);
};
