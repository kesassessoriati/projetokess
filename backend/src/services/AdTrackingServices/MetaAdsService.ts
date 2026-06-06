import axios from "axios";
import crypto from "crypto";
import logger from "../../utils/logger";

const META_CAPI_VERSION = "v19.0";

const sha256 = (value: string): string =>
  crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex");

interface MetaUserData {
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface MetaCustomData {
  lead_id?: string | number;
  opportunity_id?: string | number;
  pipeline_id?: string | number;
  stage_id?: string | number;
  value?: number;
  currency?: string;
}

interface MetaSendParams {
  pixelId: string;
  accessToken: string;
  eventName: string;
  userData: MetaUserData;
  customData?: MetaCustomData;
  eventSourceUrl?: string;
}

interface MetaSendResult {
  success: boolean;
  response?: Record<string, any>;
  error?: string;
}

export const sendMetaConversion = async (params: MetaSendParams): Promise<MetaSendResult> => {
  const { pixelId, accessToken, eventName, userData, customData, eventSourceUrl } = params;

  const user_data: Record<string, any> = {};
  if (userData.phone) user_data.ph = [sha256(userData.phone.replace(/\D/g, ""))];
  if (userData.email) user_data.em = [sha256(userData.email)];
  if (userData.firstName) user_data.fn = [sha256(userData.firstName)];
  if (userData.lastName) user_data.ln = [sha256(userData.lastName)];

  const event: Record<string, any> = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "system_generated",
    user_data
  };

  if (eventSourceUrl) event.event_source_url = eventSourceUrl;
  if (customData && Object.keys(customData).length > 0) {
    event.custom_data = customData;
  }

  const url = `https://graph.facebook.com/${META_CAPI_VERSION}/${pixelId}/events`;

  try {
    const { data } = await axios.post(
      url,
      { data: [event], access_token: accessToken },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    return { success: true, response: data };
  } catch (err: any) {
    const errMsg = err.response?.data?.error?.message || err.message;
    logger.warn(`[MetaAdsService] Falha no envio para pixel ${pixelId}: ${errMsg}`);
    return { success: false, error: errMsg };
  }
};

export const testMetaConnection = async (pixelId: string, accessToken: string): Promise<{ ok: boolean; message: string }> => {
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/${META_CAPI_VERSION}/${pixelId}?fields=id,name&access_token=${accessToken}`,
      { timeout: 8000 }
    );
    return { ok: true, message: `Pixel "${data.name || data.id}" conectado com sucesso.` };
  } catch (err: any) {
    const msg = err.response?.data?.error?.message || err.message;
    return { ok: false, message: msg };
  }
};
