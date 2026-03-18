import api from "./api";

export const listAiAgentTemplates = async () => {
  const { data } = await api.get("/ai-agent-templates");
  return data;
};
