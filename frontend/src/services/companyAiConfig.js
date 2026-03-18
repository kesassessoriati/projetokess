import api from "./api";

export const getCompanyAiConfig = async companyId => {
  const { data } = await api.get(`/companies/${companyId}/ai-config`);
  return data;
};

export const updateCompanyAiConfig = async (companyId, payload) => {
  const { data } = await api.put(`/companies/${companyId}/ai-config`, payload);
  return data;
};
