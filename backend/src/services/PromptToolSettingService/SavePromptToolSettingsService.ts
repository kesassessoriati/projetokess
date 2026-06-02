import PromptToolSetting from "../../models/PromptToolSetting";

interface SavePromptToolSettingsRequest {
  companyId: number;
  promptId?: number | null;
  toolsEnabled?: string[] | null;
}

const SavePromptToolSettingsService = async ({
  companyId,
  promptId,
  toolsEnabled
}: SavePromptToolSettingsRequest): Promise<void> => {
  if (typeof toolsEnabled === "undefined") {
    return;
  }

  const normalizedPromptId = promptId ?? null;
  const uniqueTools = Array.from(new Set(toolsEnabled || [])).filter(
    tool => typeof tool === "string" && tool.trim().length > 0
  );

  await PromptToolSetting.destroy({
    where: {
      companyId,
      promptId: normalizedPromptId
    }
  });

  if (uniqueTools.length === 0) {
    return;
  }

  await PromptToolSetting.bulkCreate(
    uniqueTools.map(toolName => ({
      companyId,
      promptId: normalizedPromptId,
      toolName,
      enabled: true
    }))
  );
};

export default SavePromptToolSettingsService;
