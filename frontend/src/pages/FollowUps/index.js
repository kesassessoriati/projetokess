import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  makeStyles,
  InputLabel,
  FormControl,
  CircularProgress,
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import BarChartIcon from "@material-ui/icons/BarChart";
import DashboardIcon from "@material-ui/icons/Dashboard";
import ViewColumnIcon from "@material-ui/icons/ViewColumn";
import ViewListIcon from "@material-ui/icons/ViewList";
import SettingsIcon from "@material-ui/icons/Settings";
import SaveIcon from "@material-ui/icons/Save";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import TimelineIcon from "@material-ui/icons/Timeline";
import TrendingUpIcon from "@material-ui/icons/TrendingUp";
import ForumIcon from "@material-ui/icons/Forum";
import { toast } from "react-toastify";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { usePlanPermissions } from "../../context/PlanPermissionsContext";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import MediaDrivePickerModal from "../../components/MediaDrivePickerModal";

const GREEN = "#2e7d32";
const GREEN_DARK = "#1f5b24";
const FOLLOW_UP_ALLOWED_MESSAGE_TYPES = ["text", "image", "video", "audio", "document", "media", "buttons"];
const FOLLOW_UP_TRIGGER_VALUE = "message_sent";
const FOLLOW_UP_TRIGGER_LABEL = "Mensagem enviada ao cliente";
const FOLLOW_UP_TARGET_OPTIONS = [
  { value: "all", label: "Todos os contatos com conversa ativa", icon: <ForumIcon fontSize="small" /> },
  { value: "tags", label: "Somente por etiquetas", icon: <LocalOfferIcon fontSize="small" /> },
  { value: "pipeline_stage", label: "Somente por etapa do funil", icon: <TimelineIcon fontSize="small" /> },
  { value: "hybrid", label: "Etiquetas ou etapa do funil", icon: <TrendingUpIcon fontSize="small" /> },
];

const TRIGGER_TYPE_OPTIONS = [
  { value: "message_sent", label: "Sem responder (após mensagem enviada)", description: "Inicia quando a empresa envia uma mensagem e o lead não responde dentro do prazo de cada etapa." },
  { value: "no_reply", label: "Sem responder por X tempo", description: "Inicia quando o lead não responde por um período configurado após qualquer mensagem." },
  { value: "time_in_crm_stage", label: "Tempo em coluna do CRM", description: "Inicia quando um lead permanece em uma etapa do funil por mais tempo que o configurado." },
  { value: "tag_added", label: "Tag adicionada", description: "Inicia automaticamente quando uma tag específica é adicionada ao contato ou ticket." },
  { value: "stage_change", label: "Mudança de etapa", description: "Inicia quando o lead muda para uma etapa específica do funil." },
  { value: "unread_after_hours", label: "Não lida após X horas", description: "Inicia quando um ticket permanece não lido por mais tempo que o configurado." },
];

const STEP_TYPE_OPTIONS = [
  { value: "send_message", label: "Enviar Mensagem" },
  { value: "wait", label: "Aguardar" },
  { value: "move_crm", label: "Mover no CRM" },
  { value: "add_tag", label: "Adicionar Tag" },
  { value: "condition", label: "Condição" },
  { value: "webhook", label: "Webhook" },
];

const REPLY_ACTION_OPTIONS = [
  { value: "none", label: "Nenhuma ação", disabled: false },
  { value: "activate_ai", label: "Ativar Agente de IA — em breve", disabled: true },
  { value: "move_crm", label: "Mover no CRM", disabled: false },
  { value: "add_tag", label: "Adicionar Tag", disabled: false },
];

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    background:
      "radial-gradient(circle at top left, rgba(46,125,50,0.08), transparent 28%), linear-gradient(180deg, #f8fbf8 0%, #f5f7fb 100%)",
    minHeight: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(3),
    gap: theme.spacing(2),
    flexWrap: "wrap",
  },
  heroCard: {
    padding: theme.spacing(3),
    borderRadius: 24,
    marginBottom: theme.spacing(3),
    background: "linear-gradient(135deg, #10261a 0%, #1b4d33 48%, #2e7d32 100%)",
    color: "#ffffff",
    boxShadow: "0 22px 50px rgba(16, 38, 26, 0.24)",
    position: "relative",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    right: -80,
    top: -80,
    width: 220,
    height: 220,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 70%)",
    pointerEvents: "none",
  },
  heroTitle: {
    fontWeight: 800,
    marginBottom: theme.spacing(1),
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.84)",
    maxWidth: 780,
  },
  heroChipRow: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    marginTop: theme.spacing(2),
  },
  heroChip: {
    backgroundColor: "rgba(255,255,255,0.14)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.18)",
  },
  toolbar: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center",
    flexWrap: "wrap",
  },
  toggleButton: {
    borderColor: "#bdbdbd",
    color: "#374151",
    backgroundColor: "#ffffff",
    minWidth: 110,
  },
  toggleButtonActive: {
    backgroundColor: `${GREEN} !important`,
    color: "#ffffff !important",
    borderColor: `${GREEN} !important`,
    "&:hover": {
      backgroundColor: `${GREEN_DARK} !important`,
      borderColor: `${GREEN_DARK} !important`,
    },
  },
  primaryBlackButton: {
    backgroundColor: "#111111",
    color: "#ffffff",
    "&:hover": {
      backgroundColor: "#000000",
    },
  },
  stageRow: {
    border: "1px solid #d8e4dc",
    borderRadius: 18,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbf8 100%)",
    boxShadow: "0 14px 34px rgba(16, 38, 26, 0.06)",
  },
  stageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(1.5),
  },
  statsBox: {
    display: "flex",
    gap: theme.spacing(3),
    flexWrap: "wrap",
    padding: theme.spacing(2),
  },
  statCard: {
    textAlign: "center",
    minWidth: 100,
  },
  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  overviewCard: {
    padding: theme.spacing(2.2),
    borderRadius: 18,
    border: "1px solid rgba(16, 38, 26, 0.08)",
    background: "linear-gradient(180deg, #ffffff 0%, #f7faf7 100%)",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  },
  overviewLabel: {
    color: "#6b7280",
    marginBottom: theme.spacing(1),
  },
  overviewValue: {
    fontWeight: 700,
    color: "#111827",
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    flexWrap: "wrap",
  },
  filterControl: {
    minWidth: 220,
  },
  boardHeaderCard: {
    padding: theme.spacing(2.5),
    borderRadius: 22,
    marginBottom: theme.spacing(2),
    background:
      "linear-gradient(135deg, rgba(46,125,50,0.1) 0%, rgba(46,125,50,0.03) 55%, rgba(16,38,26,0.04) 100%)",
    border: "1px solid rgba(46,125,50,0.14)",
    boxShadow: "0 12px 32px rgba(46,125,50,0.08)",
  },
  boardColumnsWrap: {
    display: "flex",
    gap: theme.spacing(2),
    overflowX: "auto",
    minHeight: "64vh",
    paddingBottom: theme.spacing(2),
  },
  boardColumn: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(245,249,246,0.98) 100%)",
    borderRadius: 22,
    padding: theme.spacing(2),
    minWidth: 350,
    maxWidth: 350,
    border: "1px solid rgba(16, 38, 26, 0.08)",
    boxShadow: "0 18px 36px rgba(15, 23, 42, 0.08)",
  },
  boardColumnHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  boardCard: {
    padding: theme.spacing(2),
    cursor: "grab",
    borderLeft: `5px solid ${GREEN}`,
    borderRadius: 18,
    boxShadow: "0 16px 30px rgba(16, 38, 26, 0.12)",
    background: "linear-gradient(180deg, #ffffff 0%, #fdfefd 100%)",
    border: "1px solid rgba(46,125,50,0.08)",
  },
  boardCardMeta: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    marginBottom: theme.spacing(1.5),
  },
  stageStatCard: {
    padding: theme.spacing(1.5),
    borderRadius: 14,
    background: "rgba(46,125,50,0.06)",
    border: "1px solid rgba(46,125,50,0.08)",
  },
  boardManagerLayout: {
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    gap: theme.spacing(2),
    minHeight: 420,
  },
  boardList: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: theme.spacing(1),
    overflowY: "auto",
  },
  boardListItem: {
    width: "100%",
    justifyContent: "flex-start",
    textTransform: "none",
    padding: theme.spacing(1.5),
    borderRadius: 10,
    marginBottom: theme.spacing(1),
    color: "#111827",
    border: "1px solid transparent",
  },
  boardListItemActive: {
    backgroundColor: "rgba(46,125,50,0.08)",
    borderColor: "rgba(46,125,50,0.2)",
  },
  boardEditor: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: theme.spacing(2),
  },
  columnRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  sectionCard: {
    padding: theme.spacing(2),
    borderRadius: 18,
    border: "1px solid #e5ebe7",
    background: "linear-gradient(180deg, #ffffff 0%, #f9fbfa 100%)",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
  },
  modalHero: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: 18,
    background: "linear-gradient(135deg, rgba(16,38,26,0.96) 0%, rgba(46,125,50,0.95) 100%)",
    color: "#fff",
  },
  stageMessageBox: {
    marginTop: theme.spacing(1.5),
  },
  chipFieldWrap: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    marginTop: theme.spacing(1),
  },
}));

const normalizeColumns = (columns = []) => {
  const items = (Array.isArray(columns) ? columns : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);

  if (!items.includes("Sem Categoria")) {
    items.unshift("Sem Categoria");
  }

  return items.length ? items : ["Sem Categoria"];
};

const buildEmptyBoardDraft = () => ({
  name: "",
  funnelName: "Geral",
  columns: ["Sem Categoria"],
});

const buildStarterStages = () => ([
  {
    order: 1,
    title: "Reativacao suave",
    delayMinutes: 60,
    messageType: "text",
    message: "Oi, {{firstName}}. Passei para retomar nosso contato e ver se ainda faz sentido seguirmos com isso por ai.",
    mediaUrl: "",
    mediaType: "",
    mediaCaption: "",
    mediaId: null,
    buttons: [],
    useAiRewrite: false,
    isActive: true,
  },
  {
    order: 2,
    title: "Valor e contexto",
    delayMinutes: 1440,
    messageType: "text",
    message: "Quero te ajudar a avancar sem complicacao. Se fizer sentido, me responde com sua maior duvida e eu te devolvo o caminho mais direto.",
    mediaUrl: "",
    mediaType: "",
    mediaCaption: "",
    mediaId: null,
    buttons: [],
    useAiRewrite: false,
    isActive: true,
  },
  {
    order: 3,
    title: "Ultima tentativa inteligente",
    delayMinutes: 4320,
    messageType: "text",
    message: "Antes de encerrar por aqui, posso te mandar um resumo objetivo com a melhor opcao para o seu caso?",
    mediaUrl: "",
    mediaType: "",
    mediaCaption: "",
    mediaId: null,
    buttons: [],
    useAiRewrite: true,
    isActive: true,
  },
]);

const emptyStage = () => ({
  order: 1,
  title: "",
  delayMinutes: 60,
  messageType: "text",
  message: "",
  mediaUrl: "",
  mediaType: "",
  mediaCaption: "",
  mediaId: null,
  buttons: [],
  useAiRewrite: false,
  isActive: true,
  stepType: "send_message",
  stepConfig: {},
});

const normalizeFollowUpStage = (stage = {}, order = 1) => ({
  ...emptyStage(),
  ...stage,
  order: stage.order ?? order,
  title: stage.title || `Etapa ${order}`,
  delayMinutes: Number(stage.delayMinutes) > 0 ? Number(stage.delayMinutes) : 60,
  messageType: FOLLOW_UP_ALLOWED_MESSAGE_TYPES.includes(stage.messageType) ? stage.messageType : "text",
  mediaId: stage.mediaId || null,
  message: stage.message ?? stage.mediaCaption ?? "",
  mediaUrl: stage.mediaUrl || "",
  mediaType: stage.mediaType || "",
  mediaCaption: stage.mediaCaption || "",
  buttons: Array.isArray(stage.buttons) ? stage.buttons : [],
  useAiRewrite: !!stage.useAiRewrite,
  stepType: STEP_TYPE_OPTIONS.some((opt) => opt.value === stage.stepType) ? stage.stepType : "send_message",
  stepConfig: (typeof stage.stepConfig === "object" && stage.stepConfig !== null) ? stage.stepConfig : {},
});

const normalizeFollowUpStages = (stages = []) => {
  const safeStages = Array.isArray(stages) && stages.length ? stages : buildStarterStages();
  return safeStages.map((stage, index) => normalizeFollowUpStage(stage, index + 1));
};

const normalizeIdArray = (values = []) =>
  (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value, index, array) => Number.isInteger(value) && value > 0 && array.indexOf(value) === index);

const parseKeywords = (value = "") =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);

const stringifyKeywords = (values = []) => (Array.isArray(values) ? values.join(", ") : "");

const emptyForm = (boards = []) => {
  const firstBoard = boards[0];
  const firstColumn = normalizeColumns(firstBoard?.columns)[0] || "Sem Categoria";

  return {
    name: "",
    description: "",
    whatsappId: "",
    isActive: true,
    sourceType: FOLLOW_UP_TRIGGER_VALUE,
    boardId: firstBoard?.id || "",
    boardColumn: firstColumn,
    targetMode: "all",
    tagIds: [],
    pipelineId: "",
    pipelineStageId: "",
    smartMode: true,
    aiEnabled: false,
    recoveryInstruction: "Reengajar a conversa de forma consultiva, elegante e objetiva.",
    successKeywords: ["sim", "quero", "proposta", "orcamento", "agendar"],
    stopKeywords: ["pare", "cancelar", "sem interesse"],
    stages: buildStarterStages(),
    // Trigger
    triggerType: "message_sent",
    triggerConfig: {},
    // Reply behaviour
    stopOnReply: true,
    actionOnReply: "none",
    replyActionConfig: {},
  };
};

const StatsDialog = ({ open, onClose, campaignId, campaignName }) => {
  const classes = useStyles();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !campaignId) return;
    setLoading(true);
    api.get(`/follow-up-campaigns/${campaignId}/stats`)
      .then(({ data }) => setStats(data))
      .catch(() => toast.error("Erro ao carregar estatísticas"))
      .finally(() => setLoading(false));
  }, [open, campaignId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Estatísticas — {campaignName}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
        ) : stats ? (
          <Box className={classes.statsBox}>
            <Box className={classes.statCard}>
              <Typography variant="h4">{stats.totalSent}</Typography>
              <Typography variant="caption">Total enviados</Typography>
            </Box>
            <Box className={classes.statCard}>
              <Typography variant="h4">{stats.sentToday}</Typography>
              <Typography variant="caption">Enviados hoje</Typography>
            </Box>
            <Box className={classes.statCard}>
              <Typography variant="h4">{stats.responded}</Typography>
              <Typography variant="caption">Responderam</Typography>
            </Box>
            <Box className={classes.statCard}>
              <Typography variant="h4" color={stats.responseRate >= 50 ? "primary" : "error"}>
                {stats.responseRate}%
              </Typography>
              <Typography variant="caption">Taxa de resposta</Typography>
            </Box>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

const OverviewDashboard = ({ stats, loading }) => {
  const classes = useStyles();
  const cards = [
    { label: "Total enviados", value: stats?.totalSent ?? 0 },
    { label: "Enviados hoje", value: stats?.sentToday ?? 0 },
    { label: "Responderam", value: stats?.responded ?? 0 },
    { label: "Taxa de resposta", value: `${stats?.responseRate ?? 0}%` },
    { label: "Follow-ups", value: stats?.totalCampaigns ?? 0 },
    { label: "Ativos", value: stats?.activeCampaigns ?? 0 },
    { label: "Quadros", value: stats?.totalBoards ?? 0 },
  ];

  return (
    <Box className={classes.overviewGrid}>
      {cards.map((card) => (
        <Paper key={card.label} className={classes.overviewCard}>
          <Typography variant="body2" className={classes.overviewLabel}>
            {card.label}
          </Typography>
          {loading ? (
            <CircularProgress size={22} />
          ) : (
            <Typography variant="h4" className={classes.overviewValue}>
              {card.value}
            </Typography>
          )}
        </Paper>
      ))}
    </Box>
  );
};

const BoardManagerDialog = ({ open, onClose, boards, onSave, onDelete, isAdmin }) => {
  const classes = useStyles();
  const [drafts, setDrafts] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const nextDrafts = boards.length
      ? boards.map((board) => ({ ...board, columns: normalizeColumns(board.columns) }))
      : [{ ...buildEmptyBoardDraft(), id: "new-board" }];
    setDrafts(nextDrafts);
    setSelectedBoardId(nextDrafts[0]?.id || null);
  }, [open, boards]);

  const selectedDraft = drafts.find((draft) => draft.id === selectedBoardId) || drafts[0];

  const updateSelectedDraft = (patch) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === selectedDraft?.id ? { ...draft, ...patch } : draft))
    );
  };

  const addNewBoardDraft = () => {
    const tempId = `new-${Date.now()}`;
    const nextDraft = { ...buildEmptyBoardDraft(), id: tempId };
    setDrafts((current) => [...current, nextDraft]);
    setSelectedBoardId(tempId);
  };

  const updateColumn = (index, value) => {
    const nextColumns = [...(selectedDraft?.columns || ["Sem Categoria"])];
    nextColumns[index] = value;
    updateSelectedDraft({ columns: nextColumns });
  };

  const addColumn = () => {
    updateSelectedDraft({ columns: [...normalizeColumns(selectedDraft?.columns), ""] });
  };

  const removeColumn = (index) => {
    const nextColumns = (selectedDraft?.columns || []).filter((_, idx) => idx !== index);
    updateSelectedDraft({ columns: normalizeColumns(nextColumns) });
  };

  const handleSave = async () => {
    if (!selectedDraft || !isAdmin) return;
    const payload = {
      ...selectedDraft,
      name: selectedDraft.name,
      funnelName: selectedDraft.funnelName,
      columns: normalizeColumns(selectedDraft.columns),
    };

    if (!payload.name.trim()) {
      toast.warn("Informe um nome para o quadro");
      return;
    }

    setSaving(true);
    try {
      const savedBoard = await onSave(payload);
      setSelectedBoardId(savedBoard?.id || selectedDraft.id);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDraft) return;

    if (String(selectedDraft.id).startsWith("new")) {
      const nextDrafts = drafts.filter((draft) => draft.id !== selectedDraft.id);
      setDrafts(nextDrafts.length ? nextDrafts : [{ ...buildEmptyBoardDraft(), id: "new-board" }]);
      setSelectedBoardId(nextDrafts[0]?.id || "new-board");
      return;
    }

    if (!window.confirm("Remover este quadro?")) return;

    setDeleting(true);
    try {
      await onDelete(selectedDraft.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Gerenciar quadros e funis</DialogTitle>
      <DialogContent dividers>
        <Box className={classes.boardManagerLayout}>
          <Box className={classes.boardList}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addNewBoardDraft}
              disabled={!isAdmin}
              style={{ marginBottom: 12 }}
            >
              Novo quadro
            </Button>

            {drafts.map((board) => (
              <Button
                key={board.id}
                className={`${classes.boardListItem} ${board.id === selectedBoardId ? classes.boardListItemActive : ""}`}
                onClick={() => setSelectedBoardId(board.id)}
              >
                <Box textAlign="left">
                  <Typography variant="subtitle2">{board.name || "Novo quadro"}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Funil: {board.funnelName || "Geral"}
                  </Typography>
                </Box>
              </Button>
            ))}
          </Box>

          <Box className={classes.boardEditor}>
            {selectedDraft ? (
              <>
                <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
                  <TextField
                    label="Nome do quadro"
                    value={selectedDraft.name || ""}
                    onChange={(e) => updateSelectedDraft({ name: e.target.value })}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={!isAdmin}
                  />
                  <TextField
                    label="Funil"
                    value={selectedDraft.funnelName || ""}
                    onChange={(e) => updateSelectedDraft({ funnelName: e.target.value })}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={!isAdmin}
                  />
                </Box>

                <Typography variant="subtitle2" style={{ marginBottom: 12 }}>
                  Colunas do quadro
                </Typography>

                {(selectedDraft.columns || []).map((column, index) => (
                  <Box key={`${selectedDraft.id}-column-${index}`} className={classes.columnRow}>
                    <TextField
                      label={`Coluna ${index + 1}`}
                      value={column}
                      onChange={(e) => updateColumn(index, e.target.value)}
                      variant="outlined"
                      size="small"
                      fullWidth
                      disabled={!isAdmin || index === 0}
                    />
                    <IconButton size="small" onClick={() => removeColumn(index)} disabled={!isAdmin || index === 0}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}

                <Button startIcon={<AddIcon />} onClick={addColumn} variant="outlined" size="small" disabled={!isAdmin}>
                  Adicionar coluna
                </Button>
              </>
            ) : (
              <Typography color="textSecondary">Selecione um quadro para editar.</Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        <Button onClick={handleDelete} color="secondary" disabled={!isAdmin || deleting}>
          {deleting ? "Removendo..." : "Excluir quadro"}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          style={{ backgroundColor: GREEN, color: "#fff" }}
          startIcon={<SaveIcon />}
          disabled={!isAdmin || saving}
        >
          {saving ? "Salvando..." : "Salvar quadro"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const FollowUpModal = ({ open, onClose, onSave, campaign, whatsApps, boards, companyId, tags, pipelines }) => {
  const classes = useStyles();
  const [form, setForm] = useState(emptyForm(boards));
  const [uploadingStageIndex] = useState(null);
  const [mediaDriveStageIndex, setMediaDriveStageIndex] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [testNumberValidation, setTestNumberValidation] = useState({ status: "idle", normalizedNumber: "", error: "" });
  const testValidationTimerRef = useRef(null);

  useEffect(() => {
    if (campaign) {
      const boardId = campaign.boardId || boards[0]?.id || "";
      const selectedBoard = boards.find((board) => String(board.id) === String(boardId)) || boards[0];
      const safeColumn = normalizeColumns(selectedBoard?.columns).includes(campaign.boardColumn)
        ? campaign.boardColumn
        : normalizeColumns(selectedBoard?.columns)[0] || "Sem Categoria";
      setForm({
        name: campaign.name || "",
        description: campaign.description || "",
        whatsappId: campaign.whatsappId || "",
        isActive: campaign.isActive !== false,
        sourceType: FOLLOW_UP_TRIGGER_VALUE,
        boardId,
        boardColumn: safeColumn,
        targetMode: campaign.targetMode || "all",
        tagIds: normalizeIdArray(campaign.tagIds),
        pipelineId: campaign.pipelineId || "",
        pipelineStageId: campaign.pipelineStageId || "",
        smartMode: campaign.smartMode !== false,
        aiEnabled: !!campaign.aiEnabled,
        recoveryInstruction: campaign.recoveryInstruction || "",
        successKeywords: Array.isArray(campaign.successKeywords) ? campaign.successKeywords : [],
        stopKeywords: Array.isArray(campaign.stopKeywords) ? campaign.stopKeywords : [],
        stages: normalizeFollowUpStages(campaign.stages),
        triggerType: campaign.triggerType || "message_sent",
        triggerConfig: (typeof campaign.triggerConfig === "object" && campaign.triggerConfig !== null) ? campaign.triggerConfig : {},
        stopOnReply: campaign.stopOnReply !== false,
        actionOnReply: campaign.actionOnReply || "none",
        replyActionConfig: (typeof campaign.replyActionConfig === "object" && campaign.replyActionConfig !== null) ? campaign.replyActionConfig : {},
      });
    } else {
      setForm(emptyForm(boards));
    }
    setTestNumber("");
    setTestNumberValidation({ status: "idle", normalizedNumber: "", error: "" });
  }, [campaign, open, boards]);

  // Validação de número de teste com debounce de 800ms
  useEffect(() => {
    if (testValidationTimerRef.current) clearTimeout(testValidationTimerRef.current);
    const digits = testNumber.replace(/\D/g, "");
    if (digits.length < 10 || !form.whatsappId) {
      setTestNumberValidation({ status: "idle", normalizedNumber: "", error: "" });
      return;
    }
    setTestNumberValidation((prev) => ({ ...prev, status: "loading" }));
    testValidationTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/quick-send/validate", {
          params: { number: digits, whatsappId: form.whatsappId },
        });
        setTestNumberValidation({
          status: data.valid ? "valid" : "invalid",
          normalizedNumber: data.normalizedNumber || "",
          error: data.error || "",
        });
      } catch {
        setTestNumberValidation({ status: "invalid", normalizedNumber: "", error: "Erro ao validar número" });
      }
    }, 800);
    return () => clearTimeout(testValidationTimerRef.current);
  }, [testNumber, form.whatsappId]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const updateStage = (idx, key, value) => {
    setForm((p) => {
      const stages = [...p.stages];
      stages[idx] = normalizeFollowUpStage(
        { ...stages[idx], [key]: value },
        idx + 1
      );
      return { ...p, stages };
    });
  };

  const handleSelectStageMedia = (media) => {
    if (mediaDriveStageIndex === null) return;
    updateStage(mediaDriveStageIndex, "mediaUrl", media.storagePath);
    updateStage(mediaDriveStageIndex, "mediaId", media.id);
    updateStage(mediaDriveStageIndex, "mediaType", media.mediaType);
    toast.success("Mídia vinculada do Mídia Drive.");
    setMediaDriveStageIndex(null);
  };

  const addStage = () => {
    setForm((p) => ({
      ...p,
      stages: [...p.stages, { ...emptyStage(), order: p.stages.length + 1 }],
    }));
  };

  const removeStage = (idx) => {
    setForm((p) => ({
      ...p,
      stages: p.stages
        .filter((_, i) => i !== idx)
        .map((stage, index) => ({ ...stage, order: index + 1 })),
    }));
  };

  const addButton = (idx) => {
    setForm((p) => {
      const stages = [...p.stages];
      stages[idx] = {
        ...stages[idx],
        buttons: [...(stages[idx].buttons || []), { displayText: "", type: "reply", value: "" }],
      };
      return { ...p, stages };
    });
  };

  const updateButton = (stageIdx, btnIdx, key, value) => {
    setForm((p) => {
      const stages = [...p.stages];
      const buttons = [...(stages[stageIdx].buttons || [])];
      buttons[btnIdx] = { ...buttons[btnIdx], [key]: value };
      stages[stageIdx] = { ...stages[stageIdx], buttons };
      return { ...p, stages };
    });
  };

  const removeButton = (stageIdx, btnIdx) => {
    setForm((p) => {
      const stages = [...p.stages];
      stages[stageIdx] = {
        ...stages[stageIdx],
        buttons: stages[stageIdx].buttons.filter((_, i) => i !== btnIdx),
      };
      return { ...p, stages };
    });
  };

  const handleBoardChange = (boardId) => {
    const selectedBoard = boards.find((board) => String(board.id) === String(boardId));
    setForm((p) => ({
      ...p,
      boardId,
      boardColumn: normalizeColumns(selectedBoard?.columns)[0] || "Sem Categoria",
    }));
  };

  const selectedBoard = boards.find((board) => String(board.id) === String(form.boardId)) || boards[0];
  const selectedBoardColumns = normalizeColumns(selectedBoard?.columns);
  const selectedPipeline = pipelines.find((pipeline) => String(pipeline.id) === String(form.pipelineId));
  const selectedPipelineStages = Array.isArray(selectedPipeline?.stages)
    ? selectedPipeline.stages.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    : [];

  const submitFollowUp = () => {
    if (!form.name.trim()) return toast.warn("Informe um nome para a campanha");
    if (!form.stages.length) return toast.warn("Adicione ao menos um estagio");
    if (!form.boardId) return toast.warn("Selecione um quadro");
    if ((form.targetMode === "tags" || form.targetMode === "hybrid") && !form.tagIds.length) {
      return toast.warn("Selecione ao menos uma etiqueta para este follow-up");
    }
    if ((form.targetMode === "pipeline_stage" || form.targetMode === "hybrid") && !form.pipelineStageId) {
      return toast.warn("Selecione uma etapa do funil para este follow-up");
    }

    onSave({
      ...form,
      tagIds: normalizeIdArray(form.tagIds),
      pipelineId: form.pipelineId || null,
      pipelineStageId: form.pipelineStageId || null,
      successKeywords: form.successKeywords,
      stopKeywords: form.stopKeywords,
      stages: normalizeFollowUpStages(form.stages),
      boardColumn: selectedBoardColumns.includes(form.boardColumn) ? form.boardColumn : selectedBoardColumns[0],
      triggerType: form.triggerType || "message_sent",
      triggerConfig: form.triggerConfig || {},
      stopOnReply: form.stopOnReply !== false,
      actionOnReply: form.actionOnReply || "none",
      replyActionConfig: form.replyActionConfig || {},
    });
  };

  const handleQuickTest = async () => {
    if (!form.stages.length) {
      toast.warn("Adicione ao menos um estagio antes de testar");
      return;
    }
    if (!testNumber.trim()) {
      toast.warn("Informe um numero de teste antes de enviar");
      return;
    }
    if (testNumberValidation.status !== "valid") {
      toast.warn("Valide o número antes de testar. Aguarde a verificação no WhatsApp.");
      return;
    }

    try {
      setTesting(true);
      const { data } = await api.post("/follow-up-campaigns/test", {
        whatsappId: form.whatsappId || "",
        targetNumber: testNumberValidation.normalizedNumber || testNumber,
        stages: normalizeFollowUpStages(form.stages),
      });

      const failures = (data?.results || []).filter((result) => result.status !== "sent");
      if (!failures.length) {
        toast.success("Teste executado com sucesso!");
      } else {
        toast.warn("Teste concluido com falhas em uma ou mais etapas.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao testar follow-up");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <MediaDrivePickerModal
        open={mediaDriveStageIndex !== null}
        onClose={() => setMediaDriveStageIndex(null)}
        allowedTypes={
          mediaDriveStageIndex !== null && form.stages?.[mediaDriveStageIndex]?.messageType
            ? [form.stages[mediaDriveStageIndex].messageType]
            : ["image", "video", "audio", "document"]
        }
        onSelect={handleSelectStageMedia}
        title="Selecionar mídia do follow-up"
      />
      <DialogTitle>{campaign ? "Editar Follow-up" : "Novo Follow-up"}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <Box className={classes.modalHero}>
            <Typography variant="h6" style={{ fontWeight: 800 }}>
              {campaign ? "Edicao estrategica do follow-up" : "Novo follow-up inteligente"}
            </Typography>
            <Typography variant="body2" style={{ opacity: 0.88, marginTop: 6 }}>
              Organize a recuperacao por quadro, etiquetas e etapa do funil. O motor inteligente observa
              o contexto da conversa e evita insistencia quando o lead ja avancou.
            </Typography>
            <Box className={classes.heroChipRow}>
              <Chip className={classes.heroChip} icon={<FlashOnIcon style={{ color: "#fff" }} />} label={form.smartMode ? "Modo inteligente ativo" : "Modo manual guiado"} />
              <Chip className={classes.heroChip} icon={<LocalOfferIcon style={{ color: "#fff" }} />} label={`${form.tagIds.length} etiqueta(s)`} />
              <Chip className={classes.heroChip} icon={<TimelineIcon style={{ color: "#fff" }} />} label={selectedPipelineStages.length ? `${selectedPipelineStages.length} etapa(s) no funil` : "Sem funil vinculado"} />
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <TextField
                label="Nome da campanha"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <FormControl variant="outlined" size="small" fullWidth>
                <InputLabel>Conexao WhatsApp (opcional)</InputLabel>
                <Select
                  value={form.whatsappId}
                  onChange={(e) => setField("whatsappId", e.target.value)}
                  label="Conexao WhatsApp (opcional)"
                >
                  <MenuItem value="">Automatico (primeiro disponivel)</MenuItem>
                  {whatsApps?.filter((w) => w.status === "CONNECTED").map((w) => (
                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Objetivo operacional"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                multiline
                rows={2}
                helperText="Descreva rapidamente o papel deste follow-up dentro da operacao."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl variant="outlined" size="small" fullWidth>
                <InputLabel>Gatilho</InputLabel>
                <Select
                  value={form.triggerType || "message_sent"}
                  onChange={(e) => {
                    setField("triggerType", e.target.value);
                    setField("triggerConfig", {});
                  }}
                  label="Gatilho"
                >
                  {TRIGGER_TYPE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {(() => {
                const selected = TRIGGER_TYPE_OPTIONS.find((opt) => opt.value === form.triggerType);
                return selected ? (
                  <Typography variant="caption" color="textSecondary" style={{ marginTop: 4, display: "block" }}>
                    {selected.description}
                  </Typography>
                ) : null;
              })()}
            </Grid>

            {/* Trigger config: no_reply */}
            {form.triggerType === "no_reply" && (
              <Grid item xs={12}>
                <Box display="flex" gridGap={12} flexWrap="wrap" alignItems="flex-end">
                  <TextField
                    label="Tempo sem resposta"
                    type="number"
                    size="small"
                    variant="outlined"
                    style={{ width: 160 }}
                    inputProps={{ min: 1 }}
                    value={form.triggerConfig?.delayValue || 1}
                    onChange={(e) => setField("triggerConfig", { ...form.triggerConfig, delayValue: Number(e.target.value) })}
                  />
                  <FormControl variant="outlined" size="small" style={{ minWidth: 130 }}>
                    <InputLabel>Unidade</InputLabel>
                    <Select
                      value={form.triggerConfig?.delayUnit || "hours"}
                      onChange={(e) => setField("triggerConfig", { ...form.triggerConfig, delayUnit: e.target.value })}
                      label="Unidade"
                    >
                      <MenuItem value="minutes">Minutos</MenuItem>
                      <MenuItem value="hours">Horas</MenuItem>
                      <MenuItem value="days">Dias</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            )}

            {/* Trigger config: time_in_crm_stage */}
            {form.triggerType === "time_in_crm_stage" && (
              <Grid item xs={12}>
                <Box display="flex" gridGap={12} flexWrap="wrap" alignItems="flex-end">
                  <FormControl variant="outlined" size="small" style={{ minWidth: 200 }}>
                    <InputLabel>Funil</InputLabel>
                    <Select
                      value={form.triggerConfig?.pipelineId || ""}
                      onChange={(e) => setField("triggerConfig", { ...form.triggerConfig, pipelineId: e.target.value, stageId: "" })}
                      label="Funil"
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      {pipelines.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl variant="outlined" size="small" style={{ minWidth: 200 }} disabled={!form.triggerConfig?.pipelineId}>
                    <InputLabel>Etapa</InputLabel>
                    <Select
                      value={form.triggerConfig?.stageId || ""}
                      onChange={(e) => setField("triggerConfig", { ...form.triggerConfig, stageId: e.target.value })}
                      label="Etapa"
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      {(pipelines.find((p) => String(p.id) === String(form.triggerConfig?.pipelineId))?.stages || [])
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Tempo mínimo na etapa"
                    type="number"
                    size="small"
                    variant="outlined"
                    style={{ width: 180 }}
                    inputProps={{ min: 1 }}
                    value={form.triggerConfig?.delayValue || 1}
                    onChange={(e) => setField("triggerConfig", { ...form.triggerConfig, delayValue: Number(e.target.value) })}
                  />
                  <FormControl variant="outlined" size="small" style={{ minWidth: 130 }}>
                    <InputLabel>Unidade</InputLabel>
                    <Select
                      value={form.triggerConfig?.delayUnit || "hours"}
                      onChange={(e) => setField("triggerConfig", { ...form.triggerConfig, delayUnit: e.target.value })}
                      label="Unidade"
                    >
                      <MenuItem value="minutes">Minutos</MenuItem>
                      <MenuItem value="hours">Horas</MenuItem>
                      <MenuItem value="days">Dias</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            )}

            {/* Trigger config: tag_added */}
            {form.triggerType === "tag_added" && (
              <Grid item xs={12}>
                <FormControl variant="outlined" size="small" style={{ minWidth: 260 }}>
                  <InputLabel>Tag disparadora</InputLabel>
                  <Select
                    value={form.triggerConfig?.tagId || ""}
                    onChange={(e) => setField("triggerConfig", { ...form.triggerConfig, tagId: e.target.value })}
                    label="Tag disparadora"
                  >
                    <MenuItem value="">Selecione uma tag</MenuItem>
                    {tags.map((tag) => <MenuItem key={tag.id} value={tag.id}>{tag.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Trigger config: stage_change */}
            {form.triggerType === "stage_change" && (
              <Grid item xs={12}>
                <Box display="flex" gridGap={12} flexWrap="wrap" alignItems="flex-end">
                  <FormControl variant="outlined" size="small" style={{ minWidth: 200 }}>
                    <InputLabel>Funil</InputLabel>
                    <Select
                      value={form.triggerConfig?.pipelineId || ""}
                      onChange={(e) => setField("triggerConfig", { ...form.triggerConfig, pipelineId: e.target.value, stageId: "" })}
                      label="Funil"
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      {pipelines.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl variant="outlined" size="small" style={{ minWidth: 200 }} disabled={!form.triggerConfig?.pipelineId}>
                    <InputLabel>Etapa destino</InputLabel>
                    <Select
                      value={form.triggerConfig?.stageId || ""}
                      onChange={(e) => setField("triggerConfig", { ...form.triggerConfig, stageId: e.target.value })}
                      label="Etapa destino"
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      {(pipelines.find((p) => String(p.id) === String(form.triggerConfig?.pipelineId))?.stages || [])
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            )}

            {/* Trigger config: unread_after_hours */}
            {form.triggerType === "unread_after_hours" && (
              <Grid item xs={12}>
                <Box display="flex" gridGap={12} flexWrap="wrap" alignItems="flex-end">
                  <TextField
                    label="Não lida por mais de"
                    type="number"
                    size="small"
                    variant="outlined"
                    style={{ width: 180 }}
                    inputProps={{ min: 1 }}
                    value={form.triggerConfig?.delayValue || 2}
                    onChange={(e) => setField("triggerConfig", { ...form.triggerConfig, delayValue: Number(e.target.value) })}
                  />
                  <FormControl variant="outlined" size="small" style={{ minWidth: 130 }}>
                    <InputLabel>Unidade</InputLabel>
                    <Select
                      value={form.triggerConfig?.delayUnit || "hours"}
                      onChange={(e) => setField("triggerConfig", { ...form.triggerConfig, delayUnit: e.target.value })}
                      label="Unidade"
                    >
                      <MenuItem value="minutes">Minutos</MenuItem>
                      <MenuItem value="hours">Horas</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            )}

            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => setField("isActive", e.target.checked)}
                    color="primary"
                  />
                }
                label="Campanha ativa"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.smartMode}
                    onChange={(e) => setField("smartMode", e.target.checked)}
                    color="primary"
                  />
                }
                label="Seguir contexto"
              />
            </Grid>
          </Grid>

          <Box className={classes.sectionCard}>
            <Typography variant="subtitle1" style={{ fontWeight: 700, marginBottom: 12 }}>
              Organizacao do Kanban
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl variant="outlined" size="small" fullWidth>
                  <InputLabel>Quadro</InputLabel>
                  <Select
                    value={form.boardId}
                    onChange={(e) => handleBoardChange(e.target.value)}
                    label="Quadro"
                  >
                    {boards.map((board) => (
                      <MenuItem key={board.id} value={board.id}>
                        {board.name} - {board.funnelName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl variant="outlined" size="small" fullWidth>
                  <InputLabel>Coluna</InputLabel>
                  <Select
                    value={form.boardColumn}
                    onChange={(e) => setField("boardColumn", e.target.value)}
                    label="Coluna"
                  >
                    {selectedBoardColumns.map((column) => (
                      <MenuItem key={column} value={column}>
                        {column}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <Box className={classes.sectionCard}>
            <Typography variant="subtitle1" style={{ fontWeight: 700, marginBottom: 12 }}>
              Segmentacao e inteligencia
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl variant="outlined" size="small" fullWidth>
                  <InputLabel>Alvo do follow-up</InputLabel>
                  <Select
                    value={form.targetMode}
                    onChange={(e) => setField("targetMode", e.target.value)}
                    label="Alvo do follow-up"
                  >
                    {FOLLOW_UP_TARGET_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box display="flex" alignItems="center" gridGap={8}>
                          {option.icon}
                          <span>{option.label}</span>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.aiEnabled}
                      onChange={(e) => setField("aiEnabled", e.target.checked)}
                      color="primary"
                      disabled={!form.smartMode}
                    />
                  }
                  label="Gerar recuperacao com IA"
                />
                <Typography variant="caption" color="textSecondary" display="block">
                  Se a IA nao estiver configurada, o sistema usa o template manual do estagio.
                </Typography>
              </Grid>

              {(form.targetMode === "tags" || form.targetMode === "hybrid") && (
                <Grid item xs={12}>
                  <FormControl variant="outlined" size="small" fullWidth>
                    <InputLabel>Etiquetas alvo</InputLabel>
                    <Select
                      multiple
                      value={form.tagIds}
                      onChange={(e) => setField("tagIds", normalizeIdArray(e.target.value))}
                      label="Etiquetas alvo"
                      renderValue={(selected) => (
                        <Box className={classes.chipFieldWrap}>
                          {normalizeIdArray(selected).map((tagId) => {
                            const tag = tags.find((item) => Number(item.id) === Number(tagId));
                            return <Chip key={tagId} size="small" label={tag?.name || `Tag ${tagId}`} />;
                          })}
                        </Box>
                      )}
                    >
                      {tags.map((tag) => (
                        <MenuItem key={tag.id} value={tag.id}>
                          <Checkbox checked={form.tagIds.includes(Number(tag.id))} color="primary" />
                          <ListItemText primary={tag.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {(form.targetMode === "pipeline_stage" || form.targetMode === "hybrid") && (
                <>
                  <Grid item xs={12} md={6}>
                    <FormControl variant="outlined" size="small" fullWidth>
                      <InputLabel>Funil comercial</InputLabel>
                      <Select
                        value={form.pipelineId}
                        onChange={(e) => setField("pipelineId", e.target.value)}
                        label="Funil comercial"
                      >
                        <MenuItem value="">Selecione um funil</MenuItem>
                        {pipelines.map((pipeline) => (
                          <MenuItem key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl variant="outlined" size="small" fullWidth disabled={!form.pipelineId}>
                      <InputLabel>Etapa do funil</InputLabel>
                      <Select
                        value={form.pipelineStageId}
                        onChange={(e) => setField("pipelineStageId", e.target.value)}
                        label="Etapa do funil"
                      >
                        <MenuItem value="">Selecione uma etapa</MenuItem>
                        {selectedPipelineStages.map((stage) => (
                          <MenuItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <TextField
                  label="Instrucao da recuperacao"
                  value={form.recoveryInstruction}
                  onChange={(e) => setField("recoveryInstruction", e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  variant="outlined"
                  size="small"
                  helperText="A IA ou o template manual usam esta instrucao para moldar o follow-up."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Palavras que indicam avancou no funil"
                  value={stringifyKeywords(form.successKeywords)}
                  onChange={(e) => setField("successKeywords", parseKeywords(e.target.value))}
                  fullWidth
                  variant="outlined"
                  size="small"
                  helperText="Ex.: sim, proposta, agendar, orcamento"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Palavras para interromper insistencia"
                  value={stringifyKeywords(form.stopKeywords)}
                  onChange={(e) => setField("stopKeywords", parseKeywords(e.target.value))}
                  fullWidth
                  variant="outlined"
                  size="small"
                  helperText="Ex.: pare, sem interesse, cancelar"
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1"><strong>Estágios</strong></Typography>
            <Button startIcon={<AddIcon />} size="small" onClick={addStage} variant="outlined">
              Adicionar estágio
            </Button>
          </Box>

          {form.stages.map((stage, idx) => (
            <Box key={idx} className={classes.stageRow}>
              <Box className={classes.stageHeader}>
                <Typography variant="subtitle2">
                  PASSO {idx + 1}
                  {stage.title ? ` — ${stage.title}` : ""}
                </Typography>
                <Box display="flex" alignItems="center" gridGap={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={stage.isActive}
                        onChange={(e) => updateStage(idx, "isActive", e.target.checked)}
                        color="primary"
                        size="small"
                      />
                    }
                    label={<Typography variant="caption">Ativo</Typography>}
                  />
                  <IconButton size="small" onClick={() => removeStage(idx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Step type selector */}
              <Box display="flex" gridGap={12} flexWrap="wrap" mb={1} alignItems="flex-end">
                <FormControl variant="outlined" size="small" style={{ minWidth: 180 }}>
                  <InputLabel>Tipo de passo</InputLabel>
                  <Select
                    value={stage.stepType || "send_message"}
                    onChange={(e) => updateStage(idx, "stepType", e.target.value)}
                    label="Tipo de passo"
                  >
                    {STEP_TYPE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Delay is shown for all steps — stored as minutes, displayed as hours + minutes */}
                <Box display="flex" gridGap={6} alignItems="flex-start">
                  <TextField
                    label="Horas"
                    type="number"
                    value={Math.floor((stage.delayMinutes || 0) / 60)}
                    onChange={(e) => {
                      const h = Math.max(0, Math.floor(Number(e.target.value) || 0));
                      const m = (stage.delayMinutes || 0) % 60;
                      updateStage(idx, "delayMinutes", h * 60 + m);
                    }}
                    variant="outlined"
                    size="small"
                    style={{ width: 85 }}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    label="Minutos"
                    type="number"
                    value={(stage.delayMinutes || 0) % 60}
                    onChange={(e) => {
                      const m = Math.min(59, Math.max(0, Math.floor(Number(e.target.value) || 0)));
                      const h = Math.floor((stage.delayMinutes || 0) / 60);
                      updateStage(idx, "delayMinutes", h * 60 + m);
                    }}
                    variant="outlined"
                    size="small"
                    style={{ width: 95 }}
                    inputProps={{ min: 0, max: 59 }}
                    helperText="0h 0min = imediato"
                  />
                </Box>

                {/* Message type selector — only for send_message */}
                {stage.stepType === "send_message" && (
                  <FormControl variant="outlined" size="small" style={{ minWidth: 145 }}>
                    <InputLabel>Formato</InputLabel>
                    <Select
                      value={stage.messageType || "text"}
                      onChange={(e) => updateStage(idx, "messageType", e.target.value)}
                      label="Formato"
                    >
                      <MenuItem value="text">Texto</MenuItem>
                      <MenuItem value="image">Imagem</MenuItem>
                      <MenuItem value="video">Vídeo</MenuItem>
                      <MenuItem value="audio">Áudio</MenuItem>
                      <MenuItem value="document">Documento</MenuItem>
                      <MenuItem value="media">Mídia Misto</MenuItem>
                      <MenuItem value="buttons">Botões</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Box>

              {/* ---- send_message content ---- */}
              {stage.stepType === "send_message" && (
                <>
                  {["text", "buttons"].includes(stage.messageType) && (
                    <>
                      <TextField
                        label="Mensagem"
                        value={stage.message}
                        onChange={(e) => updateStage(idx, "message", e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        size="small"
                      />
                      <Box className={classes.chipFieldWrap} mt={1}>
                        {["{{nome}}", "{{primeiro_nome}}", "{{telefone}}", "{{empresa}}", "{{data}}", "{{hora}}", "{{descadastro}}", "{{csat}}"].map((v) => (
                          <Chip
                            key={v}
                            size="small"
                            label={v}
                            clickable
                            style={{ fontSize: 11 }}
                            onClick={() => updateStage(idx, "message", (stage.message || "") + v)}
                          />
                        ))}
                      </Box>
                    </>
                  )}

                  {["media", "mixed", "image", "video", "document"].includes(stage.messageType) && (
                    <Box mt={2} mb={1} p={2} border="1px dashed #ccc" borderRadius={4}>
                      <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Anexo de Mídia</Typography>
                      <Box display="flex" gap={2} alignItems="center">
                        <Button variant="outlined" size="small" onClick={() => setMediaDriveStageIndex(idx)}>
                          Selecionar do Mídia Drive
                        </Button>
                        {uploadingStageIndex === idx && <CircularProgress size={18} />}
                      </Box>
                      {stage.mediaUrl && (
                        <Box mt={2} mb={2}>
                          <Typography variant="caption" color="primary">Arquivo: {stage.mediaUrl.split("-").pop()}</Typography>
                          {stage.messageType === "image" && (
                            <Box mt={1}>
                              <img
                                src={
                                  stage.mediaUrl?.startsWith("http")
                                    ? stage.mediaUrl
                                    : `${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "")}/public/company${companyId}/${String(stage.mediaUrl || "").replace(/^\/+/, "")}`
                                }
                                alt="preview"
                                style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8 }}
                              />
                            </Box>
                          )}
                        </Box>
                      )}
                      <TextField
                        label="Legenda (opcional)"
                        value={stage.mediaCaption || ""}
                        onChange={(e) => updateStage(idx, "mediaCaption", e.target.value)}
                        fullWidth
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  )}

                  {stage.messageType === "audio" && (
                    <Box mt={2} mb={1} p={2} border="1px dashed #ccc" borderRadius={4}>
                      <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Áudio</Typography>
                      <Box display="flex" gridGap={8} mb={1} flexWrap="wrap">
                        <Tooltip title="Gravação de áudio na hora ainda está em desenvolvimento. Use áudio salvo nesta versão.">
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled
                            >
                              Gravar áudio na hora
                            </Button>
                          </span>
                        </Tooltip>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => updateStage(idx, "stepConfig", { ...stage.stepConfig, audioType: "saved" })}
                        >
                          Usar áudio salvo
                        </Button>
                      </Box>
                      <Typography variant="caption" style={{ color: "#b45309", display: "block", marginBottom: 8 }}>
                        Gravação na hora está em desenvolvimento. Selecione um arquivo de áudio pelo Mídia Drive.
                      </Typography>
                      {(!stage.stepConfig?.audioType || stage.stepConfig?.audioType === "saved") && (
                        <>
                          <Button variant="outlined" size="small" onClick={() => setMediaDriveStageIndex(idx)}>
                            Selecionar do Mídia Drive
                          </Button>
                          {stage.mediaUrl && (
                            <Typography variant="caption" color="primary" style={{ display: "block", marginTop: 8 }}>
                              Arquivo: {stage.mediaUrl.split("-").pop()}
                            </Typography>
                          )}
                          <Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 4 }}>
                            O contato recebe como mensagem de áudio — não como anexo.
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}

                  {stage.messageType === "buttons" && (
                    <Box mt={1}>
                      <Typography variant="caption" color="textSecondary">Botões (máx. 4)</Typography>
                      {(stage.buttons || []).map((btn, btnIdx) => (
                        <Box key={btnIdx} display="flex" gap={1} alignItems="center" mt={1}>
                          <TextField
                            label="Texto"
                            value={btn.displayText}
                            onChange={(e) => updateButton(idx, btnIdx, "displayText", e.target.value)}
                            size="small"
                            variant="outlined"
                            style={{ flex: 2 }}
                          />
                          <FormControl variant="outlined" size="small" style={{ minWidth: 100 }}>
                            <InputLabel>Tipo</InputLabel>
                            <Select
                              value={btn.type}
                              onChange={(e) => updateButton(idx, btnIdx, "type", e.target.value)}
                              label="Tipo"
                            >
                              <MenuItem value="reply">Resposta</MenuItem>
                              <MenuItem value="url">URL</MenuItem>
                              <MenuItem value="call">Ligar</MenuItem>
                            </Select>
                          </FormControl>
                          <TextField
                            label={btn.type === "url" ? "URL" : btn.type === "call" ? "Número" : "ID"}
                            value={btn.value}
                            onChange={(e) => updateButton(idx, btnIdx, "value", e.target.value)}
                            size="small"
                            variant="outlined"
                            style={{ flex: 2 }}
                          />
                          <IconButton size="small" onClick={() => removeButton(idx, btnIdx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                      {(stage.buttons || []).length < 4 && (
                        <Button size="small" startIcon={<AddIcon />} onClick={() => addButton(idx)} style={{ marginTop: 4 }}>
                          Botão
                        </Button>
                      )}
                    </Box>
                  )}

                  <Box mt={1}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!stage.useAiRewrite}
                          onChange={(e) => updateStage(idx, "useAiRewrite", e.target.checked)}
                          color="primary"
                          size="small"
                          disabled={!form.aiEnabled}
                        />
                      }
                      label={<Typography variant="caption">Reescrever com IA</Typography>}
                    />
                  </Box>
                </>
              )}

              {/* ---- wait: just delay, no extra content ---- */}
              {stage.stepType === "wait" && (
                <Typography variant="caption" color="textSecondary">
                  {(() => {
                    const h = Math.floor((stage.delayMinutes || 0) / 60);
                    const m = (stage.delayMinutes || 0) % 60;
                    const label = h > 0 && m > 0
                      ? `${h}h ${m}min`
                      : h > 0
                      ? `${h}h`
                      : m > 0
                      ? `${m}min`
                      : "imediato";
                    return `Pausa de ${label} antes do próximo passo, sem enviar mensagem.`;
                  })()}
                </Typography>
              )}

              {/* ---- move_crm ---- */}
              {stage.stepType === "move_crm" && (
                <Box display="flex" gridGap={12} flexWrap="wrap" alignItems="flex-end" mt={1}>
                  <FormControl variant="outlined" size="small" style={{ minWidth: 200 }}>
                    <InputLabel>Funil</InputLabel>
                    <Select
                      value={stage.stepConfig?.pipelineId || ""}
                      onChange={(e) => updateStage(idx, "stepConfig", { ...stage.stepConfig, pipelineId: e.target.value, stageId: "" })}
                      label="Funil"
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      {pipelines.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl variant="outlined" size="small" style={{ minWidth: 200 }} disabled={!stage.stepConfig?.pipelineId}>
                    <InputLabel>Etapa destino</InputLabel>
                    <Select
                      value={stage.stepConfig?.stageId || ""}
                      onChange={(e) => updateStage(idx, "stepConfig", { ...stage.stepConfig, stageId: e.target.value })}
                      label="Etapa destino"
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      {(pipelines.find((p) => String(p.id) === String(stage.stepConfig?.pipelineId))?.stages || [])
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
              )}

              {/* ---- add_tag ---- */}
              {stage.stepType === "add_tag" && (
                <Box mt={1}>
                  <FormControl variant="outlined" size="small" style={{ minWidth: 260 }}>
                    <InputLabel>Tag a adicionar</InputLabel>
                    <Select
                      value={stage.stepConfig?.tagId || ""}
                      onChange={(e) => updateStage(idx, "stepConfig", { ...stage.stepConfig, tagId: e.target.value })}
                      label="Tag a adicionar"
                    >
                      <MenuItem value="">Selecione uma tag</MenuItem>
                      {tags.map((tag) => <MenuItem key={tag.id} value={tag.id}>{tag.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
              )}

              {/* ---- condition ---- */}
              {stage.stepType === "condition" && (
                <Box mt={1} p={1.5} border="1px solid #e5e7eb" borderRadius={6}>
                  <Typography variant="caption" color="textSecondary" style={{ display: "block", marginBottom: 8 }}>
                    Condição — define se os próximos passos devem continuar
                  </Typography>
                  <FormControl variant="outlined" size="small" style={{ minWidth: 260 }}>
                    <InputLabel>Tipo de condição</InputLabel>
                    <Select
                      value={stage.stepConfig?.conditionType || "has_replied"}
                      onChange={(e) => updateStage(idx, "stepConfig", { ...stage.stepConfig, conditionType: e.target.value })}
                      label="Tipo de condição"
                    >
                      <MenuItem value="has_replied">Se respondeu</MenuItem>
                      <MenuItem value="has_not_replied">Se não respondeu</MenuItem>
                      <MenuItem value="has_tag">Se possui tag</MenuItem>
                      <MenuItem value="is_in_stage">Se está em etapa</MenuItem>
                    </Select>
                  </FormControl>
                  {stage.stepConfig?.conditionType === "has_tag" && (
                    <Box mt={1}>
                      <FormControl variant="outlined" size="small" style={{ minWidth: 220 }}>
                        <InputLabel>Tag</InputLabel>
                        <Select
                          value={stage.stepConfig?.tagId || ""}
                          onChange={(e) => updateStage(idx, "stepConfig", { ...stage.stepConfig, tagId: e.target.value })}
                          label="Tag"
                        >
                          <MenuItem value="">Selecione</MenuItem>
                          {tags.map((tag) => <MenuItem key={tag.id} value={tag.id}>{tag.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                  )}
                  {stage.stepConfig?.conditionType === "is_in_stage" && (
                    <Box display="flex" gridGap={8} mt={1} flexWrap="wrap">
                      <FormControl variant="outlined" size="small" style={{ minWidth: 180 }}>
                        <InputLabel>Funil</InputLabel>
                        <Select
                          value={stage.stepConfig?.pipelineId || ""}
                          onChange={(e) => updateStage(idx, "stepConfig", { ...stage.stepConfig, pipelineId: e.target.value, stageId: "" })}
                          label="Funil"
                        >
                          <MenuItem value="">Selecione</MenuItem>
                          {pipelines.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <FormControl variant="outlined" size="small" style={{ minWidth: 180 }} disabled={!stage.stepConfig?.pipelineId}>
                        <InputLabel>Etapa</InputLabel>
                        <Select
                          value={stage.stepConfig?.stageId || ""}
                          onChange={(e) => updateStage(idx, "stepConfig", { ...stage.stepConfig, stageId: e.target.value })}
                          label="Etapa"
                        >
                          <MenuItem value="">Selecione</MenuItem>
                          {(pipelines.find((p) => String(p.id) === String(stage.stepConfig?.pipelineId))?.stages || [])
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                  )}
                </Box>
              )}

              {/* ---- webhook ---- */}
              {stage.stepType === "webhook" && (
                <Box mt={1} display="flex" flexDirection="column" gridGap={10}>
                  <Box display="flex" gridGap={8} flexWrap="wrap">
                    <FormControl variant="outlined" size="small" style={{ width: 110 }}>
                      <InputLabel>Método</InputLabel>
                      <Select
                        value={stage.stepConfig?.method || "POST"}
                        onChange={(e) => updateStage(idx, "stepConfig", { ...stage.stepConfig, method: e.target.value })}
                        label="Método"
                      >
                        <MenuItem value="POST">POST</MenuItem>
                        <MenuItem value="GET">GET</MenuItem>
                        <MenuItem value="PUT">PUT</MenuItem>
                        <MenuItem value="PATCH">PATCH</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="URL do webhook"
                      size="small"
                      variant="outlined"
                      style={{ flex: 1, minWidth: 260 }}
                      value={stage.stepConfig?.url || ""}
                      onChange={(e) => updateStage(idx, "stepConfig", { ...stage.stepConfig, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </Box>
                  <TextField
                    label="Body/Payload (JSON com variáveis)"
                    size="small"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={3}
                    value={stage.stepConfig?.body || ""}
                    onChange={(e) => updateStage(idx, "stepConfig", { ...stage.stepConfig, body: e.target.value })}
                    placeholder={'{"nome": "{{nome}}", "telefone": "{{telefone}}"}'}
                    helperText="Variáveis disponíveis: {{nome}}, {{telefone}}, {{empresa}}"
                  />
                </Box>
              )}
            </Box>
          ))}
          {/* ===== Quando a pessoa responder ===== */}
          <Divider style={{ margin: "8px 0" }} />
          <Box className={classes.sectionCard}>
            <Typography variant="subtitle1" style={{ fontWeight: 700, marginBottom: 12 }}>
              Quando a pessoa responder
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.stopOnReply !== false}
                      onChange={(e) => setField("stopOnReply", e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Parar follow-up ao responder"
                />
                <Typography variant="caption" color="textSecondary" display="block">
                  Encerra a sequência automaticamente quando o lead responde.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl variant="outlined" size="small" fullWidth>
                  <InputLabel>Ação após resposta</InputLabel>
                  <Select
                    value={form.actionOnReply || "none"}
                    onChange={(e) => {
                      setField("actionOnReply", e.target.value);
                      setField("replyActionConfig", {});
                    }}
                    label="Ação após resposta"
                  >
                    {REPLY_ACTION_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Reply action: move_crm */}
              {form.actionOnReply === "move_crm" && (
                <>
                  <Grid item xs={12} md={6}>
                    <FormControl variant="outlined" size="small" fullWidth>
                      <InputLabel>Funil (após resposta)</InputLabel>
                      <Select
                        value={form.replyActionConfig?.pipelineId || ""}
                        onChange={(e) => setField("replyActionConfig", { ...form.replyActionConfig, pipelineId: e.target.value, stageId: "" })}
                        label="Funil (após resposta)"
                      >
                        <MenuItem value="">Selecione</MenuItem>
                        {pipelines.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl variant="outlined" size="small" fullWidth disabled={!form.replyActionConfig?.pipelineId}>
                      <InputLabel>Etapa destino (após resposta)</InputLabel>
                      <Select
                        value={form.replyActionConfig?.stageId || ""}
                        onChange={(e) => setField("replyActionConfig", { ...form.replyActionConfig, stageId: e.target.value })}
                        label="Etapa destino (após resposta)"
                      >
                        <MenuItem value="">Selecione</MenuItem>
                        {(pipelines.find((p) => String(p.id) === String(form.replyActionConfig?.pipelineId))?.stages || [])
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}

              {/* Reply action: add_tag */}
              {form.actionOnReply === "add_tag" && (
                <Grid item xs={12} md={6}>
                  <FormControl variant="outlined" size="small" fullWidth>
                    <InputLabel>Tag a adicionar (após resposta)</InputLabel>
                    <Select
                      value={form.replyActionConfig?.tagId || ""}
                      onChange={(e) => setField("replyActionConfig", { ...form.replyActionConfig, tagId: e.target.value })}
                      label="Tag a adicionar (após resposta)"
                    >
                      <MenuItem value="">Selecione uma tag</MenuItem>
                      {tags.map((tag) => <MenuItem key={tag.id} value={tag.id}>{tag.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Reply action: activate_ai — stub, not yet functional */}
              {form.actionOnReply === "activate_ai" && (
                <Grid item xs={12}>
                  <Typography variant="caption" style={{ color: "#b45309", display: "block" }}>
                    Em desenvolvimento: esta opção pode ser salva, mas a ativação automática do agente de IA ainda não está disponível em produção nesta versão.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>

        </Box>
      </DialogContent>
      <DialogActions>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gridGap={12} width="100%">
          <Box display="flex" alignItems="center" flexWrap="wrap" gridGap={12}>
            <Box>
              <TextField
                label="Numero de teste"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                variant="outlined"
                size="small"
                placeholder="+55 77 98888-8888"
                style={{ minWidth: 260 }}
                error={testNumberValidation.status === "invalid"}
                helperText={
                  testNumberValidation.status === "loading"
                    ? "Validando no WhatsApp..."
                    : "Numero usado exclusivamente no teste do follow-up."
                }
              />
              {testNumberValidation.status === "valid" && (
                <Box display="flex" alignItems="center" style={{ gap: 4, marginTop: 4 }}>
                  <CheckCircleIcon style={{ color: "#16a34a", fontSize: 14 }} />
                  <Typography style={{ fontSize: 11, color: "#15803d", fontWeight: 600 }}>Número válido no WhatsApp ✓</Typography>
                </Box>
              )}
              {testNumberValidation.status === "invalid" && (
                <Box display="flex" alignItems="center" style={{ gap: 4, marginTop: 4 }}>
                  <ErrorIcon style={{ color: "#dc2626", fontSize: 14 }} />
                  <Typography style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Número inválido — envio bloqueado ✗</Typography>
                </Box>
              )}
            </Box>
            <Button onClick={handleQuickTest} variant="outlined" disabled={testing || testNumberValidation.status !== "valid"}>
              {testing ? "Testando..." : "Testar Follow-up"}
            </Button>
          </Box>

          <Box display="flex" alignItems="center" gridGap={8}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button onClick={submitFollowUp} color="primary" variant="contained">
              Salvar
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

const KanbanBoard = ({ board, campaigns, onEdit, onDrop, onDelete, whatsApps, handleToggle, isAdmin }) => {
  const classes = useStyles();
  const columns = normalizeColumns(board?.columns);
  const grouped = columns.reduce((acc, column) => ({ ...acc, [column]: [] }), {});
  campaigns.forEach((campaign) => {
    const column = columns.includes(campaign.boardColumn) ? campaign.boardColumn : columns[0];
    grouped[column] = grouped[column] || [];
    grouped[column].push(campaign);
  });

  return (
    <>
      <Paper className={classes.boardHeaderCard}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={12}>
          <Box>
            <Typography variant="h6">{board?.name || "Quadro"}</Typography>
            <Typography variant="body2" color="textSecondary">
              Funil: {board?.funnelName || "Geral"} | Colunas: {columns.length}
            </Typography>
          </Box>
          <Chip
            icon={<ViewColumnIcon />}
            label={`${campaigns.length} follow-up(s) neste quadro`}
            style={{ backgroundColor: "rgba(46,125,50,0.12)", color: GREEN }}
          />
        </Box>
      </Paper>

      <Box className={classes.boardColumnsWrap}>
       {columns.map(col => (
         <Box 
           key={col} 
           className={classes.boardColumn}
           onDragOver={(e) => e.preventDefault()}
           onDrop={(e) => {
              const id = e.dataTransfer.getData("campaignId");
              if (id) onDrop(id, col);
           }}
         >
           <Box className={classes.boardColumnHeader}>
             <Typography variant="subtitle1" style={{ fontWeight: "bold", color: "#374151" }}>
                {col}
             </Typography>
             <Chip size="small" label={grouped[col]?.length || 0} />
           </Box>

           <Box display="flex" flexDirection="column" gap={2}>
             {grouped[col]?.map(c => {
                const wa = whatsApps?.find((w) => w.id === c.whatsappId);
                return (
                  <Paper 
                    key={c.id} 
                    className={classes.boardCard}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("campaignId", c.id)}
                  >
                     <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                       <Typography variant="subtitle2" style={{ fontWeight: "bold" }}>{c.name}</Typography>
                       <Tooltip title="Editar">
                         <IconButton size="small" onClick={() => onEdit(c)}><EditIcon fontSize="small" /></IconButton>
                       </Tooltip>
                     </Box>
                     <Typography variant="body2" color="textSecondary" style={{ marginBottom: 4 }}>
                       {c.stages?.length || 0} estágio(s)
                     </Typography>
                     <Typography variant="body2" color="textSecondary" style={{ marginBottom: 4 }}>
                       Disparador: {FOLLOW_UP_TRIGGER_LABEL}
                     </Typography>
                     <Typography variant="body2" color="textSecondary" style={{ marginBottom: 4 }}>
                       Conexão: {wa ? wa.name : "Automático"}
                     </Typography>
                     <Box display="flex" alignItems="center" mt={2} gap={1} justifyContent="space-between">
                       <Box display="flex" alignItems="center" gap={1}>
                         <Switch size="small" checked={!!c.isActive} onChange={() => handleToggle(c)} color="primary" />
                         <Typography variant="caption">{c.isActive ? 'Ativo' : 'Inativo'}</Typography>
                       </Box>
                       {isAdmin && (
                         <Tooltip title="Excluir">
                           <IconButton size="small" onClick={() => onDelete(c.id)}>
                             <DeleteIcon fontSize="small" />
                           </IconButton>
                         </Tooltip>
                       )}
                     </Box>
                  </Paper>
                );
             })}
             {!grouped[col]?.length && (
               <Paper style={{ padding: 16, borderRadius: 10, backgroundColor: "#fff", border: "1px dashed #cbd5e1" }}>
                 <Typography variant="body2" color="textSecondary">
                   Nenhum follow-up nesta coluna.
                 </Typography>
               </Paper>
             )}
           </Box>
         </Box>
       ))}
      </Box>
    </>
  );
};

const FollowUps = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const { loading: planLoading, followUps } = usePlanPermissions();
  const { whatsApps } = useContext(WhatsAppsContext);

  const [campaigns, setCampaigns] = useState([]);
  const [boards, setBoards] = useState([]);
  const [tags, setTags] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [overviewStats, setOverviewStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [boardManagerOpen, setBoardManagerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statsTarget, setStatsTarget] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [selectedFunnel, setSelectedFunnel] = useState("all");
  const [selectedBoardId, setSelectedBoardId] = useState("");

  const isAdmin = user?.profile === "admin" || user?.profile === "super";

  const loadCampaigns = async () => {
    const { data } = await api.get("/follow-up-campaigns");
    setCampaigns(data);
  };

  const loadBoards = async () => {
    const { data } = await api.get("/follow-up-boards");
    setBoards(data);
    return data;
  };

  const loadTags = async () => {
    const { data } = await api.get("/tags/list", { params: { kanban: 0 } });
    setTags(Array.isArray(data) ? data : []);
  };

  const loadPipelines = async () => {
    const { data } = await api.get("/pipelines");
    setPipelines(Array.isArray(data) ? data : []);
  };

  const loadOverviewStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get("/follow-up-campaigns/stats/overview");
      setOverviewStats(data);
    } catch {
      toast.error("Erro ao carregar dashboard de estatisticas");
    } finally {
      setStatsLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [nextBoards] = await Promise.all([
        loadBoards(),
        loadCampaigns(),
        loadOverviewStats(),
        loadTags(),
        loadPipelines()
      ]);
      setSelectedBoardId((current) => current || nextBoards?.[0]?.id || "");
    } catch {
      toast.error("Erro ao carregar follow-ups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!planLoading && !followUps) {
      history.push("/atendimentos");
    }
  }, [planLoading, followUps, history]);

  useEffect(() => {
    if (planLoading || !followUps) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planLoading, followUps]);

  const funnels = useMemo(
    () => ["all", ...boards.map((board) => board.funnelName).filter((value, index, array) => array.indexOf(value) === index)],
    [boards]
  );

  const visibleBoards = useMemo(() => {
    if (selectedFunnel === "all") return boards;
    return boards.filter((board) => board.funnelName === selectedFunnel);
  }, [boards, selectedFunnel]);

  useEffect(() => {
    if (!visibleBoards.length) {
      setSelectedBoardId("");
      return;
    }

    const hasSelectedBoard = visibleBoards.some((board) => String(board.id) === String(selectedBoardId));
    if (!hasSelectedBoard) {
      setSelectedBoardId(visibleBoards[0].id);
    }
  }, [visibleBoards, selectedBoardId]);

  const activeBoard = useMemo(
    () => visibleBoards.find((board) => String(board.id) === String(selectedBoardId)) || visibleBoards[0],
    [visibleBoards, selectedBoardId]
  );

  const kanbanCampaigns = useMemo(() => {
    if (!activeBoard) return [];
    return campaigns.filter((campaign) => String(campaign.boardId) === String(activeBoard.id));
  }, [campaigns, activeBoard]);

  const handleSave = async (form) => {
    try {
      if (editing) {
        await api.put(`/follow-up-campaigns/${editing.id}`, form);
        toast.success("Follow-up atualizado");
      } else {
        await api.post("/follow-up-campaigns", form);
        toast.success("Follow-up criado");
      }
      setModalOpen(false);
      setEditing(null);
      await Promise.all([loadCampaigns(), loadOverviewStats()]);
    } catch {
      toast.error("Erro ao salvar follow-up");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remover este follow-up?")) return;
    try {
      await api.delete(`/follow-up-campaigns/${id}`);
      toast.success("Removido");
      await Promise.all([loadCampaigns(), loadOverviewStats()]);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const handleToggle = async (campaign) => {
    try {
      await api.put(`/follow-up-campaigns/${campaign.id}`, { isActive: !campaign.isActive });
      await Promise.all([loadCampaigns(), loadOverviewStats()]);
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDragDropColumn = async (id, targetColumn) => {
    try {
      await api.put(`/follow-up-campaigns/${id}`, { boardId: activeBoard?.id, boardColumn: targetColumn });
      toast.success("Movido com sucesso");
      loadCampaigns();
    } catch {
       toast.error("Erro ao mover");
    }
  };

  const handleSaveBoard = async (boardDraft) => {
    try {
      const payload = {
        name: boardDraft.name,
        funnelName: boardDraft.funnelName,
        columns: normalizeColumns(boardDraft.columns),
      };

      const { data } =
        boardDraft.id && !String(boardDraft.id).startsWith("new")
          ? await api.put(`/follow-up-boards/${boardDraft.id}`, payload)
          : await api.post("/follow-up-boards", payload);

      toast.success(boardDraft.id && !String(boardDraft.id).startsWith("new") ? "Quadro atualizado" : "Quadro criado");
      const nextBoards = await loadBoards();
      setSelectedBoardId(data?.id || nextBoards?.[0]?.id || "");
      await Promise.all([loadCampaigns(), loadOverviewStats()]);
      return data;
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao salvar quadro");
      throw error;
    }
  };

  const handleDeleteBoard = async (boardId) => {
    try {
      await api.delete(`/follow-up-boards/${boardId}`);
      toast.success("Quadro removido");
      const nextBoards = await loadBoards();
      setSelectedBoardId(nextBoards?.[0]?.id || "");
      await Promise.all([loadCampaigns(), loadOverviewStats()]);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao remover quadro");
      throw error;
    }
  };

  if (planLoading || !followUps) {
    return null;
  }

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Typography variant="h5">Follow-ups Automáticos</Typography>
        <Box className={classes.toolbar}>
          <Button
            variant="outlined"
            startIcon={<ViewListIcon />}
            className={`${classes.toggleButton} ${viewMode === "list" ? classes.toggleButtonActive : ""}`}
            onClick={() => setViewMode("list")}
          >
            Lista
          </Button>
          <Button
            variant="outlined"
            startIcon={<ViewColumnIcon />}
            className={`${classes.toggleButton} ${viewMode === "kanban" ? classes.toggleButtonActive : ""}`}
            onClick={() => setViewMode("kanban")}
          >
            Kanban
          </Button>
          <Button variant="outlined" startIcon={<DashboardIcon />} onClick={loadOverviewStats}>
            Atualizar dashboard
          </Button>
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setBoardManagerOpen(true)}>
            Gerenciar quadros
          </Button>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className={classes.primaryBlackButton}
            >
              Novo
            </Button>
          )}
        </Box>
      </Box>

      <OverviewDashboard stats={overviewStats} loading={statsLoading} />

      {viewMode === "kanban" && (
        <Box className={classes.filterBar}>
          <FormControl variant="outlined" size="small" className={classes.filterControl}>
            <InputLabel>Funil</InputLabel>
            <Select value={selectedFunnel} onChange={(e) => setSelectedFunnel(e.target.value)} label="Funil">
              <MenuItem value="all">Todos os funis</MenuItem>
              {funnels.filter((funnel) => funnel !== "all").map((funnel) => (
                <MenuItem key={funnel} value={funnel}>
                  {funnel}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" className={classes.filterControl} disabled={!visibleBoards.length}>
            <InputLabel>Quadro</InputLabel>
            <Select value={selectedBoardId} onChange={(e) => setSelectedBoardId(e.target.value)} label="Quadro">
              {visibleBoards.map((board) => (
                <MenuItem key={board.id} value={board.id}>
                  {board.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
      ) : viewMode === "kanban" ? (
        activeBoard ? (
          <KanbanBoard
            board={activeBoard}
            campaigns={kanbanCampaigns}
            whatsApps={whatsApps}
            onEdit={(c) => { setEditing(c); setModalOpen(true); }}
            onDrop={handleDragDropColumn}
            onDelete={handleDelete}
            handleToggle={handleToggle}
            isAdmin={isAdmin}
          />
        ) : (
          <Paper style={{ padding: 24 }}>
            <Typography color="textSecondary">
              Nenhum quadro disponivel. Crie um quadro para comecar a organizar seus follow-ups.
            </Typography>
          </Paper>
        )
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Quadro</TableCell>
                <TableCell>Funil</TableCell>
                <TableCell>Conexão</TableCell>
                <TableCell>Disparador</TableCell>
                <TableCell>Estágios</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="textSecondary">Nenhum follow-up criado.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {campaigns.map((c) => {
                const wa = whatsApps?.find((w) => w.id === c.whatsappId);
                return (
                  <TableRow key={c.id} hover>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.board?.name || "-"}</TableCell>
                    <TableCell>{c.board?.funnelName || "-"}</TableCell>
                    <TableCell>{wa ? wa.name : "Automático"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={FOLLOW_UP_TRIGGER_LABEL}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>{c.stages?.length || 0} estágio(s)</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={c.isActive ? "Ativo" : "Inativo"}
                        style={{ backgroundColor: c.isActive ? "#4caf50" : "#9e9e9e", color: "#fff" }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Estatísticas">
                        <IconButton size="small" onClick={() => setStatsTarget(c)}>
                          <BarChartIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {isAdmin && (
                        <>
                          <Tooltip title={c.isActive ? "Desativar" : "Ativar"}>
                            <Switch
                              size="small"
                              checked={c.isActive}
                              onChange={() => handleToggle(c)}
                              color="primary"
                            />
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => { setEditing(c); setModalOpen(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton size="small" onClick={() => handleDelete(c.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <FollowUpModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        campaign={editing}
        whatsApps={whatsApps}
        boards={boards}
        companyId={user?.companyId}
        tags={tags}
        pipelines={pipelines}
      />

      <BoardManagerDialog
        open={boardManagerOpen}
        onClose={() => setBoardManagerOpen(false)}
        boards={boards}
        onSave={handleSaveBoard}
        onDelete={handleDeleteBoard}
        isAdmin={isAdmin}
      />

      {statsTarget && (
        <StatsDialog
          open={!!statsTarget}
          onClose={() => setStatsTarget(null)}
          campaignId={statsTarget?.id}
          campaignName={statsTarget?.name}
        />
      )}
    </Box>
  );
};

export default FollowUps;
