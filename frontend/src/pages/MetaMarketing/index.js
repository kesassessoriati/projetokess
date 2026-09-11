import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import AddIcon from "@material-ui/icons/Add";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import LaunchIcon from "@material-ui/icons/Launch";
import LinkOffIcon from "@material-ui/icons/LinkOff";
import AccountTreeIcon from "@material-ui/icons/AccountTree";
import RefreshIcon from "@material-ui/icons/Refresh";
import WarningIcon from "@material-ui/icons/Warning";
import Skeleton from "@material-ui/lab/Skeleton";
import { toast } from "react-toastify";
import api from "../../services/api";
import { asMinorUnits, formatMinorCurrency } from "./pilotUtils";

const useStyles = makeStyles((theme) => ({
  root: { maxWidth: 980, margin: "0 auto", padding: theme.spacing(3) },
  header: { display: "flex", gap: theme.spacing(2), justifyContent: "space-between", alignItems: "flex-start", marginBottom: theme.spacing(3) },
  titleRow: { display: "flex", gap: theme.spacing(1.5), alignItems: "center" },
  icon: { width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "#1877F2", color: "#fff" },
  info: { border: "1px solid #1877F2", padding: theme.spacing(1.5, 2), marginBottom: theme.spacing(2), background: theme.palette.type === "dark" ? "rgba(24,119,242,.12)" : "#EFF6FF", borderRadius: 6 },
  connection: { marginBottom: theme.spacing(2), border: `1px solid ${theme.palette.divider}` },
  connectionHeader: { display: "flex", gap: theme.spacing(2), justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" },
  actions: { display: "flex", gap: theme.spacing(1), flexWrap: "wrap" },
  empty: { padding: theme.spacing(5, 2), textAlign: "center", color: theme.palette.text.secondary },
  linkBox: { display: "flex", gap: theme.spacing(1), alignItems: "center", padding: theme.spacing(1), wordBreak: "break-all", background: theme.palette.background.default, borderRadius: 6 },
  account: { display: "flex", alignItems: "center", borderBottom: `1px solid ${theme.palette.divider}`, padding: theme.spacing(.5, 0) },
  accountMeta: { color: theme.palette.text.secondary, fontSize: 12 },
  dashboard: { marginBottom: theme.spacing(3), padding: theme.spacing(2) },
  filters: { display: "flex", gap: theme.spacing(1), flexWrap: "wrap", alignItems: "center", margin: theme.spacing(2, 0) },
  filter: { minWidth: 160, flex: "1 1 160px" },
  metric: { padding: theme.spacing(1.5), height: "100%", border: `1px solid ${theme.palette.divider}` },
  metricLabel: { color: theme.palette.text.secondary, fontSize: 12, marginBottom: theme.spacing(.5) },
  conventions: { display: "flex", gap: theme.spacing(1), flexWrap: "wrap", marginTop: theme.spacing(2) },
  metricsTable: { marginTop: theme.spacing(2), overflowX: "auto" },
  warning: { display: "flex", gap: theme.spacing(1), alignItems: "center", padding: theme.spacing(1), marginTop: theme.spacing(2), color: theme.palette.warning.dark, background: theme.palette.type === "dark" ? "rgba(255, 152, 0, .12)" : "#FFF8E1" },
  pilotNotice: { marginTop: theme.spacing(1), padding: theme.spacing(1.5), background: theme.palette.type === "dark" ? "rgba(255, 193, 7, .12)" : "#FFF8E1", border: `1px solid ${theme.palette.warning.light}`, borderRadius: 6 },
  pilotStatus: { marginTop: theme.spacing(2), padding: theme.spacing(1.5), background: theme.palette.background.default, borderRadius: 6 }
}));

const formatExpiry = (value) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value)) : "sem data informada";
const formatTimestamp = (value) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "sem sincronização";
const dateInput = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const initialDashboardFilters = () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  return { periodStart: dateInput(start), periodEnd: dateInput(today), crmClientId: "", adAccountId: "", campaignId: "" };
};
const formatInteger = (value) => new Intl.NumberFormat("pt-BR").format(BigInt(String(value ?? "0")));
const formatDecimal = (value, digits = 2) => {
  const [whole = "0", fraction = ""] = String(value ?? "0").split(".");
  return `${formatInteger(whole)}${digits && fraction ? `,${fraction.padEnd(digits, "0").slice(0, digits)}` : ""}`;
};
const formatCurrency = (value, currency) => `${currency || "BRL"} ${formatDecimal(value)}`;
const pilotStatusLabel = {
  requested: "solicitada", validating: "validando", creating_campaign: "criando campanha",
  creating_adset: "criando conjunto", creating_ad: "criando anúncio", completed: "concluída",
  unknown: "reconciliação necessária", failed: "falhou"
};
const pilotErrorMessage = (code) => ({
  META_MARKETING_RECONCILIATION_REQUIRES_MANUAL_REVIEW: "A reconciliação requer revisão manual. Não inicie outra criação.",
  META_MARKETING_CREATION_IN_PROGRESS: "A solicitação já está em processamento.",
  META_MARKETING_REAUTHORIZATION_REQUIRED: "A conexão Meta precisa ser reautorizada.",
  META_MARKETING_SPEND_CAP_REQUIRED: "A conta não tem teto de gasto ou saldo disponível para esse orçamento.",
  META_MARKETING_CREATION_REQUEST_NOT_EXECUTABLE: "Esta solicitação não pode mais ser executada. Consulte o estado.",
  META_MARKETING_CREATION_EXECUTION_FAILED: "A criação não foi concluída. Consulte o estado antes de tentar novamente."
}[code] || code || "Consulte o estado antes de iniciar uma nova criação.");
const initialPilotDraft = () => ({
  adAccountId: "", campaignName: "", adSetName: "", adName: "", dailyBudget: "",
  pageId: "", creativeId: "", pixelId: "", countries: "BR", ageMin: "18", ageMax: "65",
  publisherPlatforms: ["facebook"], specialAdCategories: ["NONE"]
});
const newIdempotencyKey = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
  else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, item => item.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const MetaMarketingPage = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [connections, setConnections] = useState([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [authorizationUrl, setAuthorizationUrl] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [accountDialog, setAccountDialog] = useState({ open: false, connection: null });
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [savingAccounts, setSavingAccounts] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState(null);
  const [dashboardFilters, setDashboardFilters] = useState(initialDashboardFilters);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardOptions, setDashboardOptions] = useState({ advertisers: [], accounts: [], campaigns: [] });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);
  const dashboardRequest = useRef(0);
  const [pilotDialogOpen, setPilotDialogOpen] = useState(false);
  const [pilotDraft, setPilotDraft] = useState(initialPilotDraft);
  const [pilotPreflight, setPilotPreflight] = useState(null);
  const [pilotChecking, setPilotChecking] = useState(false);
  const [pilotCreating, setPilotCreating] = useState(false);
  const [pilotConfirmed, setPilotConfirmed] = useState(false);
  const [pilotRequest, setPilotRequest] = useState(null);
  const [pilotReconciling, setPilotReconciling] = useState(false);
  const [pilotIdempotencyKey, setPilotIdempotencyKey] = useState("");

  const loadConnections = useCallback(async () => {
    try {
      const { data } = await api.get("/meta-marketing/connections");
      setConnections(data || []);
    } catch (error) {
      if (error.response?.status === 403) {
        setForbidden(true);
        return;
      }
      toast.error("Não foi possível carregar as conexões Meta.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  const loadDashboard = useCallback(async (filters) => {
    const requestId = ++dashboardRequest.current;
    setDashboardLoading(true);
    setDashboardError(false);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const { data } = await api.get("/meta-marketing/dashboard", { params });
      if (requestId !== dashboardRequest.current) return;
      setDashboard(data);
      if (!filters.crmClientId && !filters.adAccountId && !filters.campaignId) {
        setDashboardOptions({ advertisers: data.advertisers || [], accounts: data.accounts || [], campaigns: data.campaigns || [] });
      }
    } catch (error) {
      if (requestId !== dashboardRequest.current) return;
      if (error.response?.status === 403) setForbidden(true);
      else setDashboardError(true);
    } finally {
      if (requestId === dashboardRequest.current) setDashboardLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(dashboardFilters); }, [loadDashboard]);

  useEffect(() => {
    const oauth = new URLSearchParams(window.location.search).get("oauth");
    if (oauth === "connected") {
      toast.success("Autorização Meta concluída. Selecione as contas para confirmar.");
      loadConnections();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (oauth === "failed") {
      toast.error("A autorização Meta não foi concluída.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loadConnections]);

  const generateLink = async () => {
    setGeneratingLink(true);
    try {
      const { data } = await api.post("/meta-marketing/oauth/start");
      setAuthorizationUrl(data.authorizationUrl);
      setLinkDialogOpen(true);
    } catch (_) {
      toast.error("Não foi possível gerar o link de autorização.");
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(authorizationUrl);
      toast.success("Link copiado. Ele expira em 15 minutos.");
    } catch (_) {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const openAccounts = async (connection) => {
    setAccountDialog({ open: true, connection });
    setAccounts([]);
    setSelectedAccountIds([]);
    setAccountsLoading(true);
    try {
      const { data } = await api.get(`/meta-marketing/connections/${connection.id}/accounts`);
      setAccounts(data || []);
      setSelectedAccountIds((data || []).filter(account => account.selected).map(account => account.externalAccountId));
    } catch (_) {
      toast.error("Não foi possível consultar as contas disponíveis na Meta.");
      setAccountDialog({ open: false, connection: null });
    } finally {
      setAccountsLoading(false);
    }
  };

  const toggleAccount = (accountId) => {
    setSelectedAccountIds(current => current.includes(accountId)
      ? current.filter(id => id !== accountId)
      : [...current, accountId]);
  };

  const confirmAccounts = async () => {
    if (!selectedAccountIds.length) {
      toast.warn("Selecione ao menos uma conta de anúncio.");
      return;
    }
    setSavingAccounts(true);
    try {
      await api.post(`/meta-marketing/connections/${accountDialog.connection.id}/accounts`, { accountIds: selectedAccountIds });
      toast.success("Contas confirmadas para sincronização.");
      setAccountDialog({ open: false, connection: null });
      loadConnections();
      loadDashboard(dashboardFilters);
    } catch (_) {
      toast.error("As contas não puderam ser confirmadas.");
    } finally {
      setSavingAccounts(false);
    }
  };

  const disconnect = async (connection) => {
    if (!window.confirm("Desconectar esta autorização? Novas sincronizações serão interrompidas.")) return;
    setDisconnectingId(connection.id);
    try {
      await api.post(`/meta-marketing/connections/${connection.id}/disconnect`);
      toast.success("Conexão desconectada.");
      loadConnections();
      loadDashboard(dashboardFilters);
    } catch (_) {
      toast.error("A conexão não pôde ser desconectada.");
    } finally {
      setDisconnectingId(null);
    }
  };

  const applyDashboardFilters = () => loadDashboard(dashboardFilters);
  const updateDashboardFilter = (field) => (event) => setDashboardFilters(current => ({
    ...current,
    [field]: event.target.value,
    ...(["crmClientId", "adAccountId"].includes(field) ? { ...(field === "crmClientId" ? { adAccountId: "" } : {}), campaignId: "" } : {})
  }));
  const dashboardAdvertisers = dashboardOptions.advertisers.length ? dashboardOptions.advertisers : dashboard?.advertisers || [];
  const dashboardAccounts = dashboardOptions.accounts.length ? dashboardOptions.accounts : dashboard?.accounts || [];
  const dashboardCampaigns = (dashboardOptions.campaigns.length ? dashboardOptions.campaigns : dashboard?.campaigns || [])
    .filter(campaign => !dashboardFilters.adAccountId || String(campaign.adAccountId) === dashboardFilters.adAccountId);
  const dashboardSummaries = dashboard?.summaries || [];
  const reauthorizationRequired = (dashboard?.accounts || []).some(account => account.connectionStatus === "reauthorization_required");
  const pilotAccounts = dashboardAccounts.filter(account => !dashboardFilters.crmClientId || String(account.crmClientId) === dashboardFilters.crmClientId);
  const selectedPilotAccount = pilotAccounts.find(account => String(account.id) === pilotDraft.adAccountId);

  const updatePilotDraft = (field) => (event) => {
    const value = event.target.value;
    setPilotPreflight(null);
    setPilotRequest(null);
    setPilotConfirmed(false);
    setPilotIdempotencyKey(newIdempotencyKey());
    setPilotDraft(current => ({ ...current, [field]: value }));
  };

  const togglePilotPlacement = (placement) => () => {
    setPilotPreflight(null);
    setPilotConfirmed(false);
    setPilotIdempotencyKey(newIdempotencyKey());
    setPilotDraft(current => ({
      ...current,
      publisherPlatforms: current.publisherPlatforms.includes(placement)
        ? current.publisherPlatforms.filter(item => item !== placement)
        : [...current.publisherPlatforms, placement]
    }));
  };

  const buildPilotTemplate = () => {
    const dailyBudgetMinor = asMinorUnits(pilotDraft.dailyBudget);
    if (!dailyBudgetMinor || !pilotDraft.adAccountId) return null;
    return {
      templateVersion: "meta-pilot-v1",
      campaignName: pilotDraft.campaignName,
      adSetName: pilotDraft.adSetName,
      adName: pilotDraft.adName,
      objective: "OUTCOME_LEADS",
      dailyBudgetMinor,
      pageId: pilotDraft.pageId,
      creativeId: pilotDraft.creativeId,
      pixelId: pilotDraft.pixelId,
      specialAdCategories: pilotDraft.specialAdCategories,
      conversionLocation: "WEBSITE",
      conversionEvent: "LEAD",
      targeting: { countries: pilotDraft.countries.split(",").map(item => item.trim().toUpperCase()).filter(Boolean), ageMin: Number(pilotDraft.ageMin), ageMax: Number(pilotDraft.ageMax) },
      placements: { publisherPlatforms: pilotDraft.publisherPlatforms }
    };
  };

  const runPilotPreflight = async () => {
    const template = buildPilotTemplate();
    if (!template) {
      toast.warn("Informe conta e orçamento diário válido antes de pré-validar.");
      return;
    }
    setPilotChecking(true);
    setPilotPreflight(null);
    try {
      const { data } = await api.post("/meta-marketing/campaign-pilot/preflight", { adAccountId: Number(pilotDraft.adAccountId), template });
      setPilotPreflight(data);
      toast.success("Pré-validação concluída. Revise e confirme a criação pausada.");
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "A pré-validação bloqueou esta criação.");
    } finally {
      setPilotChecking(false);
    }
  };

  const refreshPilotRequest = async (requestId) => {
    if (!requestId) return null;
    setPilotReconciling(true);
    try {
      const { data } = await api.get(`/meta-marketing/campaign-pilot/requests/${requestId}`);
      setPilotRequest(data);
      return data;
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Não foi possível consultar o estado da solicitação.");
      return null;
    } finally {
      setPilotReconciling(false);
    }
  };

  const createPilot = async () => {
    const template = buildPilotTemplate();
    if (!template || !pilotPreflight || !pilotConfirmed || pilotRequest?.status === "completed") return;
    setPilotCreating(true);
    let requestId = pilotRequest?.id;
    try {
      const { data: request } = await api.post("/meta-marketing/campaign-pilot/requests", {
        adAccountId: Number(pilotDraft.adAccountId), template
      }, { headers: { "Idempotency-Key": pilotIdempotencyKey } });
      requestId = request.id;
      setPilotRequest(request);
      const { data: executed } = await api.post(`/meta-marketing/campaign-pilot/requests/${request.id}/execute`);
      setPilotRequest(executed);
      toast.success("Solicitação processada. Os objetos criados permanecem pausados.");
    } catch (error) {
      const status = error.response?.data;
      if (requestId) {
        const refreshed = await refreshPilotRequest(requestId);
        if (!refreshed) setPilotRequest({ id: requestId, status: "unknown", errorCode: status?.error || status?.message || "Não foi possível concluir a criação." });
        if (refreshed?.status === "completed") toast.success("A solicitação foi concluída. Os objetos permanecem pausados.");
        else toast.warn("A execução não confirmou uma resposta. Consulte o estado antes de qualquer nova criação.");
      } else {
        setPilotRequest(status?.id ? status : { status: "unknown", errorCode: status?.error || status?.message || "Não foi possível concluir a criação." });
        toast.error(status?.error || status?.message || "Não foi possível criar a solicitação pausada.");
      }
    } finally {
      setPilotCreating(false);
    }
  };

  const openPilotDialog = () => {
    setPilotDraft(initialPilotDraft());
    setPilotPreflight(null);
    setPilotRequest(null);
    setPilotConfirmed(false);
    setPilotIdempotencyKey(newIdempotencyKey());
    setPilotDialogOpen(true);
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Box>
          <Box className={classes.titleRow}>
            <Box className={classes.icon}><AccountTreeIcon /></Box>
            <Box>
              <Typography variant="h5">Marketing Meta</Typography>
              <Typography color="textSecondary">Conecte e confirme contas de anúncio sem compartilhar acesso humano.</Typography>
            </Box>
          </Box>
        </Box>
        <Box className={classes.actions}>
          <Button color="primary" variant="outlined" onClick={openPilotDialog} disabled={loading || forbidden || !pilotAccounts.length}>Criar campanha-piloto</Button>
          <Button color="primary" variant="contained" startIcon={<AddIcon />} onClick={generateLink} disabled={generatingLink || loading || forbidden}>
            {generatingLink ? "Gerando…" : "Gerar link"}
          </Button>
        </Box>
      </Box>

      <Paper className={classes.info} elevation={0}>
        <Typography variant="body2"><strong>Como funciona:</strong> envie o link temporário ao administrador do ativo Meta. Depois da autorização, confirme nesta tela as contas que devem entrar na sincronização.</Typography>
      </Paper>

      {!forbidden && <Paper className={classes.dashboard} variant="outlined">
        <Box className={classes.connectionHeader}>
          <Box>
            <Typography variant="h6">Visão de desempenho</Typography>
            <Typography variant="body2" color="textSecondary">Dados já sincronizados. Abrir esta tela não consulta a Meta.</Typography>
          </Box>
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => loadDashboard(dashboardFilters)} disabled={dashboardLoading}>Atualizar</Button>
        </Box>
        <Box className={classes.filters}>
          <TextField className={classes.filter} label="Início" type="date" value={dashboardFilters.periodStart} onChange={updateDashboardFilter("periodStart")} InputLabelProps={{ shrink: true }} inputProps={{ max: dashboardFilters.periodEnd }} />
          <TextField className={classes.filter} label="Fim" type="date" value={dashboardFilters.periodEnd} onChange={updateDashboardFilter("periodEnd")} InputLabelProps={{ shrink: true }} inputProps={{ min: dashboardFilters.periodStart }} />
          <TextField className={classes.filter} select label="Anunciante" value={dashboardFilters.crmClientId} onChange={updateDashboardFilter("crmClientId")}>
            <MenuItem value="">Todos os anunciantes</MenuItem>
            {dashboardAdvertisers.map(advertiser => <MenuItem key={advertiser.id} value={String(advertiser.id)}>{advertiser.companyName || advertiser.name}</MenuItem>)}
          </TextField>
          <TextField className={classes.filter} select label="Conta de anúncio" value={dashboardFilters.adAccountId} onChange={updateDashboardFilter("adAccountId")}>
            <MenuItem value="">Todas as contas</MenuItem>
            {dashboardAccounts.filter(account => !dashboardFilters.crmClientId || String(account.crmClientId) === dashboardFilters.crmClientId).map(account => <MenuItem key={account.id} value={String(account.id)}>{account.name}</MenuItem>)}
          </TextField>
          <TextField className={classes.filter} select label="Campanha" value={dashboardFilters.campaignId} onChange={updateDashboardFilter("campaignId")}>
            <MenuItem value="">Todas as campanhas</MenuItem>
            {dashboardCampaigns.map(campaign => <MenuItem key={campaign.id} value={String(campaign.id)}>{campaign.name}</MenuItem>)}
          </TextField>
          <Button color="primary" variant="contained" onClick={applyDashboardFilters} disabled={dashboardLoading}>Aplicar</Button>
        </Box>

        {!dashboardLoading && !dashboardError && (reauthorizationRequired || dashboard?.isStale) && <Box className={classes.warning}><WarningIcon /><Typography variant="body2">{reauthorizationRequired ? "Uma conexão precisa ser reautorizada. As métricas exibidas permanecem históricas até a nova autorização." : "Os dados estão desatualizados há mais de 30 horas. Verifique a fila e a conexão Meta."}</Typography></Box>}
        {dashboardLoading ? <Grid container spacing={2}>{[1, 2, 3, 4].map(item => <Grid item xs={6} md={3} key={item}><Skeleton variant="rect" height={84} animation="wave" /></Grid>)}</Grid> : dashboardError ? (
          <Box className={classes.empty}><Typography variant="subtitle1">Não foi possível carregar as métricas.</Typography><Button color="primary" onClick={() => loadDashboard(dashboardFilters)}>Tentar novamente</Button></Box>
        ) : !dashboard?.metrics?.length ? (
          <Box className={classes.empty}><Typography variant="subtitle1">Ainda não há métricas para este período.</Typography><Typography variant="body2">Confirme uma conta e aguarde a primeira sincronização antes de analisar o desempenho.</Typography></Box>
        ) : <>
          {dashboardSummaries.map(summary => <Box key={`${summary.currency}:${summary.timezone}:${summary.attributionWindow}:${summary.resultActionType}`} style={{ marginTop: dashboardSummaries.length > 1 ? 16 : 0 }}>
            {dashboardSummaries.length > 1 && <Typography variant="subtitle2">{summary.currency} · {summary.timezone} · {summary.attributionWindow} · {summary.resultActionType || "resultado não informado"}</Typography>}
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}><Paper className={classes.metric} elevation={0}><Typography className={classes.metricLabel}>Investimento</Typography><Typography variant="h6">{formatCurrency(summary.spend, summary.currency)}</Typography></Paper></Grid>
              <Grid item xs={6} md={3}><Paper className={classes.metric} elevation={0}><Typography className={classes.metricLabel}>Resultados</Typography><Typography variant="h6">{formatDecimal(summary.resultValue)}</Typography></Paper></Grid>
              <Grid item xs={6} md={3}><Paper className={classes.metric} elevation={0}><Typography className={classes.metricLabel}>Impressões</Typography><Typography variant="h6">{formatInteger(summary.impressions)}</Typography></Paper></Grid>
              <Grid item xs={6} md={3}><Paper className={classes.metric} elevation={0}><Typography className={classes.metricLabel}>Cliques</Typography><Typography variant="h6">{formatInteger(summary.clicks)}</Typography></Paper></Grid>
            </Grid>
            <Box className={classes.conventions}>
              <Chip size="small" label={`CTR ${summary.ctr || "—"}%`} />
              <Chip size="small" label={`CPC ${summary.cpc ? formatCurrency(summary.cpc, summary.currency) : "—"}`} />
              <Chip size="small" label={`CPM ${summary.cpm ? formatCurrency(summary.cpm, summary.currency) : "—"}`} />
            </Box>
          </Box>)}
          <Box className={classes.conventions}>
            <Chip size="small" label={`Fuso: ${(dashboard.conventions.timezones || []).join(", ") || "não informado"}`} />
            <Chip size="small" label={`Atualizado: ${formatTimestamp(dashboard.lastSyncedAt)}`} />
          </Box>
          <Box className={classes.metricsTable}>
            <Table size="small" aria-label="Série diária de métricas Meta">
              <TableHead><TableRow><TableCell>Data</TableCell><TableCell>Campanha</TableCell><TableCell align="right">Investimento</TableCell><TableCell align="right">Resultados</TableCell><TableCell align="right">Impressões</TableCell><TableCell align="right">Alcance diário</TableCell><TableCell align="right">Cliques</TableCell></TableRow></TableHead>
              <TableBody>{dashboard.metrics.map(metric => {
                const campaign = dashboardCampaigns.find(item => item.id === metric.campaignId);
                return <TableRow key={metric.id}><TableCell>{new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${metric.statDate}T00:00:00Z`))}</TableCell><TableCell>{campaign?.name || "Campanha removida"}</TableCell><TableCell align="right">{formatCurrency(metric.spend, metric.currency)}</TableCell><TableCell align="right">{formatDecimal(metric.resultValue)}</TableCell><TableCell align="right">{formatInteger(metric.impressions)}</TableCell><TableCell align="right">{formatInteger(metric.reach)}</TableCell><TableCell align="right">{formatInteger(metric.clicks)}</TableCell></TableRow>;
              })}</TableBody>
            </Table>
          </Box>
        </>}
      </Paper>}

      {loading ? <Box className={classes.empty}><CircularProgress size={28} /></Box> : forbidden ? (
        <Paper className={classes.empty} variant="outlined">
          <Typography variant="h6">Marketing Meta não está disponível para este usuário</Typography>
          <Typography variant="body2">A Company precisa habilitar leitura e incluir seu usuário na allowlist.</Typography>
        </Paper>
      ) : connections.length === 0 ? (
        <Paper className={classes.empty} variant="outlined">
          <Typography variant="h6">Nenhuma conexão Meta ainda</Typography>
          <Typography variant="body2">Gere um link para começar. O token não é exibido nem fica disponível no navegador.</Typography>
        </Paper>
      ) : connections.map(connection => (
        <Card className={classes.connection} key={connection.id} variant="outlined">
          <CardContent>
            <Box className={classes.connectionHeader}>
              <Box>
                <Typography variant="subtitle1">Autorização #{connection.id}</Typography>
                <Typography className={classes.accountMeta}>Expiração do token: {formatExpiry(connection.tokenExpiresAt)}</Typography>
                <Typography className={classes.accountMeta}>Contas confirmadas: {connection.selectedAccountCount || 0}</Typography>
              </Box>
              <Box className={classes.actions}>
                <Chip size="small" color={connection.status === "connected" ? "primary" : "default"} label={connection.status === "connected" ? "Conectada" : connection.status === "reauthorization_required" ? "Reautorização necessária" : "Revogada"} />
                {connection.status === "connected" && <>
                  <Button size="small" startIcon={<AccountTreeIcon />} onClick={() => openAccounts(connection)}>Selecionar contas</Button>
                  <Button size="small" startIcon={<LinkOffIcon />} onClick={() => disconnect(connection)} disabled={disconnectingId === connection.id}>Desconectar</Button>
                </>}
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}

      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Link temporário de autorização</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" paragraph>Envie este link somente ao administrador da conta Meta. Ele expira em 15 minutos e pode ser usado uma única vez.</Typography>
          <Box className={classes.linkBox}>
            <Typography variant="caption" style={{ flex: 1 }}>{authorizationUrl}</Typography>
            <Tooltip title="Copiar link"><IconButton aria-label="Copiar link" onClick={copyLink}><FileCopyIcon /></IconButton></Tooltip>
            <Tooltip title="Abrir login Meta"><IconButton aria-label="Abrir login Meta" component="a" href={authorizationUrl} target="_blank" rel="noopener noreferrer"><LaunchIcon /></IconButton></Tooltip>
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={() => setLinkDialogOpen(false)}>Fechar</Button></DialogActions>
      </Dialog>

      <Dialog open={accountDialog.open} onClose={() => setAccountDialog({ open: false, connection: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar contas de anúncio</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" paragraph>Somente as contas marcadas entrarão na sincronização. A lista vem diretamente da Meta.</Typography>
          {accountsLoading ? <Box className={classes.empty}><CircularProgress size={28} /></Box> : accounts.map(account => (
            <Box key={account.externalAccountId} className={classes.account}>
              <FormControlLabel
                control={<Checkbox checked={selectedAccountIds.includes(account.externalAccountId)} onChange={() => toggleAccount(account.externalAccountId)} color="primary" />}
                label={<Box><Typography variant="body2">{account.name}</Typography><Typography className={classes.accountMeta}>{account.externalAccountId} · {account.currency} · {account.timezone}</Typography></Box>}
              />
            </Box>
          ))}
          {!accountsLoading && accounts.length === 0 && <Typography color="textSecondary">Nenhuma conta elegível foi retornada pela Meta.</Typography>}
        </DialogContent>
        <DialogActions className={classes.actions}>
          <Button onClick={() => setAccountDialog({ open: false, connection: null })}>Cancelar</Button>
          <Button color="primary" variant="contained" onClick={confirmAccounts} disabled={savingAccounts || accountsLoading}>{savingAccounts ? "Confirmando…" : "Confirmar selecionadas"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pilotDialogOpen} onClose={() => !pilotCreating && setPilotDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Criar campanha-piloto pausada</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary">Este fluxo cria exclusivamente Campanha, Conjunto e Anúncio com status pausado. Nenhum objeto será ativado automaticamente.</Typography>
          <Box className={classes.pilotNotice}>
            <Typography variant="body2"><strong>Antes de confirmar:</strong> valide Página, Pixel, criativo e teto de gasto da conta. O preflight consulta a Meta, mas não cria objetos.</Typography>
          </Box>
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth select required label="Conta de anúncio" value={pilotDraft.adAccountId} onChange={updatePilotDraft("adAccountId")}><MenuItem value="">Selecione</MenuItem>{pilotAccounts.map(account => <MenuItem key={account.id} value={String(account.id)}>{account.name} · {account.currency}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth required label={`Orçamento diário (${selectedPilotAccount?.currency || "moeda da conta"})`} value={pilotDraft.dailyBudget} onChange={updatePilotDraft("dailyBudget")} placeholder="Ex.: 10,00" helperText="Valor diário; será enviado em unidade menor à Meta." /></Grid>
            <Grid item xs={12}><TextField fullWidth required label="Nome da campanha" value={pilotDraft.campaignName} onChange={updatePilotDraft("campaignName")} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth required label="Nome do conjunto" value={pilotDraft.adSetName} onChange={updatePilotDraft("adSetName")} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth required label="Nome do anúncio" value={pilotDraft.adName} onChange={updatePilotDraft("adName")} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth required label="ID da Página" value={pilotDraft.pageId} onChange={updatePilotDraft("pageId")} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth required label="ID do Pixel" value={pilotDraft.pixelId} onChange={updatePilotDraft("pixelId")} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth required label="ID do criativo" value={pilotDraft.creativeId} onChange={updatePilotDraft("creativeId")} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth required label="Países (ISO, separados por vírgula)" value={pilotDraft.countries} onChange={updatePilotDraft("countries")} helperText="Ex.: BR, PT" /></Grid>
            <Grid item xs={6} sm={2}><TextField fullWidth required type="number" label="Idade mínima" value={pilotDraft.ageMin} onChange={updatePilotDraft("ageMin")} /></Grid>
            <Grid item xs={6} sm={2}><TextField fullWidth required type="number" label="Idade máxima" value={pilotDraft.ageMax} onChange={updatePilotDraft("ageMax")} /></Grid>
            <Grid item xs={12} sm={4}><Typography variant="body2" color="textSecondary">Posicionamentos</Typography><FormControlLabel control={<Checkbox checked={pilotDraft.publisherPlatforms.includes("facebook")} onChange={togglePilotPlacement("facebook")} color="primary" />} label="Facebook" /><FormControlLabel control={<Checkbox checked={pilotDraft.publisherPlatforms.includes("instagram")} onChange={togglePilotPlacement("instagram")} color="primary" />} label="Instagram" /></Grid>
          </Grid>
          {pilotPreflight && <Box className={classes.pilotStatus}><Chip size="small" color="primary" label="Pré-validação aprovada" /><Typography variant="body2" style={{ marginTop: 8 }}>Saldo disponível: {formatMinorCurrency(pilotPreflight.remainingSpendCap, pilotPreflight.currency)} · teto: {formatMinorCurrency(pilotPreflight.spendCap, pilotPreflight.currency)}</Typography></Box>}
          {pilotRequest && <Box className={classes.pilotStatus}><Chip size="small" color={pilotRequest.status === "completed" ? "primary" : "default"} label={`Estado: ${pilotStatusLabel[pilotRequest.status] || pilotRequest.status}`} /><Typography variant="body2" style={{ marginTop: 8 }}>{pilotRequest.status === "completed" ? "Campanha, conjunto e anúncio foram criados pausados." : pilotErrorMessage(pilotRequest.errorCode)}</Typography>{pilotRequest.id && pilotRequest.status !== "completed" && <Button size="small" color="primary" onClick={() => refreshPilotRequest(pilotRequest.id)} disabled={pilotCreating || pilotReconciling} style={{ marginTop: 8 }}>{pilotReconciling ? "Consultando…" : "Consultar estado"}</Button>}</Box>}
          <FormControlLabel control={<Checkbox checked={pilotConfirmed} onChange={event => setPilotConfirmed(event.target.checked)} color="primary" disabled={!pilotPreflight || pilotCreating || pilotRequest?.status === "completed"} />} label="Confirmo que esta criação deve ocorrer agora e que todos os objetos devem permanecer pausados." />
        </DialogContent>
        <DialogActions className={classes.actions}>
          <Button onClick={() => setPilotDialogOpen(false)} disabled={pilotCreating}>Cancelar</Button>
          <Button onClick={runPilotPreflight} disabled={pilotChecking || pilotCreating || pilotRequest?.status === "completed"}>{pilotChecking ? "Validando…" : "Pré-validar"}</Button>
          <Button color="primary" variant="contained" onClick={createPilot} disabled={!pilotPreflight || !pilotConfirmed || pilotCreating || pilotRequest?.status === "completed"}>{pilotCreating ? "Criando pausado…" : "Confirmar e criar pausada"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MetaMarketingPage;
