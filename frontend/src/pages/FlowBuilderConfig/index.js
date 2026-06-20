import React, {
  useState,
  useEffect,
  useReducer,
  useContext,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { MdSmartToy } from "react-icons/md";
import typebotIcon from "../../assets/typebot-ico.png";
import { HiOutlinePuzzle } from "react-icons/hi";

import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";

import noteNode from "./nodes/noteNode";
import javascriptNode from "./nodes/javascriptNode";
import audioNode from "./nodes/audioNode";
import typebotNode from "./nodes/typebotNode";
import openaiNode from "./nodes/openaiNode";
import directOpenaiNode from "./nodes/directOpenaiNode";
import messageNode from "./nodes/messageNode.js";
import startNode from "./nodes/startNode";
import menuNode from "./nodes/menuNode";
import intervalNode from "./nodes/intervalNode";
import imgNode from "./nodes/imgNode";
import randomizerNode from "./nodes/randomizerNode";
import videoNode from "./nodes/videoNode";
import questionNode from "./nodes/questionNode";
import fileNode from "./nodes/fileNode";
import transferFlowNode from "./nodes/transferFlowNode";
import apiRequestNode from "./nodes/apiRequestNode";
import addTagNode from "./nodes/addTagNode";
import addTagKanbanNode from "./nodes/addTagKanbanNode";
import conditionNode from "./nodes/conditionNode";
import asaasNode from "./nodes/asaasNode";
import smtpNode from "./nodes/smtpNode";
import googleSheetsNode from "./nodes/googleSheetsNode";
import variableNode from "./nodes/variableNode";
import closeTicketNode from "./nodes/closeTicketNode";
import sendMessageNode from "./nodes/sendMessageNode";
import waitQuestionNode from "./nodes/waitQuestionNode";
import kanbanStageNode from "./nodes/kanbanStageNode";
import crmLeadNode from "./nodes/crmLeadNode";
import contactFieldsNode from "./nodes/contactFieldsNode";


import api from "../../services/api";

import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Stack, Typography } from "@mui/material";
import { useParams } from "react-router-dom/cjs/react-router-dom.min";
import { Box, CircularProgress } from "@material-ui/core";
import BallotIcon from "@mui/icons-material/Ballot";

import "reactflow/dist/style.css";

import ReactFlow, {
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  onElementsRemove,
  useReactFlow,
  Controls,
} from "react-flow-renderer";
import FlowBuilderAddTextModal from "../../components/FlowBuilderAddTextModal";
import FlowBuilderIntervalModal from "../../components/FlowBuilderIntervalModal";
import FlowBuilderConditionModal from "../../components/FlowBuilderConditionModal";
import FlowBuilderMenuModal from "../../components/FlowBuilderMenuModal";
import {
  AccessTime,
  CallSplit,
  DynamicFeed,
  Image,
  ImportExport,
  LibraryBooks,
  Message,
  MicNone,
  PlayArrow,
  Videocam,
  Search,
  AccountTree,
  Http,
  LocalOffer,
  ViewKanban,
  Receipt,
  Email,
  Code,
  CheckCircle,
  Send,
  Schedule,
  Help,
  Rule,
  RocketLaunch,
  DataObject,
  ShoppingBag,
  StickyNote2,
  PersonAdd,
  DriveFileRenameOutline,
} from "@mui/icons-material";
import DescriptionIcon from "@mui/icons-material/Description";
import RemoveEdge from "./nodes/removeEdge";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import FlowBuilderAddImgModal from "../../components/FlowBuilderAddImgModal";
import FlowBuilderTicketModal from "../../components/FlowBuilderAddTicketModal";
import FlowBuilderAddAudioModal from "../../components/FlowBuilderAddAudioModal";
import FlowBuilderAddFileModal from "../../components/FlowBuilderAddFileModal";

import { useNodeStorage } from "../../stores/useNodeStorage";
import FlowBuilderRandomizerModal from "../../components/FlowBuilderRandomizerModal";
import FlowBuilderAddVideoModal from "../../components/FlowBuilderAddVideoModal";
import FlowBuilderSingleBlockModal from "../../components/FlowBuilderSingleBlockModal";
import singleBlockNode from "./nodes/singleBlockNode";
import { colorPrimary } from "../../styles/styles";
import ticketNode from "./nodes/ticketNode";
import { ConfirmationNumber } from "@material-ui/icons";
import FlowBuilderTypebotModal from "../../components/FlowBuilderAddTypebotModal";
import FlowBuilderOpenAIModal from "../../components/FlowBuilderAddOpenAIModal";
import FlowBuilderAddDirectOpenAIModal from "../../components/FlowBuilderAddDirectOpenAIModal";
import { TOOL_CATALOG, DEFAULT_SENSITIVE_TOOLS } from "../../constants/aiTools.js";
import FlowBuilderAddQuestionModal from "../../components/FlowBuilderAddQuestionModal";
import FlowBuilderTransferFlowModal from "../../components/FlowBuilderTransferFlowModal";
import FlowBuilderApiRequestModal from "../../components/FlowBuilderApiRequestModal";
import FlowBuilderAddTagModal from "../../components/FlowBuilderAddTagModal";
import FlowBuilderAddTagKanbanModal from "../../components/FlowBuilderAddTagKanbanModal";
import FlowBuilderAsaasModal from "../../components/FlowBuilderAsaasModal";
import FlowBuilderAddSmtpModal from "../../components/FlowBuilderAddSmtpModal";
import FlowBuilderGoogleSheetsModal from "../../components/FlowBuilderGoogleSheetsModal";
import FlowBuilderAddVariableModal from "../../components/FlowBuilderAddVariableModal";
import FlowBuilderCloseTicketModal from "../../components/FlowBuilderCloseTicketModal";
import FlowBuilderSendMessageModal from "../../components/FlowBuilderSendMessageModal";
import FlowBuilderWaitQuestionModal from "../../components/FlowBuilderWaitQuestionModal";
import FlowBuilderProductListModal from "../../components/FlowBuilderProductListModal";
import FlowBuilderAddKanbanStageModal from "../../components/FlowBuilderAddKanbanStageModal";
import FlowBuilderTriggerModal from "../../components/FlowBuilderTriggerModal";
import FlowBuilderJavaScriptModal from "../../components/FlowBuilderJavaScriptModal";
import FlowBuilderCrmLeadModal from "../../components/FlowBuilderCrmLeadModal";
import FlowBuilderContactFieldsModal from "../../components/FlowBuilderContactFieldsModal";

import productListNode from "./nodes/productListNode";
import withNodeTitle from "../../components/FlowBuilderNodeWrapper";
import FlowBuilderNodeRenameModal from "../../components/FlowBuilderNodeRenameModal";
import SaveIcon from "@mui/icons-material/Save";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import ChatIcon from "@material-ui/icons/Chat";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: 0,
    position: "relative",
    backgroundColor: "#272A2C",
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    border: "none",
    borderRadius: "12px",
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
  },
  sidebar: {
    width: "236px",
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 1111,
    padding: "14px 14px 90px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(6px)",
    borderRight: "1px solid rgba(148, 163, 184, 0.25)",
    boxShadow: "12px 0 35px rgba(15, 23, 42, 0.08)",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflowY: "auto",
    scrollbarWidth: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
  lockIcon: {
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#f3f4f6",
    },
  },
  buttonGroup: {
    width: "100%",
    marginBottom: "10px",
    padding: "8px 6px",
    borderRadius: 14,
    backgroundColor: "rgba(15, 23, 42, 0.02)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
  },
  groupLabel: {
    fontSize: "2.8px",
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.25em",
    marginBottom: "6px",
    paddingLeft: "2px",
    lineHeight: 1,
    transform: "scale(0.65)",
    transformOrigin: "left",
  },
  buttonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "6px",
    width: "100%",
  },
  button: {
    backgroundColor: "rgba(255,255,255,0.65)",
    color: "#0f172a",
    minWidth: "auto",
    width: "100%",
    height: "32px",
    borderRadius: "10px",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    padding: "0 10px",
    fontSize: "10.5px",
    fontWeight: 600,
    border: "1px solid rgba(148, 163, 184, 0.35)",
    textTransform: "none",
    transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
    gap: "8px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    "& .MuiButton-label": {
      width: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    "&:hover": {
      backgroundColor: "rgba(59,130,246,0.08)",
      borderColor: "rgba(59,130,246,0.25)",
      boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
      transform: "translateY(-1px)",
    },
  },
  buttonFullWidth: {
    gridColumn: "1 / -1",
  },
  buttonIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "18px",
    height: "18px",
    flexShrink: 0,
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    marginBottom: "8px",
  },
  saveButton: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: "600",
    textTransform: "none",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)",
    border: "none",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    flex: 1,
    minWidth: 0,
    "&:hover": {
      backgroundColor: "#2563eb",
      transform: "translateY(-1px)",
      boxShadow: "0 6px 16px rgba(59, 130, 246, 0.35)",
    },
    "&:active": {
      transform: "translateY(0px)",
      boxShadow: "0 2px 8px rgba(59, 130, 246, 0.25)",
    },
  },
  testButton: {
    width: "100%",
    backgroundColor: "#10b981",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: "600",
    textTransform: "none",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.22)",
    border: "none",
    marginBottom: "8px",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      backgroundColor: "#059669",
      transform: "translateY(-1px)",
      boxShadow: "0 6px 16px rgba(16, 185, 129, 0.32)",
    },
    "&:disabled": {
      backgroundColor: "#94a3b8",
      color: "#ffffff",
    },
  },
  backButton: {
    backgroundColor: "#f3f4f6",
    color: "#374151",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "500",
    textTransform: "none",
    border: "1px solid #e5e7eb",
    transition: "all 0.2s ease",
    flexShrink: 0,
    "&:hover": {
      backgroundColor: "#e5e7eb",
      borderColor: "#d1d5db",
    },
  },
  headerNotice: {
    backgroundColor: "#f0f9ff",
    border: "1px solid #bfdbfe",
    borderRadius: "8px",
    padding: "12px 16px",
    marginBottom: "20px",
    color: "#1e40af",
    fontSize: "14px",
    fontWeight: "500",
    textAlign: "center",
    position: "relative",
    zIndex: 10,
  },
  flowContainer: {
    width: "100%",
    height: "90%",
    position: "relative",
    display: "flex",
    borderRadius: "0 12px 12px 0",
    overflow: "hidden",
  },
  animatedEdge: {
    animation: "$dash 1.5s linear infinite",
  },
  "@keyframes dash": {
    from: {
      strokeDashoffset: 24,
    },
    to: {
      strokeDashoffset: 0,
    },
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "70vh",
    gap: "16px",
  },
  loadingText: {
    color: "#6b7280",
    fontSize: "16px",
    fontWeight: "500",
  },
  logsPanel: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 360,
    height: "100%",
    zIndex: 1200,
    background: "#0f172a",
    color: "#e5e7eb",
    boxShadow: "-18px 0 40px rgba(15,23,42,0.22)",
    borderLeft: "1px solid rgba(148,163,184,0.28)",
    display: "flex",
    flexDirection: "column",
  },
  logsHeader: {
    padding: "14px 16px 10px",
    borderBottom: "1px solid rgba(148,163,184,0.22)",
  },
  logsTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#f8fafc",
    marginBottom: 4,
  },
  logsSubtitle: {
    fontSize: 11,
    color: "#94a3b8",
  },
  logsTabs: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 6,
    padding: "10px 12px",
    borderBottom: "1px solid rgba(148,163,184,0.18)",
  },
  logsTab: {
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.5)",
    color: "#cbd5e1",
    borderRadius: 8,
    height: 30,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
  },
  logsTabActive: {
    background: "rgba(37,99,235,0.22)",
    color: "#93c5fd",
    borderColor: "#3b82f6",
  },
  logsList: {
    padding: 12,
    overflowY: "auto",
    display: "grid",
    gap: 10,
    flex: 1,
  },
  logCard: {
    border: "1px solid rgba(148,163,184,0.22)",
    background: "#1e293b",
    borderRadius: 10,
    padding: 12,
    textAlign: "left",
    cursor: "pointer",
    color: "#e2e8f0",
    boxShadow: "0 8px 22px rgba(0,0,0,0.16)",
  },
  logCardActive: {
    borderColor: "#60a5fa",
    boxShadow: "0 0 0 2px rgba(96,165,250,0.22)",
  },
  logMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    color: "#94a3b8",
    fontSize: 10,
    marginBottom: 8,
  },
  logMessage: {
    fontSize: 12,
    color: "#f8fafc",
    fontWeight: 700,
    marginBottom: 8,
  },
  logPath: {
    fontSize: 10,
    color: "#93c5fd",
    lineHeight: 1.4,
  },
  logsEmpty: {
    color: "#94a3b8",
    fontSize: 12,
    padding: 16,
    textAlign: "center",
  },
  executionDetails: {
    borderTop: "1px solid rgba(148,163,184,0.18)",
    padding: "12px",
    background: "rgba(15,23,42,0.72)",
  },
  executionDetailsTitle: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 10,
  },
  executionStep: {
    display: "grid",
    gridTemplateColumns: "22px 1fr",
    gap: 8,
    padding: "8px 0",
    borderBottom: "1px solid rgba(148,163,184,0.12)",
  },
  executionStepIndex: {
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "rgba(59,130,246,0.22)",
    color: "#bfdbfe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 800,
  },
  executionStepTitle: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: 700,
  },
  executionStepMessage: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 1.45,
    marginTop: 3,
  },
}));

function geraStringAleatoria(tamanho) {
  var stringAleatoria = "";
  var caracteres =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < tamanho; i++) {
    stringAleatoria += caracteres.charAt(
      Math.floor(Math.random() * caracteres.length)
    );
  }
  return stringAleatoria;
}

const GROUP_COLORS = [
  "#0ea5e9",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#ec4899",
  "#f59e0b",
  "#6366f1",
];

const NODE_TITLES = {
  message: "Mensagem",
  start: "Início do Fluxo",
  menu: "Menu",
  interval: "Intervalo",
  img: "Imagem",
  audio: "Áudio",
  randomizer: "Randomizador",
  video: "Vídeo",
  singleBlock: "Conteúdo",
  ticket: "Ticket",
  typebot: "Typebot",
  openai: "Agente IA",
  question: "Pergunta",
  file: "Arquivo",
  transferFlow: "Transferir Fluxo",
  apiRequest: "API Request",
  addTag: "Adicionar Tag",
  addTagKanban: "Tag Kanban",
  condition: "Condição",
  asaas: "2ª via Boleto",
  typebotNode: "Typebot",
  intervalNode: "Intervalo",
  smtp: "Envio SMTP",
  googleSheets: "Google Sheets",
  variable: "Variável",
  closeTicket: "Encerrar Ticket",
  sendMessage: "Enviar Mensagem",
  productList: "Lista de Produtos",
  waitQuestion: "Espera Condicional",
  kanbanStage: "Etapa Kanban",
  javascript: "JavaScript",
  note: "Nota",
  crmLead: "Criar / Atualizar Lead",
  contactFields: "Atualizar Campo do Contato",
};


const DEFAULT_SMTP_CONFIG = {
  connectionName: "",
  fromEmail: "",
  host: "",
  port: "587",
  username: "",
  password: "",
  useTLS: true,
};

const DEFAULT_EMAIL_CONFIG = {
  to: "",
  replyTo: "",
  cc: "",
  bcc: "",
  subject: "",
  customContent: false,
  contentMode: "text",
  content: "",
  attachmentsVariable: "",
  saveVariables: [],
};

const DEFAULT_VARIABLE_CONFIG = {
  variableName: "",
  valueType: "custom",
  editorMode: "text",
  customValue: "",
};

const getDefaultTitle = (type) => NODE_TITLES[type] || "Bloco";

const withTitleData = (type, data = {}) => {
  const nextTitle = data?.title || getDefaultTitle(type);
  return { ...data, title: nextTitle };
};

const ensureNodeTitle = (node) => ({
  ...node,
  data: withTitleData(node.type, node.data || {}),
});

const applyTitlesToNodes = (nodes = []) => nodes.map(ensureNodeTitle);

const nodeTypes = {
  message: withNodeTitle(messageNode, NODE_TITLES.message),
  start: withNodeTitle(startNode, NODE_TITLES.start),
  menu: withNodeTitle(menuNode, NODE_TITLES.menu),
  interval: withNodeTitle(intervalNode, NODE_TITLES.interval),
  img: withNodeTitle(imgNode, NODE_TITLES.img),
  audio: withNodeTitle(audioNode, NODE_TITLES.audio),
  randomizer: withNodeTitle(randomizerNode, NODE_TITLES.randomizer),
  video: withNodeTitle(videoNode, NODE_TITLES.video),
  singleBlock: withNodeTitle(singleBlockNode, NODE_TITLES.singleBlock),
  ticket: withNodeTitle(ticketNode, NODE_TITLES.ticket),
  typebot: withNodeTitle(typebotNode, NODE_TITLES.typebot),
  openai: withNodeTitle(openaiNode, NODE_TITLES.openai),
  directOpenai: withNodeTitle(directOpenaiNode, NODE_TITLES.openai),
  question: withNodeTitle(questionNode, NODE_TITLES.question),
  file: withNodeTitle(fileNode, NODE_TITLES.file),
  transferFlow: withNodeTitle(transferFlowNode, NODE_TITLES.transferFlow),
  apiRequest: withNodeTitle(apiRequestNode, NODE_TITLES.apiRequest),
  addTag: withNodeTitle(addTagNode, NODE_TITLES.addTag),
  addTagKanban: withNodeTitle(addTagKanbanNode, NODE_TITLES.addTagKanban),
  condition: withNodeTitle(conditionNode, NODE_TITLES.condition),
  asaas: withNodeTitle(asaasNode, NODE_TITLES.asaas),
  smtp: withNodeTitle(smtpNode, NODE_TITLES.smtp),
  googleSheets: withNodeTitle(googleSheetsNode, NODE_TITLES.googleSheets),
  sendMessage: withNodeTitle(sendMessageNode, NODE_TITLES.sendMessage),
  productList: withNodeTitle(productListNode, NODE_TITLES.productList),
  waitQuestion: withNodeTitle(waitQuestionNode, NODE_TITLES.waitQuestion),
  kanbanStage: withNodeTitle(kanbanStageNode, NODE_TITLES.kanbanStage),
  javascript: withNodeTitle(javascriptNode, NODE_TITLES.javascript),
  crmLead: withNodeTitle(crmLeadNode, NODE_TITLES.crmLead),
  contactFields: withNodeTitle(contactFieldsNode, NODE_TITLES.contactFields),
  note: noteNode,
};


const edgeTypes = {
  buttonedge: RemoveEdge,
};

const initialNodes = [
  {
    id: "1",
    position: { x: 250, y: 100 },
    data: withTitleData("start", { label: "Inicio do fluxo" }),
    type: "start",
  },
];

const initialEdges = [];

const LOG_STATUS_LABELS = {
  success: "Sucessos",
  warning: "Alertas",
  error: "Erros",
};

const stripRuntimeNodeData = (node) => {
  const {
    flowLogStats,
    groupPreview,
    groupLabel,
    groupColor,
    ...cleanData
  } = node.data || {};

  return {
    ...node,
    data: cleanData,
  };
};

export const FlowBuilderConfig = () => {
  const classes = useStyles();
  const history = useHistory();
  const { id } = useParams();

  // Debug: verificar id
  console.log("FlowBuilderConfig - id do fluxo:", id);

  const storageItems = useNodeStorage();

  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [dataNode, setDataNode] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [modalAddText, setModalAddText] = useState(null);
  const [modalAddInterval, setModalAddInterval] = useState(false);
  const [modalAddMenu, setModalAddMenu] = useState(null);
  const [modalAddImg, setModalAddImg] = useState(null);
  const [modalAddAudio, setModalAddAudio] = useState(null);
  const [modalAddRandomizer, setModalAddRandomizer] = useState(null);
  const [flowExecutions, setFlowExecutions] = useState([]);
  const [logsPanel, setLogsPanel] = useState({
    open: false,
    nodeId: null,
    status: "success",
  });
  const [selectedExecutionId, setSelectedExecutionId] = useState(null);
  const [testingFlow, setTestingFlow] = useState(false);
  const [modalAddVideo, setModalAddVideo] = useState(null);
  const [modalAddSingleBlock, setModalAddSingleBlock] = useState(null);
  const [contentModalType, setContentModalType] = useState(null);
  const [modalAddTicket, setModalAddTicket] = useState(null);
  const [modalAddTypebot, setModalAddTypebot] = useState(null);
  const [modalAddOpenAI, setModalAddOpenAI] = useState(null);
  const [modalAddDirectOpenAI, setModalAddDirectOpenAI] = useState(null);
  const [modalAddQuestion, setModalAddQuestion] = useState(null);
  const [modalAddFile, setModalAddFile] = useState(null);
  const [modalTransferFlow, setModalTransferFlow] = useState(null);
  const [modalApiRequest, setModalApiRequest] = useState(null);
  const [modalAddTag, setModalAddTag] = useState(null);
  const [modalAddTagKanban, setModalAddTagKanban] = useState(null);
  const [modalCondition, setModalCondition] = useState(null);
  const [modalAsaas, setModalAsaas] = useState(null);
  const [modalAddSmtp, setModalAddSmtp] = useState(null);
  const [modalAddGoogleSheets, setModalAddGoogleSheets] = useState(null);
  const [modalAddVariable, setModalAddVariable] = useState(null);
  const [modalCloseTicket, setModalCloseTicket] = useState(null);
  const [modalSendMessage, setModalSendMessage] = useState(null);
  const [modalProductList, setModalProductList] = useState(null);
  const [modalWaitQuestion, setModalWaitQuestion] = useState(null);
  const [modalAddKanbanStage, setModalAddKanbanStage] = useState(null);
  const [modalCrmLead, setModalCrmLead] = useState(null);
  const [modalContactFields, setModalContactFields] = useState(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [flowTriggers, setFlowTriggers] = useState([]);
  const [modalJavaScript, setModalJavaScript] = useState(null);

  const [nodeRenaming, setNodeRenaming] = useState(null);
  const [flowLocked, setFlowLocked] = useState(false);
  const [, setPageNumber] = useState(1);

  const connectionLineStyle = { 
    stroke: "#6366f1", 
    strokeWidth: "3px",
    strokeDasharray: "5,5"
  };

  // [TODA A LÓGICA DE ADIÇÃO DE NODES MANTIDA IGUAL]
  const addNode = (type, data) => {
    const posY = nodes[nodes.length - 1].position.y;
    const posX =
      nodes[nodes.length - 1].position.x + nodes[nodes.length - 1].width + 40;

    if (type === "file") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("file", {
              label: data.label || "Enviar Arquivo",
              url: data.url,
            }),
            type: "file",
          },
        ];
      });
    }

    if (type === "start") {
      return setNodes((old) => {
        return [
          {
            id: "1",
            position: { x: posX, y: posY },
            data: withTitleData("start", { label: "Inicio do fluxo", triggers: flowTriggers, onOpenTriggerModal: () => setTriggerModalOpen(true) }),
            type: "start",
          },
        ];
      });
    }
    if (type === "text") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("message", { label: data.text }),
            type: "message",
          },
        ];
      });
    }
    if (type === "interval") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("interval", {
              label: `Intervalo ${data.sec} seg.`,
              sec: data.sec,
            }),
            type: "interval",
          },
        ];
      });
    }
    if (type === "condition") {
      return setNodes((old) => {
        const firstCondition = Array.isArray(data.conditions) && data.conditions.length > 0
          ? data.conditions[0]
          : data;

        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("condition", {
              ...data,
              key: firstCondition.key,
              condition: firstCondition.condition,
              value: firstCondition.value,
            }),
            type: "condition",
          },
        ];
      });
    }
    if (type === "menu") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("menu", {
              message: data.message,
              arrayOption: data.arrayOption,
            }),
            type: "menu",
          },
        ];
      });
    }
    if (type === "img") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("img", { url: data.url }),
            type: "img",
          },
        ];
      });
    }
    if (type === "audio") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("audio", { url: data.url, record: data.record }),
            type: "audio",
          },
        ];
      });
    }
    if (type === "randomizer") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("randomizer", { ...data }),
            type: "randomizer",
          },
        ];
      });
    }
    if (type === "video") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("video", { url: data.url }),
            type: "video",
          },
        ];
      });
    }
    if (type === "singleBlock") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("singleBlock", { ...data }),
            type: "singleBlock",
          },
        ];
      });
    }
    if (type === "ticket") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("ticket", { ...data }),
            type: "ticket",
          },
        ];
      });
    }
    if (type === "typebot") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("typebot", { ...data }),
            type: "typebot",
          },
        ];
      });
    }
    if (type === "openai") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("openai", { ...data }),
            type: "openai",
          },
        ];
      });
    }
    if (type === "question") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("question", { ...data }),
            type: "question",
          },
        ];
      });
    }
    if (type === "transferFlow") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("transferFlow", { ...data }),
            type: "transferFlow",
          },
        ];
      });
    }
    if (type === "apiRequest") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("apiRequest", { ...data }),
            type: "apiRequest",
          },
        ];
      });
    }
    if (type === "smtp") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("smtp", {
              smtpConfig: { ...DEFAULT_SMTP_CONFIG, ...(data?.smtpConfig || {}) },
              emailConfig: { ...DEFAULT_EMAIL_CONFIG, ...(data?.emailConfig || {}) },
            }),
            type: "smtp",
          },
        ];
      });
    }
    if (type === "addTag") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("addTag", { ...data }),
            type: "addTag",
          },
        ];
      });
    }
    if (type === "addTagKanban") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("addTagKanban", { ...data }),
            type: "addTagKanban",
          },
        ];
      });
    }
    if (type === "asaas") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: withTitleData("asaas", { ...data }),
            type: "asaas",
          },
        ];
      });
    }
    if (type === "variable") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: withTitleData("variable", {
            variableConfig: {
              ...DEFAULT_VARIABLE_CONFIG,
              ...(data?.variableConfig || {}),
            },
          }),
          type: "variable",
        },
      ]);
    }
    if (type === "closeTicket") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: withTitleData("closeTicket", {
            message: data?.message || "",
          }),
          type: "closeTicket",
        },
      ]);
    }
    if (type === "sendMessage") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: withTitleData("sendMessage", { ...data }),
          type: "sendMessage",
        },
      ]);
    }
    if (type === "productList") {
      setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: withTitleData("productList", { 
            title: data?.title || "🛍️ Nossos Produtos e Serviços",
            listType: data?.listType || "all",
            selectedItems: data?.selectedItems || []
          }),
          type: "productList",
        },
      ]);
      // Fechar modal após adicionar
      setModalProductList(null);
    }

    if (type === "waitQuestion") {
      setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: withTitleData("waitQuestion", {
            waitTime: data?.waitTime || 30,
            waitUnit: data?.waitUnit || "minutes",
            question: data?.question || "Você precisa de ajuda?",
            mediaType: data?.mediaType || "none",
            mediaUrl: data?.mediaUrl || null,
            mediaName: data?.mediaName || null,
            optionX: data?.optionX || {
              trigger: "1",
              matchType: "exact",
              label: "SIM",
              action: "continue"
            },
            optionY: data?.optionY || {
              trigger: "2",
              matchType: "exact",
              label: "NÃO",
              action: "transfer"
            },
            transferQueueId: data?.transferQueueId || null,
            closeTicket: data?.closeTicket || false,
            timeoutEnabled: data?.timeoutEnabled || false,
            timeoutTime: data?.timeoutTime || 60,
            timeoutUnit: data?.timeoutUnit || "minutes",
            timeoutAction: data?.timeoutAction || "continue"
          }),
          type: "waitQuestion",
        },
      ]);
      // Fechar modal após adicionar
      setModalWaitQuestion(null);
    }

    if (type === "kanbanStage") {
      setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: withTitleData("kanbanStage", { ...data }),
          type: "kanbanStage",
        },
      ]);
      setModalAddKanbanStage(null);
    }

    if (type === "javascript") {
      setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: withTitleData("javascript", { code: data?.code || "" }),
          type: "javascript",
        },
      ]);
      setModalJavaScript(null);
    }

    if (type === "note") {
      const noteId = geraStringAleatoria(30);
      setNodes((old) => [
        ...old,
        {
          id: noteId,
          position: { x: posX, y: posY + 40 },
          data: {
            text: "Clique duas vezes para editar...",
            color: "#fef9c3",
            onTextChange: (nId, newText) => {
              setNodes((prev) => prev.map((n) => n.id === nId ? { ...n, data: { ...n.data, text: newText } } : n));
            },
            onColorChange: (nId, newColor) => {
              setNodes((prev) => prev.map((n) => n.id === nId ? { ...n, data: { ...n.data, color: newColor } } : n));
            },
          },
          type: "note",
        },
      ]);
    }
  };


  // [TODAS AS FUNÇÕES DE ADIÇÃO MANTIDAS IGUAIS]
  const textAdd = (data) => { addNode("text", data); };
  const intervalAdd = (data) => { addNode("interval", data); };
  const conditionAdd = (data) => { addNode("condition", data); };
  const menuAdd = (data) => { addNode("menu", data); };
  const imgAdd = (data) => { addNode("img", data); };
  const audioAdd = (data) => { addNode("audio", data); };
  const randomizerAdd = (data) => { addNode("randomizer", data); };
  const waitQuestionAdd = (data) => { addNode("waitQuestion", data); };
  const videoAdd = (data) => { addNode("video", data); };
  const singleBlockAdd = (data) => { addNode("singleBlock", data); };
  const ticketAdd = (data) => { addNode("ticket", data); };
  const typebotAdd = (data) => { addNode("typebot", data); };
  const openaiAdd = (data) => { addNode("openai", data); };
  const questionAdd = (data) => { addNode("question", data); };
  const fileAdd = (data) => { addNode("file", data); };
  const transferFlowAdd = (data) => { addNode("transferFlow", data); };
  const apiRequestAdd = (data) => { addNode("apiRequest", data); };
  const addTagAdd = (data) => { addNode("addTag", data); };
  const addTagKanbanAdd = (data) => { addNode("addTagKanban", data); };
  const asaasAdd = (data) => { addNode("asaas", data); };
  const smtpAdd = (data) => { addNode("smtp", data); };
  const googleSheetsAdd = (data) => { addNode("googleSheets", data); };
  const variableAdd = (data) => { addNode("variable", data); };
  const closeTicketAdd = (data) => { addNode("closeTicket", data); };
  const sendMessageAdd = (data) => { addNode("sendMessage", data); };
  const productListAdd = (data) => { addNode("productList", data); };
  const kanbanStageAdd = (data) => { addNode("kanbanStage", data); };
  const javascriptAdd = (data) => { addNode("javascript", data); };
  const crmLeadAdd = (data) => { addNode("crmLead", data); };
  const contactFieldsAdd = (data) => { addNode("contactFields", data); };
  const noteAdd = () => { addNode("note", {}); };


  // [TODOS OS useEffect MANTIDOS IGUAIS]
  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get(`/flowbuilder/flow/${id}`);

          if (data.flow.flow !== null) {
            const loadedTriggers = data.flow.triggers || [];
            setFlowTriggers(loadedTriggers);
            const flowNodes = data.flow.flow.nodes.map((n) =>
              n.type === "start"
                ? { ...n, data: { ...n.data, triggers: loadedTriggers, onOpenTriggerModal: () => setTriggerModalOpen(true) } }
                : n
            );
            setNodes(applyTitlesToNodes(flowNodes));
            setEdges(data.flow.flow.connections);
            // Extrair variáveis dos nós question
            const questionNodes = flowNodes.filter(
              (nd) => nd.type === "question"
            );
            const questionVariables = questionNodes.map(
              (variable) => variable.data.typebotIntegration.answerKey
            );
            
            // Extrair variáveis dos nós apiRequest
            const apiNodes = flowNodes.filter(
              (nd) => nd.type === "apiRequest"
            );
            const apiVariables = apiNodes.flatMap(
              (node) => node.data?.data?.savedVariables?.map(variable => variable.name) || []
            );
            
            // Combinar todas as variáveis
            const variableNodes = flowNodes.filter(
              (nd) => nd.type === "variable"
            );
            const manualVariables = variableNodes.map(
              (node) => node.data?.data?.variableName || node.data?.variableName
            );

            const allVariables = [...questionVariables, ...apiVariables, ...manualVariables];
            
            // Remover duplicatas e valores vazios
            const uniqueVariables = [...new Set(allVariables.filter(v => v && v.trim()))];
            
            localStorage.setItem("variables", JSON.stringify(uniqueVariables));
          }
          setLoading(false);
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [id]);

  const fetchFlowExecutions = useCallback(async () => {
    if (!id) return;

    try {
      const { data } = await api.get("/flowbuilder/executions", {
        params: { flowId: id, pageNumber: 1 },
      });
      setFlowExecutions(data.executions || []);
      return data.executions || [];
    } catch (error) {
      console.log("Erro ao buscar logs do fluxo", error);
      return [];
    }
  }, [id]);

  useEffect(() => {
    fetchFlowExecutions();
  }, [fetchFlowExecutions]);

  useEffect(() => {
    const handler = (event) => {
      setLogsPanel({
        open: true,
        nodeId: event.detail?.nodeId,
        status: event.detail?.status || "success",
      });
      setSelectedExecutionId(null);
      fetchFlowExecutions();
    };

    window.addEventListener("flowbuilder:open-node-logs", handler);
    return () => window.removeEventListener("flowbuilder:open-node-logs", handler);
  }, [fetchFlowExecutions]);

  useEffect(() => {
    if (storageItems.action === "delete") {
      setNodes((old) => old.filter((item) => item.id !== storageItems.node));
      setEdges((old) => {
        const newData = old.filter((item) => item.source !== storageItems.node);
        const newClearTarget = newData.filter(
          (item) => item.target !== storageItems.node
        );
        return newClearTarget;
      });
      storageItems.setNodesStorage("");
      storageItems.setAct("idle");
    }
    if (storageItems.action === "duplicate") {
      const nodeDuplicate = nodes.filter(
        (item) => item.id === storageItems.node
      )[0];
      const maioresX = nodes.map((node) => node.position.x);
      const maiorX = Math.max(...maioresX);
      const finalY = nodes[nodes.length - 1].position.y;
      const nodeNew = {
        ...nodeDuplicate,
        id: geraStringAleatoria(30),
        position: {
          x: maiorX + 240,
          y: finalY,
        },
        selected: false,
        style: { backgroundColor: "#555555", padding: 0, borderRadius: 8 },
      };
      setNodes((old) => [...old, nodeNew]);
      storageItems.setNodesStorage("");
      storageItems.setAct("idle");
    }
    if (storageItems.action === "edit") {
      const nodeToEdit = nodes.find((item) => item.id === storageItems.node);
      if (nodeToEdit?.type === "randomizer") {
        setDataNode(nodeToEdit);
        setModalAddRandomizer("edit");
      }
      storageItems.setNodesStorage("");
      storageItems.setAct("idle");
    }
    if (storageItems.action === "rename") {
      const nodeToRename = nodes.find((item) => item.id === storageItems.node);
      if (nodeToRename) {
        setNodeRenaming(nodeToRename);
        setRenameModalOpen(true);
      }
      storageItems.setNodesStorage("");
      storageItems.setAct("idle");
    }
  }, [storageItems.action]);

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const flowLogStatsByNode = useMemo(() => {
    const stats = {};

    flowExecutions.forEach((execution) => {
      const path = Array.isArray(execution.nodePath) ? execution.nodePath : [];

      path.forEach((item) => {
        if (!item?.nodeId) return;
        if (!stats[item.nodeId]) {
          stats[item.nodeId] = { success: 0, warning: 0, error: 0 };
        }
        const status = item.status === "error" ? "error" : item.status === "warning" ? "warning" : "success";
        stats[item.nodeId][status] += 1;
      });

      if (path.length === 0 && execution.lastNodeId) {
        if (!stats[execution.lastNodeId]) {
          stats[execution.lastNodeId] = { success: 0, warning: 0, error: 0 };
        }
        stats[execution.lastNodeId][execution.status === "error" ? "error" : "success"] += 1;
      }
    });

    return stats;
  }, [flowExecutions]);

  const selectedExecution = useMemo(
    () => flowExecutions.find((execution) => execution.id === selectedExecutionId),
    [flowExecutions, selectedExecutionId]
  );

  const selectedExecutionPathIds = useMemo(() => {
    if (!selectedExecution || !Array.isArray(selectedExecution.nodePath)) return [];
    return selectedExecution.nodePath.map((item) => item.nodeId).filter(Boolean);
  }, [selectedExecution]);

  const nodesWithRuntimeData = useMemo(() => {
    return nodes.map((node) => {
      const previewIndex = selectedExecutionPathIds.indexOf(node.id);
      return {
        ...node,
        data: {
          ...(node.data || {}),
          flowLogStats: flowLogStatsByNode[node.id] || { success: 0, warning: 0, error: 0 },
          groupPreview: previewIndex >= 0,
          groupLabel: previewIndex >= 0 ? `${previewIndex + 1}º bloco executado` : node.data?.groupLabel,
        },
      };
    });
  }, [nodes, flowLogStatsByNode, selectedExecutionPathIds]);

  const currentNodeLogs = useMemo(() => {
    if (!logsPanel.nodeId) return [];

    return flowExecutions
      .map((execution) => {
        const path = Array.isArray(execution.nodePath) ? execution.nodePath : [];
        const nodeLog = path.find((item) => item.nodeId === logsPanel.nodeId);
        const fallbackLog = path.length === 0 && execution.lastNodeId === logsPanel.nodeId
          ? {
            nodeId: execution.lastNodeId,
            nodeType: execution.lastNodeType,
            nodeTitle: execution.lastNodeType || "Bloco",
            status: execution.status === "error" ? "error" : "success",
            message: execution.errorMessage || "Execução registrada",
            executedAt: execution.updatedAt,
          }
          : null;
        const log = nodeLog || fallbackLog;
        if (!log) return null;

        const status = log.status === "error" ? "error" : log.status === "warning" ? "warning" : "success";
        if (status !== logsPanel.status) return null;

        return { execution, log, path };
      })
      .filter(Boolean);
  }, [flowExecutions, logsPanel.nodeId, logsPanel.status]);

  // Edge deletion via custom event dispatched by RemoveEdge component
  useEffect(() => {
    const handler = (e) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== e.detail.id));
    };
    window.addEventListener("flowbuilder:delete-edge", handler);
    return () => window.removeEventListener("flowbuilder:delete-edge", handler);
  }, [setEdges]);
  const [groupSelectionActive, setGroupSelectionActive] = useState(false);
  const [groupSelectionIds, setGroupSelectionIds] = useState([]);
  const selectionActiveRef = useRef(false);
  const groupSelectionIdsRef = useRef([]);
  const groupColorIndexRef = useRef(0);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const pickGroupColor = useCallback(() => {
    const color = GROUP_COLORS[groupColorIndexRef.current % GROUP_COLORS.length];
    groupColorIndexRef.current += 1;
    return color;
  }, []);

  const clearGroupPreview = useCallback(() => {
    setNodes((old) =>
      old.map((node) =>
        node.data?.groupPreview
          ? {
            ...node,
            data: { ...node.data, groupPreview: false },
          }
          : node
      )
    );
  }, [setNodes]);

  const resetGroupSelection = useCallback(() => {
    groupSelectionIdsRef.current = [];
    setGroupSelectionIds([]);
    clearGroupPreview();
  }, [clearGroupPreview]);

  const stopGroupSelection = useCallback(() => {
    if (!selectionActiveRef.current) return;
    selectionActiveRef.current = false;
    setGroupSelectionActive(false);
    window.removeEventListener("mouseup", stopGroupSelection);
    const ids = groupSelectionIdsRef.current || [];
    if (ids.length > 0) {
      const rawTitle = window.prompt("Digite um título para este grupo:");
      const title = rawTitle ? rawTitle.trim() : "";
      if (title) {
        const color = pickGroupColor();
        setNodes((old) =>
          old.map((node) =>
            ids.includes(node.id)
              ? {
                ...node,
                data: {
                  ...node.data,
                  groupLabel: title,
                  groupColor: color,
                  groupPreview: false,
                },
              }
              : node
          )
        );
      }
    }
    resetGroupSelection();
  }, [pickGroupColor, resetGroupSelection, setNodes]);

  useEffect(() => {
    return () => {
      window.removeEventListener("mouseup", stopGroupSelection);
    };
  }, [stopGroupSelection]);

  const startGroupSelection = useCallback(() => {
    if (flowLocked) return;
    if (selectionActiveRef.current) return;
    selectionActiveRef.current = true;
    setGroupSelectionActive(true);
    groupSelectionIdsRef.current = [];
    setGroupSelectionIds([]);
    clearGroupPreview();
    window.addEventListener("mouseup", stopGroupSelection);
  }, [clearGroupPreview, flowLocked, stopGroupSelection]);

  const addNodeToSelection = useCallback(
    (nodeId) => {
      setGroupSelectionIds((prev) => {
        if (prev.includes(nodeId)) return prev;
        const updated = [...prev, nodeId];
        groupSelectionIdsRef.current = updated;
        setNodes((old) =>
          old.map((item) =>
            item.id === nodeId
              ? {
                ...item,
                data: { ...item.data, groupPreview: true },
              }
              : item
          )
        );
        return updated;
      });
    },
    [setNodes]
  );

  const handlePaneMouseDown = useCallback(
    (event) => {
      if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
        startGroupSelection();
      }
    },
    [startGroupSelection]
  );

  const handleNodeMouseDown = useCallback(
    (event, node) => {
      if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
        startGroupSelection();
        addNodeToSelection(node.id);
      }
    },
    [addNodeToSelection, startGroupSelection]
  );

  const handleNodeMouseEnter = useCallback(
    (event, node) => {
      if (!selectionActiveRef.current) return;
      event.preventDefault();
      addNodeToSelection(node.id);
    },
    [addNodeToSelection]
  );

  const saveFlow = async () => {
    const nodesWithTitles = applyTitlesToNodes(nodes).map(stripRuntimeNodeData);
    setNodes(nodesWithTitles);
    await api.post("/flowbuilder/flow", {
      idFlow: id,
      nodes: nodesWithTitles,
      connections: edges,
    });
    await api.put(`/flowbuilder/${id}/triggers`, { triggers: flowTriggers });
    toast.success("Fluxo salvo com sucesso");
  };

  // [TODAS AS FUNÇÕES DE EVENTOS MANTIDAS IGUAIS]
  const testFlow = async () => {
    if (testingFlow) return;

    const storedNumber = localStorage.getItem("flowbuilderTestContactNumber") || "";
    const contactNumber = window.prompt(
      "Informe o número do contato para testar o fluxo (somente números ou com DDI).",
      storedNumber
    );

    if (!contactNumber) return;

    const contactName = window.prompt(
      "Nome do contato de teste (opcional).",
      localStorage.getItem("flowbuilderTestContactName") || "Contato Teste"
    );

    const message = window.prompt(
      "Mensagem/frase de teste (opcional).",
      "teste manual"
    );

    setTestingFlow(true);

    try {
      await saveFlow();

      localStorage.setItem("flowbuilderTestContactNumber", contactNumber);
      if (contactName) {
        localStorage.setItem("flowbuilderTestContactName", contactName);
      }

      const { data } = await api.post(`/flowbuilder/test/${id}`, {
        contactNumber,
        contactName,
        message,
      });

      const executions = await fetchFlowExecutions();
      const execution = executions.find((item) => item.id === data.executionId) || data;
      const firstLog = Array.isArray(execution.nodePath) ? execution.nodePath[0] : null;

      if (firstLog?.nodeId) {
        setLogsPanel({
          open: true,
          nodeId: firstLog.nodeId,
          status: firstLog.status === "error" ? "error" : firstLog.status === "warning" ? "warning" : "success",
        });
      }

      setSelectedExecutionId(data.executionId);
      toast.success("Fluxo de teste executado. Log gerado para conferência.");
    } catch (error) {
      toastError(error);
    } finally {
      setTestingFlow(false);
    }
  };

  const doubleClick = (event, node) => {
    console.log("NODE", node);
    setDataNode(node);
    if (node.type === "start") { setTriggerModalOpen(true); return; }
    if (node.type === "message") { setModalAddText("edit"); }
    if (node.type === "interval") { setModalAddInterval("edit"); }
    if (node.type === "menu") { setModalAddMenu("edit"); }
    if (node.type === "img") { setModalAddImg("edit"); }
    if (node.type === "audio") { setModalAddAudio("edit"); }
    if (node.type === "randomizer") { setModalAddRandomizer("edit"); }
    if (node.type === "singleBlock") { setModalAddSingleBlock("edit"); }
    if (node.type === "ticket") { setModalAddTicket("edit"); }
    if (node.type === "typebot") { setModalAddTypebot("edit"); }
    if (node.type === "openai") { setModalAddOpenAI("edit"); }
    if (node.type === "directOpenai") { setModalAddDirectOpenAI("edit"); }
    if (node.type === "question") { setModalAddQuestion("edit"); }
    if (node.type === "file") { setModalAddFile("edit"); }
    if (node.type === "transferFlow") { setModalTransferFlow("edit"); }
    if (node.type === "apiRequest") { setModalApiRequest("edit"); }
    if (node.type === "addTag") { setModalAddTag("edit"); }
    if (node.type === "addTagKanban") { setModalAddTagKanban("edit"); }
    if (node.type === "condition") { setModalCondition("edit"); }
    if (node.type === "asaas") { setModalAsaas("edit"); }
    if (node.type === "smtp") { setModalAddSmtp("edit"); }
    if (node.type === "googleSheets") { setModalAddGoogleSheets("edit"); }
    if (node.type === "variable") { setModalAddVariable("edit"); }
    if (node.type === "closeTicket") { setModalCloseTicket("edit"); }
    if (node.type === "sendMessage") { setModalSendMessage("edit"); }
    if (node.type === "productList") { setModalProductList("edit"); }
    if (node.type === "waitQuestion") { setModalWaitQuestion("edit"); }
    if (node.type === "kanbanStage") { setModalAddKanbanStage("edit"); }
    if (node.type === "javascript") { setModalJavaScript("edit"); }
    if (node.type === "crmLead") { setModalCrmLead("edit"); }
    if (node.type === "contactFields") { setModalContactFields("edit"); }
    if (node.type === "note") { /* handled inline by noteNode */ }
  };


  const clickNode = (event, node) => {
    setNodes((old) =>
      old.map((item) => {
        if (item.id === node.id) {
          return {
            ...item,
            style: { 
              backgroundColor: "#3b82f6", 
              padding: 1, 
              borderRadius: 8,
              pointerEvents: "auto" // Garante interatividade
            },
          };
        }
        return {
          ...item,
          style: { 
            backgroundColor: "#ffffff", 
            padding: 0, 
            borderRadius: 8,
            pointerEvents: "auto" // Garante interatividade
          },
        };
      })
    );
  };

  const clickEdge = (event, node) => {
    setNodes((old) =>
      old.map((item) => {
        return {
          ...item,
          style: { 
            backgroundColor: "#ffffff", 
            padding: 0, 
            borderRadius: 8,
            pointerEvents: "auto" // Garante interatividade
          },
        };
      })
    );
  };

  const handleTriggerSave = (updatedTriggers) => {
    setFlowTriggers(updatedTriggers);
    // Sync triggers into the start node data so badges update immediately
    setNodes((old) =>
      old.map((n) =>
        n.type === "start"
          ? { ...n, data: { ...n.data, triggers: updatedTriggers, onOpenTriggerModal: () => setTriggerModalOpen(true) } }
          : n
      )
    );
  };

  const updateNode = (dataAlter) => {
    setNodes((old) =>
      old.map((itemNode) => {
        if (itemNode.id === dataAlter.id) {
          return ensureNodeTitle(dataAlter);
        }
        return itemNode;
      })
    );
    setModalAddText(null);
    setModalAddInterval(null);
    setModalAddMenu(null);
    setModalAddOpenAI(null);
    setModalAddTypebot(null);
    setModalAddFile(null);
    setModalAddSmtp(null);
    setModalAddGoogleSheets(null);
    setModalAddVariable(null);
    setModalCloseTicket(null);
    setModalProductList(null);
    setModalWaitQuestion(null);
    setModalCrmLead(null);
    setModalContactFields(null);
  };

  const closeRenameModal = () => {
    setRenameModalOpen(false);
    setNodeRenaming(null);
  };

  const handleRenameSave = (newTitle) => {
    if (!nodeRenaming) {
      closeRenameModal();
      return;
    }
    const sanitizedTitle =
      (newTitle && newTitle.length ? newTitle : getDefaultTitle(nodeRenaming.type));
    setNodes((old) =>
      old.map((item) => {
        if (item.id === nodeRenaming.id) {
          return {
            ...item,
            data: {
              ...item.data,
              title: sanitizedTitle,
            },
          };
        }
        return item;
      })
    );
    closeRenameModal();
  };

  // Grupos reorganizados no estilo Typebot
  const actionGroups = [
    {
      label: "Bubbles",
      actions: [
        { icon: <Message sx={{ color: "#3b82f6", fontSize: 14 }} />, name: "Texto", type: "content-text" },
        { icon: <Image sx={{ color: "#f59e0b", fontSize: 14 }} />, name: "Imagem", type: "content-image" },
        { icon: <Videocam sx={{ color: "#ef4444", fontSize: 14 }} />, name: "Vídeo", type: "content-video" },
        { icon: <MicNone sx={{ color: "#8b5cf6", fontSize: 14 }} />, name: "Áudio", type: "content-audio" },
        { icon: <DescriptionIcon sx={{ color: "#6366f1", fontSize: 14 }} />, name: "Arquivo", type: "content-file" },
      ],
    },
    {
      label: "Inputs",
      actions: [
        { icon: <BallotIcon sx={{ color: "#f59e0b", fontSize: 14 }} />, name: "Pergunta", type: "question" },
        { icon: <DynamicFeed sx={{ color: "#8b5cf6", fontSize: 14 }} />, name: "Menu", type: "menu" },
      ],
    },
    {
      label: "Lógica",
      actions: [
        { icon: <RocketLaunch sx={{ color: "#10b981", fontSize: 14 }} />, name: "Início", type: "start" },
        { icon: <AccessTime sx={{ color: "#22c55e", fontSize: 14 }} />, name: "Intervalo", type: "interval" },
        { icon: <CallSplit sx={{ color: "#06b6d4", fontSize: 14 }} />, name: "Randomizar", type: "random" },
        { icon: <Rule sx={{ color: "#ec4899", fontSize: 14 }} />, name: "Condição", type: "condition" },
        { icon: <AccountTree sx={{ color: "#8b5cf6", fontSize: 14 }} />, name: "Transf. Fluxo", type: "transferFlow" },
        { icon: <ConfirmationNumber sx={{ color: "#ef4444", fontSize: 14 }} />, name: "Ticket", type: "ticket" },
        { icon: <DataObject sx={{ color: "#6366f1", fontSize: 14 }} />, name: "Variável", type: "variable" },
      ],
    },
    {
      label: "Ações",
      actions: [
        { icon: <LocalOffer sx={{ color: "#f59e0b", fontSize: 14 }} />, name: "Add Tag", type: "addTag" },
        { icon: <ViewKanban sx={{ color: "#06b6d4", fontSize: 14 }} />, name: "Tag Kanban", type: "addTagKanban" },
        { icon: <ViewKanban sx={{ color: "#3b82f6", fontSize: 14 }} />, name: "Etapa Kanban", type: "kanbanStage" },
        { icon: <CheckCircle sx={{ color: "#22c55e", fontSize: 14 }} />, name: "Encerrar Ticket", type: "closeTicket" },
        { icon: <PersonAdd sx={{ color: "#10b981", fontSize: 14 }} />, name: "Lead CRM", type: "crmLead" },
        { icon: <DriveFileRenameOutline sx={{ color: "#3b82f6", fontSize: 14 }} />, name: "Campo CRM", type: "contactFields" },

        { icon: <ShoppingBag sx={{ color: "#3b82f6", fontSize: 14 }} />, name: "Lista de Produtos", type: "productList" },
        { icon: <Schedule sx={{ color: "#fb923c", fontSize: 14 }} />, name: "Espera Condicional", type: "waitQuestion" },
      ],
    },
    {
      label: "Integrações",
      actions: [
        { icon: <Http sx={{ color: "#22c55e", fontSize: 14 }} />, name: "API Request", type: "apiRequest" },
        {
          icon: <Box component="img" sx={{ width: 14, height: 14 }} src={typebotIcon} alt="typebot" />,
          name: "TypeBot",
          type: "typebot"
        },
        { icon: <Receipt sx={{ color: "#10b981", fontSize: 14 }} />, name: "2ª Via Boleto", type: "asaas" },
        { icon: <Email sx={{ color: "#2563eb", fontSize: 14 }} />, name: "Enviar SMTP", type: "smtp" },
        { icon: <Send sx={{ color: "#22c55e", fontSize: 14 }} />, name: "Enviar Mensagem", type: "sendMessage" },
        { icon: <span style={{ fontSize: "14px" }}>📊</span>, name: "Google Sheets", type: "googleSheets" },
        { icon: <span style={{ fontSize: "14px" }}></span>, name: "Agente IA Direto", type: "directOpenai" },
        { icon: <Code sx={{ color: "#f59e0b", fontSize: 14 }} />, name: "JavaScript", type: "javascript" },
      ],
    },
    {
      label: "Extras",
      actions: [
        { icon: <StickyNote2 sx={{ color: "#a16207", fontSize: 14 }} />, name: "Nota", type: "note" },
      ],
    },
  ];

  const clickActions = (type) => {
    switch (type) {
      case "smtp":
        setModalAddSmtp("create");
        break;
      case "googleSheets":
        setModalAddGoogleSheets("create");
        break;
      case "variable":
        setModalAddVariable("create");
        break;
      case "closeTicket":
        setModalCloseTicket("create");
        break;
      case "start": addNode("start"); break;
      case "menu": setModalAddMenu("create"); break;
      case "content":
        setContentModalType(null); // permite todos os tipos
        setModalAddSingleBlock("create");
        break;
      case "content-text":
        setContentModalType("message");
        setModalAddSingleBlock("create");
        break;
      case "content-interval":
        setContentModalType("interval");
        setModalAddSingleBlock("create");
        break;
      case "content-image":
        setContentModalType("img");
        setModalAddSingleBlock("create");
        break;
      case "content-file":
        setContentModalType("file");
        setModalAddSingleBlock("create");
        break;
      case "content-audio":
        setContentModalType("audio");
        setModalAddSingleBlock("create");
        break;
      case "content-video":
        setContentModalType("video");
        setModalAddSingleBlock("create");
        break;
      case "random": setModalAddRandomizer("create"); break;
      case "interval": setModalAddInterval("create"); break;
      case "ticket": setModalAddTicket("create"); break;
      case "typebot": setModalAddTypebot("create"); break;
      case "openai": setModalAddOpenAI("create"); break;
      case "directOpenai": setModalAddDirectOpenAI("create"); break;
      case "question": setModalAddQuestion("create"); break;
      case "file": setModalAddFile("create"); break;
      case "transferFlow": setModalTransferFlow("create"); break;
      case "apiRequest": setModalApiRequest("create"); break;
      case "addTag": setModalAddTag("create"); break;
      case "addTagKanban": setModalAddTagKanban("create"); break;
      case "condition": setModalCondition("create"); break;
      case "asaas": setModalAsaas("create"); break;
      case "sendMessage": setModalSendMessage("create"); break;
      case "productList": setModalProductList("create"); break;
      case "waitQuestion": setModalWaitQuestion("create"); break;
      case "kanbanStage": setModalAddKanbanStage("create"); break;
      case "javascript": setModalJavaScript("create"); break;
      case "crmLead": setModalCrmLead("create"); break;
      case "contactFields": setModalContactFields("create"); break;
      case "note": noteAdd(); break;
      default: break;

    }
  };

  return (
    <Stack sx={{ height: "100vh", backgroundColor: "#f9fafb" }}>
      {/* TODOS OS MODAIS MANTIDOS IGUAIS */}
      <FlowBuilderAddTextModal
        open={modalAddText}
        onSave={textAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddText(null)}
      />
      <FlowBuilderIntervalModal
        open={modalAddInterval}
        onSave={intervalAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddInterval(null)}
      />
      <FlowBuilderMenuModal
        open={modalAddMenu}
        onSave={menuAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddMenu(null)}
      />
      <FlowBuilderAddImgModal
        open={modalAddImg}
        onSave={imgAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddImg(null)}
      />
      <FlowBuilderAddAudioModal
        open={modalAddAudio}
        onSave={audioAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddAudio(null)}
      />
      <FlowBuilderRandomizerModal
        open={modalAddRandomizer}
        onSave={randomizerAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddRandomizer(null)}
      />
      <FlowBuilderAddVideoModal
        open={modalAddVideo}
        onSave={videoAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddVideo(null)}
      />
      <FlowBuilderSingleBlockModal
        open={modalAddSingleBlock}
        onSave={singleBlockAdd}
        data={dataNode}
        onUpdate={updateNode}
        contentType={contentModalType}
        close={() => setModalAddSingleBlock(null)}
      />
      <FlowBuilderTicketModal
        open={modalAddTicket}
        onSave={ticketAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddTicket(null)}
      />
      <FlowBuilderOpenAIModal
        open={modalAddOpenAI}
        onSave={openaiAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddOpenAI(null)}
      />
      <FlowBuilderTypebotModal
        open={modalAddTypebot}
        onSave={typebotAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddTypebot(null)}
      />
      <FlowBuilderAddQuestionModal
        open={modalAddQuestion}
        onSave={questionAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddQuestion(null)}
      />
      <FlowBuilderAddFileModal
        open={modalAddFile}
        onSave={fileAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddFile(null)}
      />
      <FlowBuilderTransferFlowModal
        open={modalTransferFlow}
        onSave={transferFlowAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalTransferFlow(null)}
      />
      <FlowBuilderApiRequestModal
        open={modalApiRequest}
        onSave={apiRequestAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalApiRequest(null)}
      />
      <FlowBuilderAddTagModal
        open={modalAddTag}
        onSave={addTagAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddTag(null)}
      />
      <FlowBuilderAddTagKanbanModal
        open={modalAddTagKanban}
        onSave={addTagKanbanAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddTagKanban(null)}
      />
      <FlowBuilderConditionModal
        open={modalCondition}
        onSave={conditionAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalCondition(null)}
      />
      <FlowBuilderAsaasModal
        open={modalAsaas}
        onSave={asaasAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAsaas(null)}
      />
      <FlowBuilderAddSmtpModal
        open={modalAddSmtp}
        onSave={smtpAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddSmtp(null)}
      />
      <FlowBuilderGoogleSheetsModal
        open={modalAddGoogleSheets}
        onSave={googleSheetsAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddGoogleSheets(null)}
      />
      <FlowBuilderAddVariableModal
        open={modalAddVariable}
        onSave={variableAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddVariable(null)}
      />
      <FlowBuilderCloseTicketModal
        open={modalCloseTicket}
        onSave={closeTicketAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalCloseTicket(null)}
      />
      <FlowBuilderSendMessageModal
        open={modalSendMessage}
        onSave={sendMessageAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalSendMessage(null)}
      />
      <FlowBuilderProductListModal
        open={modalProductList}
        onSave={productListAdd}
        data={dataNode}
        onUpdate={updateNode}
        onClose={() => setModalProductList(null)}
      />
      <FlowBuilderWaitQuestionModal
        open={modalWaitQuestion}
        onSave={waitQuestionAdd}
        initialValue={dataNode}
        onUpdate={updateNode}
        onClose={() => setModalWaitQuestion(null)}
      />
      <FlowBuilderAddKanbanStageModal
        open={modalAddKanbanStage}
        onSave={kanbanStageAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddKanbanStage(null)}
      />
      <FlowBuilderCrmLeadModal
        open={modalCrmLead}
        onSave={crmLeadAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalCrmLead(null)}
      />
      <FlowBuilderContactFieldsModal
        open={modalContactFields}
        onSave={contactFieldsAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalContactFields(null)}
      />

      <FlowBuilderNodeRenameModal
        open={renameModalOpen}
        node={nodeRenaming}
        defaultTitle={nodeRenaming ? getDefaultTitle(nodeRenaming.type) : "Bloco"}
        onClose={closeRenameModal}
        onSave={handleRenameSave}
      />

      <FlowBuilderTriggerModal
        open={triggerModalOpen}
        onClose={() => setTriggerModalOpen(false)}
        triggers={flowTriggers}
        onSave={handleTriggerSave}
      />

      <FlowBuilderJavaScriptModal
        open={modalJavaScript}
        data={dataNode}
        onSave={javascriptAdd}
        onUpdate={updateNode}
        close={() => setModalJavaScript(null)}
      />

      {!loading && (
        <Paper className={classes.mainPaper} variant="outlined" onScroll={handleScroll}>
          {/* Sidebar Estilo Typebot */}
          <Stack className={classes.sidebar}>
            {/* Back Button */}
            <div className={classes.sidebarHeader}>
              <Button
                className={classes.backButton}
                startIcon={<ArrowBackIcon />}
                onClick={() => history.push("/flowbuilders")}
              >
                Voltar
              </Button>
              <Button
                color="primary"
                variant="contained"
                className={classes.saveButton}
                startIcon={<SaveIcon />}
                onClick={() => saveFlow()}
              >
                Salvar
              </Button>
            </div>
            <Button
              variant="contained"
              className={classes.testButton}
              startIcon={<PlayArrowIcon />}
              onClick={testFlow}
              disabled={testingFlow}
            >
              {testingFlow ? "Testando..." : "Testar Fluxo"}
            </Button>
            
            {actionGroups.map((group) => (
              <div key={group.label} className={classes.buttonGroup}>
                <Typography className={classes.groupLabel}>
                  {group.label}
                </Typography>
                <div className={classes.buttonGrid}>
                  {group.actions.map((action) => (
                    <Button
                      key={action.name}
                      className={classes.button}
                      onClick={() => clickActions(action.type)}
                    >
                      <Box className={classes.buttonIcon}>{action.icon}</Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "13px" }}>
                        {action.name}
                      </Typography>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </Stack>

          {/* Top Toolbar */}
          <div style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(8px)",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "6px 10px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}>
            {/* Lock/Unlock */}
            <button
              onClick={() => setFlowLocked((v) => !v)}
              title={flowLocked ? "Desbloquear canvas" : "Bloquear canvas"}
              style={{
                width: 34, height: 34, borderRadius: 8, border: "none",
                background: flowLocked ? "#fef2f2" : "#f9fafb",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              {flowLocked
                ? <LockIcon style={{ fontSize: 16, color: "#ef4444" }} />
                : <LockOpenIcon style={{ fontSize: 16, color: "#6b7280" }} />}
            </button>

            <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />

            {/* Add Note */}
            <button
              onClick={() => clickActions("note")}
              title="Adicionar nota"
              style={{
                width: 34, height: 34, borderRadius: 8, border: "none",
                background: "#fefce8", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              <StickyNote2 style={{ fontSize: 16, color: "#a16207" }} />
            </button>

            {/* Add JavaScript */}
            <button
              onClick={() => clickActions("javascript")}
              title="Adicionar node JavaScript"
              style={{
                width: 34, height: 34, borderRadius: 8, border: "none",
                background: "#fffbeb", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              <Code style={{ fontSize: 16, color: "#f59e0b" }} />
            </button>
          </div>

          
          {/* Flow Container */}
          <Stack className={classes.flowContainer} sx={{ paddingLeft: "260px" }}>
            <ReactFlow
              nodes={nodesWithRuntimeData}
              edges={edges}
              deleteKeyCode={["Backspace", "Delete"]}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDoubleClick={doubleClick}
              onNodeClick={clickNode}
              onEdgeClick={clickEdge}
              onPaneMouseDown={handlePaneMouseDown}
              onNodeMouseDown={handleNodeMouseDown}
              onNodeMouseEnter={handleNodeMouseEnter}
              onPaneContextMenu={(event) => event.preventDefault()}
              onNodeContextMenu={(event) => event.preventDefault()}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              connectionLineStyle={connectionLineStyle}
              style={{
                backgroundColor: "#272A2C",
              }}
              defaultEdgeOptions={{
                style: { 
                  stroke: "#6366f1", 
                  strokeWidth: "3px"
                },
                animated: true,
                className: classes.animatedEdge,
              }}
              nodesDraggable={!flowLocked}
              nodesConnectable={!flowLocked}
              elementsSelectable={!flowLocked}
              selectNodesOnDrag={false}
              panOnDrag={true}
              zoomOnScroll={true}
              zoomOnDoubleClick={false}
              onlyRenderVisibleElements={false}
            >
              <Controls 
                showZoom={true}
                showFitView={true}
                showInteractive={true}
                position="bottom-left"
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}
              >
                              </Controls>
              <Background 
                variant="dots" 
                gap={16} 
                size={1.5} 
                color="#3a3f43"
                style={{ backgroundColor: "#272A2C" }}
              />
            </ReactFlow>
          </Stack>

          {logsPanel.open && (
            <aside className={classes.logsPanel}>
              <div className={classes.logsHeader}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div className={classes.logsTitle}>Logs do bloco</div>
                    <div className={classes.logsSubtitle}>
                      Selecione um registro para destacar o caminho executado.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLogsPanel({ open: false, nodeId: null, status: "success" });
                      setSelectedExecutionId(null);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: "1px solid rgba(148,163,184,0.28)",
                      background: "rgba(15,23,42,0.7)",
                      color: "#cbd5e1",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className={classes.logsTabs}>
                {Object.entries(LOG_STATUS_LABELS).map(([status, label]) => (
                  <button
                    key={status}
                    type="button"
                    className={`${classes.logsTab} ${logsPanel.status === status ? classes.logsTabActive : ""}`}
                    onClick={() => {
                      setLogsPanel((prev) => ({ ...prev, status }));
                      setSelectedExecutionId(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className={classes.logsList}>
                {currentNodeLogs.length === 0 && (
                  <div className={classes.logsEmpty}>
                    Nenhum log encontrado para este bloco nesta categoria.
                  </div>
                )}

                {currentNodeLogs.map(({ execution, log, path }) => {
                  const pathLabels = path
                    .map((item, index) => `${index + 1}. ${item.nodeTitle || item.nodeType || item.nodeId}`)
                    .join("  →  ");

                  return (
                    <button
                      key={`${execution.id}-${log.nodeId}-${log.executedAt}`}
                      type="button"
                      className={`${classes.logCard} ${selectedExecutionId === execution.id ? classes.logCardActive : ""}`}
                      onClick={() => setSelectedExecutionId(execution.id)}
                    >
                      <div className={classes.logMeta}>
                        <span>{new Date(log.executedAt || execution.createdAt).toLocaleString("pt-BR")}</span>
                        <span>{execution.durationMs ? `${execution.durationMs}ms` : execution.status}</span>
                      </div>
                      <div className={classes.logMessage}>{log.message || "Bloco executado"}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 5 }}>
                        Contato: {execution.contactNumber || "sem contato"} · Gatilho: {execution.trigger || "manual"}
                      </div>
                      <div className={classes.logPath}>
                        {pathLabels || "Caminho não disponível para execução antiga"}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedExecution && (
                <div className={classes.executionDetails}>
                  <div className={classes.executionDetailsTitle}>
                    Detalhes da execução #{selectedExecution.id}
                  </div>
                  {Array.isArray(selectedExecution.nodePath) && selectedExecution.nodePath.length > 0 ? (
                    selectedExecution.nodePath.map((item, index) => (
                      <div key={`${selectedExecution.id}-${item.nodeId}-${index}`} className={classes.executionStep}>
                        <div className={classes.executionStepIndex}>{index + 1}</div>
                        <div>
                          <div className={classes.executionStepTitle}>
                            {item.nodeTitle || item.nodeType || item.nodeId}
                          </div>
                          <div className={classes.executionStepMessage}>
                            Status: {LOG_STATUS_LABELS[item.status] || LOG_STATUS_LABELS.success}
                            {item.executedAt ? ` · ${new Date(item.executedAt).toLocaleString("pt-BR")}` : ""}
                          </div>
                          <div className={classes.executionStepMessage}>
                            {item.message || "Bloco executado"}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={classes.logsEmpty}>
                      Caminho detalhado indisponível para esta execução.
                    </div>
                  )}
                </div>
              )}
            </aside>
          )}
        </Paper>
      )}

      {loading && (
        <Stack className={classes.loadingContainer}>
          <CircularProgress size={48} style={{ color: "#3b82f6" }} />
          <Typography className={classes.loadingText}>
            Carregando construtor de fluxo...
          </Typography>
        </Stack>
      )}
      
      <FlowBuilderAddDirectOpenAIModal
        open={modalAddDirectOpenAI}
        data={dataNode}
        close={() => setModalAddDirectOpenAI(null)}
        onSave={(config) => {
          if (modalAddDirectOpenAI === "edit") {
            // Update existing node
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === dataNode.id) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      ...config
                    }
                  };
                }
                return node;
              })
            );
          } else {
            // Add new node
            const newNode = {
              id: `directOpenai-${Date.now()}`,
              type: "directOpenai",
              position: { x: 100, y: 100 },
              data: config
            };
            setNodes((nds) => [...nds, newNode]);
          }
          setModalAddDirectOpenAI(null);
        }}
      />
    </Stack>
  );
};
