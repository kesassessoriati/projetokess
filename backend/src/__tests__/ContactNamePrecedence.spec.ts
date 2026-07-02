/**
 * Fase D — Precedência do nome comercial.
 *
 * 1) Nome manual do CRM  2) Nome do Lead  3) Cliente/Empresa  4) Contact.name
 * 5) pushName do WhatsApp somente como fallback (nunca sobrescreve 1–2).
 *
 * Cobre o helper canApplyIncomingWhatsAppName (usado nos 3 pontos do
 * CreateOrUpdateContactService) e o PropagateLeadNameService (rename do lead
 * → Opportunity.title OPEN + Contact.name quando não-manual).
 */

jest.mock("../models/Contact", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));
jest.mock("../models/CrmLead", () => ({
  __esModule: true,
  default: {}
}));
jest.mock("../models/Opportunity", () => ({
  __esModule: true,
  default: { update: jest.fn() }
}));
jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

import Contact from "../models/Contact";
import Opportunity from "../models/Opportunity";
import { canApplyIncomingWhatsAppName } from "../services/ContactServices/contactNameRules";
import PropagateLeadNameService from "../services/CrmSyncService/PropagateLeadNameService";

const mockedContact = Contact as any;
const mockedOpportunity = Opportunity as any;

describe("canApplyIncomingWhatsAppName — pushName como fallback", () => {
  it("1. pushName NÃO sobrescreve nome manual (isManualName=true)", () => {
    const contact = {
      name: "5511999999999", // até genérico, mas manual vence
      number: "5511999999999",
      isManualName: true
    };
    expect(canApplyIncomingWhatsAppName(contact, "Push Aleatório")).toBe(false);
  });

  it("2. pushName NÃO sobrescreve nome comercial vindo do Lead (não-genérico)", () => {
    const contact = {
      name: "TEC CODE TI",
      number: "5577988272902",
      isManualName: false
    };
    expect(canApplyIncomingWhatsAppName(contact, "William pushName")).toBe(false);
  });

  it("pushName PODE preencher nome vazio/genérico quando não-manual", () => {
    expect(
      canApplyIncomingWhatsAppName(
        { name: "", number: "5511988887777", isManualName: false },
        "William Wilmer"
      )
    ).toBe(true);
    expect(
      canApplyIncomingWhatsAppName(
        { name: "5511988887777", number: "5511988887777", isManualName: false },
        "William Wilmer"
      )
    ).toBe(true);
  });

  it("grupos: subject atualiza nome não-manual, mas NUNCA o manual", () => {
    expect(
      canApplyIncomingWhatsAppName(
        { name: "Grupo Antigo", number: "123@g.us", isManualName: false },
        "Grupo Novo",
        { isGroup: true }
      )
    ).toBe(true);
    expect(
      canApplyIncomingWhatsAppName(
        { name: "Nome Manual do Grupo", number: "123@g.us", isManualName: true },
        "Grupo Novo",
        { isGroup: true }
      )
    ).toBe(false);
  });

  it("nome vazio ou igual ao atual nunca aplica", () => {
    expect(
      canApplyIncomingWhatsAppName({ name: "X", number: "1" }, "")
    ).toBe(false);
    expect(
      canApplyIncomingWhatsAppName({ name: "X", number: "1" }, "X")
    ).toBe(false);
  });
});

describe("PropagateLeadNameService — rename do Lead", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedOpportunity.update.mockResolvedValue([2]);
    mockedContact.findOne.mockResolvedValue(null);
  });

  it("3. atualiza Opportunity.title de TODAS as oportunidades OPEN do lead", async () => {
    const result = await PropagateLeadNameService({
      leadId: 9,
      companyId: 1,
      contactId: null,
      newName: "TEC CODE TI",
      previousName: "Nome Antigo"
    });

    expect(mockedOpportunity.update).toHaveBeenCalledWith(
      { title: "TEC CODE TI" },
      { where: { leadId: 9, companyId: 1, status: "OPEN" } }
    );
    expect(result.opportunitiesUpdated).toBe(2);
  });

  it("4. atualiza Contact.name quando isManualName=false", async () => {
    const contact = {
      id: 5,
      name: "pushName Velho",
      isManualName: false,
      update: jest.fn().mockResolvedValue(undefined)
    };
    mockedContact.findOne.mockResolvedValue(contact);

    const result = await PropagateLeadNameService({
      leadId: 9,
      companyId: 1,
      contactId: 5,
      newName: "TEC CODE TI",
      previousName: "Nome Antigo"
    });

    expect(contact.update).toHaveBeenCalledWith({ name: "TEC CODE TI" });
    expect(result.contactUpdated).toBe(true);
  });

  it("5. NÃO atualiza Contact.name quando isManualName=true", async () => {
    const contact = {
      id: 5,
      name: "Nome Manual",
      isManualName: true,
      update: jest.fn()
    };
    mockedContact.findOne.mockResolvedValue(contact);

    const result = await PropagateLeadNameService({
      leadId: 9,
      companyId: 1,
      contactId: 5,
      newName: "TEC CODE TI",
      previousName: "Nome Antigo"
    });

    expect(contact.update).not.toHaveBeenCalled();
    expect(result.contactUpdated).toBe(false);
  });

  it("6. nome igual ao anterior não propaga nada (preserva estado)", async () => {
    const result = await PropagateLeadNameService({
      leadId: 9,
      companyId: 1,
      contactId: 5,
      newName: "TEC CODE TI",
      previousName: "TEC CODE TI"
    });

    expect(mockedOpportunity.update).not.toHaveBeenCalled();
    expect(mockedContact.findOne).not.toHaveBeenCalled();
    expect(result).toEqual({ opportunitiesUpdated: 0, contactUpdated: false });
  });

  it("7. Kanban recebe o nome correto: title dos cards OPEN = nome do lead", async () => {
    await PropagateLeadNameService({
      leadId: 9,
      companyId: 1,
      newName: "  TEC CODE TI  ",
      previousName: "Velho"
    });

    // trim aplicado; board exibe lead.name || op.title → ambos convergem
    expect(mockedOpportunity.update).toHaveBeenCalledWith(
      { title: "TEC CODE TI" },
      expect.objectContaining({ where: expect.objectContaining({ status: "OPEN" }) })
    );
  });

  it("multiempresa: companyId sempre na cláusula where", async () => {
    await PropagateLeadNameService({
      leadId: 9,
      companyId: 77,
      contactId: 5,
      newName: "Novo Nome",
      previousName: "Velho"
    });

    expect(mockedOpportunity.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ where: expect.objectContaining({ companyId: 77 }) })
    );
    expect(mockedContact.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5, companyId: 77 } })
    );
  });
});
