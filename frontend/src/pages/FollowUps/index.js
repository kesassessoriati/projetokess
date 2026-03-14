import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
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
import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import BarChartIcon from "@material-ui/icons/BarChart";
import DashboardIcon from "@material-ui/icons/Dashboard";
import ViewColumnIcon from "@material-ui/icons/ViewColumn";
import ViewListIcon from "@material-ui/icons/ViewList";
import SettingsIcon from "@material-ui/icons/Settings";
import SaveIcon from "@material-ui/icons/Save";
import { toast } from "react-toastify";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";

const GREEN = "#2e7d32";
const GREEN_DARK = "#1f5b24";

const useStyles = makeStyles((theme) => ({
  root: { padding: theme.spacing(3) },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(3),
    gap: theme.spacing(2),
    flexWrap: "wrap",
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
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  stageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(1),
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
    padding: theme.spacing(2),
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
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
    padding: theme.spacing(2),
    borderRadius: 12,
    marginBottom: theme.spacing(2),
    background:
      "linear-gradient(135deg, rgba(46,125,50,0.08) 0%, rgba(46,125,50,0.03) 100%)",
    border: "1px solid rgba(46,125,50,0.16)",
  },
  boardColumnsWrap: {
    display: "flex",
    gap: theme.spacing(2),
    overflowX: "auto",
    minHeight: "60vh",
    paddingBottom: theme.spacing(2),
  },
  boardColumn: {
    backgroundColor: "#f5f7f9",
    borderRadius: 12,
    padding: theme.spacing(2),
    minWidth: 320,
    maxWidth: 320,
    border: "1px solid #e5e7eb",
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
    borderLeft: `4px solid ${GREEN}`,
    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.08)",
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

const emptyStage = () => ({
  order: 1,
  delayMinutes: 60,
  messageType: "text",
  message: "",
  mediaUrl: "",
  mediaType: "",
  mediaCaption: "",
  buttons: [],
  isActive: true,
});

const emptyForm = (boards = []) => {
  const firstBoard = boards[0];
  const firstColumn = normalizeColumns(firstBoard?.columns)[0] || "Sem Categoria";

  return {
    name: "",
    whatsappId: "",
    isActive: true,
    sourceType: "manual",
    boardId: firstBoard?.id || "",
    boardColumn: firstColumn,
    stages: [emptyStage()],
  };
};

const FollowUpTestDialog = ({ open, onClose, onSubmit, loading, defaultWhatsappId }) => {
  const [number, setNumber] = useState("");
  const [whatsappId, setWhatsappId] = useState(defaultWhatsappId || "");

  useEffect(() => {
    if (!open) return;
    setWhatsappId(defaultWhatsappId || "");
  }, [defaultWhatsappId, open]);

  const handleSubmit = () => {
    if (!number.trim()) {
      toast.warn("Informe um numero de WhatsApp para testar");
      return;
    }

    onSubmit({ number, whatsappId });
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Testar Follow-up</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gridGap={16}>
          <TextField
            label="Numero de WhatsApp"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            placeholder="5511999999999"
            helperText="Use DDD + numero, com ou sem 55."
          />
          <TextField
            label="Conexao WhatsApp do teste"
            value={whatsappId}
            onChange={(e) => setWhatsappId(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Opcional"
            helperText="Se vazio, o sistema usa a primeira conexao conectada."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={loading}>
          {loading ? "Testando..." : "Executar teste"}
        </Button>
      </DialogActions>
    </Dialog>
  );
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

const FollowUpModal = ({ open, onClose, onSave, campaign, whatsApps, boards }) => {
  const classes = useStyles();
  const [form, setForm] = useState(emptyForm(boards));
  const [uploadingStageIndex, setUploadingStageIndex] = useState(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (campaign) {
      const boardId = campaign.boardId || boards[0]?.id || "";
      const selectedBoard = boards.find((board) => String(board.id) === String(boardId)) || boards[0];
      const safeColumn = normalizeColumns(selectedBoard?.columns).includes(campaign.boardColumn)
        ? campaign.boardColumn
        : normalizeColumns(selectedBoard?.columns)[0] || "Sem Categoria";
      setForm({
        name: campaign.name || "",
        whatsappId: campaign.whatsappId || "",
        isActive: campaign.isActive !== false,
        sourceType: campaign.sourceType || "manual",
        boardId,
        boardColumn: safeColumn,
        stages: campaign.stages?.length ? campaign.stages : [emptyStage()],
      });
    } else {
      setForm(emptyForm(boards));
    }
  }, [campaign, open, boards]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const updateStage = (idx, key, value) => {
    setForm((p) => {
      const stages = [...p.stages];
      stages[idx] = { ...stages[idx], [key]: value };
      return { ...p, stages };
    });
  };

  const handleUpload = async (e, idx, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMB = file.size / 1024 / 1024;
    if (type === "image" && sizeMB > 5) return toast.error("A imagem deve ter até 5MB");
    if (type === "video" && sizeMB > 16) return toast.error("O vídeo deve ter até 16MB");
    if (type === "audio" && sizeMB > 10) return toast.error("O áudio deve ter até 10MB");
    if (type === "document" && sizeMB > 10) return toast.error("O documento deve ter até 10MB");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("typeArch", "followups");
    try {
      setUploadingStageIndex(idx);
      const { data } = await api.post("/follow-up-campaigns/upload", formData);
      updateStage(idx, "mediaUrl", data.filePath);
      updateStage(idx, "mediaType", data.mediaType || type);
      toast.success("Arquivo anexado com sucesso!");
    } catch {
      toast.error("Erro no upload do arquivo");
    } finally {
      setUploadingStageIndex(null);
    }
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

  const handleSave = () => {
    if (!form.name.trim()) return toast.warn("Informe um nome para a campanha");
    if (!form.stages.length) return toast.warn("Adicione ao menos um estágio");
    if (!form.boardId) return toast.warn("Selecione um quadro");
    onSave({
      ...form,
      stages: form.stages.map((stage, index) => ({ ...stage, order: index + 1 })),
      boardColumn: selectedBoardColumns.includes(form.boardColumn) ? form.boardColumn : selectedBoardColumns[0],
    });
  };

  const handleQuickTest = async ({ number, whatsappId }) => {
    if (!form.stages.length) {
      toast.warn("Adicione ao menos um estagio antes de testar");
      return;
    }

    try {
      setTesting(true);
      const { data } = await api.post("/follow-up-campaigns/test", {
        whatsappId: whatsappId || form.whatsappId || "",
        targetNumber: number,
        stages: form.stages.map((stage, index) => ({ ...stage, order: index + 1 })),
      });

      const failures = (data?.results || []).filter((result) => result.status !== "sent");
      if (!failures.length) {
        toast.success("Teste executado com sucesso!");
      } else {
        toast.warn("Teste concluido com falhas em uma ou mais etapas.");
      }
      setTestDialogOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao testar follow-up");
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{campaign ? "Editar Follow-up" : "Novo Follow-up"}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField
            label="Nome da campanha"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
          />

          <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel>Conexão WhatsApp (opcional)</InputLabel>
            <Select
              value={form.whatsappId}
              onChange={(e) => setField("whatsappId", e.target.value)}
              label="Conexão WhatsApp (opcional)"
            >
              <MenuItem value="">Automático (primeiro disponível)</MenuItem>
              {whatsApps?.filter((w) => w.status === "CONNECTED").map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel>Tipo de origem</InputLabel>
            <Select
              value={form.sourceType}
              onChange={(e) => setField("sourceType", e.target.value)}
              label="Tipo de origem"
            >
              <MenuItem value="manual">Manual (qualquer mensagem enviada)</MenuItem>
              <MenuItem value="campaign">Campanha (disparador)</MenuItem>
            </Select>
          </FormControl>

          <Box display="flex" gap={2} flexWrap="wrap">
            <FormControl variant="outlined" size="small" fullWidth style={{ minWidth: 220, flex: 1 }}>
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

            <FormControl variant="outlined" size="small" fullWidth style={{ minWidth: 220, flex: 1 }}>
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
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={form.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
                color="primary"
              />
            }
            label="Ativo"
          />

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
                <Typography variant="subtitle2">Estágio {idx + 1}</Typography>
                <IconButton size="small" onClick={() => removeStage(idx)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              <Box display="flex" gap={2} flexWrap="wrap" mb={1}>
                <TextField
                  label="Atraso (minutos)"
                  type="number"
                  value={stage.delayMinutes}
                  onChange={(e) => updateStage(idx, "delayMinutes", Number(e.target.value))}
                  variant="outlined"
                  size="small"
                  style={{ width: 150 }}
                  inputProps={{ min: 1 }}
                />

                <FormControl variant="outlined" size="small" style={{ minWidth: 150 }}>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={stage.messageType}
                    onChange={(e) => updateStage(idx, "messageType", e.target.value)}
                    label="Tipo"
                  >
                    <MenuItem value="text">Texto</MenuItem>
                    <MenuItem value="image">Imagem</MenuItem>
                    <MenuItem value="video">Vídeo</MenuItem>
                    <MenuItem value="audio">Áudio</MenuItem>
                    <MenuItem value="document">Documento</MenuItem>
                    <MenuItem value="buttons">Botões</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={stage.isActive}
                      onChange={(e) => updateStage(idx, "isActive", e.target.checked)}
                      color="primary"
                      size="small"
                    />
                  }
                  label="Ativo"
                />
              </Box>

              {["text", "buttons"].includes(stage.messageType) && (
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
              )}

              {["image", "video", "audio", "document"].includes(stage.messageType) && (
                <Box mt={2} mb={2} p={2} border="1px dashed #ccc" borderRadius={4}>
                  <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Anexo de Mídia</Typography>
                  <Box display="flex" gap={2} alignItems="center">
                    <input 
                      type="file" 
                      accept={
                        stage.messageType === "image" ? "image/*" : 
                        stage.messageType === "video" ? "video/*" : 
                        stage.messageType === "audio" ? "audio/*" : 
                        "*"
                      }
                      onChange={(e) => handleUpload(e, idx, stage.messageType)} 
                    />
                    {uploadingStageIndex === idx && <CircularProgress size={18} />}
                  </Box>
                  {stage.mediaUrl && (
                    <Box mt={2} mb={2}>
                      <Typography variant="caption" color="primary">Arquivo: {stage.mediaUrl.split("-").pop()}</Typography>
                      {stage.messageType === "image" && (
                        <Box mt={1}>
                          <img
                            src={stage.mediaUrl?.startsWith("http") ? stage.mediaUrl : `${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "")}${stage.mediaUrl}`}
                            alt="preview"
                            style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8 }}
                          />
                        </Box>
                      )}
                    </Box>
                  )}
                  <Box mt={2}>
                    <TextField
                      label="Legenda (opcional)"
                      value={stage.mediaCaption || ""}
                      onChange={(e) => updateStage(idx, "mediaCaption", e.target.value)}
                      fullWidth
                      size="small"
                      variant="outlined"
                    />
                  </Box>
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
            </Box>
          ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(true)} variant="outlined">
            Testar Follow-up
          </Button>
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} color="primary" variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <FollowUpTestDialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        onSubmit={handleQuickTest}
        loading={testing}
        defaultWhatsappId={form.whatsappId}
      />
    </>
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
                       Origem: {c.sourceType === "campaign" ? "Campanha" : "Manual"}
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
  const { user } = useContext(AuthContext);
  const { whatsApps } = useContext(WhatsAppsContext);

  const [campaigns, setCampaigns] = useState([]);
  const [boards, setBoards] = useState([]);
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
      const [nextBoards] = await Promise.all([loadBoards(), loadCampaigns(), loadOverviewStats()]);
      setSelectedBoardId((current) => current || nextBoards?.[0]?.id || "");
    } catch {
      toast.error("Erro ao carregar follow-ups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                <TableCell>Origem</TableCell>
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
                        label={c.sourceType === "campaign" ? "Campanha" : "Manual"}
                        color={c.sourceType === "campaign" ? "primary" : "default"}
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
