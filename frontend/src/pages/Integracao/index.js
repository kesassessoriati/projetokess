import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import n8n from "../../assets/n8n.png";
import dialogflow from "../../assets/dialogflow.png";
import webhooks from "../../assets/webhook.png";
import typebot from "../../assets/typebot.jpg";
import flowbuilder from "../../assets/flowbuilders.png"
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Button,
  InputAdornment,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress
} from "@material-ui/core";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import SearchIcon from "@material-ui/icons/Search";
import DeviceHubIcon from "@material-ui/icons/DeviceHub";
import IntegrationModal from "../../components/QueueIntegrationModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import GoogleCalendarIntegrationModal from "../../components/GoogleCalendarIntegrationModal";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import usePlans from "../../hooks/usePlans";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import ForbiddenPage from "../../components/ForbiddenPage";
import AddIcon from "@material-ui/icons/Add";

const reducer = (state, action) => {
  if (action.type === "LOAD_INTEGRATIONS") {
    const queueIntegration = action.payload;
    const newIntegrations = [];

    queueIntegration.forEach((integration) => {
      const integrationIndex = state.findIndex((u) => u.id === integration.id);
      if (integrationIndex !== -1) {
        state[integrationIndex] = integration;
      } else {
        newIntegrations.push(integration);
      }
    });

    return [...state, ...newIntegrations];
  }

  if (action.type === "UPDATE_INTEGRATIONS") {
    const queueIntegration = action.payload;
    const integrationIndex = state.findIndex((u) => u.id === queueIntegration.id);

    if (integrationIndex !== -1) {
      state[integrationIndex] = queueIntegration;
      return [...state];
    } else {
      return [queueIntegration, ...state];
    }
  }

  if (action.type === "DELETE_INTEGRATION") {
    const integrationId = action.payload;

    const integrationIndex = state.findIndex((u) => u.id === integrationId);
    if (integrationIndex !== -1) {
      state.splice(integrationIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f5f5f5",
    ...theme.scrollbarStyles
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #e0e0e0",
    backgroundColor: "#f5f5f5",
    flexWrap: "wrap",
    gap: 12
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    backgroundColor: "#e8f5e9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 28,
      color: "#43a047"
    }
  },
  headerTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1a1a1a"
  },
  headerSubtitle: {
    fontSize: "0.85rem",
    color: "#666",
    marginTop: 4
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap"
  },
  ghostButton: {
    borderRadius: 999,
    border: "1px solid #d0d0d0",
    color: "#333",
    padding: "10px 18px",
    textTransform: "none",
    fontWeight: 600,
    "&:hover": {
      borderColor: "#1a1a1a",
      color: "#1a1a1a",
      backgroundColor: "transparent"
    }
  },
  addButton: {
    width: 48,
    height: 48,
    minWidth: 48,
    borderRadius: "50%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    padding: 0,
    "&:hover": {
      backgroundColor: "#333",
      transform: "scale(1.05)"
    },
    transition: "all 0.2s ease"
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "20px 24px",
    gap: 16,
    minHeight: 0
  },
  filtersRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap"
  },
  searchField: {
    minWidth: 200,
    "& .MuiInputBase-root": {
      backgroundColor: "#fff",
      borderRadius: 8,
      border: "1px solid #e0e0e0",
      padding: "4px 12px",
      fontSize: "0.875rem",
      "&:hover": {
        borderColor: "#e0e0e0"
      },
      "&.Mui-focused": {
        borderColor: "#e0e0e0"
      },
      "&::before, &::after": {
        display: "none"
      }
    },
    "& .MuiInputBase-input": {
      padding: "6px 0",
      "&::placeholder": {
        color: "#9e9e9e",
        opacity: 1
      }
    }
  },
  listWrapper: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingBottom: 20
  },
  card: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: "18px 20px",
    boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
    gap: 16,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 20px 32px rgba(15,23,42,0.12)"
    }
  },
  logo: {
    width: 120,
    height: 48,
    objectFit: "contain",
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    padding: 8
  },
  cardInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  cardActions: {
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12
  },
  editButton: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    "&:hover": {
      backgroundColor: "#bbdefb"
    }
  },
  deleteButton: {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    "&:hover": {
      backgroundColor: "#ffcdd2"
    }
  },
  statusCard: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: "#f1f8e9",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  statusInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "40px 0",
    justifyContent: "center"
  },
  emptyState: {
    borderRadius: 16,
    backgroundColor: "#fff",
    textAlign: "center",
    padding: "60px 20px",
    color: "#999",
    "& svg": {
      fontSize: 48,
      marginBottom: 12,
      color: "#d9d9d9"
    }
  }
}));

const QueueIntegration = () => {
  const classes = useStyles();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [googleIntegration, setGoogleIntegration] = useState(null);
  const [loadingGoogleIntegration, setLoadingGoogleIntegration] = useState(false);
  const [queueIntegration, dispatch] = useReducer(reducer, []);
  const { user, socket } = useContext(AuthContext);

  const { getPlanCompany } = usePlans();
  const companyId = user.companyId;
  const history = useHistory();

  useEffect(() => {
    async function fetchData() {
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useIntegrations) {
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
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    const fetchGoogleIntegration = async () => {
      try {
        setLoadingGoogleIntegration(true);
        const { data } = await api.get("/google-calendar/integrations");
        setGoogleIntegration(data);
      } catch (err) {
        toastError(err);
      } finally {
        setLoadingGoogleIntegration(false);
      }
    };

    fetchGoogleIntegration();
  }, []);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchIntegrations = async () => {
        try {
          const { data } = await api.get("/queueIntegration/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_INTEGRATIONS", payload: data.queueIntegrations });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchIntegrations();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const onQueueEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_INTEGRATIONS", payload: data.queueIntegration });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_INTEGRATION", payload: +data.integrationId });
      }
    };

    socket.on(`company-${companyId}-queueIntegration`, onQueueEvent);
    return () => {
      socket.off(`company-${companyId}-queueIntegration`, onQueueEvent);
    };
  }, [socket, companyId]);

  const handleOpenUserModal = () => {
    setSelectedIntegration(null);
    setUserModalOpen(true);
  };

  const handleOpenGoogleModal = () => {
    setGoogleModalOpen(true);
  };

  const handleCloseIntegrationModal = () => {
    setSelectedIntegration(null);
    setUserModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditIntegration = (queueIntegration) => {
    setSelectedIntegration(queueIntegration);
    setUserModalOpen(true);
  };

  const handleDisconnectGoogle = async () => {
    try {
      await api.delete("/google-calendar/integration");
      toast.success("Google Calendar desconectado com sucesso.");
      setGoogleIntegration([]);
    } catch (err) {
      toastError(err);
    }
  };

  const handleDeleteIntegration = async (integrationId) => {
    try {
      await api.delete(`/queueIntegration/${integrationId}`);
      toast.success(i18n.t("queueIntegration.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingUser(null);
    setSearchParam("");
    setPageNumber(1);
  };

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

  const getIntegrationLogo = (type) => {
    if (type === "dialogflow") return dialogflow;
    if (type === "n8n") return n8n;
    if (type === "webhook") return webhooks;
    if (type === "typebot") return typebot;
    if (type === "flowbuilder") return flowbuilder;
    return webhooks;
  };

  if (user.profile === "user") {
    return <ForbiddenPage />;
  }

  return (
    <Box className={classes.root}>
      <ConfirmationModal
        title={
          deletingUser &&
          `${i18n.t("queueIntegration.confirmationModal.deleteTitle")} ${deletingUser.name}?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteIntegration(deletingUser.id)}
      >
        {i18n.t("queueIntegration.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <IntegrationModal
        open={userModalOpen}
        onClose={handleCloseIntegrationModal}
        aria-labelledby="form-dialog-title"
        integrationId={selectedIntegration && selectedIntegration.id}
      />
      <GoogleCalendarIntegrationModal
        open={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
      />

      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <Box className={classes.headerIcon}>
            <DeviceHubIcon />
          </Box>
          <Box>
            <Typography className={classes.headerTitle}>
              {i18n.t("queueIntegration.title")}
            </Typography>
            <Typography className={classes.headerSubtitle}>
              {queueIntegration.length} integrações conectadas
            </Typography>
          </Box>
        </Box>
        <Box className={classes.headerActions}>
          <TextField
            className={classes.searchField}
            placeholder="Pesquisar..."
            type="search"
            value={searchParam}
            onChange={handleSearch}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "#9e9e9e", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            className={classes.ghostButton}
            onClick={handleOpenGoogleModal}
          >
            Google Calendar
          </Button>
          <IconButton
            className={classes.addButton}
            onClick={handleOpenUserModal}
          >
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      <Box className={classes.content}>
        {loadingGoogleIntegration ? (
          <Box className={classes.loadingBox}>
            <CircularProgress size={24} />
            <Typography variant="body2">Carregando status do Google Calendar...</Typography>
          </Box>
        ) : (
          <>
            {googleIntegration && googleIntegration.length > 0 && (
              <Box className={classes.statusCard}>
                <Box className={classes.statusInfo}>
                  <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                    Google Calendar conectado ({googleIntegration.length} integração{googleIntegration.length > 1 ? 'ões' : ''})
                  </Typography>
                  {googleIntegration.map((integration, index) => (
                    <Box key={integration.id} style={{ marginBottom: 8 }}>
                      <Typography variant="body2" color="textSecondary">
                        {index + 1}. E-mail: {integration.email || "Não informado"}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Usuário: {integration.user?.name || "Não informado"}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Calendário: {integration.calendarId}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Button color="secondary" onClick={handleDisconnectGoogle}>
                  Desconectar
                </Button>
              </Box>
            )}

            <Box className={classes.listWrapper} onScroll={handleScroll}>
              {queueIntegration.length === 0 && !loading ? (
                <Box className={classes.emptyState}>
                  <DeviceHubIcon />
                  <Typography>Nenhuma integração configurada ainda</Typography>
                </Box>
              ) : (
                queueIntegration.map((integration) => (
                  <Box key={integration.id} className={classes.card}>
                    <img
                      src={getIntegrationLogo(integration.type)}
                      alt={integration.type}
                      className={classes.logo}
                    />
                    <Box className={classes.cardInfo}>
                      <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                        {integration.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Tipo: {integration.type}
                      </Typography>
                    </Box>
                    <Box className={classes.cardActions}>
                      <Tooltip title="Editar">
                        <IconButton
                          className={`${classes.actionButton} ${classes.editButton}`}
                          onClick={() => handleEditIntegration(integration)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton
                          className={`${classes.actionButton} ${classes.deleteButton}`}
                          onClick={() => {
                            setConfirmModalOpen(true);
                            setDeletingUser(integration);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                ))
              )}

              {loading && (
                <Box className={classes.loadingBox}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">{i18n.t("loading")}</Typography>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
;

export default QueueIntegration;