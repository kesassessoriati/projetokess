jest.mock("../models/CompanyWorkspaceMenuPreference", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    upsert: jest.fn()
  }
}));

import CompanyWorkspaceMenuPreference from "../models/CompanyWorkspaceMenuPreference";
import {
  CANONICAL_MENU_KEYS,
  PROTECTED_MENU_KEYS
} from "../constants/workspaceMenuOptions";
import {
  getCompanyMenuPreferences,
  normalizeMenuPreferences,
  pickLegacyMenuPreferencesForMigration,
  saveCompanyMenuPreferences
} from "../services/WorkspaceMenuPreferenceService";

const mockedPreferenceModel = CompanyWorkspaceMenuPreference as any;

describe("WorkspaceMenuPreferenceService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPreferenceModel.findAll.mockResolvedValue([]);
    mockedPreferenceModel.upsert.mockResolvedValue([{}, true]);
  });

  it("normalizes partial payloads into the complete canonical menu set", () => {
    const menus = normalizeMenuPreferences({
      dashboard: false,
      "personalizacao-menus": false
    });

    expect(Object.keys(menus).sort()).toEqual([...CANONICAL_MENU_KEYS].sort());
    expect(menus.dashboard).toBe(false);
    expect(menus.campanhas).toBe(true);
    expect(menus["personalizacao-menus"]).toBe(true);
    expect(menus.configuracoes).toBe(true);
  });

  it("respects complete payload values except protected menu keys", async () => {
    const payload = CANONICAL_MENU_KEYS.reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {} as Record<string, boolean>);

    const menus = await saveCompanyMenuPreferences(10, payload);

    expect(menus.dashboard).toBe(false);
    expect(menus["chat-interno"]).toBe(false);
    expect(menus.configuracoes).toBe(true);
    expect(menus["personalizacao-menus"]).toBe(true);
    expect(mockedPreferenceModel.upsert).toHaveBeenCalledTimes(CANONICAL_MENU_KEYS.length);
  });

  it("ignores unknown payload keys and does not persist them", async () => {
    const menus = await saveCompanyMenuPreferences(10, {
      dashboard: false,
      chave_inexistente: false
    });

    expect(menus).not.toHaveProperty("chave_inexistente");
    expect(mockedPreferenceModel.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ menuKey: "chave_inexistente" })
    );
  });

  it("chooses the newest admin or super legacy preference and falls back to newest general user", () => {
    const menus = pickLegacyMenuPreferencesForMigration([
      {
        companyId: 1,
        userId: 1,
        menuKey: "dashboard",
        visible: false,
        updatedAt: "2026-06-10T20:00:00.000Z",
        id: 1,
        userProfile: "user"
      },
      {
        companyId: 1,
        userId: 2,
        menuKey: "dashboard",
        visible: true,
        updatedAt: "2026-06-10T19:00:00.000Z",
        id: 2,
        userProfile: "admin"
      },
      {
        companyId: 1,
        userId: 3,
        menuKey: "chat-interno",
        visible: false,
        updatedAt: "2026-06-10T18:00:00.000Z",
        id: 3,
        userProfile: "user"
      },
      {
        companyId: 1,
        userId: 4,
        menuKey: "chat-interno",
        visible: true,
        updatedAt: "2026-06-10T19:00:00.000Z",
        id: 4,
        userProfile: "user"
      },
      {
        companyId: 1,
        userId: 5,
        menuKey: "configuracoes",
        visible: false,
        updatedAt: "2026-06-10T21:00:00.000Z",
        id: 5,
        userProfile: "admin"
      }
    ]);

    expect(menus.dashboard).toBe(true);
    expect(menus["chat-interno"]).toBe(true);
    expect(menus.campanhas).toBe(true);
    expect(menus.configuracoes).toBe(true);
  });

  it("uses company scope so two users in the same company read the same preferences", async () => {
    mockedPreferenceModel.findAll.mockResolvedValue([
      { menuKey: "dashboard", visible: false },
      { menuKey: "configuracoes", visible: true }
    ]);

    const userA = await getCompanyMenuPreferences(180);
    const userB = await getCompanyMenuPreferences(180);

    expect(userA).toEqual(userB);
    expect(userA.dashboard).toBe(false);
    expect(mockedPreferenceModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 180 } })
    );
    expect(mockedPreferenceModel.findAll).toHaveBeenCalledTimes(2);
  });

  it("keeps all protected keys visible", () => {
    const menus = normalizeMenuPreferences(
      PROTECTED_MENU_KEYS.reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>)
    );

    PROTECTED_MENU_KEYS.forEach(key => expect(menus[key]).toBe(true));
  });
});
