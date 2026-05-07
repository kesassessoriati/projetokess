import api from "./api";

export const getGlobalAiSettings = async () => {
  const { data } = await api.get("/admin/ai-settings");
  return data;
};

export const updateGlobalAiSettings = async payload => {
  const { data } = await api.put("/admin/ai-settings", payload);
  return data;
};

export const syncGlobalAiModels = async (provider, apiKey) => {
  const { data } = await api.post(`/admin/ai-settings/${provider}/sync-models`, { apiKey });
  return data;
};
