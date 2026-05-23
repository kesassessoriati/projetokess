import api from "./api";

export const fetchBindings = async (params = {}) => {
  const { data } = await api.get("/sip-channel-bindings", { params });
  return data;
};

export const createBinding = async (payload) => {
  const { data } = await api.post("/sip-channel-bindings", payload);
  return data;
};

export const updateBinding = async (id, payload) => {
  const { data } = await api.put(`/sip-channel-bindings/${id}`, payload);
  return data;
};

export const deleteBinding = async (id) => {
  await api.delete(`/sip-channel-bindings/${id}`);
};