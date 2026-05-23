import api from "./api";

export const fetchDids = async (params = {}) => {
  const { data } = await api.get("/sip-dids", { params });
  return data;
};

export const createDid = async (payload) => {
  const { data } = await api.post("/sip-dids", payload);
  return data;
};

export const updateDid = async (id, payload) => {
  const { data } = await api.put(`/sip-dids/${id}`, payload);
  return data;
};

export const deleteDid = async (id) => {
  await api.delete(`/sip-dids/${id}`);
};