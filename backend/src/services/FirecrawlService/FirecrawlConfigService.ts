import Setting from "../../models/Setting";
import AppError from "../../errors/AppError";
import { getMaskedSecret } from "../AIProviderService/AIProviderService";

export const FIRECRAWL_GLOBAL_KEY = "firecrawlGlobalApiKey";

const personalKeyForUser = (userId: number): string =>
  `firecrawlUserApiKey:${userId}`;

const findSetting = async (companyId: number, key: string): Promise<Setting | null> =>
  Setting.findOne({
    where: {
      companyId,
      key
    }
  });

const upsertSetting = async (
  companyId: number,
  key: string,
  value: string
): Promise<Setting> => {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    throw new AppError("Valor de configuração inválido.", 400);
  }

  const [setting] = await Setting.findOrCreate({
    where: {
      companyId,
      key
    },
    defaults: {
      companyId,
      key,
      value: trimmedValue
    }
  });

  await setting.update({ value: trimmedValue });

  return setting;
};

const clearSetting = async (companyId: number, key: string): Promise<void> => {
  const setting = await findSetting(companyId, key);

  if (setting) {
    await setting.destroy();
  }
};

export const getPersonalFirecrawlConfig = async (
  companyId: number,
  userId: number
) => {
  const ownSetting = await findSetting(companyId, personalKeyForUser(userId));
  const globalSetting = await findSetting(1, FIRECRAWL_GLOBAL_KEY);

  return {
    hasOwnApiKey: Boolean(ownSetting?.value),
    ownApiKeyMasked: getMaskedSecret(ownSetting?.value || ""),
    hasGlobalApiKey: Boolean(globalSetting?.value),
    globalApiKeyMasked: getMaskedSecret(globalSetting?.value || ""),
    resolvedSource: ownSetting?.value ? "personal" : globalSetting?.value ? "global" : "none"
  };
};

export const updatePersonalFirecrawlConfig = async (
  companyId: number,
  userId: number,
  apiKey?: string | null
) => {
  const trimmedKey = String(apiKey || "").trim();
  const key = personalKeyForUser(userId);

  if (!trimmedKey) {
    await clearSetting(companyId, key);
    return getPersonalFirecrawlConfig(companyId, userId);
  }

  await upsertSetting(companyId, key, trimmedKey);
  return getPersonalFirecrawlConfig(companyId, userId);
};

export const getGlobalFirecrawlConfig = async () => {
  const setting = await findSetting(1, FIRECRAWL_GLOBAL_KEY);

  return {
    hasGlobalApiKey: Boolean(setting?.value),
    globalApiKeyMasked: getMaskedSecret(setting?.value || "")
  };
};

export const updateGlobalFirecrawlConfig = async (apiKey?: string | null) => {
  const trimmedKey = String(apiKey || "").trim();

  if (!trimmedKey) {
    await clearSetting(1, FIRECRAWL_GLOBAL_KEY);
    return getGlobalFirecrawlConfig();
  }

  await upsertSetting(1, FIRECRAWL_GLOBAL_KEY, trimmedKey);
  return getGlobalFirecrawlConfig();
};

export const resolveFirecrawlApiKey = async (
  companyId: number,
  userId: number
): Promise<{ apiKey: string; source: "personal" | "global" }> => {
  const ownSetting = await findSetting(companyId, personalKeyForUser(userId));

  if (ownSetting?.value) {
    return {
      apiKey: ownSetting.value,
      source: "personal"
    };
  }

  const globalSetting = await findSetting(1, FIRECRAWL_GLOBAL_KEY);

  if (globalSetting?.value) {
    return {
      apiKey: globalSetting.value,
      source: "global"
    };
  }

  throw new AppError(
    "Nenhuma chave da Firecrawl foi configurada. Adicione sua chave pessoal para usar a busca de leads.",
    503
  );
};
