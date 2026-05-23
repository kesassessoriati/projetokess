import api from "./api";

export const fetchExtensions = async (params = {}) => {
  const { data } = await api.get("/sip-extensions", { params });
  return data;
};

export const createExtension = async (payload) => {
  const { data } = await api.post("/sip-extensions", payload);
  return data;
};

export const updateExtension = async (id, payload) => {
  const { data } = await api.put(`/sip-extensions/${id}`, payload);
  return data;
};

export const deleteExtension = async (id) => {
  await api.delete(`/sip-extensions/${id}`);
};