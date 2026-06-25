const mockBuildTicketCopilotContextService = jest.fn();
const mockGetCreditInfo = jest.fn();
const mockGetCompanyAiSettings = jest.fn();
const mockResolveAIProviderConfig = jest.fn();
const mockFinalizeAIUsage = jest.fn();
const mockCompletionCreate = jest.fn();

jest.mock("../services/TicketCopilot/BuildTicketCopilotContextService", () => ({
  __esModule: true,
  default: mockBuildTicketCopilotContextService,
  buildCopilotContextHeader: jest.fn(() => "Ticket ID: 10\nContato: Cliente"),
  getUserWithQueues: jest.fn()
}));

jest.mock("../services/AiCreditService/AiCreditService", () => ({
  getCreditInfo: mockGetCreditInfo
}));

jest.mock("../services/AIProviderService/AIProviderService", () => ({
  getCompanyAiSettings: mockGetCompanyAiSettings,
  resolveAIProviderConfig: mockResolveAIProviderConfig,
  finalizeAIUsage: mockFinalizeAIUsage,
  getProviderDisplayName: jest.fn(() => "OpenAI")
}));

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCompletionCreate
      }
    }
  }))
}));

import RunTicketCopilotService from "../services/TicketCopilot/RunTicketCopilotService";

const baseContext = {
  ticket: { id: 10 },
  contact: { id: 20, name: "Cliente" },
  queue: null,
  user: null,
  messagesText: "2026-06-25T12:00:00.000Z - Cliente: Ola",
  messageCount: 1,
  contextChars: 44,
  lastInboundMessage: "Ola"
};

const baseRequest = {
  ticketId: 10,
  companyId: 180,
  user: { id: 7, companyId: 180, profile: "admin" } as any,
  action: "suggest_reply" as const
};

describe("RunTicketCopilotService credits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildTicketCopilotContextService.mockResolvedValue(baseContext);
    mockGetCreditInfo.mockResolvedValue({
      allowed: 1000,
      used: 10,
      remaining: 990,
      hasCredits: true
    });
    mockGetCompanyAiSettings.mockResolvedValue({
      preferredProvider: "openai",
      creditInfo: { allowed: 1000, used: 10, remaining: 990, hasCredits: true }
    });
    mockResolveAIProviderConfig.mockResolvedValue({
      provider: "openai",
      model: "gpt-4o-mini",
      usageMode: "own",
      apiKey: "test-key",
      shouldConsumeCredits: false
    });
    mockFinalizeAIUsage.mockResolvedValue({
      allowed: 1000,
      used: 11,
      remaining: 989,
      hasCredits: true
    });
    mockCompletionCreate.mockResolvedValue({
      choices: [{ message: { content: "Resposta sugerida" } }],
      usage: { total_tokens: 42 }
    });
  });

  it("consome 1 credito quando gera sugestao com sucesso", async () => {
    const result = await RunTicketCopilotService(baseRequest);

    expect(mockGetCreditInfo).toHaveBeenCalledWith(180);
    expect(mockCompletionCreate).toHaveBeenCalledTimes(1);
    expect(mockFinalizeAIUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 180,
        requestType: "ticket_copilot",
        status: "success",
        forceCreditConsumption: true,
        metadata: expect.objectContaining({
          origin: "copilot",
          action: "suggest_reply",
          ticketId: 10
        })
      })
    );
    expect(result.creditInfo).toEqual(
      expect.objectContaining({ used: 11, remaining: 989 })
    );
  });

  it("consome 1 credito quando gera resumo com sucesso", async () => {
    await RunTicketCopilotService({ ...baseRequest, action: "summarize" });

    expect(mockFinalizeAIUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        forceCreditConsumption: true,
        metadata: expect.objectContaining({ action: "summarize" })
      })
    );
  });

  it("duas chamadas seguidas consomem dois creditos", async () => {
    await RunTicketCopilotService(baseRequest);
    await RunTicketCopilotService({ ...baseRequest, action: "summarize" });

    expect(mockFinalizeAIUsage).toHaveBeenCalledTimes(2);
    expect(mockCompletionCreate).toHaveBeenCalledTimes(2);
  });

  it("bloqueia sem saldo antes de chamar provider e nao consome credito", async () => {
    mockGetCreditInfo.mockResolvedValue({
      allowed: 1000,
      used: 1000,
      remaining: 0,
      hasCredits: false
    });

    await expect(RunTicketCopilotService(baseRequest)).rejects.toMatchObject({
      statusCode: 402
    });

    expect(mockCompletionCreate).not.toHaveBeenCalled();
    expect(mockFinalizeAIUsage).not.toHaveBeenCalled();
  });

  it("permite plano ilimitado quando allowed e zero", async () => {
    mockGetCreditInfo.mockResolvedValue({
      allowed: 0,
      used: 5000,
      remaining: 0,
      hasCredits: true
    });

    await RunTicketCopilotService(baseRequest);

    expect(mockCompletionCreate).toHaveBeenCalledTimes(1);
    expect(mockFinalizeAIUsage).toHaveBeenCalledWith(
      expect.objectContaining({ forceCreditConsumption: true })
    );
  });

  it("request invalida falha antes do provider e nao consome credito", async () => {
    await expect(
      RunTicketCopilotService({ ...baseRequest, action: "invalid" as any })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockBuildTicketCopilotContextService).not.toHaveBeenCalled();
    expect(mockCompletionCreate).not.toHaveBeenCalled();
    expect(mockFinalizeAIUsage).not.toHaveBeenCalled();
  });

  it("falha de validacao de contexto nao consome credito", async () => {
    mockBuildTicketCopilotContextService.mockResolvedValue({
      ...baseContext,
      messagesText: ""
    });

    await expect(
      RunTicketCopilotService({ ...baseRequest, action: "summarize" })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockCompletionCreate).not.toHaveBeenCalled();
    expect(mockFinalizeAIUsage).not.toHaveBeenCalled();
  });
});
