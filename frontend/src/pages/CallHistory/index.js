import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  makeStyles,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@material-ui/core";
import {
  AccessTime as AccessTimeIcon,
  CallMade as CallMadeIcon,
  CallReceived as CallReceivedIcon,
  CallEnd as CallEndIcon,
  Delete as DeleteIcon,
  EmojiEvents as EmojiEventsIcon,
  Phone as PhoneIcon,
  PhoneCallback as PhoneCallbackIcon,
  PhoneDisabled as PhoneDisabledIcon,
  PhoneMissed as PhoneMissedIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from "@material-ui/icons";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Title from "../../components/Title";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useWebphone } from "../../context/WebphoneContext";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2.5),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  metricCard: {
    borderRadius: 18,
    border: "1px solid #d9e6dd",
    boxShadow: "0 16px 28px rgba(15, 23, 42, 0.05)",
  },
  metricLabel: {
    fontSize: "0.74rem",
    color: "#64748b",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".04em",
  },
  metricValue: {
    fontSize: "1.8rem",
    fontWeight: 900,
    marginTop: 6,
    lineHeight: 1.1,
  },
  filterPanel: {
    padding: theme.spacing(2),
    borderRadius: 18,
    border: "1px solid #dbe7df",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
  },
  tablePaper: {
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid #dbe7df",
    boxShadow: "0 18px 30px rgba(15, 23, 42, 0.05)",
  },
  tableHead: {
    backgroundColor: "#f8fafc",
  },
  tableHeadCell: {
    fontWeight: 800,
    fontSize: "0.72rem",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: ".05em",
  },
  rowContact: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  contactName: {
    fontWeight: 800,
    color: "#0f172a",
    fontSize: "0.86rem",
  },
  contactMeta: {
    fontSize: "0.72rem",
    color: "#64748b",
    marginTop: 2,
  },
  statusChip: {
    fontWeight: 800,
    height: 26,
  },
  emptyState: {
    padding: theme.spacing(6),
    textAlign: "center",
    color: "#94a3b8",
  },
  toolbarRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    flexWrap: "wrap",
  },
  quickSummary: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  quickPill: {
    borderRadius: 999,
    padding: "6px 10px",
    fontWeight: 800,
    fontSize: "0.74rem",
  },

  // ─── Ranking panel ───────────────────────────────────────────────────────────
  rankingPanel: {
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid #dbe7df",
    boxShadow: "0 18px 30px rgba(15, 23, 42, 0.05)",
    background: "#fff",
  },
  rankingHeader: {
    padding: theme.spacing(2, 2.5),
    background: "linear-gradient(135deg, #0f2544 0%, #1e3f6f 60%, #1d4ed8 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
  },
  rankingTop3Grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: theme.spacing(1.5),
    padding: theme.spacing(2.5),
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  rankingCard: {
    borderRadius: 16,
    padding: theme.spacing(2.5, 2),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(0.75),
    textAlign: "center",
    border: "1px solid transparent",
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow: "0 12px 28px rgba(15, 23, 42, 0.1)",
    },
  },
  rankingCardGold: {
    background: "linear-gradient(145deg, #fffbeb 0%, #fde68a 100%)",
    borderColor: "#f59e0b",
    boxShadow: "0 6px 18px rgba(245,158,11,0.18)",
  },
  rankingCardSilver: {
    background: "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)",
    borderColor: "#94a3b8",
    boxShadow: "0 6px 18px rgba(100,116,139,0.12)",
  },
  rankingCardBronze: {
    background: "linear-gradient(145deg, #fff8f0 0%, #fed7aa 100%)",
    borderColor: "#f97316",
    boxShadow: "0 6px 18px rgba(249,115,22,0.16)",
  },
  rankingCardEmoji: {
    fontSize: "2rem",
    lineHeight: 1,
  },
  rankingCardName: {
    fontWeight: 900,
    color: "#0f172a",
    fontSize: "0.9rem",
    lineHeight: 1.3,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rankingCardCalls: {
    fontWeight: 800,
    fontSize: "1.4rem",
    lineHeight: 1.1,
  },
  rankingCardCallsLabel: {
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".04em",
    opacity: 0.65,
  },
  rankingList: {
    borderTop: "1px solid #f1f5f9",
  },
  rankingListItem: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1.25, 2.5),
    borderBottom: "1px solid #f8fafc",
    gap: theme.spacing(1.5),
    "&:last-child": {
      borderBottom: "none",
    },
  },
  rankingListRank: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    backgroundColor: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: "0.78rem",
    color: "#475569",
    flexShrink: 0,
  },
  rankingListName: {
    flex: 1,
    fontWeight: 700,
    fontSize: "0.86rem",
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rankingProgressWrap: {
    flex: 1,
    maxWidth: 140,
    height: 6,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  rankingProgressBar: {
    height: "100%",
    borderRadius: 4,
    background: "linear-gradient(90deg, #2563eb, #60a5fa)",
    transition: "width 0.6s ease",
  },
  rankingListCalls: {
    fontWeight: 900,
    fontSize: "0.84rem",
    color: "#2563eb",
    minWidth: 64,
    textAlign: "right",
    flexShrink: 0,
  },
}));

const statusConfig = {
  answered: { label: "Atendida", color: "#16a34a", bgColor: "#dcfce7", icon: PhoneCallbackIcon },
  missed: { label: "Não atendeu", color: "#dc2626", bgColor: "#fee2e2", icon: PhoneMissedIcon },
  busy: { label: "Ocupado", color: "#d97706", bgColor: "#fef3c7", icon: PhoneDisabledIcon },
  rejected: { label: "Rejeitada", color: "#dc2626", bgColor: "#fee2e2", icon: PhoneDisabledIcon },
  failed: { label: "Falhou", color: "#64748b", bgColor: "#e2e8f0", icon: PhoneDisabledIcon },
  ringing: { label: "Chamando", color: "#2563eb", bgColor: "#dbeafe", icon: PhoneIcon },
};

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = ["#f59e0b", "#94a3b8", "#f97316"];
const CARD_STYLE_KEYS = ["rankingCardGold", "rankingCardSilver", "rankingCardBronze"];

const formatDuration = (seconds) => {
  const total = Number(seconds || 0);
  if (!total) return "0s";
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return mins ? `${mins}m ${secs}s` : `${secs}s`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    const date = typeof value === "string" ? parseISO(value) : new Date(value);
    return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch (_error) {
    return "-";
  }
};

const CallHistory = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { isConnected, on } = useSocket();
  const { hydrateLeadContext, setActiveTab, setPanelOpen } = useWebphone();

  const isAdmin = user?.profile === "admin" || user?.profile === "super";
  const isSuper = user?.profile === "super";

  const [records, setRecords] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    answered: 0,
    missed: 0,
    busy: 0,
    failed: 0,
    rejected: 0,
    totalDuration: 0,
    averageDuration: 0,
    userBreakdown: [],
  });
  const [users, setUsers] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    dateStart: "",
    dateEnd: "",
    userId: "",
    pipelineId: "",
    stageId: "",
    source: "",
  });

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, contactName }
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    api.get("/users/list")
      .then(({ data }) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, [isAdmin]);

  useEffect(() => {
    api.get("/pipelines")
      .then(({ data }) => setPipelines(Array.isArray(data) ? data : []))
      .catch(() => setPipelines([]));
  }, []);

  useEffect(() => {
    if (!filters.pipelineId) {
      setStages([]);
      return;
    }
    const pipeline = pipelines.find((item) => Number(item.id) === Number(filters.pipelineId));
    const nextStages = [...(pipeline?.stages || [])].sort((l, r) => Number(l.order || 0) - Number(r.order || 0));
    setStages(nextStages);
  }, [filters.pipelineId, pipelines]);

  const requestParams = useMemo(() => {
    const params = { pageNumber: page + 1 };
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    return params;
  }, [filters, page]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/call-records", { params: requestParams });
      setRecords(data.records || []);
      setCount(Number(data.count || 0));
    } catch (error) {
      console.error("[CallHistory] Failed to load records", error);
    } finally {
      setLoading(false);
    }
  }, [requestParams]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const summaryParams = { ...requestParams };
      delete summaryParams.pageNumber;
      const { data } = await api.get("/call-records/summary", { params: summaryParams });
      setSummary({ ...data, userBreakdown: data.userBreakdown || [] });
    } catch (error) {
      console.error("[CallHistory] Failed to load summary", error);
    } finally {
      setSummaryLoading(false);
    }
  }, [requestParams]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    if (!isConnected || !user?.companyId) return;
    const cleanup = on(`company-${user.companyId}-call`, (payload) => {
      if (payload?.action === "deleted") {
        setRecords((prev) => prev.filter((r) => r.id !== payload.recordId));
        setCount((prev) => Math.max(0, prev - 1));
        fetchSummary();
      } else {
        fetchRecords();
        fetchSummary();
      }
    });
    return () => cleanup();
  }, [fetchRecords, fetchSummary, isConnected, on, user?.companyId]);

  const handleFilterChange = (field) => (event) => {
    setPage(0);
    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value,
      ...(field === "pipelineId" ? { stageId: "" } : {}),
    }));
  };

  const openCallAgain = (record) => {
    const phone = record.toNumber || record.lead?.phone || record.contact?.number || record.fromNumber;
    if (!phone) return;
    hydrateLeadContext(
      {
        id: record.lead?.id || record.leadId || null,
        name: record.lead?.name || record.contact?.name || phone,
        phone,
        companyName: record.lead?.companyName || "",
        pipelineId: record.pipelineId || null,
        stageId: record.stageId || null,
        opportunityId: record.opportunity?.id || record.opportunityId || null,
        contactId: record.contact?.id || record.contactId || null,
      },
      {
        contactId: record.contact?.id || record.contactId || null,
        leadId: record.lead?.id || record.leadId || null,
        opportunityId: record.opportunity?.id || record.opportunityId || null,
        pipelineId: record.pipelineId || null,
        stageId: record.stageId || null,
      },
      { tab: "dialer" }
    );
    setActiveTab("dialer");
    setPanelOpen(true);
  };

  const handleDeleteRecord = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/call-records/${deleteTarget.id}`);
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setCount((prev) => Math.max(0, prev - 1));
      fetchSummary();
      setDeleteTarget(null);
    } catch (err) {
      console.error("[CallHistory] Failed to delete record", err);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Ranking data ─────────────────────────────────────────────────────────────
  const userBreakdown = Array.isArray(summary?.userBreakdown) ? summary.userBreakdown : [];
  const top3 = userBreakdown.slice(0, 3);
  const restUsers = userBreakdown.slice(3);
  const maxCalls = Number(top3[0]?.totalCalls || 1);

  const metricCards = [
    { label: "Total", value: summary.total || 0, color: "#2563eb" },
    { label: "Atendidas", value: summary.answered || 0, color: "#16a34a" },
    { label: "Não atendeu", value: summary.missed || 0, color: "#dc2626" },
    { label: "Ocupado", value: summary.busy || 0, color: "#d97706" },
  ];

  return (
    <div className={classes.root}>
      {/* ─── Toolbar ─────────────────────────────────────────────────────────── */}
      <Box className={classes.toolbarRow}>
        <Title>Histórico de Chamadas</Title>
        <Box className={classes.quickSummary}>
          <span className={classes.quickPill} style={{ backgroundColor: "#e0f2fe", color: "#075985" }}>
            {summaryLoading ? "..." : `${formatDuration(summary.totalDuration || 0)} falados`}
          </span>
          <span className={classes.quickPill} style={{ backgroundColor: "#ecfccb", color: "#3f6212" }}>
            Média {summaryLoading ? "..." : formatDuration(summary.averageDuration || 0)}
          </span>
          <IconButton onClick={() => { fetchRecords(); fetchSummary(); }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* ─── Metric cards ─────────────────────────────────────────────────────── */}
      <div className={classes.metricsGrid}>
        {metricCards.map((metric) => (
          <Card key={metric.label} className={classes.metricCard}>
            <Box p={2.5}>
              <Typography className={classes.metricLabel}>{metric.label}</Typography>
              <Typography className={classes.metricValue} style={{ color: metric.color }}>
                {summaryLoading ? "..." : metric.value}
              </Typography>
            </Box>
          </Card>
        ))}
      </div>

      {/* ─── Ranking panel (admins only, when data exists) ─────────────────── */}
      {isAdmin && userBreakdown.length > 0 && (
        <Paper className={classes.rankingPanel} elevation={0}>
          {/* Header */}
          <Box className={classes.rankingHeader}>
            <EmojiEventsIcon style={{ fontSize: 28 }} />
            <Box>
              <Typography variant="subtitle1" style={{ fontWeight: 900, lineHeight: 1.2 }}>
                Ranking de Ligações
              </Typography>
              <Typography variant="caption" style={{ opacity: 0.82 }}>
                Desempenho da equipe por chamadas realizadas
              </Typography>
            </Box>
          </Box>

          {/* Top 3 podium cards */}
          {top3.length > 0 && (
            <div className={classes.rankingTop3Grid}>
              {top3.map((entry, index) => {
                const calls = Number(entry.totalCalls || 0);
                const name = entry.user?.name || "Usuário";
                const cardClass = classes[CARD_STYLE_KEYS[index]];
                const avatarBg = MEDAL_COLORS[index];

                return (
                  <Box key={entry.userId} className={`${classes.rankingCard} ${cardClass}`}>
                    <Typography className={classes.rankingCardEmoji}>{MEDALS[index]}</Typography>
                    <Avatar style={{ width: 48, height: 48, fontWeight: 900, backgroundColor: avatarBg, color: "#fff", fontSize: "1.1rem" }}>
                      {name.slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Typography className={classes.rankingCardName}>{name}</Typography>
                    <Typography className={classes.rankingCardCalls} style={{ color: avatarBg }}>
                      {calls}
                    </Typography>
                    <Typography className={classes.rankingCardCallsLabel}>
                      {calls === 1 ? "ligação" : "ligações"}
                    </Typography>
                  </Box>
                );
              })}
            </div>
          )}

          {/* Positions 4+ */}
          {restUsers.length > 0 && (
            <Box className={classes.rankingList}>
              {restUsers.map((entry, index) => {
                const rank = index + 4;
                const calls = Number(entry.totalCalls || 0);
                const name = entry.user?.name || "Usuário";
                const pct = maxCalls > 0 ? Math.round((calls / maxCalls) * 100) : 0;

                return (
                  <Box key={entry.userId} className={classes.rankingListItem}>
                    <Box className={classes.rankingListRank}>{rank}º</Box>
                    <Avatar style={{ width: 32, height: 32, fontSize: "0.8rem", fontWeight: 900, backgroundColor: "#cbd5e1", color: "#475569" }}>
                      {name.slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Typography className={classes.rankingListName}>{name}</Typography>
                    <Box className={classes.rankingProgressWrap}>
                      <Box className={classes.rankingProgressBar} style={{ width: `${pct}%` }} />
                    </Box>
                    <Typography className={classes.rankingListCalls}>
                      {calls} {calls === 1 ? "lig." : "ligs."}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>
      )}

      {/* ─── Filters ──────────────────────────────────────────────────────────── */}
      <Paper className={classes.filterPanel}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Buscar nome ou número"
              variant="outlined"
              size="small"
              value={filters.search}
              onChange={handleFilterChange("search")}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={filters.status} onChange={handleFilterChange("status")} label="Status">
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="answered">Atendida</MenuItem>
                <MenuItem value="missed">Não atendeu</MenuItem>
                <MenuItem value="busy">Ocupado</MenuItem>
                <MenuItem value="failed">Falhou</MenuItem>
                <MenuItem value="rejected">Rejeitada</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Data início"
              type="date"
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.dateStart}
              onChange={handleFilterChange("dateStart")}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Data fim"
              type="date"
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.dateEnd}
              onChange={handleFilterChange("dateEnd")}
            />
          </Grid>
          <Grid item xs={12} md={1.5}>
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel>Origem</InputLabel>
              <Select value={filters.source} onChange={handleFilterChange("source")} label="Origem">
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
                <MenuItem value="sequence">Sequência</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {isAdmin && (
            <Grid item xs={12} md={1.5}>
              <FormControl variant="outlined" size="small" fullWidth>
                <InputLabel>Usuário</InputLabel>
                <Select value={filters.userId} onChange={handleFilterChange("userId")} label="Usuário">
                  <MenuItem value="">Equipe inteira</MenuItem>
                  {users.map((teamUser) => (
                    <MenuItem key={teamUser.id} value={String(teamUser.id)}>
                      {teamUser.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} md={3}>
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel>Pipeline</InputLabel>
              <Select value={filters.pipelineId} onChange={handleFilterChange("pipelineId")} label="Pipeline">
                <MenuItem value="">Todos</MenuItem>
                {pipelines.map((pipeline) => (
                  <MenuItem key={pipeline.id} value={String(pipeline.id)}>
                    {pipeline.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl variant="outlined" size="small" fullWidth disabled={!filters.pipelineId}>
              <InputLabel>Estágio</InputLabel>
              <Select value={filters.stageId} onChange={handleFilterChange("stageId")} label="Estágio">
                <MenuItem value="">Todos</MenuItem>
                {stages.map((stage) => (
                  <MenuItem key={stage.id} value={String(stage.id)}>
                    {stage.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              fullWidth
              style={{ height: 40, textTransform: "none", fontWeight: 800 }}
              onClick={() => {
                setPage(0);
                setFilters({ search: "", status: "", dateStart: "", dateEnd: "", userId: "", pipelineId: "", stageId: "", source: "" });
              }}
            >
              Limpar filtros
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ─── History table ────────────────────────────────────────────────────── */}
      <Paper className={classes.tablePaper}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : records.length === 0 ? (
          <Box className={classes.emptyState}>
            <PhoneIcon style={{ fontSize: 46, opacity: 0.25 }} />
            <Typography variant="h6" style={{ marginTop: 10, fontWeight: 800 }}>
              Nenhuma chamada encontrada
            </Typography>
            <Typography variant="body2">
              Ajuste os filtros ou realize novas ligações para alimentar esse módulo.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead className={classes.tableHead}>
                  <TableRow>
                    <TableCell className={classes.tableHeadCell}>Tipo</TableCell>
                    <TableCell className={classes.tableHeadCell}>Contato</TableCell>
                    <TableCell className={classes.tableHeadCell}>Status</TableCell>
                    <TableCell className={classes.tableHeadCell}>Duração</TableCell>
                    <TableCell className={classes.tableHeadCell}>CRM</TableCell>
                    <TableCell className={classes.tableHeadCell}>Usuário</TableCell>
                    <TableCell className={classes.tableHeadCell}>Data</TableCell>
                    <TableCell className={classes.tableHeadCell} align="right">Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record) => {
                    const config = statusConfig[record.status] || statusConfig.failed;
                    const StatusIcon = config.icon;
                    const phone = record.toNumber || record.lead?.phone || record.contact?.number || record.fromNumber;

                    return (
                      <TableRow key={record.id} hover>
                        <TableCell>
                          {record.type === "incoming" ? (
                            <CallReceivedIcon style={{ color: "#2563eb", fontSize: 20 }} />
                          ) : (
                            <CallMadeIcon style={{ color: "#16a34a", fontSize: 20 }} />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className={classes.rowContact}>
                            <Avatar src={record.contact?.profilePicUrl}>
                              {String(record.contact?.name || record.lead?.name || phone || "?").slice(0, 1).toUpperCase()}
                            </Avatar>
                            <div>
                              <Typography className={classes.contactName}>
                                {record.contact?.name || record.lead?.name || phone}
                              </Typography>
                              <Typography className={classes.contactMeta}>{phone}</Typography>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<StatusIcon style={{ color: config.color, fontSize: 14 }} />}
                            label={config.label}
                            className={classes.statusChip}
                            size="small"
                            style={{ backgroundColor: config.bgColor, color: config.color }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gridGap={4}>
                            <AccessTimeIcon style={{ fontSize: 15, color: "#94a3b8" }} />
                            <Typography variant="body2">{formatDuration(record.duration)}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" style={{ fontWeight: 700, color: "#0f172a" }}>
                            {record.pipeline?.name || "-"}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {record.stage?.name || record.source || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" style={{ fontWeight: 700 }}>
                            {record.user?.name || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(record.callStartedAt || record.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end" gridGap={4}>
                            <Button
                              size="small"
                              variant="outlined"
                              style={{ textTransform: "none", fontWeight: 800 }}
                              onClick={() => openCallAgain(record)}
                              startIcon={record.status === "answered" ? <PhoneCallbackIcon /> : <CallEndIcon />}
                              disabled={!phone}
                            >
                              Ligar
                            </Button>
                            {isSuper && (
                              <Tooltip title="Excluir registro (Super Admin)">
                                <IconButton
                                  size="small"
                                  style={{ color: "#dc2626" }}
                                  onClick={() => setDeleteTarget({
                                    id: record.id,
                                    contactName: record.contact?.name || record.lead?.name || phone || `#${record.id}`,
                                  })}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={count}
              page={page}
              onPageChange={(_event, nextPage) => setPage(nextPage)}
              rowsPerPage={40}
              rowsPerPageOptions={[40]}
              labelDisplayedRows={({ from, to, count: total }) => `${from}-${to} de ${total}`}
            />
          </>
        )}
      </Paper>

      {/* ─── Delete confirmation dialog ───────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle disableTypography>
          <Box display="flex" alignItems="center" gridGap={10}>
            <WarningIcon style={{ color: "#dc2626", fontSize: 26 }} />
            <Typography variant="h6" style={{ fontWeight: 900 }}>
              Excluir registro de chamada
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" style={{ color: "#475569" }}>
            Você está prestes a excluir o registro da chamada de{" "}
            <strong style={{ color: "#0f172a" }}>{deleteTarget?.contactName}</strong>.
          </Typography>
          <Typography variant="body2" style={{ marginTop: 8, color: "#dc2626", fontWeight: 700 }}>
            Esta ação é irreversível e não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions style={{ padding: "12px 24px 16px" }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            style={{ textTransform: "none", fontWeight: 800 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteRecord}
            disabled={deleting}
            style={{ textTransform: "none", fontWeight: 900, backgroundColor: "#dc2626", color: "#fff" }}
            startIcon={deleting ? <CircularProgress size={16} style={{ color: "#fff" }} /> : <DeleteIcon />}
          >
            {deleting ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default CallHistory;
