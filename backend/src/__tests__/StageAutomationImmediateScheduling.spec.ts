const mockAutomationActionFindAll = jest.fn();
const mockAutomationExecutionCreate = jest.fn();
const mockAutomationLogCreate = jest.fn();
const mockCampaignSettingFindAll = jest.fn();

jest.mock("../models/AutomationAction", () => ({
  __esModule: true,
  default: {
    findAll: mockAutomationActionFindAll
  }
}));

jest.mock("../models/AutomationExecution", () => ({
  __esModule: true,
  default: {
    create: mockAutomationExecutionCreate
  }
}));

jest.mock("../models/AutomationLog", () => ({
  __esModule: true,
  default: {
    create: mockAutomationLogCreate
  }
}));

jest.mock("../models/CampaignSetting", () => ({
  __esModule: true,
  default: {
    findAll: mockCampaignSettingFindAll
  }
}));

jest.mock("../models/Opportunity", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockResolvedValue(null)
  }
}));

jest.mock("../models/CrmLead", () => ({
  __esModule: true,
  default: {}
}));

jest.mock("../services/TicketServices/UpdateTicketService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../services/QuickSendServices/QuickSendMessageEngineService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../services/WbotServices/SendWhatsAppMessage", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../libs/socket", () => ({
  getIO: jest.fn(() => ({ emit: jest.fn() }))
}));

jest.mock("../services/AutomationServices/AutomationConditionService", () => ({
  evaluateCondition: jest.fn().mockResolvedValue({ pass: true, reason: "always" }),
  normalizeCondition: jest.fn(() => ({ type: "always", stopIfFalse: false })),
  normalizeFlowControl: jest.fn((flow: any) => ({
    stopAfterExecute: flow?.stopAfterExecute === true,
    skipIfAlreadyExecuted: flow?.skipIfAlreadyExecuted !== false
  })),
  getEffectiveActionUid: jest.fn((action: any) => action.actionUid || `id:${action.id}`),
  hasExecutedInCycle: jest.fn().mockResolvedValue(false),
  recordStageAutomationLog: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

import { processAutomationForContact } from "../services/AutomationServices/ProcessAutomationService";

describe("Stage automation immediate scheduling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCampaignSettingFindAll.mockResolvedValue([
      { key: "messageInterval", value: "20" },
      { key: "domingo", value: "false" },
      { key: "startHour", value: "08:00" },
      { key: "endHour", value: "18:00" }
    ]);
    mockAutomationExecutionCreate.mockImplementation(async payload => ({
      id: 9001,
      ...payload
    }));
    mockAutomationLogCreate.mockResolvedValue({ id: 1 });
  });

  it("schedules crm_stage send_message with delay 0 due now without messageInterval", async () => {
    const action = {
      id: 77,
      actionType: "send_message",
      actionConfig: {
        messageType: "buttons",
        message: "Oi {{firstName}}",
        whatsappId: 43,
        buttons: [{ displayText: "Sim", type: "reply", value: "yes" }]
      },
      delayMinutes: 0,
      order: 0,
      condition: null,
      flowControl: { skipIfAlreadyExecuted: false }
    };
    mockAutomationActionFindAll.mockResolvedValue([action]);

    const automation = {
      id: 7,
      companyId: 1,
      triggerType: "crm_stage",
      triggerConfig: { stageId: 3 },
      actions: [action]
    } as any;
    const contact = { id: 5, companyId: 1, number: "5511999999999" } as any;
    const ticket = { id: 10, companyId: 1, contactId: 5, whatsappId: 43 } as any;
    const before = Date.now();

    await processAutomationForContact(automation, contact, ticket, 99, {
      cycleId: "cycle-1",
      expectedStageId: 3,
      cycleStartedAt: new Date(before)
    });

    expect(mockAutomationExecutionCreate).toHaveBeenCalledTimes(1);
    const payload = mockAutomationExecutionCreate.mock.calls[0][0];
    expect(payload.status).toBe("scheduled");
    expect(payload.metadata.actionType).toBe("send_message");
    expect(payload.metadata.opportunityId).toBe(99);
    expect(payload.scheduledAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(payload.scheduledAt.getTime()).toBeLessThanOrEqual(before + 5000);
  });
});
