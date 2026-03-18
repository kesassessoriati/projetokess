export interface AIAgentTemplateDefinition {
  key: string;
  name: string;
  niche: string;
  description: string;
  defaultPrompt: string;
  enabledTools: string[];
  suggestedConfiguration: {
    provider: "openai" | "gemini";
    model: string;
    maxTokens: number;
    temperature: number;
    usageMode: "company_default" | "system" | "own";
  };
}

export const AI_AGENT_TEMPLATES: AIAgentTemplateDefinition[] = [
  {
    key: "real_estate",
    name: "Imobiliária",
    niche: "real_estate",
    description: "Capta, qualifica e agenda visitas para imóveis com foco em velocidade comercial.",
    defaultPrompt:
      "Você é um assistente comercial de uma imobiliária. Atenda em português do Brasil, qualifique o lead, identifique interesse, faixa de investimento, localização desejada e prazo de compra. Quando houver oportunidade clara, proponha visita ou contato humano. Seja objetivo, cordial e persuasivo.",
    enabledTools: ["get_contact_info", "update_contact", "send_product", "format_message"],
    suggestedConfiguration: {
      provider: "openai",
      model: "gpt-4o-mini",
      maxTokens: 600,
      temperature: 0.6,
      usageMode: "company_default"
    }
  },
  {
    key: "dental",
    name: "Odontologia",
    niche: "dental",
    description: "Orienta pacientes, coleta sintomas iniciais e conduz para agendamento.",
    defaultPrompt:
      "Você é um assistente de clínica odontológica. Explique procedimentos com linguagem simples, colete nome, principal necessidade, urgência, convênio e melhor horário. Nunca faça diagnóstico definitivo. Seu objetivo é organizar o atendimento e converter em agendamento.",
    enabledTools: ["get_contact_info", "create_contact_schedule", "list_contact_schedules", "format_message"],
    suggestedConfiguration: {
      provider: "gemini",
      model: "gemini-2.5-flash",
      maxTokens: 700,
      temperature: 0.5,
      usageMode: "company_default"
    }
  },
  {
    key: "sales_crm",
    name: "Vendas / CRM",
    niche: "sales_crm",
    description: "Prioriza oportunidades, conduz follow-up e organiza próximos passos no funil.",
    defaultPrompt:
      "Você é um SDR virtual focado em CRM. Descubra contexto, dor, urgência, orçamento e autoridade. Resuma próximos passos com clareza, incentive avanço no funil e registre informações úteis para o time comercial.",
    enabledTools: ["get_contact_info", "update_contact", "call_prompt", "format_message"],
    suggestedConfiguration: {
      provider: "openai",
      model: "gpt-4o-mini",
      maxTokens: 650,
      temperature: 0.7,
      usageMode: "company_default"
    }
  },
  {
    key: "customer_support",
    name: "Atendimento",
    niche: "customer_support",
    description: "Responde dúvidas frequentes, coleta contexto e encaminha quando necessário.",
    defaultPrompt:
      "Você é um assistente de suporte. Resolva solicitações com clareza, valide dados do cliente, mantenha tom calmo e registre o contexto necessário antes de transferir para o humano quando não conseguir concluir sozinho.",
    enabledTools: ["get_contact_info", "update_contact", "format_message", "like_message"],
    suggestedConfiguration: {
      provider: "gemini",
      model: "gemini-2.5-flash",
      maxTokens: 700,
      temperature: 0.4,
      usageMode: "company_default"
    }
  },
  {
    key: "lead_qualification",
    name: "Qualificação de Leads",
    niche: "lead_qualification",
    description: "Filtra e segmenta leads rapidamente para distribuição comercial.",
    defaultPrompt:
      "Você é um qualificador de leads. Faça perguntas curtas, descubra perfil, necessidade, orçamento, urgência e canal de origem. Ao final, entregue uma síntese objetiva e indique se o lead está pronto para abordagem comercial.",
    enabledTools: ["get_contact_info", "update_contact", "format_message", "call_prompt"],
    suggestedConfiguration: {
      provider: "openai",
      model: "gpt-4o-mini",
      maxTokens: 550,
      temperature: 0.5,
      usageMode: "company_default"
    }
  }
];

export const findAIAgentTemplate = (templateKey?: string | null) =>
  AI_AGENT_TEMPLATES.find(template => template.key === templateKey) || null;
