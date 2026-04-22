import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  makeStyles,
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import CalendarTodayIcon from "@material-ui/icons/CalendarToday";
import DeleteIcon from "@material-ui/icons/Delete";
import DescriptionIcon from "@material-ui/icons/Description";
import EditIcon from "@material-ui/icons/Edit";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import LaunchIcon from "@material-ui/icons/Launch";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import PublicIcon from "@material-ui/icons/Public";
import SearchIcon from "@material-ui/icons/Search";
import { toast } from "react-toastify";

import NewPropostaModal from "../../components/NewPropostaModal";
import api from "../../services/api";
import { PROPOSAL_STATUS, getPublicProposalUrl, proposalStatusTone } from "../../utils/proposalBuilder";

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "calc(100vh - 80px)",
    margin: theme.spacing(-2),
    padding: theme.spacing(4),
    color: "#f8fafc",
    background: "linear-gradient(135deg, #07070d 0%, #0b1020 52%, #111827 100%)",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2),
    },
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    paddingBottom: 26,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexWrap: "wrap",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    color: "#fff",
  },
  title: {
    color: "#f8fafc",
    fontWeight: 850,
    lineHeight: 1.05,
  },
  subtitle: {
    color: "#7f86a3",
    fontSize: 12,
    marginTop: 3,
  },
  stats: {
    display: "flex",
    gap: 26,
  },
  stat: {
    textAlign: "center",
    minWidth: 62,
  },
  statValue: {
    color: "#7c9cff",
    fontSize: 22,
    fontWeight: 850,
  },
  statLabel: {
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 9,
    fontWeight: 800,
  },
  toolbar: {
    marginTop: 34,
    marginBottom: 22,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  toolbarActions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  search: {
    width: 270,
    "& .MuiOutlinedInput-root": {
      color: "#dbe3f2",
      borderRadius: 14,
      background: "rgba(255,255,255,0.035)",
      "& fieldset": {
        borderColor: "rgba(255,255,255,0.12)",
      },
      "&:hover fieldset": {
        borderColor: "rgba(255,255,255,0.22)",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#6366f1",
      },
    },
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 20,
  },
  newCard: {
    minHeight: 140,
    borderRadius: 10,
    border: "1px dashed rgba(148,163,184,0.28)",
    background: "rgba(255,255,255,0.015)",
    color: "#7f86a3",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    cursor: "pointer",
    transition: "160ms ease",
    "&:hover": {
      borderColor: "#6366f1",
      color: "#dbe3f2",
      background: "rgba(99,102,241,0.08)",
      transform: "translateY(-2px)",
    },
  },
  card: {
    minHeight: 140,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(18, 18, 26, 0.86)",
    padding: 20,
    cursor: "pointer",
    transition: "160ms ease",
    display: "flex",
    flexDirection: "column",
    "&:hover": {
      borderColor: "rgba(99,102,241,0.45)",
      transform: "translateY(-2px)",
      background: "rgba(26, 26, 38, 0.92)",
    },
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  cardTitle: {
    color: "#f8fafc",
    fontWeight: 850,
    fontSize: 15,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cardClient: {
    color: "#8087a3",
    fontSize: 12,
    marginTop: 8,
  },
  meta: {
    display: "flex",
    gap: 15,
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 18,
    paddingBottom: 15,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  metaItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
  },
  menuButton: {
    color: "#9ca3af",
    padding: 4,
  },
  statusChip: {
    height: 22,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  primaryButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 800,
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "#fff",
    "&:hover": {
      background: "linear-gradient(135deg, #818cf8, #6366f1)",
    },
  },
  ghostButton: {
    color: "#cbd5e1",
    borderColor: "rgba(255,255,255,0.13)",
    textTransform: "none",
    borderRadius: 10,
    fontWeight: 750,
  },
  dangerButton: {
    marginLeft: "auto",
    color: "#ef4444",
    borderColor: "rgba(239,68,68,0.35)",
    minWidth: 36,
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    padding: 48,
    color: "#fff",
  },
}));

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
};

const getPhasesCount = (proposal) => {
  const phases = proposal?.data?.phases;
  return Array.isArray(phases) ? phases.length : 0;
};

const PropostasPage = () => {
  const classes = useStyles();
  const history = useHistory();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParam, setSearchParam] = useState("");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuProposal, setMenuProposal] = useState(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchParam) params.searchParam = searchParam;
      const { data } = await api.get("/proposals", { params });
      setProposals(data.proposals || []);
    } catch (err) {
      toast.error("Erro ao carregar propostas");
    } finally {
      setLoading(false);
    }
  }, [searchParam]);

  useEffect(() => {
    const timer = setTimeout(fetchProposals, 300);
    return () => clearTimeout(timer);
  }, [fetchProposals]);

  const stats = useMemo(() => ({
    total: proposals.length,
    published: proposals.filter((proposal) => proposal.status === "enviada").length,
  }), [proposals]);

  const openMenu = (event, proposal) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuProposal(proposal);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuProposal(null);
  };

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

  const handlePublish = async (proposal) => {
    try {
      await api.put(`/proposals/${proposal.id}`, { status: "enviada" });
      toast.success("Proposta publicada");
      fetchProposals();
    } catch {
      toast.error("Erro ao publicar proposta");
    }
  };

  const handleOpenPublic = (proposal) => {
    if (proposal.status !== "enviada") {
      toast.info("Publique a proposta para liberar o link do cliente");
      return;
    }
    window.open(getPublicProposalUrl(proposal.slug), "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async (proposal) => {
    if (proposal.status !== "enviada") {
      toast.info("Publique a proposta para copiar o link");
      return;
    }
    try {
      await navigator.clipboard.writeText(getPublicProposalUrl(proposal.slug));
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <div className={classes.root}>
      <header className={classes.header}>
        <div className={classes.brand}>
          <div className={classes.brandIcon}>
            <DescriptionIcon />
          </div>
          <div>
            <Typography variant="h5" className={classes.title}>Proposal Builder</Typography>
            <div className={classes.subtitle}>Crie propostas profissionais em minutos</div>
          </div>
        </div>
        <div className={classes.stats}>
          <div className={classes.stat}>
            <div className={classes.statValue}>{stats.total}</div>
            <div className={classes.statLabel}>Total</div>
          </div>
          <div className={classes.stat}>
            <div className={classes.statValue}>{stats.published}</div>
            <div className={classes.statLabel}>Publicadas</div>
          </div>
        </div>
      </header>

      <div className={classes.toolbar}>
        <Typography variant="h6" style={{ color: "#fff", fontWeight: 850 }}>Suas Propostas</Typography>
        <div className={classes.toolbarActions}>
          <TextField
            className={classes.search}
            variant="outlined"
            size="small"
            placeholder="Buscar proposta..."
            value={searchParam}
            onChange={(event) => setSearchParam(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "#6b7280", fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            className={classes.primaryButton}
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewModalOpen(true)}
          >
            Nova Proposta
          </Button>
        </div>
      </div>

      {loading ? (
        <div className={classes.loading}>
          <CircularProgress size={26} />
        </div>
      ) : (
        <div className={classes.grid}>
          <button type="button" className={classes.newCard} onClick={() => setNewModalOpen(true)}>
            <AddIcon style={{ fontSize: 38 }} />
            <strong>Nova Proposta</strong>
          </button>

          {proposals.map((proposal) => {
            const statusColor = proposalStatusTone[proposal.status] || "#8b8ba7";
            return (
              <article
                key={proposal.id}
                className={classes.card}
                onClick={() => history.push(`/propostas/${proposal.id}/editar`)}
              >
                <div className={classes.cardTop}>
                  <div style={{ minWidth: 0 }}>
                    <div className={classes.cardTitle}>{proposal.title}</div>
                    <div className={classes.cardClient}>{proposal.clientName || proposal.data?.cliente}</div>
                  </div>
                  <Chip
                    className={classes.statusChip}
                    label={PROPOSAL_STATUS[proposal.status] || proposal.status}
                    style={{
                      color: statusColor,
                      background: `${statusColor}1f`,
                      border: `1px solid ${statusColor}44`,
                    }}
                  />
                  <IconButton className={classes.menuButton} onClick={(event) => openMenu(event, proposal)}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </div>

                <div className={classes.meta}>
                  <span className={classes.metaItem}>
                    <DescriptionIcon style={{ fontSize: 14 }} />
                    {getPhasesCount(proposal)} fases
                  </span>
                  <span className={classes.metaItem}>
                    <CalendarTodayIcon style={{ fontSize: 13 }} />
                    {formatDate(proposal.updatedAt || proposal.createdAt)}
                  </span>
                </div>

                <div className={classes.actions} onClick={(event) => event.stopPropagation()}>
                  <Button
                    size="small"
                    variant="outlined"
                    className={classes.ghostButton}
                    startIcon={<LaunchIcon />}
                    onClick={() => handleOpenPublic(proposal)}
                  >
                    Ver
                  </Button>
                  <Tooltip title="Copiar link público">
                    <Button
                      size="small"
                      variant="outlined"
                      className={classes.ghostButton}
                      startIcon={<FileCopyIcon />}
                      onClick={() => handleCopyLink(proposal)}
                    >
                      Link
                    </Button>
                  </Tooltip>
                  {proposal.status !== "enviada" && (
                    <Tooltip title="Publicar e liberar link para o cliente">
                      <Button
                        size="small"
                        variant="outlined"
                        className={classes.ghostButton}
                        startIcon={<PublicIcon />}
                        onClick={() => handlePublish(proposal)}
                      >
                        Publicar
                      </Button>
                    </Tooltip>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    className={`${classes.ghostButton} ${classes.dangerButton}`}
                    onClick={() => setDeleteConfirmId(proposal.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

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
            handlePublish(menuProposal);
            closeMenu();
          }}
          disabled={menuProposal?.status === "enviada"}
        >
          <PublicIcon fontSize="small" style={{ marginRight: 8 }} />
          Publicar
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleCopyLink(menuProposal);
            closeMenu();
          }}
        >
          <FileCopyIcon fontSize="small" style={{ marginRight: 8 }} />
          Copiar link
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteConfirmId(menuProposal?.id);
            closeMenu();
          }}
          style={{ color: "#ef4444" }}
        >
          <DeleteIcon fontSize="small" style={{ marginRight: 8 }} />
          Remover
        </MenuItem>
      </Menu>

      <Dialog open={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Confirmar remoção</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja remover esta proposta? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
          <Button onClick={handleDelete} color="secondary">Remover</Button>
        </DialogActions>
      </Dialog>

      <NewPropostaModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
};

export default PropostasPage;
