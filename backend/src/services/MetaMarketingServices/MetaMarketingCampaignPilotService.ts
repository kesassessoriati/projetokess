import AppError from "../../errors/AppError";
import { decryptMetaMarketingSecret } from "../../helpers/metaMarketingCrypto";
import MetaAdAccount from "../../models/MetaAdAccount";
import MetaMarketingConnection from "../../models/MetaMarketingConnection";
import { assertCanCreateMetaMarketingCampaign } from "./MetaMarketingOAuthService";
import { getMetaMarketingAdAccountControl, MetaMarketingGraphError } from "./MetaMarketingGraphClient";

export const META_MARKETING_PILOT_TEMPLATE_VERSION = "meta-pilot-v1";

const positiveInteger = (value: string): boolean => /^\d+$/.test(value) && BigInt(value) > BigInt(0);
const numericId = (value: unknown): value is string => typeof value === "string" && /^\d{1,32}$/.test(value);
const specialAdCategories = new Set(["NONE", "CREDIT", "EMPLOYMENT", "HOUSING", "ISSUES_ELECTIONS_POLITICS"]);

export type MetaMarketingPilotTemplateInput = {
  templateVersion?: unknown;
  campaignName?: unknown;
  adSetName?: unknown;
  adName?: unknown;
  objective?: unknown;
  dailyBudgetMinor?: unknown;
  pageId?: unknown;
  creativeId?: unknown;
  specialAdCategories?: unknown;
  conversionLocation?: unknown;
  conversionEvent?: unknown;
  pixelId?: unknown;
  targeting?: unknown;
  placements?: unknown;
};

export type ValidMetaMarketingPilotTemplate = {
  templateVersion: typeof META_MARKETING_PILOT_TEMPLATE_VERSION;
  campaignName: string;
  adSetName: string;
  adName: string;
  objective: "OUTCOME_LEADS";
  dailyBudgetMinor: string;
  pageId: string;
  creativeId: string;
  specialAdCategories: string[];
  conversionLocation: "WEBSITE";
  conversionEvent: "LEAD";
  pixelId: string;
  targeting: { countries: string[]; ageMin: number; ageMax: number };
  placements: { publisherPlatforms: string[] };
};

export const validateMetaMarketingPilotTemplate = (input: MetaMarketingPilotTemplateInput | null | undefined): ValidMetaMarketingPilotTemplate => {
  if (!input || typeof input !== "object") {
    throw new AppError("META_MARKETING_PILOT_TEMPLATE_INVALID", 400);
  }
  const dailyBudgetMinor = typeof input.dailyBudgetMinor === "string" ? input.dailyBudgetMinor : "";
  const targeting = input.targeting && typeof input.targeting === "object" ? input.targeting as Record<string, unknown> : null;
  const placements = input.placements && typeof input.placements === "object" ? input.placements as Record<string, unknown> : null;
  if (
    input.templateVersion !== META_MARKETING_PILOT_TEMPLATE_VERSION
    || ![input.campaignName, input.adSetName, input.adName].every(value => typeof value === "string" && value.trim() && value.length <= 255)
    || input.objective !== "OUTCOME_LEADS"
    || !positiveInteger(dailyBudgetMinor)
    || !numericId(input.pageId) || !numericId(input.creativeId) || !numericId(input.pixelId)
    || input.conversionLocation !== "WEBSITE" || input.conversionEvent !== "LEAD"
    || !Array.isArray(input.specialAdCategories) || !input.specialAdCategories.length || input.specialAdCategories.some(value => typeof value !== "string" || !specialAdCategories.has(value))
    || !targeting || !Array.isArray(targeting.countries) || !targeting.countries.length || targeting.countries.some(country => typeof country !== "string" || !/^[A-Z]{2}$/.test(country))
    || !Number.isSafeInteger(targeting.ageMin) || !Number.isSafeInteger(targeting.ageMax) || Number(targeting.ageMin) < 18 || Number(targeting.ageMax) > 65 || Number(targeting.ageMin) > Number(targeting.ageMax)
    || !placements || !Array.isArray(placements.publisherPlatforms) || !placements.publisherPlatforms.length || placements.publisherPlatforms.some(platform => typeof platform !== "string" || !["facebook", "instagram", "audience_network", "messenger"].includes(platform))
  ) {
    throw new AppError("META_MARKETING_PILOT_TEMPLATE_INVALID", 400);
  }
  return {
    templateVersion: META_MARKETING_PILOT_TEMPLATE_VERSION,
    campaignName: (input.campaignName as string).trim(),
    adSetName: (input.adSetName as string).trim(),
    adName: (input.adName as string).trim(),
    objective: "OUTCOME_LEADS",
    dailyBudgetMinor,
    pageId: input.pageId as string,
    creativeId: input.creativeId as string,
    specialAdCategories: [...(input.specialAdCategories as string[])],
    conversionLocation: "WEBSITE",
    conversionEvent: "LEAD",
    pixelId: input.pixelId as string,
    targeting: {
      countries: [...(targeting.countries as string[])],
      ageMin: targeting.ageMin as number,
      ageMax: targeting.ageMax as number
    },
    placements: { publisherPlatforms: [...(placements.publisherPlatforms as string[])] }
  };
};

export const preflightMetaMarketingCampaignPilot = async (input: {
  companyId: number;
  userId: number;
  adAccountId: number;
  template: MetaMarketingPilotTemplateInput | null | undefined;
}): Promise<{ adAccountId: number; currency: string; spendCap: string; amountSpent: string; remainingSpendCap: string; templateVersion: string }> => {
  const template = validateMetaMarketingPilotTemplate(input.template);
  await assertCanCreateMetaMarketingCampaign(input.companyId, input.userId);
  const account = await MetaAdAccount.findOne({
    where: { id: input.adAccountId, companyId: input.companyId, status: "active" }
  });
  if (!account) throw new AppError("META_MARKETING_AD_ACCOUNT_NOT_FOUND", 404);

  const connection = await MetaMarketingConnection.findOne({
    where: { id: account.connectionId, companyId: input.companyId, status: "connected" }
  });
  // Meta v26 may omit per-account task fields from OAuth reads. Scope, tenant
  // authorization and Meta's paused write are the reliable authorization path.
  if (!connection || !connection.scopes.includes("ads_management")) {
    throw new AppError("META_MARKETING_ADS_MANAGEMENT_REQUIRED", 409);
  }

  let accessToken: string;
  try {
    accessToken = decryptMetaMarketingSecret(connection.accessTokenCiphertext);
  } catch (_) {
    await connection.update({ status: "reauthorization_required" });
    throw new AppError("META_MARKETING_REAUTHORIZATION_REQUIRED", 409);
  }
  try {
    const control = await getMetaMarketingAdAccountControl({
      accessToken,
      externalAccountId: account.externalAccountId
    });
    if (
      control.account_status !== 1 || control.disable_reason !== 0 || control.currency !== account.currency
      || !positiveInteger(control.spend_cap) || !/^\d+$/.test(control.amount_spent)
    ) {
      throw new AppError("META_MARKETING_SPEND_CAP_REQUIRED", 409);
    }
    const remainingSpendCap = BigInt(control.spend_cap) - BigInt(control.amount_spent);
    if (remainingSpendCap < BigInt(template.dailyBudgetMinor)) {
      throw new AppError("META_MARKETING_SPEND_CAP_REQUIRED", 409);
    }
    return {
      adAccountId: account.id,
      currency: control.currency,
      spendCap: control.spend_cap,
      amountSpent: control.amount_spent,
      remainingSpendCap: remainingSpendCap.toString(),
      templateVersion: META_MARKETING_PILOT_TEMPLATE_VERSION
    };
  } catch (error) {
    if (error instanceof MetaMarketingGraphError && error.kind === "reauthorization_required") {
      await connection.update({ status: "reauthorization_required" });
    }
    throw error;
  }
};
