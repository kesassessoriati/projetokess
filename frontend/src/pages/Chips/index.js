import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import SimCardIcon from "@mui/icons-material/SimCard";
import AutorenewIcon from "@material-ui/icons/Autorenew";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import SaveIcon from "@material-ui/icons/Save";
import BatteryAlertIcon from "@mui/icons-material/BatteryAlert";
import { toast } from "react-toastify";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";

const useStyles = makeStyles(theme => ({
  root: {
    minHeight: "calc(100vh - 96px)",
    background: "radial-gradient(circle at top left, #eef8f1 0%, #e2efe7 44%, #d9e7df 100%)",
    color: "#173624",
    padding: 16
  },
  header: {
    borderRadius: 18,
    border: "1px solid #cfe2d5",
    background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,252,249,0.96) 100%)",
    boxShadow: "0 14px 32px rgba(16, 24, 40, 0.08)",
    padding: "16px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 14
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  titleIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    background: "linear-gradient(135deg, #dcfce7 0%, #c7f0d6 100%)",
    color: "#137b42",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: 800,
    color: "#173624"
  },
  subtitle: {
    fontSize: ".82rem",
    color: "#5d7d6b"
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #20a45a 0%, #157a43 100%)",
    color: "#fff",
    fontWeight: 700,
    borderRadius: 10,
    textTransform: "none"
  },
  secondaryBtn: {
    backgroundColor: "#f7fcf9",
    border: "1px solid #bfd7c7",
    color: "#1c5a35",
    fontWeight: 700,
    borderRadius: "10px",
    textTransform: "none"
  },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 14,
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
    },
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr"
    }
  },
  statCard: {
    borderRadius: 14,
    border: "1px solid #cfe2d5",
    background: "#fff",
    padding: 16,
    boxShadow: "0 10px 24px rgba(16,24,40,0.06)"
  },
  statLabel: {
    fontSize: 12,
    color: "#5d7d6b",
    textTransform: "uppercase",
    letterSpacing: ".5px",
    marginBottom: 6
  },
  statValue: {
    fontSize: 28,
    fontWeight: 800,
    color: "#173624"
  },
  alertsWrap: {
    display: "grid",
    gap: 10,
    marginBottom: 14
  },
  alertCard: {
    borderRadius: 14,
    border: "1px solid #f7d9b8",
    background: "linear-gradient(180deg, #fff7ed 0%, #fffbf5 100%)",
    padding: "12px 14px"
  },
  shell: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr)",
    gap: 14,
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "1fr"
    }
  },
  panel: {
    borderRadius: 16,
    border: "1px solid #cfe2d5",
    background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,248,0.98) 100%)",
    boxShadow: "0 18px 36px rgba(16,24,40,0.08)"
  },
  listHeader: {
    padding: "16px 18px",
    borderBottom: "1px solid #e7f0ea"
  },
  listTitle: {
    fontSize: 14,
    fontWeight: 800
  },
  chipList: {
    maxHeight: "calc(100vh - 280px)",
    overflowY: "auto"
  },
  chipRow: {
    padding: "14px 18px",
    borderBottom: "1px solid #e7f0ea",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#f2f8f4"
    }
  },
  chipRowActive: {
    background: "linear-gradient(135deg, #ebf8ef 0%, #f7fcf9 100%)",
    borderLeft: "4px solid #22ab5d"
  },
  chipName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#173624"
  },
  chipMeta: {
    fontSize: 12,
    color: "#5d7d6b",
    marginTop: 4
  },
  detailHeader: {
    padding: "18px 22px",
    borderBottom: "1px solid #e7f0ea",
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap"
  },
  detailBody: {
    padding: 22
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 18,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr"
    }
  },
  detailCard: {
    borderRadius: 12,
    border: "1px solid #d8e6dd",
    backgroundColor: "#fff",
    padding: 14
  },
  detailLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    color: "#6f897a",
    marginBottom: 6
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 800,
    color: "#173624"
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 800,
    textTransform: "uppercase",
    color: "#486556",
    marginBottom: 10
  },
  logWrap: {
    borderRadius: 12,
    border: "1px solid #d8e6dd",
    backgroundColor: "#f6fbf8",
    padding: 12,
    maxHeight: 300,
    overflowY: "auto"
  },
  logRow: {
    borderBottom: "1px solid #e5e7eb",
    padding: "8px 0",
    "&:last-child": {
      borderBottom: "none"
    }
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    paddingTop: 8,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr"
    }
  },
  healthBar: {
    marginTop: 8,
    borderRadius: 999,
    height: 10
  }
}));

const DEFAULT_FORM = {
  number: "",
  carrier: "",
  planType: "",
  lastRechargeAt: "",
  rechargePeriodicityDays: 30,
  rechargeValue: 0,
  whatsappId: "",
  device: "",
  responsible: "",
  activationDate: "",
  warmupLevel: 1,
  notes: ""
};

const LEVEL_LABELS = {
  1: "Novo",
  2: "Aquecendo",
  3: "Intermediario",
  4: "Maduro",
  5: "Estavel"
};

const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "—";
const formatDateTime = value => value ? new Date(value).toLocaleString("pt-BR") : "—";
const formatCurrency = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const isChannelSyncedChip = chip => chip?.syncSource === "whatsapp_channel";
const getChipPrimaryLabel = chip => chip?.number || chip?.sourceConnectionName || (chip?.sourceConnectionId ? `Conexao #${chip.sourceConnectionId}` : "Sem numero");
const getChipSourceSummary = chip => {
  const parts = [];
  if (chip?.sourceConnectionName && chip?.sourceConnectionName !== chip?.number) {
    parts.push(chip.sourceConnectionName);
  }
  if (!chip?.number) {
    parts.push("Sem numero");
  }
  if (chip?.sourceConnectionId) {
    parts.push(`ID ${chip.sourceConnectionId}`);
  }
  return parts.join(" • ");
};

const statusColor = status => ({
  active: { bg: "#dcfce7", color: "#166534" },
  disconnected: { bg: "#fee2e2", color: "#991b1b" },
  risk: { bg: "#fef3c7", color: "#92400e" },
  blocked: { bg: "#e5e7eb", color: "#374151" },
  inactive: { bg: "#e5e7eb", color: "#4b5563" }
}[status] || { bg: "#e5e7eb", color: "#4b5563" });

export default function Chips() {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { whatsApps } = useContext(WhatsAppsContext);
  const [dashboard, setDashboard] = useState(null);
  const [selectedChipId, setSelectedChipId] = useState(null);
  const [selectedChip, setSelectedChip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const isAdmin = user?.profile === "admin";
  const selectedChipData = selectedChip?.chip || null;
  const isSyncedEditing = isChannelSyncedChip(selectedChipData) && Boolean(editingId);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/chips/dashboard");
      setDashboard(data || null);
      const nextChips = Array.isArray(data?.chips) ? data.chips : [];
      if (!selectedChipId && nextChips[0]?.id) {
        setSelectedChipId(nextChips[0].id);
      } else if (selectedChipId && !nextChips.some(chip => chip.id === selectedChipId)) {
        setSelectedChipId(nextChips[0]?.id || null);
      }
    } catch (error) {
      toast.error("Erro ao carregar modulo de chips.");
    } finally {
      setLoading(false);
    }
  }, [selectedChipId]);

  const fetchDetail = useCallback(async chipId => {
    if (!chipId) return;
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/chips/${chipId}`);
      setSelectedChip(data || null);
    } catch (error) {
      toast.error("Erro ao carregar chip.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (selectedChipId) {
      fetchDetail(selectedChipId);
    }
  }, [selectedChipId, fetchDetail]);

  const chips = useMemo(() => Array.isArray(dashboard?.chips) ? dashboard.chips : [], [dashboard]);
  const alerts = useMemo(() => Array.isArray(dashboard?.alerts) ? dashboard.alerts : [], [dashboard]);
  const summary = dashboard?.summary || {};

  const openCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEdit = () => {
    if (!selectedChip?.chip) return;
    const chip = selectedChip.chip;
    setEditingId(chip.id);
    setForm({
      number: chip.number || "",
      carrier: chip.carrier || "",
      planType: chip.planType || "",
      lastRechargeAt: chip.lastRechargeAt || "",
      rechargePeriodicityDays: chip.rechargePeriodicityDays || 30,
      rechargeValue: chip.rechargeValue || 0,
      whatsappId: chip.whatsappId || "",
      device: chip.device || "",
      responsible: chip.responsible || "",
      activationDate: chip.activationDate || "",
      warmupLevel: chip.warmupLevel || 1,
      notes: chip.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.number.trim() && !isSyncedEditing) return toast.error("Informe o numero do chip.");
    setSaving(true);
    try {
      const payload = { ...form, whatsappId: form.whatsappId || null };
      if (editingId) {
        await api.put(`/chips/${editingId}`, payload);
        toast.success("Chip atualizado.");
      } else {
        await api.post("/chips", payload);
        toast.success("Chip cadastrado.");
      }
      setDialogOpen(false);
      fetchDashboard();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao salvar chip.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedChip?.chip?.id) return;
    if (!window.confirm(`Excluir chip ${getChipPrimaryLabel(selectedChip.chip)}?`)) return;
    try {
      await api.delete(`/chips/${selectedChip.chip.id}`);
      toast.success("Chip excluido.");
      setSelectedChipId(null);
      setSelectedChip(null);
      fetchDashboard();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao excluir chip.");
    }
  };

  const handleRefreshMonitoring = async () => {
    try {
      await api.post("/chips/monitoring/refresh");
      await fetchDashboard();
      if (selectedChipId) await fetchDetail(selectedChipId);
      toast.success("Monitoramento atualizado.");
    } catch (error) {
      toast.error("Erro ao atualizar monitoramento.");
    }
  };

  const renderDetail = () => {
    if (detailLoading) {
      return <Box p={5} textAlign="center"><CircularProgress size={28} /></Box>;
    }

    if (!selectedChip?.chip) {
      return (
        <Box p={5} textAlign="center">
          <Typography>Selecione um chip para visualizar detalhes.</Typography>
        </Box>
      );
    }

    const chip = selectedChip.chip;
    const colors = statusColor(chip.status);
    const session = (whatsApps || []).find(wa => wa.id === chip.whatsappId);
    const syncedByChannel = isChannelSyncedChip(chip);

    return (
      <>
        <Box className={classes.detailHeader}>
          <SimCardIcon style={{ color: "#15763f" }} />
          <Box>
            <Typography style={{ fontSize: 18, fontWeight: 800 }}>{getChipPrimaryLabel(chip)}</Typography>
            <Typography style={{ fontSize: 12, color: "#5d7d6b" }}>
              {[getChipSourceSummary(chip), chip.carrier || "Operadora nao informada", `Nivel ${chip.warmupLevel} (${LEVEL_LABELS[chip.warmupLevel]})`]
                .filter(Boolean)
                .join(" • ")}
            </Typography>
          </Box>
          <Chip
            label={chip.status}
            size="small"
            style={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 700, marginLeft: "auto" }}
          />
        </Box>

        <Box className={classes.detailBody}>
          <Box mb={2}>
            <Typography className={classes.sectionTitle}>Saude do chip</Typography>
            <Typography style={{ fontSize: 24, fontWeight: 800 }}>{chip.healthScore}%</Typography>
            <LinearProgress variant="determinate" value={Number(chip.healthScore) || 0} className={classes.healthBar} />
            <Typography style={{ fontSize: 12, color: "#6f897a", marginTop: 8 }}>
              Seguranca: {chip.blockingRiskLevel} • {chip.blockingRiskReason || "Sem alertas."}
            </Typography>
          </Box>

          <Box className={classes.detailGrid}>
            <Paper className={classes.detailCard} elevation={0}>
              <Typography className={classes.detailLabel}>Sessao WhatsApp</Typography>
              <Typography className={classes.detailValue}>{session?.name || chip.sourceConnectionName || (chip.whatsappId ? `Sessao #${chip.whatsappId}` : "Nao associada")}</Typography>
              <Typography style={{ fontSize: 12, color: "#6f897a", marginTop: 4 }}>
                {(chip.sourceConnectionStatus || chip.sessionStatus || "Sem status")} • {chip.sourceConnectionId ? `ID ${chip.sourceConnectionId}` : "Sem vinculo"}
              </Typography>
            </Paper>
            <Paper className={classes.detailCard} elevation={0}>
              <Typography className={classes.detailLabel}>Recarga</Typography>
              <Typography className={classes.detailValue}>{formatDate(chip.lastRechargeAt)}</Typography>
              <Typography style={{ fontSize: 12, color: "#6f897a", marginTop: 4 }}>
                Proxima: {formatDate(chip.predictedBlockAt)} • {formatCurrency(chip.rechargeValue)}
              </Typography>
            </Paper>
            <Paper className={classes.detailCard} elevation={0}>
              <Typography className={classes.detailLabel}>Mensagens</Typography>
              <Typography className={classes.detailValue}>{chip.messagesSentToday}</Typography>
              <Typography style={{ fontSize: 12, color: "#6f897a", marginTop: 4 }}>
                Hoje • {chip.totalMessagesSent} total
              </Typography>
            </Paper>
            <Paper className={classes.detailCard} elevation={0}>
              <Typography className={classes.detailLabel}>Tempo conectado</Typography>
              <Typography className={classes.detailValue}>{chip.connectedMinutes || 0} min</Typography>
              <Typography style={{ fontSize: 12, color: "#6f897a", marginTop: 4 }}>
                Ultima conexao: {formatDateTime(chip.lastConnectedAt)}
              </Typography>
            </Paper>
            <Paper className={classes.detailCard} elevation={0}>
              <Typography className={classes.detailLabel}>Aquecimento</Typography>
              <Typography className={classes.detailValue}>{chip.warmupMessageLimit}/dia</Typography>
              <Typography style={{ fontSize: 12, color: "#6f897a", marginTop: 4 }}>
                Intervalo {chip.warmupMinInterval}-{chip.warmupMaxInterval} min
              </Typography>
            </Paper>
            <Paper className={classes.detailCard} elevation={0}>
              <Typography className={classes.detailLabel}>Infraestrutura</Typography>
              <Typography className={classes.detailValue}>{chip.device || "Nao informado"}</Typography>
              <Typography style={{ fontSize: 12, color: "#6f897a", marginTop: 4 }}>
                {`Responsavel: ${chip.responsible || "Nao informado"}${syncedByChannel ? " • Sincronizado automaticamente de Canais" : ""}`}
              </Typography>
            </Paper>
          </Box>

          <Divider style={{ margin: "16px 0" }} />

          <Typography className={classes.sectionTitle}>Historico do chip</Typography>
          <Box className={classes.logWrap}>
            {(selectedChip.logs || []).length === 0 ? (
              <Typography style={{ color: "#6f897a" }}>Nenhuma atividade registrada.</Typography>
            ) : selectedChip.logs.map(log => (
              <Box key={log.id} className={classes.logRow}>
                <Typography style={{ fontSize: 12, fontWeight: 700 }}>{log.eventType}</Typography>
                <Typography style={{ fontSize: 12, color: "#486556" }}>{log.description}</Typography>
                <Typography style={{ fontSize: 11, color: "#8aa194" }}>{formatDateTime(log.eventDate)}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </>
    );
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Box className={classes.titleRow}>
          <Box className={classes.titleIcon}>
            <SimCardIcon />
          </Box>
          <Box>
            <Typography className={classes.title}>Gestao de Chips</Typography>
            <Typography className={classes.subtitle}>
              Controle de recargas, saude do numero, aquecimento e associacao com sessoes WhatsApp.
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gridGap={10} flexWrap="wrap">
          <Button className={classes.secondaryBtn} startIcon={<AutorenewIcon />} onClick={handleRefreshMonitoring}>
            Sincronizar
          </Button>
          {isAdmin && (
            <Button className={classes.primaryBtn} startIcon={<AddIcon />} onClick={openCreate}>
              Novo chip
            </Button>
          )}
        </Box>
      </Box>

      {loading ? (
        <Box textAlign="center" p={5}><CircularProgress /></Box>
      ) : (
        <>
          <Box className={classes.summaryRow}>
            <Paper className={classes.statCard} elevation={0}><Typography className={classes.statLabel}>Total de chips</Typography><Typography className={classes.statValue}>{summary.totalChips || 0}</Typography></Paper>
            <Paper className={classes.statCard} elevation={0}><Typography className={classes.statLabel}>Chips ativos</Typography><Typography className={classes.statValue}>{summary.activeChips || 0}</Typography></Paper>
            <Paper className={classes.statCard} elevation={0}><Typography className={classes.statLabel}>Proximos de bloqueio</Typography><Typography className={classes.statValue}>{summary.nearBlockChips || 0}</Typography></Paper>
            <Paper className={classes.statCard} elevation={0}><Typography className={classes.statLabel}>Desconectados</Typography><Typography className={classes.statValue}>{summary.disconnectedChips || 0}</Typography></Paper>
            <Paper className={classes.statCard} elevation={0}><Typography className={classes.statLabel}>Em aquecimento</Typography><Typography className={classes.statValue}>{summary.warmingChips || 0}</Typography></Paper>
          </Box>

          {alerts.length > 0 && (
            <Box className={classes.alertsWrap}>
              {alerts.map(alert => (
                <Paper key={`${alert.chipId}-${alert.type}`} className={classes.alertCard} elevation={0}>
                  <Box display="flex" alignItems="center" gridGap={8}>
                    <BatteryAlertIcon style={{ color: "#c2410c" }} />
                    <Box>
                      <Typography style={{ fontWeight: 700 }}>Alerta para {alert.number}</Typography>
                      <Typography style={{ fontSize: 12, color: "#92400e" }}>{alert.message}</Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}

          <Box className={classes.shell}>
            <Paper className={classes.panel} elevation={0}>
              <Box className={classes.listHeader}>
                <Typography className={classes.listTitle}>Lista de chips</Typography>
              </Box>
              <Box className={classes.chipList}>
                {chips.map(chip => {
                  const colors = statusColor(chip.status);
                  return (
                    <Box
                      key={chip.id}
                      className={`${classes.chipRow} ${selectedChipId === chip.id ? classes.chipRowActive : ""}`}
                      onClick={() => setSelectedChipId(chip.id)}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography className={classes.chipName}>{getChipPrimaryLabel(chip)}</Typography>
                        <Chip label={`${chip.healthScore}%`} size="small" style={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 700 }} />
                      </Box>
                      <Typography className={classes.chipMeta}>
                        {[getChipSourceSummary(chip), chip.carrier || "Operadora nao informada", chip.status].filter(Boolean).join(" • ")}
                      </Typography>
                      <Typography className={classes.chipMeta}>Sessao: {chip.sourceConnectionStatus || chip.sessionStatus} • Nivel {chip.warmupLevel}</Typography>
                    </Box>
                  );
                })}
                {chips.length === 0 && (
                  <Box p={4} textAlign="center">
                    <Typography>Nenhum chip cadastrado.</Typography>
                  </Box>
                )}
              </Box>
            </Paper>

            <Paper className={classes.panel} elevation={0}>
              <Box display="flex" justifyContent="flex-end" gridGap={8} p={2} borderBottom="1px solid #e7f0ea">
                {isAdmin && selectedChip?.chip && (
                  <>
                    <Button className={classes.secondaryBtn} startIcon={<SaveIcon />} onClick={openEdit}>Editar</Button>
                    <Button className={classes.secondaryBtn} startIcon={<DeleteIcon />} onClick={handleDelete}>Excluir</Button>
                  </>
                )}
              </Box>
              {renderDetail()}
            </Paper>
          </Box>
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? "Gerenciar chip" : "Cadastrar chip"}</DialogTitle>
        <DialogContent dividers>
          {isSyncedEditing && (
            <Box mb={2}>
              <Typography style={{ fontSize: 12, color: "#5d7d6b" }}>
                Nome da conexao, numero e vinculo WhatsApp sao sincronizados automaticamente a partir do modulo Canais.
              </Typography>
            </Box>
          )}
          <Box className={classes.formGrid}>
            <TextField label="Numero do chip" variant="outlined" size="small" value={form.number} disabled={isSyncedEditing} onChange={e => setForm(prev => ({ ...prev, number: e.target.value }))} />
            <TextField label="Operadora" variant="outlined" size="small" value={form.carrier} onChange={e => setForm(prev => ({ ...prev, carrier: e.target.value }))} />
            <TextField label="Plano" variant="outlined" size="small" value={form.planType} onChange={e => setForm(prev => ({ ...prev, planType: e.target.value }))} />
            <TextField label="Data ultima recarga" type="date" variant="outlined" size="small" InputLabelProps={{ shrink: true }} value={form.lastRechargeAt} onChange={e => setForm(prev => ({ ...prev, lastRechargeAt: e.target.value }))} />
            <TextField label="Periodicidade recarga (dias)" type="number" variant="outlined" size="small" value={form.rechargePeriodicityDays} onChange={e => setForm(prev => ({ ...prev, rechargePeriodicityDays: e.target.value }))} />
            <TextField label="Valor recarga" type="number" variant="outlined" size="small" value={form.rechargeValue} onChange={e => setForm(prev => ({ ...prev, rechargeValue: e.target.value }))} />
            <TextField label="Dispositivo" variant="outlined" size="small" value={form.device} onChange={e => setForm(prev => ({ ...prev, device: e.target.value }))} />
            <TextField label="Responsavel" variant="outlined" size="small" value={form.responsible} onChange={e => setForm(prev => ({ ...prev, responsible: e.target.value }))} />
            <FormControl variant="outlined" size="small">
              <InputLabel>Sessao WhatsApp</InputLabel>
              <Select value={form.whatsappId} onChange={e => setForm(prev => ({ ...prev, whatsappId: e.target.value }))} label="Sessao WhatsApp" disabled={isSyncedEditing}>
                <MenuItem value=""><em>Nenhuma</em></MenuItem>
                {(whatsApps || []).map(wa => (
                  <MenuItem key={wa.id} value={wa.id}>{wa.name} ({wa.number || "sem numero"})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl variant="outlined" size="small">
              <InputLabel>Nivel de aquecimento</InputLabel>
              <Select value={form.warmupLevel} onChange={e => setForm(prev => ({ ...prev, warmupLevel: e.target.value }))} label="Nivel de aquecimento">
                {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={Number(value)}>{value} - {label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Data de ativacao" type="date" variant="outlined" size="small" InputLabelProps={{ shrink: true }} value={form.activationDate} onChange={e => setForm(prev => ({ ...prev, activationDate: e.target.value }))} />
          </Box>
          <Box mt={2}>
            <TextField label="Observacoes" variant="outlined" size="small" multiline rows={4} fullWidth value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} className={classes.primaryBtn} disabled={saving}>
            {saving ? <CircularProgress size={18} style={{ color: "#fff" }} /> : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
