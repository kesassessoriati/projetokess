const mockSubscribe = jest.fn();
const mockAutomationFindAll = jest.fn();
const mockAutomationExecutionFindOne = jest.fn();
const mockResolveOpportunityAutomationContext = jest.fn();
const mockProcessAutomationForContact = jest.fn();

jest.mock("../libs/EventBus", () => ({
  __esModule: true,
  default: {
    subscribe: mockSubscribe
  }
}));

jest.mock("../models/Automation", () => ({
  __esModule: true,
  default: {
    findAll: mockAutomationFindAll
  }
}));

jest.mock("../models/AutomationExecution", () => ({
  __esModule: true,
  default: {
    findOne: mockAutomationExecutionFindOne
  }
}));

jest.mock("../models/Opportunity", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock("../models/Contact", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

jest.mock("../services/AutomationServices/ProcessAutomationService", () => ({
  processAutomationForContact: mockProcessAutomationForContact,
  resolveOpportunityAutomationContext: mockResolveOpportunityAutomationContext
}));

jest.mock("uuid", () => ({
  v4: () => "cycle-created"
}));

import { StageAutomationService } from "../services/AutomationServices/StageAutomationService";

const actions = [
  { id: 75, actionType: "add_tag", order: 0, delayMinutes: 3 },
  { id: 76, actionType: "move_lead", order: 1, delayMinutes: 5 },
  { id: 77, actionType: "send_message", order: 2, delayMinutes: 9 }
];

const automation = {
  id: 7,
  companyId: 171,
  triggerType: "crm_stage",
  triggerConfig: { stageId: 55, pipelineId: 18 },
  isActive: true,
  actions
};

describe("StageAutomationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAutomationFindAll.mockResolvedValue([automation]);
    mockAutomationExecutionFindOne.mockResolvedValue(null);
    mockResolveOpportunityAutomationContext.mockResolvedValue({
      opportunity: { id: 110, stageId: 55, leadId: 5579 },
      contact: { id: 2819 },
      ticket: null
    });
  });

  it("subscribes to OPPORTUNITY_CREATED and normalizes stage entry payload", async () => {
    const service = new StageAutomationService();
    const processSpy = jest
      .spyOn(service, "processStageEntryAutomation")
      .mockResolvedValue();

    service.init();

    const createdSubscription = mockSubscribe.mock.calls.find(
      ([eventName]) => eventName === "OPPORTUNITY_CREATED"
    );

    expect(createdSubscription).toBeTruthy();

    await createdSubscription[1]({
      payload: {
        opportunityId: 110,
        companyId: 171,
        pipelineId: 18,
        stageId: 55
      }
    });

    expect(processSpy).toHaveBeenCalledWith({
      opportunityId: 110,
      companyId: 171,
      pipelineId: 18,
      stageId: 55,
      triggerEvent: "OPPORTUNITY_CREATED",
      actorType: "CREATED"
    });
  });

  it("keeps OPPORTUNITY_MOVED processing through the same stage entry flow", async () => {
    const service = new StageAutomationService();
    const processSpy = jest
      .spyOn(service, "processStageEntryAutomation")
      .mockResolvedValue();

    service.init();

    const movedSubscription = mockSubscribe.mock.calls.find(
      ([eventName]) => eventName === "OPPORTUNITY_MOVED"
    );

    await movedSubscription[1]({
      payload: {
        opportunityId: 110,
        companyId: 171,
        pipelineId: 18,
        fromStageId: 54,
        toStageId: 55,
        movedBy: "USER"
      }
    });

    expect(processSpy).toHaveBeenCalledWith({
      opportunityId: 110,
      companyId: 171,
      pipelineId: 18,
      stageId: 55,
      fromStageId: 54,
      triggerEvent: "OPPORTUNITY_MOVED",
      actorType: "USER"
    });
  });

  it("processes OPPORTUNITY_CREATED for a stage with active automation", async () => {
    const service = new StageAutomationService();

    await service.processStageEntryAutomation({
      opportunityId: 110,
      companyId: 171,
      pipelineId: 18,
      stageId: 55,
      triggerEvent: "OPPORTUNITY_CREATED",
      actorType: "CREATED"
    });

    expect(mockAutomationFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 171,
          triggerType: "crm_stage",
          isActive: true
        }
      })
    );
    expect(mockResolveOpportunityAutomationContext).toHaveBeenCalledWith({
      companyId: 171,
      opportunityId: 110,
      actions
    });
    expect(mockProcessAutomationForContact).toHaveBeenCalledWith(
      automation,
      { id: 2819 },
      null,
      110,
      {
        cycleId: "cycle-created",
        expectedStageId: 55,
        cycleStartedAt: expect.any(Date)
      }
    );
  });

  it("does not process OPPORTUNITY_CREATED when the stage has no active automation", async () => {
    mockAutomationFindAll.mockResolvedValue([
      {
        ...automation,
        triggerConfig: { stageId: 56, pipelineId: 18 }
      }
    ]);

    const service = new StageAutomationService();

    await service.processStageEntryAutomation({
      opportunityId: 110,
      companyId: 171,
      pipelineId: 18,
      stageId: 55,
      triggerEvent: "OPPORTUNITY_CREATED",
      actorType: "CREATED"
    });

    expect(mockProcessAutomationForContact).not.toHaveBeenCalled();
  });

  it("deduplicates when CREATED and MOVED arrive for the same opportunity and stage", async () => {
    mockAutomationExecutionFindOne.mockResolvedValue({ id: 999 });

    const service = new StageAutomationService();

    await service.processStageEntryAutomation({
      opportunityId: 110,
      companyId: 171,
      pipelineId: 18,
      stageId: 55,
      triggerEvent: "OPPORTUNITY_CREATED",
      actorType: "CREATED"
    });

    expect(mockAutomationExecutionFindOne).toHaveBeenCalled();
    expect(mockProcessAutomationForContact).not.toHaveBeenCalled();
  });
});
