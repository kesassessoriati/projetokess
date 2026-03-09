import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import {
  makeStyles, Box, Paper, Typography, Button, IconButton, Grid, TextField, FormControl,
  InputLabel, Select, MenuItem, Chip, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableHead, TableBody, TableRow, TableCell
} from "@material-ui/core";
import { Add, Edit, Delete, ContentCopy, ViewKanban, ViewList, CalendarToday, Schedule } from "@material-ui/icons";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parseISO } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";
import dateFnsFormat from "date-fns/format";
import dateFnsParse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { toast } from "react-toastify";
import api from "../../services/api";
import MainContainer from "../../components/MainContainer";
import ContextPageHeader from "../../components/ContextPageHeader";

const localizer = dateFnsLocalizer({ format: dateFnsFormat, parse: dateFnsParse, startOfWeek, getDay, locales: { "pt-BR": ptBR } });
const PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "Site"];
const TYPES = ["Stories", "Reels", "Vídeo", "Short", "Carrossel", "Publicação", "Artigo"];
const PRIORITIES = ["Baixa", "Média", "Alta", "Urgente"];

const useStyles = makeStyles(theme => ({
  root: { height: "calc(100vh - 48px)", display: "flex", flexDirection: "column", background: "radial-gradient(circle at top left, #eefbf2 0%, #e3f2e8 42%, #dcebe2 100%)" },
  shell: { display: "flex", flexDirection: "column", gap: 10, padding: 12, height: "100%" },
  card: { borderRadius: 12, border: "1px solid #cfe2d5", background: "#ffffffea", padding: 10 },
  greenBtn: { textTransform: "none", borderRadius: 10, color: "#fff", fontWeight: 700, background: "linear-gradient(135deg, #22ab5d 0%, #15763f 100%)" },
  lightBtn: { textTransform: "none", borderRadius: 10, border: "1px solid #bfd7c7", background: "#f7fcf9", color: "#1c5a35", fontWeight: 700 },
  metrics: { display: "grid", gridTemplateColumns: "repeat(8,minmax(0,1fr))", gap: 8, [theme.breakpoints.down("md")]: { gridTemplateColumns: "repeat(4,minmax(0,1fr))" }, [theme.breakpoints.down("sm")]: { gridTemplateColumns: "repeat(2,minmax(0,1fr))" } },
  metric: { borderRadius: 10, border: "1px solid #cfe2d5", background: "#fff", padding: 8 },
  metricLabel: { fontSize: ".67rem", color: "#5d7d6b", textTransform: "uppercase", fontWeight: 800 },
  metricValue: { fontSize: "1rem", fontWeight: 900, color: "#173624" },
  tabs: { borderRadius: 12, border: "1px solid #cedfd3", background: "#ffffffea", padding: 6, "& .MuiTabs-indicator": { display: "none" } },
  tab: { textTransform: "none", border: "1px solid #d1e2d5", borderRadius: 10, marginRight: 8, minHeight: 38, color: "#365745", fontWeight: 700, background: "#f7fbf8", "&.Mui-selected": { color: "#fff", background: "linear-gradient(135deg, #22ab5d 0%, #15763f 100%)" } },
  filters: { borderRadius: 12, border: "1px solid #cedfd3", background: "#ffffffea", padding: 8, display: "grid", gridTemplateColumns: "1.2fr repeat(5,minmax(0,1fr))", gap: 8, [theme.breakpoints.down("md")]: { gridTemplateColumns: "1fr 1fr" } },
  area: { flex: 1, overflow: "auto", ...theme.scrollbarStyles },
  kanban: { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 12 },
  stage: { minWidth: 300, maxWidth: 300, borderRadius: 12, border: "1px solid #cfe2d5", background: "#fff" },
  stageHead: { padding: 10, borderBottom: "1px solid #e8f1eb", display: "flex", justifyContent: "space-between", alignItems: "center" },
  stageBody: { padding: 8, minHeight: 70, maxHeight: "65vh", overflowY: "auto" },
  item: { border: "1px solid #dbe9e1", borderRadius: 10, padding: 8, background: "#fdfefd", marginBottom: 8, cursor: "pointer" },
  listWrap: { borderRadius: 12, border: "1px solid #cedfd3", background: "#fff", overflow: "hidden" },
  calWrap: { borderRadius: 12, border: "1px solid #cedfd3", background: "#fff", padding: 10 }
}));

const pColor = p => (p === "Urgente" ? "#d32f2f" : p === "Alta" ? "#ef6c00" : p === "Média" ? "#2e7d32" : "#607d8b");
const parseDateTime = (d, t) => { if (!d) return null; const x = parseISO(`${d}T${t || "00:00"}:00`); return Number.isNaN(x.getTime()) ? null : x; };

export default function RedesSociais() {
  const classes = useStyles();
  const [boards, setBoards] = useState([]);
  const [users, setUsers] = useState([]);
  const [boardId, setBoardId] = useState("");
  const [overview, setOverview] = useState({ board: null, stages: [], contents: [], metrics: {} });
  const [view, setView] = useState(0);
  const [filters, setFilters] = useState({ search: "", stageId: "", platform: "", contentType: "", startDate: "", endDate: "" });
  const [boardModal, setBoardModal] = useState(false);
  const [cardModal, setCardModal] = useState(false);
  const [boardForm, setBoardForm] = useState({ id: null, name: "", description: "", relatedType: "", relatedName: "", color: "#1B8A5A" });
  const [cardForm, setCardForm] = useState({ id: null, boardId: "", stageId: "", title: "", entityName: "", platform: "", contentType: "", description: "", copyText: "", scriptText: "", publishDate: "", publishTime: "", driveLink: "", siteUrl: "", notes: "", responsibleId: "", priority: "Média", tagsInput: "" });

  const loadBoards = useCallback(async () => {
    const { data } = await api.get("/social-boards");
    const arr = Array.isArray(data) ? data : [];
    setBoards(arr);
    if (!boardId && arr[0]) setBoardId(String(arr[0].id));
    if (boardId && !arr.find(b => String(b.id) === String(boardId))) setBoardId(arr[0] ? String(arr[0].id) : "");
  }, [boardId]);

  const loadOverview = useCallback(async () => {
    if (!boardId) return setOverview({ board: null, stages: [], contents: [], metrics: {} });
    try {
      const { data } = await api.get(`/social-boards/${boardId}`, { params: { ...filters, stageId: filters.stageId || undefined, platform: filters.platform || undefined, contentType: filters.contentType || undefined, startDate: filters.startDate || undefined, endDate: filters.endDate || undefined, search: filters.search || undefined } });
      setOverview({ board: data.board || null, stages: data.stages || [], contents: data.contents || [], metrics: data.metrics || {} });
    } catch (_) { toast.error("Erro ao carregar quadro."); }
  }, [boardId, filters]);

  useEffect(() => { loadBoards(); api.get("/users/list").then(r => setUsers(Array.isArray(r.data) ? r.data : [])).catch(() => setUsers([])); }, [loadBoards]);
  useEffect(() => { const t = setTimeout(loadOverview, 200); return () => clearTimeout(t); }, [loadOverview]);

  const saveBoard = async () => {
    if (!boardForm.name) return toast.error("Nome do quadro é obrigatório.");
    try {
      if (boardForm.id) { await api.put(`/social-boards/${boardForm.id}`, boardForm); toast.success("Quadro atualizado."); }
      else { const { data } = await api.post("/social-boards", boardForm); toast.success("Quadro criado."); setBoardId(String(data.id)); }
      setBoardModal(false); loadBoards(); loadOverview();
    } catch (_) { toast.error("Falha ao salvar quadro."); }
  };

  const duplicateBoard = async () => { if (!boardId) return; try { const { data } = await api.post(`/social-boards/${boardId}/duplicate`); toast.success("Quadro duplicado."); setBoardId(String(data.id)); loadBoards(); } catch (_) { toast.error("Falha ao duplicar quadro."); } };
  const deleteBoard = async () => { if (!boardId || !window.confirm("Deseja excluir este quadro?")) return; try { await api.delete(`/social-boards/${boardId}`); toast.success("Quadro excluído."); setBoardId(""); loadBoards(); } catch (_) { toast.error("Falha ao excluir quadro."); } };

  const openCard = c => setCardForm(c ? { id: c.id, boardId: String(c.boardId), stageId: String(c.stageId), title: c.title || "", entityName: c.entityName || "", platform: c.platform || "", contentType: c.contentType || "", description: c.description || "", copyText: c.copyText || "", scriptText: c.scriptText || "", publishDate: c.publishDate || "", publishTime: c.publishTime || "", driveLink: c.driveLink || "", siteUrl: c.siteUrl || "", notes: c.notes || "", responsibleId: c.responsibleId ? String(c.responsibleId) : "", priority: c.priority || "Média", tagsInput: Array.isArray(c.tags) ? c.tags.join(", ") : "" } : { id: null, boardId, stageId: String(overview.stages?.[0]?.id || ""), title: "", entityName: "", platform: "", contentType: "", description: "", copyText: "", scriptText: "", publishDate: "", publishTime: "", driveLink: "", siteUrl: "", notes: "", responsibleId: "", priority: "Média", tagsInput: "" });
  const saveCard = async () => {
    if (!cardForm.title || !cardForm.stageId) return toast.error("Título e etapa são obrigatórios.");
    const payload = { boardId: Number(cardForm.boardId || boardId), stageId: Number(cardForm.stageId), title: cardForm.title, entityName: cardForm.entityName || null, platform: cardForm.platform || null, contentType: cardForm.contentType || null, description: cardForm.description || null, copyText: cardForm.copyText || null, scriptText: cardForm.scriptText || null, publishDate: cardForm.publishDate || null, publishTime: cardForm.publishTime || null, driveLink: cardForm.driveLink || null, siteUrl: cardForm.siteUrl || null, notes: cardForm.notes || null, responsibleId: cardForm.responsibleId ? Number(cardForm.responsibleId) : null, priority: cardForm.priority || "Média", tags: cardForm.tagsInput ? cardForm.tagsInput.split(",").map(x => x.trim()).filter(Boolean) : [] };
    try { cardForm.id ? await api.put(`/social-contents/${cardForm.id}`, payload) : await api.post("/social-contents", payload); toast.success("Card salvo."); setCardModal(false); loadOverview(); } catch (_) { toast.error("Falha ao salvar card."); }
  };
  const deleteCard = async () => { if (!cardForm.id || !window.confirm("Deseja excluir este card?")) return; try { await api.delete(`/social-contents/${cardForm.id}`); toast.success("Card excluído."); setCardModal(false); loadOverview(); } catch (_) { toast.error("Falha ao excluir card."); } };

  const onDragEnd = async r => {
    const { destination, source, draggableId } = r;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;
    try { await api.post(`/social-contents/${draggableId}/move`, { stageId: Number(destination.droppableId), order: destination.index }); loadOverview(); }
    catch (_) { toast.error("Falha ao mover card."); }
  };

  const events = useMemo(() => (overview.contents || []).filter(x => x.publishDate).map(x => {
    const start = parseDateTime(x.publishDate, x.publishTime); if (!start) return null;
    return { id: x.id, title: `${x.title}${x.platform ? ` (${x.platform})` : ""}`, start, end: new Date(start.getTime() + 3600000), resource: x };
  }).filter(Boolean), [overview.contents]);

  const m = overview.metrics || {};
  const clearFilters = () => setFilters({ search: "", stageId: "", platform: "", contentType: "", startDate: "", endDate: "" });

  return (
    <MainContainer>
      <Box className={classes.root}><Box className={classes.shell}>
        <ContextPageHeader title="Redes Sociais" subtitle="Gestão operacional de calendário editorial, conteúdo e publicação" fallbackTo="/dashboard" />

        <Paper className={classes.card}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gridGap={8}>
            <Box><Typography style={{ fontWeight: 800, color: "#173624" }}>Módulo Redes Sociais</Typography><Typography style={{ color: "#5d7d6b", fontSize: ".77rem" }}>Quadros por cliente, marca, projeto, empresa ou time interno</Typography></Box>
            <Button className={classes.greenBtn} startIcon={<Add />} onClick={() => { setBoardForm({ id: null, name: "", description: "", relatedType: "", relatedName: "", color: "#1B8A5A" }); setBoardModal(true); }}>Novo Quadro</Button>
          </Box>
          <Box mt={1} display="grid" gridTemplateColumns="260px 1fr auto auto auto" gridGap={8}>
            <FormControl variant="outlined" size="small"><InputLabel>Quadro</InputLabel><Select value={boardId} onChange={e => setBoardId(e.target.value)} label="Quadro">{boards.map(b => <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>)}</Select></FormControl>
            <TextField variant="outlined" size="small" label="Busca no quadro" value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
            <Button className={classes.lightBtn} startIcon={<Edit />} disabled={!boardId} onClick={() => { if (!overview.board) return; setBoardForm({ id: overview.board.id, name: overview.board.name || "", description: overview.board.description || "", relatedType: overview.board.relatedType || "", relatedName: overview.board.relatedName || "", color: overview.board.color || "#1B8A5A" }); setBoardModal(true); }}>Editar</Button>
            <Button className={classes.lightBtn} startIcon={<ContentCopy />} disabled={!boardId} onClick={duplicateBoard}>Duplicar</Button>
            <Button className={classes.lightBtn} startIcon={<Delete />} disabled={!boardId} onClick={deleteBoard}>Excluir</Button>
          </Box>
        </Paper>

        <Box className={classes.metrics}>
          {[ ["Total", m.totalContents], ["Planejamento", m.inPlanning], ["Produção", m.inProduction], ["Revisão", m.inReview], ["Agendado", m.scheduled], ["Publicado", m.published], ["Hoje", m.publishToday], ["Atrasados", m.overdue] ].map(([k,v]) => <Paper key={k} className={classes.metric}><Typography className={classes.metricLabel}>{k}</Typography><Typography className={classes.metricValue}>{v || 0}</Typography></Paper>)}
        </Box>

        <Paper className={classes.tabs}><Tabs value={view} onChange={(_, v) => setView(v)}><Tab className={classes.tab} icon={<ViewKanban />} label="Kanban" /><Tab className={classes.tab} icon={<ViewList />} label="Lista" /><Tab className={classes.tab} icon={<CalendarToday />} label="Calendário" /></Tabs></Paper>

        <Paper className={classes.filters}>
          <FormControl variant="outlined" size="small"><InputLabel>Etapa</InputLabel><Select value={filters.stageId} onChange={e => setFilters(p => ({ ...p, stageId: e.target.value }))} label="Etapa"><MenuItem value="">Todas</MenuItem>{(overview.stages || []).map(s => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}</Select></FormControl>
          <FormControl variant="outlined" size="small"><InputLabel>Plataforma</InputLabel><Select value={filters.platform} onChange={e => setFilters(p => ({ ...p, platform: e.target.value }))} label="Plataforma"><MenuItem value="">Todas</MenuItem>{PLATFORMS.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</Select></FormControl>
          <FormControl variant="outlined" size="small"><InputLabel>Tipo</InputLabel><Select value={filters.contentType} onChange={e => setFilters(p => ({ ...p, contentType: e.target.value }))} label="Tipo"><MenuItem value="">Todos</MenuItem>{TYPES.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</Select></FormControl>
          <TextField variant="outlined" size="small" type="date" label="De" InputLabelProps={{ shrink: true }} value={filters.startDate} onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))} />
          <TextField variant="outlined" size="small" type="date" label="Até" InputLabelProps={{ shrink: true }} value={filters.endDate} onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))} />
          <Button className={classes.lightBtn} onClick={clearFilters}>Limpar filtros</Button>
        </Paper>

        <Box className={classes.area}>
          {view === 0 && <DragDropContext onDragEnd={onDragEnd}><Box className={classes.kanban}>{(overview.stages || []).map(stage => <Paper key={stage.id} className={classes.stage}><Box className={classes.stageHead} style={{ borderTop: `3px solid ${stage.color || "#1B8A5A"}` }}><Box><Typography style={{ fontWeight: 800, color: "#173624", fontSize: ".84rem" }}>{stage.name}</Typography><Typography style={{ fontSize: ".72rem", color: "#5d7d6b" }}>{stage.contents?.length || 0} cards</Typography></Box><IconButton size="small" onClick={() => { openCard(null); setCardForm(p => ({ ...p, stageId: String(stage.id), boardId })); setCardModal(true); }}><Add fontSize="small" /></IconButton></Box><Droppable droppableId={String(stage.id)}>{provided => <Box ref={provided.innerRef} {...provided.droppableProps} className={classes.stageBody}>{(stage.contents || []).map((i, idx) => <Draggable key={String(i.id)} draggableId={String(i.id)} index={idx}>{drag => <Box ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps} className={classes.item} onClick={() => { openCard(i); setCardModal(true); }}><Typography style={{ fontWeight: 700, color: "#173624", fontSize: ".82rem" }}>{i.title}</Typography><Box mt={0.5} display="flex" gridGap={4} flexWrap="wrap">{i.platform ? <Chip size="small" label={i.platform} /> : null}{i.contentType ? <Chip size="small" label={i.contentType} /> : null}{i.priority ? <Chip size="small" label={i.priority} style={{ backgroundColor: `${pColor(i.priority)}22`, color: pColor(i.priority), fontWeight: 700 }} /> : null}</Box>{i.publishDate ? <Typography style={{ marginTop: 6, fontSize: ".72rem", color: "#4d6d5c", display: "flex", alignItems: "center", gap: 4 }}><Schedule style={{ fontSize: 14 }} />{format(parseISO(i.publishDate), "dd/MM/yyyy")} {i.publishTime || ""}</Typography> : null}</Box>}</Draggable>)}{provided.placeholder}</Box>}</Droppable></Paper>)}</Box></DragDropContext>}

          {view === 1 && <Paper className={classes.listWrap}><Table size="small"><TableHead><TableRow><TableCell>Título</TableCell><TableCell>Etapa</TableCell><TableCell>Plataforma</TableCell><TableCell>Tipo</TableCell><TableCell>Responsável</TableCell><TableCell>Publicação</TableCell><TableCell>Prioridade</TableCell><TableCell align="right">Ações</TableCell></TableRow></TableHead><TableBody>{(overview.contents || []).map(i => <TableRow key={i.id} hover><TableCell>{i.title}</TableCell><TableCell>{i.stage?.name || "-"}</TableCell><TableCell>{i.platform || "-"}</TableCell><TableCell>{i.contentType || "-"}</TableCell><TableCell>{i.responsible?.name || "-"}</TableCell><TableCell>{i.publishDate ? `${format(parseISO(i.publishDate), "dd/MM/yyyy")} ${i.publishTime || ""}` : "-"}</TableCell><TableCell>{i.priority ? <Chip size="small" label={i.priority} style={{ backgroundColor: `${pColor(i.priority)}22`, color: pColor(i.priority), fontWeight: 700 }} /> : "-"}</TableCell><TableCell align="right"><IconButton size="small" onClick={() => { openCard(i); setCardModal(true); }}><Edit fontSize="small" /></IconButton></TableCell></TableRow>)}{(overview.contents || []).length === 0 && <TableRow><TableCell colSpan={8} align="center">Nenhum conteúdo encontrado.</TableCell></TableRow>}</TableBody></Table></Paper>}

          {view === 2 && <Paper className={classes.calWrap}><Calendar localizer={localizer} events={events} startAccessor="start" endAccessor="end" style={{ height: "66vh" }} views={["month", "week", "day", "agenda"]} onSelectEvent={e => { openCard(e.resource); setCardModal(true); }} messages={{ next: "Próximo", previous: "Anterior", today: "Hoje", month: "Mês", week: "Semana", day: "Dia", agenda: "Agenda", date: "Data", time: "Hora", event: "Publicação", noEventsInRange: "Sem publicações no período." }} /></Paper>}
        </Box>
      </Box></Box>

      <Dialog open={boardModal} onClose={() => setBoardModal(false)} fullWidth maxWidth="sm"><DialogTitle>{boardForm.id ? "Editar quadro" : "Novo quadro de Redes Sociais"}</DialogTitle><DialogContent><Grid container spacing={1}><Grid item xs={12} md={6}><TextField variant="outlined" size="small" fullWidth label="Nome" value={boardForm.name} onChange={e => setBoardForm(p => ({ ...p, name: e.target.value }))} /></Grid><Grid item xs={12} md={6}><TextField variant="outlined" size="small" fullWidth label="Tipo de vínculo" value={boardForm.relatedType} onChange={e => setBoardForm(p => ({ ...p, relatedType: e.target.value }))} /></Grid><Grid item xs={12} md={6}><TextField variant="outlined" size="small" fullWidth label="Nome do vínculo" value={boardForm.relatedName} onChange={e => setBoardForm(p => ({ ...p, relatedName: e.target.value }))} /></Grid><Grid item xs={12} md={6}><TextField variant="outlined" size="small" fullWidth type="color" label="Cor" InputLabelProps={{ shrink: true }} value={boardForm.color} onChange={e => setBoardForm(p => ({ ...p, color: e.target.value }))} /></Grid><Grid item xs={12}><TextField variant="outlined" size="small" fullWidth multiline rows={3} label="Descrição" value={boardForm.description} onChange={e => setBoardForm(p => ({ ...p, description: e.target.value }))} /></Grid></Grid></DialogContent><DialogActions><Button onClick={() => setBoardModal(false)}>Cancelar</Button><Button className={classes.greenBtn} onClick={saveBoard}>Salvar</Button></DialogActions></Dialog>

      <Dialog open={cardModal} onClose={() => setCardModal(false)} fullWidth maxWidth="md"><DialogTitle>{cardForm.id ? "Editar conteúdo" : "Novo conteúdo"}</DialogTitle><DialogContent><Grid container spacing={1}><Grid item xs={12} md={6}><TextField variant="outlined" size="small" fullWidth label="Título do conteúdo" value={cardForm.title} onChange={e => setCardForm(p => ({ ...p, title: e.target.value }))} /></Grid><Grid item xs={12} md={6}><TextField variant="outlined" size="small" fullWidth label="Cliente / marca / projeto" value={cardForm.entityName} onChange={e => setCardForm(p => ({ ...p, entityName: e.target.value }))} /></Grid><Grid item xs={12} md={4}><FormControl variant="outlined" size="small" fullWidth><InputLabel>Etapa</InputLabel><Select value={cardForm.stageId} onChange={e => setCardForm(p => ({ ...p, stageId: e.target.value }))} label="Etapa">{(overview.stages || []).map(s => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}</Select></FormControl></Grid><Grid item xs={12} md={4}><FormControl variant="outlined" size="small" fullWidth><InputLabel>Plataforma</InputLabel><Select value={cardForm.platform} onChange={e => setCardForm(p => ({ ...p, platform: e.target.value }))} label="Plataforma">{PLATFORMS.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</Select></FormControl></Grid><Grid item xs={12} md={4}><FormControl variant="outlined" size="small" fullWidth><InputLabel>Tipo</InputLabel><Select value={cardForm.contentType} onChange={e => setCardForm(p => ({ ...p, contentType: e.target.value }))} label="Tipo">{TYPES.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</Select></FormControl></Grid><Grid item xs={12}><TextField variant="outlined" size="small" fullWidth multiline rows={2} label="Descrição" value={cardForm.description} onChange={e => setCardForm(p => ({ ...p, description: e.target.value }))} /></Grid><Grid item xs={12} md={6}><TextField variant="outlined" size="small" fullWidth multiline rows={3} label="Copy" value={cardForm.copyText} onChange={e => setCardForm(p => ({ ...p, copyText: e.target.value }))} /></Grid><Grid item xs={12} md={6}><TextField variant="outlined" size="small" fullWidth multiline rows={3} label="Roteiro" value={cardForm.scriptText} onChange={e => setCardForm(p => ({ ...p, scriptText: e.target.value }))} /></Grid><Grid item xs={12} md={3}><TextField variant="outlined" size="small" fullWidth type="date" label="Data de publicação" InputLabelProps={{ shrink: true }} value={cardForm.publishDate} onChange={e => setCardForm(p => ({ ...p, publishDate: e.target.value }))} /></Grid><Grid item xs={12} md={3}><TextField variant="outlined" size="small" fullWidth type="time" label="Horário" InputLabelProps={{ shrink: true }} value={cardForm.publishTime} onChange={e => setCardForm(p => ({ ...p, publishTime: e.target.value }))} /></Grid><Grid item xs={12} md={3}><FormControl variant="outlined" size="small" fullWidth><InputLabel>Prioridade</InputLabel><Select value={cardForm.priority} onChange={e => setCardForm(p => ({ ...p, priority: e.target.value }))} label="Prioridade">{PRIORITIES.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</Select></FormControl></Grid><Grid item xs={12} md={3}><FormControl variant="outlined" size="small" fullWidth><InputLabel>Responsável</InputLabel><Select value={cardForm.responsibleId} onChange={e => setCardForm(p => ({ ...p, responsibleId: e.target.value }))} label="Responsável"><MenuItem value="">Sem responsável</MenuItem>{users.map(u => <MenuItem key={u.id} value={String(u.id)}>{u.name}</MenuItem>)}</Select></FormControl></Grid><Grid item xs={12} md={6}><TextField variant="outlined" size="small" fullWidth label="Link Drive / pasta / arquivo" value={cardForm.driveLink} onChange={e => setCardForm(p => ({ ...p, driveLink: e.target.value }))} /></Grid><Grid item xs={12} md={6}><TextField variant="outlined" size="small" fullWidth label="URL do site" value={cardForm.siteUrl} onChange={e => setCardForm(p => ({ ...p, siteUrl: e.target.value }))} /></Grid><Grid item xs={12}><TextField variant="outlined" size="small" fullWidth label="Tags (separadas por vírgula)" value={cardForm.tagsInput} onChange={e => setCardForm(p => ({ ...p, tagsInput: e.target.value }))} /></Grid><Grid item xs={12}><TextField variant="outlined" size="small" fullWidth multiline rows={2} label="Observações operacionais" value={cardForm.notes} onChange={e => setCardForm(p => ({ ...p, notes: e.target.value }))} /></Grid></Grid></DialogContent><DialogActions>{cardForm.id ? <Button onClick={deleteCard} color="secondary" startIcon={<Delete />}>Excluir</Button> : null}<Box style={{ flex: 1 }} /><Button onClick={() => setCardModal(false)}>Cancelar</Button><Button className={classes.greenBtn} onClick={saveCard}>Salvar</Button></DialogActions></Dialog>
    </MainContainer>
  );
}

