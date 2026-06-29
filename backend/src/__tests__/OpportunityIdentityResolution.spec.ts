const mockContactFindOne = jest.fn();
const mockContactFindOrCreate = jest.fn();
const mockCrmLeadFindOne = jest.fn();

jest.mock("../models/Contact", () => ({
  __esModule: true,
  default: { findOne: mockContactFindOne, findOrCreate: mockContactFindOrCreate }
}));

jest.mock("../models/CrmLead", () => ({
  __esModule: true,
  default: { findOne: mockCrmLeadFindOne }
}));

jest.mock("../models/Ticket", () => ({
  __esModule: true,
  default: { findOne: jest.fn().mockResolvedValue(null) }
}));

import ResolveOpportunityIdentityService from "../services/OpportunityServices/ResolveOpportunityIdentityService";

describe("ResolveOpportunityIdentityService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes phone and creates contact when needed", async () => {
    mockContactFindOne.mockResolvedValue(null);
    mockCrmLeadFindOne.mockResolvedValue(null);
    mockContactFindOrCreate.mockResolvedValue([
      { id: 12, companyId: 1, number: "5511999999999", name: "William" },
      true
    ]);

    const result = await ResolveOpportunityIdentityService({
      companyId: 1,
      phone: "(11) 99999-9999",
      name: "William"
    });

    expect(result.contactId).toBe(12);
    expect(result.normalizedPhone).toBe("5511999999999");
    expect(mockContactFindOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 1, number: "5511999999999" }
      })
    );
  });

  it("links lead to resolved contact when lead has phone but no contactId", async () => {
    const lead: any = {
      id: 22,
      companyId: 1,
      phone: "11999999999",
      contactId: null,
      update: jest.fn()
    };
    mockCrmLeadFindOne.mockResolvedValueOnce(lead);
    mockContactFindOne.mockResolvedValue({ id: 12, companyId: 1, number: "5511999999999" });

    const result = await ResolveOpportunityIdentityService({
      companyId: 1,
      leadId: 22
    });

    expect(result.leadId).toBe(22);
    expect(result.contactId).toBe(12);
    expect(lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: 12 })
    );
  });

  it("rejects missing phone/contact identity", async () => {
    mockContactFindOne.mockResolvedValue(null);
    mockCrmLeadFindOne.mockResolvedValue(null);

    await expect(
      ResolveOpportunityIdentityService({ companyId: 1 })
    ).rejects.toMatchObject({
      message: "Não é permitido criar card no funil sem telefone/contato válido."
    });
  });
});
