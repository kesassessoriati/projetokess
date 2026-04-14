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
  Psychology,
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
  { value: "month", label: "Mês" },
  { value: "quarter", label: "Trimestre" },
];

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value || 0),
  );

const number = (value) =>
  new Intl.NumberFormat("pt-BR").format(Number(value || 0));

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(4),
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f7fbfa 0%, #eef5f3 100%)",
  },
  hero: {
    padding: theme.spacing(3),
    borderRadius: 20,
    color: "#fff",
    background:
      "linear-gradient(135deg, #112c44 0%, #1d4d72 45%, #178a4a 100%)",
    boxShadow: "0 20px 40px rgba(17,44,68,0.18)",
  },
  filterBar: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2.5),
    borderRadius: 18,
    border: "1px solid #dceae5",
    background: "rgba(255,255,255,0.95)",
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
    lineHeight: 1.12,
    color: "#153047",
  },
  hint: {
    color: "#6b8192",
    fontSize: "0.88rem",
  },
  title: {
    fontWeight: 900,
    color: "#153047",
  },
  empty: {
    minHeight: 230,
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

const ExecutiveDashboard = () => {
  const classes = useStyles();
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [filters, setFilters] = useState({
    period: "month",
    dateFrom: "",
    dateTo: "",
    reportUserId: "",
    pipelineId: "",
  });
  const [goalForm, setGoalForm] = useState({
    globalTarget: "",
    teamTarget: "",
    sellerTargets: [],
  });

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

  const openGoals = () => {
    setGoalForm({
      globalTarget: String(data.targets.global || 0),
      teamTarget: String(data.targets.team || 0),
      sellerTargets: (data.targets.sellers || []).map((item) => ({
        ...item,
        target: String(item.target || 0),
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
      toast.error("Não foi possível salvar as metas.");
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
        <Typography>Não foi possível carregar o dashboard.</Typography>
      </Box>
    );
  }

  const progressText = `Estamos no dia ${data.periodProgress.elapsedDays} de ${data.periodProgress.totalDays} — esperado ${money(data.periodProgress.expectedRevenue)} até aqui.`;

  return (
    <Box className={classes.root}>
      <ContextPageHeader
        title="Dashboard CRM"
        subtitle="Visão executiva do funil, das metas e da performance comercial."
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
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography
              variant="h4"
              style={{ fontWeight: 900, letterSpacing: "-0.03em" }}
            >
              Dashboard comercial com metas reais e leitura por escopo
            </Typography>
            <Box mt={1}>
              <Typography style={{ opacity: 0.84 }}>
                {data.filters.scope === "company"
                  ? "Você está vendo a operação consolidada da empresa. Todos os cards seguem o mesmo filtro de período e o mesmo contexto de pipeline."
                  : `Você está vendo apenas a operação de ${data.filters.scopeLabel}, com métricas e metas filtradas automaticamente.`}
              </Typography>
            </Box>
            <Box mt={2} display="flex" flexWrap="wrap" gridGap={8}>
              <Chip label={data.periodProgress.label} />
              <Chip label={data.filters.scopeLabel} />
              <Chip label={`Meta atual ${money(data.targets.current)}`} />
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            <Typography style={{ fontWeight: 800 }}>Ritmo da meta</Typography>
            <Box mt={1}>
              <LinearProgress
                variant="determinate"
                value={data.periodProgress.elapsedPercentage}
                style={{ height: 10, borderRadius: 999 }}
              />
            </Box>
            <Box mt={1}>
              <Typography variant="body2" style={{ opacity: 0.88 }}>
                {progressText}
              </Typography>
            </Box>
            {data.filters.canEditGoals && (
              <Box mt={2} display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Edit />}
                  onClick={openGoals}
                >
                  Ajustar metas
                </Button>
              </Box>
            )}
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
          {data.filters.canSelectUsers && (
            <Grid item xs={12} md={2}>
              <FormControl variant="outlined" size="small" fullWidth>
                <InputLabel>Usuário</InputLabel>
                <Select
                  value={filters.reportUserId}
                  onChange={handleSelect("reportUserId")}
                  label="Usuário"
                >
                  <MenuItem value="">Visão geral</MenuItem>
                  {data.selectors.users.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
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
                    Forecast do período
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
                  Esperado até agora:{" "}
                  <strong>{money(data.periodProgress.expectedRevenue)}</strong>
                </Typography>
                <Typography className={classes.hint}>
                  Gap real até hoje:{" "}
                  <strong>{money(data.revenue.expectedToDateGap)}</strong>
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className={classes.darkCard}>
              <Typography
                className={classes.label}
                style={{ color: "rgba(255,255,255,0.70)" }}
              >
                ROI da inteligência
              </Typography>
              <Typography
                variant="h4"
                style={{ fontWeight: 900, marginTop: 10 }}
              >
                +{data.aiRoi.estimatedEfficiencyGain.toFixed(1)}%
              </Typography>
              <Box mt={2}>
                <Typography variant="body2" style={{ opacity: 0.84 }}>
                  Movimentações pela IA: {data.aiRoi.movementRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" style={{ opacity: 0.84 }}>
                  Precisão: {data.aiRoi.accuracyRate.toFixed(1)}%
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={3}>
            <Paper className={classes.card}>
              <EventAvailable style={{ color: "#8b5cf6", fontSize: 32 }} />
              <Box mt={1}>
                <Typography className={classes.label}>
                  Reuniões no período
                </Typography>
                <Typography className={classes.value}>
                  {number(data.meetings.scheduledInPeriod)}
                </Typography>
              </Box>
              <Box mt={2}>
                <Typography className={classes.hint}>
                  Futuras já cadastradas:{" "}
                  <strong>{number(data.meetings.upcoming)}</strong>
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className={classes.card}>
              <Timeline style={{ color: "#0ea5e9", fontSize: 32 }} />
              <Box mt={1}>
                <Typography className={classes.label}>Leads gerados</Typography>
                <Typography className={classes.value}>
                  {number(data.leads.generated)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className={classes.card}>
              <EmojiEvents style={{ color: "#f59e0b", fontSize: 32 }} />
              <Box mt={1}>
                <Typography className={classes.label}>
                  Leads convertidos
                </Typography>
                <Typography className={classes.value}>
                  {number(data.leads.converted)}
                </Typography>
              </Box>
              <Box mt={2}>
                <Typography className={classes.hint}>
                  Conversão:{" "}
                  <strong>{data.leads.conversionRate.toFixed(1)}%</strong>
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className={classes.card}>
              <Timer style={{ color: "#14b8a6", fontSize: 32 }} />
              <Box mt={1}>
                <Typography className={classes.label}>Ciclo médio</Typography>
                <Typography className={classes.value}>
                  {data.performance.avgSalesCycle.toFixed(1)} dias
                </Typography>
              </Box>
              <Box mt={2}>
                <Typography className={classes.hint}>
                  Win rate:{" "}
                  <strong>{data.performance.winRate.toFixed(1)}%</strong>
                </Typography>
              </Box>
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
                  <Typography variant="h6" className={classes.title}>
                    Forecast por vendedor
                  </Typography>
                  <Typography className={classes.hint}>
                    Ordenado por percentual da meta, com valor absoluto ao lado.
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
                  description="Ainda não há carteira suficiente neste filtro para projetar receita. Vale abrir o Kanban e revisar as oportunidades ativas."
                  buttonLabel="Abrir CRM Kanban"
                  onClick={() => history.push("/kanban")}
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
                    {data.performance.sellerRanking.slice(0, 4).map((item) => (
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
                              Receita real:{" "}
                              <strong>{money(item.realRevenue)}</strong> |
                              Convertidos:{" "}
                              <strong>{item.convertedLeads}</strong>
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
                  <Typography variant="h6" className={classes.title}>
                    Saúde do pipeline
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
                  title="Pipeline sem dados no período"
                  description="Não encontramos cards ativos para o filtro atual. Vale ampliar o período ou revisar o funil."
                  buttonLabel="Ir para o Kanban"
                  onClick={() => history.push("/kanban")}
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
                        Entradas no período:{" "}
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
                          Entradas no período:{" "}
                          <strong>{stage.enteredInPeriod}</strong>
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
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Ajustar metas do dashboard CRM</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary">
            Aqui o admin consegue definir a meta geral, a meta da equipe e a
            meta individual de cada vendedor.
          </Typography>
          <Box mt={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Meta geral"
                  variant="outlined"
                  type="number"
                  fullWidth
                  value={goalForm.globalTarget}
                  onChange={(e) =>
                    setGoalForm((current) => ({
                      ...current,
                      globalTarget: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Meta da equipe"
                  variant="outlined"
                  type="number"
                  fullWidth
                  value={goalForm.teamTarget}
                  onChange={(e) =>
                    setGoalForm((current) => ({
                      ...current,
                      teamTarget: e.target.value,
                    }))
                  }
                />
              </Grid>
            </Grid>
          </Box>
          <Box mt={3}>
            <Typography variant="subtitle1" className={classes.title}>
              Metas por vendedor
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Vendedor</TableCell>
                  <TableCell align="right">Meta</TableCell>
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
                        value={seller.target}
                        onChange={(e) =>
                          setGoalForm((current) => ({
                            ...current,
                            sellerTargets: current.sellerTargets.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, target: e.target.value }
                                  : item,
                            ),
                          }))
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
