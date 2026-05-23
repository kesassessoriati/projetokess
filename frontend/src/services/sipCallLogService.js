import api from "./api";

export const fetchCallLogs = async (params = {}) => {
  const { data } = await api.get("/sip-call-logs", { params });
  return data;
};

export const createCallLog = async (payload) => {
  const { data } = await api.post("/sip-call-logs", payload);
  return data;
};

export const updateCallLogStatus = async (id, payload) => {
  const { data } = await api.put(`/sip-call-logs/${id}/status`, payload);
  return data;
};

export const resolveOutboundDid = async (payload) => {
  const { data } = await api.post("/sip/resolve-outbound-did", payload);
  return data;
};