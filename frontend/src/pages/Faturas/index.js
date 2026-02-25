import React, { useState, useEffect, useReducer, useCallback, useContext } from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";

import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import ReceiptIcon from "@material-ui/icons/Receipt";
import LaunchIcon from "@material-ui/icons/Launch";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import LinkIcon from "@material-ui/icons/Link";

import ConfirmationModal from "../../components/ConfirmationModal";
import FaturaModal from "../../components/FaturaModal";
import PagamentoModal from "../../components/PagamentoModal";
import { listFinanceiroFaturas, deleteFinanceiroFatura } from "../../services/financeiroFaturas";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useSocket } from "../../context/SocketContext";

const reducer = (state, action) => {
  switch (action.type) {
    case "LOAD_FATURAS": {
      const incoming = action.payload || [];
      const updated = [...state];

      incoming.forEach(fatura => {
        const index = updated.findIndex(item => item.id === fatura.id);
        if (index !== -1) {
          updated[index] = fatura;
        } else {
          updated.push(fatura);
        }
      });

      return updated;
    }
    case "RESET":
      return [];
    case "DELETE_FATURA":
      return state.filter(fatura => fatura.id !== action.payload);
    default:
      return state;
  }
};

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f5f5f5",
    overflowY: "auto",
    ...theme.scrollbarStyles
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    backgroundColor: "#f5f5f5",
    borderBottom: "1px solid #e0e0e0",
    flexWrap: "wrap",
    gap: "16px"
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#e8f5e9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#4caf50"
    }
  },
  headerTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1a1a1a"
  },
  headerSubtitle: {
    fontSize: "0.875rem",
    color: "#666"
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap"
  },
  searchField: {
    backgroundColor: "#fff",
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      "& fieldset": {
        borderColor: "#e0e0e0"
      },
      "&:hover fieldset": {
        borderColor: "#1976d2"
      }
    }
  },
  filterSelect: {
    minWidth: 150,
    backgroundColor: "#fff",
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8
    }
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
      transform: "scale(1.05)"
    }
  },
  content: {
    flex: 1,
    padding: "16px 24px",
    overflowY: "auto",
    ...theme.scrollbarStyles
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
      boxShadow: "0 2px 8px rgba(0,0,0,0.12)"
    }
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#e8f5e9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#4caf50"
    }
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  itemName: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1a1a1a"
  },
  itemClient: {
    fontSize: "0.85rem",
    color: "#4a4a4a"
  },
  itemDetails: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: "0.8rem",
    color: "#666",
    flexWrap: "wrap"
  },
  itemValueWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    marginLeft: 16,
    minWidth: 120
  },
  itemValue: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#4caf50"
  },
  itemValueSecondary: {
    fontSize: "0.8rem",
    color: "#666",
    marginTop: 4
  },
  paymentInfo: {
    marginTop: 8,
    padding: "8px 12px",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  paymentInfoRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    fontSize: "0.85rem",
    color: "#475569"
  },
  linkActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 4
  },
  statusChip: {
    fontWeight: 500,
    fontSize: "0.75rem"
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8
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
      opacity: 0.5
    }
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "24px"
  }
}));

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "aberta", label: "Aberta" },
  { value: "paga", label: "Paga" },
  { value: "vencida", label: "Vencida" },
  { value: "cancelada", label: "Cancelada" }
];

const RECURRENCE_FILTERS = [
  { value: "", label: "Recorrência" },
  { value: "unica", label: "Única" },
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" }
];

const ACTIVE_FILTERS = [
  { value: "", label: "Todas" },
  { value: "true", label: "Ativas" },
  { value: "false", label: "Inativas" }
];

const PAYMENT_PROVIDER_LABELS = {
  asaas: "Asaas",
  mercadopago: "Mercado Pago"
};

const Faturas = () => {
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const { isConnected, on } = useSocket();
  const classes = useStyles();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [recurrenceFilter, setRecurrenceFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [faturas, dispatch] = useReducer(reducer, []);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingFatura, setDeletingFatura] = useState(null);
  const [faturaModalOpen, setFaturaModalOpen] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const frontendBaseUrl =
    typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";

  const getCheckoutLink = useCallback(
    fatura => {
      if (fatura?.paymentLink) {
        return fatura.paymentLink;
      }

      if (fatura?.checkoutToken && frontendBaseUrl) {
        return `${frontendBaseUrl}/checkout/${fatura.checkoutToken}`;
      }

      return "";
    },
    []
  );

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam, statusFilter, recurrenceFilter, activeFilter]);

  const fetchFaturas = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const data = await listFinanceiroFaturas({
          searchParam: searchParam || undefined,
          pageNumber: page,
          status: statusFilter || undefined,
          tipoRecorrencia: recurrenceFilter || undefined,
          ativa: activeFilter || undefined
        });

        const fetched = data.faturamentos || data.records || [];
        if (page === 1) {
          dispatch({ type: "RESET" });
        }
        dispatch({ type: "LOAD_FATURAS", payload: fetched });
        setHasMore(Boolean(data.hasMore));
        setTotalCount(data.count || fetched.length);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    },
    [searchParam, statusFilter, recurrenceFilter, activeFilter]
  );

  useEffect(() => {
    fetchFaturas(pageNumber);
  }, [fetchFaturas, pageNumber]);

  useEffect(() => {
    if (!isConnected || !user?.companyId) return;
    const eventName = `company-${user.companyId}-financeiro`;

    const handler = ({ action, payload }) => {
      if (!payload) return;
      switch (action) {
        case "fatura:created":
        case "fatura:updated": {
          dispatch({ type: "LOAD_FATURAS", payload: [payload] });
          break;
        }
        case "fatura:deleted": {
          dispatch({ type: "DELETE_FATURA", payload: payload.id });
          break;
        }
        case "pagamento:created":
        case "pagamento:updated":
        case "pagamento:deleted": {
          if (payload.fatura) {
            dispatch({ type: "LOAD_FATURAS", payload: [payload.fatura] });
          }
          break;
        }
        default:
          break;
      }
    };

    const cleanup = on(eventName, handler);
    return () => {
      cleanup();
    };
  }, [isConnected, on, user?.companyId]);

  const handleScroll = e => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      setPageNumber(prev => prev + 1);
    }
  };

  const handleDeleteFatura = async fatura => {
    try {
      await deleteFinanceiroFatura(fatura.id);

      toast.success("Fatura excluída com sucesso.");
      dispatch({ type: "DELETE_FATURA", payload: fatura.id });
      setTotalCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      toastError(err);
    }
    setDeletingFatura(null);
  };

  const copyUsingTextarea = text => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!copied) {
      throw new Error("Não foi possível copiar o link.");
    }
  };

  const handleCopyLink = async link => {
    if (!link) return;
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        copyUsingTextarea(link);
      }
      toast.success("Link copiado para a área de transferência.");
    } catch (err) {
      try {
        copyUsingTextarea(link);
        toast.success("Link copiado para a área de transferência.");
      } catch (fallbackErr) {
        toastError(fallbackErr || err);
      }
    }
  };

  const handleOpenLink = link => {
    if (!link) return;
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const getStatusChip = status => {
    switch (status) {
      case "paga":
        return (
          <Chip
            label="Paga"
            size="small"
            className={classes.statusChip}
            style={{ backgroundColor: "#e8f5e9", color: "#4caf50" }}
          />
        );
      case "vencida":
        return (
          <Chip
            label="Vencida"
            size="small"
            className={classes.statusChip}
            style={{ backgroundColor: "#ffebee", color: "#d32f2f" }}
          />
        );
      case "cancelada":
        return (
          <Chip
            label="Cancelada"
            size="small"
            className={classes.statusChip}
            style={{ backgroundColor: "#f5f5f5", color: "#9e9e9e" }}
          />
        );
      default:
        return (
          <Chip
            label="Aberta"
            size="small"
            className={classes.statusChip}
            style={{ backgroundColor: "#fff3e0", color: "#ff9800" }}
          />
        );
    }
  };

  const formatCurrency = value =>
    value == null
      ? "-"
      : Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });

  const formatDate = value => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleDateString("pt-BR");
    } catch {
      return value;
    }
  };

  return (
    <Box className={classes.root}>
      <FaturaModal
        open={faturaModalOpen}
        onClose={() => setFaturaModalOpen(false)}
        fatura={selectedFatura}
        onSaved={() => {
          setFaturaModalOpen(false);
          setSelectedFatura(null);
          setPageNumber(1);
          fetchFaturas(1);
        }}
      />
      <PagamentoModal
        open={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedFatura(null);
          fetchFaturas(1);
        }}
        fatura={selectedFatura}
      />
      <ConfirmationModal
        title={
          deletingFatura ? `Excluir fatura #${deletingFatura.id}?` : ""
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => deletingFatura && handleDeleteFatura(deletingFatura)}
      >
        Essa ação não pode ser desfeita.
      </ConfirmationModal>

      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <Box className={classes.headerIcon}>
            <ReceiptIcon />
          </Box>
          <Box>
            <Typography className={classes.headerTitle}>Faturas</Typography>
            <Typography className={classes.headerSubtitle}>
              {totalCount}{" "}
              {totalCount === 1 ? "fatura cadastrada" : "faturas cadastradas"}
            </Typography>
          </Box>
        </Box>
        <Box className={classes.headerRight}>
          <FormControl variant="outlined" size="small" className={classes.filterSelect}>
            <InputLabel id="status-filter">Status</InputLabel>
            <Select
              labelId="status-filter"
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              label="Status"
            >
              {STATUS_FILTERS.map(option => (
                <MenuItem key={option.value || "all"} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="outlined" size="small" className={classes.filterSelect}>
            <InputLabel id="recurrence-filter">Recorrência</InputLabel>
            <Select
              labelId="recurrence-filter"
              value={recurrenceFilter}
              onChange={event => setRecurrenceFilter(event.target.value)}
              label="Recorrência"
            >
              {RECURRENCE_FILTERS.map(option => (
                <MenuItem key={option.value || "all"} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="outlined" size="small" className={classes.filterSelect}>
            <InputLabel id="active-filter">Status ativo</InputLabel>
            <Select
              labelId="active-filter"
              value={activeFilter}
              onChange={event => setActiveFilter(event.target.value)}
              label="Status ativo"
            >
              {ACTIVE_FILTERS.map(option => (
                <MenuItem key={option.value || "all"} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            placeholder="Buscar fatura..."
            variant="outlined"
            size="small"
            value={searchParam}
            onChange={event => setSearchParam(event.target.value.toLowerCase())}
            className={classes.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "#999" }} />
                </InputAdornment>
              )
            }}
          />
          <Tooltip title="Nova Fatura">
            <button
              className={classes.addButton}
              onClick={() => {
                setSelectedFatura(null);
                setFaturaModalOpen(true);
              }}
            >
              <AddIcon style={{ fontSize: 24 }} />
            </button>
          </Tooltip>
        </Box>
      </Box>

      <Box className={classes.content} onScroll={handleScroll}>
        {loading && faturas.length === 0 ? (
          <Box className={classes.loadingContainer}>
            <CircularProgress size={32} />
          </Box>
        ) : faturas.length === 0 ? (
          <Box className={classes.emptyState}>
            <ReceiptIcon />
            <Typography>Nenhuma fatura encontrada</Typography>
          </Box>
        ) : (
          <>
            {faturas.map(fatura => (
              <Box key={fatura.id} className={classes.listItem}>
                <Box className={classes.itemIcon}>
                  <ReceiptIcon />
                </Box>
                <Box className={classes.itemInfo}>
                  <Typography className={classes.itemName}>
                    Fatura #{fatura.id}{" "}
                    {fatura.descricao ? `- ${fatura.descricao}` : ""}
                  </Typography>
                  <Typography className={classes.itemClient}>
                    {fatura.client?.name ||
                      fatura.client?.companyName ||
                      fatura.client?.email ||
                      `Cliente #${fatura.clientId}`}
                  </Typography>
                  <Box className={classes.itemDetails}>
                    <span>Vencimento: {formatDate(fatura.dataVencimento)}</span>
                    <span>•</span>
                    {getStatusChip(fatura.status)}
                    {fatura.tipoRecorrencia &&
                      fatura.tipoRecorrencia !== "unica" && (
                        <>
                          <span>•</span>
                          <Chip
                            label={`Recorrência: ${fatura.tipoRecorrencia}`}
                            size="small"
                            style={{
                              backgroundColor: "#e3f2fd",
                              color: "#1976d2",
                              fontSize: "0.7rem"
                            }}
                          />
                        </>
                      )}
                    {fatura.dataPagamento && (
                      <>
                        <span>•</span>
                        <span>Pago em: {formatDate(fatura.dataPagamento)}</span>
                      </>
                    )}
                  </Box>
                  {(fatura.paymentProvider || fatura.checkoutToken || fatura.paymentLink) && (
                    <Box className={classes.paymentInfo}>
                      {fatura.paymentProvider && (
                        <Box className={classes.paymentInfoRow}>
                          <Chip
                            icon={<LinkIcon style={{ fontSize: 16 }} />}
                            label={
                              PAYMENT_PROVIDER_LABELS[fatura.paymentProvider] ||
                              fatura.paymentProvider
                            }
                            size="small"
                            style={{
                              backgroundColor: "#e0f2ff",
                              color: "#0f172a",
                              fontWeight: 600
                            }}
                          />
                          {fatura.paymentExternalId && (
                            <Typography variant="caption" color="textSecondary">
                              Ref: {fatura.paymentExternalId}
                            </Typography>
                          )}
                        </Box>
                      )}
                      {(fatura.checkoutToken || fatura.paymentLink) && (
                        <Box className={classes.paymentInfoRow} flexDirection="column" alignItems="flex-start">
                          <Typography variant="body2" color="textSecondary">
                            Link de pagamento:
                          </Typography>
                          <Box className={classes.linkActions}>
                            <Typography
                              variant="body2"
                              style={{
                                maxWidth: 260,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {getCheckoutLink(fatura)}
                            </Typography>
                            <Tooltip title="Copiar link">
                              <IconButton
                                size="small"
                                onClick={() => handleCopyLink(getCheckoutLink(fatura))}
                              >
                                <FileCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Abrir em nova aba">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenLink(getCheckoutLink(fatura))}
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
                <Box className={classes.itemValueWrapper}>
                  <Typography className={classes.itemValue}>
                    {formatCurrency(fatura.valor)}
                  </Typography>
                  <Typography className={classes.itemValueSecondary}>
                    Pago: {formatCurrency(fatura.valorPago)}
                  </Typography>
                </Box>
                <Box className={classes.itemActions}>
                  {fatura.clientId && (
                    <Tooltip title="Ver cliente">
                      <IconButton
                        size="small"
                        className={classes.actionButton}
                        onClick={() => history.push(`/clientes/${fatura.clientId}`)}
                      >
                        <LaunchIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.editButton}`}
                      onClick={() => {
                        setSelectedFatura(fatura);
                        setFaturaModalOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Pagamentos">
                    <IconButton
                      size="small"
                      className={classes.actionButton}
                      onClick={() => {
                        setSelectedFatura(fatura);
                        setPaymentModalOpen(true);
                      }}
                    >
                      <ReceiptIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.deleteButton}`}
                      onClick={() => {
                        setDeletingFatura(fatura);
                        setConfirmModalOpen(true);
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
            {loading && (
              <Box className={classes.loadingContainer}>
                <CircularProgress size={24} />
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default Faturas;