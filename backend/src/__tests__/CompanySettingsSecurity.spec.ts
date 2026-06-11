jest.mock("../models/CompaniesSettings", () => ({
  __esModule: true,
  default: {
    update: jest.fn(),
    findOne: jest.fn()
  }
}));

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
}));

import CompaniesSettings from "../models/CompaniesSettings";
import UpdateCompanySettingsService from "../services/CompaniesSettings/UpdateCompanySettingService";
import FindCompanySettingOneService from "../services/CompaniesSettings/FindCompanySettingOneService";
import * as CompanySettingsController from "../controllers/CompanySettingsController";
import AppError from "../errors/AppError";

const mockedModel = CompaniesSettings as any;

const buildRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("CompanySettings — proteção contra SQL Injection (C-01/C-02)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedModel.update.mockResolvedValue([1]);
    mockedModel.findOne.mockResolvedValue({
      get: () => ({ enableLGPD: "enabled" })
    });
  });

  // Teste 1 — update válido
  it("atualiza somente a coluna permitida da empresa do usuário", async () => {
    await UpdateCompanySettingsService({
      companyId: 42,
      column: "enableLGPD",
      data: "enabled"
    });

    expect(mockedModel.update).toHaveBeenCalledTimes(1);
    expect(mockedModel.update).toHaveBeenCalledWith(
      { enableLGPD: "enabled" },
      { where: { companyId: 42 } }
    );
  });

  // Teste 2 — leitura válida
  it("lê somente o valor da empresa do usuário", async () => {
    const result = await FindCompanySettingOneService({
      companyId: 42,
      column: "enableLGPD"
    });

    expect(mockedModel.findOne).toHaveBeenCalledWith({
      where: { companyId: 42 },
      attributes: ["enableLGPD"]
    });
    expect(result[0]).toEqual({ enableLGPD: "enabled" });
  });

  // Teste 3 — coluna inválida (não executa query)
  it("rejeita coluna inexistente com 400 e não executa query", async () => {
    await expect(
      UpdateCompanySettingsService({
        companyId: 42,
        column: "colunaInexistente",
        data: "x"
      })
    ).rejects.toMatchObject({ statusCode: 400, message: "Configuração inválida." });

    expect(mockedModel.update).not.toHaveBeenCalled();
  });

  // Teste 4 — SQL Injection no nome da coluna
  it("rejeita injeção via column e não executa SQL injetado", async () => {
    const payload = `id" FROM "Companies" LIMIT 1--`;

    await expect(
      FindCompanySettingOneService({ companyId: 42, column: payload })
    ).rejects.toBeInstanceOf(AppError);

    expect(mockedModel.findOne).not.toHaveBeenCalled();
  });

  // Teste 5 — SQL Injection no valor (data)
  it("trata data como valor parametrizado, sem múltiplas instruções", async () => {
    const malicious = `abc'; UPDATE "Users" SET profile='super'--`;

    await UpdateCompanySettingsService({
      companyId: 42,
      column: "lgpdMessage",
      data: malicious
    });

    // O valor vai como parâmetro da Model — nunca concatenado em SQL.
    expect(mockedModel.update).toHaveBeenCalledTimes(1);
    expect(mockedModel.update).toHaveBeenCalledWith(
      { lgpdMessage: malicious },
      { where: { companyId: 42 } }
    );
  });

  // Teste 6 — showOnePayment usa companyId do usuário (não 1)
  it("showOnePayment usa req.user.companyId e não companyId fixo = 1", async () => {
    const req: any = {
      query: { column: "enableLGPD" },
      user: { id: "9", profile: "admin", companyId: 77 }
    };
    const res = buildRes();

    await CompanySettingsController.showOnePayment(req, res);

    expect(mockedModel.findOne).toHaveBeenCalledWith({
      where: { companyId: 77 },
      attributes: ["enableLGPD"]
    });
    expect(mockedModel.findOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 1 } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("showOnePayment rejeita coluna inválida com 400", async () => {
    const req: any = {
      query: { column: `*" FROM "Users"--` },
      user: { id: "9", profile: "admin", companyId: 77 }
    };
    const res = buildRes();

    await expect(
      CompanySettingsController.showOnePayment(req, res)
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockedModel.findOne).not.toHaveBeenCalled();
  });
});
