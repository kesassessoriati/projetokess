import React, { useContext, useEffect, useReducer, useState, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  MenuItem,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import SearchIcon from "@material-ui/icons/Search";
import PsychologyIcon from "@material-ui/icons/EmojiObjects";
import SaveIcon from "@material-ui/icons/Save";
import RestoreIcon from "@material-ui/icons/Restore";
import HistoryIcon from "@material-ui/icons/History";
import DashboardIcon from "@material-ui/icons/Dashboard";
import EventNoteIcon from "@material-ui/icons/EventNote";
import NotificationsActiveIcon from "@material-ui/icons/NotificationsActive";
import StorageIcon from "@material-ui/icons/Storage";
import SettingsIcon from "@material-ui/icons/Settings";
import ListAltIcon from "@material-ui/icons/ListAlt";
import SendIcon from "@material-ui/icons/Send";
import GroupIcon from "@material-ui/icons/Group";
import PromptModal from "../../components/PromptModal";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import { AuthContext } from "../../context/Auth/AuthContext";
import usePlans from "../../hooks/usePlans";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import ForbiddenPage from "../../components/ForbiddenPage";
import { TOOL_CATALOG, DEFAULT_SENSITIVE_TOOLS } from "../../constants/aiTools";
import { useSocket } from "../../context/SocketContext";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f5f5f5",
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    backgroundColor: "#f5f5f5",
    borderBottom: "1px solid #e0e0e0",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#fff3e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#ff9800",
    },
  },
  headerTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  headerSubtitle: {
    fontSize: "0.875rem",
    color: "#666",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  searchField: {
    backgroundColor: "#fff",
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      "& fieldset": {
        borderColor: "#e0e0e0",
      },
      "&:hover fieldset": {
        borderColor: "#1976d2",
      },
    },
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#333",
      transform: "scale(1.05)",
    },
  },
  content: {
    flex: 1,
    padding: "16px 24px",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    transition: "all 0.2s ease",
    "&:hover": {
      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    },
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#fff3e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#ff9800",
    },
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  itemName: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  itemDetails: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: "0.8rem",
    color: "#666",
    flexWrap: "wrap",
  },
  toolsWrapper: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 8,
    maxWidth: 400,
  },
  toolChip: {
    fontWeight: 600,
    fontSize: "0.65rem",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  toolChipSensitive: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  },
  toolChipSafe: {
    backgroundColor: "#e0f2fe",
    color: "#075985",
  },
  toolsEmpty: {
    fontSize: "0.75rem",
    color: "#9ca3af",
    fontStyle: "italic",
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    "&:hover": {
      backgroundColor: "#bbdefb",
    },
  },
  deleteButton: {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    "&:hover": {
      backgroundColor: "#ffcdd2",
    },
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    color: "#999",
    "& svg": {
      fontSize: 64,
      marginBottom: 16,
      opacity: 0.5,
    },
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "24px",
  },
  agentTabs: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 24px 0",
    backgroundColor: "#f5f5f5",
    flexWrap: "wrap",
  },
  agentTab: {
    border: "1px solid #e0e0e0",
    backgroundColor: "#fff",
    color: "#5f6b7a",
    borderRadius: 8,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: "#1976d2",
      color: "#1976d2",
    },
  },
  agentTabActive: {
    backgroundColor: "#1f5eea",
    borderColor: "#1f5eea",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#174fc7",
      color: "#fff",
    },
  },
  externalGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.8fr)",
    gap: 16,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  externalMenu: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    overflowX: "auto",
    paddingBottom: 2,
    ...theme.scrollbarStyles,
  },
  externalMenuButton: {
    minHeight: 40,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    backgroundColor: "#fff",
    color: "#526173",
    fontWeight: 700,
    padding: "8px 12px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "& svg": {
      fontSize: 18,
    },
    "&:hover": {
      borderColor: "#1f5eea",
      color: "#1f5eea",
    },
  },
  externalMenuButtonActive: {
    backgroundColor: "#1f5eea",
    borderColor: "#1f5eea",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#174fc7",
      color: "#fff",
    },
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 16,
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "repeat(2, minmax(160px, 1fr))",
    },
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  metricBox: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 14,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: "0.72rem",
    fontWeight: 800,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  metricValue: {
    color: "#111827",
    fontSize: "1.7rem",
    fontWeight: 800,
  },
  externalPanel: {
    backgroundColor: "#fff",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  panelTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4,
  },
  panelSubtitle: {
    fontSize: "0.82rem",
    color: "#6b7280",
    marginBottom: 16,
  },
  fieldStack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  promptEditor: {
    "& .MuiOutlinedInput-root": {
      alignItems: "flex-start",
      fontFamily: "monospace",
      fontSize: "0.88rem",
      lineHeight: 1.55,
    },
  },
  actionRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  versionList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 420,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  versionItem: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  activeVersionItem: {
    borderColor: "#1f5eea",
    backgroundColor: "#eff6ff",
  },
  versionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  versionTitle: {
    fontWeight: 700,
    color: "#111827",
  },
  versionMeta: {
    color: "#6b7280",
    fontSize: "0.75rem",
  },
  versionPreview: {
    color: "#4b5563",
    fontSize: "0.8rem",
    lineHeight: 1.4,
    marginBottom: 8,
    whiteSpace: "pre-wrap",
  },
  eventsPanel: {
    marginTop: 16,
  },
  placeholderGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.45fr)",
    gap: 16,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  placeholderList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  placeholderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    border: "1px solid #eef2f7",
    borderRadius: 8,
    padding: "12px 14px",
    backgroundColor: "#fbfdff",
  },
  mutedPill: {
    borderRadius: 999,
    padding: "5px 9px",
    backgroundColor: "#eef2ff",
    color: "#3730a3",
    fontWeight: 800,
    fontSize: "0.68rem",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  eventItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #f0f0f0",
  },
  eventStatus: {
    borderRadius: 999,
    padding: "4px 8px",
    fontWeight: 700,
    fontSize: "0.68rem",
    textTransform: "uppercase",
  },
  inlineActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  statusSent: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusFailed: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  statusSkipped: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  statusPending: {
    backgroundColor: "#e0f2fe",
    color: "#075985",
  },
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_PROMPTS") {
    const prompts = action.payload;
    const newPrompts = [];

    prompts.forEach((prompt) => {
      const promptIndex = state.findIndex((p) => p.id === prompt.id);
      if (promptIndex !== -1) {
        state[promptIndex] = prompt;
      } else {
        newPrompts.push(prompt);
      }
    });

    return [...state, ...newPrompts];
  }

  if (action.type === "UPDATE_PROMPTS") {
    const prompt = action.payload;
    const promptIndex = state.findIndex((p) => p.id === prompt.id);

    if (promptIndex !== -1) {
      state[promptIndex] = prompt;
      return [...state];
    } else {
      return [prompt, ...state];
    }
  }

  if (action.type === "DELETE_PROMPT") {
    const promptId = action.payload;
    const promptIndex = state.findIndex((p) => p.id === promptId);
    if (promptIndex !== -1) {
      state.splice(promptIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const Prompts = () => {
  const classes = useStyles();

  const [activeAgentTab, setActiveAgentTab] = useState("internal");
  const [externalSection, setExternalSection] = useState("dashboard");
  const [prompts, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalSaving, setExternalSaving] = useState(false);
  const [externalConfig, setExternalConfig] = useState(null);
  const [externalPrompt, setExternalPrompt] = useState("");
  const [externalChangeNote, setExternalChangeNote] = useState("");
  const [externalVersions, setExternalVersions] = useState([]);
  const [externalEvents, setExternalEvents] = useState([]);
  const [aiAppointments, setAiAppointments] = useState([]);
  const [aiReminders, setAiReminders] = useState([]);
  const [aiFollowUps, setAiFollowUps] = useState([]);
  const [whatsappOptions, setWhatsappOptions] = useState([]);
  const [ragDocuments, setRagDocuments] = useState([]);
  const [ragBase, setRagBase] = useState("empresa");
  const [ragContent, setRagContent] = useState("");
  const [ragFile, setRagFile] = useState(null);
  const [ragQuery, setRagQuery] = useState("");
  const [ragResults, setRagResults] = useState([]);
  const [appointmentForm, setAppointmentForm] = useState({
    title: "",
    leadName: "",
    leadPhone: "",
    leadEmail: "",
    scheduleId: "",
    startDatetime: "",
    durationMinutes: 60,
    reminderEnabled: true,
  });
  const [reminderForm, setReminderForm] = useState({
    leadName: "",
    leadPhone: "",
    scheduledAt: "",
    message: "",
  });

  const defaultReminderSettings = {
    enabled: true,
    whatsappId: "",
    hoursBefore: 4,
    text: "CONFIRMACAO DE CONSULTA\n\nOla, *{{leadName}}*! Tudo bem?\n\nEstamos passando para confirmar seu compromisso conosco:\n\nData: {{appointmentDate}}\n\nVoce podera comparecer neste horario?\n\nResponda com uma das opcoes:",
    footer: "",
    buttons: [
      { buttonId: "1", buttonText: { displayText: "Confirmar" } },
      { buttonId: "2", buttonText: { displayText: "Remarcar" } },
      { buttonId: "3", buttonText: { displayText: "Cancelar" } },
    ],
  };

  const defaultGroupNotifications = {
    appointmentCreated: {
      enabled: false,
      name: "Agendamento criado",
      whatsappId: "",
      groupNumber: "",
      message: "Novo agendamento criado.\n\nLead: {{leadName}}\nTelefone: {{leadPhone}}\nData: {{appointmentDate}}\nHorario: {{appointmentTime}}\nEmpresa: {{companyName}}",
    },
    reminderSent: {
      enabled: false,
      name: "Lembrete enviado",
      whatsappId: "",
      groupNumber: "",
      message: "Lembrete enviado ao cliente.\n\nLead: {{leadName}}\nTelefone: {{leadPhone}}\nCompromisso: {{appointmentDate}} as {{appointmentTime}}\nEmpresa: {{companyName}}",
    },
    appointmentCancelled: {
      enabled: false,
      name: "Agendamento cancelado",
      whatsappId: "",
      groupNumber: "",
      message: "Agendamento cancelado.\n\nLead: {{leadName}}\nTelefone: {{leadPhone}}\nData: {{appointmentDate}}\nHorario: {{appointmentTime}}\nMotivo: {{cancellationReason}}\nEmpresa: {{companyName}}",
    },
  };

  const dynamicVariables = [
    { token: "{{leadName}}", label: "Nome do lead" },
    { token: "{{leadPhone}}", label: "Telefone" },
    { token: "{{appointmentDate}}", label: "Data" },
    { token: "{{appointmentTime}}", label: "Hora" },
    { token: "{{appointmentDateTime}}", label: "Data e hora" },
    { token: "{{companyName}}", label: "Empresa" },
  ];

  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingAiAppointment, setDeletingAiAppointment] = useState(null);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [deletingReminder, setDeletingReminder] = useState(null);
  const { user } = useContext(AuthContext);
  const { isConnected, on } = useSocket();

  const { getPlanCompany } = usePlans();
  const history = useHistory();
  const companyId = user.companyId;
  const toolMap = useMemo(() => {
    const map = {};
    TOOL_CATALOG.forEach(tool => {
      map[tool.value] = tool;
    });
    return map;
  }, []);

  const reloadPage = () => {
    window.location.reload();
  };

  const loadExternalAgent = async () => {
    setExternalLoading(true);
    try {
      const [
        configResponse,
        versionsResponse,
        eventsResponse,
        appointmentsResponse,
        remindersResponse,
        followUpsResponse,
        ragResponse,
        whatsappsResponse,
      ] = await Promise.all([
        api.get("/ai-agents/external/config"),
        api.get("/ai-agents/external/prompt/versions"),
        api.get("/ai-agents/external/events", { params: { pageNumber: 1 } }),
        api.get("/ai-agents/external/appointments", { params: { pageNumber: 1 } }),
        api.get("/ai-agents/external/reminders", { params: { pageNumber: 1 } }),
        api.get("/ai-agents/external/follow-ups", { params: { pageNumber: 1 } }),
        api.get(`/ai-agents/external/rag/${ragBase}`, { params: { pageNumber: 1 } }),
        api.get("/whatsapp/filter", { params: { session: 0, channel: "whatsapp" } }),
      ]);

      setExternalConfig(configResponse.data);
      setExternalPrompt(configResponse.data?.systemPrompt || "");
      setExternalVersions(versionsResponse.data?.versions || []);
      setExternalEvents(eventsResponse.data?.events || []);
      setAiAppointments(appointmentsResponse.data?.appointments || []);
      setAiReminders(remindersResponse.data?.reminders || []);
      setAiFollowUps(followUpsResponse.data?.leads || []);
      setRagDocuments(ragResponse.data?.documents || []);
      setWhatsappOptions(whatsappsResponse.data || []);
    } catch (err) {
      toastError(err);
    } finally {
      setExternalLoading(false);
    }
  };

  const loadRagDocuments = async (base = ragBase) => {
    try {
      const { data } = await api.get(`/ai-agents/external/rag/${base}`, {
        params: { pageNumber: 1 },
      });
      setRagDocuments(data?.documents || []);
    } catch (err) {
      toastError(err);
    }
  };

  const handleExternalConfigChange = (field, value) => {
    setExternalConfig(prev => ({
      ...(prev || {}),
      [field]: value,
    }));
  };

  const getExternalReminderSettings = () => ({
    ...defaultReminderSettings,
    ...(externalConfig?.metadata?.autoReminder || {}),
    buttons: externalConfig?.metadata?.autoReminder?.buttons || defaultReminderSettings.buttons,
  });

  const getExternalGroupNotifications = () => {
    const saved = externalConfig?.metadata?.groupNotifications || {};
    return Object.keys(defaultGroupNotifications).reduce((acc, key) => {
      acc[key] = {
        ...defaultGroupNotifications[key],
        ...(saved[key] || {}),
      };
      return acc;
    }, {});
  };

  const handleReminderSettingChange = (field, value) => {
    setExternalConfig(prev => {
      const current = prev || {};
      const previousSettings = current.metadata?.autoReminder || {};
      return {
        ...current,
        metadata: {
          ...(current.metadata || {}),
          autoReminder: {
            ...defaultReminderSettings,
            ...previousSettings,
            buttons: previousSettings.buttons || defaultReminderSettings.buttons,
            [field]: value,
          },
        },
      };
    });
  };

  const handleReminderButtonChange = (index, value) => {
    const settings = getExternalReminderSettings();
    const buttons = settings.buttons.map((button, buttonIndex) => (
      buttonIndex === index
        ? { ...button, buttonText: { displayText: value }, buttonId: String(index + 1) }
        : button
    ));
    handleReminderSettingChange("buttons", buttons);
  };

  const handleGroupNotificationChange = (key, field, value) => {
    setExternalConfig(prev => {
      const current = prev || {};
      const previousGroups = current.metadata?.groupNotifications || {};
      return {
        ...current,
        metadata: {
          ...(current.metadata || {}),
          groupNotifications: {
            ...previousGroups,
            [key]: {
              ...defaultGroupNotifications[key],
              ...(previousGroups[key] || {}),
              [field]: value,
            },
          },
        },
      };
    });
  };

  const insertReminderVariable = (token) => {
    const currentText = getExternalReminderSettings().text || "";
    handleReminderSettingChange("text", `${currentText}${currentText ? " " : ""}${token}`);
  };

  const insertGroupVariable = (key, token) => {
    const settings = getExternalGroupNotifications()[key];
    const currentText = settings.message || "";
    handleGroupNotificationChange(key, "message", `${currentText}${currentText ? " " : ""}${token}`);
  };

  const handleSaveExternalConfig = async () => {
    setExternalSaving(true);
    try {
      const { data } = await api.put("/ai-agents/external/config", {
        name: externalConfig?.name || "Agente Externo N8N",
        n8nWebhookUrl: externalConfig?.n8nWebhookUrl || null,
        webhookEnabled: Boolean(externalConfig?.webhookEnabled),
        metadata: externalConfig?.metadata || {},
      });
      setExternalConfig(data);
      toast.success("Configuracao do agente externo salva.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleSaveExternalPrompt = async () => {
    setExternalSaving(true);
    try {
      await api.post("/ai-agents/external/prompt/versions", {
        content: externalPrompt,
        changeNote: externalChangeNote || null,
      });
      setExternalChangeNote("");
      await loadExternalAgent();
      toast.success("System Prompt salvo e evento enviado para o N8N.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleRestoreExternalVersion = async (versionId) => {
    setExternalSaving(true);
    try {
      await api.post(`/ai-agents/external/prompt/versions/${versionId}/restore`);
      await loadExternalAgent();
      toast.success("Versao restaurada e enviada para o N8N.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleDeleteExternalVersion = async (versionId) => {
    setExternalSaving(true);
    try {
      await api.delete(`/ai-agents/external/prompt/versions/${versionId}`);
      await loadExternalAgent();
      toast.success("Versao do prompt excluida.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleCreateAiAppointment = async () => {
    setExternalSaving(true);
    try {
      await api.post("/ai-agents/external/appointments", {
        ...appointmentForm,
        scheduleId: Number(appointmentForm.scheduleId),
        durationMinutes: Number(appointmentForm.durationMinutes || 60),
      });
      setAppointmentForm({
        title: "",
        leadName: "",
        leadPhone: "",
        leadEmail: "",
        scheduleId: "",
        startDatetime: "",
        durationMinutes: 60,
        reminderEnabled: true,
      });
      await loadExternalAgent();
      toast.success("Agendamento IA criado e sincronizado com compromissos.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleDeleteAiAppointment = async () => {
    if (!deletingAiAppointment) return;

    setExternalSaving(true);
    try {
      await api.delete(`/ai-agents/external/appointments/${deletingAiAppointment.id}`);
      setDeletingAiAppointment(null);
      await loadExternalAgent();
      toast.success("Agendamento IA excluido.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleSendAppointmentGroup = async (appointmentId) => {
    setExternalSaving(true);
    try {
      await api.post(`/ai-agents/external/appointments/${appointmentId}/send-group`);
      toast.success("Notificacao enviada ao grupo.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleCreateReminder = async () => {
    setExternalSaving(true);
    try {
      const settings = getExternalReminderSettings();
      const payload = {
        ...reminderForm,
        metadata: {
          manual: !editingReminderId,
          editedFromPanel: Boolean(editingReminderId),
          interactivePayload: {
            number: reminderForm.leadPhone,
            text: reminderForm.message || settings.text,
            footer: settings.footer,
            buttons: settings.buttons,
          },
        },
      };

      if (editingReminderId) {
        await api.put(`/ai-agents/external/reminders/${editingReminderId}`, payload);
      } else {
        await api.post("/ai-agents/external/reminders", payload);
      }

      setReminderForm({ leadName: "", leadPhone: "", scheduledAt: "", message: "" });
      setEditingReminderId(null);
      await loadExternalAgent();
      toast.success(editingReminderId ? "Lembrete atualizado." : "Lembrete criado.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleSendReminderNow = async (reminderId) => {
    setExternalSaving(true);
    try {
      await api.post(`/ai-agents/external/reminders/${reminderId}/send-now`);
      await loadExternalAgent();
      toast.success("Lembrete enviado ao lead.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleSendReminderGroup = async (reminderId) => {
    setExternalSaving(true);
    try {
      await api.post(`/ai-agents/external/reminders/${reminderId}/send-group`);
      toast.success("Notificacao de lembrete enviada ao grupo.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const toDateTimeLocal = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
  };

  const handleEditReminder = (reminder) => {
    setEditingReminderId(reminder.id);
    setReminderForm({
      leadName: reminder.leadName || "",
      leadPhone: reminder.leadPhone || "",
      scheduledAt: toDateTimeLocal(reminder.scheduledAt),
      message: reminder.message || reminder.metadata?.interactivePayload?.text || "",
    });
  };

  const handleCancelEditReminder = () => {
    setEditingReminderId(null);
    setReminderForm({ leadName: "", leadPhone: "", scheduledAt: "", message: "" });
  };

  const handleDeleteReminder = async () => {
    if (!deletingReminder) return;

    setExternalSaving(true);
    try {
      await api.delete(`/ai-agents/external/reminders/${deletingReminder.id}`);
      setDeletingReminder(null);
      if (editingReminderId === deletingReminder.id) {
        handleCancelEditReminder();
      }
      await loadExternalAgent();
      toast.success("Lembrete excluido.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleCreateRagDocument = async () => {
    setExternalSaving(true);
    try {
      if (ragFile) {
        const formData = new FormData();
        formData.append("file", ragFile);
        formData.append("metadata", JSON.stringify({ origem: "crm", base: ragBase }));
        await api.post(`/ai-agents/external/rag/${ragBase}/upload`, formData);
      } else {
        await api.post(`/ai-agents/external/rag/${ragBase}`, {
          content: ragContent,
          metadata: {
            origem: "crm",
            base: ragBase,
          },
        });
      }
      setRagContent("");
      setRagFile(null);
      await loadRagDocuments();
      toast.success("Documento enviado para a base RAG.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleSearchRag = async () => {
    setExternalSaving(true);
    try {
      const { data } = await api.post(`/ai-agents/external/rag/${ragBase}/search`, {
        query: ragQuery,
        matchCount: 5,
      });
      setRagResults(data?.results || []);
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleDeleteRagDocument = async (documentId) => {
    setExternalSaving(true);
    try {
      await api.delete(`/ai-agents/external/rag/${ragBase}/${documentId}`);
      await loadRagDocuments();
      toast.success("Documento removido da base RAG.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleDeleteExternalEvent = async (eventId) => {
    setExternalSaving(true);
    try {
      await api.delete(`/ai-agents/external/events/${eventId}`);
      await loadExternalAgent();
      toast.success("Log removido.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleProcessAiFollowUps = async () => {
    setExternalSaving(true);
    try {
      const { data } = await api.post("/ai-agents/external/follow-ups/process");
      await loadExternalAgent();
      toast.success(`${data?.processed || 0} follow-up(s) processado(s).`);
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString("pt-BR");
    } catch {
      return value;
    }
  };

  const getEventStatusClass = (status) => {
    if (status === "sent") return classes.statusSent;
    if (status === "failed") return classes.statusFailed;
    if (status === "skipped") return classes.statusSkipped;
    return classes.statusPending;
  };

  const externalMenuItems = [
    { key: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { key: "prompt", label: "System Prompt", icon: <PsychologyIcon /> },
    { key: "appointments", label: "Agendamentos IA", icon: <EventNoteIcon /> },
    { key: "reminders", label: "Lembretes", icon: <NotificationsActiveIcon /> },
    { key: "followups", label: "Follow-up", icon: <NotificationsActiveIcon /> },
    { key: "rag", label: "Base RAG", icon: <StorageIcon /> },
    { key: "events", label: "Eventos / Logs", icon: <ListAltIcon /> },
    { key: "settings", label: "Configuracoes", icon: <SettingsIcon /> },
  ];

  const externalStats = {
    promptVersions: externalVersions.length,
    sentEvents: externalEvents.filter(event => event.status === "sent").length,
    failedEvents: externalEvents.filter(event => event.status === "failed").length,
    skippedEvents: externalEvents.filter(event => event.status === "skipped").length,
    appointments: aiAppointments.length,
    reminders: aiReminders.length,
    followUps: aiFollowUps.filter(lead => lead.status === "follow_up" || lead.leadStatus === "follow_up").length,
    followUpsSent: aiFollowUps.filter(lead => lead.status === "follow_up_enviado" || lead.leadStatus === "follow_up_enviado").length,
    ragDocuments: ragDocuments.length,
  };

  const renderExternalEvents = () => (
    <Box className={classes.externalPanel}>
      <Typography className={classes.panelTitle}>Eventos enviados ao N8N</Typography>
      <Typography className={classes.panelSubtitle}>
        Historico recente dos disparos feitos pelo agente externo.
      </Typography>
      {externalEvents.length === 0 ? (
        <Typography className={classes.toolsEmpty}>Nenhum evento registrado ainda.</Typography>
      ) : (
        externalEvents.map((event) => (
          <Box key={event.id} className={classes.eventItem}>
            <Box>
              <Typography className={classes.versionTitle}>{event.eventType}</Typography>
              <Typography className={classes.versionMeta}>
                {formatDateTime(event.createdAt)}
                {event.errorMessage ? ` - ${event.errorMessage}` : ""}
              </Typography>
            </Box>
            <Box className={classes.inlineActions}>
              <span className={`${classes.eventStatus} ${getEventStatusClass(event.status)}`}>
                {event.status}
              </span>
              <Tooltip title="Excluir log">
                <IconButton size="small" onClick={() => handleDeleteExternalEvent(event.id)} disabled={externalSaving}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );

  const renderExternalPrompt = () => (
    <Box className={classes.externalGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>System Prompt</Typography>
        <Typography className={classes.panelSubtitle}>
          Cada salvamento cria uma nova versao e dispara o evento para o N8N.
        </Typography>
        <TextField
          className={classes.promptEditor}
          label="Prompt do agente externo"
          variant="outlined"
          fullWidth
          multiline
          minRows={16}
          value={externalPrompt}
          onChange={(event) => setExternalPrompt(event.target.value)}
        />
        <TextField
          label="Nota da alteracao"
          variant="outlined"
          fullWidth
          size="small"
          value={externalChangeNote}
          onChange={(event) => setExternalChangeNote(event.target.value)}
          style={{ marginTop: 12 }}
        />
        <Box className={classes.actionRow}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={externalSaving || !externalPrompt.trim()}
            onClick={handleSaveExternalPrompt}
          >
            Salvar prompt
          </Button>
        </Box>
      </Box>

      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Versoes do Prompt</Typography>
        <Typography className={classes.panelSubtitle}>
          Restaure uma versao anterior quando precisar voltar o comportamento do agente.
        </Typography>

        <Box className={classes.versionList}>
          {externalVersions.length === 0 ? (
            <Typography className={classes.toolsEmpty}>Nenhuma versao salva ainda.</Typography>
          ) : (
            externalVersions.map((version) => (
              <Box
                key={version.id}
                className={`${classes.versionItem} ${version.isActive ? classes.activeVersionItem : ""}`}
              >
                <Box className={classes.versionHeader}>
                  <Box>
                    <Typography className={classes.versionTitle}>
                      Versao {version.version} {version.isActive ? "(ativa)" : ""}
                    </Typography>
                    <Typography className={classes.versionMeta}>
                      {formatDateTime(version.createdAt)}
                    </Typography>
                  </Box>
                  <HistoryIcon style={{ color: version.isActive ? "#1f5eea" : "#9ca3af" }} />
                </Box>
                {version.changeNote && (
                  <Typography className={classes.versionMeta}>
                    {version.changeNote}
                  </Typography>
                )}
                <Typography className={classes.versionPreview}>
                  {(version.content || "").slice(0, 180)}
                  {(version.content || "").length > 180 ? "..." : ""}
                </Typography>
                <Box className={classes.inlineActions}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RestoreIcon />}
                    disabled={externalSaving || version.isActive}
                    onClick={() => handleRestoreExternalVersion(version.id)}
                  >
                    Restaurar
                  </Button>
                  <Tooltip title={version.isActive ? "A versao ativa nao pode ser excluida" : "Excluir versao"}>
                    <span>
                      <IconButton
                        size="small"
                        color="secondary"
                        disabled={externalSaving || version.isActive}
                        onClick={() => handleDeleteExternalVersion(version.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );

  const renderVariableChips = (onInsert, extraVariables = []) => (
    <Box display="flex" flexWrap="wrap" style={{ gap: 6 }}>
      {[...dynamicVariables, ...extraVariables].map(variable => (
        <Chip
          key={variable.token}
          size="small"
          label={variable.label}
          onClick={() => onInsert(variable.token)}
          style={{ fontWeight: 700 }}
        />
      ))}
    </Box>
  );

  const renderWhatsappSelect = (label, value, onChange) => (
    <TextField
      select
      label={label}
      variant="outlined"
      size="small"
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
    >
      <MenuItem value="">Selecionar conexao</MenuItem>
      {whatsappOptions.map((whatsapp) => (
        <MenuItem key={whatsapp.id} value={whatsapp.id}>
          {whatsapp.name || `Conexao #${whatsapp.id}`}
        </MenuItem>
      ))}
    </TextField>
  );

  const renderGroupNotificationSettings = () => {
    const groups = getExternalGroupNotifications();
    const items = [
      {
        key: "appointmentCreated",
        title: "Envio para grupo - agendamento criado",
        description: "Notifica o grupo quando um compromisso for criado.",
      },
      {
        key: "reminderSent",
        title: "Envio para grupo - lembrete enviado",
        description: "Notifica o grupo quando o lembrete automatico for enviado ao cliente.",
      },
      {
        key: "appointmentCancelled",
        title: "Envio para grupo - cancelamento",
        description: "Notifica o grupo quando um compromisso for cancelado.",
      },
    ];

    return (
      <Box className={classes.fieldStack} style={{ marginTop: 18 }}>
        <Divider />
        <Typography className={classes.panelTitle}>Notificacoes para grupo da empresa</Typography>
        <Typography className={classes.panelSubtitle}>
          Configure mensagens automaticas para o grupo operacional da empresa.
        </Typography>

        {items.map(item => {
          const settings = groups[item.key];
          return (
            <Box key={item.key} className={classes.externalPanel} style={{ boxShadow: "none" }}>
              <Typography className={classes.panelTitle}>{item.title}</Typography>
              <Typography className={classes.panelSubtitle}>{item.description}</Typography>
              <Box className={classes.fieldStack}>
                <FormControlLabel
                  control={
                    <Switch
                      color="primary"
                      checked={Boolean(settings.enabled)}
                      onChange={(event) => handleGroupNotificationChange(item.key, "enabled", event.target.checked)}
                    />
                  }
                  label="Ativar envio para grupo"
                />
                {renderWhatsappSelect(
                  "Instancia/conexao de envio",
                  settings.whatsappId,
                  (value) => handleGroupNotificationChange(item.key, "whatsappId", value)
                )}
                <TextField
                  label="Nome da configuracao"
                  variant="outlined"
                  size="small"
                  value={settings.name || ""}
                  onChange={(event) => handleGroupNotificationChange(item.key, "name", event.target.value)}
                />
                <TextField
                  label="Numero/ID do grupo"
                  variant="outlined"
                  size="small"
                  value={settings.groupNumber || ""}
                  onChange={(event) => handleGroupNotificationChange(item.key, "groupNumber", event.target.value)}
                  placeholder="Ex.: 120363000000000000@g.us"
                />
                <TextField
                  label="Mensagem personalizada"
                  variant="outlined"
                  multiline
                  minRows={4}
                  value={settings.message || ""}
                  onChange={(event) => handleGroupNotificationChange(item.key, "message", event.target.value)}
                />
                {renderVariableChips(
                  (token) => insertGroupVariable(item.key, token),
                  item.key === "appointmentCancelled"
                    ? [{ token: "{{cancellationReason}}", label: "Motivo cancelamento" }]
                    : []
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderExternalSettings = () => (
    <Box className={classes.placeholderGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Configuracoes do Agente Externo N8N</Typography>
        <Typography className={classes.panelSubtitle}>
          Configure o webhook da empresa para receber eventos do CRM neste agente externo.
        </Typography>

        <Box className={classes.fieldStack}>
          <TextField
            label="Nome do agente"
            variant="outlined"
            size="small"
            value={externalConfig?.name || ""}
            onChange={(event) => handleExternalConfigChange("name", event.target.value)}
          />
          <TextField
            label="Webhook N8N da empresa"
            variant="outlined"
            size="small"
            value={externalConfig?.n8nWebhookUrl || ""}
            onChange={(event) => handleExternalConfigChange("n8nWebhookUrl", event.target.value)}
            placeholder="https://n8n.seudominio.com/webhook/empresa"
          />
          <FormControlLabel
            control={
              <Switch
                color="primary"
                checked={Boolean(externalConfig?.webhookEnabled)}
                onChange={(event) => handleExternalConfigChange("webhookEnabled", event.target.checked)}
              />
            }
            label="Enviar eventos para o N8N"
          />
        </Box>

        <Box className={classes.actionRow}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={externalSaving}
            onClick={handleSaveExternalConfig}
          >
            Salvar configuracao
          </Button>
        </Box>

        {renderGroupNotificationSettings()}
      </Box>

      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Lembretes automaticos</Typography>
        <Typography className={classes.panelSubtitle}>
          Template usado quando o agente externo criar um agendamento.
        </Typography>
        <Box className={classes.fieldStack}>
          <FormControlLabel
            control={
              <Switch
                color="primary"
                checked={getExternalReminderSettings().enabled}
                onChange={(event) => handleReminderSettingChange("enabled", event.target.checked)}
              />
            }
            label="Criar lembrete automaticamente"
          />
          <TextField
            select
            label="Conexao de envio"
            variant="outlined"
            size="small"
            value={getExternalReminderSettings().whatsappId || ""}
            onChange={(event) => handleReminderSettingChange("whatsappId", event.target.value)}
          >
            <MenuItem value="">Selecionar conexao</MenuItem>
            {whatsappOptions.map((whatsapp) => (
              <MenuItem key={whatsapp.id} value={whatsapp.id}>
                {whatsapp.name || `Conexao #${whatsapp.id}`}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Horas antes do compromisso"
            type="number"
            variant="outlined"
            size="small"
            value={getExternalReminderSettings().hoursBefore}
            onChange={(event) => handleReminderSettingChange("hoursBefore", Number(event.target.value || 4))}
          />
          <TextField
            label="Texto do lembrete"
            variant="outlined"
            multiline
            minRows={6}
            value={getExternalReminderSettings().text}
            onChange={(event) => handleReminderSettingChange("text", event.target.value)}
          />
          {renderVariableChips(insertReminderVariable)}
          <TextField
            label="Rodape"
            variant="outlined"
            size="small"
            value={getExternalReminderSettings().footer}
            onChange={(event) => handleReminderSettingChange("footer", event.target.value)}
          />
          {getExternalReminderSettings().buttons.map((button, index) => (
            <TextField
              key={`auto-reminder-button-${index}`}
              label={`Botao ${index + 1}`}
              variant="outlined"
              size="small"
              value={button?.buttonText?.displayText || ""}
              onChange={(event) => handleReminderButtonChange(index, event.target.value)}
            />
          ))}
        </Box>
        <Box className={classes.actionRow}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={externalSaving}
            onClick={handleSaveExternalConfig}
          >
            Salvar lembretes
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const renderExternalDashboard = () => (
    <>
      <Box className={classes.dashboardGrid}>
        <Box className={classes.metricBox}>
          <Typography className={classes.metricLabel}>Agendamentos IA</Typography>
          <Typography className={classes.metricValue}>{externalStats.appointments}</Typography>
        </Box>
        <Box className={classes.metricBox}>
          <Typography className={classes.metricLabel}>Lembretes</Typography>
          <Typography className={classes.metricValue}>{externalStats.reminders}</Typography>
        </Box>
        <Box className={classes.metricBox}>
          <Typography className={classes.metricLabel}>Docs RAG</Typography>
          <Typography className={classes.metricValue}>{externalStats.ragDocuments}</Typography>
        </Box>
        <Box className={classes.metricBox}>
          <Typography className={classes.metricLabel}>Falhas N8N</Typography>
          <Typography className={classes.metricValue}>{externalStats.failedEvents}</Typography>
        </Box>
      </Box>
      <Box className={classes.placeholderGrid}>
        <Box className={classes.externalPanel}>
          <Typography className={classes.panelTitle}>Operacao da IA</Typography>
          <Typography className={classes.panelSubtitle}>
            Resumo inicial do agente externo. Os proximos passos vao conectar agendamentos, lembretes e RAG.
          </Typography>
          <Box className={classes.placeholderList}>
            <Box className={classes.placeholderRow}>
              <Typography>Versoes de prompt</Typography>
              <span className={classes.mutedPill}>{externalStats.promptVersions}</span>
            </Box>
            <Box className={classes.placeholderRow}>
              <Typography>Eventos enviados</Typography>
              <span className={classes.mutedPill}>{externalStats.sentEvents}</span>
            </Box>
            <Box className={classes.placeholderRow}>
              <Typography>Eventos sem webhook</Typography>
              <span className={classes.mutedPill}>{externalStats.skippedEvents}</span>
            </Box>
          </Box>
        </Box>
        {renderExternalEvents()}
      </Box>
    </>
  );

  const renderExternalPlaceholder = ({ title, subtitle, rows }) => (
    <Box className={classes.placeholderGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>{title}</Typography>
        <Typography className={classes.panelSubtitle}>{subtitle}</Typography>
        <Box className={classes.placeholderList}>
          {rows.map((row) => (
            <Box key={row.title} className={classes.placeholderRow}>
              <Box>
                <Typography className={classes.versionTitle}>{row.title}</Typography>
                <Typography className={classes.versionMeta}>{row.description}</Typography>
              </Box>
              <span className={classes.mutedPill}>{row.status}</span>
            </Box>
          ))}
        </Box>
      </Box>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Proximo desenvolvimento</Typography>
        <Typography className={classes.panelSubtitle}>
          Esta area ja fica posicionada no menu do agente externo para receber as tabelas, rotas e automacoes especificas.
        </Typography>
      </Box>
    </Box>
  );

  const renderAppointments = () => (
    <Box className={classes.placeholderGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Agendamentos IA</Typography>
        <Typography className={classes.panelSubtitle}>
          Crie e acompanhe agendamentos da IA sincronizados com Compromissos do CRM.
        </Typography>
        <Box className={classes.fieldStack}>
          <TextField label="Titulo" variant="outlined" size="small" value={appointmentForm.title} onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })} />
          <TextField label="Nome do lead" variant="outlined" size="small" value={appointmentForm.leadName} onChange={(e) => setAppointmentForm({ ...appointmentForm, leadName: e.target.value })} />
          <TextField label="Telefone" variant="outlined" size="small" value={appointmentForm.leadPhone} onChange={(e) => setAppointmentForm({ ...appointmentForm, leadPhone: e.target.value })} />
          <TextField label="Email" variant="outlined" size="small" value={appointmentForm.leadEmail} onChange={(e) => setAppointmentForm({ ...appointmentForm, leadEmail: e.target.value })} />
          <TextField label="ID da agenda" variant="outlined" size="small" value={appointmentForm.scheduleId} onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduleId: e.target.value })} />
          <TextField label="Data e hora" type="datetime-local" variant="outlined" size="small" InputLabelProps={{ shrink: true }} value={appointmentForm.startDatetime} onChange={(e) => setAppointmentForm({ ...appointmentForm, startDatetime: e.target.value })} />
          <TextField label="Duracao em minutos" type="number" variant="outlined" size="small" value={appointmentForm.durationMinutes} onChange={(e) => setAppointmentForm({ ...appointmentForm, durationMinutes: e.target.value })} />
        </Box>
        <Box className={classes.actionRow}>
          <Button variant="contained" color="primary" disabled={externalSaving || !appointmentForm.title || !appointmentForm.scheduleId || !appointmentForm.startDatetime} onClick={handleCreateAiAppointment}>
            Criar agendamento
          </Button>
        </Box>
      </Box>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Lista de agendamentos</Typography>
        <Typography className={classes.panelSubtitle}>{aiAppointments.length} registro(s) da IA.</Typography>
        <Box className={classes.placeholderList}>
          {aiAppointments.length === 0 ? (
            <Typography className={classes.toolsEmpty}>Nenhum agendamento IA criado ainda.</Typography>
          ) : aiAppointments.map((item) => (
            <Box key={item.id} className={classes.placeholderRow}>
              <Box>
                <Typography className={classes.versionTitle}>{item.title}</Typography>
                <Typography className={classes.versionMeta}>
                  {item.leadName || item.leadPhone || "Sem lead"} - {formatDateTime(item.startDatetime)}
                </Typography>
              </Box>
              <Box className={classes.inlineActions}>
                <span className={classes.mutedPill}>{item.status}</span>
                <Tooltip title="Enviar notificacao ao grupo">
                  <IconButton
                    size="small"
                    disabled={externalSaving}
                    onClick={() => handleSendAppointmentGroup(item.id)}
                  >
                    <GroupIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir agendamento">
                  <IconButton
                    size="small"
                    color="secondary"
                    disabled={externalSaving}
                    onClick={() => setDeletingAiAppointment(item)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );

  const renderReminders = () => (
    <Box className={classes.placeholderGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Lembretes</Typography>
        <Typography className={classes.panelSubtitle}>
          Crie lembretes e pause a IA por 30 minutos para proteger a cadencia.
        </Typography>
        <Box className={classes.fieldStack}>
          <TextField label="Nome do lead" variant="outlined" size="small" value={reminderForm.leadName} onChange={(e) => setReminderForm({ ...reminderForm, leadName: e.target.value })} />
          <TextField label="Telefone" variant="outlined" size="small" value={reminderForm.leadPhone} onChange={(e) => setReminderForm({ ...reminderForm, leadPhone: e.target.value })} />
          <TextField label="Quando lembrar" type="datetime-local" variant="outlined" size="small" InputLabelProps={{ shrink: true }} value={reminderForm.scheduledAt} onChange={(e) => setReminderForm({ ...reminderForm, scheduledAt: e.target.value })} />
          <TextField
            label="Mensagem em botoes"
            variant="outlined"
            size="small"
            multiline
            minRows={4}
            value={reminderForm.message}
            onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })}
            placeholder={getExternalReminderSettings().text}
          />
          <Box className={classes.inlineActions}>
            {getExternalReminderSettings().buttons.map((button, index) => (
              <span key={`reminder-preview-${index}`} className={classes.mutedPill}>
                {button?.buttonText?.displayText || `Botao ${index + 1}`}
              </span>
            ))}
          </Box>
        </Box>
        <Box className={classes.actionRow}>
          <Button variant="contained" color="primary" disabled={externalSaving || !reminderForm.scheduledAt} onClick={handleCreateReminder}>
            {editingReminderId ? "Salvar lembrete" : "Criar lembrete"}
          </Button>
          {editingReminderId && (
            <Button variant="outlined" disabled={externalSaving} onClick={handleCancelEditReminder}>
              Cancelar edicao
            </Button>
          )}
        </Box>
      </Box>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Lembretes ativos</Typography>
        <Typography className={classes.panelSubtitle}>{aiReminders.length} registro(s).</Typography>
        <Box className={classes.placeholderList}>
          {aiReminders.length === 0 ? (
            <Typography className={classes.toolsEmpty}>Nenhum lembrete criado ainda.</Typography>
          ) : aiReminders.map((item) => (
            <Box key={item.id} className={classes.placeholderRow}>
              <Box>
                <Typography className={classes.versionTitle}>{item.leadName || item.leadPhone || "Lead"}</Typography>
                <Typography className={classes.versionMeta}>
                  {formatDateTime(item.scheduledAt)}
                  {item.aiAppointment?.title ? ` - ${item.aiAppointment.title}` : ""}
                </Typography>
              </Box>
              <Box className={classes.inlineActions}>
                <span className={classes.mutedPill}>{item.status}</span>
                <Tooltip title="Enviar lembrete privado agora">
                  <IconButton
                    size="small"
                    disabled={externalSaving || !(item.leadPhone || item.aiAppointment?.leadPhone)}
                    onClick={() => handleSendReminderNow(item.id)}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Enviar notificacao ao grupo">
                  <IconButton
                    size="small"
                    disabled={externalSaving}
                    onClick={() => handleSendReminderGroup(item.id)}
                  >
                    <GroupIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar lembrete">
                  <IconButton
                    size="small"
                    disabled={externalSaving}
                    onClick={() => handleEditReminder(item)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir lembrete">
                  <IconButton
                    size="small"
                    color="secondary"
                    disabled={externalSaving}
                    onClick={() => setDeletingReminder(item)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );

  const renderFollowUps = () => (
    <Box className={classes.placeholderGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Follow-up automatico</Typography>
        <Typography className={classes.panelSubtitle}>
          Leads em Follow-up sao processados automaticamente a cada 2 horas com base no historico do N8N.
        </Typography>
        <Box className={classes.placeholderList}>
          <Box className={classes.placeholderRow}>
            <Typography>Aguardando follow-up</Typography>
            <span className={classes.mutedPill}>{externalStats.followUps}</span>
          </Box>
          <Box className={classes.placeholderRow}>
            <Typography>Follow-up enviado</Typography>
            <span className={classes.mutedPill}>{externalStats.followUpsSent}</span>
          </Box>
          <Box className={classes.placeholderRow}>
            <Typography>Status usados</Typography>
            <span className={classes.mutedPill}>follow_up</span>
          </Box>
        </Box>
        <Box className={classes.actionRow}>
          <Button variant="contained" color="primary" disabled={externalSaving} onClick={handleProcessAiFollowUps}>
            Processar agora
          </Button>
        </Box>
      </Box>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Leads em Follow-up</Typography>
        <Typography className={classes.panelSubtitle}>{aiFollowUps.length} registro(s).</Typography>
        <Box className={classes.placeholderList}>
          {aiFollowUps.length === 0 ? (
            <Typography className={classes.toolsEmpty}>Nenhum lead em follow-up.</Typography>
          ) : aiFollowUps.map((lead) => (
            <Box key={lead.id} className={classes.placeholderRow}>
              <Box>
                <Typography className={classes.versionTitle}>{lead.name || lead.phone || `Lead ${lead.id}`}</Typography>
                <Typography className={classes.versionMeta}>{lead.phone || "Sem telefone"} - {formatDateTime(lead.updatedAt)}</Typography>
              </Box>
              <span className={classes.mutedPill}>{lead.status || lead.leadStatus}</span>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );

  const renderRag = () => (
    <Box className={classes.placeholderGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Base RAG</Typography>
        <Typography className={classes.panelSubtitle}>
          Envie, consulte e exclua informacoes da base vetorial por empresa.
        </Typography>
        <Box className={classes.fieldStack}>
          <TextField select SelectProps={{ native: true }} label="Base" variant="outlined" size="small" value={ragBase} onChange={(e) => { setRagBase(e.target.value); setRagResults([]); loadRagDocuments(e.target.value); }}>
            <option value="empresa">Empresa</option>
            <option value="produtos">Produtos / Servicos</option>
            <option value="suporte">Suporte / FAQ</option>
            <option value="comercial">Comercial / Vendas</option>
          </TextField>
          <TextField label="Conteudo" variant="outlined" multiline minRows={7} value={ragContent} onChange={(e) => setRagContent(e.target.value)} />
          <Button variant="outlined" component="label">
            {ragFile ? ragFile.name : "Anexar PDF, imagem ou documento"}
            <input
              type="file"
              hidden
              accept=".pdf,.txt,.csv,.json,.md,image/*"
              onChange={(event) => setRagFile(event.target.files?.[0] || null)}
            />
          </Button>
        </Box>
        <Box className={classes.actionRow}>
          <Button variant="contained" color="primary" disabled={externalSaving || (!ragContent.trim() && !ragFile)} onClick={handleCreateRagDocument}>
            Enviar para RAG
          </Button>
        </Box>
        <Divider style={{ margin: "16px 0" }} />
        <Box className={classes.fieldStack}>
          <TextField label="Consultar RAG" variant="outlined" size="small" value={ragQuery} onChange={(e) => setRagQuery(e.target.value)} />
        </Box>
        <Box className={classes.actionRow}>
          <Button variant="outlined" color="primary" disabled={externalSaving || !ragQuery.trim()} onClick={handleSearchRag}>
            Consultar
          </Button>
        </Box>
        {ragResults.length > 0 && (
          <Box className={classes.placeholderList}>
            {ragResults.map((result) => (
              <Box key={`result-${result.id}`} className={classes.placeholderRow}>
                <Typography className={classes.versionPreview}>{result.content}</Typography>
                <span className={classes.mutedPill}>{Number(result.similarity || 0).toFixed(2)}</span>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Documentos</Typography>
        <Typography className={classes.panelSubtitle}>{ragDocuments.length} documento(s) em {ragBase}.</Typography>
        <Box className={classes.placeholderList}>
          {ragDocuments.length === 0 ? (
            <Typography className={classes.toolsEmpty}>Nenhum documento nesta base.</Typography>
          ) : ragDocuments.map((doc) => (
            <Box key={doc.id} className={classes.placeholderRow}>
              <Typography className={classes.versionPreview}>{(doc.content || "").slice(0, 130)}</Typography>
              <Button size="small" color="secondary" onClick={() => handleDeleteRagDocument(doc.id)}>Excluir</Button>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );

  const renderExternalSection = () => {
    if (externalSection === "dashboard") return renderExternalDashboard();
    if (externalSection === "prompt") return renderExternalPrompt();
    if (externalSection === "settings") return renderExternalSettings();
    if (externalSection === "events") return renderExternalEvents();
    if (externalSection === "appointments") return renderAppointments();
    if (externalSection === "reminders") return renderReminders();
    if (externalSection === "followups") return renderFollowUps();
    if (externalSection === "rag") return renderRag();
    return null;
  };

  useEffect(() => {
    async function fetchData() {
      const planConfigs = await getPlanCompany(undefined, companyId);
      const aiEnabled =
        typeof planConfigs.plan.aiEnabled === "boolean"
          ? planConfigs.plan.aiEnabled
          : Boolean(planConfigs.plan.useOpenAi);
      const aiAgentEnabled =
        typeof planConfigs.plan.aiAgentEnabled === "boolean"
          ? planConfigs.plan.aiAgentEnabled
          : aiEnabled;
      if (!aiEnabled || !aiAgentEnabled) {
        toast.error("Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando.");
        setTimeout(() => {
          history.push(`/`)
        }, 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/prompt");
        dispatch({ type: "LOAD_PROMPTS", payload: data.prompts });

        setLoading(false);
      } catch (err) {
        toastError(err);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeAgentTab === "external" && !externalConfig && !externalLoading) {
      loadExternalAgent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgentTab]);

  useEffect(() => {
    if (!isConnected || !user.companyId) return;

    const onPromptEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_PROMPTS", payload: data.prompt });
        reloadPage();
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_PROMPT", payload: data.promptId });
        reloadPage();
      }
    };

    const cleanup = on(`company-${companyId}-prompt`, onPromptEvent);
    return () => {
      cleanup();
    };
  }, [isConnected, on, user.companyId]);

  const handleOpenPromptModal = () => {
    setPromptModalOpen(true);
    setSelectedPrompt(null);
  };

  const handleClosePromptModal = () => {
    setPromptModalOpen(false);
    setSelectedPrompt(null);
    reloadPage();
  };

  const handleEditPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setPromptModalOpen(true);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedPrompt(null);
  };

  const handleDeletePrompt = async (promptId) => {
    try {
      const { data } = await api.delete(`/prompt/${promptId}`);
      toast.info(i18n.t(data.message));
      reloadPage();
    } catch (err) {
      toastError(err);
    }
    setSelectedPrompt(null);
  };

  const filteredPrompts = prompts.filter((prompt) =>
    prompt.name?.toLowerCase().includes(searchParam.toLowerCase()) ||
    prompt.queue?.name?.toLowerCase().includes(searchParam.toLowerCase())
  );

  if (user.profile === "user") {
    return <ForbiddenPage />;
  }

  return (
    <Box className={classes.root}>
      <ConfirmationModal
        title={
          selectedPrompt &&
          `${i18n.t("prompts.confirmationModal.deleteTitle")} ${selectedPrompt.name}?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeletePrompt(selectedPrompt.id)}
      >
        {i18n.t("prompts.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <ConfirmationModal
        title={
          deletingAiAppointment
            ? `Excluir agendamento "${deletingAiAppointment.title}"?`
            : "Excluir agendamento?"
        }
        open={Boolean(deletingAiAppointment)}
        onClose={() => setDeletingAiAppointment(null)}
        onConfirm={handleDeleteAiAppointment}
      >
        Este agendamento sera removido do painel da IA e tambem da base de
        Compromissos, quando houver compromisso vinculado.
      </ConfirmationModal>
      <ConfirmationModal
        title={
          deletingReminder
            ? `Excluir lembrete de "${deletingReminder.leadName || deletingReminder.leadPhone || "Lead"}"?`
            : "Excluir lembrete?"
        }
        open={Boolean(deletingReminder)}
        onClose={() => setDeletingReminder(null)}
        onConfirm={handleDeleteReminder}
      >
        Este lembrete sera removido da lista de lembretes ativos e da base de
        dados.
      </ConfirmationModal>
      <PromptModal
        open={promptModalOpen}
        onClose={handleClosePromptModal}
        promptId={selectedPrompt?.id}
      />

      <Box className={classes.agentTabs}>
        <button
          type="button"
          className={`${classes.agentTab} ${activeAgentTab === "internal" ? classes.agentTabActive : ""}`}
          onClick={() => setActiveAgentTab("internal")}
        >
          Agente Interno
        </button>
        <button
          type="button"
          className={`${classes.agentTab} ${activeAgentTab === "external" ? classes.agentTabActive : ""}`}
          onClick={() => setActiveAgentTab("external")}
        >
          Agente Externo N8N
        </button>
      </Box>

      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <Box className={classes.headerIcon}>
            <PsychologyIcon />
          </Box>
          <Box>
            <Typography className={classes.headerTitle}>Agentes de IA</Typography>
            <Typography className={classes.headerSubtitle}>
              {activeAgentTab === "internal"
                ? `${prompts.length} ${prompts.length === 1 ? "prompt configurado" : "prompts configurados"}`
                : "System Prompt versionado e integrado ao N8N"}
            </Typography>
          </Box>
        </Box>

        {activeAgentTab === "internal" && (
          <Box className={classes.headerRight}>
            <TextField
              placeholder="Buscar prompt..."
              variant="outlined"
              size="small"
              value={searchParam}
              onChange={(e) => setSearchParam(e.target.value)}
              className={classes.searchField}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon style={{ color: "#999" }} />
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title={i18n.t("prompts.buttons.add")}>
              <button className={classes.addButton} onClick={handleOpenPromptModal}>
                <AddIcon style={{ fontSize: 24 }} />
              </button>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box className={classes.content}>
        {activeAgentTab === "external" ? (
          externalLoading ? (
            <Box className={classes.loadingContainer}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <>
              <Box className={classes.externalMenu}>
                {externalMenuItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`${classes.externalMenuButton} ${externalSection === item.key ? classes.externalMenuButtonActive : ""}`}
                    onClick={() => setExternalSection(item.key)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </Box>
              {renderExternalSection()}
            </>
          )
        ) : loading ? (
          <Box className={classes.loadingContainer}>
            <CircularProgress size={32} />
          </Box>
        ) : filteredPrompts.length === 0 ? (
          <Box className={classes.emptyState}>
            <PsychologyIcon />
            <Typography>Nenhum prompt encontrado</Typography>
          </Box>
        ) : (
          filteredPrompts.map((prompt) => (
            <Box key={prompt.id} className={classes.listItem}>
              {/* Icon */}
              <Box className={classes.itemIcon}>
                <PsychologyIcon />
              </Box>

              {/* Info */}
              <Box className={classes.itemInfo}>
                <Typography className={classes.itemName}>{prompt.name}</Typography>
                <Box className={classes.itemDetails}>
                  <span>ID: {prompt.id}</span>
                  <span>•</span>
                  <span>{i18n.t("prompts.table.queue")}: {prompt.queue?.name || "Sem fila"}</span>
                  <span>•</span>
                  <span>{i18n.t("prompts.table.max_tokens")}: {prompt.maxTokens}</span>
                </Box>
                <Box className={classes.toolsWrapper}>
                  {prompt.toolsEnabled?.length ? (
                    prompt.toolsEnabled.map((toolName) => {
                      const meta = toolMap[toolName];
                      const isSensitive = DEFAULT_SENSITIVE_TOOLS.includes(toolName);
                      const chipClass = `${classes.toolChip} ${isSensitive ? classes.toolChipSensitive : classes.toolChipSafe
                        }`;

                      return (
                        <Tooltip
                          key={`${prompt.id}-${toolName}`}
                          title={meta?.description || toolName}
                          arrow
                        >
                          <Chip
                            size="small"
                            label={meta?.title || toolName}
                            className={chipClass}
                          />
                        </Tooltip>
                      );
                    })
                  ) : (
                    <Typography className={classes.toolsEmpty}>
                      Nenhuma ferramenta habilitada
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Actions */}
              <Box className={classes.itemActions}>
                <Tooltip title="Editar">
                  <IconButton
                    size="small"
                    className={`${classes.actionButton} ${classes.editButton}`}
                    onClick={() => handleEditPrompt(prompt)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir">
                  <IconButton
                    size="small"
                    className={`${classes.actionButton} ${classes.deleteButton}`}
                    onClick={() => {
                      setSelectedPrompt(prompt);
                      setConfirmModalOpen(true);
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default Prompts;
