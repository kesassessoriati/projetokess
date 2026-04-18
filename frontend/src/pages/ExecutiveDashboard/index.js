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

const OperationalMetricCard = ({
  classes,
  title,
  value,
  helper,
  icon,
  accent,
  progress,
  targetLabel,
  actionLabel,
  onAction,
}) => (
  <Paper className={classes.card}>
    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
      <Box>
        <Typography className={classes.label}>{title}</Typography>
        <Typography className={classes.value}>{number(value)}</Typography>
      </Box>
      <Box style={{ color: accent }}>{icon}</Box>
    </Box>
    <Box mt={2}>
      <Typography className={classes.hint}>{helper}</Typography>
    </Box>
    {typeof progress === "number" ? (
      <Box mt={2}>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Number(progress || 0))}
          style={{ height: 9, borderRadius: 999, background: "#edf4f1" }}
        />
        <Box className={classes.progressMeta}>
          <span>{percent(progress)}</span>
          <span>{targetLabel}</span>
        </Box>
      </Box>
    ) : null}
    {actionLabel && onAction ? (
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

const GoalCadenceCard = ({ classes, title, data, accent }) => (
  <Paper className={classes.card}>
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Typography className={classes.sectionTitle} style={{ fontSize: "1rem" }}>
        {title}
      </Typography>
      <Box
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: accent,
          boxShadow: `0 0 0 6px ${accent}22`,
        }}
      />
    </Box>
    <Box mt={2} display="flex" flexDirection="column" gridGap={12}>
      <Box className={classes.stage}>
        <Typography className={classes.label}>Reunioes agendadas</Typography>
        <Typography
          style={{ fontWeight: 900, fontSize: "1.3rem", color: "#14324a" }}
        >
          {number(data.meetingsScheduled)}
        </Typography>
      </Box>
      <Box className={classes.stage}>
        <Typography className={classes.label}>Reunioes realizadas</Typography>
        <Typography
          style={{ fontWeight: 900, fontSize: "1.3rem", color: "#14324a" }}
        >
          {number(data.meetingsCompleted)}
        </Typography>
      </Box>
      <Box className={classes.stage}>
        <Typography className={classes.label}>Conversoes esperadas</Typography>
        <Typography
          style={{ fontWeight: 900, fontSize: "1.3rem", color: "#14324a" }}
        >
          {number(data.conversions)}
        </Typography>
      </Box>
    </Box>
  </Paper>
);

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

  const stageDistributionChart = useMemo(() => {
    if (!data?.pipelineHealth?.stages?.length) return null;
    const rows = [...data.pipelineHealth.stages];

    return {
      series: [
        {
          name: "Leads",
          data: rows.map((item) => Number(item.currentLeadCount || 0)),
        },
        {
          name: "Oportunidades",
          data: rows.map((item) => Number(item.currentOpportunityCount || 0)),
        },
      ],
      options: {
        chart: {
          type: "bar",
          stacked: true,
          toolbar: { show: false },
        },
        plotOptions: {
          bar: { horizontal: false, borderRadius: 8, columnWidth: "56%" },
        },
        colors: ["#178a4a", "#14324a"],
        xaxis: {
          categories: rows.map((item) => item.name),
          labels: {
            rotate: -20,
            style: { fontSize: "11px" },
          },
        },
        yaxis: {
          labels: { formatter: (value) => number(value) },
        },
        dataLabels: { enabled: false },
        legend: { position: "top" },
        tooltip: {
          y: { formatter: (value) => `${number(value)} registro(s)` },
        },
        grid: { borderColor: "#e5efeb" },
      },
    };
  }, [data]);

  const teamPerformanceChart = useMemo(() => {
    if (!data?.performance?.sellerRanking?.length) return null;
    const rows = [...data.performance.sellerRanking].slice(0, 8);

    return {
      series: [
        {
          name: "Score operacional",
          data: rows.map((item) => Number(item.operationalScore || 0)),
        },
      ],
      options: {
        chart: { type: "bar", toolbar: { show: false } },
        plotOptions: {
          bar: { horizontal: true, borderRadius: 8, barHeight: "58%" },
        },
        colors: ["#178a4a"],
        xaxis: {
          categories: rows.map((item) => item.sellerName),
          labels: { formatter: (value) => number(value) },
        },
        dataLabels: {
          enabled: true,
          formatter: (_, opts) =>
            `${rows[opts.dataPointIndex].conversions} conv.`,
          style: { colors: ["#10223a"], fontWeight: 700 },
        },
        tooltip: {
          custom: ({ dataPointIndex }) => {
            const row = rows[dataPointIndex];
            return `
              <div style="padding:10px 12px">
                <strong>${row.sellerName}</strong><br/>
                Leads gerados: ${number(row.generatedLeads)}<br/>
                Reunioes agendadas: ${number(row.meetingsScheduled)}<br/>
                Reunioes realizadas: ${number(row.meetingsCompleted)}<br/>
                Conversoes: ${number(row.conversions)}
              </div>
            `;
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
        key: "meetings-total",
        title: "Total de reunioes",
        value: data.meetings.totalInPeriod,
        helper:
          "Leituras do periodo atual somando reunioes registradas na agenda.",
        accent: "#1d4ed8",
        icon: <EventAvailable style={{ fontSize: 32 }} />,
        actionLabel: "Abrir agenda",
      },
      {
        key: "scheduled",
        title: "Reunioes agendadas",
        value: data.meetings.scheduledInPeriod,
        progress: data.meetings.scheduledProgress,
        helper: `Futuras registradas: ${number(data.meetings.upcoming)}`,
        accent: "#8b5cf6",
        icon: <EventAvailable style={{ fontSize: 32 }} />,
        actionLabel: "Criar reunioes",
        targetLabel: `Meta: ${number(data.targets.meetingsScheduled.current)}`,
      },
      {
        key: "completed",
        title: "Reunioes realizadas",
        value: data.meetings.completedInPeriod,
        progress: data.meetings.completedProgress,
        helper: "Conta compromissos concluidos no periodo filtrado.",
        accent: "#14b8a6",
        icon: <Timer style={{ fontSize: 32 }} />,
        actionLabel: "Revisar agenda",
        targetLabel: `Meta: ${number(data.targets.meetingsCompleted.current)}`,
      },
      {
        key: "generated",
        title: "Leads gerados",
        value: data.leads.generated,
        helper: `Conversoes no periodo: ${number(data.leads.converted)}`,
        accent: "#0ea5e9",
        icon: <Timeline style={{ fontSize: 32 }} />,
        actionLabel: "Abrir funil",
      },
      {
        key: "conversions",
        title: "Leads convertidos",
        value: data.leads.converted,
        progress: data.leads.convertedProgress,
        helper: `Conversao atual: ${percent(data.leads.conversionRate)}`,
        accent: "#f59e0b",
        icon: <EmojiEvents style={{ fontSize: 32 }} />,
        actionLabel: "Abrir funil",
        targetLabel: `Meta: ${number(data.targets.conversions.current)}`,
      },
      {
        key: "pipeline-leads",
        title: "Leads ativos no funil",
        value: data.leads.activeInPipeline,
        helper: `Etapas ativas neste funil: ${number(data.pipelineHealth.overview.totalStages)}`,
        accent: "#178a4a",
        icon: <ViewKanban style={{ fontSize: 32 }} />,
        actionLabel: "Abrir funil",
      },
    ];
  }, [data]);

  const goalCadenceCards = useMemo(() => {
    if (!data) return [];

    return [
      {
        key: "daily",
        title: "Meta diaria",
        data: data.goalCadence.daily,
        accent: "#178a4a",
      },
      {
        key: "weekly",
        title: "Meta semanal",
        data: data.goalCadence.weekly,
        accent: "#0f766e",
      },
      {
        key: "monthly",
        title: "Meta mensal",
        data: data.goalCadence.monthly,
        accent: "#1d4ed8",
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

  const progressText = `Estamos no dia ${data.periodProgress.elapsedDays} de ${data.periodProgress.totalDays}. As metas abaixo acompanham esse mesmo recorte operacional.`;
  const openKanban = () => history.push("/kanban");
  const openAgenda = () => history.push("/appointments");

  return (
    <Box className={classes.root}>
      <ContextPageHeader
        title="Dashboard Kanban"
        subtitle="Painel operacional do funil com foco em reunioes, conversoes e distribuicao por etapa."
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
              Dashboard operacional do Kanban com leitura por escopo
            </Typography>
            <Box mt={1.5}>
              <Typography style={{ opacity: 0.88, lineHeight: 1.6 }}>
                {data.filters.scope === "company"
                  ? "O admin acompanha a operacao completa da equipe. Os dados abaixo mostram o que a empresa precisa atingir neste periodo para bater as metas comerciais."
                  : `Voce esta vendo apenas os seus numeros em ${data.filters.scopeLabel}. Os dados abaixo mostram as metas que voce precisa alcancar neste periodo.`}
              </Typography>
            </Box>
            <Box mt={2} display="flex" flexWrap="wrap" gridGap={8}>
              <Chip label={`Periodo: ${data.periodProgress.label}`} />
              <Chip label={`Escopo: ${data.filters.scopeLabel}`} />
              <Chip
                label={`Meta de reunioes agendadas: ${number(data.targets.meetingsScheduled.current)}`}
              />
              <Chip
                label={`Meta de reunioes realizadas: ${number(data.targets.meetingsCompleted.current)}`}
              />
              <Chip
                label={`Meta de conversoes: ${number(data.targets.conversions.current)}`}
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
                  Ritmo operacional do periodo
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
              <Box mt={2}>
                <Typography
                  style={{
                    fontSize: "0.86rem",
                    fontWeight: 900,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    opacity: 0.8,
                  }}
                >
                  Metas que precisam ser alcancadas neste periodo
                </Typography>
                <Typography
                  variant="body2"
                  style={{ opacity: 0.92, marginTop: 4, lineHeight: 1.5 }}
                >
                  Estes indicadores representam o que a operacao precisa
                  entregar no recorte atual. Eles servem como norte para o
                  funil, para a agenda e para a conversao.
                </Typography>
              </Box>
              <Box mt={2} display="flex" flexWrap="wrap" gridGap={8}>
                <Box className={classes.metricBadge}>
                  <span className={classes.metricBadgeLabel}>
                    Meta de reunioes agendadas
                  </span>
                  <span className={classes.metricBadgeValue}>
                    {number(data.targets.meetingsScheduled.current)}
                  </span>
                </Box>
                <Box className={classes.metricBadge}>
                  <span className={classes.metricBadgeLabel}>
                    Meta de reunioes realizadas
                  </span>
                  <span className={classes.metricBadgeValue}>
                    {number(data.targets.meetingsCompleted.current)}
                  </span>
                </Box>
                <Box className={classes.metricBadge}>
                  <span className={classes.metricBadgeLabel}>
                    Meta de conversoes
                  </span>
                  <span className={classes.metricBadgeValue}>
                    {number(data.targets.conversions.current)}
                  </span>
                </Box>
                <Box className={classes.metricBadge}>
                  <span className={classes.metricBadgeLabel}>
                    Leads ativos no funil
                  </span>
                  <span className={classes.metricBadgeValue}>
                    {number(data.leads.activeInPipeline)}
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
          {operationalSummary.map((item) => (
            <Grid item xs={12} md={6} lg={4} key={item.key}>
              <OperationalMetricCard
                classes={classes}
                title={item.title}
                value={item.value}
                helper={item.helper}
                icon={item.icon}
                accent={item.accent}
                progress={item.progress}
                targetLabel={item.targetLabel}
                actionLabel={item.actionLabel}
                onAction={
                  item.key === "meetings-total" ||
                  item.key === "scheduled" ||
                  item.key === "completed"
                    ? openAgenda
                    : openKanban
                }
              />
            </Grid>
          ))}

          {goalCadenceCards.map((item) => (
            <Grid item xs={12} md={4} key={item.key}>
              <GoalCadenceCard
                classes={classes}
                title={item.title}
                data={item.data}
                accent={item.accent}
              />
            </Grid>
          ))}

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
                              {number(stage.currentLeadCount)}
                            </Typography>
                            <Typography
                              className={classes.highlightedStageMeta}
                            >
                              Leads atualmente nesta etapa
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
                              Oportunidades abertas:{" "}
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
                    Distribuicao por etapa do funil
                  </Typography>
                  <Typography className={classes.hint}>
                    Leitura do funil ativo separando leads e oportunidades por
                    etapa.
                  </Typography>
                </Box>
                <Chip
                  icon={<ViewKanban />}
                  label={`${data.pipelineHealth.overview.totalStages} etapas monitoradas`}
                />
              </Box>

              {data.emptyStates.pipeline || !stageDistributionChart ? (
                <EmptyState
                  icon={
                    <ViewKanban style={{ fontSize: 42, color: "#178a4a" }} />
                  }
                  title="Sem distribuicao para mostrar"
                  description="Nao encontramos etapas com volume suficiente no filtro atual. Vale ampliar o periodo ou revisar o funil ativo."
                  buttonLabel="Ir para o Kanban"
                  onClick={openKanban}
                />
              ) : (
                <>
                  <ReactApexChart
                    options={stageDistributionChart.options}
                    series={stageDistributionChart.series}
                    type="bar"
                    height={340}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Box className={classes.stage}>
                        <Typography className={classes.label}>
                          Resumo do funil
                        </Typography>
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
                            Leads no funil:{" "}
                            <strong>
                              {number(
                                data.pipelineHealth.overview.totalCurrentLeads,
                              )}
                            </strong>
                          </Typography>
                          <Typography variant="body2" className={classes.hint}>
                            Oportunidades abertas:{" "}
                            <strong>
                              {number(
                                data.pipelineHealth.overview
                                  .totalCurrentOpportunities,
                              )}
                            </strong>
                          </Typography>
                          <Typography variant="body2" className={classes.hint}>
                            Entradas no periodo:{" "}
                            <strong>
                              {number(
                                data.pipelineHealth.overview
                                  .totalEnteredInPeriod,
                              )}
                            </strong>
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <Box className={classes.stage}>
                        <Typography className={classes.label}>
                          Leitura rapida
                        </Typography>
                        <Box mt={1}>
                          <Typography variant="body2" className={classes.hint}>
                            O grafico mostra onde o volume do funil esta
                            concentrado e ajuda a identificar gargalos por
                            etapa.
                          </Typography>
                          <Typography variant="body2" className={classes.hint}>
                            Score medio das etapas:{" "}
                            <strong>
                              {percent(
                                data.pipelineHealth.overview.averageStageScore,
                              )}
                            </strong>
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
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
                    Totais por etapa
                  </Typography>
                  <Typography className={classes.hint}>
                    Resumo compacto do pipeline selecionado.
                  </Typography>
                </Box>
                <Chip
                  label={`${data.pipelineHealth.overview.totalStages} etapas`}
                />
              </Box>

              {data.emptyStates.pipeline ? (
                <EmptyState
                  icon={
                    <ViewKanban style={{ fontSize: 42, color: "#178a4a" }} />
                  }
                  title="Pipeline sem dados"
                  description="Nao encontramos volume ativo no funil atual para montar o resumo operacional."
                  buttonLabel="Ir para o Kanban"
                  onClick={openKanban}
                />
              ) : (
                <Box display="flex" flexDirection="column" gridGap={12}>
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
                          Leads no estagio:{" "}
                          <strong>{stage.currentLeadCount}</strong>
                        </Typography>
                        <Typography variant="body2" className={classes.hint}>
                          Oportunidades abertas:{" "}
                          <strong>{stage.currentOpportunityCount}</strong>
                        </Typography>
                        <Typography variant="body2" className={classes.hint}>
                          Entradas no periodo:{" "}
                          <strong>{stage.enteredInPeriod}</strong>
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
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
                    {data.filters.canSelectUsers
                      ? "Comparativo operacional da equipe"
                      : "Seu resumo operacional"}
                  </Typography>
                  <Typography className={classes.hint}>
                    {data.filters.canSelectUsers
                      ? "Area exclusiva do admin para acompanhar a equipe sem expor dados fora do escopo permitido."
                      : "Leitura simplificada do seu desempenho dentro do mesmo filtro do Kanban."}
                  </Typography>
                </Box>
                <Chip
                  icon={<Group />}
                  label={`${data.performance.sellerRanking.length} ${data.filters.canSelectUsers ? "vendedores" : "usuario"}`}
                />
              </Box>

              {teamPerformanceChart ? (
                <>
                  <ReactApexChart
                    options={teamPerformanceChart.options}
                    series={teamPerformanceChart.series}
                    type="bar"
                    height={320}
                  />
                  <Grid container spacing={2}>
                    {data.performance.sellerRanking.slice(0, 6).map((item) => (
                      <Grid item xs={12} md={4} key={item.sellerId}>
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
                              label={`${number(item.operationalScore)} pts`}
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
                              Leads gerados:{" "}
                              <strong>{number(item.generatedLeads)}</strong>
                            </Typography>
                            <Typography
                              variant="body2"
                              className={classes.hint}
                            >
                              Reunioes agendadas:{" "}
                              <strong>{number(item.meetingsScheduled)}</strong>
                            </Typography>
                            <Typography
                              variant="body2"
                              className={classes.hint}
                            >
                              Reunioes realizadas:{" "}
                              <strong>{number(item.meetingsCompleted)}</strong>
                            </Typography>
                            <Typography
                              variant="body2"
                              className={classes.hint}
                            >
                              Leads convertidos:{" "}
                              <strong>{number(item.conversions)}</strong>
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              ) : (
                <EmptyState
                  icon={<Group style={{ fontSize: 42, color: "#178a4a" }} />}
                  title="Sem dados operacionais suficientes"
                  description="Ainda nao encontramos movimentacao suficiente para montar o comparativo do periodo selecionado."
                  buttonLabel="Abrir CRM Kanban"
                  onClick={openKanban}
                />
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
                  label={`${stage.name} - ${stage.currentCards} cards - ${stage.currentLeadCount} lead(s)`}
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
            O admin pode definir as metas operacionais de reunioes agendadas,
            reunioes realizadas e conversoes. Cada vendedor herda a leitura do
            proprio dashboard, sem permissao para editar estes dados.
          </Typography>

          <Box mt={3} className={classes.dialogBlock}>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              Metas gerais da operacao
            </Typography>
            <Box mt={2}>
              <Grid container spacing={2}>
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
