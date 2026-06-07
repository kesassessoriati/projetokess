import InternalAgentMemoryService from "./InternalAgentMemoryService";

interface ContextParams {
  companyId: number;
  contactId: number;
  promptId?: number;
  contactName?: string;
}

interface BuiltContext {
  memoryBlock: string;
  hasContext: boolean;
}

const buildContext = async (params: ContextParams): Promise<BuiltContext> => {
  const memories = await InternalAgentMemoryService.getMemories(
    params.companyId,
    params.contactId,
    params.promptId,
    8
  );

  if (!memories.length) {
    return { memoryBlock: "", hasContext: false };
  }

  const lines: string[] = [];

  const summaries = memories.filter(m => m.memoryType === "summary");
  const facts = memories.filter(m => m.memoryType === "fact");
  const preferences = memories.filter(m => m.memoryType === "preference");
  const goals = memories.filter(m => m.memoryType === "goal");

  if (summaries.length) {
    lines.push("### Resumo de conversas anteriores:");
    summaries.forEach(m => lines.push(`- ${m.content}`));
  }
  if (facts.length) {
    lines.push("### Informações conhecidas sobre o contato:");
    facts.forEach(m => lines.push(`- ${m.content}`));
  }
  if (preferences.length) {
    lines.push("### Preferências do contato:");
    preferences.forEach(m => lines.push(`- ${m.content}`));
  }
  if (goals.length) {
    lines.push("### Objetivos do contato:");
    goals.forEach(m => lines.push(`- ${m.content}`));
  }

  const memoryBlock = `\n\n---\n## Memória Contextual\n${lines.join("\n")}\n---\n`;

  return { memoryBlock, hasContext: true };
};

const InternalAgentContextBuilderService = {
  buildContext
};

export default InternalAgentContextBuilderService;
