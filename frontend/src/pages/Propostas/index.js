import React, { useState, useEffect, useCallback, useContext } from "react";
import { useHistory } from "react-router-dom";
import {
  makeStyles,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import SendIcon from "@material-ui/icons/Send";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import DescriptionIcon from "@material-ui/icons/Description";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import CancelIcon from "@material-ui/icons/Cancel";
import VisibilityIcon from "@material-ui/icons/Visibility";

import { toast } from "react-toastify";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import NewPropostaModal from "../../components/NewPropostaModal";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 1200,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(3),
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  searchBar: {
    display: "flex",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
    flexWrap: "wrap",
  },
  searchField: {
    flex: 1,
    minWidth: 200,
  },
  filterSelect: {
    minWidth: 160,
  },
  grid: {
    marginTop: theme.spacing(1),
  },
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: 12,
    transition: "box-shadow 0.2s",
    "&:hover": {
      boxShadow: theme.shadows[6],
    },
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(0.5),
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardClient: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing(1),
  },
  cardActions: {
    justifyContent: "flex-end",
    paddingTop: 0,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(8),
    color: theme.palette.text.secondary,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing(2),
    opacity: 0.3,
  },
  statusChip: {
    fontSize: "0.7rem",
    height: 22,
  },
  loadingWrapper: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(4),
  },
}));

const STATUS_LABELS = {
  rascunho: { label: "Rascunho", color: "default" },
  enviada: { label: "Enviada", color: "primary" },
  aceita: { label: "Aceita", color: "default" },
  recusada: { label: "Recusada", color: "default" },
};

const STATUS_COLORS = {
  rascunho: "#9e9e9e",
  enviada: "#1976d2",
  aceita: "#2e7d32",
  recusada: "#c62828",
};

const PropostasPage = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuProposal, setMenuProposal] = useState(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchParam) params.searchParam = searchParam;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get("/proposals", { params });
      setProposals(data.proposals || []);
    } catch (err) {
      toast.error("Erro ao carregar propostas");
    } finally {
      setLoading(false);
    }
  }, [searchParam, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchProposals, 400);
    return () => clearTimeout(timer);
  }, [fetchProposals]);

  const handleCreate = (proposal) => {
    setNewModalOpen(false);
    history.push(`/propostas/${proposal.id}/editar`);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/proposals/${deleteConfirmId}`);
      toast.success("Proposta removida");
      setDeleteConfirmId(null);
      fetchProposals();
    } catch {
      toast.error("Erro ao remover proposta");
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const { data } = await api.post(`/proposals/${id}/duplicate`);
      toast.success("Proposta duplicada");
      history.push(`/propostas/${data.id}/editar`);
    } catch {
      toast.error("Erro ao duplicar proposta");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/proposals/${id}`, { status: newStatus });
      toast.success("Status atualizado");
      fetchProposals();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const openMenu = (e, proposal) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuProposal(proposal);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuProposal(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <div className={classes.title}>
          <DescriptionIcon color="primary" style={{ fontSize: 32 }} />
          <div>
            <Typography variant="h5" style={{ fontWeight: 700 }}>
              Propostas
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Crie e gerencie propostas profissionais para seus clientes
            </Typography>
          </div>
        </div>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setNewModalOpen(true)}
        >
          Nova Proposta
        </Button>
      </div>

      <div className={classes.searchBar}>
        <TextField
          className={classes.searchField}
          variant="outlined"
          size="small"
          placeholder="Buscar por título ou cliente..."
          value={searchParam}
          onChange={(e) => setSearchParam(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl variant="outlined" size="small" className={classes.filterSelect}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="rascunho">Rascunho</MenuItem>
            <MenuItem value="enviada">Enviada</MenuItem>
            <MenuItem value="aceita">Aceita</MenuItem>
            <MenuItem value="recusada">Recusada</MenuItem>
          </Select>
        </FormControl>
      </div>

      {loading ? (
        <div className={classes.loadingWrapper}>
          <CircularProgress />
        </div>
      ) : proposals.length === 0 ? (
        <div className={classes.emptyState}>
          <DescriptionIcon className={classes.emptyIcon} />
          <Typography variant="h6">Nenhuma proposta encontrada</Typography>
          <Typography variant="body2" style={{ marginTop: 8 }}>
            Clique em "Nova Proposta" para criar a primeira
          </Typography>
        </div>
      ) : (
        <Grid container spacing={3} className={classes.grid}>
          {proposals.map((proposal) => (
            <Grid item xs={12} sm={6} md={4} key={proposal.id}>
              <Card className={classes.card}>
                <CardContent className={classes.cardContent}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Typography variant="subtitle1" className={classes.cardTitle} style={{ maxWidth: "80%" }}>
                      {proposal.title}
                    </Typography>
                    <IconButton size="small" onClick={(e) => openMenu(e, proposal)}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </div>
                  <Typography variant="body2" className={classes.cardClient}>
                    {proposal.clientName}
                  </Typography>
                  <div className={classes.cardMeta}>
                    <Chip
                      label={STATUS_LABELS[proposal.status]?.label || proposal.status}
                      className={classes.statusChip}
                      style={{
                        backgroundColor: STATUS_COLORS[proposal.status] + "22",
                        color: STATUS_COLORS[proposal.status],
                        border: `1px solid ${STATUS_COLORS[proposal.status]}44`,
                      }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {formatDate(proposal.updatedAt)}
                    </Typography>
                  </div>
                  {proposal.validUntil && (
                    <Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 4 }}>
                      Válida até: {formatDate(proposal.validUntil)}
                    </Typography>
                  )}
                </CardContent>
                <CardActions className={classes.cardActions}>
                  <Tooltip title="Editar proposta">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => history.push(`/propostas/${proposal.id}/editar`)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Duplicar">
                    <IconButton
                      size="small"
                      onClick={() => handleDuplicate(proposal.id)}
                    >
                      <FileCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remover">
                    <IconButton
                      size="small"
                      color="secondary"
                      onClick={() => setDeleteConfirmId(proposal.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            history.push(`/propostas/${menuProposal?.id}/editar`);
            closeMenu();
          }}
        >
          <EditIcon fontSize="small" style={{ marginRight: 8 }} />
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDuplicate(menuProposal?.id);
            closeMenu();
          }}
        >
          <FileCopyIcon fontSize="small" style={{ marginRight: 8 }} />
          Duplicar
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleStatusChange(menuProposal?.id, "enviada");
            closeMenu();
          }}
          disabled={menuProposal?.status === "enviada"}
        >
          <SendIcon fontSize="small" style={{ marginRight: 8 }} />
          Marcar como Enviada
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleStatusChange(menuProposal?.id, "aceita");
            closeMenu();
          }}
          disabled={menuProposal?.status === "aceita"}
        >
          <CheckCircleIcon fontSize="small" style={{ marginRight: 8, color: "#2e7d32" }} />
          Marcar como Aceita
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleStatusChange(menuProposal?.id, "recusada");
            closeMenu();
          }}
          disabled={menuProposal?.status === "recusada"}
        >
          <CancelIcon fontSize="small" style={{ marginRight: 8, color: "#c62828" }} />
          Marcar como Recusada
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteConfirmId(menuProposal?.id);
            closeMenu();
          }}
          style={{ color: "#c62828" }}
        >
          <DeleteIcon fontSize="small" style={{ marginRight: 8 }} />
          Remover
        </MenuItem>
      </Menu>

      {/* Delete confirm dialog */}
      <Dialog open={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Confirmar remoção</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja remover esta proposta? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
          <Button onClick={handleDelete} color="secondary">
            Remover
          </Button>
        </DialogActions>
      </Dialog>

      {/* New proposal modal */}
      <NewPropostaModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
};

export default PropostasPage;
