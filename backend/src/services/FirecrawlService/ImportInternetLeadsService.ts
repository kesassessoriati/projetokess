import CreateCrmLeadService from "../CrmLeadService/CreateCrmLeadService";
import AppError from "../../errors/AppError";
import type { InternetLeadCandidate } from "./SearchInternetLeadsService";

interface ImportInternetLeadsRequest {
  companyId: number;
  ownerUserId?: number;
  pipelineId: number;
  stageId: number;
  niche?: string;
  items: InternetLeadCandidate[];
}

const ImportInternetLeadsService = async ({
  companyId,
  ownerUserId,
  pipelineId,
  stageId,
  niche,
  items
}: ImportInternetLeadsRequest): Promise<{
  total: number;
  imported: number;
  errors: Array<{ index: number; error: string }>;
}> => {
  if (!pipelineId || !stageId) {
    throw new AppError("Selecione o funil e a etapa para importar os leads.", 400);
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Nenhum lead selecionado para importação.", 400);
  }

  const errors: Array<{ index: number; error: string }> = [];
  let imported = 0;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    try {
      const name =
        item.contactName ||
        item.companyName ||
        item.title ||
        item.sourceDomain ||
        `Lead Internet ${index + 1}`;

      const notesParts = [
        item.description ? `Resumo: ${item.description}` : "",
        item.sourceUrl ? `Fonte: ${item.sourceUrl}` : ""
      ].filter(Boolean);

      await CreateCrmLeadService({
        companyId,
        name,
        phone: item.phone || undefined,
        email: item.email || undefined,
        companyName: item.companyName || undefined,
        address: item.address || undefined,
        website: item.website || undefined,
        source: niche ? `Firecrawl - ${niche}` : "Firecrawl",
        notes: notesParts.join("\n"),
        ownerUserId,
        pipelineId,
        stageId,
        status: "novo"
      });

      imported += 1;
    } catch (error: any) {
      errors.push({
        index,
        error: error?.message || "Erro ao importar lead."
      });
    }
  }

  return {
    total: items.length,
    imported,
    errors
  };
};

export default ImportInternetLeadsService;
