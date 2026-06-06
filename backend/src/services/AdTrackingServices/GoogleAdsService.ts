import axios from "axios";
import crypto from "crypto";
import logger from "../../utils/logger";

const GOOGLE_ADS_API_VERSION = "v16";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const sha256 = (value: string): string =>
  crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex");

interface GoogleAdsCredentials {
  customerId: string;
  conversionActionId: string;
  developerToken: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

interface GoogleAdsUserData {
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface GoogleAdsSendParams {
  credentials: GoogleAdsCredentials;
  eventName: string;
  userData: GoogleAdsUserData;
  gclid?: string;
  value?: number;
  opportunityId?: string | number;
  conversionDateTime?: string;
}

interface GoogleAdsSendResult {
  success: boolean;
  response?: Record<string, any>;
  error?: string;
}

const getAccessToken = async (credentials: GoogleAdsCredentials): Promise<string | null> => {
  if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
    return null;
  }
  try {
    const { data } = await axios.post(TOKEN_URL, {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token"
    }, { timeout: 8000 });
    return data.access_token as string;
  } catch (err: any) {
    logger.warn(`[GoogleAdsService] Falha ao obter access token: ${err.message}`);
    return null;
  }
};

const formatConversionDateTime = (): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const absOffset = Math.abs(offset);
  const hh = pad(Math.floor(absOffset / 60));
  const mm = pad(absOffset % 60);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${sign}${hh}:${mm}`;
};

export const sendGoogleAdsConversion = async (params: GoogleAdsSendParams): Promise<GoogleAdsSendResult> => {
  const { credentials, userData, gclid, value, conversionDateTime } = params;

  if (!credentials.customerId || !credentials.conversionActionId || !credentials.developerToken) {
    return { success: false, error: "Credenciais incompletas: customerId, conversionActionId e developerToken são obrigatórios." };
  }

  const accessToken = await getAccessToken(credentials);
  if (!accessToken) {
    return { success: false, error: "Não foi possível obter access_token via OAuth. Verifique clientId, clientSecret e refreshToken." };
  }

  const customerId = credentials.customerId.replace(/-/g, "");
  const conversionActionResourceName = `customers/${customerId}/conversionActions/${credentials.conversionActionId}`;
  const conversionTime = conversionDateTime || formatConversionDateTime();

  let conversionPayload: Record<string, any>;

  if (gclid) {
    // Click conversion com GCLID
    conversionPayload = {
      conversions: [
        {
          gclid,
          conversion_action: conversionActionResourceName,
          conversion_date_time: conversionTime,
          conversion_value: value || 0,
          currency_code: "BRL"
        }
      ],
      partial_failure: true
    };

    try {
      const { data } = await axios.post(
        `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}:uploadClickConversions`,
        conversionPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": credentials.developerToken,
            "Content-Type": "application/json"
          },
          timeout: 12000
        }
      );
      return { success: true, response: data };
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || err.message;
      logger.warn(`[GoogleAdsService] Falha no envio click conversion: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  // Enhanced Conversion com dados hash
  const hashedUser: Record<string, any> = {};
  if (userData.email) hashedUser.hashed_email = sha256(userData.email);
  if (userData.phone) hashedUser.hashed_phone_number = sha256(userData.phone.replace(/\D/g, ""));
  if (userData.firstName) hashedUser.address = { ...(hashedUser.address || {}), hashed_first_name: sha256(userData.firstName) };
  if (userData.lastName) hashedUser.address = { ...(hashedUser.address || {}), hashed_last_name: sha256(userData.lastName) };

  if (Object.keys(hashedUser).length === 0) {
    return { success: false, error: "Enhanced Conversion requer pelo menos email ou telefone do contato." };
  }

  const enhancedPayload = {
    conversions: [
      {
        conversion_action: conversionActionResourceName,
        conversion_date_time: conversionTime,
        conversion_value: value || 0,
        currency_code: "BRL",
        user_identifiers: [{ hashed_email: hashedUser.hashed_email || undefined }, { hashed_phone_number: hashedUser.hashed_phone_number || undefined }].filter(u => Object.values(u).some(v => v))
      }
    ],
    partial_failure: true
  };

  try {
    const { data } = await axios.post(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/conversionUploads:uploadClickConversions`,
      enhancedPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": credentials.developerToken,
          "Content-Type": "application/json"
        },
        timeout: 12000
      }
    );
    return { success: true, response: data };
  } catch (err: any) {
    const errMsg = err.response?.data?.error?.message || err.message;
    logger.warn(`[GoogleAdsService] Falha no envio enhanced conversion: ${errMsg}`);
    return { success: false, error: errMsg };
  }
};

export const validateGoogleAdsConfig = async (credentials: GoogleAdsCredentials): Promise<{ ok: boolean; message: string }> => {
  if (!credentials.customerId || !credentials.developerToken) {
    return { ok: false, message: "Customer ID e Developer Token são obrigatórios." };
  }

  if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
    return { ok: false, message: "Configurações OAuth incompletas (clientId, clientSecret, refreshToken)." };
  }

  const token = await getAccessToken(credentials);
  if (!token) {
    return { ok: false, message: "Falha ao validar OAuth: verifique as credenciais." };
  }

  try {
    const customerId = credentials.customerId.replace(/-/g, "");
    await axios.get(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "developer-token": credentials.developerToken
        },
        timeout: 8000
      }
    );
    return { ok: true, message: `Conta ${credentials.customerId} validada com sucesso.` };
  } catch (err: any) {
    const msg = err.response?.data?.error?.message || err.message;
    return { ok: false, message: msg };
  }
};
