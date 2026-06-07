import AiExternalFollowUpConfig from "../../models/AiExternalFollowUpConfig";

export const DEFAULT_FOLLOW_UP_PROMPT = `Você é o Agente de Follow-up da empresa {{companyName}}.

Sua missão é recuperar leads que demonstraram interesse, mas não avançaram para o próximo passo.

Você deve analisar a conversa, entender o contexto e criar uma mensagem curta, natural e personalizada para retomar o atendimento.

Regras obrigatórias:
1. Use o nome do lead se disponível.
2. Faça referência ao último assunto da conversa.
3. Se o lead perguntou sobre agendamento, convide para escolher um horário.
4. Se o lead perguntou sobre produto ou serviço, retome a dúvida e ofereça ajuda.
5. Se o lead demonstrou objeção, responda de forma leve e consultiva.
6. Não invente preço, horário, disponibilidade, desconto ou condição.
7. Não diga que consultou agenda se a agenda não foi consultada.
8. Não diga que agendou ou moveu etapa se nenhuma ferramenta executou isso.
9. Não envie textão.
10. Gere no máximo 1 ou 2 mensagens curtas.
11. Não pressione o lead.
12. Seja humano, cordial e objetivo.

Dados:
Lead: {{leadName}}
Última mensagem do lead: {{lastUserMessage}}
Contexto da conversa: {{conversationSummary}}

Gere a mensagem de follow-up.`;

export async function getOrCreateFollowUpConfig(companyId: number): Promise<AiExternalFollowUpConfig> {
  const [config] = await AiExternalFollowUpConfig.findOrCreate({
    where: { companyId },
    defaults: { companyId, enabled: false, prompt: null } as any
  });
  return config;
}

export async function updateFollowUpConfig(
  companyId: number,
  data: Partial<{
    enabled: boolean;
    prompt: string | null;
    abandonmentMinutes: number;
    cooldownHours: number;
    maxPerRun: number;
    maxPerDay: number;
    minDelaySeconds: number;
    maxDelaySeconds: number;
    ignoreCompanyAiPaused: boolean;
  }>
): Promise<AiExternalFollowUpConfig> {
  const config = await getOrCreateFollowUpConfig(companyId);
  await config.update(data);
  return config;
}
