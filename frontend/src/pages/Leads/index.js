import React, { useState, useEffect, useReducer } from "react";
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
import PeopleAltIcon from "@material-ui/icons/PeopleAlt";

import api from "../../services/api";
import UniversalLeadModal from "../../components/UniversalLeadModal";
import ImportLeadsModal from "../../components/ImportLeadsModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { LEAD_STATUS } from "../../constants/leadStatus";

const STATUS_OPTIONS = [{ label: "Todos", value: "" }, ...LEAD_STATUS];

const STATUS_LABEL = LEAD_STATUS.reduce((acc, status) => {
  acc[status.value] = status.label;
  return acc;
}, {});

const STATUS_COLORS = {
  novo: "#3b82f6",
  contactado: "#6366f1",
  qualificado: "#059669",
  reuniao_agendada: "#8b5cf6",
  nao_qualificado: "#f97316",
  convertido: "#0f766e",
  perdido: "#dc2626"
};

const reducer = (state, action) => {
  switch (action.type) {
    case "RESET":
      return [];
    case "LOAD_LEADS": {
      const incoming = action.payload;
      const clone = [...state];
      incoming.forEach((lead) => {
        const index = clone.findIndex((item) => item.id === lead.id);
        if (index > -1) {
          clone[index] = lead;
        } else {
          clone.push(lead);
        }
      });
      return clone;
    }
    case "DELETE_LEAD":
      return state.filter((lead) => lead.id !== action.payload);
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
    minWidth: 200,
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
  listHeader: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(2, 3),
    borderBottom: `1px solid ${theme.palette.divider}`
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
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText
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
    gap: theme.spacing(1)
  },
  itemMeta: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    marginTop: theme.spacing(1),
    flexWrap: "wrap",
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

const Leads = () => {
  const classes = useStyles();

  const [leads, dispatch] = useReducer(reducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingLead, setDeletingLead] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Removido useEffect que causava double-fetch e loops no mount

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const controller = new AbortController();

    const fetchLeads = async () => {
      console.info("[Leads] Fetching leads", {
        searchParam,
        statusFilter,
        pageNumber
      });
      try {
        const { data } = await api.get("/crm/leads", {
          params: {
            searchParam,
            status: statusFilter,
            pageNumber
          },
          signal: controller.signal
        });

        if (isMounted) {
          dispatch({ type: "LOAD_LEADS", payload: data.leads });
          setHasMore(data.hasMore);
          console.info("[Leads] Leads fetched", {
            received: data.leads?.length ?? 0,
            total: data.count,
            hasMore: data.hasMore
          });
        }
      } catch (err) {
        if (isMounted && err.name !== "CanceledError") {
          console.error("[Leads] Error fetching leads", err);
          toastError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLeads();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [searchParam, statusFilter, pageNumber, refreshToken]);

  const handleScroll = (event) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 160) {
      setPageNumber((prev) => prev + 1);
    }
  };

  const handleOpenModal = (leadId = null) => {
    setSelectedLeadId(leadId);
    setLeadModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedLeadId(null);
    setLeadModalOpen(false);
  };

  const handleModalSuccess = () => {
    handleCloseModal();
    dispatch({ type: "RESET" });
    setPageNumber(1);
    // Para recarregar os dados imediatamente
    if (pageNumber === 1 && searchParam === "" && statusFilter === "") {
      setRefreshToken((prev) => prev + 1);
    } else {
      setSearchParam("");
      setStatusFilter("");
    }
  };

  const handleDeleteLead = async () => {
    if (!deletingLead) return;

    try {
      await api.delete(`/crm/leads/${deletingLead.id}`);
      dispatch({ type: "DELETE_LEAD", payload: deletingLead.id });
    } catch (err) {
      toastError(err);
    } finally {
      setConfirmModalOpen(false);
      setDeletingLead(null);
      setRefreshToken((prev) => prev + 1);
    }
  };

  const getInitials = (name = "") => {
    if (!name.trim()) return "L";
    const pieces = name.trim().split(" ");
    return pieces.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
  };

  const formatStatus = (status) => STATUS_LABEL[status] || "Novo";

  const statusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.novo;

  return (
    <Box className={classes.root} onScroll={handleScroll}>
      <UniversalLeadModal
        open={leadModalOpen}
        onClose={handleCloseModal}
        leadId={selectedLeadId}
        onSuccess={handleModalSuccess}
      />

      <ImportLeadsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <ConfirmationModal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Excluir lead"
        onConfirm={handleDeleteLead}
      >
        Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
      </ConfirmationModal>

      <Box className={classes.header}>
        <Box className={classes.titleContainer}>
          <PeopleAltIcon className={classes.titleIcon} />
          <Box>
            <Typography className={classes.title}>Leads</Typography>
            <Typography className={classes.subtitle}>
              Gerencie oportunidades e cadastros • {leads.length} lead(s)
            </Typography>
          </Box>
        </Box>

        <Box className={classes.actions}>
          <TextField
            size="small"
            variant="outlined"
            placeholder="Pesquisar por nome, e-mail ou telefone"
            value={searchParam}
            onChange={(event) => {
              setSearchParam(event.target.value);
              setPageNumber(1);
              dispatch({ type: "RESET" });
            }}
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
            label="Status"
            variant="outlined"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPageNumber(1);
              dispatch({ type: "RESET" });
            }}
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
            style={{ backgroundColor: "#10b981", color: "#fff", marginRight: 8 }}
            startIcon={<AddIcon />}
            onClick={() => setImportModalOpen(true)}
          >
            Importar Leads
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            className={classes.addButton}
            onClick={() => handleOpenModal()}
          >
            Novo Lead
          </Button>
        </Box>
      </Box>

      <Box className={classes.content}>
        {leads.length === 0 && !loading ? (
          <Box className={classes.emptyState}>
            <PeopleAltIcon style={{ fontSize: 48, marginBottom: 12 }} color="disabled" />
            <Typography variant="h6">Nenhum lead encontrado</Typography>
            <Typography variant="body2">
              Ajuste os filtros ou cadastre um novo lead para começar.
            </Typography>
          </Box>
        ) : (
          <Box className={classes.list}>
            {leads.map((lead) => (
              <Box key={lead.id} className={classes.listItem}>
                <Avatar className={classes.itemAvatar}>{getInitials(lead.name)}</Avatar>

                <Box className={classes.itemInfo}>
                  <Box className={classes.itemNameRow}>
                    <Typography className={classes.itemName}>
                      {lead.name || "Lead sem nome"}
                    </Typography>
                    <Chip
                      size="small"
                      label={formatStatus(lead.status)}
                      className={classes.statusChip}
                      style={{ backgroundColor: statusColor(lead.status) }}
                    />
                  </Box>
                  <Box className={classes.itemDetails}>
                    <span>ID: {lead.id}</span>
                    <span>•</span>
                    <span>{lead.email || "Sem email"}</span>
                    <span>•</span>
                    <span>{lead.phone || "Sem telefone"}</span>
                  </Box>
                  <Box className={classes.itemMeta}>
                    <span>Empresa: {lead.companyName || "N/A"}</span>
                    <span>Responsável: {lead.ownerUserId || "N/A"}</span>
                    <span>Temperatura: {lead.temperature || "N/A"}</span>
                    <span>Score: {lead.score ?? 0}</span>
                  </Box>
                </Box>

                <Box className={classes.actionsColumn}>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => handleOpenModal(lead.id)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDeletingLead(lead);
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
            <Typography variant="body2">Carregando leads...</Typography>
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

export default Leads;