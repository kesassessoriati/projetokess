import React, { useState, useEffect, useMemo, useCallback, useContext } from "react";
import {
  makeStyles,
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Grid,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@material-ui/core";
import GroupIcon from "@material-ui/icons/Group";
import SearchIcon from "@material-ui/icons/Search";
import RefreshIcon from "@material-ui/icons/Refresh";
import SendIcon from "@material-ui/icons/Send";
import AddIcon from "@material-ui/icons/Add";
import StarIcon from "@material-ui/icons/Star";
import StarBorderIcon from "@material-ui/icons/StarBorder";
import { toast } from "react-toastify";
import api from "../../services/api";
import { useSocket } from "../../context/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100%",
    minHeight: "calc(100vh - 64px)",
    background: "radial-gradient(circle at top left, #effaf2 0%, #e5f2e9 42%, #ddebe3 100%)",
    padding: 14,
    overflow: "hidden"
  },
  shell: { height: "100%", display: "flex", flexDirection: "column", gap: 10 },
  header: {
    borderRadius: 16,
    border: "1px solid #cfe2d5",
    background: "#ffffffeb",
    boxShadow: "0 10px 24px rgba(16,24,40,0.07)",
    padding: "14px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  titleRow: { display: "flex", alignItems: "center", gap: 10 },
  titleIcon: {
    width: 42, height: 42, borderRadius: 10, background: "#dff4e7", color: "#0f7a40",
    display: "inline-flex", alignItems: "center", justifyContent: "center"
  },
  title: { fontSize: "1rem", fontWeight: 800, color: "#173624" },
  subtitle: { fontSize: ".75rem", color: "#5d7d6b" },
  primaryBtn: {
    textTransform: "none",
    borderRadius: 10,
    background: "linear-gradient(135deg, #20a45a 0%, #157a43 100%)",
    color: "#fff",
    fontWeight: 700
  },
  secondaryBtn: {
    textTransform: "none",
    borderRadius: 10,
    border: "1px solid #bfd7c7",
    color: "#1c5a35",
    background: "#f7fcf9",
    fontWeight: 700
  },
  summary: { display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 10 },
  card: { border: "1px solid #cfe2d5", borderRadius: 12, padding: 10, background: "#fff" },
  cardLabel: { fontSize: ".68rem", color: "#5d7d6b", textTransform: "uppercase" },
  cardValue: { fontSize: "1.2rem", fontWeight: 800, color: "#173624" },
  tabsShell: { border: "1px solid #cedfd3", borderRadius: 14, background: "#ffffffdc", padding: 6 },
  tabs: { "& .MuiTabs-indicator": { display: "none" } },
  tab: {
    textTransform: "none", border: "1px solid #d1e2d5", borderRadius: 10, marginRight: 8,
    minHeight: 44, color: "#365745", fontWeight: 700, background: "#f7fbf8",
    "&.Mui-selected": { color: "#fff", background: "linear-gradient(135deg, #22ab5d 0%, #15763f 100%)" }
  },
  content: { flex: 1, overflowY: "auto", ...theme.scrollbarStyles },
  panel: { border: "1px solid #cfe2d5", borderRadius: 12, background: "#fff", overflow: "hidden" },
  panelHead: { padding: "10px 12px", borderBottom: "1px solid #edf3ef", display: "flex", justifyContent: "space-between", alignItems: "center" },
  panelTitle: { fontSize: ".84rem", fontWeight: 800, color: "#173624" },
  controls: { display: "grid", gridTemplateColumns: "220px 1fr 100px 100px auto", gap: 8, padding: 10 },
  list: { maxHeight: "58vh", overflowY: "auto", padding: 8 },
  row: { border: "1px solid #e4eee8", borderRadius: 10, padding: "8px 10px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  rowActive: { borderColor: "#2ea75e", background: "#eaf8ef" },
  badge: { fontSize: ".68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#edf8f1", color: "#1c5a35", border: "1px solid #c7dfcf" },
  log: { maxHeight: 360, overflowY: "auto", borderTop: "1px solid #edf3ef", padding: 8 },
  logLine: { fontSize: ".73rem", color: "#355946", borderBottom: "1px solid #edf3ef", padding: "7px 2px" }
}));

const TABS = ["Dashboard", "Grupos", "Campanhas", "Agendamentos", "Templates", "Histórico", "Relatórios"];
const statusBg = (status) => ({ DRAFT: "#64748b", SCHEDULED: "#f59e0b", PROCESSING: "#0ea5e9", PAUSED: "#a855f7", SENT: "#16a34a", FAILED: "#dc2626", CANCELED: "#6b7280" }[status] || "#64748b");

export default function GroupManagement() {
  const classes = useStyles();
  const { socket } = useSocket();
  const { user } = useContext(AuthContext);

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({});
  const [groups, setGroups] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [reports, setReports] = useState(null);
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [minMembers, setMinMembers] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [campaignForm, setCampaignForm] = useState({ name: "", whatsappId: "", message: "", mentionsMode: "none", messageType: "text", recurrenceRule: "none", intervalSeconds: 3, scheduledAt: "", scheduleMode: "now", mediaContent: null, groupIds: [] });
  const [templateForm, setTemplateForm] = useState({ name: "", messageType: "text", message: "" });
  const [createGroupModal, setCreateGroupModal] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({ whatsappId: "", subject: "", participants: "" });

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, g, c, s, t, h, r] = await Promise.all([
        api.get("/group-management/dashboard"),
        api.get("/group-management/groups"),
        api.get("/group-management/campaigns"),
        api.get("/group-management/schedules"),
        api.get("/group-management/templates"),
        api.get("/group-management/history?limit=300"),
        api.get("/group-management/reports")
      ]);
      setMetrics(m.data || {});
      setCampaigns(Array.isArray(c.data) ? c.data : []);
      setSchedules(Array.isArray(s.data) ? s.data : []);
      setTemplates(Array.isArray(t.data) ? t.data : []);
      setHistoryLogs(Array.isArray(h.data) ? h.data : []);
      setReports(r.data || null);
      const allGroups = [];
      const allConnections = [];
      (g.data || []).forEach((conn) => {
        allConnections.push({ id: conn.whatsappId, name: conn.whatsappName });
        (conn.groups || []).forEach((group) => allGroups.push({ ...group, whatsappId: conn.whatsappId, whatsappName: conn.whatsappName }));
      });
      setGroups(allGroups);
      setConnections(allConnections);
    } catch {
      toast.error("Falha ao carregar módulo de gestão de grupos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);
  useEffect(() => {
    if (!socket || !user) return;
    const channel = `company-${user.companyId}-group-campaign`;
    socket.on(channel, refreshAll);
    return () => socket.off(channel, refreshAll);
  }, [socket, user, refreshAll]);

  const filteredGroups = useMemo(() => groups.filter((g) => {
    if (selectedConnection && g.whatsappId !== Number(selectedConnection)) return false;
    if (search && !String(g.subject || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (minMembers && Number(g.size || 0) < Number(minMembers)) return false;
    if (maxMembers && Number(g.size || 0) > Number(maxMembers)) return false;
    return true;
  }), [groups, selectedConnection, search, minMembers, maxMembers]);

  const loadGroupInfo = async (group) => {
    setSelectedGroup(group);
    try {
      const { data } = await api.get(`/group-management/groups/${encodeURIComponent(group.id)}/info`, { params: { whatsappId: group.whatsappId } });
      setGroupInfo(data);
    } catch {
      toast.error("Erro ao carregar detalhes do grupo.");
      setGroupInfo(null);
    }
  };

  const syncGroups = async () => {
    try {
      await api.post("/group-management/sync", { whatsappIds: selectedConnection ? [Number(selectedConnection)] : [] });
      toast.success("Grupos sincronizados.");
      refreshAll();
    } catch { toast.error("Falha ao sincronizar grupos."); }
  };

  const createCampaign = async () => {
    try {
      if (!campaignForm.name) {
        return toast.error("Insira o nome da campanha.");
      }
      if (!campaignForm.whatsappId) {
        return toast.error("Selecione a conexão.");
      }
      if (campaignForm.messageType !== "text" && !campaignForm.mediaContent) {
        return toast.error("Selecione o arquivo de mídia.");
      }
      if (campaignForm.scheduleMode === "scheduled" && !campaignForm.scheduledAt) {
        return toast.error("Selecione a data e hora do agendamento.");
      }

      let mediaPath = null;
      let mediaName = null;

      if (campaignForm.mediaContent) {
        const formData = new FormData();
        formData.append("media", campaignForm.mediaContent);
        const { data } = await api.post("/group-management/campaigns/media", formData);
        mediaPath = data.mediaPath;
        mediaName = data.mediaName;
      }

      await api.post("/group-management/campaigns", { 
        ...campaignForm, 
        whatsappId: Number(campaignForm.whatsappId), 
        intervalSeconds: Number(campaignForm.intervalSeconds) || 0, 
        scheduledAt: campaignForm.scheduleMode === "scheduled" && campaignForm.scheduledAt ? new Date(campaignForm.scheduledAt).toISOString() : null,
        mediaPath,
        mediaName
      });
      toast.success("Campanha criada.");
      setCampaignForm({ name: "", whatsappId: "", message: "", mentionsMode: "none", messageType: "text", recurrenceRule: "none", intervalSeconds: 3, scheduledAt: "", scheduleMode: "now", mediaContent: null, groupIds: [] });
      refreshAll();
    } catch { toast.error("Erro ao criar campanha."); }
  };

  const campaignAction = async (id, action) => {
    try { await api.post(`/group-management/campaigns/${id}/${action}`); toast.success("Ação executada."); refreshAll(); } catch { toast.error("Falha na ação."); }
  };

  const saveTemplate = async () => {
    try { await api.post("/group-management/templates", templateForm); toast.success("Template salvo."); setTemplateForm({ name: "", messageType: "text", message: "" }); refreshAll(); } catch { toast.error("Erro ao salvar template."); }
  };

  const handleCreateGroup = async () => {
    try {
      if (!newGroupForm.whatsappId || !newGroupForm.subject) return toast.error("Preencha conexão e nome.");
      const participants = newGroupForm.participants.split(",").map(p => p.trim()).filter(Boolean);
      await api.post("/group-management/groups", { whatsappId: Number(newGroupForm.whatsappId), subject: newGroupForm.subject, participants });
      toast.success("Grupo criado com sucesso!");
      setCreateGroupModal(false);
      setNewGroupForm({ whatsappId: "", subject: "", participants: "" });
      refreshAll();
    } catch {
      toast.error("Erro ao criar grupo.");
    }
  };

  const exportMembers = (format) => {
    if (!selectedGroup || !groupInfo) return;
    const items = (groupInfo.participants || []).map(p => ({
      telefone: String(p.id).split("@")[0],
      id: p.id,
      grupo: selectedGroup.subject,
      admin: p.isAdmin ? 'Sim' : 'Não'
    }));
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `membros-${selectedGroup.subject.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      a.click();
    } else {
      const csv = ["Telefone,ID,Grupo,Admin", ...items.map(i => `${i.telefone},${i.id},"${i.grupo}",${i.admin}`)].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `membros-${selectedGroup.subject.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      a.click();
    }
    toast.success("Exportação iniciada.");
  };

  const renderDashboard = (
    <Paper className={classes.panel}>
      <Box className={classes.panelHead}>
        <Typography className={classes.panelTitle}>Resumo executivo e produtividade</Typography>
        <Button className={classes.secondaryBtn} startIcon={<RefreshIcon />} onClick={refreshAll}>Atualizar dados</Button>
      </Box>
      <Box style={{ padding: 12 }}>
        <Typography style={{ color: "#5d7d6b", fontSize: ".8rem" }}>
          Este painel consolida grupos sincronizados, membros, campanhas e execução operacional em tempo real.
        </Typography>
      </Box>
    </Paper>
  );

  const renderGroups = (
    <Grid container spacing={2}>
      <Grid item xs={12} md={5}>
        <Paper className={classes.panel}>
          <Box className={classes.controls}>
            <FormControl variant="outlined" size="small"><InputLabel>Conexão</InputLabel><Select value={selectedConnection} onChange={(e) => setSelectedConnection(e.target.value)} label="Conexão"><MenuItem value="">Todas</MenuItem>{connections.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select></FormControl>
            <TextField variant="outlined" size="small" placeholder="Buscar grupo" value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
            <TextField variant="outlined" size="small" placeholder="Mín" value={minMembers} onChange={(e) => setMinMembers(e.target.value)} />
            <TextField variant="outlined" size="small" placeholder="Máx" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} />
            <Button className={classes.secondaryBtn} startIcon={<RefreshIcon />} onClick={syncGroups}>Sincronizar</Button>
            <Button className={classes.primaryBtn} startIcon={<AddIcon />} onClick={() => setCreateGroupModal(true)}>Novo</Button>
          </Box>
          <Box className={classes.list}>
            {filteredGroups.map((g) => (
              <Box key={`${g.id}-${g.whatsappId}`} className={`${classes.row} ${selectedGroup?.id === g.id ? classes.rowActive : ""}`} onClick={() => loadGroupInfo(g)}>
                <Box>
                  <Typography style={{ fontWeight: 700, color: "#173624", fontSize: ".82rem" }}>{g.subject || g.id}</Typography>
                  <Typography style={{ color: "#5d7d6b", fontSize: ".71rem" }}>{g.size || 0} membros • {g.whatsappName}</Typography>
                </Box>
                <Box style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className={classes.badge}>{g.tags?.length || 0} tags</span>
                  <Button size="small" className={classes.secondaryBtn} onClick={(e) => { e.stopPropagation(); api.patch(`/group-management/groups/meta/${g.groupId}`, { isFavorite: !g.isFavorite }).then(refreshAll); }}>{g.isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}</Button>
                </Box>
              </Box>
            ))}
            {!filteredGroups.length ? <Box style={{ padding: 24, textAlign: "center", color: "#6a8978" }}>Nenhum grupo encontrado.</Box> : null}
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={7}>
        <Paper className={classes.panel}>
          {!selectedGroup ? <Box style={{ padding: 24, textAlign: "center", color: "#6a8978" }}>Selecione um grupo para ver membros e ações.</Box> : (
            <>
              <Box className={classes.panelHead}>
                <Box><Typography className={classes.panelTitle}>{selectedGroup.subject}</Typography><Typography style={{ color: "#5d7d6b", fontSize: ".72rem" }}>{(groupInfo?.participants || []).length} membros</Typography></Box>
                <Box style={{ display: "flex", gap: 8 }}>
                  <Button className={classes.secondaryBtn} onClick={async () => { try { await api.post(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/tag-all`, { whatsappId: selectedGroup.whatsappId, message: "Comunicado para todos:" }); toast.success("Menção enviada."); } catch { toast.error("Erro ao mencionar."); } }}>Mencionar todos</Button>
                  <Button className={classes.secondaryBtn} onClick={async () => { try { const { data } = await api.get(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/invite-link`, { params: { whatsappId: selectedGroup.whatsappId } }); if (navigator.clipboard) navigator.clipboard.writeText(data.inviteLink); toast.success("Link copiado."); } catch { toast.error("Erro ao obter link."); } }}>Link convite</Button>
                  <Button className={classes.secondaryBtn} onClick={() => exportMembers('csv')}>Exportar</Button>
                </Box>
              </Box>
              <Box className={classes.list}>
                {(groupInfo?.participants || []).map((member) => (
                  <Box key={member.id} className={classes.row} style={{ cursor: "default" }}>
                    <Box><Typography style={{ fontSize: ".8rem", fontWeight: 700 }}>{String(member.id).split("@")[0]}</Typography><Typography style={{ fontSize: ".7rem", color: "#5d7d6b" }}>{member.id}</Typography></Box>
                    <Box style={{ display: "flex", gap: 6 }}>
                      {member.isAdmin ? <Chip size="small" label="Admin" style={{ background: "#fef3c7" }} /> : null}
                      {!member.isAdmin ? <Button size="small" className={classes.secondaryBtn} onClick={() => api.post(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/members/${encodeURIComponent(member.id)}/promote`, { whatsappId: selectedGroup.whatsappId }).then(() => loadGroupInfo(selectedGroup))}>Promover</Button> : <Button size="small" className={classes.secondaryBtn} onClick={() => api.post(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/members/${encodeURIComponent(member.id)}/demote`, { whatsappId: selectedGroup.whatsappId }).then(() => loadGroupInfo(selectedGroup))}>Rebaixar</Button>}
                      <Button size="small" className={classes.secondaryBtn} onClick={() => api.delete(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/members/${encodeURIComponent(member.id)}`, { data: { whatsappId: selectedGroup.whatsappId } }).then(() => loadGroupInfo(selectedGroup))}>Remover</Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  const renderCampaigns = (
    <Grid container spacing={2}>
      <Grid item xs={12} md={8}>
        <Paper className={classes.panel}>
          <Box className={classes.panelHead}><Typography className={classes.panelTitle}>Campanhas de grupos</Typography></Box>
          <Box style={{ padding: 10, display: "grid", gap: 8 }}>
            <TextField variant="outlined" size="small" label="Nome" value={campaignForm.name} onChange={(e) => setCampaignForm((p) => ({ ...p, name: e.target.value }))} />
            <FormControl variant="outlined" size="small"><InputLabel>Conexão</InputLabel><Select value={campaignForm.whatsappId} onChange={(e) => setCampaignForm((p) => ({ ...p, whatsappId: e.target.value }))} label="Conexão">{connections.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select></FormControl>
            <FormControl variant="outlined" size="small">
              <InputLabel>Tipo de conteúdo</InputLabel>
              <Select value={campaignForm.messageType || "text"} onChange={(e) => { setCampaignForm((p) => ({ ...p, messageType: e.target.value, mediaContent: null })); }} label="Tipo de conteúdo">
                <MenuItem value="text">Texto</MenuItem>
                <MenuItem value="imagem">Imagem</MenuItem>
                <MenuItem value="video">Vídeo</MenuItem>
                <MenuItem value="audio">Áudio PTT (Gravado na hora)</MenuItem>
                <MenuItem value="documento">Documento</MenuItem>
              </Select>
            </FormControl>
            {campaignForm.messageType !== "text" && (
              <Box>
                <input 
                  type="file" 
                  accept={
                    campaignForm.messageType === "video" ? "video/mp4,video/quicktime" : 
                    campaignForm.messageType === "audio" ? "audio/mpeg,audio/ogg,audio/wav" : 
                    campaignForm.messageType === "imagem" ? "image/jpeg,image/png" : 
                    "*/*"
                  } 
                  onChange={(e) => setCampaignForm(p => ({ ...p, mediaContent: e.target.files[0] }))} 
                />
                <Typography style={{ fontSize: '.7rem', color: '#5d7d6b' }}>
                  {campaignForm.messageType === "video" ? "Formatos aceitos: mp4, mov" : 
                   campaignForm.messageType === "audio" ? "Formatos aceitos: mp3, ogg, wav" : 
                   campaignForm.messageType === "imagem" ? "Formatos aceitos: jpg, png" : 
                   "Formatos aceitos: pdf, docx, xlsx, etc"}
                </Typography>
              </Box>
            )}
            
            <TextField variant="outlined" size="small" label={campaignForm.messageType === "text" ? "Mensagem" : "Legenda (Opcional)"} multiline rows={3} value={campaignForm.message} onChange={(e) => setCampaignForm((p) => ({ ...p, message: e.target.value }))} />
            
            <FormControl variant="outlined" size="small">
              <InputLabel>Mencionar membros</InputLabel>
              <Select value={campaignForm.mentionsMode || "none"} onChange={(e) => setCampaignForm((p) => ({ ...p, mentionsMode: e.target.value }))} label="Mencionar membros">
                <MenuItem value="none">Não mencionar</MenuItem>
                <MenuItem value="all">Mencionar todos (@todos)</MenuItem>
              </Select>
            </FormControl>

            <FormControl variant="outlined" size="small">
              <InputLabel>Grupos alvos (Vazio = Todos da conexão)</InputLabel>
              <Select 
                multiple 
                value={campaignForm.groupIds || []} 
                onChange={(e) => setCampaignForm((p) => ({ ...p, groupIds: e.target.value }))} 
                label="Grupos alvos (Vazio = Todos da conexão)"
                renderValue={(selected) => <Box style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{selected.map((val) => <Chip key={val} size="small" label={groups.find(g => g.id === val)?.subject || val} />)}</Box>}
              >
                {groups.filter(g => !campaignForm.whatsappId || g.whatsappId === Number(campaignForm.whatsappId)).map((g) => (
                  <MenuItem key={g.id} value={g.id}>{g.subject}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <TextField 
                type="number" 
                variant="outlined" 
                size="small" 
                label="Intervalo entre grupos (segundos)" 
                value={campaignForm.intervalSeconds} 
                onChange={(e) => setCampaignForm((p) => ({ ...p, intervalSeconds: e.target.value }))} 
              />
              <FormControl variant="outlined" size="small">
                <InputLabel>Simular digitação/gravação</InputLabel>
                <Select value="yes" label="Simular digitação/gravação" disabled>
                  <MenuItem value="yes">Sim</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <FormControl variant="outlined" size="small">
              <InputLabel>Tipo de envio</InputLabel>
              <Select value={campaignForm.scheduleMode || "now"} onChange={(e) => setCampaignForm((p) => ({ ...p, scheduleMode: e.target.value }))} label="Tipo de envio">
                <MenuItem value="now">Enviar agora</MenuItem>
                <MenuItem value="scheduled">Agendar envio</MenuItem>
              </Select>
            </FormControl>
            {campaignForm.scheduleMode === "scheduled" && (
              <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <TextField type="datetime-local" variant="outlined" size="small" label="Data e hora do envio" InputLabelProps={{ shrink: true }} value={campaignForm.scheduledAt} onChange={(e) => setCampaignForm((p) => ({ ...p, scheduledAt: e.target.value }))} />
                <FormControl variant="outlined" size="small">
                  <InputLabel>Recorrência</InputLabel>
                  <Select value={campaignForm.recurrenceRule || "none"} onChange={(e) => setCampaignForm((p) => ({ ...p, recurrenceRule: e.target.value }))} label="Recorrência">
                    <MenuItem value="none">Único</MenuItem>
                    <MenuItem value="daily">Diário</MenuItem>
                    <MenuItem value="weekly">Semanal</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            <Button className={classes.primaryBtn} startIcon={<SendIcon />} onClick={createCampaign}>Criar campanha</Button>
          </Box>
          <Box className={classes.list}>
            {campaigns.map((c) => (
              <Box key={c.id} className={classes.row} style={{ cursor: "default" }}>
                <Box><Typography style={{ fontSize: ".82rem", fontWeight: 700 }}>{c.name}</Typography><Typography style={{ fontSize: ".7rem", color: "#5d7d6b" }}>{c.totalGroups || 0} grupos • {c.successCount || 0} sucesso • {c.failedCount || 0} falhas</Typography></Box>
                <Box style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Chip size="small" label={c.status} style={{ backgroundColor: `${statusBg(c.status)}22`, color: statusBg(c.status), fontWeight: 700 }} />
                  <Button size="small" className={classes.secondaryBtn} onClick={() => campaignAction(c.id, "start")}>Iniciar</Button>
                  <Button size="small" className={classes.secondaryBtn} onClick={() => campaignAction(c.id, "pause")}>Pausar</Button>
                  <Button size="small" className={classes.secondaryBtn} onClick={() => campaignAction(c.id, "resume")}>Retomar</Button>
                  <Button size="small" className={classes.secondaryBtn} onClick={() => campaignAction(c.id, "cancel")}>Cancelar</Button>
                  <Button size="small" className={classes.secondaryBtn} onClick={() => api.get(`/group-management/campaigns/${c.id}/logs`).then((r) => setCampaignLogs(r.data || []))}>Logs</Button>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper className={classes.panel}>
          <Box className={classes.panelHead}><Typography className={classes.panelTitle}>Logs da campanha</Typography></Box>
          <Box className={classes.log}>{campaignLogs.map((l) => <Box key={l.id} className={classes.logLine}><strong>[{l.type}]</strong> {l.message}<br />{new Date(l.createdAt).toLocaleString("pt-BR")}</Box>)}</Box>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderSimpleList = (title, items, field = "name") => (
    <Paper className={classes.panel}>
      <Box className={classes.panelHead}><Typography className={classes.panelTitle}>{title}</Typography></Box>
      <Box className={classes.list}>
        {(items || []).map((it) => <Box key={it.id || it.createdAt} className={classes.row} style={{ cursor: "default" }}><Typography>{it[field] || it.message || "-"}</Typography></Box>)}
        {!items?.length ? <Box style={{ padding: 20, textAlign: "center", color: "#6a8978" }}>Sem dados.</Box> : null}
      </Box>
    </Paper>
  );

  return (
    <Box className={classes.root}>
      <Box className={classes.shell}>
        <Box className={classes.header}>
          <Box className={classes.titleRow}>
            <Box className={classes.titleIcon}><GroupIcon /></Box>
            <Box><Typography className={classes.title}>Gestão de Grupos • Centro Operacional</Typography><Typography className={classes.subtitle}>Ecossistema de grupos no padrão verde premium do módulo de Disparos.</Typography></Box>
          </Box>
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

        <Box className={classes.tabsShell}><Tabs className={classes.tabs} value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">{TABS.map((label) => <Tab key={label} label={label} className={classes.tab} />)}</Tabs></Box>

        <Box className={classes.content}>
          {loading ? <Box style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><CircularProgress style={{ color: "#15763f" }} /></Box> : null}
          {!loading && tab === 0 ? renderDashboard : null}
          {!loading && tab === 1 ? renderGroups : null}
          {!loading && tab === 2 ? renderCampaigns : null}
          {!loading && tab === 3 ? renderSimpleList("Agendamentos", schedules) : null}
          {!loading && tab === 4 ? (
            <Paper className={classes.panel}>
              <Box className={classes.panelHead}><Typography className={classes.panelTitle}>Templates</Typography></Box>
              <Box style={{ padding: 10, display: "grid", gap: 8 }}>
                <TextField variant="outlined" size="small" label="Nome do template" value={templateForm.name} onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))} />
                <TextField variant="outlined" size="small" label="Mensagem" multiline rows={3} value={templateForm.message} onChange={(e) => setTemplateForm((p) => ({ ...p, message: e.target.value }))} />
                <Button className={classes.primaryBtn} startIcon={<AddIcon />} onClick={saveTemplate}>Salvar template</Button>
              </Box>
              <Box className={classes.list}>{(templates || []).map((t) => t ? <Box key={t.id || Math.random()} className={classes.row} style={{ cursor: "default" }}><Typography>{t.name || "Sem nome"}</Typography><Button size="small" className={classes.secondaryBtn} onClick={() => api.delete(`/group-management/templates/${t.id}`).then(refreshAll)}>Excluir</Button></Box> : null)}</Box>
            </Paper>
          ) : null}
          {!loading && tab === 5 ? renderSimpleList("Histórico", historyLogs, "message") : null}
          {!loading && tab === 6 ? renderSimpleList("Relatórios de campanhas", reports?.campaigns || []) : null}
        </Box>
      </Box>

      <Dialog open={createGroupModal} onClose={() => setCreateGroupModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Criar Novo Grupo</DialogTitle>
        <DialogContent style={{ display: "grid", gap: 12, paddingTop: 8 }}>
          <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel>Conexão (WhatsApp)</InputLabel>
            <Select value={newGroupForm.whatsappId} onChange={(e) => setNewGroupForm(p => ({ ...p, whatsappId: e.target.value }))} label="Conexão (WhatsApp)">
              {connections.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField variant="outlined" size="small" label="Nome do grupo" fullWidth value={newGroupForm.subject} onChange={(e) => setNewGroupForm(p => ({ ...p, subject: e.target.value }))} />
          <TextField variant="outlined" size="small" label="Participantes (Separados por vírgula)" fullWidth multiline rows={3} value={newGroupForm.participants} onChange={(e) => setNewGroupForm(p => ({ ...p, participants: e.target.value }))} placeholder="Ex: 5511999999999, 5511888888888" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateGroupModal(false)} color="secondary">Cancelar</Button>
          <Button onClick={handleCreateGroup} color="primary" variant="contained">Criar Grupo</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
