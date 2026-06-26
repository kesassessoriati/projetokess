jest.mock("../models/CrmLead", () => ({
  __esModule: true,
  default: {
    rawAttributes: {
      position: { field: "position" },
      phone: { field: "phone" },
      score: { field: "score" }
    },
    count: jest.fn()
  }
}));

jest.mock("../models/CrmLeadCustomFieldValue", () => ({
  __esModule: true,
  default: {
    count: jest.fn()
  }
}));

jest.mock("../models/CompanyLeadFieldSetting", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock("../models/LeadTag", () => ({
  __esModule: true,
  default: {
    count: jest.fn()
  }
}));

import CompanyLeadFieldSetting from "../models/CompanyLeadFieldSetting";
import CrmLead from "../models/CrmLead";
import CrmLeadCustomFieldValue from "../models/CrmLeadCustomFieldValue";
import LeadTag from "../models/LeadTag";
import {
  getBlockedDisabledLeadFields,
  getLeadFieldUsage
} from "../services/LeadFieldSettingsService";

const mockedCrmLead = CrmLead as any;
const mockedCustomValue = CrmLeadCustomFieldValue as any;
const mockedCompanyField = CompanyLeadFieldSetting as any;
const mockedLeadTag = LeadTag as any;

describe("LeadFieldSettingsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCrmLead.count.mockResolvedValue(0);
    mockedCustomValue.count.mockResolvedValue(0);
    mockedCompanyField.findOne.mockResolvedValue(null);
    mockedLeadTag.count.mockResolvedValue(0);
  });

  it("allows disabling a standard field without values in the same company", async () => {
    const [usage] = await getLeadFieldUsage(171, [
      { fieldKey: "position", label: "Cargo", fieldType: "text" }
    ]);

    expect(usage).toEqual(
      expect.objectContaining({
        fieldKey: "position",
        usageCount: 0,
        inUse: false,
        canDisable: true
      })
    );
    expect(mockedCrmLead.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: 171 }) })
    );
  });

  it("blocks disabling a standard field that has values", async () => {
    mockedCrmLead.count.mockResolvedValue(12);

    const blocked = await getBlockedDisabledLeadFields(171, [
      { fieldKey: "position", label: "Cargo", fieldType: "text", visible: false }
    ]);

    expect(blocked).toHaveLength(1);
    expect(blocked[0]).toEqual(
      expect.objectContaining({
        fieldKey: "position",
        label: "Cargo",
        usageCount: 12,
        canDisable: false
      })
    );
  });

  it("keeps required fields protected even without values", async () => {
    const [usage] = await getLeadFieldUsage(171, [
      { fieldKey: "phone", label: "Telefone", fieldType: "text", visible: false }
    ]);

    expect(usage.required).toBe(true);
    expect(usage.canDisable).toBe(false);
  });

  it("counts custom field values by company and field id", async () => {
    mockedCustomValue.count.mockResolvedValue(3);

    const [usage] = await getLeadFieldUsage(171, [
      {
        id: 99,
        fieldKey: "custom_cargo_extra",
        label: "Cargo extra",
        fieldType: "text",
        isCustom: true
      }
    ]);

    expect(usage.usageCount).toBe(3);
    expect(usage.canDisable).toBe(false);
    expect(mockedCustomValue.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 171, fieldId: 99 })
      })
    );
  });

  it("counts tag usage through leads from the same company", async () => {
    mockedLeadTag.count.mockResolvedValue(2);

    const [usage] = await getLeadFieldUsage(171, [
      { fieldKey: "tags", label: "Tags", fieldType: "tags" }
    ]);

    expect(usage.usageCount).toBe(2);
    expect(mockedLeadTag.count).toHaveBeenCalledWith(
      expect.objectContaining({
        include: [
          expect.objectContaining({
            where: { companyId: 171 }
          })
        ]
      })
    );
  });
});
