import api from "./api";

export const fetchRoutes = async (params = {}) => {
  const { data } = await api.get("/sip-routes", { params });
  return data;
};

export const createRoute = async (payload) => {
  const { data } = await api.post("/sip-routes", payload);
  return data;
};

export const updateRoute = async (id, payload) => {
  const { data } = await api.put(`/sip-routes/${id}`, payload);
  return data;
};

export const deleteRoute = async (id) => {
  await api.delete(`/sip-routes/${id}`);
};