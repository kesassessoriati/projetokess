// @ts-nocheck
import { Request, Response } from "express";
import { Op, fn, col, literal } from "sequelize";
import Setting from "../models/Setting";
import CrmLead from "../models/CrmLead";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import {
  finalizeAIUsage,
  getCompanyAiSettings,
  getProviderDisplayName,
  resolveAIProviderConfig
} from "../services/AIProviderService/AIProviderService";
import UpdateCrmLeadService from "../services/CrmLeadService/UpdateCrmLeadService";

// Status values mapeados (suporte a legado inglês + novo português)
const ACTIVE_STATUSES = ["novo", "new", "contactado", "qualificado", "reuniao_agendada", "nao_qualificado"];
const CONVERTED_STATUSES = ["convertido", "won", "converted"];
const LOST_STATUSES = ["perdido", "lost"];

const getSettingCascade = async (
  companyId: number,
  key: string,
  envFallback?: string
): Promise<string | null> => {
  const own = await Setting.findOne({ where: { companyId, key } }).catch(() => null);
  if (own?.value) return own.value;
  if (companyId !== 1) {
    const global = await Setting.findOne({ where: { companyId: 1, key } }).catch(() => null);
    if (global?.value) return global.value;
  }
  return envFallback || null;
};

const getCrmAiSystemPrompt = async (companyId: number): Promise<string> => {
  const custom = await getSettingCascade(companyId, "crmAiSystemPrompt");
  if (custom && custom.trim()) return custom.trim();
  return `Você é o Assistente CRM IA, um especialista em vendas e gestão de pipeline.
Responda de forma objetiva, prática e em português brasileiro.
Use os dados do CRM abaixo para contextualizar suas respostas com dados reais.
Ofereça insights acionáveis e dicas de vendas baseadas nos dados disponíveis.
Seja direto e evite respostas genéricas.

AÇÕES DISPONÍVEIS: Quando identificar uma ação específica a realizar em um lead, inclua ao FINAL da resposta um bloco de ação (sem markdown ao redor do bloco):
[AÇÃO]{"type":"move_lead","leadId":123,"stageId":456,"stageName":"Nome do Estágio","leadName":"Nome do Lead"}[/AÇÃO]
[AÇÃO]{"type":"add_note","leadId":123,"leadName":"Nome do Lead","note":"Texto da nota a adicionar"}[/AÇÃO]
[AÇÃO]{"type":"mark_won","leadId":123,"leadName":"Nome do Lead"}[/AÇÃO]
[AÇÃO]{"type":"mark_lost","leadId":123,"leadName":"Nome do Lead","reason":"Motivo da perda"}[/AÇÃO]
Inclua bloco de ação apenas quando tiver certeza com base nos dados disponíveis e quando for realmente útil.`;
};

const buildCrmContext = async (companyId: number, pipelineId?: number): Promise<string> => {
  try {
    // Where base isolado por empresa (multi-tenant garantido)
    const leadBaseWhere: any = { companyId };
    if (pipelineId) leadBaseWhere.pipelineId = pipelineId;

    const pipelineWhere: any = { companyId };
    if (pipelineId) pipelineWhere.id = pipelineId;

    // Busca pipelines com estágios
    const pipelines = await Pipeline.findAll({
      where: pipelineWhere,
      include: [{ model: PipelineStage, as: "stages", order: [["order", "ASC"]] }]
    }).catch(() => []);

    // Contagens via DB — sem limite de 200, precisão total
    const totalLeads = await CrmLead.count({ where: leadBaseWhere }).catch(() => 0);

    const activeLeads = await CrmLead.count({
      where: { ...leadBaseWhere, status: { [Op.in]: ACTIVE_STATUSES } }
    }).catch(() => 0);

    const convertedLeads = await CrmLead.count({
      where: { ...leadBaseWhere, status: { [Op.in]: CONVERTED_STATUSES } }
    }).catch(() => 0);

    const lostLeads = await CrmLead.count({
      where: { ...leadBaseWhere, status: { [Op.in]: LOST_STATUSES } }
    }).catch(() => 0);

    // Agregação de valores via SQL
    const valueStats = await CrmLead.findOne({
      attributes: [
        [fn("COALESCE", fn("SUM", col("value")), 0), "totalValue"],
        [
          literal(`COALESCE(SUM(CASE WHEN status IN ('convertido','won','converted') THEN COALESCE(value,0) ELSE 0 END), 0)`),
          "convertedValue"
        ]
      ],
      where: leadBaseWhere,
      raw: true
    }).catch(() => null) as any;

    const totalValue = parseFloat(valueStats?.totalValue || "0");
    const convertedValue = parseFloat(valueStats?.convertedValue || "0");

    // Leads com SLA atrasado: ativos sem atualização há +3 dias
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const slaDelayed = await CrmLead.count({
      where: {
        ...leadBaseWhere,
        status: { [Op.in]: ACTIVE_STATUSES },
        updatedAt: { [Op.lt]: threeDaysAgo }
      }
    }).catch(() => 0);

    // Breakdown por estágio
    let stageBreakdown = "";
    if (pipelines.length > 0) {
      const allStages: any[] = pipelines.flatMap((p: any) =>
        (p.stages || []).map((s: any) => ({ id: s.id, name: s.name, pipelineName: p.name }))
      );

      const stageCounts = await Promise.all(
        allStages.map(async (stage) => {
          const count = await CrmLead.count({
            where: { ...leadBaseWhere, stageId: stage.id }
          }).catch(() => 0);
          return { name: stage.name, count, id: stage.id };
        })
      );

      const nonEmpty = stageCounts.filter((s) => s.count > 0);
      if (nonEmpty.length > 0) {
        stageBreakdown =
          "\nDistribuição por estágio:\n" +
          nonEmpty.map((s) => `  - ${s.name} (ID:${s.id}): ${s.count} leads`).join("\n");
      }
    }

    // WhatsApp: leads com ticket vinculado
    let whatsappContext = "";
    try {
      const leadsWithTickets = await CrmLead.count({
        where: { ...leadBaseWhere, primaryTicketId: { [Op.ne]: null } }
      });
      if (leadsWithTickets > 0) {
        whatsappContext = `\n- Leads com conversa WhatsApp vinculada: ${leadsWithTickets}`;
      }
    } catch (_) {}

    // Top 5 leads com SLA mais atrasados (para sugestão de ação)
    let topSlaLeads = "";
    try {
      if (slaDelayed > 0) {
        const slaLeads = await CrmLead.findAll({
          where: {
            ...leadBaseWhere,
            status: { [Op.in]: ACTIVE_STATUSES },
            updatedAt: { [Op.lt]: threeDaysAgo }
          },
          attributes: ["id", "name", "status", "stageId", "value", "updatedAt", "ownerUserId"],
          limit: 5,
          order: [["updatedAt", "ASC"]]
        });

        if (slaLeads.length > 0) {
          topSlaLeads =
            "\nLeads prioritários (SLA mais atrasados):\n" +
            slaLeads
              .map((l: any) => {
                const days = Math.floor(
                  (Date.now() - new Date(l.updatedAt).getTime()) / (24 * 60 * 60 * 1000)
                );
                return `  - ID:${l.id} "${l.name}" (${days} dias sem update, valor: R$${parseFloat(l.value || 0).toFixed(2)}, estágio ID:${l.stageId})`;
              })
              .join("\n");
        }
      }
    } catch (_) {}

    const pipelineNames = pipelines.map((p: any) => p.name).join(", ");
    const conversionRate =
      totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0";

    return `
Contexto do CRM (dados reais da empresa ID:${companyId}${pipelineId ? `, pipeline ID:${pipelineId}` : ""}):
- Pipeline(s): ${pipelineNames || "nenhum"}
- Total de leads: ${totalLeads}
- Leads ativos (em andamento): ${activeLeads}
- Leads convertidos/ganhos: ${convertedLeads}
- Leads perdidos: ${lostLeads}
- Valor total em pipeline: R$ ${totalValue.toFixed(2)}
- Valor convertido: R$ ${convertedValue.toFixed(2)}
- Leads com SLA atrasado (+3 dias sem atualização): ${slaDelayed}
- Taxa de conversão: ${conversionRate}%${whatsappContext}${stageBreakdown}${topSlaLeads}
`;
  } catch (e) {
    console.error("[CrmAI] buildCrmContext error:", e);
    return "Contexto do CRM indisponível no momento.";
  }
};

// Converte histórico do frontend para formato OpenAI
const buildOpenAiHistory = (history: Array<{ role: string; text: string }>) => {
  if (!Array.isArray(history)) return [];
  return history.slice(-10).map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.text
  }));
};

// Converte histórico para formato Gemini (interleaved user/model)
const buildGeminiHistory = (history: Array<{ role: string; text: string }>) => {
  if (!Array.isArray(history)) return [];
  return history.slice(-10).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }]
  }));
};

export const credits = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  try {
    const info = await getCompanyAiSettings(companyId);
    return res.status(200).json({
      ...info.creditInfo,
      usageMode: info.usageMode,
      preferredProvider: info.preferredProvider,
      planInfo: info.planInfo
    });
  } catch {
    return res.status(500).json({ error: "Erro ao consultar créditos" });
  }
};

export const chat = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { message, pipelineId, history } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Mensagem inválida" });
  }

  const parsedPipelineId = pipelineId ? parseInt(String(pipelineId), 10) : undefined;

  const companyAiSettings = await getCompanyAiSettings(companyId);
  const crmContext = await buildCrmContext(companyId, parsedPipelineId);
  const basePrompt = await getCrmAiSystemPrompt(companyId);
  const systemPrompt = `${basePrompt}\n\n${crmContext}`;

  let reply = "";
  let resolvedConfig: Awaited<ReturnType<typeof resolveAIProviderConfig>> | null = null;

  try {
    resolvedConfig = await resolveAIProviderConfig({
      companyId,
      provider: companyAiSettings.preferredProvider,
      requestType: "crm_assistant"
    });

    if (resolvedConfig.provider === "gemini") {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(resolvedConfig.apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const geminiHistory = buildGeminiHistory(history || []);
      if (geminiHistory.length > 0) {
        // Multi-turn com histórico
        const chat = model.startChat({
          history: geminiHistory,
          systemInstruction: systemPrompt
        });
        const result = await chat.sendMessage(message);
        reply = result.response.text();
      } else {
        const result = await model.generateContent(`${systemPrompt}\n\nUsuário: ${message}`);
        reply = result.response.text();
      }
    } else {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey: resolvedConfig.apiKey,
        baseURL: resolvedConfig.provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined,
        defaultHeaders: resolvedConfig.provider === "openrouter" ? {
          "HTTP-Referer": process.env.FRONTEND_URL || "https://atendzappy.com",
          "X-Title": "AtendZappy CRM"
        } : undefined
      });

      const historyMessages = buildOpenAiHistory(history || []);

      const completion = await openai.chat.completions.create({
        model: resolvedConfig.provider === "openrouter" ? "deepseek/deepseek-chat-v3.1:free" : "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...historyMessages,
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 800
      });
      reply = completion.choices[0]?.message?.content || "Sem resposta";
    }

    const newCreditInfo = await finalizeAIUsage({
      companyId,
      provider: resolvedConfig.provider,
      usageMode: resolvedConfig.usageMode,
      requestType: "crm_assistant",
      model: resolvedConfig.provider === "gemini" ? "gemini-2.5-flash" : resolvedConfig.provider === "openrouter" ? "deepseek/deepseek-chat-v3.1:free" : "gpt-4o-mini",
      status: "success",
      metadata: { messageLength: message.length, hasPipelineId: !!parsedPipelineId, historyLength: (history || []).length }
    });

    return res.status(200).json({ reply, creditInfo: newCreditInfo });
  } catch (err: any) {
    const apiStatus = err?.status || err?.response?.status || err?.code || err?.statusCode;
    const apiMessage = err?.message || err?.error?.message || "";

    if (resolvedConfig) {
      await finalizeAIUsage({
        companyId,
        provider: resolvedConfig.provider,
        usageMode: resolvedConfig.usageMode,
        requestType: "crm_assistant",
        model: resolvedConfig.provider === "gemini" ? "gemini-2.5-flash" : resolvedConfig.provider === "openrouter" ? "deepseek/deepseek-chat-v3.1:free" : "gpt-4o-mini",
        status: "error",
        errorCode: apiStatus ? String(apiStatus) : "provider_error",
        metadata: { messageLength: message.length, apiMessage }
      }).catch(() => undefined);
    }

    if (err.statusCode === 402 || apiMessage === "NO_CREDITS") {
      return res.status(402).json({
        error: "NO_CREDITS",
        message: "Créditos de IA insuficientes. Contate o administrador.",
        creditInfo: companyAiSettings.creditInfo
      });
    }

    if (apiStatus === 429 || apiMessage.includes("429") || apiMessage.includes("quota") || apiMessage.includes("exceeded")) {
      return res.status(429).json({
        error: "QUOTA_EXCEEDED",
        message: `Cota esgotada ou limite de taxa atingido na API (${getProviderDisplayName(companyAiSettings.preferredProvider)}). Verifique seu saldo/plano na plataforma da IA.`
      });
    }

    if (apiStatus === 401 || apiMessage.includes("401") || apiMessage.includes("Incorrect API key") || apiMessage.includes("invalid_api_key")) {
      return res.status(422).json({
        error: "INVALID_KEY",
        message: "Chave de API inválida. Revise a configuração de IA da empresa."
      });
    }

    if (apiMessage.includes("configurada") || apiMessage.includes("configurada.")) {
      return res.status(503).json({
        error: "NO_API_KEY",
        message: "Nenhuma chave de IA disponível para este provedor."
      });
    }

    console.error(`[CrmAI] Provider: ${companyAiSettings.preferredProvider} | Error:`, apiMessage, "status:", apiStatus, err);
    return res.status(500).json({ error: "Erro ao processar mensagem: " + (apiMessage || "erro desconhecido") });
  }
};

// Endpoint de ações: mover lead, adicionar nota, marcar ganho/perdido
export const action = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const { type, leadId, stageId, note, reason } = req.body;

  if (!type || !leadId) {
    return res.status(400).json({ error: "Parâmetros inválidos" });
  }

  try {
    // Verifica que o lead pertence à empresa (isolamento multi-tenant)
    const lead = await CrmLead.findOne({ where: { id: leadId, companyId } });
    if (!lead) {
      return res.status(404).json({ error: "Lead não encontrado ou sem permissão." });
    }

    let updateData: any = { id: leadId, companyId };

    switch (type) {
      case "move_lead":
        if (!stageId) return res.status(400).json({ error: "stageId obrigatório para move_lead" });
        // Verifica que o estágio pertence à empresa
        const stage = await PipelineStage.findOne({ where: { id: stageId, companyId } });
        if (!stage) return res.status(404).json({ error: "Estágio não encontrado." });
        updateData.stageId = stageId;
        updateData.lastActivityAt = new Date();
        break;

      case "add_note":
        if (!note || !note.trim()) return res.status(400).json({ error: "nota obrigatória para add_note" });
        const existingNotes = lead.notes || "";
        const timestamp = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        updateData.notes = existingNotes
          ? `${existingNotes}\n\n[IA - ${timestamp}] ${note.trim()}`
          : `[IA - ${timestamp}] ${note.trim()}`;
        updateData.lastActivityAt = new Date();
        break;

      case "mark_won":
        updateData.status = "convertido";
        updateData.leadStatus = "convertido";
        updateData.lastActivityAt = new Date();
        break;

      case "mark_lost":
        updateData.status = "perdido";
        updateData.leadStatus = "perdido";
        updateData.lastActivityAt = new Date();
        if (reason) {
          const existingNotes2 = lead.notes || "";
          const ts2 = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
          updateData.notes = existingNotes2
            ? `${existingNotes2}\n\n[IA - ${ts2}] Motivo da perda: ${reason}`
            : `[IA - ${ts2}] Motivo da perda: ${reason}`;
        }
        break;

      default:
        return res.status(400).json({ error: "Tipo de ação desconhecido" });
    }

    const updatedLead = await UpdateCrmLeadService(updateData);

    return res.status(200).json({
      success: true,
      message: "Ação executada com sucesso.",
      lead: { id: updatedLead.id, name: updatedLead.name, status: updatedLead.status, stageId: updatedLead.stageId }
    });
  } catch (err: any) {
    console.error("[CrmAI] action error:", err);
    return res.status(500).json({ error: err?.message || "Erro ao executar ação" });
  }
};
