export interface WorkspaceMenuOption {
  menuKey: string;
  label: string;
  group: string;
  defaultVisible: boolean;
  protected: boolean;
}

export const WORKSPACE_MENU_OPTIONS: WorkspaceMenuOption[] = [
  { menuKey: "dashboard", label: "Dashboard", group: "Gestão", defaultVisible: true, protected: false },
  { menuKey: "relatorios", label: "Relatórios", group: "Gestão", defaultVisible: true, protected: false },
  { menuKey: "disparos", label: "Disparos", group: "Campanhas", defaultVisible: true, protected: false },
  { menuKey: "campanhas", label: "Campanhas", group: "Campanhas", defaultVisible: true, protected: false },
  { menuKey: "chat-interno", label: "Chat Interno", group: "Comunicação", defaultVisible: true, protected: false },
  { menuKey: "aquecimento", label: "Aquecimento WhatsApp", group: "Ferramentas", defaultVisible: true, protected: false },
  { menuKey: "chips", label: "Chips", group: "Sistema", defaultVisible: true, protected: false },
  { menuKey: "agente-ia", label: "Agente de IA", group: "IA", defaultVisible: true, protected: false },
  { menuKey: "construtor-fluxo", label: "Construtor de Fluxo", group: "Automação", defaultVisible: true, protected: false },
  { menuKey: "automacoes", label: "Automações", group: "Automação", defaultVisible: true, protected: false },
  { menuKey: "chat-agendamento", label: "Chat Agendamento", group: "Agenda", defaultVisible: true, protected: false },
  { menuKey: "compromissos", label: "Compromissos", group: "Agenda", defaultVisible: true, protected: false },
  { menuKey: "tutoriais", label: "Tutoriais", group: "Ajuda", defaultVisible: true, protected: false },
  { menuKey: "conversas", label: "Conversas", group: "Comunicação", defaultVisible: true, protected: false },
  { menuKey: "chamadas", label: "Chamadas", group: "Comunicação", defaultVisible: true, protected: false },
  { menuKey: "crm-kanban", label: "CRM Kanban", group: "CRM", defaultVisible: true, protected: false },
  { menuKey: "etiquetas", label: "Etiquetas", group: "CRM", defaultVisible: true, protected: false },
  { menuKey: "contatos", label: "Contatos", group: "CRM", defaultVisible: true, protected: false },
  { menuKey: "leads", label: "Leads", group: "CRM", defaultVisible: true, protected: false },
  { menuKey: "clientes", label: "Clientes", group: "CRM", defaultVisible: true, protected: false },
  { menuKey: "usuarios", label: "Usuários", group: "Sistema", defaultVisible: true, protected: false },
  { menuKey: "gestao-grupos", label: "Gestão de Grupos", group: "Sistema", defaultVisible: true, protected: false },
  { menuKey: "follow-ups", label: "Follow-ups", group: "CRM", defaultVisible: true, protected: false },
  { menuKey: "canais", label: "Canais", group: "Sistema", defaultVisible: true, protected: false },
  { menuKey: "respostas-rapidas", label: "Respostas Rápidas", group: "Comunicação", defaultVisible: true, protected: false },
  { menuKey: "biblioteca-midia", label: "Biblioteca de Mídia", group: "Ferramentas", defaultVisible: true, protected: false },
  { menuKey: "produtos", label: "Produtos", group: "Cadastros", defaultVisible: true, protected: false },
  { menuKey: "servicos", label: "Serviços", group: "Cadastros", defaultVisible: true, protected: false },
  { menuKey: "propostas", label: "Propostas", group: "CRM", defaultVisible: true, protected: false },
  { menuKey: "agenda", label: "Agenda", group: "Agenda", defaultVisible: true, protected: false },
  { menuKey: "projetos", label: "Projetos", group: "Produtividade", defaultVisible: true, protected: false },
  { menuKey: "tarefas", label: "Tarefas", group: "Produtividade", defaultVisible: true, protected: false },
  { menuKey: "departamentos", label: "Departamentos", group: "Sistema", defaultVisible: true, protected: false },
  { menuKey: "gestor-financeiro-ia", label: "Gestor Financeiro IA", group: "Financeiro", defaultVisible: true, protected: false },
  { menuKey: "faturas", label: "Faturas", group: "Financeiro", defaultVisible: true, protected: false },
  { menuKey: "financeiro", label: "Financeiro", group: "Financeiro", defaultVisible: true, protected: false },
  { menuKey: "gateways-pagamento", label: "Gateways de Pagamento", group: "Financeiro", defaultVisible: true, protected: false },
  { menuKey: "documentacao", label: "Documentação", group: "Ajuda", defaultVisible: true, protected: false },
  { menuKey: "integracoes", label: "Integrações", group: "Automação", defaultVisible: true, protected: false },
  { menuKey: "ferramentas", label: "Ferramentas", group: "Automação", defaultVisible: true, protected: false },
  { menuKey: "meta-ads", label: "Meta Ads", group: "Automação", defaultVisible: true, protected: false },
  { menuKey: "google-ads", label: "Google Ads", group: "Automação", defaultVisible: true, protected: false },
  { menuKey: "configuracoes", label: "Configurações", group: "Sistema", defaultVisible: true, protected: true },
  { menuKey: "smtp", label: "SMTP (E-mail)", group: "Sistema", defaultVisible: true, protected: false },
  { menuKey: "sip-webphone", label: "SIP / Webphone", group: "Sistema", defaultVisible: true, protected: false },
  { menuKey: "banners", label: "Banners", group: "Sistema", defaultVisible: true, protected: false },
  { menuKey: "video-tutorial", label: "Vídeo Tutorial", group: "Sistema", defaultVisible: true, protected: false },
  { menuKey: "personalizacao-menus", label: "Personalização de Menus", group: "Sistema", defaultVisible: true, protected: true },
  { menuKey: "personalizacao-lead", label: "Campos do Card do Lead", group: "Sistema", defaultVisible: true, protected: false },
  { menuKey: "reunioes", label: "Reuniões Gravadas", group: "Ferramentas", defaultVisible: true, protected: false },
  { menuKey: "pipeline-inteligente", label: "Pipeline Inteligente", group: "CRM", defaultVisible: true, protected: false },
  { menuKey: "meus-sites", label: "Meus Sites", group: "Ferramentas", defaultVisible: true, protected: false },
  { menuKey: "redes-sociais", label: "Redes Sociais", group: "Ferramentas", defaultVisible: true, protected: false },
  { menuKey: "ia-workflows", label: "Workflows de IA", group: "IA", defaultVisible: true, protected: false }
];

export const PROTECTED_MENU_KEYS = WORKSPACE_MENU_OPTIONS
  .filter(option => option.protected)
  .map(option => option.menuKey);

export const CANONICAL_MENU_KEYS = WORKSPACE_MENU_OPTIONS.map(option => option.menuKey);
