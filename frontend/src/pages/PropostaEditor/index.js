import React, { useState, useEffect, useCallback, useRef } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
  makeStyles,
  Paper,
  Typography,
  Button,
  Tab,
  Tabs,
  CircularProgress,
  IconButton,
  TextField,
  Grid,
  Divider,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Chip,
  Tooltip,
  Card,
  CardContent,
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import SaveIcon from "@material-ui/icons/Save";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import SettingsIcon from "@material-ui/icons/Settings";
import AttachMoneyIcon from "@material-ui/icons/AttachMoney";
import ListIcon from "@material-ui/icons/List";
import DescriptionIcon from "@material-ui/icons/Description";
import FormatListBulletedIcon from "@material-ui/icons/FormatListBulleted";
import BarChartIcon from "@material-ui/icons/BarChart";
import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1.5, 3),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    flexShrink: 0,
    flexWrap: "wrap",
    gap: theme.spacing(1),
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  titleInput: {
    minWidth: 280,
    "& .MuiInputBase-root": {
      fontSize: "1.1rem",
      fontWeight: 600,
    },
  },
  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  sidebar: {
    width: 380,
    flexShrink: 0,
    borderRight: `1px solid ${theme.palette.divider}`,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: theme.palette.background.paper,
    [theme.breakpoints.down("sm")]: {
      width: "100%",
    },
  },
  tabsBar: {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  tabContent: {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(2),
  },
  preview: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: theme.palette.grey[100],
  },
  previewHeader: {
    padding: theme.spacing(1.5, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewBody: {
    flex: 1,
    overflow: "auto",
    padding: theme.spacing(3),
  },
  previewCard: {
    maxWidth: 800,
    margin: "0 auto",
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    padding: theme.spacing(4),
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
    textTransform: "uppercase",
    fontSize: "0.75rem",
    letterSpacing: 1,
  },
  field: {
    marginBottom: theme.spacing(2),
  },
  itemCard: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    position: "relative",
  },
  addButton: {
    marginTop: theme.spacing(1),
  },
  deleteItemBtn: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  statusChip: {
    marginLeft: theme.spacing(1),
  },
  phaseHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1),
  },
  actionRow: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center",
    marginBottom: theme.spacing(1),
  },
}));

const STATUS_OPTIONS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "aceita", label: "Aceita" },
  { value: "recusada", label: "Recusada" },
];

const TAB_ICONS = [
  { icon: <SettingsIcon />, label: "Geral" },
  { icon: <ListIcon />, label: "Itens" },
  { icon: <FormatListBulletedIcon />, label: "Fases" },
  { icon: <DescriptionIcon />, label: "Textos" },
  { icon: <BarChartIcon />, label: "KPIs" },
  { icon: <AttachMoneyIcon />, label: "Orçamento" },
];

const PropostaEditorPage = () => {
  const classes = useStyles();
  const { proposalId } = useParams();
  const history = useHistory();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const saveTimer = useRef(null);

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get(`/proposals/${proposalId}`);
      setProposal(data);
    } catch {
      toast.error("Erro ao carregar proposta");
      history.push("/propostas");
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [proposal]);

  const update = (field, value) => {
    setProposal((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const updateData = (field, value) => {
    setProposal((prev) => ({
      ...prev,
      data: { ...prev.data, [field]: value },
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!proposal) return;
    setSaving(true);
    try {
      await api.put(`/proposals/${proposalId}`, {
        title: proposal.title,
        clientName: proposal.clientName,
        status: proposal.status,
        validUntil: proposal.validUntil,
        notes: proposal.notes,
        data: proposal.data,
      });
      setIsDirty(false);
      toast.success("Proposta salva!");
    } catch {
      toast.error("Erro ao salvar proposta");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </div>
    );
  }

  if (!proposal) return null;

  const d = proposal.data || {};
  const items = d.items || [];
  const phases = d.phases || [];
  const scripts = d.scripts || [];
  const kpis = d.kpis || [];
  const budget = d.budget || [];

  const addItem = () => {
    updateData("items", [
      ...items,
      { id: Date.now(), descricao: "", quantidade: 1, valorUnitario: "", unidade: "" }
    ]);
  };

  const removeItem = (idx) => {
    updateData("items", items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    const next = items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
    updateData("items", next);
  };

  const addPhase = () => {
    updateData("phases", [
      ...phases,
      { id: Date.now(), nome: "", objetivo: "", semanas: "", acoes: [] }
    ]);
  };

  const removePhase = (idx) => {
    updateData("phases", phases.filter((_, i) => i !== idx));
  };

  const updatePhase = (idx, field, value) => {
    const next = phases.map((p, i) => i === idx ? { ...p, [field]: value } : p);
    updateData("phases", next);
  };

  const addScript = () => {
    updateData("scripts", [...scripts, { id: Date.now(), titulo: "", texto: "" }]);
  };

  const removeScript = (idx) => {
    updateData("scripts", scripts.filter((_, i) => i !== idx));
  };

  const updateScript = (idx, field, value) => {
    const next = scripts.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    updateData("scripts", next);
  };

  const addKpi = () => {
    updateData("kpis", [...kpis, { id: Date.now(), indicador: "", meta: "", fonte: "" }]);
  };

  const removeKpi = (idx) => {
    updateData("kpis", kpis.filter((_, i) => i !== idx));
  };

  const updateKpi = (idx, field, value) => {
    const next = kpis.map((k, i) => i === idx ? { ...k, [field]: value } : k);
    updateData("kpis", next);
  };

  const addBudgetItem = () => {
    updateData("budget", [
      ...budget,
      { id: Date.now(), item: "", custoMensal: "", custoTotal: "", observacao: "" }
    ]);
  };

  const removeBudgetItem = (idx) => {
    updateData("budget", budget.filter((_, i) => i !== idx));
  };

  const updateBudgetItem = (idx, field, value) => {
    const next = budget.map((b, i) => i === idx ? { ...b, [field]: value } : b);
    updateData("budget", next);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 0: // Geral
        return (
          <div>
            <Typography className={classes.sectionTitle}>Informações Gerais</Typography>
            <TextField
              className={classes.field}
              label="Nome do Cliente"
              variant="outlined"
              fullWidth
              size="small"
              value={proposal.clientName || ""}
              onChange={(e) => update("clientName", e.target.value)}
            />
            <TextField
              className={classes.field}
              label="Validade"
              type="date"
              variant="outlined"
              fullWidth
              size="small"
              value={proposal.validUntil || ""}
              onChange={(e) => update("validUntil", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl variant="outlined" size="small" fullWidth className={classes.field}>
              <InputLabel>Status</InputLabel>
              <Select
                value={proposal.status || "rascunho"}
                onChange={(e) => update("status", e.target.value)}
                label="Status"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              className={classes.field}
              label="Introdução / Apresentação"
              variant="outlined"
              fullWidth
              multiline
              rows={4}
              size="small"
              value={d.introducao || ""}
              onChange={(e) => updateData("introducao", e.target.value)}
              placeholder="Escreva uma introdução ou apresentação da proposta..."
            />
            <TextField
              className={classes.field}
              label="Observações"
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={proposal.notes || ""}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>
        );

      case 1: // Itens / Produtos e Serviços
        return (
          <div>
            <Typography className={classes.sectionTitle}>Itens da Proposta</Typography>
            {items.map((item, idx) => (
              <div key={item.id || idx} className={classes.itemCard}>
                <IconButton
                  size="small"
                  className={classes.deleteItemBtn}
                  onClick={() => removeItem(idx)}
                >
                  <DeleteIcon fontSize="small" color="error" />
                </IconButton>
                <TextField
                  label="Descrição"
                  size="small"
                  fullWidth
                  variant="outlined"
                  value={item.descricao || ""}
                  onChange={(e) => updateItem(idx, "descricao", e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <TextField
                      label="Qtd"
                      size="small"
                      type="number"
                      fullWidth
                      variant="outlined"
                      value={item.quantidade || ""}
                      onChange={(e) => updateItem(idx, "quantidade", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Unidade"
                      size="small"
                      fullWidth
                      variant="outlined"
                      value={item.unidade || ""}
                      onChange={(e) => updateItem(idx, "unidade", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Valor Unit."
                      size="small"
                      fullWidth
                      variant="outlined"
                      value={item.valorUnitario || ""}
                      onChange={(e) => updateItem(idx, "valorUnitario", e.target.value)}
                    />
                  </Grid>
                </Grid>
              </div>
            ))}
            <Button
              className={classes.addButton}
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={addItem}
              fullWidth
            >
              Adicionar Item
            </Button>
          </div>
        );

      case 2: // Fases
        return (
          <div>
            <Typography className={classes.sectionTitle}>Fases do Projeto</Typography>
            {phases.map((phase, idx) => (
              <div key={phase.id || idx} className={classes.itemCard}>
                <div className={classes.phaseHeader}>
                  <Typography variant="body2" style={{ fontWeight: 600 }}>
                    Fase {idx + 1}
                  </Typography>
                  <IconButton size="small" onClick={() => removePhase(idx)}>
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </div>
                <TextField
                  label="Nome da Fase"
                  size="small"
                  fullWidth
                  variant="outlined"
                  value={phase.nome || ""}
                  onChange={(e) => updatePhase(idx, "nome", e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <TextField
                  label="Semanas"
                  size="small"
                  fullWidth
                  variant="outlined"
                  value={phase.semanas || ""}
                  onChange={(e) => updatePhase(idx, "semanas", e.target.value)}
                  placeholder="Ex: Semanas 1-2"
                  style={{ marginBottom: 8 }}
                />
                <TextField
                  label="Objetivo"
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  variant="outlined"
                  value={phase.objetivo || ""}
                  onChange={(e) => updatePhase(idx, "objetivo", e.target.value)}
                />
              </div>
            ))}
            <Button
              className={classes.addButton}
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={addPhase}
              fullWidth
            >
              Adicionar Fase
            </Button>
          </div>
        );

      case 3: // Textos / Scripts
        return (
          <div>
            <Typography className={classes.sectionTitle}>Textos e Scripts</Typography>
            {scripts.map((script, idx) => (
              <div key={script.id || idx} className={classes.itemCard}>
                <IconButton
                  size="small"
                  className={classes.deleteItemBtn}
                  onClick={() => removeScript(idx)}
                >
                  <DeleteIcon fontSize="small" color="error" />
                </IconButton>
                <TextField
                  label="Título"
                  size="small"
                  fullWidth
                  variant="outlined"
                  value={script.titulo || ""}
                  onChange={(e) => updateScript(idx, "titulo", e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <TextField
                  label="Texto"
                  size="small"
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  value={script.texto || ""}
                  onChange={(e) => updateScript(idx, "texto", e.target.value)}
                />
              </div>
            ))}
            <Button
              className={classes.addButton}
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={addScript}
              fullWidth
            >
              Adicionar Texto
            </Button>
          </div>
        );

      case 4: // KPIs
        return (
          <div>
            <Typography className={classes.sectionTitle}>Indicadores de Resultado (KPIs)</Typography>
            {kpis.map((kpi, idx) => (
              <div key={kpi.id || idx} className={classes.itemCard}>
                <IconButton
                  size="small"
                  className={classes.deleteItemBtn}
                  onClick={() => removeKpi(idx)}
                >
                  <DeleteIcon fontSize="small" color="error" />
                </IconButton>
                <TextField
                  label="Indicador"
                  size="small"
                  fullWidth
                  variant="outlined"
                  value={kpi.indicador || ""}
                  onChange={(e) => updateKpi(idx, "indicador", e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <TextField
                      label="Meta"
                      size="small"
                      fullWidth
                      variant="outlined"
                      value={kpi.meta || ""}
                      onChange={(e) => updateKpi(idx, "meta", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Fonte"
                      size="small"
                      fullWidth
                      variant="outlined"
                      value={kpi.fonte || ""}
                      onChange={(e) => updateKpi(idx, "fonte", e.target.value)}
                    />
                  </Grid>
                </Grid>
              </div>
            ))}
            <Button
              className={classes.addButton}
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={addKpi}
              fullWidth
            >
              Adicionar KPI
            </Button>
          </div>
        );

      case 5: // Orçamento
        return (
          <div>
            <Typography className={classes.sectionTitle}>Orçamento</Typography>
            {budget.map((b, idx) => (
              <div key={b.id || idx} className={classes.itemCard}>
                <IconButton
                  size="small"
                  className={classes.deleteItemBtn}
                  onClick={() => removeBudgetItem(idx)}
                >
                  <DeleteIcon fontSize="small" color="error" />
                </IconButton>
                <TextField
                  label="Descrição"
                  size="small"
                  fullWidth
                  variant="outlined"
                  value={b.item || ""}
                  onChange={(e) => updateBudgetItem(idx, "item", e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <TextField
                      label="Custo Mensal"
                      size="small"
                      fullWidth
                      variant="outlined"
                      value={b.custoMensal || ""}
                      onChange={(e) => updateBudgetItem(idx, "custoMensal", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Custo Total"
                      size="small"
                      fullWidth
                      variant="outlined"
                      value={b.custoTotal || ""}
                      onChange={(e) => updateBudgetItem(idx, "custoTotal", e.target.value)}
                    />
                  </Grid>
                </Grid>
              </div>
            ))}
            <Button
              className={classes.addButton}
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={addBudgetItem}
              fullWidth
            >
              Adicionar Item de Orçamento
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderPreview = () => {
    const d = proposal.data || {};
    const items = d.items || [];
    const phases = d.phases || [];
    const scripts = d.scripts || [];
    const kpis = d.kpis || [];
    const budget = d.budget || [];

    const totalBudget = budget.reduce((acc, b) => {
      const val = parseFloat((b.custoTotal || "0").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
      return acc + val;
    }, 0);

    return (
      <div className={classes.previewBody}>
        <div className={classes.previewCard}>
          <Typography variant="h4" style={{ fontWeight: 700, marginBottom: 8 }}>
            {proposal.title}
          </Typography>
          <Typography variant="h6" color="textSecondary" style={{ marginBottom: 16 }}>
            {proposal.clientName}
          </Typography>

          {proposal.validUntil && (
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }}>
              Válida até: {new Date(proposal.validUntil).toLocaleDateString("pt-BR")}
            </Typography>
          )}

          <Divider style={{ margin: "16px 0" }} />

          {d.introducao && (
            <>
              <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 8 }}>Apresentação</Typography>
              <Typography variant="body1" style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>
                {d.introducao}
              </Typography>
              <Divider style={{ margin: "16px 0" }} />
            </>
          )}

          {items.length > 0 && (
            <>
              <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 12 }}>Itens</Typography>
              {items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <Typography variant="body2">{item.descricao}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {item.quantidade} {item.unidade} × R$ {item.valorUnitario}
                  </Typography>
                </div>
              ))}
              <Divider style={{ margin: "16px 0" }} />
            </>
          )}

          {phases.length > 0 && (
            <>
              <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 12 }}>Fases do Projeto</Typography>
              {phases.map((phase, i) => (
                <div key={i} style={{ marginBottom: 12, padding: 12, backgroundColor: "#f5f5f5", borderRadius: 8 }}>
                  <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
                    Fase {i + 1}: {phase.nome} {phase.semanas && `(${phase.semanas})`}
                  </Typography>
                  {phase.objetivo && (
                    <Typography variant="body2" style={{ marginTop: 4 }}>{phase.objetivo}</Typography>
                  )}
                </div>
              ))}
              <Divider style={{ margin: "16px 0" }} />
            </>
          )}

          {kpis.length > 0 && (
            <>
              <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 12 }}>Indicadores (KPIs)</Typography>
              <Grid container spacing={2}>
                {kpis.map((kpi, i) => (
                  <Grid item xs={12} sm={6} key={i}>
                    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                      <Typography variant="body2" style={{ fontWeight: 600 }}>{kpi.indicador}</Typography>
                      <Typography variant="caption" color="textSecondary">Meta: {kpi.meta}</Typography>
                    </div>
                  </Grid>
                ))}
              </Grid>
              <Divider style={{ margin: "16px 0" }} />
            </>
          )}

          {budget.length > 0 && (
            <>
              <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 12 }}>Orçamento</Typography>
              {budget.map((b, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <Typography variant="body2">{b.item}</Typography>
                  <Typography variant="body2">
                    {b.custoMensal && `R$ ${b.custoMensal}/mês`}
                    {b.custoTotal && ` | Total: R$ ${b.custoTotal}`}
                  </Typography>
                </div>
              ))}
            </>
          )}

          {proposal.notes && (
            <>
              <Divider style={{ margin: "16px 0" }} />
              <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 8 }}>Observações</Typography>
              <Typography variant="body2" style={{ whiteSpace: "pre-wrap" }}>{proposal.notes}</Typography>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={classes.root}>
      <div className={classes.topBar}>
        <div className={classes.topBarLeft}>
          <IconButton size="small" onClick={() => history.push("/propostas")}>
            <ArrowBackIcon />
          </IconButton>
          <TextField
            className={classes.titleInput}
            variant="outlined"
            size="small"
            value={proposal.title || ""}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Título da proposta"
          />
          {isDirty && (
            <Chip label="Não salvo" size="small" color="secondary" />
          )}
        </div>
        <div className={classes.topBarRight}>
          <Button
            variant="contained"
            color="primary"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            Salvar
          </Button>
        </div>
      </div>

      <div className={classes.body}>
        <div className={classes.sidebar}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            className={classes.tabsBar}
            indicatorColor="primary"
            textColor="primary"
          >
            {TAB_ICONS.map((tab, i) => (
              <Tab
                key={i}
                icon={tab.icon}
                label={tab.label}
                style={{ minWidth: 60, fontSize: "0.65rem" }}
              />
            ))}
          </Tabs>
          <div className={classes.tabContent}>
            {renderTab()}
          </div>
        </div>

        <div className={classes.preview}>
          <div className={classes.previewHeader}>
            <Typography variant="body2" style={{ fontWeight: 600 }}>
              Pré-visualização
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Salve para atualizar
            </Typography>
          </div>
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default PropostaEditorPage;
