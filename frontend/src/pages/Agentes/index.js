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

  const [prompts, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");

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

  useEffect(() => {
    async function fetchData() {
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useOpenAi) {
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

      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <Box className={classes.headerIcon}>
            <PsychologyIcon />
          </Box>
          <Box>
            <Typography className={classes.headerTitle}>Agentes de IA</Typography>
            <Typography className={classes.headerSubtitle}>
              {prompts.length} {prompts.length === 1 ? "prompt configurado" : "prompts configurados"}
            </Typography>
          </Box>
        </Box>

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
      </Box>

      {/* Content */}
      <Box className={classes.content}>
        {loading ? (
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