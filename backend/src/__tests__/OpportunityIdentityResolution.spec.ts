const mockContactFindOne = jest.fn();
const mockContactFindOrCreate = jest.fn();
const mockCrmLeadFindOne = jest.fn();
const mockTicketFindOne = jest.fn();

jest.mock("../models/Contact", () => ({
  __esModule: true,
  default: {
    findOne: mockContactFindOne,
    findOrCreate: mockContactFindOrCreate
  }
}));

jest.mock("../models/CrmLead", () => ({
  __esModule: true,
  default: { findOne: mockCrmLeadFindOne }
}));

jest.mock("../models/Ticket", () => ({
  __esModule: true,
  default: { findOne: mockTicketFindOne }
}));

import ResolveOpportunityIdentityService from "../services/OpportunityServices/ResolveOpportunityIdentityService";

describe("ResolveOpportunityIdentityService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTicketFindOne.mockResolvedValue(null);
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
    mockContactFindOne.mockResolvedValue({
      id: 12,
      companyId: 1,
      number: "5511999999999"
    });

    const result = await ResolveOpportunityIdentityService({
      companyId: 1,
      leadId: 22
    });

    expect(result.leadId).toBe(22);
    expect(result.contactId).toBe(12);
    expect(lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: 12 }),
      expect.objectContaining({ transaction: undefined })
    );
  });

  it("rejects leadId with contactId from another contact", async () => {
    mockCrmLeadFindOne.mockResolvedValue({
      id: 22,
      companyId: 1,
      contactId: 99,
      phone: "5511888888888"
    });
    mockContactFindOne.mockResolvedValue({
      id: 12,
      companyId: 1,
      number: "5511999999999"
    });

    await expect(
      ResolveOpportunityIdentityService({
        companyId: 1,
        leadId: 22,
        contactId: 12
      })
    ).rejects.toMatchObject({
      message:
        "Identidade inconsistente: lead e contato pertencem a pessoas diferentes."
    });
  });

  it("rejects ticketId with contactId from another contact", async () => {
    mockTicketFindOne.mockResolvedValue({ id: 7, companyId: 1, contactId: 44 });
    mockContactFindOne.mockImplementation(async ({ where }: any) => ({
      id: where.id,
      companyId: 1,
      number: where.id === 12 ? "5511999999999" : "5511888888888"
    }));

    await expect(
      ResolveOpportunityIdentityService({
        companyId: 1,
        ticketId: 7,
        contactId: 12
      })
    ).rejects.toMatchObject({
      message:
        "Identidade inconsistente: ticket e contato pertencem a pessoas diferentes."
    });
  });

  it("rejects ticketId with leadId from another contact", async () => {
    mockTicketFindOne.mockResolvedValue({ id: 7, companyId: 1, contactId: 44 });
    mockCrmLeadFindOne.mockResolvedValue({
      id: 22,
      companyId: 1,
      contactId: 99,
      phone: "5511999999999"
    });
    mockContactFindOne.mockResolvedValue({
      id: 44,
      companyId: 1,
      number: "5511999999999"
    });

    await expect(
      ResolveOpportunityIdentityService({
        companyId: 1,
        ticketId: 7,
        leadId: 22
      })
    ).rejects.toMatchObject({
      message:
        "Identidade inconsistente: ticket e lead pertencem a pessoas diferentes."
    });
  });

  it("rejects phone that differs from contact number", async () => {
    mockContactFindOne.mockResolvedValue({
      id: 12,
      companyId: 1,
      number: "5511999999999"
    });

    await expect(
      ResolveOpportunityIdentityService({
        companyId: 1,
        contactId: 12,
        phone: "11888888888"
      })
    ).rejects.toMatchObject({
      message:
        "Identidade inconsistente: lead e contato pertencem a pessoas diferentes."
    });
  });

  it("rejects phone that differs from lead phone", async () => {
    mockCrmLeadFindOne.mockResolvedValue({
      id: 22,
      companyId: 1,
      contactId: null,
      phone: "11999999999"
    });

    await expect(
      ResolveOpportunityIdentityService({
        companyId: 1,
        leadId: 22,
        phone: "11888888888"
      })
    ).rejects.toMatchObject({
      message:
        "Identidade inconsistente: lead e contato pertencem a pessoas diferentes."
    });
  });

  it("keeps existing lead contact when webhook phone diverges and no contactId is explicit", async () => {
    mockCrmLeadFindOne.mockResolvedValue({
      id: 22,
      companyId: 1,
      contactId: 12,
      phone: "5511888888888"
    });
    mockContactFindOne.mockResolvedValue({
      id: 12,
      companyId: 1,
      number: "5511999999999"
    });

    const result = await ResolveOpportunityIdentityService({
      companyId: 1,
      leadId: 22,
      phone: "5511777777777"
    });

    expect(result.leadId).toBe(22);
    expect(result.contactId).toBe(12);
    expect(result.normalizedPhone).toBe("5511999999999");
  });

  it("resolves coherent lead, contact and ticket identity", async () => {
    const lead: any = {
      id: 22,
      companyId: 1,
      contactId: 12,
      phone: "11999999999",
      update: jest.fn()
    };
    mockCrmLeadFindOne.mockResolvedValue(lead);
    mockTicketFindOne.mockResolvedValue({ id: 7, companyId: 1, contactId: 12 });
    mockContactFindOne.mockResolvedValue({
      id: 12,
      companyId: 1,
      number: "5511999999999"
    });

    const result = await ResolveOpportunityIdentityService({
      companyId: 1,
      leadId: 22,
      contactId: 12,
      ticketId: 7,
      phone: "(11) 99999-9999"
    });

    expect(result.leadId).toBe(22);
    expect(result.contactId).toBe(12);
  });

  it("rejects missing phone/contact identity", async () => {
    mockContactFindOne.mockResolvedValue(null);
    mockCrmLeadFindOne.mockResolvedValue(null);

    await expect(
      ResolveOpportunityIdentityService({ companyId: 1 })
    ).rejects.toMatchObject({
      message:
        "Não é permitido criar card no funil sem telefone/contato válido."
    });
  });
});
