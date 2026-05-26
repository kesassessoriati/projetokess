import api from "./api";

export const callProviderOptions = [
  { value: "sip", label: "SIP" },
  { value: "wavoip", label: "Wavoip" },
  { value: "manual", label: "Manual" },
  { value: "unknown", label: "Desconhecido" },
];

export const callProviderMap = callProviderOptions.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

export const getCallProvider = (record = {}) => {
  const provider = String(record.provider || record.callProvider || "").toLowerCase();

  if (callProviderMap[provider]) {
    return callProviderMap[provider];
  }

  const source = String(record.source || "").toLowerCase();
  if (source === "sip" || source === "webphone") {
    return callProviderMap.sip;
  }
  if (source === "wavoip" || source === "whatsapp") {
    return callProviderMap.wavoip;
  }
  if (source === "sequence" || source === "manual") {
    return callProviderMap.manual;
  }

  return callProviderMap.unknown;
};

export const defaultCallProviderSettings = {
  defaultProvider: "sip",
  sipEnabled: true,
  wavoipEnabled: false,
  wavoipBaseUrl: "",
  wavoipDeviceId: "",
  wavoipToken: "",
  wavoipTokenConfigured: false,
  rejectCallsDefault: false,
  callRejectMessagePt: "",
  callRejectMessageEn: "",
  businessHoursEnabled: false,
  settings: {},
};

export const getCallProviderSettings = async () => {
  const { data } = await api.get("/call-providers/settings");
  return {
    ...defaultCallProviderSettings,
    ...(data || {}),
    wavoipToken: "",
  };
};

export const updateCallProviderSettings = async (payload) => {
  const { data } = await api.put("/call-providers/settings", payload);
  return {
    ...defaultCallProviderSettings,
    ...(data || {}),
    wavoipToken: "",
  };
};

export const startProviderCall = async (payload) => {
  const { data } = await api.post("/call-providers/start", payload);
  return data;
};
