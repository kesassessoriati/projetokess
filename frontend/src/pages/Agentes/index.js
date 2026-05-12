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

  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
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
      const [configResponse, versionsResponse, eventsResponse] = await Promise.all([
        api.get("/ai-agents/external/config"),
        api.get("/ai-agents/external/prompt/versions"),
        api.get("/ai-agents/external/events", { params: { pageNumber: 1 } }),
      ]);

      setExternalConfig(configResponse.data);
      setExternalPrompt(configResponse.data?.systemPrompt || "");
      setExternalVersions(versionsResponse.data?.versions || []);
      setExternalEvents(eventsResponse.data?.events || []);
    } catch (err) {
      toastError(err);
    } finally {
      setExternalLoading(false);
    }
  };

  const handleExternalConfigChange = (field, value) => {
    setExternalConfig(prev => ({
      ...(prev || {}),
      [field]: value,
    }));
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
              <Box className={classes.externalGrid}>
                <Box className={classes.externalPanel}>
                  <Typography className={classes.panelTitle}>Agente Externo N8N</Typography>
                  <Typography className={classes.panelSubtitle}>
                    Configure o webhook da empresa e mantenha o System Prompt versionado para o fluxo principal do N8N.
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

                  <Divider style={{ margin: "18px 0" }} />

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
                    minRows={12}
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
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<RestoreIcon />}
                            disabled={externalSaving || version.isActive}
                            onClick={() => handleRestoreExternalVersion(version.id)}
                          >
                            Restaurar
                          </Button>
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              </Box>

              <Box className={`${classes.externalPanel} ${classes.eventsPanel}`}>
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
                      <span className={`${classes.eventStatus} ${getEventStatusClass(event.status)}`}>
                        {event.status}
                      </span>
                    </Box>
                  ))
                )}
              </Box>
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
