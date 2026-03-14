import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { makeStyles, Box, Paper, Typography, Tabs, Tab, Grid, Button, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from "@material-ui/core";
import GroupIcon from "@material-ui/icons/Group";
import SearchIcon from "@material-ui/icons/Search";
import RefreshIcon from "@material-ui/icons/Refresh";
import SendIcon from "@material-ui/icons/Send";
import AddIcon from "@material-ui/icons/Add";
import GroupAddIcon from "@material-ui/icons/GroupAdd";
import DescriptionIcon from "@material-ui/icons/Description";
import PhotoCameraIcon from "@material-ui/icons/PhotoCamera";
import GetAppIcon from "@material-ui/icons/GetApp";
import StarIcon from "@material-ui/icons/Star";
import StarBorderIcon from "@material-ui/icons/StarBorder";
import { toast } from "react-toastify";
import api from "../../services/api";
import { useSocket } from "../../context/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: { height: "100%", minHeight: "calc(100vh - 112px)", background: "radial-gradient(circle at top left, #effaf2 0%, #e5f2e9 42%, #ddebe3 100%)", padding: 14, overflow: "hidden" },
  shell: { height: "100%", display: "flex", flexDirection: "column", gap: 10 },
  header: { borderRadius: 16, border: "1px solid #cfe2d5", background: "#ffffffeb", boxShadow: "0 10px 24px rgba(16,24,40,0.07)", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  titleRow: { display: "flex", alignItems: "center", gap: 10 },
  titleIcon: { width: 42, height: 42, borderRadius: 10, background: "#dff4e7", color: "#0f7a40", display: "inline-flex", alignItems: "center", justifyContent: "center" },
  title: { fontSize: "1rem", fontWeight: 800, color: "#173624" },
  subtitle: { fontSize: ".75rem", color: "#5d7d6b" },
  primaryBtn: { textTransform: "none", borderRadius: 10, background: "linear-gradient(135deg, #20a45a 0%, #157a43 100%)", color: "#fff", fontWeight: 700 },
  secondaryBtn: { textTransform: "none", borderRadius: 10, border: "1px solid #bfd7c7", color: "#1c5a35", background: "#f7fcf9", fontWeight: 700 },
  summary: { display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 10 },
  card: { border: "1px solid #cfe2d5", borderRadius: 12, padding: 10, background: "#fff" },
  cardLabel: { fontSize: ".68rem", color: "#5d7d6b", textTransform: "uppercase" },
  cardValue: { fontSize: "1.2rem", fontWeight: 800, color: "#173624" },
  tabsShell: { border: "1px solid #cedfd3", borderRadius: 14, background: "#ffffffdc", padding: 6 },
  tabs: { "& .MuiTabs-indicator": { display: "none" } },
  tab: { textTransform: "none", border: "1px solid #d1e2d5", borderRadius: 10, marginRight: 8, minHeight: 44, color: "#365745", fontWeight: 700, background: "#f7fbf8", "&.Mui-selected": { color: "#fff", background: "linear-gradient(135deg, #22ab5d 0%, #15763f 100%)" } },
  actionsBar: { display: "flex", gap: 8, flexWrap: "wrap", padding: 10, border: "1px solid #cedfd3", borderRadius: 14, background: "#ffffffdc" },
  content: { flex: 1, overflowY: "auto", ...theme.scrollbarStyles },
  panel: { border: "1px solid #cfe2d5", borderRadius: 12, background: "#fff", overflow: "hidden" },
  panelHead: { padding: "10px 12px", borderBottom: "1px solid #edf3ef", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  panelTitle: { fontSize: ".84rem", fontWeight: 800, color: "#173624" },
  toolbar: { display: "grid", gridTemplateColumns: "2fr 1.5fr .7fr .7fr auto auto", gap: 8, padding: 12, borderBottom: "1px solid #edf3ef" },
  helper: { margin: "0 12px 12px", padding: 12, borderRadius: 12, border: "1px solid #d7e8dd", background: "linear-gradient(135deg, #f8fdf9 0%, #edf8f0 100%)" },
  list: { maxHeight: "60vh", overflowY: "auto", padding: 8 },
  row: { border: "1px solid #e4eee8", borderRadius: 10, padding: "8px 10px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  rowActive: { borderColor: "#2ea75e", background: "#eaf8ef" },
  meta: { fontSize: ".71rem", color: "#5d7d6b" },
  badge: { fontSize: ".68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#edf8f1", color: "#1c5a35", border: "1px solid #c7dfcf" },
  form: { display: "grid", gap: 10, padding: 12 },
  log: { maxHeight: 360, overflowY: "auto", borderTop: "1px solid #edf3ef", padding: 8 },
  logLine: { fontSize: ".73rem", color: "#355946", borderBottom: "1px solid #edf3ef", padding: "7px 2px" }
}));

const TABS = ["Dashboard", "Grupos", "Campanhas", "Agendamentos", "Templates", "Historico", "Relatorios"];
const initialCampaign = { name: "", whatsappId: "", templateId: "", message: "", mentionsMode: "none", messageType: "text", recurrenceRule: "none", intervalSeconds: 3, scheduledAt: "", scheduleMode: "now", mediaContent: null, groupIds: [] };
const initialTemplate = { name: "", messageType: "text", message: "", mediaContent: null };
const statusBg = (status) => ({ DRAFT: "#64748b", SCHEDULED: "#f59e0b", PROCESSING: "#0ea5e9", PAUSED: "#a855f7", SENT: "#16a34a", FAILED: "#dc2626", CANCELED: "#6b7280" }[status] || "#64748b");

export default function GroupManagement() {
  const classes = useStyles();
  const { socket } = useSocket();
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState(1);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({});
  const [groups, setGroups] = useState([]);
  const [connections, setConnections] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [reports, setReports] = useState(null);
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [search, setSearch] = useState("");
  const [minMembers, setMinMembers] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [campaignForm, setCampaignForm] = useState(initialCampaign);
  const [templateForm, setTemplateForm] = useState(initialTemplate);
  const [campaignFileKey, setCampaignFileKey] = useState(0);
  const [templateFileKey, setTemplateFileKey] = useState(0);
  const [dialogs, setDialogs] = useState({ batch: false, bulkMembers: false, description: false, picture: false });
  const [batchForm, setBatchForm] = useState({ whatsappId: "", baseName: "", quantity: 1, participants: "" });
  const [bulkMembersForm, setBulkMembersForm] = useState({ whatsappId: "", groupId: "", strategy: "round_robin", members: "" });
  const [description, setDescription] = useState("");
  const [pictureFile, setPictureFile] = useState(null);
  const readValue = (event, fallback = "") => (event && event.target ? event.target.value : fallback);
  const readFile = (event) => (event && event.target && event.target.files ? event.target.files[0] || null : null);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, g, c, s, t, h, r] = await Promise.allSettled([api.get("/group-management/dashboard"), api.get("/group-management/groups"), api.get("/group-management/campaigns"), api.get("/group-management/schedules"), api.get("/group-management/templates"), api.get("/group-management/history?limit=300"), api.get("/group-management/reports")]);
      if (m.status === "fulfilled") setMetrics(m.value.data || {});
      if (c.status === "fulfilled") setCampaigns(Array.isArray(c.value.data) ? c.value.data : []);
      if (s.status === "fulfilled") setSchedules(Array.isArray(s.value.data) ? s.value.data : []);
      if (t.status === "fulfilled") setTemplates(Array.isArray(t.value.data) ? t.value.data : []);
      if (h.status === "fulfilled") setHistoryLogs(Array.isArray(h.value.data) ? h.value.data : []);
      if (r.status === "fulfilled") setReports(r.value.data || null);
      if (g.status === "fulfilled") {
        const nextConnections = [];
        const nextGroups = [];
        (g.value.data || []).forEach((conn) => {
          if (conn.whatsappId && conn.whatsappName) nextConnections.push({ id: conn.whatsappId, name: conn.whatsappName });
          (conn.groups || []).forEach((group) => nextGroups.push({ ...group, whatsappId: conn.whatsappId, whatsappName: conn.whatsappName }));
        });
        setConnections(nextConnections);
        setGroups(nextGroups);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);
  useEffect(() => {
    if (!socket || !user) return undefined;
    const channel = `company-${user.companyId}-group-campaign`;
    socket.on(channel, refreshAll);
    return () => socket.off(channel, refreshAll);
  }, [socket, user, refreshAll]);

  const filteredGroups = useMemo(() => groups.filter((g) => (!selectedConnection || g.whatsappId === Number(selectedConnection)) && (!search || String(g.subject || "").toLowerCase().includes(search.toLowerCase())) && (!minMembers || Number(g.size || 0) >= Number(minMembers)) && (!maxMembers || Number(g.size || 0) <= Number(maxMembers))), [groups, selectedConnection, search, minMembers, maxMembers]);
  const campaignGroups = useMemo(() => groups.filter((g) => !campaignForm.whatsappId || g.whatsappId === Number(campaignForm.whatsappId)), [groups, campaignForm.whatsappId]);

  const loadGroupInfo = async (group) => {
    setSelectedGroup(group);
    try {
      const { data } = await api.get(`/group-management/groups/${encodeURIComponent(group.id)}/info`, { params: { whatsappId: group.whatsappId } });
      setGroupInfo(data);
      setDescription(data.desc || "");
    } catch (error) {
      setGroupInfo(null);
      toast.error(error?.response?.data?.error || "Erro ao carregar detalhes do grupo.");
    }
  };

  const syncGroups = async () => {
    try {
      await api.post("/group-management/sync", { whatsappIds: selectedConnection ? [Number(selectedConnection)] : [] });
      toast.success("Grupos sincronizados.");
      refreshAll();
    } catch (error) { toast.error(error?.response?.data?.error || "Falha ao sincronizar grupos."); }
  };

  const exportMembers = async (format) => {
    if (!selectedGroup) return;
    try {
      const { data } = await api.get(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/export`, { params: { whatsappId: selectedGroup.whatsappId } });
      const items = (data.contacts || []).map((item) => ({ numero_real_whatsapp: item.phone, contato_valido: item.valid ? "Sim" : "Nao", grupo: selectedGroup.subject, admin: item.isAdmin ? "Sim" : "Nao", id: item.id }));
      const blob = format === "json" ? new Blob([JSON.stringify(items, null, 2)], { type: "application/json" }) : new Blob([["NumeroRealWhatsApp,ContatoValido,Grupo,Admin,ID", ...items.map((item) => `${item.numero_real_whatsapp},${item.contato_valido},"${item.grupo}",${item.admin},${item.id}`)].join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grupo-${selectedGroup.subject.replace(/[^a-zA-Z0-9]/g, "_")}.${format === "json" ? "json" : "csv"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exportacao concluida. ${data.validContacts || 0} contatos validos.`);
    } catch (error) { toast.error(error?.response?.data?.error || "Erro ao exportar contatos."); }
  };

  const createCampaign = async () => {
    try {
      if (!campaignForm.name) return toast.error("Insira o nome da campanha.");
      if (!campaignForm.whatsappId) return toast.error("Selecione a conexao.");
      let mediaPath = null;
      let mediaName = null;
      if (campaignForm.mediaContent) {
        const formData = new FormData();
        formData.append("media", campaignForm.mediaContent);
        const { data } = await api.post("/group-management/campaigns/media", formData);
        mediaPath = data.mediaPath;
        mediaName = data.mediaName;
      }
      await api.post("/group-management/campaigns", { ...campaignForm, whatsappId: Number(campaignForm.whatsappId), templateId: campaignForm.templateId || null, groupIds: (campaignForm.groupIds || []).map(Number).filter(Boolean), filters: { whatsappId: Number(campaignForm.whatsappId) }, scheduledAt: campaignForm.scheduleMode === "scheduled" && campaignForm.scheduledAt ? new Date(campaignForm.scheduledAt).toISOString() : null, intervalSeconds: Number(campaignForm.intervalSeconds) || 0, mediaPath, mediaName });
      toast.success("Campanha criada.");
      setCampaignForm(initialCampaign);
      setCampaignFileKey((v) => v + 1);
      refreshAll();
      setTab(2);
    } catch (error) { toast.error(error?.response?.data?.error || "Erro ao criar campanha."); }
  };

  const saveTemplate = async () => {
    try {
      let mediaPath = null;
      let mediaName = null;
      if (templateForm.mediaContent) {
        const formData = new FormData();
        formData.append("media", templateForm.mediaContent);
        const { data } = await api.post("/group-management/campaigns/media", formData);
        mediaPath = data.mediaPath;
        mediaName = data.mediaName;
      }
      await api.post("/group-management/templates", { ...templateForm, mediaPath, mediaName });
      toast.success("Template salvo.");
      setTemplateForm(initialTemplate);
      setTemplateFileKey((v) => v + 1);
      refreshAll();
    } catch (error) { toast.error(error?.response?.data?.error || "Erro ao salvar template."); }
  };

  const campaignAction = async (id, action) => {
    try { await api.post(`/group-management/campaigns/${id}/${action}`); refreshAll(); } catch (error) { toast.error(error?.response?.data?.error || "Falha na acao."); }
  };

  const handleBatchCreate = async () => {
    try {
      const participants = batchForm.participants.split(/[\n,;]/).map((i) => i.trim()).filter(Boolean);
      const groupsPayload = Array.from({ length: Number(batchForm.quantity) }).map((_, index) => ({ whatsappId: Number(batchForm.whatsappId), subject: `${batchForm.baseName} #${index + 1}`, participants }));
      const { data } = await api.post("/group-management/groups/batch", { groups: groupsPayload });
      toast.success(`Criacao em massa finalizada. ${data.created || 0} grupos criados.`);
      setDialogs((d) => ({ ...d, batch: false }));
      setBatchForm({ whatsappId: "", baseName: "", quantity: 1, participants: "" });
      refreshAll();
    } catch (error) { toast.error(error?.response?.data?.error || "Erro ao criar grupos."); }
  };

  const handleBulkMembers = async () => {
    try {
      const members = bulkMembersForm.members.split(/[\n,;]/).map((i) => i.trim()).filter(Boolean);
      const chosenGroupId = Number(bulkMembersForm.groupId || selectedGroup?.groupId || 0);
      const groupIds = chosenGroupId ? [chosenGroupId] : filteredGroups.map((g) => g.groupId);
      const whatsappId = Number(bulkMembersForm.whatsappId || selectedGroup?.whatsappId || selectedConnection);
      if (!whatsappId) return toast.error("Selecione a conexao.");
      if (!groupIds.length) return toast.error("Selecione o grupo que recebera os membros.");
      const { data } = await api.post("/group-management/groups/bulk-add-members", { whatsappId, groupIds, members, strategy: bulkMembersForm.strategy });
      toast.success(`Distribuicao concluida. ${data.assigned || 0} inclusoes processadas.`);
      setDialogs((d) => ({ ...d, bulkMembers: false }));
      setBulkMembersForm({ whatsappId: "", groupId: "", strategy: "round_robin", members: "" });
      refreshAll();
      if (selectedGroup) loadGroupInfo(selectedGroup);
    } catch (error) { toast.error(error?.response?.data?.error || "Erro ao adicionar membros."); }
  };

  const handleDescription = async () => {
    try { await api.put(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/description`, { whatsappId: selectedGroup.whatsappId, description }); toast.success("Descricao atualizada."); setDialogs((d) => ({ ...d, description: false })); refreshAll(); loadGroupInfo(selectedGroup); } catch (error) { toast.error(error?.response?.data?.error || "Erro ao atualizar descricao."); }
  };

  const handlePicture = async () => {
    try {
      const formData = new FormData();
      formData.append("picture", pictureFile);
      formData.append("whatsappId", String(selectedGroup.whatsappId));
      await api.put(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/picture`, formData);
      toast.success("Foto do grupo atualizada.");
      setDialogs((d) => ({ ...d, picture: false }));
      setPictureFile(null);
    } catch (error) { toast.error(error?.response?.data?.error || "Erro ao atualizar foto."); }
  };

  const simpleList = (title, items, field = "name") => <Paper className={classes.panel}><Box className={classes.panelHead}><Typography className={classes.panelTitle}>{title}</Typography></Box><Box className={classes.list}>{(items || []).map((item) => <Box key={item.id || item.createdAt} className={classes.row} style={{ cursor: "default" }}><Box><Typography style={{ fontWeight: 700, fontSize: ".82rem" }}>{item[field] || item.message || "-"}</Typography>{item.createdAt ? <Typography className={classes.meta}>{new Date(item.createdAt).toLocaleString("pt-BR")}</Typography> : null}</Box></Box>)}{!items?.length ? <Box style={{ padding: 20, textAlign: "center", color: "#6a8978" }}>Sem dados.</Box> : null}</Box></Paper>;

  return (
    <Box className={classes.root}>
      <Box className={classes.shell}>
        <Box className={classes.header}>
          <Box className={classes.titleRow}><Box className={classes.titleIcon}><GroupIcon /></Box><Box><Typography className={classes.title}>Gestao de Grupos • Centro Operacional</Typography><Typography className={classes.subtitle}>Controle de comunidades, campanhas e extracao de contatos.</Typography></Box></Box>
          <Box style={{ display: "flex", gap: 8 }}><Button className={classes.secondaryBtn} startIcon={<RefreshIcon />} onClick={refreshAll}>Atualizar</Button><Button className={classes.primaryBtn} startIcon={<RefreshIcon />} onClick={syncGroups}>Sincronizar</Button></Box>
        </Box>
        <Box className={classes.summary}>
          <Paper className={classes.card}><Typography className={classes.cardLabel}>Grupos</Typography><Typography className={classes.cardValue}>{metrics.totalGroups || 0}</Typography></Paper>
          <Paper className={classes.card}><Typography className={classes.cardLabel}>Membros</Typography><Typography className={classes.cardValue}>{metrics.totalMembers || 0}</Typography></Paper>
          <Paper className={classes.card}><Typography className={classes.cardLabel}>Admins</Typography><Typography className={classes.cardValue}>{metrics.totalAdmins || 0}</Typography></Paper>
          <Paper className={classes.card}><Typography className={classes.cardLabel}>Campanhas</Typography><Typography className={classes.cardValue}>{metrics.campaignsTotal || 0}</Typography></Paper>
          <Paper className={classes.card}><Typography className={classes.cardLabel}>Enviadas</Typography><Typography className={classes.cardValue}>{metrics.campaignsSent || 0}</Typography></Paper>
          <Paper className={classes.card}><Typography className={classes.cardLabel}>Falhas</Typography><Typography className={classes.cardValue}>{metrics.campaignsFailed || 0}</Typography></Paper>
        </Box>
        <Box className={classes.tabsShell}><Tabs className={classes.tabs} value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">{TABS.map((label) => <Tab key={label} label={label} className={classes.tab} />)}</Tabs></Box>
        <Box className={classes.actionsBar}>
          <Button className={classes.secondaryBtn} startIcon={<AddIcon />} onClick={() => setDialogs((d) => ({ ...d, batch: true }))}>Criar grupos em massa</Button>
          <Button className={classes.secondaryBtn} startIcon={<GroupAddIcon />} onClick={() => setDialogs((d) => ({ ...d, bulkMembers: true }))}>Adicionar membros em massa</Button>
          <Button className={classes.secondaryBtn} startIcon={<DescriptionIcon />} disabled={!selectedGroup} onClick={() => setDialogs((d) => ({ ...d, description: true }))}>Editar descricao</Button>
          <Button className={classes.secondaryBtn} startIcon={<PhotoCameraIcon />} disabled={!selectedGroup} onClick={() => setDialogs((d) => ({ ...d, picture: true }))}>Alterar foto</Button>
          <Button className={classes.secondaryBtn} startIcon={<GetAppIcon />} disabled={!selectedGroup} onClick={() => exportMembers("csv")}>Exportar contatos</Button>
        </Box>
        <Box className={classes.content}>
          {loading ? <Box style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><CircularProgress style={{ color: "#15763f" }} /></Box> : null}
          {!loading && tab === 0 ? <Paper className={classes.panel}><Box className={classes.panelHead}><Typography className={classes.panelTitle}>Resumo executivo</Typography></Box><Box style={{ padding: 12 }}><Typography className={classes.meta}>Acompanhe grupos sincronizados, volume de membros e desempenho das campanhas.</Typography></Box></Paper> : null}
          {!loading && tab === 1 ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <Paper className={classes.panel}>
                  <Box className={classes.toolbar}>
                    <FormControl variant="outlined" size="small"><InputLabel>Conexao</InputLabel><Select value={selectedConnection} onChange={(e) => setSelectedConnection(readValue(e))} label="Conexao"><MenuItem value="">Todas</MenuItem>{connections.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select></FormControl>
                    <TextField variant="outlined" size="small" label="Buscar grupo" value={search} onChange={(e) => setSearch(readValue(e))} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
                    <TextField variant="outlined" size="small" label="Min" value={minMembers} onChange={(e) => setMinMembers(readValue(e))} />
                    <TextField variant="outlined" size="small" label="Max" value={maxMembers} onChange={(e) => setMaxMembers(readValue(e))} />
                    <Button className={classes.secondaryBtn} startIcon={<RefreshIcon />} onClick={syncGroups}>Sincronizar</Button>
                    <Button className={classes.primaryBtn} startIcon={<AddIcon />} onClick={() => setDialogs((d) => ({ ...d, batch: true }))}>Novo</Button>
                  </Box>
                  {selectedGroup ? <Box className={classes.helper}><Typography style={{ fontWeight: 800, color: "#185033" }}>Grupo: {selectedGroup.subject}</Typography><Typography style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f7a40" }}>Membros: {groupInfo?.memberCount || selectedGroup.size || 0}</Typography></Box> : null}
                  <Box className={classes.list}>{filteredGroups.map((g) => <Box key={`${g.groupId}-${g.whatsappId}`} className={`${classes.row} ${selectedGroup?.groupId === g.groupId ? classes.rowActive : ""}`} onClick={() => loadGroupInfo(g)}><Box><Typography style={{ fontWeight: 700, color: "#173624", fontSize: ".82rem" }}>{g.subject || g.id}</Typography><Typography className={classes.meta}>{g.size || 0} membros • {g.whatsappName}</Typography></Box><Box style={{ display: "flex", alignItems: "center", gap: 6 }}><span className={classes.badge}>{g.tags?.length || 0} tags</span><Button size="small" className={classes.secondaryBtn} onClick={(e) => { e.stopPropagation(); api.patch(`/group-management/groups/meta/${g.groupId}`, { isFavorite: !g.isFavorite }).then(refreshAll); }}>{g.isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}</Button></Box></Box>)}{!filteredGroups.length ? <Box style={{ padding: 24, textAlign: "center", color: "#6a8978" }}>Nenhum grupo encontrado.</Box> : null}</Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={7}>
                <Paper className={classes.panel}>
                  {!selectedGroup ? <Box style={{ padding: 24, textAlign: "center", color: "#6a8978" }}>Selecione um grupo para ver membros e acoes.</Box> : <>
                    <Box className={classes.panelHead}><Box><Typography className={classes.panelTitle}>{selectedGroup.subject}</Typography><Typography className={classes.meta}>{groupInfo?.memberCount || selectedGroup.size || 0} membros • {selectedGroup.whatsappName}</Typography></Box><Box style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button className={classes.secondaryBtn} onClick={() => exportMembers("csv")}>Exportar CSV</Button><Button className={classes.secondaryBtn} onClick={() => exportMembers("json")}>Exportar JSON</Button></Box></Box>
                    <Box className={classes.list}>{(groupInfo?.participants || []).map((m) => <Box key={m.id} className={classes.row} style={{ cursor: "default" }}><Box><Typography style={{ fontSize: ".8rem", fontWeight: 700 }}>{m.phone || String(m.id).split("@")[0]}</Typography><Typography className={classes.meta}>{m.leadName ? `Lead: ${m.leadName}` : m.contactName ? `Contato: ${m.contactName}` : "Sem lead relacionado"}</Typography><Typography className={classes.meta}>{m.isSuperAdmin ? "Super admin" : m.isAdmin ? "Admin" : "Membro"}</Typography></Box><Box style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{!m.isAdmin ? <Button size="small" className={classes.secondaryBtn} onClick={() => api.post(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/members/${encodeURIComponent(m.id)}/promote`, { whatsappId: selectedGroup.whatsappId }).then(() => loadGroupInfo(selectedGroup))}>Promover</Button> : <Button size="small" className={classes.secondaryBtn} onClick={() => api.post(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/members/${encodeURIComponent(m.id)}/demote`, { whatsappId: selectedGroup.whatsappId }).then(() => loadGroupInfo(selectedGroup))}>Rebaixar</Button>}<Button size="small" className={classes.secondaryBtn} onClick={() => api.delete(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/members/${encodeURIComponent(m.id)}`, { data: { whatsappId: selectedGroup.whatsappId } }).then(() => loadGroupInfo(selectedGroup))}>Remover</Button></Box></Box>)}</Box>
                  </>}
                </Paper>
              </Grid>
            </Grid>
          ) : null}
          {!loading && tab === 2 ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Paper className={classes.panel}><Box className={classes.panelHead}><Typography className={classes.panelTitle}>Campanhas de grupos</Typography></Box><Box className={classes.form}>
                  <TextField variant="outlined" size="small" label="Nome" value={campaignForm.name} onChange={(e) => setCampaignForm((p) => ({ ...p, name: readValue(e) }))} />
                  <FormControl variant="outlined" size="small"><InputLabel>Conexao</InputLabel><Select value={campaignForm.whatsappId} onChange={(e) => setCampaignForm((p) => ({ ...p, whatsappId: readValue(e), groupIds: [] }))} label="Conexao">{connections.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select></FormControl>
                  <FormControl variant="outlined" size="small"><InputLabel>Template</InputLabel><Select value={campaignForm.templateId} onChange={(e) => setCampaignForm((p) => ({ ...p, templateId: readValue(e) }))} label="Template"><MenuItem value="">Nenhum</MenuItem>{templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}</Select></FormControl>
                  <FormControl variant="outlined" size="small"><InputLabel>Tipo de conteudo</InputLabel><Select value={campaignForm.messageType} onChange={(e) => setCampaignForm((p) => ({ ...p, messageType: readValue(e), mediaContent: null }))} label="Tipo de conteudo"><MenuItem value="text">Texto</MenuItem><MenuItem value="imagem">Imagem</MenuItem><MenuItem value="video">Video</MenuItem><MenuItem value="audio">Audio</MenuItem><MenuItem value="documento">Documento</MenuItem></Select></FormControl>
                  {["imagem", "video", "audio", "documento"].includes(campaignForm.messageType) ? <input key={campaignFileKey} type="file" onChange={(e) => setCampaignForm((p) => ({ ...p, mediaContent: readFile(e) }))} /> : null}
                  <TextField variant="outlined" size="small" label="Mensagem" multiline rows={4} value={campaignForm.message} onChange={(e) => setCampaignForm((p) => ({ ...p, message: readValue(e) }))} />
                  <FormControl variant="outlined" size="small"><InputLabel>Mencionar membros</InputLabel><Select value={campaignForm.mentionsMode} onChange={(e) => setCampaignForm((p) => ({ ...p, mentionsMode: readValue(e) }))} label="Mencionar membros"><MenuItem value="none">Nao mencionar</MenuItem><MenuItem value="all">Mencionar todos</MenuItem></Select></FormControl>
                  <FormControl variant="outlined" size="small"><InputLabel>Grupos alvo</InputLabel><Select multiple value={campaignForm.groupIds} onChange={(e) => setCampaignForm((p) => ({ ...p, groupIds: readValue(e, []) || [] }))} label="Grupos alvo" renderValue={(selected) => <Box style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{(selected || []).map((value) => <Chip key={value} size="small" label={campaignGroups.find((g) => Number(g.groupId) === Number(value))?.subject || value} />)}</Box>}>{campaignGroups.map((g) => <MenuItem key={g.groupId} value={g.groupId}>{g.subject}</MenuItem>)}</Select></FormControl>
                  <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><TextField type="number" variant="outlined" size="small" label="Intervalo entre grupos (segundos)" value={campaignForm.intervalSeconds} onChange={(e) => setCampaignForm((p) => ({ ...p, intervalSeconds: readValue(e) }))} /><FormControl variant="outlined" size="small"><InputLabel>Tipo de envio</InputLabel><Select value={campaignForm.scheduleMode} onChange={(e) => setCampaignForm((p) => ({ ...p, scheduleMode: readValue(e) }))} label="Tipo de envio"><MenuItem value="now">Enviar agora</MenuItem><MenuItem value="scheduled">Agendar envio</MenuItem></Select></FormControl></Box>
                  {campaignForm.scheduleMode === "scheduled" ? <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><TextField type="datetime-local" variant="outlined" size="small" label="Data e hora" InputLabelProps={{ shrink: true }} value={campaignForm.scheduledAt} onChange={(e) => setCampaignForm((p) => ({ ...p, scheduledAt: readValue(e) }))} /><FormControl variant="outlined" size="small"><InputLabel>Recorrencia</InputLabel><Select value={campaignForm.recurrenceRule} onChange={(e) => setCampaignForm((p) => ({ ...p, recurrenceRule: readValue(e) }))} label="Recorrencia"><MenuItem value="none">Unico</MenuItem><MenuItem value="daily">Diario</MenuItem><MenuItem value="weekly">Semanal</MenuItem></Select></FormControl></Box> : null}
                  <Button className={classes.primaryBtn} startIcon={<SendIcon />} onClick={createCampaign}>Criar campanha</Button>
                </Box></Paper>
              </Grid>
              <Grid item xs={12} md={4}><Paper className={classes.panel}><Box className={classes.panelHead}><Typography className={classes.panelTitle}>Logs da campanha</Typography></Box><Box className={classes.log}>{campaignLogs.map((l) => <Box key={l.id} className={classes.logLine}><strong>[{l.type}]</strong> {l.message}<br />{new Date(l.createdAt).toLocaleString("pt-BR")}</Box>)}</Box></Paper></Grid>
              <Grid item xs={12}><Paper className={classes.panel}><Box className={classes.panelHead}><Typography className={classes.panelTitle}>Campanhas existentes</Typography></Box><Box className={classes.list}>{campaigns.map((c) => <Box key={c.id} className={classes.row} style={{ cursor: "default" }}><Box><Typography style={{ fontSize: ".82rem", fontWeight: 700 }}>{c.name}</Typography><Typography className={classes.meta}>{c.totalGroups || 0} grupos • {c.successCount || 0} sucesso • {c.failedCount || 0} falhas</Typography></Box><Box style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><Chip size="small" label={c.status} style={{ backgroundColor: `${statusBg(c.status)}22`, color: statusBg(c.status), fontWeight: 700 }} /><Button size="small" className={classes.secondaryBtn} onClick={() => campaignAction(c.id, "start")}>Iniciar</Button><Button size="small" className={classes.secondaryBtn} onClick={() => campaignAction(c.id, "pause")}>Pausar</Button><Button size="small" className={classes.secondaryBtn} onClick={() => campaignAction(c.id, "resume")}>Retomar</Button><Button size="small" className={classes.secondaryBtn} onClick={() => campaignAction(c.id, "cancel")}>Cancelar</Button><Button size="small" className={classes.secondaryBtn} onClick={() => api.get(`/group-management/campaigns/${c.id}/logs`).then((r) => setCampaignLogs(r.data || []))}>Logs</Button></Box></Box>)}</Box></Paper></Grid>
            </Grid>
          ) : null}
          {!loading && tab === 3 ? simpleList("Agendamentos", schedules) : null}
          {!loading && tab === 4 ? <Paper className={classes.panel}><Box className={classes.panelHead}><Typography className={classes.panelTitle}>Templates</Typography></Box><Box className={classes.form}><TextField variant="outlined" size="small" label="Nome do template" value={templateForm.name} onChange={(e) => setTemplateForm((p) => ({ ...p, name: readValue(e) }))} /><FormControl variant="outlined" size="small"><InputLabel>Tipo</InputLabel><Select value={templateForm.messageType} onChange={(e) => setTemplateForm((p) => ({ ...p, messageType: readValue(e), mediaContent: null }))} label="Tipo"><MenuItem value="text">Texto</MenuItem><MenuItem value="imagem">Imagem</MenuItem><MenuItem value="video">Video</MenuItem><MenuItem value="audio">Audio</MenuItem><MenuItem value="documento">Documento</MenuItem></Select></FormControl>{["imagem", "video", "audio", "documento"].includes(templateForm.messageType) ? <input key={templateFileKey} type="file" onChange={(e) => setTemplateForm((p) => ({ ...p, mediaContent: readFile(e) }))} /> : null}<TextField variant="outlined" size="small" multiline rows={3} label="Mensagem" value={templateForm.message} onChange={(e) => setTemplateForm((p) => ({ ...p, message: readValue(e) }))} /><Button className={classes.primaryBtn} startIcon={<AddIcon />} onClick={saveTemplate}>Salvar template</Button></Box><Box className={classes.list}>{templates.map((t) => <Box key={t.id} className={classes.row} style={{ cursor: "default" }}><Typography>{t.name || "Sem nome"}</Typography><Button size="small" className={classes.secondaryBtn} onClick={() => api.delete(`/group-management/templates/${t.id}`).then(refreshAll)}>Excluir</Button></Box>)}</Box></Paper> : null}
          {!loading && tab === 5 ? simpleList("Historico", historyLogs, "message") : null}
          {!loading && tab === 6 ? simpleList("Relatorios", reports?.campaigns || []) : null}
        </Box>
      </Box>

      <Dialog open={dialogs.batch} onClose={() => setDialogs((d) => ({ ...d, batch: false }))} fullWidth maxWidth="sm"><DialogTitle>Criar grupos em massa</DialogTitle><DialogContent style={{ display: "grid", gap: 12, paddingTop: 8 }}><FormControl variant="outlined" size="small" fullWidth><InputLabel>Conexao</InputLabel><Select value={batchForm.whatsappId} onChange={(e) => setBatchForm((p) => ({ ...p, whatsappId: readValue(e) }))} label="Conexao">{connections.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select></FormControl><TextField variant="outlined" size="small" label="Nome base" value={batchForm.baseName} onChange={(e) => setBatchForm((p) => ({ ...p, baseName: readValue(e) }))} /><TextField variant="outlined" size="small" type="number" label="Quantidade" value={batchForm.quantity} onChange={(e) => setBatchForm((p) => ({ ...p, quantity: readValue(e) }))} /><TextField variant="outlined" size="small" label="Participantes iniciais" multiline rows={4} value={batchForm.participants} onChange={(e) => setBatchForm((p) => ({ ...p, participants: readValue(e) }))} placeholder="Separe por virgula ou quebra de linha" /></DialogContent><DialogActions><Button onClick={() => setDialogs((d) => ({ ...d, batch: false }))}>Cancelar</Button><Button color="primary" variant="contained" onClick={handleBatchCreate}>Criar</Button></DialogActions></Dialog>
      <Dialog open={dialogs.bulkMembers} onClose={() => setDialogs((d) => ({ ...d, bulkMembers: false }))} fullWidth maxWidth="sm"><DialogTitle>Adicionar membros em massa</DialogTitle><DialogContent style={{ display: "grid", gap: 12, paddingTop: 8 }}><FormControl variant="outlined" size="small" fullWidth><InputLabel>Conexao</InputLabel><Select value={bulkMembersForm.whatsappId || selectedGroup?.whatsappId || selectedConnection} onChange={(e) => setBulkMembersForm((p) => ({ ...p, whatsappId: readValue(e), groupId: "" }))} label="Conexao">{connections.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select></FormControl><FormControl variant="outlined" size="small" fullWidth><InputLabel>Selecionar grupo</InputLabel><Select value={bulkMembersForm.groupId || selectedGroup?.groupId || ""} onChange={(e) => setBulkMembersForm((p) => ({ ...p, groupId: readValue(e) }))} label="Selecionar grupo">{groups.filter((g) => g.whatsappId === Number(bulkMembersForm.whatsappId || selectedGroup?.whatsappId || selectedConnection)).map((g) => <MenuItem key={g.groupId} value={g.groupId}>{g.subject}</MenuItem>)}</Select></FormControl><FormControl variant="outlined" size="small" fullWidth><InputLabel>Estrategia</InputLabel><Select value={bulkMembersForm.strategy} onChange={(e) => setBulkMembersForm((p) => ({ ...p, strategy: readValue(e) }))} label="Estrategia"><MenuItem value="round_robin">Distribuir entre grupos</MenuItem><MenuItem value="all">Adicionar em todos os grupos</MenuItem></Select></FormControl><TextField variant="outlined" size="small" label="Contatos" multiline rows={6} value={bulkMembersForm.members} onChange={(e) => setBulkMembersForm((p) => ({ ...p, members: readValue(e) }))} placeholder="5511999999999&#10;5511888888888" /></DialogContent><DialogActions><Button onClick={() => setDialogs((d) => ({ ...d, bulkMembers: false }))}>Cancelar</Button><Button color="primary" variant="contained" onClick={handleBulkMembers}>Adicionar</Button></DialogActions></Dialog>
      <Dialog open={dialogs.description} onClose={() => setDialogs((d) => ({ ...d, description: false }))} fullWidth maxWidth="sm"><DialogTitle>Editar descricao do grupo</DialogTitle><DialogContent style={{ paddingTop: 8 }}><TextField variant="outlined" size="small" fullWidth multiline rows={5} label="Descricao" value={description} onChange={(e) => setDescription(readValue(e))} /></DialogContent><DialogActions><Button onClick={() => setDialogs((d) => ({ ...d, description: false }))}>Cancelar</Button><Button color="primary" variant="contained" onClick={handleDescription}>Salvar</Button></DialogActions></Dialog>
      <Dialog open={dialogs.picture} onClose={() => setDialogs((d) => ({ ...d, picture: false }))} fullWidth maxWidth="sm"><DialogTitle>Alterar foto do grupo</DialogTitle><DialogContent style={{ display: "grid", gap: 12, paddingTop: 8 }}><input type="file" accept="image/jpeg,image/png" onChange={(e) => setPictureFile(readFile(e))} /><Typography className={classes.meta}>Formatos permitidos: JPG e PNG. Tamanho recomendado ate 2 MB e dimensao proxima de 640x640.</Typography></DialogContent><DialogActions><Button onClick={() => setDialogs((d) => ({ ...d, picture: false }))}>Cancelar</Button><Button color="primary" variant="contained" onClick={handlePicture}>Salvar foto</Button></DialogActions></Dialog>
    </Box>
  );
}
