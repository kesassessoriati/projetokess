import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
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
  Grid,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import AutorenewIcon from "@material-ui/icons/Autorenew";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import DescriptionIcon from "@material-ui/icons/Description";
import EditIcon from "@material-ui/icons/Edit";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import PauseCircleOutlineIcon from "@material-ui/icons/PauseCircleOutline";
import PlayCircleOutlineIcon from "@material-ui/icons/PlayCircleOutline";
import SettingsEthernetIcon from "@material-ui/icons/SettingsEthernet";
import StopIcon from "@material-ui/icons/Stop";
import VerifiedUserIcon from "@material-ui/icons/VerifiedUser";
import VisibilityIcon from "@material-ui/icons/Visibility";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(() => ({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 14,
    minHeight: 0
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    alignItems: "center"
  },
  headerLeft: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    flexWrap: "wrap"
  },
  connectionSelect: {
    minWidth: 280,
    backgroundColor: "#fff",
    borderRadius: 12
  },
  headerActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },
  actionButton: {
    borderRadius: 12,
    textTransform: "none",
    fontWeight: 700
  },
  primaryButton: {
    backgroundColor: "#1f9d55",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#15803d"
    }
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12
  },
  statCard: {
    padding: 18,
    borderRadius: 18,
    background: "linear-gradient(180deg, #ffffff 0%, #f6fbf7 100%)",
    border: "1px solid #e2ece4",
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)"
  },
  statLabel: {
    fontSize: "0.78rem",
    color: "#4b5563",
    fontWeight: 700
  },
  statValue: {
    fontSize: "1.8rem",
    color: "#111827",
    fontWeight: 800,
    marginTop: 6
  },
  statFootnote: {
    color: "#6b7280",
    fontSize: "0.8rem",
    marginTop: 8
  },
  sectionTabs: {
    backgroundColor: "#fff",
    borderRadius: 16,
    border: "1px solid #e5ece7",
    padding: 6,
    "& .MuiTabs-indicator": {
      display: "none"
    }
  },
  sectionTab: {
    textTransform: "none",
    fontWeight: 700,
    borderRadius: 10,
    minHeight: 42,
    "&.Mui-selected": {
      backgroundColor: "#1f9d55",
      color: "#fff"
    }
  },
  sectionPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 14
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap"
  },
  panelActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },
  panelCard: {
    borderRadius: 18,
    border: "1px solid #e5ece7",
    backgroundColor: "#fff",
    boxShadow: "0 12px 24px rgba(15,23,42,0.06)",
    padding: 18
  },
  campaignItem: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    padding: "16px 0",
    borderBottom: "1px solid #edf2ee",
    "&:last-child": {
      borderBottom: "none",
      paddingBottom: 0
    }
  },
  campaignMeta: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    color: "#6b7280",
    fontSize: "0.83rem",
    marginTop: 8
  },
  campaignActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
  },
  miniButton: {
    textTransform: "none",
    borderRadius: 10,
    fontWeight: 700
  },
  templateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12
  },
  templateCard: {
    padding: 16,
    borderRadius: 16,
    border: "1px solid #e5ece7",
    backgroundColor: "#fbfdfb",
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  templateMeta: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
  },
  emptyState: {
    padding: 36,
    borderRadius: 18,
    border: "1px dashed #cbd5d1",
    textAlign: "center",
    color: "#6b7280",
    backgroundColor: "#f9fbfa"
  },
  codeBox: {
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
    fontSize: "0.8rem",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    fontFamily: "Consolas, Monaco, monospace"
  },
  dialogPaper: {
    borderRadius: 20
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12
  },
  payloadButton: {
    borderRadius: 12,
    textTransform: "none",
    fontWeight: 700,
    color: "#1d4ed8",
    borderColor: "#bfdbfe"
  },
  dialogSectionTitle: {
    fontSize: "0.9rem",
    fontWeight: 800,
    color: "#1f2937",
    marginBottom: 10
  },
  detailItem: {
    padding: "12px 0",
    borderBottom: "1px solid #edf2ee",
    "&:last-child": {
      borderBottom: "none"
    }
  },
  loadingWrap: {
    display: "flex",
    justifyContent: "center",
    padding: 24
  },
  searchField: {
    minWidth: 260,
    backgroundColor: "#fff",
    borderRadius: 12
  },
  builderButtonCard: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #e2ece4",
    backgroundColor: "#f9fcfa",
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  statusRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center"
  }
}));

const STATUS_COLOR = {
  DRAFT: "default",
  SCHEDULED: "primary",
  RUNNING: "secondary",
  PAUSED: "default",
  COMPLETED: "primary",
  FAILED: "secondary",
  CANCELLED: "default",
  APPROVED: "primary",
  "ACTIVE - QUALITY_PENDING": "primary",
  IN_APPEAL: "primary",
  PENDING: "default",
  PENDING_APPROVAL: "default",
  IN_REVIEW: "default",
  SUBMITTED: "default",
  REJECTED: "secondary",
  DISABLED: "secondary"
};

const APPROVED_TEMPLATE_STATUSES = new Set(["APPROVED", "ACTIVE - QUALITY_PENDING", "IN_APPEAL"]);
const REJECTED_TEMPLATE_STATUSES = new Set(["REJECTED", "PAUSED", "DISABLED"]);
const CATEGORY_OPTIONS = [
  { value: "MARKETING", label: "Marketing" },
  { value: "UTILITY", label: "Utility" },
  { value: "AUTHENTICATION", label: "Authentication" }
];
const LANGUAGE_OPTIONS = [
  { value: "pt_BR", label: "Portugues (Brasil)" },
  { value: "en_US", label: "English (US)" },
  { value: "es_ES", label: "Espanol (Espanha)" }
];
const HEADER_TYPE_OPTIONS = [
  { value: "NONE", label: "Sem cabecalho" },
  { value: "TEXT", label: "Texto" },
  { value: "IMAGE", label: "Imagem" },
  { value: "VIDEO", label: "Video" },
  { value: "DOCUMENT", label: "Documento" }
];
const BUTTON_TYPE_OPTIONS = [
  { value: "QUICK_REPLY", label: "Resposta rapida" },
  { value: "URL", label: "Abrir site" },
  { value: "PHONE_NUMBER", label: "Ligar" }
];

const defaultTemplatePayload = `{
  "name": "promo_abril_2026",
  "language": "pt_BR",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "Olá {{1}}, sua condição especial vence hoje."
    }
  ]
}`;

const createEmptyCampaignForm = () => ({
  name: "",
  contactListId: "",
  officialTemplateId: "",
  intervalSeconds: 4,
  scheduledAt: "",
  previewNumber: "",
  variableMapping: {
    header: {},
    body: {},
    buttons: {},
    headerMediaLink: "",
    headerDocumentFilename: ""
  },
  advancedComponentsText: ""
});

const createEmptyTemplateBuilderForm = () => ({
  name: "",
  language: "pt_BR",
  category: "MARKETING",
  allowCategoryChange: true,
  headerType: "NONE",
  headerText: "",
  headerExample: "",
  headerMediaHandle: "",
  bodyText: "",
  bodyExamples: {},
  footerText: "",
  buttons: []
});

const createEmptyBuilderButton = type => ({
  type: type || "QUICK_REPLY",
  text: "",
  url: "",
  urlExample: "",
  phoneNumber: ""
});

const formatDateTime = value => {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

const countIndexedPlaceholders = value => {
  if (!value) return 0;
  return (String(value).match(/\{\{\d+\}\}/g) || []).length;
};

const sanitizeTemplateName = value =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");

const isApprovedTemplateStatus = status => APPROVED_TEMPLATE_STATUSES.has(String(status || "").toUpperCase());
const isRejectedTemplateStatus = status => REJECTED_TEMPLATE_STATUSES.has(String(status || "").toUpperCase());
const isPendingTemplateStatus = status => {
  if (!status) return true;
  return !isApprovedTemplateStatus(status) && !isRejectedTemplateStatus(status);
};

const getTemplateStatusLabel = status => {
  const normalized = String(status || "PENDING").toUpperCase();

  switch (normalized) {
    case "APPROVED":
      return "Aprovado";
    case "ACTIVE - QUALITY_PENDING":
      return "Aprovado - qualidade pendente";
    case "IN_APPEAL":
      return "Em recurso";
    case "PENDING":
    case "PENDING_APPROVAL":
    case "SUBMITTED":
      return "Aguardando aprovacao";
    case "IN_REVIEW":
      return "Em analise pela Meta";
    case "REJECTED":
      return "Rejeitado";
    case "DISABLED":
      return "Desativado";
    case "PAUSED":
      return "Pausado";
    default:
      return normalized.replace(/_/g, " ");
  }
};

const getTemplateSchema = template => {
  const components = Array.isArray(template?.components) ? template.components : [];
  const header = components.find(item => String(item?.type || "").toUpperCase() === "HEADER") || null;
  const body = components.find(item => String(item?.type || "").toUpperCase() === "BODY") || null;
  const buttonsContainer = components.find(item => String(item?.type || "").toUpperCase() === "BUTTONS") || null;
  const headerFormat = String(header?.format || "").toUpperCase();
  const headerPlaceholders = headerFormat === "TEXT" ? countIndexedPlaceholders(header?.text) : 0;
  const bodyPlaceholders = countIndexedPlaceholders(body?.text);
  const buttonFields = Array.isArray(buttonsContainer?.buttons)
    ? buttonsContainer.buttons
        .map((button, index) => ({
          index,
          type: String(button?.type || "").toUpperCase(),
          dynamic: String(button?.type || "").toUpperCase() === "URL" && /\{\{\d+\}\}/.test(button?.url || ""),
          label: button?.text || `Botão ${index + 1}`
        }))
        .filter(button => button.dynamic)
    : [];

  return {
    headerFormat,
    headerPlaceholders,
    bodyPlaceholders,
    buttonFields
  };
};

const describeTemplateComponents = template => {
  const components = Array.isArray(template?.components) ? template.components : [];
  const summary = [];

  components.forEach(component => {
    const type = String(component?.type || "").toUpperCase();

    if (type === "HEADER") {
      summary.push(`Cabecalho ${String(component?.format || "TEXT").toLowerCase()}`);
    }

    if (type === "BODY") {
      summary.push(`Corpo ${countIndexedPlaceholders(component?.text)} vars`);
    }

    if (type === "FOOTER") {
      summary.push("Rodape");
    }

    if (type === "BUTTONS") {
      summary.push(`${Array.isArray(component?.buttons) ? component.buttons.length : 0} botoes`);
    }
  });

  return summary.length ? summary.join(" • ") : "Sem componentes detalhados";
};

const replacePlaceholders = (value, resolver) =>
  String(value || "").replace(/\{\{(\d+)\}\}/g, (_, token) => resolver(Number(token)));

const buildTemplatePayloadFromBuilder = form => {
  const payload = {
    name: sanitizeTemplateName(form.name),
    language: form.language,
    category: form.category,
    allow_category_change: Boolean(form.allowCategoryChange),
    components: []
  };

  if (form.headerType === "TEXT" && form.headerText.trim()) {
    const headerComponent = {
      type: "HEADER",
      format: "TEXT",
      text: form.headerText.trim()
    };

    if (countIndexedPlaceholders(form.headerText) > 0 && form.headerExample.trim()) {
      headerComponent.example = {
        header_text: [form.headerExample.trim()]
      };
    }

    payload.components.push(headerComponent);
  }

  if (["IMAGE", "VIDEO", "DOCUMENT"].includes(form.headerType)) {
    const headerComponent = {
      type: "HEADER",
      format: form.headerType
    };

    if (form.headerMediaHandle.trim()) {
      headerComponent.example = {
        header_handle: [form.headerMediaHandle.trim()]
      };
    }

    payload.components.push(headerComponent);
  }

  const bodyComponent = {
    type: "BODY",
    text: String(form.bodyText || "").trim()
  };

  if (countIndexedPlaceholders(form.bodyText) > 0) {
    bodyComponent.example = {
      body_text: [
        Array.from({ length: countIndexedPlaceholders(form.bodyText) }).map((_, index) =>
          String(form.bodyExamples?.[String(index + 1)] || `exemplo_${index + 1}`).trim()
        )
      ]
    };
  }

  payload.components.push(bodyComponent);

  if (String(form.footerText || "").trim()) {
    payload.components.push({
      type: "FOOTER",
      text: form.footerText.trim()
    });
  }

  if (form.buttons.length > 0) {
    payload.components.push({
      type: "BUTTONS",
      buttons: form.buttons.map(button => {
        const type = String(button.type || "").toUpperCase();

        if (type === "URL") {
          const buttonPayload = {
            type: "URL",
            text: String(button.text || "").trim(),
            url: String(button.url || "").trim()
          };

          if (countIndexedPlaceholders(button.url) > 0 && String(button.urlExample || "").trim()) {
            buttonPayload.example = [String(button.urlExample || "").trim()];
          }

          return buttonPayload;
        }

        if (type === "PHONE_NUMBER") {
          return {
            type: "PHONE_NUMBER",
            text: String(button.text || "").trim(),
            phone_number: String(button.phoneNumber || "").trim()
          };
        }

        return {
          type: "QUICK_REPLY",
          text: String(button.text || "").trim()
        };
      })
    });
  }

  return payload;
};

const validateTemplateBuilderForm = form => {
  const normalizedName = sanitizeTemplateName(form.name);
  const headerPlaceholders = form.headerType === "TEXT" ? countIndexedPlaceholders(form.headerText) : 0;
  const bodyPlaceholders = countIndexedPlaceholders(form.bodyText);
  const quickReplyCount = form.buttons.filter(button => button.type === "QUICK_REPLY").length;
  const ctaButtons = form.buttons.filter(button => button.type !== "QUICK_REPLY");
  const urlButtons = form.buttons.filter(button => button.type === "URL").length;
  const phoneButtons = form.buttons.filter(button => button.type === "PHONE_NUMBER").length;

  if (!normalizedName) return "Informe o nome interno do template.";
  if (!String(form.bodyText || "").trim()) return "Informe o corpo do template.";
  if (headerPlaceholders > 1) return "O cabecalho de texto aceita no maximo 1 variavel.";
  if (bodyPlaceholders > 13) return "O corpo aceita no maximo 13 variaveis.";
  if (form.headerType === "TEXT" && !String(form.headerText || "").trim()) return "Preencha o texto do cabecalho.";
  if (["IMAGE", "VIDEO", "DOCUMENT"].includes(form.headerType) && !String(form.headerMediaHandle || "").trim()) {
    return "Informe o media handle de exemplo para o cabecalho de midia.";
  }
  if (headerPlaceholders > 0 && !String(form.headerExample || "").trim()) {
    return "Preencha o exemplo do cabecalho para ajudar na aprovacao.";
  }

  for (let index = 1; index <= bodyPlaceholders; index += 1) {
    if (!String(form.bodyExamples?.[String(index)] || "").trim()) {
      return `Preencha o exemplo do corpo {{${index}}}.`;
    }
  }

  if (String(form.footerText || "").match(/\{\{\d+\}\}/)) return "O rodape nao pode ter variaveis.";
  if (quickReplyCount > 0 && ctaButtons.length > 0) return "Nao misture respostas rapidas com botoes CTA.";
  if (quickReplyCount > 3) return "Voce pode usar no maximo 3 respostas rapidas.";
  if (ctaButtons.length > 2) return "Voce pode usar no maximo 2 botoes CTA.";
  if (urlButtons > 2) return "Voce pode usar no maximo 2 botoes de URL.";
  if (phoneButtons > 1) return "Voce pode usar no maximo 1 botao de telefone.";

  for (const button of form.buttons) {
    if (!String(button.text || "").trim()) return "Preencha o texto de todos os botoes.";
    if (button.type === "URL") {
      if (!String(button.url || "").trim()) return "Preencha a URL do botao.";
      if (countIndexedPlaceholders(button.url) > 1) return "Cada botao de URL pode ter no maximo 1 variavel.";
      if (countIndexedPlaceholders(button.url) === 1 && !String(button.urlExample || "").trim()) {
        return "Preencha o exemplo da URL dinamica.";
      }
    }

    if (button.type === "PHONE_NUMBER" && !String(button.phoneNumber || "").trim()) {
      return "Preencha o telefone do botao CTA.";
    }
  }

  return null;
};

const OfficialBroadcastPanel = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [selectedWhatsappId, setSelectedWhatsappId] = useState("");
  const [overview, setOverview] = useState(null);
  const [verification, setVerification] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [contactLists, setContactLists] = useState([]);
  const [sectionTab, setSectionTab] = useState(0);
  const [templateSearch, setTemplateSearch] = useState("");
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignDetailsOpen, setCampaignDetailsOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateBuilderModalOpen, setTemplateBuilderModalOpen] = useState(false);
  const [templateBuilderSubmitting, setTemplateBuilderSubmitting] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewPayload, setPreviewPayload] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [templatePayloadText, setTemplatePayloadText] = useState(defaultTemplatePayload);
  const [campaignForm, setCampaignForm] = useState(createEmptyCampaignForm());
  const [templateBuilderForm, setTemplateBuilderForm] = useState(createEmptyTemplateBuilderForm());

  const selectedTemplate = useMemo(
    () => templates.find(item => Number(item.id) === Number(campaignForm.officialTemplateId)) || null,
    [templates, campaignForm.officialTemplateId]
  );

  const selectedTemplateSchema = useMemo(
    () => getTemplateSchema(selectedTemplate),
    [selectedTemplate]
  );

  const selectedConnection = useMemo(
    () => connections.find(item => Number(item.id) === Number(selectedWhatsappId)) || null,
    [connections, selectedWhatsappId]
  );

  const activeCampaigns = useMemo(
    () => campaigns.filter(item => ["RUNNING", "PAUSED", "SCHEDULED"].includes(item.status)),
    [campaigns]
  );

  const pendingTemplates = useMemo(
    () => templates.filter(item => isPendingTemplateStatus(item.status)),
    [templates]
  );

  const approvedTemplates = useMemo(
    () => templates.filter(item => isApprovedTemplateStatus(item.status)),
    [templates]
  );

  const rejectedTemplates = useMemo(
    () => templates.filter(item => isRejectedTemplateStatus(item.status)),
    [templates]
  );

  const builderPayload = useMemo(
    () => buildTemplatePayloadFromBuilder(templateBuilderForm),
    [templateBuilderForm]
  );

  const builderHeaderPlaceholderCount = useMemo(
    () => (templateBuilderForm.headerType === "TEXT" ? countIndexedPlaceholders(templateBuilderForm.headerText) : 0),
    [templateBuilderForm.headerType, templateBuilderForm.headerText]
  );

  const builderBodyPlaceholderCount = useMemo(
    () => countIndexedPlaceholders(templateBuilderForm.bodyText),
    [templateBuilderForm.bodyText]
  );

  const loadConnections = async () => {
    const { data } = await api.get("/official-dispatch/connections");
    setConnections(data || []);
    if (!selectedWhatsappId && data?.length) {
      setSelectedWhatsappId(String(data[0].id));
    }
    return data;
  };

  const loadContactLists = async () => {
    const { data } = await api.get("/contact-lists/", {
      params: { searchParam: "", pageNumber: 1 }
    });
    setContactLists(Array.isArray(data?.records) ? data.records : []);
  };

  const loadPanelData = async whatsappId => {
    if (!whatsappId) return;
    const [overviewRes, verificationRes, templatesRes, campaignsRes] = await Promise.all([
      api.get("/official-dispatch/overview", { params: { whatsappId } }),
      api.get(`/official-dispatch/connections/${whatsappId}/verification`),
      api.get(`/official-dispatch/connections/${whatsappId}/templates`, {
        params: { searchParam: templateSearch || undefined }
      }),
      api.get("/official-dispatch/campaigns", { params: { whatsappId } })
    ]);

    setOverview(overviewRes.data);
    setVerification(verificationRes.data);
    setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
    setCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : []);
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        setLoading(true);
        const list = await loadConnections();
        await loadContactLists();
        if (active && list?.length) {
          const targetWhatsappId = selectedWhatsappId || String(list[0].id);
          await loadPanelData(targetWhatsappId);
        }
      } catch (error) {
        toastError(error);
      } finally {
        if (active) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedWhatsappId) return;
    loadPanelData(selectedWhatsappId).catch(toastError);
  }, [selectedWhatsappId, templateSearch]);

  useEffect(() => {
    if (!selectedWhatsappId || activeCampaigns.length === 0) return undefined;
    const timer = setInterval(() => {
      loadPanelData(selectedWhatsappId).catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedWhatsappId, activeCampaigns.length]);

  const resetCampaignDialog = () => {
    setEditingCampaign(null);
    setCampaignForm(createEmptyCampaignForm());
    setPreviewPayload(null);
    setCampaignModalOpen(false);
  };

  const resetTemplateBuilderDialog = () => {
    setTemplateBuilderForm(createEmptyTemplateBuilderForm());
    setTemplateBuilderModalOpen(false);
    setTemplateBuilderSubmitting(false);
  };

  const openCreateCampaign = () => {
    setEditingCampaign(null);
    setCampaignForm(createEmptyCampaignForm());
    setPreviewPayload(null);
    setCampaignModalOpen(true);
  };

  const openEditCampaign = campaign => {
    setEditingCampaign(campaign);
    setCampaignForm({
      name: campaign.name || "",
      contactListId: String(campaign.contactListId || ""),
      officialTemplateId: String(campaign.officialTemplateId || ""),
      intervalSeconds: campaign.intervalSeconds || 4,
      scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) : "",
      previewNumber: campaign.previewNumber || "",
      variableMapping: campaign.variableMapping || {
        header: {},
        body: {},
        buttons: {},
        headerMediaLink: "",
        headerDocumentFilename: ""
      },
      advancedComponentsText: campaign.advancedComponents
        ? JSON.stringify(campaign.advancedComponents, null, 2)
        : ""
    });
    setPreviewPayload(null);
    setCampaignModalOpen(true);
  };

  const handleCampaignField = (field, value) => {
    setCampaignForm(prev => ({ ...prev, [field]: value }));
  };

  const handleMappingField = (group, key, value) => {
    setCampaignForm(prev => ({
      ...prev,
      variableMapping: {
        ...(prev.variableMapping || {}),
        [group]: {
          ...(prev.variableMapping?.[group] || {}),
          [key]: value
        }
      }
    }));
  };

  const handleTemplateBuilderField = (field, value) => {
    setTemplateBuilderForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTemplateBuilderBodyExample = (key, value) => {
    setTemplateBuilderForm(prev => ({
      ...prev,
      bodyExamples: {
        ...(prev.bodyExamples || {}),
        [key]: value
      }
    }));
  };

  const handleTemplateButtonField = (index, field, value) => {
    setTemplateBuilderForm(prev => ({
      ...prev,
      buttons: prev.buttons.map((button, buttonIndex) =>
        buttonIndex === index
          ? {
              ...button,
              [field]: value
            }
          : button
      )
    }));
  };

  const handleAddBuilderButton = type => {
    setTemplateBuilderForm(prev => ({
      ...prev,
      buttons: [...prev.buttons, createEmptyBuilderButton(type)]
    }));
  };

  const handleRemoveBuilderButton = index => {
    setTemplateBuilderForm(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, buttonIndex) => buttonIndex !== index)
    }));
  };

  const buildCampaignPayload = () => {
    const advancedComponents = campaignForm.advancedComponentsText
      ? JSON.parse(campaignForm.advancedComponentsText)
      : null;

    return {
      whatsappId: Number(selectedWhatsappId),
      name: campaignForm.name,
      contactListId: Number(campaignForm.contactListId),
      officialTemplateId: campaignForm.officialTemplateId ? Number(campaignForm.officialTemplateId) : null,
      intervalSeconds: Number(campaignForm.intervalSeconds || 4),
      scheduledAt: campaignForm.scheduledAt || null,
      previewNumber: campaignForm.previewNumber || null,
      variableMapping: campaignForm.variableMapping || {},
      advancedComponents
    };
  };

  const handlePreviewPayload = async () => {
    try {
      setPreviewLoading(true);
      const { data } = await api.post("/official-dispatch/campaigns/preview", buildCampaignPayload());
      setPreviewPayload(data);
    } catch (error) {
      toastError(error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveCampaign = async () => {
    try {
      const payload = buildCampaignPayload();

      if (!payload.name || !payload.contactListId || !payload.officialTemplateId) {
        toast.error("Preencha nome, lista de contatos e template oficial.");
        return;
      }

      if (editingCampaign) {
        await api.put(`/official-dispatch/campaigns/${editingCampaign.id}`, payload);
        toast.success("Campanha oficial atualizada.");
      } else {
        await api.post("/official-dispatch/campaigns", payload);
        toast.success("Campanha oficial criada.");
      }

      resetCampaignDialog();
      await loadPanelData(selectedWhatsappId);
    } catch (error) {
      toastError(error);
    }
  };

  const handleCampaignAction = async (campaign, action) => {
    try {
      if (action === "delete") {
        if (!window.confirm(`Excluir a campanha oficial "${campaign.name}"?`)) return;
        await api.delete(`/official-dispatch/campaigns/${campaign.id}`);
        toast.success("Campanha oficial excluída.");
      } else {
        await api.post(`/official-dispatch/campaigns/${campaign.id}/${action}`);
        toast.success("Ação executada com sucesso.");
      }
      await loadPanelData(selectedWhatsappId);
    } catch (error) {
      toastError(error);
    }
  };

  const openCampaignDetails = async campaign => {
    try {
      const { data } = await api.get(`/official-dispatch/campaigns/${campaign.id}`);
      setCampaignDetails(data);
      setCampaignDetailsOpen(true);
    } catch (error) {
      toastError(error);
    }
  };

  const handleSyncTemplates = async () => {
    try {
      await api.post(`/official-dispatch/connections/${selectedWhatsappId}/templates/sync`);
      toast.success("Templates oficiais sincronizados.");
      await loadPanelData(selectedWhatsappId);
    } catch (error) {
      toastError(error);
    }
  };

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplatePayloadText(defaultTemplatePayload);
    setTemplateModalOpen(true);
  };

  const openTemplateBuilder = () => {
    setTemplateBuilderForm(createEmptyTemplateBuilderForm());
    setTemplateBuilderModalOpen(true);
  };

  const openEditTemplate = template => {
    setEditingTemplate(template);
    setTemplatePayloadText(JSON.stringify(template.raw || {}, null, 2));
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      const payload = JSON.parse(templatePayloadText);

      if (editingTemplate) {
        await api.put(
          `/official-dispatch/connections/${selectedWhatsappId}/templates/${editingTemplate.id}`,
          payload
        );
        toast.success("Template oficial atualizado.");
      } else {
        await api.post(`/official-dispatch/connections/${selectedWhatsappId}/templates`, payload);
        toast.success("Template oficial enviado para a Meta.");
      }

      setTemplateModalOpen(false);
      await loadPanelData(selectedWhatsappId);
    } catch (error) {
      toastError(error);
    }
  };

  const handleSubmitBuilderTemplate = async () => {
    try {
      const validationError = validateTemplateBuilderForm(templateBuilderForm);

      if (validationError) {
        toast.error(validationError);
        return;
      }

      setTemplateBuilderSubmitting(true);
      await api.post(`/official-dispatch/connections/${selectedWhatsappId}/templates`, builderPayload);
      toast.success("Template oficial enviado para aprovacao da Meta.");
      setSectionTab(1);
      resetTemplateBuilderDialog();
      await loadPanelData(selectedWhatsappId);
    } catch (error) {
      toastError(error);
    } finally {
      setTemplateBuilderSubmitting(false);
    }
  };

  const handleDeleteTemplate = async template => {
    try {
      if (!window.confirm(`Remover o template "${template.name}" na Meta e no sistema?`)) return;
      await api.delete(`/official-dispatch/connections/${selectedWhatsappId}/templates/${template.id}`);
      toast.success("Template oficial removido.");
      await loadPanelData(selectedWhatsappId);
    } catch (error) {
      toastError(error);
    }
  };

  if (loading) {
    return (
      <Box className={classes.loadingWrap}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!connections.length) {
    return (
      <Box className={classes.emptyState}>
        <Typography variant="h6" gutterBottom>
          Nenhuma conexão oficial configurada
        </Typography>
        <Typography variant="body2">
          Cadastre um canal em <strong>Canais &gt; WhatsApp Oficial</strong> para usar disparos em massa com templates aprovados pela Meta.
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <TextField
            select
            variant="outlined"
            size="small"
            label="Conexão oficial"
            value={selectedWhatsappId}
            onChange={event => setSelectedWhatsappId(event.target.value)}
            className={classes.connectionSelect}
          >
            {connections.map(connection => (
              <MenuItem key={connection.id} value={String(connection.id)}>
                {connection.name} • #{connection.id}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box className={classes.headerActions}>
          <Button
            variant="outlined"
            startIcon={<VerifiedUserIcon />}
            className={classes.actionButton}
            onClick={() => loadPanelData(selectedWhatsappId)}
          >
            Atualizar diagnóstico
          </Button>
          <Button
            variant="outlined"
            startIcon={<AutorenewIcon />}
            className={classes.actionButton}
            onClick={handleSyncTemplates}
          >
            Sincronizar templates
          </Button>
          <Button
            startIcon={<AddIcon />}
            className={`${classes.actionButton} ${classes.primaryButton}`}
            onClick={openCreateCampaign}
          >
            Nova campanha oficial
          </Button>
        </Box>
      </Box>

      <Box className={classes.cardGrid}>
        <Paper className={classes.statCard} elevation={0}>
          <Typography className={classes.statLabel}>Templates aprovados</Typography>
          <Typography className={classes.statValue}>{overview?.templates?.approved || 0}</Typography>
          <Typography className={classes.statFootnote}>
            {overview?.templates?.total || 0} templates sincronizados nesta conexão
          </Typography>
        </Paper>
        <Paper className={classes.statCard} elevation={0}>
          <Typography className={classes.statLabel}>Campanhas oficiais</Typography>
          <Typography className={classes.statValue}>{overview?.campaigns?.total || 0}</Typography>
          <Typography className={classes.statFootnote}>
            {overview?.campaigns?.running || 0} em operação e {overview?.campaigns?.scheduled || 0} agendadas
          </Typography>
        </Paper>
        <Paper className={classes.statCard} elevation={0}>
          <Typography className={classes.statLabel}>Mensagens entregues</Typography>
          <Typography className={classes.statValue}>{overview?.messages?.sent || 0}</Typography>
          <Typography className={classes.statFootnote}>
            {overview?.messages?.deliveryRate || 0}% de taxa de entrega consolidada
          </Typography>
        </Paper>
        <Paper className={classes.statCard} elevation={0}>
          <Typography className={classes.statLabel}>Falhas / bloqueios</Typography>
          <Typography className={classes.statValue}>{overview?.messages?.failed || 0}</Typography>
          <Typography className={classes.statFootnote}>
            Inclui falhas da Graph API, contatos inválidos e duplicidades da base
          </Typography>
        </Paper>
      </Box>

      <Box className={classes.sectionTabs}>
        <Tabs value={sectionTab} onChange={(_, value) => setSectionTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab className={classes.sectionTab} label="Campanhas oficiais" />
          <Tab className={classes.sectionTab} label="Templates oficiais" />
          <Tab className={classes.sectionTab} label="Verificação e API" />
          <Tab className={classes.sectionTab} label="Criar template" />
        </Tabs>
      </Box>

      {sectionTab === 0 && (
        <Box className={classes.sectionPanel}>
          <Paper className={classes.panelCard} elevation={0}>
            {!campaigns.length ? (
              <Box className={classes.emptyState}>
                <Typography variant="h6">Nenhuma campanha oficial criada</Typography>
                <Typography variant="body2">
                  Crie a primeira campanha, selecione um template aprovado e conecte uma lista de contatos para iniciar o disparo.
                </Typography>
              </Box>
            ) : (
              campaigns.map(campaign => (
                <Box key={campaign.id} className={classes.campaignItem}>
                  <Box style={{ flex: 1, minWidth: 260 }}>
                    <Box style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <Typography variant="subtitle1" style={{ fontWeight: 800 }}>
                        {campaign.name}
                      </Typography>
                      <Chip size="small" label={campaign.status} color={STATUS_COLOR[campaign.status] || "default"} />
                    </Box>
                    <Box className={classes.campaignMeta}>
                      <span>Template: {campaign.templateName}</span>
                      <span>Idioma: {campaign.templateLanguage}</span>
                      <span>Lista: {campaign.contactList?.name || "Sem lista"}</span>
                      <span>{campaign.processedTargets || 0}/{campaign.totalTargets || 0} processados</span>
                      <span>{campaign.successCount || 0} enviados</span>
                      <span>{campaign.failedCount || 0} falhas</span>
                      {campaign.scheduledAt && <span>Agendada: {formatDateTime(campaign.scheduledAt)}</span>}
                    </Box>
                  </Box>

                  <Box className={classes.campaignActions}>
                    <Button size="small" variant="outlined" className={classes.miniButton} startIcon={<VisibilityIcon />} onClick={() => openCampaignDetails(campaign)}>
                      Detalhes
                    </Button>
                    {["DRAFT", "SCHEDULED", "FAILED", "COMPLETED", "CANCELLED"].includes(campaign.status) && (
                      <Button size="small" variant="outlined" className={classes.miniButton} startIcon={<PlayCircleOutlineIcon />} onClick={() => handleCampaignAction(campaign, "start")}>
                        Iniciar
                      </Button>
                    )}
                    {campaign.status === "RUNNING" && (
                      <Button size="small" variant="outlined" className={classes.miniButton} startIcon={<PauseCircleOutlineIcon />} onClick={() => handleCampaignAction(campaign, "pause")}>
                        Pausar
                      </Button>
                    )}
                    {campaign.status === "PAUSED" && (
                      <Button size="small" variant="outlined" className={classes.miniButton} startIcon={<PlayCircleOutlineIcon />} onClick={() => handleCampaignAction(campaign, "resume")}>
                        Retomar
                      </Button>
                    )}
                    {["RUNNING", "PAUSED", "SCHEDULED"].includes(campaign.status) && (
                      <Button size="small" variant="outlined" className={classes.miniButton} startIcon={<StopIcon />} onClick={() => handleCampaignAction(campaign, "cancel")}>
                        Cancelar
                      </Button>
                    )}
                    <Button size="small" variant="outlined" className={classes.miniButton} startIcon={<EditIcon />} onClick={() => openEditCampaign(campaign)}>
                      Editar
                    </Button>
                    <Button size="small" variant="outlined" className={classes.miniButton} startIcon={<DeleteOutlineIcon />} onClick={() => handleCampaignAction(campaign, "delete")}>
                      Excluir
                    </Button>
                  </Box>
                </Box>
              ))
            )}
          </Paper>
        </Box>
      )}

      {sectionTab === 1 && (
        <Box className={classes.sectionPanel}>
          <Box className={classes.panelHeader}>
            <TextField
              value={templateSearch}
              onChange={event => setTemplateSearch(event.target.value)}
              size="small"
              variant="outlined"
              label="Buscar template"
              className={classes.searchField}
            />
            <Box className={classes.panelActions}>
              <Button variant="outlined" startIcon={<AddIcon />} className={classes.actionButton} onClick={openTemplateBuilder}>
                Criar no builder
              </Button>
              <Button variant="outlined" startIcon={<DescriptionIcon />} className={classes.actionButton} onClick={openCreateTemplate}>
                Novo template via JSON
              </Button>
            </Box>
          </Box>

          {!templates.length ? (
            <Box className={classes.emptyState}>
              <Typography variant="h6">Nenhum template sincronizado</Typography>
              <Typography variant="body2">
                Clique em <strong>Sincronizar templates</strong> para carregar a biblioteca oficial da Meta nesta conexão.
              </Typography>
            </Box>
          ) : (
            <Box className={classes.templateGrid}>
              {templates.map(template => (
                <Paper key={template.id} className={classes.templateCard} elevation={0}>
                  <Box style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <Box>
                      <Typography variant="subtitle1" style={{ fontWeight: 800 }}>
                        {template.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {template.language} • {template.category || "Sem categoria"}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={getTemplateStatusLabel(template.status)}
                      color={STATUS_COLOR[template.status] || "default"}
                    />
                  </Box>

                  <Box className={classes.statusRow}>
                    <Chip size="small" icon={<FlashOnIcon />} label={`Qualidade: ${template.qualityScore || "n/d"}`} />
                    <Chip size="small" icon={<SettingsEthernetIcon />} label={`ID: ${template.externalTemplateId}`} />
                    {isPendingTemplateStatus(template.status) && (
                      <Chip size="small" label="Fila da Meta" variant="outlined" />
                    )}
                  </Box>

                  <Typography variant="body2" color="textSecondary">
                    {describeTemplateComponents(template)}
                  </Typography>

                  <Box style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button size="small" variant="outlined" className={classes.miniButton} startIcon={<EditIcon />} onClick={() => openEditTemplate(template)}>
                      Editar JSON
                    </Button>
                    <Button size="small" variant="outlined" className={classes.miniButton} startIcon={<DeleteOutlineIcon />} onClick={() => handleDeleteTemplate(template)}>
                      Remover
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      )}

      {sectionTab === 2 && (
        <Box className={classes.sectionPanel}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper className={classes.panelCard} elevation={0}>
                <Typography variant="h6" gutterBottom>Verificação do número</Typography>
                <Box className={classes.detailItem}><strong>Conexão:</strong> {verification?.connection?.name || "-"}</Box>
                <Box className={classes.detailItem}><strong>Phone Number ID:</strong> {verification?.connection?.phoneNumberId || "-"}</Box>
                <Box className={classes.detailItem}><strong>WABA ID:</strong> {verification?.connection?.wabaId || "-"}</Box>
                <Box className={classes.detailItem}><strong>Verified Name:</strong> {verification?.phoneNumber?.verified_name || "-"}</Box>
                <Box className={classes.detailItem}><strong>Display Number:</strong> {verification?.phoneNumber?.display_phone_number || "-"}</Box>
                <Box className={classes.detailItem}><strong>Quality Rating:</strong> {verification?.phoneNumber?.quality_rating || "-"}</Box>
                <Box className={classes.detailItem}><strong>Code Verification:</strong> {verification?.phoneNumber?.code_verification_status || "-"}</Box>
                <Box className={classes.detailItem}><strong>Name Status:</strong> {verification?.phoneNumber?.name_status || "-"}</Box>
                <Box className={classes.detailItem}><strong>Platform:</strong> {verification?.phoneNumber?.platform_type || "-"}</Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper className={classes.panelCard} elevation={0}>
                <Typography variant="h6" gutterBottom>Estado da integração</Typography>
                <Box className={classes.detailItem}><strong>Status local:</strong> {verification?.connection?.status || "-"}</Box>
                <Box className={classes.detailItem}><strong>App conectado:</strong> {String(verification?.coexistenceStatus?.app_connected ?? "-")}</Box>
                <Box className={classes.detailItem}><strong>API conectada:</strong> {String(verification?.coexistenceStatus?.api_connected ?? "-")}</Box>
                <Box className={classes.detailItem}><strong>Última sync:</strong> {verification?.coexistenceStatus?.last_sync || "n/d"}</Box>
                <Box className={classes.detailItem}><strong>Apps inscritas:</strong> {verification?.subscribedApps?.data?.length || 0}</Box>
                <Box className={classes.detailItem}><strong>Telefones da WABA:</strong> {verification?.phoneNumbers?.data?.length || 0}</Box>
              </Paper>
            </Grid>
          </Grid>

          <Paper className={classes.panelCard} elevation={0}>
            <Typography variant="h6" gutterBottom>Perfil comercial oficial</Typography>
            <Box className={classes.codeBox}>{JSON.stringify(verification?.businessProfile || {}, null, 2)}</Box>
          </Paper>

          <Paper className={classes.panelCard} elevation={0}>
            <Typography variant="h6" gutterBottom>Apps inscritas na WABA</Typography>
            <Box className={classes.codeBox}>{JSON.stringify(verification?.subscribedApps || {}, null, 2)}</Box>
          </Paper>
        </Box>
      )}

      {sectionTab === 3 && (
        <Box className={classes.sectionPanel}>
          <Paper className={classes.panelCard} elevation={0}>
            <Box className={classes.panelHeader}>
              <Box style={{ maxWidth: 760 }}>
                <Typography variant="h6" gutterBottom>
                  Builder de templates para aprovacao da Meta
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Monte o template no proprio modulo da API oficial, envie direto para o endpoint oficial da Meta
                  e acompanhe o status pendente ou em analise dentro da biblioteca sincronizada.
                </Typography>
              </Box>

              <Button startIcon={<AddIcon />} className={`${classes.actionButton} ${classes.primaryButton}`} onClick={openTemplateBuilder}>
                Novo template
              </Button>
            </Box>

            <Box className={classes.cardGrid} style={{ marginTop: 18 }}>
              <Paper className={classes.statCard} elevation={0}>
                <Typography className={classes.statLabel}>Conexao ativa</Typography>
                <Typography className={classes.statValue} style={{ fontSize: "1.2rem" }}>
                  {selectedConnection?.name || "-"}
                </Typography>
                <Typography className={classes.statFootnote}>Canal usado para envio e sincronizacao dos templates.</Typography>
              </Paper>
              <Paper className={classes.statCard} elevation={0}>
                <Typography className={classes.statLabel}>Aguardando Meta</Typography>
                <Typography className={classes.statValue}>{pendingTemplates.length}</Typography>
                <Typography className={classes.statFootnote}>Templates enviados e ainda em fila ou revisao.</Typography>
              </Paper>
              <Paper className={classes.statCard} elevation={0}>
                <Typography className={classes.statLabel}>Aprovados</Typography>
                <Typography className={classes.statValue}>{approvedTemplates.length}</Typography>
                <Typography className={classes.statFootnote}>Prontos para uso em campanhas oficiais.</Typography>
              </Paper>
              <Paper className={classes.statCard} elevation={0}>
                <Typography className={classes.statLabel}>Rejeitados / pausados</Typography>
                <Typography className={classes.statValue}>{rejectedTemplates.length}</Typography>
                <Typography className={classes.statFootnote}>Revise a copia antes de reenviar.</Typography>
              </Paper>
            </Box>
          </Paper>

          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Paper className={classes.panelCard} elevation={0}>
                <Typography variant="h6" gutterBottom>Como funciona</Typography>
                <Box component="ul" style={{ margin: 0, paddingLeft: 18, color: "#4b5563", display: "grid", gap: 8 }}>
                  <li>Defina nome interno, idioma e categoria.</li>
                  <li>Monte cabecalho, corpo, rodape e botoes em um fluxo guiado.</li>
                  <li>Preencha exemplos das variaveis para facilitar a revisao da Meta.</li>
                  <li>Depois do envio, o template aparece na aba de templates com status de aprovacao.</li>
                </Box>

                <Divider style={{ margin: "18px 0" }} />
                <Typography variant="h6" gutterBottom>Boas praticas</Typography>
                <Box component="ul" style={{ margin: 0, paddingLeft: 18, color: "#4b5563", display: "grid", gap: 8 }}>
                  <li>Use nome em minusculo com underscore, por exemplo: cobranca_vencimento.</li>
                  <li>Cabecalho de texto aceita no maximo 1 variavel e o corpo aceita ate 13.</li>
                  <li>O rodape nao deve ter variaveis.</li>
                  <li>Nao misture respostas rapidas com botoes CTA.</li>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={5}>
              <Paper className={classes.panelCard} elevation={0}>
                <Typography variant="h6" gutterBottom>Fila recente</Typography>
                {!pendingTemplates.length ? (
                  <Box className={classes.emptyState} style={{ padding: 20 }}>
                    Nenhum template aguardando aprovacao nesta conexao.
                  </Box>
                ) : (
                  pendingTemplates.slice(0, 5).map(template => (
                    <Box key={template.id} className={classes.detailItem}>
                      <Box style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <Box>
                          <Typography style={{ fontWeight: 800 }}>{template.name}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {template.language} • {template.category || "Sem categoria"}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={getTemplateStatusLabel(template.status)}
                          color={STATUS_COLOR[template.status] || "default"}
                        />
                      </Box>
                    </Box>
                  ))
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      <Dialog open={campaignModalOpen} onClose={resetCampaignDialog} maxWidth="md" fullWidth classes={{ paper: classes.dialogPaper }}>
        <DialogTitle>{editingCampaign ? "Editar campanha oficial" : "Nova campanha oficial"}</DialogTitle>
        <DialogContent dividers>
          <Box className={classes.fieldGrid}>
            <TextField label="Nome da campanha" variant="outlined" size="small" value={campaignForm.name} onChange={event => handleCampaignField("name", event.target.value)} />
            <TextField select label="Lista de contatos" variant="outlined" size="small" value={campaignForm.contactListId} onChange={event => handleCampaignField("contactListId", event.target.value)}>
              {contactLists.map(list => <MenuItem key={list.id} value={String(list.id)}>{list.name}</MenuItem>)}
            </TextField>
            <TextField select label="Template oficial" variant="outlined" size="small" value={campaignForm.officialTemplateId} onChange={event => handleCampaignField("officialTemplateId", event.target.value)}>
              {templates.map(template => <MenuItem key={template.id} value={String(template.id)}>{template.name} • {template.language}</MenuItem>)}
            </TextField>
            <TextField label="Intervalo entre envios (s)" type="number" variant="outlined" size="small" value={campaignForm.intervalSeconds} onChange={event => handleCampaignField("intervalSeconds", event.target.value)} />
            <TextField label="Agendar para" type="datetime-local" variant="outlined" size="small" value={campaignForm.scheduledAt} onChange={event => handleCampaignField("scheduledAt", event.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Número de preview" variant="outlined" size="small" value={campaignForm.previewNumber} onChange={event => handleCampaignField("previewNumber", event.target.value)} helperText="Opcional. Se vazio, usamos o primeiro contato da lista." />
          </Box>

          <Divider style={{ margin: "18px 0" }} />
          <Typography className={classes.dialogSectionTitle}>Parâmetros automáticos do template</Typography>
          {selectedTemplate ? (
            <Box className={classes.fieldGrid}>
              {Array.from({ length: selectedTemplateSchema.headerPlaceholders }).map((_, index) => (
                <TextField key={`header-${index}`} label={`Cabeçalho {{${index + 1}}}`} variant="outlined" size="small" value={campaignForm.variableMapping?.header?.[String(index + 1)] || ""} onChange={event => handleMappingField("header", String(index + 1), event.target.value)} helperText="Ex.: {{name}}, {{firstName}}, texto fixo" />
              ))}
              {Array.from({ length: selectedTemplateSchema.bodyPlaceholders }).map((_, index) => (
                <TextField key={`body-${index}`} label={`Corpo {{${index + 1}}}`} variant="outlined" size="small" value={campaignForm.variableMapping?.body?.[String(index + 1)] || ""} onChange={event => handleMappingField("body", String(index + 1), event.target.value)} helperText="Ex.: {{name}}, {{number}}, texto fixo" />
              ))}
              {["IMAGE", "VIDEO", "DOCUMENT"].includes(selectedTemplateSchema.headerFormat) && (
                <TextField label={`Link da mídia do cabeçalho (${selectedTemplateSchema.headerFormat})`} variant="outlined" size="small" value={campaignForm.variableMapping?.headerMediaLink || ""} onChange={event => setCampaignForm(prev => ({ ...prev, variableMapping: { ...(prev.variableMapping || {}), headerMediaLink: event.target.value } }))} />
              )}
              {selectedTemplateSchema.headerFormat === "DOCUMENT" && (
                <TextField label="Nome do arquivo do documento" variant="outlined" size="small" value={campaignForm.variableMapping?.headerDocumentFilename || ""} onChange={event => setCampaignForm(prev => ({ ...prev, variableMapping: { ...(prev.variableMapping || {}), headerDocumentFilename: event.target.value } }))} />
              )}
              {selectedTemplateSchema.buttonFields.map(button => (
                <TextField key={`button-${button.index}`} label={`Botão URL ${button.index + 1}`} variant="outlined" size="small" value={campaignForm.variableMapping?.buttons?.[String(button.index)] || ""} onChange={event => handleMappingField("buttons", String(button.index), event.target.value)} helperText={`${button.label} • valor dinâmico do sufixo da URL`} />
              ))}
            </Box>
          ) : (
            <Box className={classes.emptyState}>Selecione um template oficial para configurar os parâmetros dinâmicos.</Box>
          )}

          <Divider style={{ margin: "18px 0" }} />
          <Typography className={classes.dialogSectionTitle}>Componentes avançados da API oficial</Typography>
          <TextField label="advancedComponents (JSON opcional)" variant="outlined" fullWidth multiline minRows={8} value={campaignForm.advancedComponentsText} onChange={event => handleCampaignField("advancedComponentsText", event.target.value)} helperText="Quando preenchido, esse JSON substitui os componentes gerados automaticamente. Você pode usar tokens como {{name}}, {{firstName}}, {{number}} e {{email}}." />

          <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 12, flexWrap: "wrap" }}>
            <Button variant="outlined" className={classes.payloadButton} onClick={handlePreviewPayload} disabled={previewLoading}>
              {previewLoading ? "Gerando preview..." : "Visualizar payload final"}
            </Button>
            {selectedTemplate && <Chip icon={<DescriptionIcon />} label={`${selectedTemplate.name} • ${selectedTemplate.language}`} variant="outlined" />}
          </Box>

          {previewPayload && (
            <Box style={{ marginTop: 16 }}>
              <Typography className={classes.dialogSectionTitle}>Preview resolvido</Typography>
              <Box className={classes.codeBox}>{JSON.stringify(previewPayload, null, 2)}</Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={resetCampaignDialog} className={classes.actionButton}>Fechar</Button>
          <Button onClick={handleSaveCampaign} className={`${classes.actionButton} ${classes.primaryButton}`}>Salvar campanha</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} maxWidth="md" fullWidth classes={{ paper: classes.dialogPaper }}>
        <DialogTitle>{editingTemplate ? "Editar template oficial" : "Novo template oficial via JSON"}</DialogTitle>
        <DialogContent dividers>
          <TextField label="Payload JSON da Graph API" variant="outlined" fullWidth multiline minRows={16} value={templatePayloadText} onChange={event => setTemplatePayloadText(event.target.value)} helperText="Cole o payload oficial do endpoint de templates da Meta. Após salvar, o módulo sincroniza novamente a biblioteca." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateModalOpen(false)} className={classes.actionButton}>Fechar</Button>
          <Button onClick={handleSaveTemplate} className={`${classes.actionButton} ${classes.primaryButton}`}>Salvar template</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={templateBuilderModalOpen} onClose={resetTemplateBuilderDialog} maxWidth="lg" fullWidth classes={{ paper: classes.dialogPaper }}>
        <DialogTitle>Criar template e enviar para aprovacao da Meta</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Box className={classes.sectionPanel}>
                <Box>
                  <Typography className={classes.dialogSectionTitle}>Identificacao</Typography>
                  <Box className={classes.fieldGrid}>
                    <TextField label="Nome interno" variant="outlined" size="small" value={templateBuilderForm.name} onChange={event => handleTemplateBuilderField("name", event.target.value)} onBlur={event => handleTemplateBuilderField("name", sanitizeTemplateName(event.target.value))} helperText="Use minusculo, numeros e underscore." />
                    <TextField select label="Idioma" variant="outlined" size="small" value={templateBuilderForm.language} onChange={event => handleTemplateBuilderField("language", event.target.value)}>
                      {LANGUAGE_OPTIONS.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                    </TextField>
                    <TextField select label="Categoria" variant="outlined" size="small" value={templateBuilderForm.category} onChange={event => handleTemplateBuilderField("category", event.target.value)}>
                      {CATEGORY_OPTIONS.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                    </TextField>
                    <TextField select label="Permitir ajuste de categoria" variant="outlined" size="small" value={String(templateBuilderForm.allowCategoryChange)} onChange={event => handleTemplateBuilderField("allowCategoryChange", event.target.value === "true")}>
                      <MenuItem value="true">Sim</MenuItem>
                      <MenuItem value="false">Nao</MenuItem>
                    </TextField>
                  </Box>
                </Box>

                <Box>
                  <Typography className={classes.dialogSectionTitle}>Conteudo</Typography>
                  <Box className={classes.fieldGrid}>
                    <TextField select label="Tipo de cabecalho" variant="outlined" size="small" value={templateBuilderForm.headerType} onChange={event => handleTemplateBuilderField("headerType", event.target.value)}>
                      {HEADER_TYPE_OPTIONS.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                    </TextField>
                    {templateBuilderForm.headerType === "TEXT" && (
                      <TextField label="Texto do cabecalho" variant="outlined" size="small" value={templateBuilderForm.headerText} onChange={event => handleTemplateBuilderField("headerText", event.target.value)} helperText="No maximo 1 variavel." />
                    )}
                    {["IMAGE", "VIDEO", "DOCUMENT"].includes(templateBuilderForm.headerType) && (
                      <TextField label="Media handle de exemplo" variant="outlined" size="small" value={templateBuilderForm.headerMediaHandle} onChange={event => handleTemplateBuilderField("headerMediaHandle", event.target.value)} helperText="Handle oficial usado pela Meta na revisao." />
                    )}
                  </Box>
                  <Box style={{ marginTop: 12 }}>
                    <TextField label="Corpo da mensagem" variant="outlined" fullWidth multiline minRows={5} value={templateBuilderForm.bodyText} onChange={event => handleTemplateBuilderField("bodyText", event.target.value)} helperText="Use variaveis como {{1}} e {{2}}." />
                  </Box>
                  <Box style={{ marginTop: 12 }}>
                    <TextField label="Rodape" variant="outlined" fullWidth size="small" value={templateBuilderForm.footerText} onChange={event => handleTemplateBuilderField("footerText", event.target.value)} helperText="Opcional. Nao use variaveis no rodape." />
                  </Box>
                </Box>

                <Box>
                  <Typography className={classes.dialogSectionTitle}>Exemplos para aprovacao</Typography>
                  <Box className={classes.fieldGrid}>
                    {builderHeaderPlaceholderCount > 0 && (
                      <TextField label="Exemplo do cabecalho {{1}}" variant="outlined" size="small" value={templateBuilderForm.headerExample} onChange={event => handleTemplateBuilderField("headerExample", event.target.value)} />
                    )}
                    {Array.from({ length: builderBodyPlaceholderCount }).map((_, index) => (
                      <TextField key={`body-example-${index + 1}`} label={`Exemplo do corpo {{${index + 1}}}`} variant="outlined" size="small" value={templateBuilderForm.bodyExamples?.[String(index + 1)] || ""} onChange={event => handleTemplateBuilderBodyExample(String(index + 1), event.target.value)} />
                    ))}
                    {!builderHeaderPlaceholderCount && !builderBodyPlaceholderCount && (
                      <Box className={classes.emptyState} style={{ padding: 20, gridColumn: "1 / -1" }}>
                        Adicione variaveis no cabecalho ou no corpo para liberar os exemplos.
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box>
                  <Box className={classes.panelHeader}>
                    <Typography className={classes.dialogSectionTitle}>Botoes</Typography>
                    <Box className={classes.panelActions}>
                      <Button size="small" variant="outlined" className={classes.miniButton} onClick={() => handleAddBuilderButton("QUICK_REPLY")}>+ Resposta rapida</Button>
                      <Button size="small" variant="outlined" className={classes.miniButton} onClick={() => handleAddBuilderButton("URL")}>+ URL</Button>
                      <Button size="small" variant="outlined" className={classes.miniButton} onClick={() => handleAddBuilderButton("PHONE_NUMBER")}>+ Telefone</Button>
                    </Box>
                  </Box>

                  {!templateBuilderForm.buttons.length ? (
                    <Box className={classes.emptyState} style={{ padding: 20 }}>
                      Nenhum botao configurado. Eles sao opcionais.
                    </Box>
                  ) : (
                    <Box style={{ display: "grid", gap: 10 }}>
                      {templateBuilderForm.buttons.map((button, index) => (
                        <Box key={`builder-button-${index}`} className={classes.builderButtonCard}>
                          <Box className={classes.fieldGrid}>
                            <TextField select label={`Tipo do botao ${index + 1}`} variant="outlined" size="small" value={button.type} onChange={event => handleTemplateButtonField(index, "type", event.target.value)}>
                              {BUTTON_TYPE_OPTIONS.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                            </TextField>
                            <TextField label="Texto do botao" variant="outlined" size="small" value={button.text} onChange={event => handleTemplateButtonField(index, "text", event.target.value)} />
                            {button.type === "URL" && (
                              <TextField label="URL" variant="outlined" size="small" value={button.url} onChange={event => handleTemplateButtonField(index, "url", event.target.value)} helperText="Pode usar no maximo 1 variavel." />
                            )}
                            {button.type === "URL" && countIndexedPlaceholders(button.url) > 0 && (
                              <TextField label="Exemplo da URL dinamica" variant="outlined" size="small" value={button.urlExample} onChange={event => handleTemplateButtonField(index, "urlExample", event.target.value)} />
                            )}
                            {button.type === "PHONE_NUMBER" && (
                              <TextField label="Numero do telefone" variant="outlined" size="small" value={button.phoneNumber} onChange={event => handleTemplateButtonField(index, "phoneNumber", event.target.value)} helperText="Ex.: +5511999999999" />
                            )}
                          </Box>
                          <Box style={{ display: "flex", justifyContent: "flex-end" }}>
                            <Button size="small" variant="outlined" className={classes.miniButton} onClick={() => handleRemoveBuilderButton(index)}>Remover botao</Button>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={5}>
              <Box style={{ display: "grid", gap: 14 }}>
                <Paper className={classes.panelCard} elevation={0}>
                  <Typography className={classes.dialogSectionTitle}>Preview rapido</Typography>
                  <Box style={{ borderRadius: 18, background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)", padding: 14 }}>
                    <Box style={{ borderRadius: 16, backgroundColor: "#eef8f1", padding: 14 }}>
                      <Box style={{ backgroundColor: "#fff", borderRadius: "16px 16px 16px 6px", padding: 14, boxShadow: "0 8px 18px rgba(15,23,42,0.08)" }}>
                        {templateBuilderForm.headerType !== "NONE" && (
                          <Typography style={{ fontWeight: 800, marginBottom: 8 }}>
                            {templateBuilderForm.headerType === "TEXT"
                              ? replacePlaceholders(templateBuilderForm.headerText, index => templateBuilderForm.headerExample || `valor ${index}`)
                              : `${templateBuilderForm.headerType.toLowerCase()} de exemplo`}
                          </Typography>
                        )}
                        <Typography style={{ whiteSpace: "pre-wrap", color: "#111827" }}>
                          {replacePlaceholders(templateBuilderForm.bodyText, index => templateBuilderForm.bodyExamples?.[String(index)] || `valor ${index}`) || "Seu texto aparecera aqui..."}
                        </Typography>
                        {templateBuilderForm.footerText && (
                          <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                            {templateBuilderForm.footerText}
                          </Typography>
                        )}
                        {!!templateBuilderForm.buttons.length && (
                          <Box style={{ display: "grid", gap: 8, marginTop: 12 }}>
                            {templateBuilderForm.buttons.map((button, index) => (
                              <Box key={`preview-${index}`} style={{ border: "1px solid #d8e7db", borderRadius: 12, padding: "10px 12px", backgroundColor: "#f7fbf8" }}>
                                <Typography style={{ fontWeight: 700 }}>{button.text || `Botao ${index + 1}`}</Typography>
                                {button.type === "URL" && button.url && (
                                  <Typography variant="caption" color="textSecondary">
                                    {replacePlaceholders(button.url, () => button.urlExample || "parametro")}
                                  </Typography>
                                )}
                                {button.type === "PHONE_NUMBER" && button.phoneNumber && (
                                  <Typography variant="caption" color="textSecondary">{button.phoneNumber}</Typography>
                                )}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Paper>

                <Paper className={classes.panelCard} elevation={0}>
                  <Typography className={classes.dialogSectionTitle}>Checklist</Typography>
                  <Box className={classes.statusRow}>
                    <Chip size="small" label={`${builderHeaderPlaceholderCount} vars no cabecalho`} />
                    <Chip size="small" label={`${builderBodyPlaceholderCount} vars no corpo`} />
                    <Chip size="small" label={`${templateBuilderForm.buttons.length} botoes`} />
                  </Box>
                  <Typography variant="body2" color="textSecondary" style={{ marginTop: 12 }}>
                    Nome final: <strong>{sanitizeTemplateName(templateBuilderForm.name) || "sem_nome"}</strong>
                  </Typography>
                </Paper>

                <Paper className={classes.panelCard} elevation={0}>
                  <Typography className={classes.dialogSectionTitle}>Payload oficial</Typography>
                  <Box className={classes.codeBox}>{JSON.stringify(builderPayload, null, 2)}</Box>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetTemplateBuilderDialog} className={classes.actionButton}>Fechar</Button>
          <Button onClick={handleSubmitBuilderTemplate} disabled={templateBuilderSubmitting} className={`${classes.actionButton} ${classes.primaryButton}`}>
            {templateBuilderSubmitting ? "Enviando..." : "Enviar para aprovacao"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={campaignDetailsOpen} onClose={() => setCampaignDetailsOpen(false)} maxWidth="md" fullWidth classes={{ paper: classes.dialogPaper }}>
        <DialogTitle>Detalhes da campanha oficial</DialogTitle>
        <DialogContent dividers>
          {!campaignDetails ? (
            <Box className={classes.loadingWrap}><CircularProgress size={26} /></Box>
          ) : (
            <>
              <Box className={classes.fieldGrid}>
                <Paper className={classes.statCard} elevation={0}>
                  <Typography className={classes.statLabel}>Template</Typography>
                  <Typography className={classes.statValue} style={{ fontSize: "1.2rem" }}>{campaignDetails.templateName}</Typography>
                  <Typography className={classes.statFootnote}>{campaignDetails.templateLanguage}</Typography>
                </Paper>
                <Paper className={classes.statCard} elevation={0}>
                  <Typography className={classes.statLabel}>Processamento</Typography>
                  <Typography className={classes.statValue} style={{ fontSize: "1.2rem" }}>{campaignDetails.processedTargets}/{campaignDetails.totalTargets}</Typography>
                  <Typography className={classes.statFootnote}>{campaignDetails.successCount} enviados • {campaignDetails.failedCount} falhas</Typography>
                </Paper>
              </Box>

              <Box style={{ marginTop: 16 }}>
                <Typography className={classes.dialogSectionTitle}>Últimos disparos por contato</Typography>
                {!campaignDetails.shippings?.length ? (
                  <Box className={classes.emptyState}>Nenhum disparo gerado ainda.</Box>
                ) : (
                  campaignDetails.shippings.map(item => (
                    <Box key={item.id} className={classes.detailItem}>
                      <Box style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <Box>
                          <Typography style={{ fontWeight: 700 }}>{item.contactName || item.contact?.name || item.number || "Contato"}</Typography>
                          <Typography variant="body2" color="textSecondary">{item.number || "Sem número"} • {item.contact?.email || "sem email"}</Typography>
                          {item.errorMessage && <Typography variant="body2" style={{ color: "#b91c1c", marginTop: 4 }}>{item.errorMessage}</Typography>}
                        </Box>
                        <Box style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <Chip size="small" label={item.status} color={STATUS_COLOR[item.status] || "default"} />
                          <Typography variant="body2" color="textSecondary">{formatDateTime(item.sentAt || item.failedAt || item.updatedAt)}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignDetailsOpen(false)} className={classes.actionButton}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfficialBroadcastPanel;
