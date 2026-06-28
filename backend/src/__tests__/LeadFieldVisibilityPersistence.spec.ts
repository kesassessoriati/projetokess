jest.mock("../models/CompanyLeadFieldSetting", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    findOrCreate: jest.fn(),
    upsert: jest.fn()
  }
}));

jest.mock("../services/LeadFieldSettingsService", () => ({
  __esModule: true,
  LeadFieldPayload: {},
  getBlockedDisabledLeadFields: jest.fn(),
  getLeadFieldUsage: jest.fn()
}));

import CompanyLeadFieldSetting from "../models/CompanyLeadFieldSetting";
import {
  getBlockedDisabledLeadFields,
  getLeadFieldUsage
} from "../services/LeadFieldSettingsService";
import { update } from "../controllers/LeadFieldSettingsController";

const mockedModel = CompanyLeadFieldSetting as any;
const mockedBlocked = getBlockedDisabledLeadFields as jest.Mock;
const mockedUsage = getLeadFieldUsage as jest.Mock;

/**
 * Bug B — Desativar um campo do card do lead não ocultava o campo.
 *
 * Causa-raiz: a gravação não persistia visible:false para campos padrão.
 * O model CompanyLeadFieldSetting não declara o índice único composto
 * (company_id, field_key), então o `upsert` do Sequelize não tinha conflict
 * target nessas colunas e acabava inserindo em vez de atualizar a linha — o GET
 * continuava devolvendo visible:true.
 *
 * Fix B1: findOrCreate por (companyId, fieldKey) + update — idempotente e
 * determinístico. Estes testes garantem visible:false persistido, gravação única
 * por (companyId, fieldKey), proteção de obrigatórios e de campos em uso.
 */
const buildRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const buildReq = (fields: any[]) =>
  ({
    user: { companyId: 1 },
    body: { fields }
  } as any);

describe("LeadFieldSettingsController.update — persistência de visibilidade", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBlocked.mockResolvedValue([]);
    mockedUsage.mockResolvedValue([]);
    mockedModel.findAll.mockResolvedValue([]);
    const record = { update: jest.fn().mockResolvedValue(undefined) };
    mockedModel.findOrCreate.mockResolvedValue([record, false]);
    mockedModel.upsert.mockResolvedValue([{}, false]);
  });

  it("persiste visible:false ao desativar um campo padrão (ex.: Cargo/position)", async () => {
    const req = buildReq([
      { fieldKey: "position", label: "Cargo", fieldType: "text", visible: false }
    ]);
    const res = buildRes();

    await update(req, res);

    expect(mockedModel.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 1, fieldKey: "position" }
      })
    );

    const [record] = await mockedModel.findOrCreate.mock.results[0].value;
    expect(record.update).toHaveBeenCalledWith(
      expect.objectContaining({ visible: false })
    );
  });

  it("grava apenas UMA vez por (companyId, fieldKey) — sem duplicar a linha", async () => {
    const req = buildReq([
      { fieldKey: "position", label: "Cargo", fieldType: "text", visible: false }
    ]);
    const res = buildRes();

    await update(req, res);

    const findOrCreateCalls = mockedModel.findOrCreate.mock.calls.filter(
      (c: any[]) => c[0]?.where?.fieldKey === "position"
    );
    expect(findOrCreateCalls).toHaveLength(1);
  });

  it("mantém visible:true ao reativar um campo padrão", async () => {
    const req = buildReq([
      { fieldKey: "position", label: "Cargo", fieldType: "text", visible: true }
    ]);
    const res = buildRes();

    await update(req, res);

    const [record] = await mockedModel.findOrCreate.mock.results[0].value;
    expect(record.update).toHaveBeenCalledWith(
      expect.objectContaining({ visible: true })
    );
  });

  it("força visible:true para campos obrigatórios mesmo se enviado false", async () => {
    const req = buildReq([
      { fieldKey: "name", label: "Nome", fieldType: "text", visible: false }
    ]);
    const res = buildRes();

    await update(req, res);

    const [record] = await mockedModel.findOrCreate.mock.results[0].value;
    expect(record.update).toHaveBeenCalledWith(
      expect.objectContaining({ visible: true })
    );
  });

  it("bloqueia a desativação de campo em uso (ERR_LEAD_FIELD_IN_USE) e não grava", async () => {
    mockedBlocked.mockResolvedValue([
      { fieldKey: "email", label: "E-mail", usageCount: 2, required: false }
    ]);

    const req = buildReq([
      { fieldKey: "email", label: "E-mail", fieldType: "email", visible: false }
    ]);
    const res = buildRes();

    await update(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "ERR_LEAD_FIELD_IN_USE" })
    );
    expect(mockedModel.findOrCreate).not.toHaveBeenCalled();
  });
});
