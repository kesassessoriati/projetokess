const mockFindByPk = jest.fn();

jest.mock("../models/Company", () => ({
  __esModule: true,
  default: {
    findByPk: mockFindByPk
  }
}));

const buildCompany = ({
  aiDailyCredits,
  aiCredits = 0,
  used = 0,
  lastReset = "2026-06-25"
}: {
  aiDailyCredits?: number;
  aiCredits?: number;
  used?: number;
  lastReset?: string;
}) => ({
  plan: { aiDailyCredits, aiCredits },
  aiCreditsUsed: used,
  aiCreditsLastReset: lastReset,
  update: jest.fn(),
  reload: jest.fn(),
  increment: jest.fn()
});

describe("AiCreditService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-06-25T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("trata limite zero como creditos ilimitados", async () => {
    const company = buildCompany({ aiDailyCredits: 0, used: 5000 });
    mockFindByPk.mockResolvedValue(company);

    const { getCreditInfo } = await import("../services/AiCreditService/AiCreditService");
    const creditInfo = await getCreditInfo(180);

    expect(creditInfo).toEqual({
      allowed: 0,
      used: 5000,
      remaining: 0,
      hasCredits: true
    });
  });

  it("bloqueia quando limite diario finito foi consumido", async () => {
    const company = buildCompany({ aiDailyCredits: 10, used: 10 });
    mockFindByPk.mockResolvedValue(company);

    const { getCreditInfo } = await import("../services/AiCreditService/AiCreditService");
    const creditInfo = await getCreditInfo(180);

    expect(creditInfo).toEqual({
      allowed: 10,
      used: 10,
      remaining: 0,
      hasCredits: false
    });
  });
});
