// @ts-nocheck
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import moment from "moment";

export interface CreditInfo {
  allowed: number;
  used: number;
  remaining: number;
  hasCredits: boolean;
}

const resetIfNeeded = async (company: any): Promise<any> => {
  const today = moment().format("YYYY-MM-DD");
  if (company.aiCreditsLastReset !== today) {
    await company.update({ aiCreditsUsed: 0, aiCreditsLastReset: today });
    await company.reload();
  }
  return company;
};

export const getCreditInfo = async (companyId: number): Promise<CreditInfo> => {
  let company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan" }],
  });
  if (!company) throw new Error("Company not found");

  company = await resetIfNeeded(company);

  const allowed = company.plan?.aiDailyCredits ?? company.plan?.aiCredits ?? 0;
  const used = company.aiCreditsUsed ?? 0;
  const remaining = allowed === 0 ? 0 : Math.max(0, allowed - used);

  return { allowed, used, remaining, hasCredits: allowed === 0 || remaining > 0 };
};

export const consumeCredit = async (companyId: number): Promise<void> => {
  let company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan" }],
  });
  if (!company) throw new Error("Company not found");

  company = await resetIfNeeded(company);

  const allowed = company.plan?.aiDailyCredits ?? company.plan?.aiCredits ?? 0;
  const used = company.aiCreditsUsed ?? 0;

  if (allowed > 0 && used >= allowed) {
    throw new Error("NO_CREDITS");
  }

  await company.increment("aiCreditsUsed");
};
