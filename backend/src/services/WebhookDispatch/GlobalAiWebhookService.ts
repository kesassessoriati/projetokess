import axios from "axios";
import logger from "../../utils/logger";
import { upsertSystemSetting } from "../AIProviderService/AIModelCatalogService";
import Setting from "../../models/Setting";

const SYSTEM_COMPANY_ID = 1;

const KEYS = {
  enabled: "globalAiWebhookEnabled",
  url: "globalAiWebhookUrl",
  events: "globalAiWebhookEvents",
};

const getSetting = async (key: string): Promise<string> => {
  const setting = await Setting.findOne({ where: { companyId: SYSTEM_COMPANY_ID, key } });
  return setting?.value || "";
};

export interface GlobalAiWebhookSettings {
  enabled: boolean;
  url: string;
  events: string[]; // ["MESSAGE_RECEIVED", "MESSAGE_SENT"]
}

export async function getGlobalAiWebhookSettings(): Promise<GlobalAiWebhookSettings> {
  const [enabled, url, eventsRaw] = await Promise.all([
    getSetting(KEYS.enabled),
    getSetting(KEYS.url),
    getSetting(KEYS.events),
  ]);

  let events: string[] = ["MESSAGE_RECEIVED", "MESSAGE_SENT"];
  try {
    if (eventsRaw) events = JSON.parse(eventsRaw);
  } catch {}

  return {
    enabled: enabled === "true",
    url: url || "",
    events,
  };
}

export async function saveGlobalAiWebhookSettings(
  settings: Partial<GlobalAiWebhookSettings>
): Promise<GlobalAiWebhookSettings> {
  const current = await getGlobalAiWebhookSettings();
  const merged: GlobalAiWebhookSettings = {
    enabled: settings.enabled !== undefined ? settings.enabled : current.enabled,
    url: settings.url !== undefined ? settings.url : current.url,
    events: settings.events !== undefined ? settings.events : current.events,
  };

  await Promise.all([
    upsertSystemSetting(KEYS.enabled, String(merged.enabled)),
    upsertSystemSetting(KEYS.url, merged.url || ""),
    upsertSystemSetting(KEYS.events, JSON.stringify(merged.events)),
  ]);

  return merged;
}

export async function dispatchGlobalAiWebhook(
  eventType: string,
  companyId: number,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const settings = await getGlobalAiWebhookSettings();

    if (!settings.enabled || !settings.url) {
      return;
    }

    if (!settings.events.includes(eventType)) {
      return;
    }

    const globalPayload = {
      ...payload,
      source: "global_ai_webhook",
    };

    axios
      .post(settings.url, globalPayload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      })
      .then(() => {
        logger.info(`[GlobalAIWebhook] ${eventType} enviado companyId=${companyId}`);
      })
      .catch((err: Error) => {
        logger.warn(`[GlobalAIWebhook] Falha ao enviar ${eventType} companyId=${companyId}: ${err.message}`);
      });
  } catch (err) {
    logger.error(`[GlobalAIWebhook] Erro ao preparar dispatch: ${err}`);
  }
}

export async function testGlobalAiWebhook(url: string): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const response = await axios.post(
      url,
      {
        event: "GLOBAL_AI_WEBHOOK_TEST",
        source: "superadmin",
        timestamp: new Date().toISOString(),
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
        validateStatus: () => true,
      }
    );

    const success = response.status >= 200 && response.status < 300;
    return { success, status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
