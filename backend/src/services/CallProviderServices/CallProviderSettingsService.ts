import * as Yup from "yup";
import AppError from "../../errors/AppError";
import CallProviderSetting from "../../models/CallProviderSetting";
import { normalizeCallProvider } from "./CallProviderTypes";

export type SerializedCallProviderSettings = {
  id: number | null;
  companyId: number;
  defaultProvider: string;
  sipEnabled: boolean;
  wavoipEnabled: boolean;
  wavoipBaseUrl: string;
  wavoipDeviceId: string;
  wavoipTokenConfigured: boolean;
  rejectCallsDefault: boolean;
  callRejectMessagePt: string;
  callRejectMessageEn: string;
  businessHoursEnabled: boolean;
  settings: Record<string, any>;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

type UpsertCallProviderSettingsRequest = {
  companyId: number;
  defaultProvider?: string;
  sipEnabled?: boolean;
  wavoipEnabled?: boolean;
  wavoipBaseUrl?: string | null;
  wavoipDeviceId?: string | null;
  wavoipToken?: string | null;
  clearWavoipToken?: boolean;
  rejectCallsDefault?: boolean;
  callRejectMessagePt?: string | null;
  callRejectMessageEn?: string | null;
  businessHoursEnabled?: boolean;
  settings?: Record<string, any> | null;
};

const defaultPayload = (companyId: number): SerializedCallProviderSettings => ({
  id: null,
  companyId,
  defaultProvider: "sip",
  sipEnabled: true,
  wavoipEnabled: false,
  wavoipBaseUrl: "",
  wavoipDeviceId: "",
  wavoipTokenConfigured: false,
  rejectCallsDefault: false,
  callRejectMessagePt: "",
  callRejectMessageEn: "",
  businessHoursEnabled: false,
  settings: {}
});

const normalizeOptionalString = (value?: string | null): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
};

const validateWavoipBaseUrl = (value?: string | null): string | null => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("invalid protocol");
    }
    return url.toString().replace(/\/$/, "");
  } catch (_error) {
    throw new AppError("URL base do Wavoip invalida.", 400);
  }
};

export const serializeCallProviderSettings = (
  record: CallProviderSetting | null,
  companyId: number
): SerializedCallProviderSettings => {
  if (!record) {
    return defaultPayload(companyId);
  }

  return {
    id: record.id,
    companyId,
    defaultProvider: normalizeCallProvider(record.defaultProvider),
    sipEnabled: record.sipEnabled !== false,
    wavoipEnabled: Boolean(record.wavoipEnabled),
    wavoipBaseUrl: record.wavoipBaseUrl || "",
    wavoipDeviceId: record.wavoipDeviceId || "",
    wavoipTokenConfigured: Boolean(record.getDataValue("wavoipToken")),
    rejectCallsDefault: Boolean(record.rejectCallsDefault),
    callRejectMessagePt: record.callRejectMessagePt || "",
    callRejectMessageEn: record.callRejectMessageEn || "",
    businessHoursEnabled: Boolean(record.businessHoursEnabled),
    settings: record.settings || {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
};

export const getCallProviderSettings = async (
  companyId: number
): Promise<SerializedCallProviderSettings> => {
  const record = await CallProviderSetting.findOne({ where: { companyId } });
  return serializeCallProviderSettings(record, companyId);
};

const schema = Yup.object().shape({
  companyId: Yup.number().required(),
  defaultProvider: Yup.string().oneOf(["sip", "wavoip", "manual", "unknown"]).default("sip"),
  sipEnabled: Yup.boolean().default(true),
  wavoipEnabled: Yup.boolean().default(false),
  wavoipBaseUrl: Yup.string().nullable(),
  wavoipDeviceId: Yup.string().nullable(),
  wavoipToken: Yup.string().nullable(),
  clearWavoipToken: Yup.boolean().default(false),
  rejectCallsDefault: Yup.boolean().default(false),
  callRejectMessagePt: Yup.string().nullable(),
  callRejectMessageEn: Yup.string().nullable(),
  businessHoursEnabled: Yup.boolean().default(false),
  settings: Yup.object().nullable()
});

export const upsertCallProviderSettings = async (
  params: UpsertCallProviderSettingsRequest
): Promise<SerializedCallProviderSettings> => {
  const payload = await schema.validate(params, { abortEarly: false });

  let record = await CallProviderSetting.findOne({ where: { companyId: payload.companyId } });
  const currentSettings = record?.settings || {};

  const nextPayload: any = {
    companyId: payload.companyId,
    defaultProvider: normalizeCallProvider(payload.defaultProvider),
    sipEnabled: payload.sipEnabled !== false,
    wavoipEnabled: Boolean(payload.wavoipEnabled),
    wavoipBaseUrl: validateWavoipBaseUrl(payload.wavoipBaseUrl),
    wavoipDeviceId: normalizeOptionalString(payload.wavoipDeviceId),
    rejectCallsDefault: Boolean(payload.rejectCallsDefault),
    callRejectMessagePt: normalizeOptionalString(payload.callRejectMessagePt),
    callRejectMessageEn: normalizeOptionalString(payload.callRejectMessageEn),
    businessHoursEnabled: Boolean(payload.businessHoursEnabled),
    settings: {
      ...currentSettings,
      ...(payload.settings || {})
    }
  };

  const token = normalizeOptionalString(payload.wavoipToken);
  if (payload.clearWavoipToken) {
    nextPayload.wavoipToken = null;
  } else if (token) {
    nextPayload.wavoipToken = token;
  }

  if (record) {
    await record.update(nextPayload);
  } else {
    record = await CallProviderSetting.create(nextPayload);
  }

  return serializeCallProviderSettings(record, payload.companyId);
};

export const getRawCallProviderSettings = async (
  companyId: number
): Promise<CallProviderSetting | null> => CallProviderSetting.findOne({ where: { companyId } });
