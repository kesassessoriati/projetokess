import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { makeStyles, useTheme } from "@material-ui/core/styles";

import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tooltip,
  Typography
} from "@material-ui/core";

import {
  Add as AddIcon,
  Cake as CakeIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  EventAvailable as EventIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  WarningRounded as WarningIcon
} from "@material-ui/icons";

import ConfirmationModal from "../../components/ConfirmationModal";
import ScheduledDispatcherModal from "../../components/AutomationModal";
import {
  deleteScheduledDispatcher,
  eventTypeOptions,
  listScheduledDispatchers,
  toggleScheduledDispatcher
} from "../../services/scheduledDispatcherService";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: theme.spacing(3),
    gap: theme.spacing(3),
    backgroundColor: theme.palette.background.default,
    ...theme.scrollbarStyles
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(2)
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: 26
  },
  headerSubtitle: {
    color: theme.palette.text.secondary
  },
  headerActions: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center"
  },
  filters: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1.5),
    alignItems: "center"
  },
  searchInput: {
    flex: 1,
    minWidth: 260,
    backgroundColor: theme.palette.background.paper,
    borderRadius: 16,
    padding: theme.spacing(0.5, 1.5),
    boxShadow: theme.shadows[1]
  },
  searchFieldInput: {
    width: "100%"
  },
  selectControl: {
    minWidth: 250
  },
  listWrapper: {
    flex: 1,
    overflowY: "auto",
    ...theme.scrollbarStyles
  },
  dispatcherCard: {
    display: "flex",
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: 18,
    alignItems: "stretch",
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[1],
    marginBottom: theme.spacing(1.5)
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0
  },
  cardBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1)
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  cardTitle: {
    fontWeight: 600,
    fontSize: 18
  },
  cardMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(2),
    fontSize: 13,
    color: theme.palette.text.secondary
  },
  cardMessage: {
    backgroundColor: theme.palette.action.hover,
    borderRadius: 12,
    padding: theme.spacing(1.5),
    fontSize: 14,
    color: theme.palette.text.secondary
  },
  cardActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: theme.spacing(1),
    minWidth: 120
  },
  statusTextActive: {
    fontSize: 12,
    fontWeight: 600,
    color: theme.palette.success.main
  },
  statusTextInactive: {
    fontSize: 12,
    fontWeight: 600,
    color: theme.palette.error.main
  },
  actionsRow: {
    display: "flex",
    gap: theme.spacing(1)
  },
  emptyState: {
    minHeight: 280,
    borderRadius: 18,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[1],
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: theme.spacing(2),
    padding: theme.spacing(6)
  }
}));

const Automations = () => {
  const classes = useStyles();
  const theme = useTheme();

  const [dispatchers, setDispatchers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDispatcher, setEditingDispatcher] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [dispatcherPendingDeletion, setDispatcherPendingDeletion] = useState(null);

  const loadDispatchers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listScheduledDispatchers();
      setDispatchers(data);
    } catch (error) {
      toast.error("Não foi possível carregar os disparos agendados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDispatchers();
  }, [loadDispatchers]);

  useEffect(() => {
    const nextList = dispatchers.filter(dispatcher => {
      const matchesEvent =
        eventFilter === "all" || dispatcher.eventType === eventFilter;
      return matchesEvent;
    });
    setFiltered(nextList);
  }, [dispatchers, eventFilter]);

  const stats = useMemo(() => {
    const active = dispatchers.filter(item => item.active).length;
    const byEvent = eventTypeOptions.reduce((acc, curr) => {
      acc[curr.value] = dispatchers.filter(item => item.eventType === curr.value)
        .length;
      return acc;
    }, {});
    return { total: dispatchers.length, active, byEvent };
  }, [dispatchers]);

  const handleToggleDispatcher = async dispatcher => {
    try {
      await toggleScheduledDispatcher(dispatcher.id, !dispatcher.active);
      toast.success(
        dispatcher.active ? "Dispatcher desativado" : "Dispatcher ativado"
      );
      loadDispatchers();
    } catch (error) {
      toast.error("Não foi possível atualizar o status");
    }
  };

  const handleDeleteDispatcher = async () => {
    if (!dispatcherPendingDeletion) return;
    try {
      await deleteScheduledDispatcher(dispatcherPendingDeletion.id);
      toast.success("Dispatcher removido");
      setConfirmModalOpen(false);
      setDispatcherPendingDeletion(null);
      loadDispatchers();
    } catch (error) {
      toast.error("Erro ao remover dispatcher");
    }
  };

  const handleOpenModal = dispatcher => {
    setEditingDispatcher(dispatcher || null);
    setModalOpen(true);
  };

  const handleCloseModal = shouldReload => {
    setModalOpen(false);
    setEditingDispatcher(null);
    if (shouldReload) {
      loadDispatchers();
    }
  };

  const eventVisuals = useMemo(
    () => ({
      birthday: {
        label: "Aniversário",
        icon: <CakeIcon />,
        background: theme.palette.success.main
      },
      invoice_reminder: {
        label: "Lembrete de fatura",
        icon: <ReceiptIcon />,
        background: theme.palette.info.main
      },
      client_expiration: {
        label: "Vencimento",
        icon: <EventIcon />,
        background: theme.palette.warning.main
      },
      invoice_overdue: {
        label: "Cobrança atrasada",
        icon: <WarningIcon />,
        background: theme.palette.error.main
      }
    }),
    [theme]
  );

  const renderRulesDescription = dispatcher => {
    if (dispatcher.eventType === "invoice_reminder") {
      return `Dispara ${dispatcher.daysBeforeDue || 0} dia(s) antes do vencimento`;
    }
    if (dispatcher.eventType === "client_expiration") {
      return `Dispara ${dispatcher.daysBeforeDue || 0} dia(s) antes do vencimento do cliente`;
    }
    if (dispatcher.eventType === "invoice_overdue") {
      return `Dispara ${dispatcher.daysAfterDue || 0} dia(s) após o atraso`;
    }
    return "Executa no aniversário do cliente";
  };

  return (
    <Box className={classes.root}>
      <ConfirmationModal
        title="Remover disparo agendado"
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleDeleteDispatcher}
      >
        Tem certeza que deseja excluir "{dispatcherPendingDeletion?.title}"?
      </ConfirmationModal>

      <ScheduledDispatcherModal
        open={modalOpen}
        onClose={handleCloseModal}
        dispatcher={editingDispatcher}
      />

      <Box className={classes.pageHeader}>
        <Box>
          <Typography className={classes.headerTitle}>
            Automações, disparos e tarefas automatizadas
          </Typography>
          <Typography className={classes.headerSubtitle}>
            {stats.total}{" "}
            {stats.total === 1 ? "regra configurada" : "regras configuradas"}
          </Typography>
        </Box>
        <Box className={classes.headerActions}>
          <FormControl
            variant="outlined"
            size="small"
            className={classes.selectControl}
          >
            <Select
              value={eventFilter}
              onChange={event => setEventFilter(event.target.value)}
            >
              <MenuItem value="all">Todos os eventos</MenuItem>
              {eventTypeOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDispatchers}
            disabled={loading}
          >
            Recarregar
          </Button>
          <Button
            color="primary"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenModal()}
          >
            Novo disparo
          </Button>
        </Box>
      </Box>

      <Box className={classes.listWrapper}>
        {loading ? (
          <Box className={classes.emptyState}>
            <CircularProgress />

            <Typography variant="body1">
              Carregando disparos programados...
            </Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box className={classes.emptyState}>
            <EventIcon fontSize="large" color="primary" />
            <Typography variant="h6">Nenhum disparo encontrado</Typography>
            <Typography variant="body2" color="textSecondary">
              Inicie criando uma nova automação ou regra de disparo automático.
            </Typography>
            <Button
              color="primary"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenModal()}
            >
              Criar primeiro disparo
            </Button>
          </Box>
        ) : (
          filtered.map(dispatcher => {
            const visuals = eventVisuals[dispatcher.eventType] || {
              icon: <EventIcon />,
              background: theme.palette.primary.main,
              label: dispatcher.eventType
            };
            const eventMeta = eventTypeOptions.find(
              item => item.value === dispatcher.eventType
            );

            return (
              <Paper key={dispatcher.id} className={classes.dispatcherCard}>
                <Box
                  className={classes.iconBubble}
                  style={{ backgroundColor: visuals.background }}
                >
                  {visuals.icon}
                </Box>
                <Box className={classes.cardBody}>
                  <Box className={classes.cardHeader}>
                    <Typography className={classes.cardTitle}>
                      {dispatcher.title}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {eventMeta?.label || visuals.label}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {renderRulesDescription(dispatcher)}
                  </Typography>
                  <Box className={classes.cardMeta}>
                    <span>Início: {dispatcher.startTime}</span>
                    <span>Intervalo: {dispatcher.sendIntervalSeconds}s</span>
                    <span>
                      Conexão: {dispatcher.whatsapp?.name || "não definida"}
                    </span>
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    Última atualização{" "}
                    {new Date(dispatcher.updatedAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box className={classes.cardActions}>
                  <Tooltip
                    title={dispatcher.active ? "Desativar disparo" : "Ativar disparo"}
                  >
                    <Switch
                      checked={dispatcher.active}
                      onChange={() => handleToggleDispatcher(dispatcher)}
                      color="primary"
                    />
                  </Tooltip>
                  <Typography
                    className={
                      dispatcher.active
                        ? classes.statusTextActive
                        : classes.statusTextInactive
                    }
                  >
                    {dispatcher.active ? "Ativo" : "Inativo"}
                  </Typography>
                  <Box className={classes.actionsRow}>
                    <Tooltip title="Editar">
                      <IconButton
                        onClick={() => handleOpenModal(dispatcher)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        onClick={() => {
                          setDispatcherPendingDeletion(dispatcher);
                          setConfirmModalOpen(true);
                        }}
                        size="small"
                      >
                        <DeleteIcon color="error" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Paper>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default Automations;
