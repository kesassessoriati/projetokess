import React, { useCallback, useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  makeStyles,
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import AttachMoneyIcon from "@material-ui/icons/AttachMoney";
import BarChartIcon from "@material-ui/icons/BarChart";
import DeleteIcon from "@material-ui/icons/Delete";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import FormatListBulletedIcon from "@material-ui/icons/FormatListBulleted";
import LaunchIcon from "@material-ui/icons/Launch";
import PaletteIcon from "@material-ui/icons/Palette";
import PublicIcon from "@material-ui/icons/Public";
import SaveIcon from "@material-ui/icons/Save";
import SettingsIcon from "@material-ui/icons/Settings";
import StarIcon from "@material-ui/icons/Star";
import DescriptionIcon from "@material-ui/icons/Description";
import { toast } from "react-toastify";

import ProposalViewer from "../../components/ProposalViewer";
import api from "../../services/api";
import {
  PROPOSAL_STATUS,
  createProposalId,
  getPublicProposalUrl,
  normalizeProposalData,
  proposalStatusTone,
} from "../../utils/proposalBuilder";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "calc(100vh - 78px)",
    margin: theme.spacing(-2),
    display: "grid",
    gridTemplateColumns: "420px minmax(0, 1fr)",
    background: "#080811",
    color: "#f8fafc",
    overflow: "hidden",
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "1fr",
      height: "auto",
      minHeight: "calc(100vh - 78px)",
    },
  },
  sidebar: {
    borderRight: "1px solid rgba(255,255,255,0.08)",
    background: "#101019",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  sidebarHeader: {
    padding: "16px 18px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerTitle: {
    minWidth: 0,
    "& h2": {
      margin: 0,
      color: "#f8fafc",
      fontSize: 15,
      fontWeight: 850,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    "& p": {
      margin: "3px 0 0",
      color: "#777d98",
      fontSize: 11,
    },
  },
  tabs: {
    display: "flex",
    gap: 6,
    padding: "10px 14px",
    overflowX: "auto",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  tab: {
    border: 0,
    borderRadius: 9,
    padding: "9px 10px",
    background: "transparent",
    color: "#8d94ad",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 850,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "160ms ease",
    "&:hover": {
      background: "rgba(255,255,255,0.06)",
      color: "#fff",
    },
  },
  tabActive: {
    color: "#fff",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
  },
  sidebarBody: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: 16,
  },
  preview: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  previewHeader: {
    height: 50,
    flexShrink: 0,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "#101019",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    gap: 12,
  },
  previewUrl: {
    minWidth: 0,
    maxWidth: 680,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 999,
    padding: "6px 12px",
    color: "#7c86a5",
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    "& strong": {
      color: "#7c9cff",
      fontWeight: 800,
    },
  },
  previewBody: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  section: {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 11,
    fontWeight: 900,
    marginBottom: 12,
  },
  field: {
    marginBottom: 12,
    "& .MuiInputBase-root": {
      color: "#f8fafc",
      background: "#151520",
    },
    "& .MuiInputLabel-root": {
      color: "#8d94ad",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(255,255,255,0.12)",
    },
    "& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(255,255,255,0.24)",
    },
    "& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#6366f1",
    },
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  item: {
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    background: "rgba(255,255,255,0.035)",
  },
  itemHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  itemTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: 850,
  },
  actionBar: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  buttonPrimary: {
    borderRadius: 9,
    textTransform: "none",
    fontWeight: 850,
    color: "#fff",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    "&:hover": {
      background: "linear-gradient(135deg, #818cf8, #6366f1)",
    },
  },
  buttonGhost: {
    borderRadius: 9,
    color: "#cbd5e1",
    borderColor: "rgba(255,255,255,0.14)",
    textTransform: "none",
    fontWeight: 800,
  },
  iconButton: {
    color: "#9ca3af",
  },
  colorInput: {
    width: "100%",
    height: 40,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    background: "#151520",
    padding: 4,
  },
  statusChip: {
    height: 22,
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
  },
}));

const tabs = [
  { id: "general", label: "Geral", icon: <SettingsIcon style={{ fontSize: 15 }} /> },
  { id: "appearance", label: "Aparência", icon: <PaletteIcon style={{ fontSize: 15 }} /> },
  { id: "phases", label: "Fases", icon: <FormatListBulletedIcon style={{ fontSize: 15 }} /> },
  { id: "metodo5s", label: "5S", icon: <StarIcon style={{ fontSize: 15 }} /> },
  { id: "scripts", label: "Scripts", icon: <DescriptionIcon style={{ fontSize: 15 }} /> },
  { id: "kpis", label: "KPIs", icon: <BarChartIcon style={{ fontSize: 15 }} /> },
  { id: "orcamento", label: "Orçamento", icon: <AttachMoneyIcon style={{ fontSize: 15 }} /> },
];

const statusOptions = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Publicada" },
  { value: "aceita", label: "Aceita" },
  { value: "recusada", label: "Recusada" },
];

const splitLines = (value) => String(value || "").split("\n").map((line) => line.trim()).filter(Boolean);
const joinLines = (value) => Array.isArray(value) ? value.join("\n") : "";

const PropostaEditorPage = () => {
  const classes = useStyles();
  const history = useHistory();
  const { proposalId } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const fetchProposal = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/proposals/${proposalId}`);
      setProposal({
        ...data,
        data: normalizeProposalData(data),
      });
    } catch {
      toast.error("Erro ao carregar proposta");
      history.push("/propostas");
    } finally {
      setLoading(false);
    }
  }, [history, proposalId]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  const data = proposal?.data || {};
  const theme = data.theme || {};
  const publicUrl = proposal?.slug ? getPublicProposalUrl(proposal.slug) : "";
  const statusColor = proposalStatusTone[proposal?.status] || "#8b8ba7";

  const updateProposal = (field, value) => {
    setProposal((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const updateData = (updater) => {
    setProposal((prev) => {
      const currentData = prev?.data || {};
      const nextData = typeof updater === "function" ? updater(currentData) : { ...currentData, ...updater };
      return { ...prev, data: nextData };
    });
    setDirty(true);
  };

  const updateTheme = (field, value) => {
    updateData((current) => ({
      ...current,
      theme: {
        ...(current.theme || {}),
        [field]: value,
      },
    }));
  };

  const handleSave = useCallback(async (override = {}) => {
    if (!proposal) return null;
    const nextProposal = { ...proposal, ...override };
    setSaving(true);
    try {
      const { data: saved } = await api.put(`/proposals/${proposalId}`, {
        title: nextProposal.title,
        clientName: nextProposal.clientName,
        status: nextProposal.status,
        validUntil: nextProposal.validUntil,
        notes: nextProposal.notes,
        data: nextProposal.data,
      });
      const normalized = { ...saved, data: normalizeProposalData(saved) };
      setProposal(normalized);
      setDirty(false);
      toast.success("Proposta salva");
      return normalized;
    } catch {
      toast.error("Erro ao salvar proposta");
      return null;
    } finally {
      setSaving(false);
    }
  }, [proposal, proposalId]);

  useEffect(() => {
    const handleKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSave]);

  const handlePublish = async () => {
    const saved = await handleSave({ status: "enviada" });
    if (saved) {
      toast.success("Link público liberado");
    }
  };

  const handleCopyLink = async () => {
    if (proposal?.status !== "enviada") {
      toast.info("Publique a proposta para liberar o link");
      return;
    }
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  const handleOpenPublic = () => {
    if (proposal?.status !== "enviada") {
      toast.info("Publique a proposta para abrir o link do cliente");
      return;
    }
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  };

  const addPhase = () => {
    updateData((current) => ({
      ...current,
      phases: [
        ...(current.phases || []),
        {
          id: createProposalId("fase"),
          name: "Nova Fase",
          weeks: "Semana X",
          objective: "Descreva o objetivo desta fase.",
          icon: "🚀",
          color: "#6366f1",
          actions: [],
        },
      ],
    }));
  };

  const updatePhase = (phaseIndex, field, value) => {
    updateData((current) => ({
      ...current,
      phases: (current.phases || []).map((phase, index) => index === phaseIndex ? { ...phase, [field]: value } : phase),
    }));
  };

  const removePhase = (phaseIndex) => {
    updateData((current) => ({
      ...current,
      phases: (current.phases || []).filter((_, index) => index !== phaseIndex),
    }));
  };

  const addAction = (phaseIndex) => {
    updateData((current) => ({
      ...current,
      phases: (current.phases || []).map((phase, index) => index === phaseIndex
        ? {
          ...phase,
          actions: [
            ...(phase.actions || []),
            {
              id: createProposalId("acao"),
              title: "Nova ação",
              time: "3 dias",
              responsible: "Responsável",
              tasks: ["Descreva a tarefa"],
              delivery: "Entrega esperada",
              benefits: [],
            },
          ],
        }
        : phase),
    }));
  };

  const updateAction = (phaseIndex, actionIndex, field, value) => {
    updateData((current) => ({
      ...current,
      phases: (current.phases || []).map((phase, index) => index === phaseIndex
        ? {
          ...phase,
          actions: (phase.actions || []).map((action, i) => i === actionIndex ? { ...action, [field]: value } : action),
        }
        : phase),
    }));
  };

  const removeAction = (phaseIndex, actionIndex) => {
    updateData((current) => ({
      ...current,
      phases: (current.phases || []).map((phase, index) => index === phaseIndex
        ? { ...phase, actions: (phase.actions || []).filter((_, i) => i !== actionIndex) }
        : phase),
    }));
  };

  const updateListItem = (field, index, nextItem) => {
    updateData((current) => ({
      ...current,
      [field]: (current[field] || []).map((item, i) => i === index ? nextItem : item),
    }));
  };

  const removeListItem = (field, index) => {
    updateData((current) => ({
      ...current,
      [field]: (current[field] || []).filter((_, i) => i !== index),
    }));
  };

  const addFooterCard = () => {
    updateTheme("footerCards", [
      ...(theme.footerCards || []),
      { icon: "✨", title: "Novo card", description: "Descreva o próximo passo." },
    ]);
  };

  const renderGeneral = () => (
    <>
      <div className={classes.section}>
        <div className={classes.sectionTitle}>Informações do cliente</div>
        <TextField className={classes.field} label="Título da proposta" variant="outlined" fullWidth size="small" value={proposal.title || ""} onChange={(event) => updateProposal("title", event.target.value)} />
        <TextField className={classes.field} label="Nome do cliente" variant="outlined" fullWidth size="small" value={proposal.clientName || ""} onChange={(event) => { updateProposal("clientName", event.target.value); updateData({ cliente: event.target.value }); }} />
        <TextField className={classes.field} label="Cidade" variant="outlined" fullWidth size="small" value={data.cidade || ""} onChange={(event) => updateData({ cidade: event.target.value })} />
        <div className={classes.row}>
          <TextField className={classes.field} label="Progresso (%)" variant="outlined" type="number" size="small" value={data.progresso_fase || 0} onChange={(event) => updateData({ progresso_fase: Number(event.target.value) })} />
          <TextField className={classes.field} label="Dias do plano" variant="outlined" type="number" size="small" value={data.dias_plano || 126} onChange={(event) => updateData({ dias_plano: Number(event.target.value) })} />
        </div>
        <div className={classes.row}>
          <FormControl variant="outlined" size="small" className={classes.field}>
            <InputLabel>Status</InputLabel>
            <Select value={proposal.status || "rascunho"} onChange={(event) => updateProposal("status", event.target.value)} label="Status">
              {statusOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField className={classes.field} label="Validade" type="date" variant="outlined" size="small" value={proposal.validUntil || ""} onChange={(event) => updateProposal("validUntil", event.target.value)} InputLabelProps={{ shrink: true }} />
        </div>
        <TextField className={classes.field} label="Introdução" variant="outlined" fullWidth multiline rows={4} value={data.introducao || ""} onChange={(event) => updateData({ introducao: event.target.value })} />
        <TextField className={classes.field} label="Observações internas" variant="outlined" fullWidth multiline rows={3} value={proposal.notes || ""} onChange={(event) => updateProposal("notes", event.target.value)} />
      </div>
      <div className={classes.section}>
        <div className={classes.sectionTitle}>Resumo</div>
        <div className={classes.row}>
          <Summary value={(data.phases || []).length} label="Fases" color="#818cf8" />
          <Summary value={(data.phases || []).reduce((acc, phase) => acc + (phase.actions || []).length, 0)} label="Ações" color="#10b981" />
          <Summary value={(data.metodo5s || []).length} label="Método 5S" color="#f59e0b" />
          <Summary value={(data.scripts || []).length} label="Scripts" color="#22d3ee" />
        </div>
      </div>
    </>
  );

  const renderAppearance = () => (
    <>
      <div className={classes.section}>
        <div className={classes.sectionTitle}>Header da proposta</div>
        <div className={classes.row}>
          <TextField className={classes.field} label="Ícone" variant="outlined" size="small" value={theme.headerIcon || ""} onChange={(event) => updateTheme("headerIcon", event.target.value)} />
          <TextField className={classes.field} label="Fonte" variant="outlined" size="small" value={theme.fontFamily || "Inter"} onChange={(event) => updateTheme("fontFamily", event.target.value)} />
        </div>
        <TextField className={classes.field} label="Título principal" variant="outlined" fullWidth size="small" value={theme.headerTitle || ""} onChange={(event) => updateTheme("headerTitle", event.target.value)} />
        <TextField className={classes.field} label="Subtítulo" variant="outlined" fullWidth size="small" value={theme.headerSubtitle || ""} onChange={(event) => updateTheme("headerSubtitle", event.target.value)} />
        <TextField className={classes.field} label="URL do logo" variant="outlined" fullWidth size="small" value={theme.logoUrl || ""} onChange={(event) => updateTheme("logoUrl", event.target.value)} />
      </div>
      <div className={classes.section}>
        <div className={classes.sectionTitle}>Cores do tema</div>
        <div className={classes.row}>
          <div>
            <Typography variant="caption" style={{ color: "#9ca3af" }}>Cor primária</Typography>
            <input className={classes.colorInput} type="color" value={theme.primaryColor || "#3b82f6"} onChange={(event) => updateTheme("primaryColor", event.target.value)} />
          </div>
          <div>
            <Typography variant="caption" style={{ color: "#9ca3af" }}>Cor de destaque</Typography>
            <input className={classes.colorInput} type="color" value={theme.accentColor || "#10b981"} onChange={(event) => updateTheme("accentColor", event.target.value)} />
          </div>
        </div>
      </div>
      <div className={classes.section}>
        <div className={classes.sectionTitle}>Rodapé e visão de futuro</div>
        <TextField className={classes.field} label="Título do rodapé" variant="outlined" fullWidth size="small" value={theme.footerTitle || ""} onChange={(event) => updateTheme("footerTitle", event.target.value)} />
        <TextField className={classes.field} label="Subtítulo" variant="outlined" fullWidth multiline rows={2} value={theme.footerSubtitle || ""} onChange={(event) => updateTheme("footerSubtitle", event.target.value)} />
        {(theme.footerCards || []).map((card, index) => (
          <div className={classes.item} key={`${card.title}-${index}`}>
            <div className={classes.itemHeader}>
              <span className={classes.itemTitle}>Card {index + 1}</span>
              <IconButton size="small" className={classes.iconButton} onClick={() => updateTheme("footerCards", (theme.footerCards || []).filter((_, i) => i !== index))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </div>
            <div className={classes.row}>
              <TextField className={classes.field} label="Ícone" variant="outlined" size="small" value={card.icon || ""} onChange={(event) => updateTheme("footerCards", (theme.footerCards || []).map((item, i) => i === index ? { ...item, icon: event.target.value } : item))} />
              <TextField className={classes.field} label="Título" variant="outlined" size="small" value={card.title || ""} onChange={(event) => updateTheme("footerCards", (theme.footerCards || []).map((item, i) => i === index ? { ...item, title: event.target.value } : item))} />
            </div>
            <TextField className={classes.field} label="Descrição" variant="outlined" fullWidth multiline rows={2} value={card.description || ""} onChange={(event) => updateTheme("footerCards", (theme.footerCards || []).map((item, i) => i === index ? { ...item, description: event.target.value } : item))} />
          </div>
        ))}
        <Button className={classes.buttonGhost} variant="outlined" fullWidth onClick={addFooterCard}>Adicionar card do rodapé</Button>
        <Divider style={{ margin: "14px 0", background: "rgba(255,255,255,0.08)" }} />
        <TextField className={classes.field} label="Citação" variant="outlined" fullWidth size="small" value={theme.footerQuote || ""} onChange={(event) => updateTheme("footerQuote", event.target.value)} />
        <TextField className={classes.field} label="Autor" variant="outlined" fullWidth size="small" value={theme.footerQuoteAuthor || ""} onChange={(event) => updateTheme("footerQuoteAuthor", event.target.value)} />
      </div>
    </>
  );

  const renderPhases = () => (
    <div className={classes.section}>
      <div className={classes.itemHeader}>
        <div className={classes.sectionTitle} style={{ margin: 0 }}>Fases do cronograma</div>
        <Button className={classes.buttonPrimary} size="small" variant="contained" onClick={addPhase}>Adicionar fase</Button>
      </div>
      {(data.phases || []).map((phase, phaseIndex) => (
        <div className={classes.item} key={phase.id || phaseIndex}>
          <div className={classes.itemHeader}>
            <span className={classes.itemTitle}>{phase.icon} {phase.name || `Fase ${phaseIndex + 1}`}</span>
            <IconButton size="small" className={classes.iconButton} onClick={() => removePhase(phaseIndex)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </div>
          <div className={classes.row}>
            <TextField className={classes.field} label="Nome" variant="outlined" size="small" value={phase.name || ""} onChange={(event) => updatePhase(phaseIndex, "name", event.target.value)} />
            <TextField className={classes.field} label="Semanas" variant="outlined" size="small" value={phase.weeks || ""} onChange={(event) => updatePhase(phaseIndex, "weeks", event.target.value)} />
          </div>
          <div className={classes.row}>
            <TextField className={classes.field} label="Ícone" variant="outlined" size="small" value={phase.icon || ""} onChange={(event) => updatePhase(phaseIndex, "icon", event.target.value)} />
            <div>
              <Typography variant="caption" style={{ color: "#9ca3af" }}>Cor da fase</Typography>
              <input className={classes.colorInput} type="color" value={phase.color || "#6366f1"} onChange={(event) => updatePhase(phaseIndex, "color", event.target.value)} />
            </div>
          </div>
          <TextField className={classes.field} label="Objetivo" variant="outlined" fullWidth multiline rows={2} value={phase.objective || ""} onChange={(event) => updatePhase(phaseIndex, "objective", event.target.value)} />
          <TextField className={classes.field} label="Justificativa" variant="outlined" fullWidth multiline rows={2} value={phase.justification || ""} onChange={(event) => updatePhase(phaseIndex, "justification", event.target.value)} />
          {(phase.actions || []).map((action, actionIndex) => (
            <div className={classes.item} key={action.id || actionIndex}>
              <div className={classes.itemHeader}>
                <span className={classes.itemTitle}>Ação {actionIndex + 1}</span>
                <IconButton size="small" className={classes.iconButton} onClick={() => removeAction(phaseIndex, actionIndex)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </div>
              <TextField className={classes.field} label="Título" variant="outlined" fullWidth size="small" value={action.title || ""} onChange={(event) => updateAction(phaseIndex, actionIndex, "title", event.target.value)} />
              <div className={classes.row}>
                <TextField className={classes.field} label="Tempo" variant="outlined" size="small" value={action.time || ""} onChange={(event) => updateAction(phaseIndex, actionIndex, "time", event.target.value)} />
                <TextField className={classes.field} label="Responsável" variant="outlined" size="small" value={action.responsible || ""} onChange={(event) => updateAction(phaseIndex, actionIndex, "responsible", event.target.value)} />
              </div>
              <TextField className={classes.field} label="Entrega" variant="outlined" fullWidth size="small" value={action.delivery || ""} onChange={(event) => updateAction(phaseIndex, actionIndex, "delivery", event.target.value)} />
              <TextField className={classes.field} label="Tarefas (uma por linha)" variant="outlined" fullWidth multiline rows={4} value={joinLines(action.tasks)} onChange={(event) => updateAction(phaseIndex, actionIndex, "tasks", splitLines(event.target.value))} />
              <TextField className={classes.field} label="Benefícios (um por linha)" variant="outlined" fullWidth multiline rows={3} value={joinLines(action.benefits)} onChange={(event) => updateAction(phaseIndex, actionIndex, "benefits", splitLines(event.target.value))} />
            </div>
          ))}
          <Button className={classes.buttonGhost} variant="outlined" size="small" fullWidth onClick={() => addAction(phaseIndex)}>Adicionar ação nesta fase</Button>
        </div>
      ))}
    </div>
  );

  const renderMetodo5s = () => (
    <GenericListSection
      title="Método 5S"
      items={data.metodo5s || []}
      addLabel="Adicionar item 5S"
      onAdd={() => updateData({ metodo5s: [...(data.metodo5s || []), { numero: String((data.metodo5s || []).length + 1), nome: "SEISO", titulo: "Novo S", descricao: "", items: [], color: "#3b82f6" }] })}
      renderItem={(item, index) => (
        <div className={classes.item} key={`${item.numero}-${index}`}>
          <div className={classes.itemHeader}>
            <span className={classes.itemTitle}>{item.numero} - {item.nome}</span>
            <IconButton size="small" className={classes.iconButton} onClick={() => removeListItem("metodo5s", index)}><DeleteIcon fontSize="small" /></IconButton>
          </div>
          <div className={classes.row}>
            <TextField className={classes.field} label="Número" variant="outlined" size="small" value={item.numero || ""} onChange={(event) => updateListItem("metodo5s", index, { ...item, numero: event.target.value })} />
            <TextField className={classes.field} label="Nome" variant="outlined" size="small" value={item.nome || ""} onChange={(event) => updateListItem("metodo5s", index, { ...item, nome: event.target.value })} />
          </div>
          <TextField className={classes.field} label="Título" variant="outlined" fullWidth size="small" value={item.titulo || ""} onChange={(event) => updateListItem("metodo5s", index, { ...item, titulo: event.target.value })} />
          <TextField className={classes.field} label="Descrição" variant="outlined" fullWidth multiline rows={2} value={item.descricao || ""} onChange={(event) => updateListItem("metodo5s", index, { ...item, descricao: event.target.value })} />
          <TextField className={classes.field} label="Itens (um por linha)" variant="outlined" fullWidth multiline rows={3} value={joinLines(item.items)} onChange={(event) => updateListItem("metodo5s", index, { ...item, items: splitLines(event.target.value) })} />
        </div>
      )}
      classes={classes}
    />
  );

  const renderScripts = () => (
    <GenericListSection
      title="Scripts e textos"
      items={data.scripts || []}
      addLabel="Adicionar script"
      onAdd={() => updateData({ scripts: [...(data.scripts || []), { id: createProposalId("script"), icon: "💬", title: "Novo script", text: "" }] })}
      renderItem={(item, index) => (
        <div className={classes.item} key={item.id || index}>
          <div className={classes.itemHeader}>
            <span className={classes.itemTitle}>{item.icon} {item.title}</span>
            <IconButton size="small" className={classes.iconButton} onClick={() => removeListItem("scripts", index)}><DeleteIcon fontSize="small" /></IconButton>
          </div>
          <div className={classes.row}>
            <TextField className={classes.field} label="Ícone" variant="outlined" size="small" value={item.icon || ""} onChange={(event) => updateListItem("scripts", index, { ...item, icon: event.target.value })} />
            <TextField className={classes.field} label="Título" variant="outlined" size="small" value={item.title || ""} onChange={(event) => updateListItem("scripts", index, { ...item, title: event.target.value })} />
          </div>
          <TextField className={classes.field} label="Texto" variant="outlined" fullWidth multiline rows={5} value={item.text || ""} onChange={(event) => updateListItem("scripts", index, { ...item, text: event.target.value })} />
        </div>
      )}
      classes={classes}
    />
  );

  const renderKpis = () => (
    <div className={classes.section}>
      <div className={classes.itemHeader}>
        <div className={classes.sectionTitle} style={{ margin: 0 }}>KPIs de sucesso</div>
        <Button className={classes.buttonPrimary} size="small" variant="contained" onClick={() => updateData({ kpis: [...(data.kpis || []), { id: createProposalId("kpi-cat"), title: "Nova categoria", icon: "📊", items: [] }] })}>Categoria</Button>
      </div>
      {(data.kpis || []).map((category, categoryIndex) => (
        <div className={classes.item} key={category.id || categoryIndex}>
          <div className={classes.itemHeader}>
            <span className={classes.itemTitle}>{category.icon} {category.title}</span>
            <IconButton size="small" className={classes.iconButton} onClick={() => removeListItem("kpis", categoryIndex)}><DeleteIcon fontSize="small" /></IconButton>
          </div>
          <div className={classes.row}>
            <TextField className={classes.field} label="Ícone" variant="outlined" size="small" value={category.icon || ""} onChange={(event) => updateListItem("kpis", categoryIndex, { ...category, icon: event.target.value })} />
            <TextField className={classes.field} label="Título" variant="outlined" size="small" value={category.title || ""} onChange={(event) => updateListItem("kpis", categoryIndex, { ...category, title: event.target.value })} />
          </div>
          {(category.items || []).map((item, itemIndex) => (
            <div className={classes.item} key={item.id || itemIndex}>
              <div className={classes.itemHeader}>
                <span className={classes.itemTitle}>Indicador {itemIndex + 1}</span>
                <IconButton size="small" className={classes.iconButton} onClick={() => updateListItem("kpis", categoryIndex, { ...category, items: (category.items || []).filter((_, i) => i !== itemIndex) })}><DeleteIcon fontSize="small" /></IconButton>
              </div>
              <div className={classes.row}>
                <TextField className={classes.field} label="Ícone" variant="outlined" size="small" value={item.icon || ""} onChange={(event) => updateListItem("kpis", categoryIndex, { ...category, items: category.items.map((kpi, i) => i === itemIndex ? { ...kpi, icon: event.target.value } : kpi) })} />
                <TextField className={classes.field} label="Valor/meta" variant="outlined" size="small" value={item.value || ""} onChange={(event) => updateListItem("kpis", categoryIndex, { ...category, items: category.items.map((kpi, i) => i === itemIndex ? { ...kpi, value: event.target.value } : kpi) })} />
              </div>
              <TextField className={classes.field} label="Indicador" variant="outlined" fullWidth size="small" value={item.label || ""} onChange={(event) => updateListItem("kpis", categoryIndex, { ...category, items: category.items.map((kpi, i) => i === itemIndex ? { ...kpi, label: event.target.value } : kpi) })} />
              <TextField className={classes.field} label="Fonte" variant="outlined" fullWidth size="small" value={item.source || ""} onChange={(event) => updateListItem("kpis", categoryIndex, { ...category, items: category.items.map((kpi, i) => i === itemIndex ? { ...kpi, source: event.target.value } : kpi) })} />
            </div>
          ))}
          <Button className={classes.buttonGhost} variant="outlined" size="small" fullWidth onClick={() => updateListItem("kpis", categoryIndex, { ...category, items: [...(category.items || []), { id: createProposalId("kpi"), icon: "🎯", label: "Novo indicador", value: "0", source: "" }] })}>Adicionar indicador</Button>
        </div>
      ))}
    </div>
  );

  const renderOrcamento = () => (
    <GenericListSection
      title="Orçamento e recursos"
      items={data.orcamento || []}
      addLabel="Adicionar item"
      onAdd={() => updateData({ orcamento: [...(data.orcamento || []), { id: createProposalId("orc"), item: "Novo item", custoMensal: "", custoTotal: "", observacao: "" }] })}
      renderItem={(item, index) => (
        <div className={classes.item} key={item.id || index}>
          <div className={classes.itemHeader}>
            <span className={classes.itemTitle}>{item.item || `Item ${index + 1}`}</span>
            <IconButton size="small" className={classes.iconButton} onClick={() => removeListItem("orcamento", index)}><DeleteIcon fontSize="small" /></IconButton>
          </div>
          <TextField className={classes.field} label="Item" variant="outlined" fullWidth size="small" value={item.item || ""} onChange={(event) => updateListItem("orcamento", index, { ...item, item: event.target.value })} />
          <div className={classes.row}>
            <TextField className={classes.field} label="Custo mensal" variant="outlined" size="small" value={item.custoMensal || ""} onChange={(event) => updateListItem("orcamento", index, { ...item, custoMensal: event.target.value })} />
            <TextField className={classes.field} label="Custo total" variant="outlined" size="small" value={item.custoTotal || ""} onChange={(event) => updateListItem("orcamento", index, { ...item, custoTotal: event.target.value })} />
          </div>
          <TextField className={classes.field} label="Observação" variant="outlined" fullWidth multiline rows={2} value={item.observacao || ""} onChange={(event) => updateListItem("orcamento", index, { ...item, observacao: event.target.value })} />
        </div>
      )}
      classes={classes}
    />
  );

  const renderActiveTab = () => {
    if (activeTab === "appearance") return renderAppearance();
    if (activeTab === "phases") return renderPhases();
    if (activeTab === "metodo5s") return renderMetodo5s();
    if (activeTab === "scripts") return renderScripts();
    if (activeTab === "kpis") return renderKpis();
    if (activeTab === "orcamento") return renderOrcamento();
    return renderGeneral();
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh" }}>
        <CircularProgress />
      </div>
    );
  }

  if (!proposal) return null;

  return (
    <div className={classes.root}>
      <aside className={classes.sidebar}>
        <div className={classes.sidebarHeader}>
          <IconButton className={classes.iconButton} onClick={() => history.push("/propostas")}>
            <ArrowBackIcon />
          </IconButton>
          <div className={classes.headerTitle}>
            <h2>{data.cliente || proposal.clientName || "Nova proposta"}</h2>
            <p>{dirty ? "Alterações não salvas" : "Salvo"}</p>
          </div>
          <Chip
            className={classes.statusChip}
            label={PROPOSAL_STATUS[proposal.status] || proposal.status}
            style={{ color: statusColor, background: `${statusColor}22`, border: `1px solid ${statusColor}44` }}
          />
        </div>

        <div className={classes.tabs}>
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={`${classes.tab} ${activeTab === tab.id ? classes.tabActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className={classes.sidebarBody}>{renderActiveTab()}</div>
      </aside>

      <main className={classes.preview}>
        <div className={classes.previewHeader}>
          <div className={classes.previewUrl}>
            <strong>{window.location.host}</strong>{proposal.slug ? `/propostas/public/${proposal.slug}` : "/propostas/public/..."}
          </div>
          <div className={classes.actionBar}>
            <Tooltip title="Salvar alterações">
              <Button
                className={classes.buttonPrimary}
                variant="contained"
                size="small"
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                onClick={() => handleSave()}
                disabled={saving || !dirty}
              >
                {saving ? "Salvando" : dirty ? "Salvar" : "Salvo"}
              </Button>
            </Tooltip>
            <Button className={classes.buttonGhost} variant="outlined" size="small" startIcon={<PublicIcon />} onClick={handlePublish}>
              Publicar
            </Button>
            <Button className={classes.buttonGhost} variant="outlined" size="small" startIcon={<FileCopyIcon />} onClick={handleCopyLink}>
              Link
            </Button>
            <Button className={classes.buttonGhost} variant="outlined" size="small" startIcon={<LaunchIcon />} onClick={handleOpenPublic}>
              Abrir
            </Button>
          </div>
        </div>
        <div className={classes.previewBody}>
          <ProposalViewer proposal={proposal} data={data} compact />
        </div>
      </main>
    </div>
  );
};

const Summary = ({ value, label, color }) => (
  <div style={{ background: "rgba(255,255,255,0.045)", borderRadius: 10, padding: 14, textAlign: "center" }}>
    <div style={{ color, fontWeight: 900, fontSize: 22 }}>{value}</div>
    <div style={{ color: "#777d98", fontSize: 11 }}>{label}</div>
  </div>
);

const GenericListSection = ({ title, items, addLabel, onAdd, renderItem, classes }) => (
  <div className={classes.section}>
    <div className={classes.itemHeader}>
      <div className={classes.sectionTitle} style={{ margin: 0 }}>{title}</div>
      <Button className={classes.buttonPrimary} size="small" variant="contained" onClick={onAdd}>{addLabel}</Button>
    </div>
    {items.map(renderItem)}
  </div>
);

export default PropostaEditorPage;
