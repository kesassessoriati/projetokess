import axios from "axios";
import {
  classifyMetaMarketingGraphError,
  createMetaMarketingPausedAd,
  createMetaMarketingPausedAdSet,
  createMetaMarketingPausedCampaign,
  findMetaMarketingObjectByMarker,
  getMetaMarketingAdAccountControl,
  getMetaRateLimitSignals,
  listMetaMarketingCampaignInsights
} from "../services/MetaMarketingServices/MetaMarketingGraphClient";

describe("Meta Marketing Graph client", () => {
  const originalGraphVersion = process.env.META_MARKETING_GRAPH_VERSION;

  beforeEach(() => {
    process.env.META_MARKETING_GRAPH_VERSION = "v99.0";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalGraphVersion === undefined) delete process.env.META_MARKETING_GRAPH_VERSION;
    else process.env.META_MARKETING_GRAPH_VERSION = originalGraphVersion;
  });

  it("parses rate-limit headers without exposing request data", () => {
    expect(getMetaRateLimitSignals({ "x-app-usage": '{"call_count":90}' })).toEqual({
      appUsage: { call_count: 90 },
      adAccountUsage: undefined,
      businessUsage: undefined
    });
  });

  it("classifies unknown upstream failures safely", () => {
    expect(classifyMetaMarketingGraphError(new Error("network"))).toMatchObject({ kind: "upstream" });
  });

  it("prioritizes Meta rate-limit codes over a 403 status", () => {
    const error = Object.assign(new Error("Meta"), {
      isAxiosError: true,
      response: { status: 403, data: { error: { code: 4 } }, headers: {} }
    });
    expect(classifyMetaMarketingGraphError(error)).toMatchObject({ kind: "rate_limit" });
  });

  it("requires reauthorization when Meta rejects an ads permission", () => {
    const error = Object.assign(new Error("Meta"), {
      isAxiosError: true,
      response: { status: 400, data: { error: { code: 200 } }, headers: {} }
    });
    expect(classifyMetaMarketingGraphError(error)).toMatchObject({ kind: "reauthorization_required" });
  });

  it("uses a versioned endpoint, Bearer token, timeout and cursor pagination", async () => {
    // Transport is mocked only here: a real account cannot deterministically
    // provide two cursors (or 100 pages) on every CI run. The real endpoint is
    // exercised in MetaMarketingContractValidation.spec.ts.
    const get = jest.spyOn(axios, "get")
      .mockResolvedValueOnce({
        data: { data: [{ campaign_id: "1", date_start: "2026-09-01" }], paging: { cursors: { after: "cursor-2" } } },
        headers: { "x-app-usage": '{"call_count":1}' }
      } as any)
      .mockResolvedValueOnce({ data: { data: [{ campaign_id: "2", date_start: "2026-09-02" }] }, headers: {} } as any);

    const result = await listMetaMarketingCampaignInsights({
      accessToken: "token-only-in-header",
      externalAccountId: "act_123",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-02",
      attributionWindow: "7d_click"
    });

    expect(result.insights).toHaveLength(2);
    expect(get).toHaveBeenNthCalledWith(1, "https://graph.facebook.com/v99.0/act_123/insights", expect.objectContaining({
      timeout: 15000,
      headers: { Authorization: "Bearer token-only-in-header" },
      params: expect.not.objectContaining({ access_token: expect.anything() })
    }));
    expect(get).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({ params: expect.objectContaining({ after: "cursor-2" }) }));
  });

  it("reads account spend controls with a Bearer token and no write", async () => {
    const get = jest.spyOn(axios, "get").mockResolvedValue({
      data: { account_status: 1, amount_spent: "10", currency: "BRL", disable_reason: 0, spend_cap: "10000" }
    } as any);

    await expect(getMetaMarketingAdAccountControl({ accessToken: "token-only-in-header", externalAccountId: "act_123" })).resolves.toEqual({
      account_status: 1, amount_spent: "10", currency: "BRL", disable_reason: 0, spend_cap: "10000"
    });
    expect(get).toHaveBeenCalledWith("https://graph.facebook.com/v99.0/act_123", expect.objectContaining({
      timeout: 15000,
      headers: { Authorization: "Bearer token-only-in-header" },
      params: { fields: "account_status,amount_spent,currency,disable_reason,spend_cap" }
    }));
  });

  it("creates the three pilot objects paused, with token only in the header", async () => {
    const post = jest.spyOn(axios, "post")
      .mockResolvedValueOnce({ data: { id: "101" } } as any)
      .mockResolvedValueOnce({ data: { id: "102" } } as any)
      .mockResolvedValueOnce({ data: { id: "103" } } as any);
    await createMetaMarketingPausedCampaign({ accessToken: "token", externalAccountId: "act_123", name: "Campaign [marker]", specialAdCategories: ["NONE"] });
    await createMetaMarketingPausedAdSet({
      accessToken: "token", externalAccountId: "act_123", campaignId: "101", name: "Set [marker]", dailyBudgetMinor: "1000",
      pageId: "1", pixelId: "2", countries: ["BR"], ageMin: 18, ageMax: 65, publisherPlatforms: ["facebook"]
    });
    await createMetaMarketingPausedAd({ accessToken: "token", externalAccountId: "act_123", adSetId: "102", creativeId: "3", name: "Ad [marker]" });
    expect(post).toHaveBeenCalledTimes(3);
    expect(post).toHaveBeenNthCalledWith(1, "https://graph.facebook.com/v99.0/act_123/campaigns", expect.stringContaining("status=PAUSED"), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer token" })
    }));
    expect(post.mock.calls[0][1]).toContain("is_adset_budget_sharing_enabled=false");
    expect(post.mock.calls.map(call => call[1]).join("&")).not.toContain("access_token");
    expect(post.mock.calls[1][1]).toContain("OFFSITE_CONVERSIONS");
  });

  it("blocks reconciliation when the marker is active or ambiguous instead of choosing an object", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({
      data: { data: [{ id: "101", name: "Campaign [kes-mm-key]", status: "ACTIVE" }] }
    } as any);
    await expect(findMetaMarketingObjectByMarker({ accessToken: "token", path: "act_123/campaigns", marker: "kes-mm-key" })).rejects.toMatchObject({
      message: "META_MARKETING_RECONCILIATION_REQUIRES_MANUAL_REVIEW"
    });
  });

  it("reconciles only a paused object whose name contains the deterministic marker", async () => {
    const get = jest.spyOn(axios, "get").mockResolvedValue({
      data: { data: [{ id: "101", name: "Campaign [kes-mm-key]", status: "PAUSED" }] }
    } as any);
    await expect(findMetaMarketingObjectByMarker({ accessToken: "token", path: "act_123/campaigns", marker: "kes-mm-key" })).resolves.toBe("101");
    expect(get).toHaveBeenCalledWith("https://graph.facebook.com/v99.0/act_123/campaigns", expect.objectContaining({
      params: expect.objectContaining({ filtering: expect.stringContaining("kes-mm-key") })
    }));
  });

  it("rejects invalid periods before making a request", async () => {
    const get = jest.spyOn(axios, "get");
    await expect(listMetaMarketingCampaignInsights({
      accessToken: "token",
      externalAccountId: "act_123",
      periodStart: "2026-02-30",
      periodEnd: "2026-02-31",
      attributionWindow: "invalid"
    })).rejects.toMatchObject({ message: "META_MARKETING_INSIGHTS_INPUT_INVALID" });
    expect(get).not.toHaveBeenCalled();
  });

  it("rejects a repeated paging cursor instead of looping forever", async () => {
    jest.spyOn(axios, "get")
      .mockResolvedValueOnce({ data: { data: [], paging: { cursors: { after: "same-cursor" } } }, headers: {} } as any)
      .mockResolvedValueOnce({ data: { data: [], paging: { cursors: { after: "same-cursor" } } }, headers: {} } as any);

    await expect(listMetaMarketingCampaignInsights({
      accessToken: "token",
      externalAccountId: "act_123",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-01",
      attributionWindow: "7d_click"
    })).rejects.toMatchObject({ kind: "upstream" });
  });

  it("stops after the 100-page safety cap when Meta keeps returning new cursors", async () => {
    const get = jest.spyOn(axios, "get").mockImplementation(async () => ({
      data: { data: [], paging: { cursors: { after: `cursor-${get.mock.calls.length}` } } },
      headers: {}
    } as any));

    await expect(listMetaMarketingCampaignInsights({
      accessToken: "token",
      externalAccountId: "act_123",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-01",
      attributionWindow: "7d_click"
    })).rejects.toMatchObject({ kind: "upstream" });
    expect(get).toHaveBeenCalledTimes(100);
  });
});
