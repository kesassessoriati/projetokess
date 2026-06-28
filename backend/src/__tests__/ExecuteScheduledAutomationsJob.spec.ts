const mockAutomationExecutionFindAll = jest.fn();
const mockAutomationLogUpdate = jest.fn();
const mockExecuteAction = jest.fn();
const mockResolveOpportunityAutomationContext = jest.fn();

jest.mock("../models/Company", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../models/AutomationExecution", () => ({
  __esModule: true,
  default: {
    findAll: mockAutomationExecutionFindAll
  }
}));

jest.mock("../models/AutomationLog", () => ({
  __esModule: true,
  default: {
    update: mockAutomationLogUpdate
  }
}));

jest.mock("../services/AutomationServices/ProcessAutomationService", () => ({
  executeAction: mockExecuteAction,
  getCampaignSettings: jest.fn(),
  isWithinDispatchHours: jest.fn(),
  resolveOpportunityAutomationContext: mockResolveOpportunityAutomationContext
}));

jest.mock("../services/AutomationServices/TriggerBirthdayService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../services/AutomationServices/TriggerKanbanService", () => ({
  processKanbanTimeAutomations: jest.fn()
}));

jest.mock("../services/AutomationServices/TriggerNoResponseService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

import { executeScheduledAutomations } from "../services/AutomationServices/ExecuteAutomationsJob";

describe("ExecuteScheduledAutomationsJob", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteAction.mockResolvedValue({
      success: true,
      message: "Mensagem enviada com sucesso"
    });
    mockResolveOpportunityAutomationContext.mockResolvedValue({
      contact: { id: 5, companyId: 1, number: "5511999999999" },
      ticket: { id: 10, companyId: 1, contactId: 5, whatsappId: 43 }
    });
    mockAutomationLogUpdate.mockResolvedValue([1]);
  });

  it("picks due AutomationExecution and executes the configured action", async () => {
    const action = {
      id: 77,
      actionType: "send_message",
      actionConfig: {
        messageType: "buttons",
        whatsappId: 43,
        buttons: [{ displayText: "Sim", type: "reply", value: "yes" }]
      },
      flowControl: { skipIfAlreadyExecuted: false },
      condition: null
    };
    const execution = {
      id: 9001,
      automationId: 7,
      automationActionId: 77,
      actionUid: null,
      cycleId: null,
      scheduledAt: new Date(Date.now() - 1000),
      createdAt: new Date(Date.now() - 2000),
      attempts: 0,
      metadata: {
        actionType: "send_message",
        opportunityId: 99,
        expectedStageId: 3
      },
      automationAction: action,
      automation: { id: 7, companyId: 1, triggerType: "crm_stage" },
      contact: { id: 5, companyId: 1, number: "5511999999999" },
      ticket: { id: 10, companyId: 1, contactId: 5, whatsappId: 43 },
      update: jest.fn().mockResolvedValue(undefined)
    } as any;
    mockAutomationExecutionFindAll.mockResolvedValue([execution]);

    await executeScheduledAutomations();

    expect(mockAutomationExecutionFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "scheduled" })
      })
    );
    expect(mockExecuteAction).toHaveBeenCalledWith(
      action,
      expect.objectContaining({ id: 5 }),
      expect.objectContaining({ id: 10 }),
      1,
      99
    );
    expect(execution.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" })
    );
  });
});
