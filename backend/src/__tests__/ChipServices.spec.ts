import {
  applyChipLevelPreset,
  calculateChipHealth,
  calculatePredictedBlockAt
} from "../services/ChipServices/ChipMonitoringService";
import { resolveDispatchWhatsapp } from "../services/ChipServices/ChipRoutingService";

jest.mock("../services/ChipServices/ChipMonitoringService", () => {
  const original = jest.requireActual("../services/ChipServices/ChipMonitoringService");
  return {
    ...original,
    getAvailableDispatchChips: jest.fn()
  };
});

const { getAvailableDispatchChips } = jest.requireMock("../services/ChipServices/ChipMonitoringService");

describe("Chip services", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("applies warmup preset based on chip level", () => {
    const preset = applyChipLevelPreset({ warmupLevel: 4 } as any);

    expect(preset.warmupLevel).toBe(4);
    expect(preset.warmupMessageLimit).toBe(80);
    expect(preset.warmupMinInterval).toBe(6);
    expect(preset.warmupMaxInterval).toBe(12);
  });

  it("calculates predicted block date from recharge data", () => {
    expect(calculatePredictedBlockAt("2026-03-10", 30)).toBe("2026-04-09");
  });

  it("returns high health for stable connected chips", () => {
    const chip = {
      status: "active",
      sessionStatus: "CONNECTED",
      predictedBlockAt: "2026-04-30",
      lastConnectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      activationDate: "2025-12-01",
      createdAt: new Date("2025-12-01"),
      messagesSentToday: 35,
      warmupMessageLimit: 55,
      disconnectCount: 0,
      whatsappId: 9
    };

    const result = calculateChipHealth(chip as any, { status: "CONNECTED" } as any);

    expect(result.healthScore).toBeGreaterThanOrEqual(80);
    expect(result.blockingRiskLevel).toBe("low");
    expect(result.healthStatus).toBe("saudavel");
  });

  it("returns medium risk for chips close to recharge expiration", () => {
    const closeDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const chip = {
      status: "active",
      sessionStatus: "CONNECTED",
      predictedBlockAt: closeDate,
      lastConnectedAt: new Date(Date.now() - 60 * 60 * 1000),
      activationDate: "2026-03-01",
      createdAt: new Date("2026-03-01"),
      messagesSentToday: 5,
      warmupMessageLimit: 30,
      disconnectCount: 0,
      whatsappId: 4
    };

    const result = calculateChipHealth(chip as any, { status: "CONNECTED" } as any);

    expect(result.blockingRiskLevel).toBe("medium");
    expect(result.healthScore).toBeLessThan(85);
  });

  it("rotates whatsapp connections by chip in round robin mode", async () => {
    getAvailableDispatchChips.mockResolvedValue([
      { id: 1, whatsappId: 10 },
      { id: 2, whatsappId: 11 },
      { id: 3, whatsappId: 12 }
    ]);

    const result = await resolveDispatchWhatsapp({
      companyId: 1,
      dispatchMode: "round_robin",
      chipIds: [1, 2, 3],
      fallbackWhatsappId: 99,
      rotationCursor: 1
    });

    expect(result.whatsappId).toBe(11);
    expect(result.nextCursor).toBe(2);
  });

  it("falls back to fixed whatsapp when no chip is available", async () => {
    getAvailableDispatchChips.mockResolvedValue([]);

    const result = await resolveDispatchWhatsapp({
      companyId: 1,
      dispatchMode: "round_robin",
      chipIds: [1, 2],
      fallbackWhatsappId: 77,
      rotationCursor: 0
    });

    expect(result.whatsappId).toBe(77);
    expect(result.chip).toBeNull();
  });
});
