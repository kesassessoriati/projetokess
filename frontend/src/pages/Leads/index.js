import React, { useState, useEffect, useReducer, useRef, useCallback, useContext } from "react";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  makeStyles,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import PeopleAltIcon from "@material-ui/icons/PeopleAlt";
import CloudDownloadIcon from "@material-ui/icons/CloudDownload";


import api from "../../services/api";
import UniversalLeadModal from "../../components/UniversalLeadModal";
import ImportLeadsModal from "../../components/ImportLeadsModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { LEAD_STATUS } from "../../constants/leadStatus";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useSocket } from "../../context/SocketContext";

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

const normalizeLead = (lead = {}) => ({
  ...lead,
  name: typeof lead.name === "string" ? lead.name : "",
  email: typeof lead.email === "string" ? lead.email : "",
  phone: typeof lead.phone === "string" ? lead.phone : "",
  companyName: typeof lead.companyName === "string" ? lead.companyName : "",
  status: typeof lead.status === "string" && lead.status ? lead.status : "novo",
  temperature: typeof lead.temperature === "string" ? lead.temperature : "",
  product: typeof lead.product === "string" ? lead.product : "",
  document: typeof lead.document === "string" ? lead.document : "",
  score: Number.isFinite(Number(lead.score)) ? Number(lead.score) : 0
});

const reducer = (state, action) => {
  switch (action.type) {
    case "RESET":
      return [];
    case "LOAD_LEADS": {
      const incoming = (action.payload || []).map(normalizeLead);
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
  bulkActions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.action.selected,
    borderRadius: 8,
    marginBottom: theme.spacing(2),
    flexWrap: "wrap"
  },
  hideOnMobile: {
    [theme.breakpoints.down("sm")]: {
      display: "none"
    }
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
  const { user } = useContext(AuthContext);
  const { isReady, on } = useSocket();

  const [leads, dispatch] = useReducer(reducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingLead, setDeletingLead] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [exportConfirmModalOpen, setExportConfirmModalOpen] = useState(false);
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [selectedUserToAssign, setSelectedUserToAssign] = useState("");
  const [users, setUsers] = useState([]);
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState(false);
  const [pipelines, setPipelines] = useState([]);
  const [moveSelectedPipelineId, setMoveSelectedPipelineId] = useState("");
  const [moveSelectedStageId, setMoveSelectedStageId] = useState("");
  const [moveStages, setMoveStages] = useState([]);
  const sentinelRef = useRef(null);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPageNumber((prev) => prev + 1);
    }
  }, [hasMore, loading]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get("/users/");
        setUsers(data.users || []);
      } catch (err) {
        toastError(err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!isReady || !user?.companyId) return;

    const cleanup = on(`company-${user.companyId}-lead`, () => {
      setRefreshToken((prev) => prev + 1);
    });

    return cleanup;
  }, [isReady, on, user?.companyId]);


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
            ownerUserId: userFilter || undefined,
            pageNumber
          },
          signal: controller.signal
        });

        if (isMounted) {
          dispatch({ type: "LOAD_LEADS", payload: data.leads });
          setHasMore(data.hasMore);
          if (pageNumber === 1) setTotalCount(data.count ?? 0);
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
  }, [searchParam, statusFilter, userFilter, pageNumber, refreshToken]);

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

  const handleToggleSelectLead = (leadId) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    setSelectedLeads(leads.map((l) => l.id));
  };

  const handleClearSelection = () => {
    setSelectedLeads([]);
  };

  const handleDeleteSelectedLeads = async () => {
    try {
      for (const id of selectedLeads) {
        await api.delete(`/crm/leads/${id}`);
        dispatch({ type: "DELETE_LEAD", payload: id });
      }
    } catch (err) {
      toastError(err);
    }
    setConfirmBulkDeleteOpen(false);
    setSelectedLeads([]);
  };

  const handleBulkAssign = async () => {
    try {
      const assignValue = selectedUserToAssign === "" ? null : Number(selectedUserToAssign)
      for (const id of selectedLeads) {
        await api.put(`/crm/leads/${id}`, { ownerUserId: assignValue })
      }
      setBulkAssignModalOpen(false)
      setSelectedUserToAssign("")
      setSelectedLeads([])
      dispatch({ type: "RESET" })
      setPageNumber(1)
      setRefreshToken((prev) => prev + 1)
    } catch (err) {
      toastError(err)
    }
  };

  const handleOpenBulkMoveModal = async () => {
    try {
      const { data } = await api.get("/pipelines");
      setPipelines(data || []);
      setMoveSelectedPipelineId("");
      setMoveSelectedStageId("");
      setMoveStages([]);
      setBulkMoveModalOpen(true);
    } catch (err) {
      toastError(err);
    }
  };

  const handleMoveSelectPipeline = async (pipelineId) => {
    setMoveSelectedPipelineId(pipelineId);
    setMoveSelectedStageId("");
    setMoveStages([]);
    if (!pipelineId) return;
    try {
      const { data } = await api.get(`/pipelines/${pipelineId}/board`);
      setMoveStages(data.stages || []);
    } catch (err) {
      toastError(err);
    }
  };

  const handleBulkMoveToFunnel = async () => {
    if (!moveSelectedPipelineId || !moveSelectedStageId) return;
    try {
      for (const leadId of selectedLeads) {
        const lead = leads.find((l) => l.id === leadId);
        await api.post("/opportunities", {
          pipelineId: Number(moveSelectedPipelineId),
          stageId: Number(moveSelectedStageId),
          leadId,
          title: lead ? lead.name : `Lead #${leadId}`
        });
      }
      setBulkMoveModalOpen(false);
      setMoveSelectedPipelineId("");
      setMoveSelectedStageId("");
      setMoveStages([]);
      setSelectedLeads([]);
    } catch (err) {
      toastError(err);
    }
  };

  const handleExportLeads = async () => {
    try {
      const { data } = await api.get("/crm/leads/export", {
        params: {
          searchParam,
          status: statusFilter
        },
        responseType: "blob"
      })

      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `leads_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toastError(err);
    }
  };

  const getInitials = (name = "") => {
    const safeName = typeof name === "string" ? name.trim() : "";
    if (!safeName) return "L";
    const pieces = safeName.split(/\s+/).filter(Boolean);
    return pieces.slice(0, 2).map((part) => part?.[0]?.toUpperCase?.() || "").join("") || "L";
  };

  const formatStatus = (status) => STATUS_LABEL[status] || "Novo";

  const statusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.novo;

  return (
    <Box className={classes.root}>
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

      <ConfirmationModal
        open={exportConfirmModalOpen}
        onClose={() => setExportConfirmModalOpen(false)}
        title="Exportar leads"
        onConfirm={handleExportLeads}
      >
        Isso exportará todos os leads retornados pelos filtros atuais. Deseja continuar com a exportação?
      </ConfirmationModal>

      <ConfirmationModal
        open={confirmBulkDeleteOpen}
        onClose={() => setConfirmBulkDeleteOpen(false)}
        title="Excluir leads selecionados"
        onConfirm={handleDeleteSelectedLeads}
      >
        {`Você tem ${selectedLeads.length} lead(s) selecionado(s). Deseja realmente excluir todos? Esta ação não pode ser desfeita.`}
      </ConfirmationModal>

      <Dialog open={bulkAssignModalOpen} onClose={() => setBulkAssignModalOpen(false)}>
        <DialogTitle>Atribuir a Usuário</DialogTitle>
        <DialogContent dividers style={{ minWidth: 300 }}>
          <FormControl variant="outlined" fullWidth>
            <InputLabel>Selecione um usuário</InputLabel>
            <Select
              value={selectedUserToAssign}
              onChange={(e) => setSelectedUserToAssign(e.target.value)}
              label="Selecione um usuário"
            >
              <MenuItem value="">Nenhum (Remover responsável)</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkAssignModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleBulkAssign} color="primary" variant="contained">
            Atribuir
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkMoveModalOpen} onClose={() => setBulkMoveModalOpen(false)}>
        <DialogTitle>Mover para Funil</DialogTitle>
        <DialogContent dividers style={{ minWidth: 340 }}>
          <FormControl variant="outlined" fullWidth style={{ marginBottom: 16 }}>
            <InputLabel>Selecione o funil</InputLabel>
            <Select
              value={moveSelectedPipelineId}
              onChange={(e) => handleMoveSelectPipeline(e.target.value)}
              label="Selecione o funil"
            >
              <MenuItem value="">Selecione...</MenuItem>
              {pipelines.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="outlined" fullWidth disabled={!moveSelectedPipelineId}>
            <InputLabel>Selecione a etapa</InputLabel>
            <Select
              value={moveSelectedStageId}
              onChange={(e) => setMoveSelectedStageId(e.target.value)}
              label="Selecione a etapa"
            >
              <MenuItem value="">Selecione...</MenuItem>
              {moveStages.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkMoveModalOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleBulkMoveToFunnel}
            color="primary"
            variant="contained"
            disabled={!moveSelectedPipelineId || !moveSelectedStageId}
          >
            Mover
          </Button>
        </DialogActions>
      </Dialog>

      <Box className={classes.header}>
        <Box className={classes.titleContainer}>
          <PeopleAltIcon className={classes.titleIcon} />
          <Box>
            <Typography className={classes.title}>Leads</Typography>
            <Typography className={classes.subtitle}>
              Gerencie oportunidades e cadastros • {totalCount} lead(s)
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
          <TextField
            select
            size="small"
            label="Responsável"
            variant="outlined"
            value={userFilter}
            onChange={(event) => {
              setUserFilter(event.target.value);
              setPageNumber(1);
              dispatch({ type: "RESET" });
            }}
            className={classes.selectField}
          >
            <MenuItem value="">Todos</MenuItem>
            {users.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
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
            style={{ marginRight: 8 }}
            startIcon={<CloudDownloadIcon />}
            onClick={() => setExportConfirmModalOpen(true)}
          >
            Exportar Leads

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

      {/* Ações em massa */}
      {leads.length > 0 && (
        <Box className={classes.bulkActions}>
          {/* Checkbox master */}
          <Checkbox
            className={classes.hideOnMobile}
            color="primary"
            indeterminate={selectedLeads.length > 0 && selectedLeads.length < leads.length}
            checked={leads.length > 0 && selectedLeads.length === leads.length}
            onChange={() =>
              selectedLeads.length === leads.length
                ? handleClearSelection()
                : handleSelectAll()
            }
            title={selectedLeads.length === leads.length ? "Desmarcar todos" : "Selecionar todos"}
          />
          <Typography variant="body2">
            {selectedLeads.length > 0
              ? `${selectedLeads.length} selecionado(s)`
              : `${leads.length} lead(s)`}
          </Typography>
          {selectedLeads.length > 0 && selectedLeads.length < leads.length && (
            <Button size="small" onClick={handleSelectAll} style={{ textTransform: "none" }}>
              Selecionar todos os {leads.length}
            </Button>
          )}
          {hasMore && selectedLeads.length === leads.length && selectedLeads.length > 0 && (
            <Typography variant="caption" style={{ color: "#f57c00" }}>
              (apenas os carregados — role para baixo para carregar mais)
            </Typography>
          )}
          {selectedLeads.length > 0 && (
            <>
              <Button
                size="small"
                color="secondary"
                onClick={() => setConfirmBulkDeleteOpen(true)}
              >
                Excluir selecionados
              </Button>
              <Button
                size="small"
                color="primary"
                onClick={() => setBulkAssignModalOpen(true)}
              >
                Atribuir selecionados
              </Button>
              <Button
                size="small"
                color="primary"
                onClick={handleOpenBulkMoveModal}
              >
                Mover para Funil
              </Button>
              <Button size="small" onClick={handleClearSelection}>
                Limpar seleção
              </Button>
            </>
          )}
        </Box>
      )}

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
                <Checkbox
                  className={classes.hideOnMobile}
                  color="primary"
                  checked={selectedLeads.includes(lead.id)}
                  onChange={() => handleToggleSelectLead(lead.id)}
                />
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

        <div ref={sentinelRef} style={{ height: 1 }} />
      </Box>
    </Box>
  );
};

export default Leads;
