export const DEFAULT_FOLLOW_UP_COLUMNS = ["Sem Categoria"];

export const FOLLOW_UP_STARTER_BOARDS = [
  {
    name: "Reconquista Inteligente",
    funnelName: "Recuperacao",
    columns: ["Sem resposta", "Contato morno", "Reengajar hoje", "Recuperados"]
  },
  {
    name: "Campanhas Ativas",
    funnelName: "Campanhas",
    columns: ["Sem Categoria", "Aquecimento", "Oferta ativa", "Pos-campanha"]
  },
  {
    name: "Leads por Etiqueta",
    funnelName: "Segmentacao",
    columns: ["Sem Categoria", "VIP", "Urgentes", "Relacionamento"]
  },
  {
    name: "Funil Comercial",
    funnelName: "Vendas",
    columns: ["Primeiro toque", "Qualificacao", "Proposta", "Fechamento"]
  }
];

export const DEFAULT_SUCCESS_KEYWORDS = [
  "sim",
  "quero",
  "tenho interesse",
  "interesse",
  "manda",
  "pode enviar",
  "pode mandar",
  "orcamento",
  "orçamento",
  "proposta",
  "agendar",
  "agenda",
  "reuniao",
  "reunião",
  "vamos fechar",
  "fechado",
  "gostei"
];

export const DEFAULT_STOP_KEYWORDS = [
  "pare",
  "parar",
  "remover",
  "nao quero",
  "não quero",
  "sem interesse",
  "nao tenho interesse",
  "não tenho interesse",
  "cancelar",
  "descadastrar",
  "sair"
];

export const FOLLOW_UP_TARGET_MODES = {
  all: "all",
  tags: "tags",
  pipeline_stage: "pipeline_stage",
  hybrid: "hybrid"
};

export const FOLLOW_UP_ALLOWED_TYPES = ["text", "image", "video", "audio", "document", "media", "buttons"];
