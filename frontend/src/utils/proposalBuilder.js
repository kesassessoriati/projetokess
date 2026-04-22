export const PROPOSAL_STATUS = {
  rascunho: "Rascunho",
  enviada: "Publicada",
  aceita: "Aceita",
  recusada: "Recusada",
};

export const proposalStatusTone = {
  rascunho: "#8b8ba7",
  enviada: "#10b981",
  aceita: "#22c55e",
  recusada: "#ef4444",
};

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const createProposalId = uid;

export const defaultProposalData = (clientName = "", city = "Vitória da Conquista - BA") => ({
  cliente: clientName,
  cidade: city,
  progresso_fase: 0,
  dias_plano: 126,
  introducao:
    "Plano estruturado para organizar a operação, melhorar atendimento, criar previsibilidade comercial e entregar crescimento com processos claros.",
  theme: {
    primaryColor: "#3b82f6",
    accentColor: "#10b981",
    headerIcon: "💙",
    headerTitle: "Plano de Crescimento",
    headerSubtitle: "Proposta estratégica",
    fontFamily: "Inter",
    footerTitle: "Fase 2 - Visão de Futuro",
    footerSubtitle: "Após a implantação, a operação passa a crescer com mais controle e previsibilidade.",
    footerCards: [
      {
        icon: "📊",
        title: "Tráfego Pago",
        description: "Campanhas com base sólida, conversão otimizada e acompanhamento por indicador.",
      },
      {
        icon: "🌐",
        title: "Expansão de Serviços",
        description: "Novas ofertas, canais digitais integrados e parcerias estratégicas.",
      },
      {
        icon: "🏆",
        title: "Escala Regional",
        description: "Modelo operacional pronto para aumentar alcance e reputação.",
      },
    ],
    footerQuote: "A excelência não é um ato, mas um hábito.",
    footerQuoteAuthor: "Aristóteles",
  },
  phases: [
    {
      id: "fase-1",
      name: "Fase Inicial",
      weeks: "Semanas 1-2",
      objective: "Definir objetivos e estruturar a base do projeto.",
      justification: "A base técnica e operacional precisa estar clara antes das ações de crescimento.",
      icon: "🚀",
      color: "#6366f1",
      actions: [
        {
          id: "acao-1",
          title: "Diagnóstico e plano de execução",
          time: "3 dias",
          responsible: "Consultoria / Gestor",
          tasks: [
            "Mapear canais, processos e principais gargalos.",
            "Definir prioridades, responsáveis e entregas por semana.",
          ],
          delivery: "Mapa inicial do projeto e cronograma validado.",
          benefits: ["Mais clareza na execução", "Menos retrabalho", "Prioridades visíveis"],
        },
      ],
    },
  ],
  diagnostico: [
    {
      id: "diag-1",
      title: "Base operacional",
      description: "Processos, canais e responsáveis precisam estar documentados para o crescimento ser replicável.",
      icon: "🧭",
    },
    {
      id: "diag-2",
      title: "Conversão comercial",
      description: "A proposta organiza atendimento, follow-up e indicadores para reduzir perdas no funil.",
      icon: "📈",
    },
  ],
  metodo5s: [
    {
      numero: "1",
      nome: "SEIRI",
      titulo: "Utilização",
      descricao: "Eliminar excessos e manter somente o que ajuda a operação a vender e atender melhor.",
      items: ["Remover processos duplicados", "Centralizar informações úteis", "Definir canais oficiais"],
      color: "#ef4444",
    },
    {
      numero: "2",
      nome: "SEITON",
      titulo: "Organização",
      descricao: "Criar ordem, responsáveis e rotinas para cada frente do plano.",
      items: ["Organizar funis", "Padronizar tarefas", "Documentar entregas"],
      color: "#3b82f6",
    },
  ],
  scripts: [
    {
      id: "script-1",
      icon: "💬",
      title: "Primeiro contato",
      text: "Olá, {{nome}}! Recebemos seu interesse e preparamos um plano para organizar os próximos passos com clareza.",
    },
  ],
  kpis: [
    {
      id: "kpi-cat-1",
      title: "Indicadores Comerciais",
      icon: "📊",
      items: [
        { id: "kpi-1", icon: "🎯", label: "Leads qualificados", value: "+30%", source: "CRM" },
        { id: "kpi-2", icon: "⚡", label: "Tempo de resposta", value: "-40%", source: "Atendimento" },
      ],
    },
  ],
  orcamento: [
    {
      id: "orc-1",
      item: "Implantação e acompanhamento",
      custoMensal: "0",
      custoTotal: "0",
      observacao: "Ajuste os valores conforme o escopo negociado.",
    },
  ],
  roi: [
    { label: "Prazo do plano", value: "18 semanas", highlight: true },
    { label: "Foco", value: "Organização, automação e crescimento" },
  ],
});

const mapLegacyPhase = (phase, index) => ({
  id: String(phase.id || `fase-${index + 1}`),
  name: phase.name || phase.nome || `Fase ${index + 1}`,
  weeks: phase.weeks || phase.semanas || "",
  objective: phase.objective || phase.objetivo || "",
  justification: phase.justification || "",
  icon: phase.icon || "🚀",
  color: phase.color || "#6366f1",
  actions: (phase.actions || phase.acoes || []).map((action, actionIndex) => ({
    id: String(action.id || `acao-${index + 1}-${actionIndex + 1}`),
    title: action.title || action.titulo || `Ação ${actionIndex + 1}`,
    time: action.time || action.tempo || "",
    responsible: action.responsible || action.responsavel || "",
    tasks: action.tasks || action.tarefas || [],
    delivery: action.delivery || action.entrega || "",
    benefits: action.benefits || action.beneficios || [],
  })),
});

const normalizeKpis = (kpis) => {
  if (!Array.isArray(kpis)) return [];
  if (kpis.some((kpi) => Array.isArray(kpi.items))) return kpis;

  return [
    {
      id: "kpi-cat-legacy",
      title: "Indicadores de Resultado",
      icon: "📊",
      items: kpis.map((kpi, index) => ({
        id: String(kpi.id || `kpi-${index + 1}`),
        icon: kpi.icon || "🎯",
        label: kpi.label || kpi.indicador || "",
        value: kpi.value || kpi.meta || "",
        source: kpi.source || kpi.fonte || "",
      })),
    },
  ];
};

export const normalizeProposalData = (proposal = {}) => {
  const data = proposal.data || {};
  const base = defaultProposalData(proposal.clientName || data.cliente || "", data.cidade || "Vitória da Conquista - BA");

  return {
    ...base,
    ...data,
    cliente: data.cliente || proposal.clientName || base.cliente,
    phases: Array.isArray(data.phases) && data.phases.length ? data.phases.map(mapLegacyPhase) : base.phases,
    metodo5s: Array.isArray(data.metodo5s) && data.metodo5s.length ? data.metodo5s : base.metodo5s,
    scripts: Array.isArray(data.scripts) && data.scripts.length
      ? data.scripts.map((script, index) => ({
        id: String(script.id || `script-${index + 1}`),
        icon: script.icon || "💬",
        title: script.title || script.titulo || "",
        text: script.text || script.texto || "",
      }))
      : base.scripts,
    kpis: normalizeKpis(data.kpis).length ? normalizeKpis(data.kpis) : base.kpis,
    orcamento: Array.isArray(data.orcamento) && data.orcamento.length
      ? data.orcamento
      : Array.isArray(data.budget) && data.budget.length
        ? data.budget
        : base.orcamento,
    theme: {
      ...base.theme,
      ...(data.theme || {}),
    },
  };
};

export const getPublicProposalUrl = (slug) => {
  if (!slug) return "";
  return `${window.location.origin}/propostas/public/${slug}`;
};

export const buildProposalTitle = (clientName) => `Proposta - ${clientName || "Novo cliente"}`;
