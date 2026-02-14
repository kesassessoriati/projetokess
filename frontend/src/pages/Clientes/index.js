import React, { useReducer, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  makeStyles,
  MenuItem,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import BusinessCenterIcon from "@material-ui/icons/BusinessCenter";
import ReceiptIcon from "@material-ui/icons/Receipt";
import LaunchIcon from "@material-ui/icons/Launch";

import api from "../../services/api";
import ClientModal from "../../components/ClientModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import FaturaModal from "../../components/FaturaModal";
import toastError from "../../errors/toastError";

const STATUS_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Ativo", value: "active" },
  { label: "Inativo", value: "inactive" },
  { label: "Bloqueado", value: "blocked" }
];

const STATUS_LABEL = {
  active: "Ativo",
  inactive: "Inativo",
  blocked: "Bloqueado"
};

const STATUS_COLORS = {
  active: "#059669",
  inactive: "#6b7280",
  blocked: "#dc2626"
};

const TYPE_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Pessoa Física", value: "pf" },
  { label: "Pessoa Jurídica", value: "pj" }
];

const TYPE_LABEL = {
  pf: "Pessoa Física",
  pj: "Pessoa Jurídica"
};

const reducer = (state, action) => {
  switch (action.type) {
    case "RESET":
      return [];
    case "LOAD_CLIENTS": {
      const incoming = action.payload || [];
      const clone = [...state];
      incoming.forEach((client) => {
        const index = clone.findIndex((item) => item.id === client.id);
        if (index > -1) {
          clone[index] = client;
        } else {
          clone.push(client);
        }
      });
      return clone;
    }
    case "DELETE_CLIENT":
      return state.filter((client) => client.id !== action.payload);
    default:
      return state;
  }
};

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(3),
    gap: theme.spacing(3),
    overflowY: "auto",
    overflowX: "hidden",
    ...theme.scrollbarStyles,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
      gap: theme.spacing(1)
    }
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
      alignItems: "stretch"
    }
  },
  titleContainer: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    [theme.breakpoints.down("sm")]: {
      width: "100%"
    }
  },
  titleIcon: {
    fontSize: 36,
    color: theme.palette.primary.main
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: theme.palette.text.primary
  },
  subtitle: {
    fontSize: 14,
    color: theme.palette.text.secondary
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    [theme.breakpoints.down("sm")]: {
      width: "100%"
    }
  },
  searchField: {
    minWidth: 220,
    backgroundColor: theme.palette.background.paper,
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8
    },
    [theme.breakpoints.down("sm")]: {
      flex: 1,
      minWidth: "unset"
    }
  },
  selectField: {
    minWidth: 160,
    [theme.breakpoints.down("sm")]: {
      flex: 1,
      minWidth: "unset"
    }
  },
  addButton: {
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    "&:hover": {
      backgroundColor: theme.palette.primary.dark
    }
  },
  content: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.palette.background.paper,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
    overflow: "hidden"
  },
  list: {
    display: "flex",
    flexDirection: "column"
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    padding: theme.spacing(2.5, 3),
    borderBottom: `1px solid ${theme.palette.divider}`,
    "&:last-child": {
      borderBottom: "none"
    },
    "&:hover": {
      backgroundColor: theme.palette.action.hover
    },
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
      alignItems: "flex-start"
    }
  },
  itemAvatar: {
    width: 56,
    height: 56,
    fontSize: 20,
    fontWeight: 600,
    backgroundColor: theme.palette.secondary.light,
    color: theme.palette.secondary.contrastText
  },
  itemInfo: {
    flex: 1,
    minWidth: 0
  },
  itemNameRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  itemName: {
    fontSize: 16,
    fontWeight: 600,
    color: theme.palette.text.primary
  },
  itemDetails: {
    fontSize: 13,
    color: theme.palette.text.secondary,
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5)
  },
  itemMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(2),
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: 13
  },
  statusChip: {
    textTransform: "capitalize",
    fontWeight: 600,
    color: "#fff"
  },
  actionsColumn: {
    display: "flex",
    gap: theme.spacing(1)
  },
  emptyState: {
    padding: theme.spacing(6),
    textAlign: "center",
    color: theme.palette.text.secondary
  },
  loadingBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`
  }
}));

const Clients = () => {
  const classes = useStyles();
  const history = useHistory();

  const [clients, dispatch] = useReducer(reducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [faturaModalOpen, setFaturaModalOpen] = useState(false);
  const [faturaClient, setFaturaClient] = useState(null);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
    setRefreshToken((prev) => prev + 1);
  }, [searchParam, statusFilter, typeFilter]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const controller = new AbortController();

    const fetchClients = async () => {
      console.info("[Clients] Fetching clients", {
        searchParam,
        statusFilter,
        typeFilter,
        pageNumber
      });
      try {
        const { data } = await api.get("/crm/clients", {
          params: {
            searchParam,
            status: statusFilter,
            type: typeFilter,
            pageNumber
          },
          signal: controller.signal
        });

        if (isMounted) {
          dispatch({ type: "LOAD_CLIENTS", payload: data.clients });
          setHasMore(data.hasMore);
          console.info("[Clients] Clients fetched", {
            received: data.clients?.length ?? 0,
            total: data.count,
            hasMore: data.hasMore
          });
        }
      } catch (err) {
        if (isMounted && err.name !== "CanceledError") {
          console.error("[Clients] Error fetching clients", err);
          toastError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchClients();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [searchParam, statusFilter, typeFilter, pageNumber, refreshToken]);

  const handleScroll = (event) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 160) {
      setPageNumber((prev) => prev + 1);
    }
  };

  const handleOpenModal = (clientId = null) => {
    setSelectedClientId(clientId);
    setClientModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedClientId(null);
    setClientModalOpen(false);
  };

  const handleModalSuccess = () => {
    handleCloseModal();
    dispatch({ type: "RESET" });
    setPageNumber(1);
    setRefreshToken((prev) => prev + 1);
  };

  const handleOpenFaturaModal = (client) => {
    setFaturaClient(client);
    setFaturaModalOpen(true);
  };

  const handleCloseFaturaModal = () => {
    setFaturaClient(null);
    setFaturaModalOpen(false);
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    try {
      await api.delete(`/crm/clients/${deletingClient.id}`);
      dispatch({ type: "DELETE_CLIENT", payload: deletingClient.id });
    } catch (err) {
      toastError(err);
    } finally {
      setConfirmModalOpen(false);
      setDeletingClient(null);
      setRefreshToken((prev) => prev + 1);
    }
  };

  const getInitials = (name = "") => {
    if (!name.trim()) return "C";
    const pieces = name.trim().split(" ");
    return pieces
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  };

  const formatStatus = (status) => STATUS_LABEL[status] || "Ativo";

  const statusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.active;

  const formatType = (type) => TYPE_LABEL[type] || "Pessoa Física";

  return (
    <Box className={classes.root} onScroll={handleScroll}>
      <FaturaModal
        open={faturaModalOpen}
        onClose={handleCloseFaturaModal}
        fatura={
          faturaClient
            ? {
                clientId: faturaClient.id,
                client: faturaClient,
                descricao: "",
                valor: ""
              }
            : null
        }
        onSaved={() => {
          handleCloseFaturaModal();
        }}
      />
      <ClientModal
        open={clientModalOpen}
        onClose={handleCloseModal}
        clientId={selectedClientId}
        onSuccess={handleModalSuccess}
      />

      <ConfirmationModal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Excluir cliente"
        onConfirm={handleDeleteClient}
      >
        Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
      </ConfirmationModal>

      <Box className={classes.header}>
        <Box className={classes.titleContainer}>
          <BusinessCenterIcon className={classes.titleIcon} />
          <Box>
            <Typography className={classes.title}>Clientes</Typography>
            <Typography className={classes.subtitle}>
              Gerencie a sua carteira de clientes • {clients.length} cliente(s)
            </Typography>
          </Box>
        </Box>

        <Box className={classes.actions}>
          <TextField
            size="small"
            variant="outlined"
            placeholder="Pesquisar por nome, documento ou email"
            value={searchParam}
            onChange={(event) => setSearchParam(event.target.value)}
            className={classes.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="disabled" />
                </InputAdornment>
              )
            }}
          />

          <TextField
            select
            size="small"
            label="Tipo"
            variant="outlined"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className={classes.selectField}
          >
            {TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Status"
            variant="outlined"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={classes.selectField}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            className={classes.addButton}
            onClick={() => handleOpenModal()}
          >
            Novo Cliente
          </Button>
        </Box>
      </Box>

      <Box className={classes.content}>
        {clients.length === 0 && !loading ? (
          <Box className={classes.emptyState}>
            <BusinessCenterIcon style={{ fontSize: 48, marginBottom: 12 }} color="disabled" />
            <Typography variant="h6">Nenhum cliente encontrado</Typography>
            <Typography variant="body2">
              Ajuste os filtros ou cadastre um novo cliente para começar.
            </Typography>
          </Box>
        ) : (
          <Box className={classes.list}>
            {clients.map((client) => (
              <Box key={client.id} className={classes.listItem}>
                <Avatar className={classes.itemAvatar}>{getInitials(client.name)}</Avatar>

                <Box className={classes.itemInfo}>
                  <Box className={classes.itemNameRow}>
                    <Typography className={classes.itemName}>
                      {client.name || "Cliente sem nome"}
                    </Typography>
                    <Chip
                      size="small"
                      label={formatStatus(client.status)}
                      className={classes.statusChip}
                      style={{ backgroundColor: statusColor(client.status) }}
                    />
                  </Box>
                  <Box className={classes.itemDetails}>
                    <span>ID: {client.id}</span>
                    <span>•</span>
                    <span>{client.email || "Sem email"}</span>
                    <span>•</span>
                    <span>{client.phone || "Sem telefone"}</span>
                  </Box>
                  <Box className={classes.itemMeta}>
                    <span>Tipo: {formatType(client.type)}</span>
                    <span>Documento: {client.document || "N/A"}</span>
                    <span>Cidade: {client.city || "N/A"}</span>
                    <span>Responsável: {client.ownerUserId || "N/A"}</span>
                    <span>Cliente desde: {client.clientSince || "N/A"}</span>
                  </Box>
                </Box>

                <Box className={classes.actionsColumn}>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => handleOpenModal(client.id)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Nova fatura">
                    <IconButton size="small" onClick={() => handleOpenFaturaModal(client)}>
                      <ReceiptIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Ver detalhes">
                    <IconButton
                      size="small"
                      onClick={() => history.push(`/clientes/${client.id}`)}
                    >
                      <LaunchIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDeletingClient(client);
                        setConfirmModalOpen(true);
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {loading && (
          <Box className={classes.loadingBox}>
            <CircularProgress size={20} />
            <Typography variant="body2">Carregando clientes...</Typography>
          </Box>
        )}
        {!loading && hasMore && (
          <Box className={classes.loadingBox}>
            <Button size="small" onClick={() => setPageNumber((prev) => prev + 1)}>
              Carregar mais
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Clients;
