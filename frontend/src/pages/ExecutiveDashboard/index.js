import React, { useEffect, useMemo, useState } from "react";
import {
  makeStyles,
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  LinearProgress,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@material-ui/core";
import {
  GetApp,
  Refresh,
  Edit,
  TrendingUp,
  AccountBalanceWallet,
  TrackChanges,
  EventAvailable,
  Timeline,
  EmojiEvents,
  Timer,
  Group,
  ViewKanban,
  ArrowForward,
} from "@mui/icons-material";
import ReactApexChart from "react-apexcharts";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import api from "../../services/api";
import ContextPageHeader from "../../components/ContextPageHeader";

const PERIODS = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "quarter", label: "Trimestre" },
];

const money = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const number = (value) =>
  new Intl.NumberFormat("pt-BR").format(Number(value || 0));

const percent = (value) => `${Number(value || 0).toFixed(1)}%`;
const toInputValue = (value) => String(Number(value || 0));

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(4),
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f6fbfa 0%, #edf5f3 100%)",
  },
  hero: {
    padding: theme.spacing(3),
    borderRadius: 24,
    color: "#fff",
    background:
      "linear-gradient(135deg, #10283f 0%, #18486a 46%, #18844f 100%)",
    boxShadow: "0 22px 44px rgba(16,40,63,0.18)",
  },
  heroPanel: {
    borderRadius: 18,
    padding: theme.spacing(2.5),
    background: "rgba(255,255,255,0.09)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  filterBar: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2.5),
    borderRadius: 18,
    border: "1px solid #dceae5",
    background: "rgba(255,255,255,0.97)",
    boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
  },
  card: {
    padding: theme.spacing(3),
    borderRadius: 18,
    border: "1px solid #e1eeea",
    boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
    background: "#fff",
    height: "100%",
  },
  darkCard: {
    padding: theme.spacing(3),
    borderRadius: 18,
    color: "#fff",
    background:
      "linear-gradient(135deg, #17314b 0%, #14324a 45%, #0f2132 100%)",
    height: "100%",
  },
  sectionTitle: {
    fontWeight: 900,
    color: "#14324a",
    letterSpacing: "-0.02em",
  },
  label: {
    fontSize: "0.78rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#63798b",
  },
  value: {
    fontSize: "2rem",
    fontWeight: 900,
    lineHeight: 1.1,
    color: "#153047",
  },
  hint: {
    color: "#6b8192",
    fontSize: "0.88rem",
    lineHeight: 1.5,
  },
  title: {
    fontWeight: 900,
    color: "#153047",
  },
  empty: {
    minHeight: 220,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    border: "1px dashed #cfe0d8",
    borderRadius: 16,
    background: "#f8fcfa",
    padding: theme.spacing(4),
  },
  stage: {
    padding: theme.spacing(2),
    borderRadius: 14,
    border: "1px solid #e3efeb",
    background: "#fbfefd",
  },
  progressMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
    color: "#63798b",
    fontSize: "0.82rem",
    fontWeight: 700,
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
  },
  metricBadge: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minWidth: 138,
    padding: "12px 14px",
    borderRadius: 16,
    fontSize: "0.78rem",
    fontWeight: 800,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 14px 28px rgba(6,22,34,0.12)",
  },
  metricBadgeLabel: {
    opacity: 0.78,
    fontSize: "0.74rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  metricBadgeValue: {
    marginTop: 4,
    fontSize: "1.08rem",
    fontWeight: 900,
    lineHeight: 1.1,
  },
  highlightedStageCard: {
    padding: theme.spacing(2.25),
    borderRadius: 18,
    color: "#fff",
    minHeight: 220,
    boxShadow: "0 18px 32px rgba(15,23,42,0.12)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  highlightedStageValue: {
    fontSize: "1.45rem",
    fontWeight: 900,
    lineHeight: 1.1,
  },
  highlightedStageMeta: {
    fontSize: "0.82rem",
    opacity: 0.88,
    lineHeight: 1.55,
  },
  highlightSelectorBlock: {
    padding: theme.spacing(2),
    borderRadius: 16,
    border: "1px solid #e3efeb",
    background: "#f9fcfb",
  },
  tableCellHead: {
    fontWeight: 900,
    color: "#14324a",
    whiteSpace: "nowrap",
  },
  dialogBlock: {
    padding: theme.spacing(2),
    border: "1px solid #e3efeb",
    borderRadius: 14,
    background: "#fbfefd",
  },
}));

const EmptyState = ({ title, description, buttonLabel, onClick, icon }) => {
  const classes = useStyles();

  return (
    <Box className={classes.empty}>
      {icon}
      <Box mt={2}>
        <Typography variant="h6" className={classes.title}>
          {title}
        </Typography>
        <Typography className={classes.hint} style={{ marginTop: 8 }}>
          {description}
        </Typography>
      </Box>
      <Box mt={3}>
        <Button
          color="primary"
          variant="contained"
          onClick={onClick}
          endIcon={<ArrowForward />}
        >
          {buttonLabel}
        </Button>
      </Box>
    </Box>
  );
};

const GoalMetricCard = ({
  classes,
  title,
  value,
  target,
  progress,
  gap,
  helper,
  accent,
  icon,
  actionLabel,
  onAction,
}) => {
  const isEmpty = Number(value || 0) === 0;

  return (
    <Paper className={classes.card}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Box>
          <Typography className={classes.label}>{title}</Typography>
          <Typography className={classes.value}>{number(value)}</Typography>
        </Box>
        <Box style={{ color: accent }}>{icon}</Box>
      </Box>
      <Box mt={2}>
        <Typography className={classes.hint}>{helper}</Typography>
      </Box>
      <Box mt={2}>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Number(progress || 0))}
          style={{ height: 9, borderRadius: 999, background: "#edf4f1" }}
        />
        <Box className={classes.progressMeta}>
          <span>{percent(progress)}</span>
          <span>Meta: {number(target)}</span>
          <span>Gap: {number(gap)}</span>
        </Box>
      </Box>
      {isEmpty && actionLabel && onAction ? (
        <Box className={classes.actionRow}>
          <Button
            size="small"
            color="primary"
            variant="outlined"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </Box>
      ) : null}
    </Paper>
  );
};

const ExecutiveDashboard = () => {
  const classes = useStyles();
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [filters, setFilters] = useState({
    period: "month",
    dateFrom: "",
    dateTo: "",
    reportUserId: "",
    pipelineId: "",
  });
  const [goalForm, setGoalForm] = useState({
    value: { global: "", team: "" },
    meetingsScheduled: { global: "", team: "" },
    meetingsCompleted: { global: "", team: "" },
    conversions: { global: "", team: "" },
    sellerTargets: [],
  });
  const [highlightedStageIds, setHighlightedStageIds] = useState([]);

  const fetchDashboard = async (nextFilters = filters, showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const { data: response } = await api.get("/executive/dashboard", {
        params: {
          period: nextFilters.period,
          dateFrom: nextFilters.dateFrom || undefined,
          dateTo: nextFilters.dateTo || undefined,
          reportUserId: nextFilters.reportUserId || undefined,
          pipelineId: nextFilters.pipelineId || undefined,
        },
      });
      setData(response);
      setFilters({
        period: response.filters.period,
        dateFrom: response.filters.dateFrom,
        dateTo: response.filters.dateTo,
        reportUserId: response.filters.reportUserId || "",
        pipelineId: response.filters.pipelineId || "",
      });
      setHighlightedStageIds(response.preferences?.highlightedStageIds || []);
    } catch (error) {
      toast.error("Erro ao carregar o dashboard CRM.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handlePreset = (period) => {
    const next = { ...filters, period };
    setFilters(next);
    fetchDashboard(next, false);
  };

  const handleDate = (field, value) => {
    const next = { ...filters, [field]: value, period: "custom" };
    setFilters(next);
    if (
      (field === "dateFrom" ? value : next.dateFrom) &&
      (field === "dateTo" ? value : next.dateTo)
    ) {
      fetchDashboard(next, false);
    }
  };

  const handleSelect = (field) => (event) => {
    const next = { ...filters, [field]: event.target.value };
    setFilters(next);
    fetchDashboard(next, false);
  };

  const handleTeamGoalChange = (group, field, value) => {
    setGoalForm((current) => ({
      ...current,
      [group]: { ...current[group], [field]: value },
    }));
  };

  const handleSellerGoalChange = (index, field, value) => {
    setGoalForm((current) => ({
      ...current,
      sellerTargets: current.sellerTargets.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const openGoals = () => {
    setGoalForm({
      value: {
        global: toInputValue(data.targets.value.global),
        team: toInputValue(data.targets.value.team),
      },
      meetingsScheduled: {
        global: toInputValue(data.targets.meetingsScheduled.global),
        team: toInputValue(data.targets.meetingsScheduled.team),
      },
      meetingsCompleted: {
        global: toInputValue(data.targets.meetingsCompleted.global),
        team: toInputValue(data.targets.meetingsCompleted.team),
      },
      conversions: {
        global: toInputValue(data.targets.conversions.global),
        team: toInputValue(data.targets.conversions.team),
      },
      sellerTargets: (data.targets.sellers || []).map((item) => ({
        userId: item.userId,
        name: item.name,
        valueTarget: toInputValue(item.valueTarget),
        meetingsScheduledTarget: toInputValue(item.meetingsScheduledTarget),
        meetingsCompletedTarget: toInputValue(item.meetingsCompletedTarget),
        conversionsTarget: toInputValue(item.conversionsTarget),
      })),
    });
    setGoalOpen(true);
  };

  const saveGoals = async () => {
    try {
      await api.put("/executive/dashboard/goals", goalForm);
      toast.success("Metas atualizadas com sucesso.");
      setGoalOpen(false);
      fetchDashboard(filters, false);
    } catch (error) {
      toast.error("Nao foi possivel salvar as metas.");
    }
  };

  const toggleHighlightedStage = (stageId) => {
    setHighlightedStageIds((current) => {
      const numericStageId = Number(stageId);
      if (current.includes(numericStageId)) {
        return current.filter((item) => Number(item) !== numericStageId);
      }

      const stageLimit = Number(data?.preferences?.highlightedStageLimit || 4);
      if (current.length >= stageLimit) {
        toast.info(`Voce pode destacar ate ${stageLimit} etapas.`);
        return current;
      }

      return [...current, numericStageId];
    });
  };

  const saveHighlightedStages = async () => {
    try {
      await api.put("/executive/dashboard/preferences", {
        highlightedStageIds,
        pipelineId:
          filters.pipelineId || data?.pipelineHealth?.selectedPipeline?.id,
      });
      toast.success("Etapas em destaque atualizadas.");
      setHighlightOpen(false);
      fetchDashboard(filters, false);
    } catch (error) {
      toast.error("Nao foi possivel salvar as etapas em destaque.");
    }
  };

  const chart = useMemo(() => {
    if (!data?.performance?.sellerRanking?.length) return null;
    const rows = [...data.performance.sellerRanking];
    return {
      series: [
        {
          name: "Projetado",
          data: rows.map((item) => Number(item.projectedTotal || 0)),
        },
      ],
      options: {
        chart: { type: "bar", toolbar: { show: false } },
        plotOptions: {
          bar: { horizontal: true, borderRadius: 8, barHeight: "56%" },
        },
        colors: ["#168a57"],
        xaxis: {
          categories: rows.map((item) => item.sellerName),
          labels: { formatter: (value) => money(value) },
        },
        dataLabels: {
          enabled: true,
          formatter: (_, opts) =>
            `${rows[opts.dataPointIndex].progressPercentage.toFixed(1)}%`,
          style: { colors: ["#10223a"], fontWeight: 700 },
        },
        tooltip: {
          y: {
            formatter: (_, { dataPointIndex }) =>
              `${money(rows[dataPointIndex].projectedTotal)} | Meta ${money(rows[dataPointIndex].target)}`,
          },
        },
        grid: { borderColor: "#e5efeb" },
      },
    };
  }, [data]);

  const operationalSummary = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: "scheduled",
        title: "Reunioes agendadas",
        value: data.meetings.scheduledInPeriod,
        target: data.targets.meetingsScheduled.current,
        progress: data.meetings.scheduledProgress,
        gap: data.meetings.scheduledGap,
        helper: `Futuras registradas: ${number(data.meetings.upcoming)}`,
        accent: "#8b5cf6",
        icon: <EventAvailable style={{ fontSize: 32 }} />,
        actionLabel: "Criar reunioes",
      },
      {
        key: "completed",
        title: "Reunioes realizadas",
        value: data.meetings.completedInPeriod,
        target: data.targets.meetingsCompleted.current,
        progress: data.meetings.completedProgress,
        gap: data.meetings.completedGap,
        helper: "Conta compromissos concluidos no periodo filtrado.",
        accent: "#14b8a6",
        icon: <Timer style={{ fontSize: 32 }} />,
        actionLabel: "Revisar agenda",
      },
      {
        key: "conversions",
        title: "Contratos fechados",
        value: data.leads.converted,
        target: data.targets.conversions.current,
        progress: data.leads.convertedProgress,
        gap: data.leads.convertedGap,
        helper: `Conversao atual: ${percent(data.leads.conversionRate)}`,
        accent: "#f59e0b",
        icon: <EmojiEvents style={{ fontSize: 32 }} />,
        actionLabel: "Abrir funil",
      },
    ];
  }, [data]);

  const highlightedStages = useMemo(
    () => data?.pipelineHealth?.highlightedStages || [],
    [data],
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Typography>Nao foi possivel carregar o dashboard.</Typography>
      </Box>
    );
  }

  const progressText = `Estamos no dia ${data.periodProgress.elapsedDays} de ${data.periodProgress.totalDays} - esperado ${money(data.periodProgress.expectedRevenue)} ate aqui.`;
  const openKanban = () => history.push("/kanban");
  const openAgenda = () => history.push("/appointments");

  return (
    <Box className={classes.root}>
      <ContextPageHeader
        title="Dashboard CRM"
        subtitle="Visao executiva do funil, das metas e da performance comercial."
        fallbackTo="/kanban"
        actions={
          <Box display="flex" gridGap={8}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => fetchDashboard(filters, false)}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<GetApp />}
              onClick={() => window.print()}
            >
              Exportar PDF
            </Button>
          </Box>
        }
      />

      <Paper className={classes.hero}>
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={7}>
            <Typography
              variant="h4"
              style={{ fontWeight: 900, letterSpacing: "-0.03em" }}
            >
              Dashboard comercial com metas operacionais e visao por escopo
            </Typography>
            <Box mt={1.5}>
              <Typography style={{ opacity: 0.88, lineHeight: 1.6 }}>
                {data.filters.scope === "company"
                  ? "O admin acompanha a operacao completa da equipe. Todos os cards reagem ao mesmo periodo, usuario e funil para leitura consistente."
                  : `Voce esta vendo apenas os seus numeros em ${data.filters.scopeLabel}. As metas e metricas foram filtradas para a sua carteira.`}
              </Typography>
            </Box>
            <Box mt={2} display="flex" flexWrap="wrap" gridGap={8}>
              <Chip label={data.periodProgress.label} />
              <Chip label={data.filters.scopeLabel} />
              <Chip
                label={`Meta de valor ${money(data.targets.value.current)}`}
              />
              <Chip
                label={`Meta de conversao ${number(data.targets.conversions.current)}`}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box className={classes.heroPanel}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography style={{ fontWeight: 900 }}>
                  Ritmo da meta de valor
                </Typography>
                <Chip
                  label={`${data.periodProgress.elapsedPercentage.toFixed(1)}% do periodo`}
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                  }}
                />
              </Box>
              <Box mt={1.5}>
                <LinearProgress
                  variant="determinate"
                  value={data.periodProgress.elapsedPercentage}
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.22)",
                  }}
                />
              </Box>
              <Box mt={1.5}>
                <Typography variant="body2" style={{ opacity: 0.92 }}>
                  {progressText}
                </Typography>
              </Box>
              <Box mt={2} display="flex" flexWrap="wrap" gridGap={8}>
                <Box className={classes.metricBadge}>
                  <span className={classes.metricBadgeLabel}>
                    Meta de valor
                  </span>
                  <span className={classes.metricBadgeValue}>
                    {money(data.targets.value.current)}
                  </span>
                </Box>
                <Box className={classes.metricBadge}>
                  <span className={classes.metricBadgeLabel}>
                    Reunioes agendadas
                  </span>
                  <span className={classes.metricBadgeValue}>
                    {number(data.targets.meetingsScheduled.current)}
                  </span>
                </Box>
                <Box className={classes.metricBadge}>
                  <span className={classes.metricBadgeLabel}>
                    Reunioes realizadas
                  </span>
                  <span className={classes.metricBadgeValue}>
                    {number(data.targets.meetingsCompleted.current)}
                  </span>
                </Box>
                <Box className={classes.metricBadge}>
                  <span className={classes.metricBadgeLabel}>Fechamentos</span>
                  <span className={classes.metricBadgeValue}>
                    {number(data.targets.conversions.current)}
                  </span>
                </Box>
              </Box>
              {data.filters.canEditGoals ? (
                <Box mt={2.5} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Edit />}
                    onClick={openGoals}
                  >
                    Ajustar metas
                  </Button>
                </Box>
              ) : null}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper className={classes.filterBar}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box display="flex" flexWrap="wrap" gridGap={8}>
              {PERIODS.map((item) => (
                <Chip
                  key={item.value}
                  label={item.label}
                  clickable
                  color={filters.period === item.value ? "primary" : "default"}
                  onClick={() => handlePreset(item.value)}
                />
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Data inicial"
              type="date"
              fullWidth
              size="small"
              variant="outlined"
              value={filters.dateFrom}
              onChange={(e) => handleDate("dateFrom", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Data final"
              type="date"
              fullWidth
              size="small"
              variant="outlined"
              value={filters.dateTo}
              onChange={(e) => handleDate("dateTo", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          {data.filters.canSelectUsers ? (
            <Grid item xs={12} md={2}>
              <FormControl variant="outlined" size="small" fullWidth>
                <InputLabel>Usuario</InputLabel>
                <Select
                  value={filters.reportUserId}
                  onChange={handleSelect("reportUserId")}
                  label="Usuario"
                >
                  <MenuItem value="">Visao geral</MenuItem>
                  {data.selectors.users.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ) : null}
          <Grid item xs={12} md={data.filters.canSelectUsers ? 2 : 4}>
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel>Funil</InputLabel>
              <Select
                value={filters.pipelineId}
                onChange={handleSelect("pipelineId")}
                label="Funil"
              >
                {data.selectors.pipelines.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Box mt={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Paper className={classes.card}>
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography className={classes.label}>
                    Receita realizada
                  </Typography>
                  <Typography className={classes.value}>
                    {money(data.revenue.real)}
                  </Typography>
                </Box>
                <AccountBalanceWallet
                  style={{ color: "#168a57", fontSize: 34 }}
                />
              </Box>
              <Box mt={2}>
                <Typography className={classes.hint}>{progressText}</Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={3}>
            <Paper className={classes.card}>
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography className={classes.label}>
                    Forecast do periodo
                  </Typography>
                  <Typography
                    className={classes.value}
                    style={{ color: "#4f46e5" }}
                  >
                    {money(data.revenue.forecast)}
                  </Typography>
                </Box>
                <TrendingUp style={{ color: "#4f46e5", fontSize: 34 }} />
              </Box>
              <Box mt={2}>
                <Typography className={classes.hint}>
                  Projetado total:{" "}
                  <strong>{money(data.revenue.projectedTotal)}</strong>
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={3}>
            <Paper className={classes.card}>
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography className={classes.label}>
                    Gap para a meta
                  </Typography>
                  <Typography
                    className={classes.value}
                    style={{ color: "#ef4444" }}
                  >
                    {money(data.revenue.gap)}
                  </Typography>
                </Box>
                <TrackChanges style={{ color: "#ef4444", fontSize: 34 }} />
              </Box>
              <Box mt={2}>
                <Typography className={classes.hint}>
                  Esperado ate agora:{" "}
                  <strong>{money(data.periodProgress.expectedRevenue)}</strong>
                </Typography>
                <Typography className={classes.hint}>
                  Gap real ate hoje:{" "}
                  <strong>{money(data.revenue.expectedToDateGap)}</strong>
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={3}>
            <Paper className={classes.darkCard}>
              <Typography
                className={classes.label}
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                ROI da inteligencia
              </Typography>
              <Typography
                variant="h4"
                style={{ fontWeight: 900, marginTop: 10 }}
              >
                +{data.aiRoi.estimatedEfficiencyGain.toFixed(1)}%
              </Typography>
              <Box mt={2}>
                <Typography variant="body2" style={{ opacity: 0.84 }}>
                  Movimentacoes por IA: {percent(data.aiRoi.movementRate)}
                </Typography>
                <Typography variant="body2" style={{ opacity: 0.84 }}>
                  Precisao da IA: {percent(data.aiRoi.accuracyRate)}
                </Typography>
              </Box>
              {data.aiRoi.estimatedEfficiencyGain === 0 ? (
                <Box className={classes.actionRow}>
                  <Button
                    size="small"
                    variant="outlined"
                    style={{
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.3)",
                    }}
                    onClick={openKanban}
                  >
                    Revisar automacoes
                  </Button>
                </Box>
              ) : null}
            </Paper>
          </Grid>

          {operationalSummary.map((item) => (
            <Grid item xs={12} md={4} key={item.key}>
              <GoalMetricCard
                classes={classes}
                title={item.title}
                value={item.value}
                target={item.target}
                progress={item.progress}
                gap={item.gap}
                helper={item.helper}
                accent={item.accent}
                icon={item.icon}
                actionLabel={item.actionLabel}
                onAction={
                  item.key === "scheduled" || item.key === "completed"
                    ? openAgenda
                    : openKanban
                }
              />
            </Grid>
          ))}

          <Grid item xs={12} md={4}>
            <Paper className={classes.card}>
              <Timeline style={{ color: "#0ea5e9", fontSize: 32 }} />
              <Box mt={1}>
                <Typography className={classes.label}>Leads gerados</Typography>
                <Typography className={classes.value}>
                  {number(data.leads.generated)}
                </Typography>
              </Box>
              <Box mt={2}>
                <Typography className={classes.hint}>
                  Oportunidades convertidas:{" "}
                  <strong>{number(data.leads.converted)}</strong>
                </Typography>
                {Number(data.leads.generated || 0) === 0 ? (
                  <Box className={classes.actionRow}>
                    <Button
                      size="small"
                      color="primary"
                      variant="outlined"
                      onClick={openKanban}
                    >
                      Alimentar funil
                    </Button>
                  </Box>
                ) : null}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper className={classes.card}>
              <Timer style={{ color: "#14b8a6", fontSize: 32 }} />
              <Box mt={1}>
                <Typography className={classes.label}>Ciclo medio</Typography>
                <Typography className={classes.value}>
                  {data.performance.avgSalesCycle.toFixed(1)} dias
                </Typography>
              </Box>
              <Box mt={2}>
                <Typography className={classes.hint}>
                  Win rate: <strong>{percent(data.performance.winRate)}</strong>
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper className={classes.card}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Box>
                  <Typography variant="h6" className={classes.sectionTitle}>
                    Etapas em destaque
                  </Typography>
                  <Typography className={classes.hint}>
                    Essas quatro etapas ficam sempre em evidencia para leitura
                    rapida. Voce pode trocar quais quer acompanhar.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Edit />}
                  onClick={() => setHighlightOpen(true)}
                  disabled={!data.pipelineHealth.stages.length}
                >
                  Editar destaques
                </Button>
              </Box>

              {highlightedStages.length === 0 ? (
                <EmptyState
                  icon={
                    <ViewKanban style={{ fontSize: 42, color: "#178a4a" }} />
                  }
                  title="Nenhuma etapa em destaque"
                  description="Selecione ate quatro etapas do funil para mante-las em evidencia no topo do dashboard."
                  buttonLabel="Escolher etapas"
                  onClick={() => setHighlightOpen(true)}
                />
              ) : (
                <Grid container spacing={2}>
                  {highlightedStages.map((stage) => (
                    <Grid item xs={12} md={3} key={stage.id}>
                      <Box
                        className={classes.highlightedStageCard}
                        style={{
                          background: `linear-gradient(135deg, ${stage.color || "#178a4a"} 0%, #10283f 120%)`,
                        }}
                      >
                        <Box>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="flex-start"
                          >
                            <Typography
                              style={{
                                fontSize: "1.15rem",
                                fontWeight: 900,
                                lineHeight: 1.2,
                              }}
                            >
                              {stage.name}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${stage.currentCards} cards`}
                              style={{
                                fontWeight: 900,
                                background: "rgba(255,255,255,0.16)",
                                color: "#fff",
                              }}
                            />
                          </Box>
                          <Box mt={2}>
                            <Typography
                              className={classes.highlightedStageValue}
                            >
                              {money(stage.currentValue)}
                            </Typography>
                            <Typography
                              className={classes.highlightedStageMeta}
                            >
                              Valor em aberto
                            </Typography>
                          </Box>
                        </Box>

                        <Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, Number(stage.score || 0))}
                            style={{
                              height: 8,
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.22)",
                            }}
                          />
                          <Box mt={1.5}>
                            <Typography
                              className={classes.highlightedStageMeta}
                            >
                              Score da etapa: <strong>{stage.score}/100</strong>
                            </Typography>
                            <Typography
                              className={classes.highlightedStageMeta}
                            >
                              Entradas no periodo:{" "}
                              <strong>{stage.enteredInPeriod}</strong>
                            </Typography>
                            <Typography
                              className={classes.highlightedStageMeta}
                            >
                              Leads: <strong>{stage.currentLeadCount}</strong> |
                              Oportunidades:{" "}
                              <strong>{stage.currentOpportunityCount}</strong>
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper className={classes.card}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Box>
                  <Typography variant="h6" className={classes.sectionTitle}>
                    Forecast por vendedor
                  </Typography>
                  <Typography className={classes.hint}>
                    Ordenado por percentual da meta. Valor, conversoes e
                    reunioes ficam lado a lado para leitura rapida.
                  </Typography>
                </Box>
                <Chip
                  icon={<Group />}
                  label={`${data.performance.sellerRanking.length} vendedores`}
                />
              </Box>

              {data.emptyStates.forecast ? (
                <EmptyState
                  icon={<Group style={{ fontSize: 42, color: "#178a4a" }} />}
                  title="Sem forecast para mostrar"
                  description="Ainda nao ha carteira suficiente neste filtro para projetar receita. Vale abrir o CRM Kanban e revisar as oportunidades ativas."
                  buttonLabel="Abrir CRM Kanban"
                  onClick={openKanban}
                />
              ) : (
                <>
                  <ReactApexChart
                    options={chart.options}
                    series={chart.series}
                    type="bar"
                    height={320}
                  />
                  <Grid container spacing={2}>
                    {data.performance.sellerRanking.slice(0, 6).map((item) => (
                      <Grid item xs={12} md={6} key={item.sellerId}>
                        <Box className={classes.stage}>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Typography style={{ fontWeight: 900 }}>
                              {item.sellerName}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${item.progressPercentage.toFixed(1)}% da meta`}
                              style={{
                                fontWeight: 800,
                                background: "#e7f6ef",
                                color: "#12754f",
                              }}
                            />
                          </Box>
                          <Box mt={1}>
                            <Typography
                              variant="body2"
                              className={classes.hint}
                            >
                              Projetado:{" "}
                              <strong>{money(item.projectedTotal)}</strong> |
                              Meta: <strong>{money(item.target)}</strong>
                            </Typography>
                            <Typography
                              variant="body2"
                              className={classes.hint}
                            >
                              Real: <strong>{money(item.realRevenue)}</strong> |
                              Fechamentos:{" "}
                              <strong>{number(item.conversions)}</strong>
                            </Typography>
                            <Typography
                              variant="body2"
                              className={classes.hint}
                            >
                              Reunioes agendadas:{" "}
                              <strong>{number(item.meetingsScheduled)}</strong>{" "}
                              | Realizadas:{" "}
                              <strong>{number(item.meetingsCompleted)}</strong>
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper className={classes.card}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Box>
                  <Typography variant="h6" className={classes.sectionTitle}>
                    Saude do pipeline
                  </Typography>
                  <Typography className={classes.hint}>
                    {data.pipelineHealth.selectedPipeline
                      ? `Funil: ${data.pipelineHealth.selectedPipeline.name}`
                      : "Sem funil selecionado."}
                  </Typography>
                </Box>
                <Chip
                  icon={<ViewKanban />}
                  label={`${data.pipelineHealth.overview.totalStages} etapas`}
                />
              </Box>

              {data.emptyStates.pipeline ? (
                <EmptyState
                  icon={
                    <ViewKanban style={{ fontSize: 42, color: "#178a4a" }} />
                  }
                  title="Pipeline sem dados no periodo"
                  description="Nao encontramos cards ativos para o filtro atual. Vale ampliar o periodo ou revisar o funil."
                  buttonLabel="Ir para o Kanban"
                  onClick={openKanban}
                />
              ) : (
                <Box display="flex" flexDirection="column" gridGap={12}>
                  <Box className={classes.stage}>
                    <Typography className={classes.label}>Resumo</Typography>
                    <Box mt={1}>
                      <Typography variant="body2" className={classes.hint}>
                        Cards atuais:{" "}
                        <strong>
                          {number(
                            data.pipelineHealth.overview.totalCurrentCards,
                          )}
                        </strong>
                      </Typography>
                      <Typography variant="body2" className={classes.hint}>
                        Entradas no periodo:{" "}
                        <strong>
                          {number(
                            data.pipelineHealth.overview.totalEnteredInPeriod,
                          )}
                        </strong>
                      </Typography>
                      <Typography variant="body2" className={classes.hint}>
                        Valor atual:{" "}
                        <strong>
                          {money(
                            data.pipelineHealth.overview.totalCurrentValue,
                          )}
                        </strong>
                      </Typography>
                      <Typography variant="body2" className={classes.hint}>
                        Score medio:{" "}
                        <strong>
                          {percent(
                            data.pipelineHealth.overview.averageStageScore,
                          )}
                        </strong>
                      </Typography>
                    </Box>
                  </Box>

                  {data.pipelineHealth.stages.map((stage) => (
                    <Box key={stage.id} className={classes.stage}>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box>
                          <Typography
                            style={{ fontWeight: 900, color: "#17314b" }}
                          >
                            {stage.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            className={classes.hint}
                          >
                            Score da etapa: {stage.score}/100
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={`${stage.currentCards} cards`}
                          style={{
                            fontWeight: 800,
                            background: `${stage.color || "#178a4a"}22`,
                            color: stage.color || "#178a4a",
                          }}
                        />
                      </Box>
                      <Box mt={1}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, Number(stage.score || 0))}
                          style={{ height: 8, borderRadius: 999 }}
                        />
                      </Box>
                      <Box mt={1.5}>
                        <Typography variant="body2" className={classes.hint}>
                          Valor em aberto:{" "}
                          <strong>{money(stage.currentValue)}</strong>
                        </Typography>
                        <Typography variant="body2" className={classes.hint}>
                          Entradas no periodo:{" "}
                          <strong>{stage.enteredInPeriod}</strong>
                        </Typography>
                        <Typography variant="body2" className={classes.hint}>
                          Leads no estagio:{" "}
                          <strong>{stage.currentLeadCount}</strong> |
                          Oportunidades:{" "}
                          <strong>{stage.currentOpportunityCount}</strong>
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Dialog
        open={highlightOpen}
        onClose={() => setHighlightOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Escolher etapas em destaque</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary">
            Selecione ate {data.preferences?.highlightedStageLimit || 4} etapas
            do funil atual para deixa-las em evidencia no dashboard.
          </Typography>
          <Box mt={3} className={classes.highlightSelectorBlock}>
            <FormGroup>
              {data.pipelineHealth.stages.map((stage) => (
                <FormControlLabel
                  key={stage.id}
                  control={
                    <Checkbox
                      color="primary"
                      checked={highlightedStageIds.includes(Number(stage.id))}
                      onChange={() => toggleHighlightedStage(stage.id)}
                    />
                  }
                  label={`${stage.name} - ${stage.currentCards} cards - ${money(stage.currentValue)}`}
                />
              ))}
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHighlightOpen(false)}>Cancelar</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={saveHighlightedStages}
          >
            Salvar destaques
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Ajustar metas do dashboard CRM</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary">
            O admin pode definir meta de valor, reunioes agendadas, reunioes
            realizadas e contratos fechados. Cada vendedor herda a leitura do
            seu proprio dashboard, sem permissao para editar estes dados.
          </Typography>

          <Box mt={3} className={classes.dialogBlock}>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              Metas gerais da operacao
            </Typography>
            <Box mt={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Meta geral de valor"
                    variant="outlined"
                    type="number"
                    fullWidth
                    value={goalForm.value.global}
                    onChange={(e) =>
                      handleTeamGoalChange("value", "global", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Meta da equipe de valor"
                    variant="outlined"
                    type="number"
                    fullWidth
                    value={goalForm.value.team}
                    onChange={(e) =>
                      handleTeamGoalChange("value", "team", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Meta geral de reunioes"
                    variant="outlined"
                    type="number"
                    fullWidth
                    value={goalForm.meetingsScheduled.global}
                    onChange={(e) =>
                      handleTeamGoalChange(
                        "meetingsScheduled",
                        "global",
                        e.target.value,
                      )
                    }
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Meta da equipe de reunioes"
                    variant="outlined"
                    type="number"
                    fullWidth
                    value={goalForm.meetingsScheduled.team}
                    onChange={(e) =>
                      handleTeamGoalChange(
                        "meetingsScheduled",
                        "team",
                        e.target.value,
                      )
                    }
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Meta geral de reunioes realizadas"
                    variant="outlined"
                    type="number"
                    fullWidth
                    value={goalForm.meetingsCompleted.global}
                    onChange={(e) =>
                      handleTeamGoalChange(
                        "meetingsCompleted",
                        "global",
                        e.target.value,
                      )
                    }
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Meta da equipe de reunioes realizadas"
                    variant="outlined"
                    type="number"
                    fullWidth
                    value={goalForm.meetingsCompleted.team}
                    onChange={(e) =>
                      handleTeamGoalChange(
                        "meetingsCompleted",
                        "team",
                        e.target.value,
                      )
                    }
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Meta geral de contratos fechados"
                    variant="outlined"
                    type="number"
                    fullWidth
                    value={goalForm.conversions.global}
                    onChange={(e) =>
                      handleTeamGoalChange(
                        "conversions",
                        "global",
                        e.target.value,
                      )
                    }
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Meta da equipe de contratos fechados"
                    variant="outlined"
                    type="number"
                    fullWidth
                    value={goalForm.conversions.team}
                    onChange={(e) =>
                      handleTeamGoalChange(
                        "conversions",
                        "team",
                        e.target.value,
                      )
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          </Box>

          <Box mt={3}>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              Metas por vendedor
            </Typography>
            <Typography className={classes.hint} style={{ marginTop: 6 }}>
              Cada linha abaixo define a meta individual do vendedor para o
              mesmo periodo filtrado no dashboard.
            </Typography>

            <Box mt={2}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell className={classes.tableCellHead}>
                      Vendedor
                    </TableCell>
                    <TableCell className={classes.tableCellHead} align="right">
                      Valor
                    </TableCell>
                    <TableCell className={classes.tableCellHead} align="right">
                      Reunioes agendadas
                    </TableCell>
                    <TableCell className={classes.tableCellHead} align="right">
                      Reunioes realizadas
                    </TableCell>
                    <TableCell className={classes.tableCellHead} align="right">
                      Contratos fechados
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {goalForm.sellerTargets.map((seller, index) => (
                    <TableRow key={seller.userId}>
                      <TableCell>{seller.name}</TableCell>
                      <TableCell align="right">
                        <TextField
                          variant="outlined"
                          size="small"
                          type="number"
                          value={seller.valueTarget}
                          onChange={(e) =>
                            handleSellerGoalChange(
                              index,
                              "valueTarget",
                              e.target.value,
                            )
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          variant="outlined"
                          size="small"
                          type="number"
                          value={seller.meetingsScheduledTarget}
                          onChange={(e) =>
                            handleSellerGoalChange(
                              index,
                              "meetingsScheduledTarget",
                              e.target.value,
                            )
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          variant="outlined"
                          size="small"
                          type="number"
                          value={seller.meetingsCompletedTarget}
                          onChange={(e) =>
                            handleSellerGoalChange(
                              index,
                              "meetingsCompletedTarget",
                              e.target.value,
                            )
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          variant="outlined"
                          size="small"
                          type="number"
                          value={seller.conversionsTarget}
                          onChange={(e) =>
                            handleSellerGoalChange(
                              index,
                              "conversionsTarget",
                              e.target.value,
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalOpen(false)}>Cancelar</Button>
          <Button color="primary" variant="contained" onClick={saveGoals}>
            Salvar metas
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExecutiveDashboard;
