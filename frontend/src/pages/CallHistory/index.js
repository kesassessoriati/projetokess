import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
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
  Typography,
} from "@material-ui/core";
import {
  AccessTime as AccessTimeIcon,
  CallMade as CallMadeIcon,
  CallReceived as CallReceivedIcon,
  CallEnd as CallEndIcon,
  Phone as PhoneIcon,
  PhoneCallback as PhoneCallbackIcon,
  PhoneDisabled as PhoneDisabledIcon,
  PhoneMissed as PhoneMissedIcon,
  Refresh as RefreshIcon,
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
}));

const statusConfig = {
  answered: { label: "Atendida", color: "#16a34a", bgColor: "#dcfce7", icon: PhoneCallbackIcon },
  missed: { label: "Não atendeu", color: "#dc2626", bgColor: "#fee2e2", icon: PhoneMissedIcon },
  busy: { label: "Ocupado", color: "#d97706", bgColor: "#fef3c7", icon: PhoneDisabledIcon },
  rejected: { label: "Rejeitada", color: "#dc2626", bgColor: "#fee2e2", icon: PhoneDisabledIcon },
  failed: { label: "Falhou", color: "#64748b", bgColor: "#e2e8f0", icon: PhoneDisabledIcon },
  ringing: { label: "Chamando", color: "#2563eb", bgColor: "#dbeafe", icon: PhoneIcon },
};

const formatDuration = (seconds) => {
  const total = Number(seconds || 0);
  if (!total) {
    return "0s";
  }

  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return mins ? `${mins}m ${secs}s` : `${secs}s`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

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

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

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
    const nextStages = [...(pipeline?.stages || [])].sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
    setStages(nextStages);
  }, [filters.pipelineId, pipelines]);

  const requestParams = useMemo(() => {
    const params = { pageNumber: page + 1 };

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params[key] = value;
      }
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

      const { data } = await api.get("/call-records/summary", {
        params: summaryParams,
      });
      setSummary(data || {});
    } catch (error) {
      console.error("[CallHistory] Failed to load summary", error);
    } finally {
      setSummaryLoading(false);
    }
  }, [requestParams]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!isConnected || !user?.companyId) {
      return;
    }

    const cleanup = on(`company-${user.companyId}-call`, () => {
      fetchRecords();
      fetchSummary();
    });

    return () => cleanup();
  }, [fetchRecords, fetchSummary, isConnected, on, user?.companyId]);

  const handleFilterChange = (field) => (event) => {
    setPage(0);
    setFilters((previous) => ({
      ...previous,
      [field]: event.target.value,
      ...(field === "pipelineId" ? { stageId: "" } : {}),
    }));
  };

  const openCallAgain = (record) => {
    const phone = record.toNumber || record.lead?.phone || record.contact?.number || record.fromNumber;
    if (!phone) {
      return;
    }

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

  const metricCards = [
    { label: "Total", value: summary.total || 0, color: "#2563eb" },
    { label: "Atendidas", value: summary.answered || 0, color: "#16a34a" },
    { label: "Não atendeu", value: summary.missed || 0, color: "#dc2626" },
    { label: "Ocupado", value: summary.busy || 0, color: "#d97706" },
  ];

  return (
    <div className={classes.root}>
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
                setFilters({
                  search: "",
                  status: "",
                  dateStart: "",
                  dateEnd: "",
                  userId: "",
                  pipelineId: "",
                  stageId: "",
                  source: "",
                });
              }}
            >
              Limpar filtros
            </Button>
          </Grid>
        </Grid>
      </Paper>

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
                              <Typography className={classes.contactMeta}>
                                {phone}
                              </Typography>
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
                          <Typography variant="body2">{formatDateTime(record.callStartedAt || record.createdAt)}</Typography>
                        </TableCell>
                        <TableCell align="right">
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
    </div>
  );
};

export default CallHistory;
