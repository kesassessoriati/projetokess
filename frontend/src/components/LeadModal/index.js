import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Grid,
  MenuItem,
  makeStyles,
  CircularProgress,
  Typography,
  Divider,
  FormControlLabel,
  Switch,
} from "@material-ui/core";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { LEAD_STATUS } from "../../constants/leadStatus";
import Autocomplete, {
  createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import DigitalPresenceLinkAdornment from "../DigitalPresenceLinkAdornment";

const filter = createFilterOptions();

const normalizeDigits = (value = "") => String(value || "").replace(/\D/g, "");

const formatDocument = (value = "") => {
  const digits = normalizeDigits(value).slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const normalizeLeadForm = (lead = {}) => {
  const sourceLead = lead.lead || lead;
  const sourceContact = lead.contact || {};
  const rawDocument = sourceLead.document || sourceLead.cnpj || lead.document || lead.cnpj || "";
  const contactTags = Array.isArray(sourceLead.contact?.tags)
    ? sourceLead.contact.tags
    : Array.isArray(sourceContact.tags)
      ? sourceContact.tags
      : [];

  return {
    ...defaultForm,
    ...sourceLead,
    name:
      sourceLead.name ||
      lead.contactName ||
      sourceContact.name ||
      lead.title ||
      "",
    companyName: sourceLead.companyName || lead.companyName || "",
    email: sourceLead.email || lead.email || sourceContact.email || "",
    phone:
      sourceLead.phone ||
      lead.phone ||
      sourceContact.number ||
      sourceContact.phone ||
      "",
    document: formatDocument(rawDocument),
    address: sourceLead.address || "",
    product: sourceLead.product || "",
    paymentType: sourceLead.paymentType || "",
    purchaseType: sourceLead.purchaseType || "",
    purchaseValue: sourceLead.purchaseValue != null ? sourceLead.purchaseValue : "",
    birthDate: sourceLead.birthDate ? sourceLead.birthDate.substring(0, 10) : "",
    clientSince: sourceLead.clientSince ? sourceLead.clientSince.substring(0, 10) : "",
    acquisitionDate: sourceLead.acquisitionDate
      ? sourceLead.acquisitionDate.substring(0, 10)
      : "",
    expirationDate: sourceLead.expirationDate
      ? sourceLead.expirationDate.substring(0, 10)
      : "",
    score: sourceLead.score || 0,
    status: sourceLead.status || sourceLead.leadStatus || "novo",
    tags: Array.isArray(sourceLead.tags) ? sourceLead.tags : [],
    contactTags,
    cardColor: sourceLead.cardColor || sourceLead.card_color || "#FFFFFF",
    customFields: sourceLead.customFields || {},
    sessionid: sourceLead.sessionid || "",
  };
};

const useStyles = makeStyles((theme) => ({
  dialogTitle: {
    fontWeight: 600,
  },
  formField: {
    marginBottom: theme.spacing(2),
  },
  dialogActions: {
    justifyContent: "space-between",
    padding: theme.spacing(2, 3),
  },
  sectionTitle: {
    fontWeight: 600,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    width: "100%",
    color: theme.palette.primary.main,
  },
  highlightedField: {
    padding: theme.spacing(2),
    borderRadius: 16,
    border: `1px solid ${theme.palette.divider}`,
    background:
      theme.palette.type === "light"
        ? "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(16,185,129,0.05))"
        : theme.palette.background.default,
  },
  highlightedLabel: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(1),
  },
  closeButton: {
    color: "#fff",
    backgroundColor: theme.palette.error.main,
    "&:hover": {
      backgroundColor: theme.palette.error.dark,
    },
  },
  helperNote: {
    marginTop: -theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: 12,
  },
}));

const TEMPERATURE_OPTIONS = ["frio", "morno", "quente"];

// Função para extrair parâmetros UTM da URL
const getUTMParameters = () => {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmTerm = params.get("utm_term");
  const utmContent = params.get("utm_content");

  if (utmSource || utmMedium || utmCampaign) {
    const utmParams = [];
    if (utmSource) utmParams.push(`source: ${utmSource}`);
    if (utmMedium) utmParams.push(`medium: ${utmMedium}`);
    if (utmCampaign) utmParams.push(`campaign: ${utmCampaign}`);
    if (utmTerm) utmParams.push(`term: ${utmTerm}`);
    if (utmContent) utmParams.push(`content: ${utmContent}`);

    return {
      source: `UTM: ${utmParams.join(" | ")}`,
      campaign: utmCampaign || "",
    };
  }

  return { source: "", campaign: "" };
};

const PURCHASE_TYPE_OPTIONS = [
  { value: "novo", label: "Novo" },
  { value: "migracao", label: "Migração" },
  { value: "renovacao", label: "Renovação" },
  { value: "recuperacao_novo", label: "Recuperação Novo" },
];

const defaultForm = {
  name: "",
  companyName: "",
  decisionMakerName: "",
  email: "",
  phone: "",
  decisionMakerPhone: "",
  document: "",
  address: "",
  product: "",
  paymentType: "",
  purchaseType: "",
  purchaseValue: "",
  acquisitionDate: "",
  gmn: "",
  website: "",
  instagram: "",
  linkedin: "",
  sessionid: "",
  birthDate: "",
  clientSince: "",
  expirationDate: "",
  position: "",
  source: "",
  campaign: "",
  status: "novo",
  pipelineId: "",
  stageId: "",
  temperature: "",
  score: 0,
  ownerUserId: "",
  notes: "",
  tags: [],
  contactTags: [],
  cardColor: "#FFFFFF",
  customFields: {},
};

const LeadModal = ({
  open,
  onClose,
  leadId,
  onSuccess,
  isEmbedded = false,
  leadData = null,
  contactId = null,
  cardColor,
}) => {
  const classes = useStyles();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState([]);
  const [tags, setTags] = useState([]);
  const [products, setProducts] = useState([]);
  const [leadFields, setLeadFields] = useState([]);
  const resolvedLeadId = leadId || leadData?.id || leadData?.leadId || leadData?.lead?.id || null;
  const hasInitialLeadData = Boolean(leadData);
  const leadDataKey = resolvedLeadId || [
    leadData?.name,
    leadData?.phone,
    leadData?.pipelineId,
    leadData?.stageId,
  ].join("|");

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        const [
          { data: usersData },
          { data: pipelinesData },
          { data: tagsData },
          { data: productsData },
          { data: leadFieldsData },
        ] = await Promise.all([
          api.get("/users/"),
          api.get("/pipelines"),
          api.get("/tags/list"),
          api.get("/produtos", { params: { limit: 100 } }),
          api.get("/crm/lead-field-settings"),
        ]);
        setUsers(usersData.users || []);
        setPipelines(pipelinesData || []);
        setTags(tagsData || []);
        setProducts(
          Array.isArray(productsData?.produtos)
            ? productsData.produtos
            : Array.isArray(productsData)
              ? productsData
              : [],
        );
        setLeadFields(leadFieldsData?.fields || []);
      } catch (err) {
        toastError(err);
      }
    };

    fetchData();

    if (leadData) {
      setForm(normalizeLeadForm(leadData));
    }

    if (resolvedLeadId) {
      loadLead(resolvedLeadId, { showBlockingLoader: !hasInitialLeadData });
    } else if (!leadData) {
      // Para novos leads, preencher automaticamente com UTMs da URL
      const utmData = getUTMParameters();

      setForm({
        ...defaultForm,
        source: utmData.source || defaultForm.source,
        campaign: utmData.campaign || defaultForm.campaign,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedLeadId, leadDataKey, open, hasInitialLeadData]);

  useEffect(() => {
    if (form.pipelineId && pipelines.length > 0) {
      const selectedPipeline = pipelines.find((p) => p.id === form.pipelineId);
      if (selectedPipeline && selectedPipeline.stages) {
        setStages(selectedPipeline.stages);
      } else {
        setStages([]);
      }
    } else {
      setStages([]);
    }
  }, [form.pipelineId, pipelines]);

  const loadLead = async (id = resolvedLeadId, options = {}) => {
    const { showBlockingLoader = true } = options;
    if (showBlockingLoader) {
      setLoading(true);
    }
    try {
      const { data } = await api.get(`/crm/leads/${id}`);
      setForm(normalizeLeadForm(data));
    } catch (err) {
      toastError(err);
      onClose();
    } finally {
      if (showBlockingLoader) {
        setLoading(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCustomFieldChange = (fieldKey, value) => {
    setForm((prev) => ({
      ...prev,
      customFields: {
        ...(prev.customFields || {}),
        [fieldKey]: value,
      },
    }));
  };

  const fieldSettingsByKey = React.useMemo(
    () =>
      leadFields.reduce((acc, field) => {
        acc[field.fieldKey] = field;
        return acc;
      }, {}),
    [leadFields]
  );

  const isFieldVisible = (fieldKey) => fieldSettingsByKey[fieldKey]?.visible !== false;
  const fieldLabel = (fieldKey, fallback) => fieldSettingsByKey[fieldKey]?.label || fallback;
  const visibleGridStyle = (fieldKey) => (isFieldVisible(fieldKey) ? undefined : { display: "none" });
  const customLeadFields = leadFields.filter((field) => field.isCustom && field.visible !== false && field.active !== false);

  const handleDocumentChange = (event) => {
    const rawValue = event.target.value || "";
    setForm((prev) => ({
      ...prev,
      document: formatDocument(rawValue),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!form.name.trim()) {
        toast.error("O nome é obrigatório.");
        setSubmitting(false);
        return;
      }

      const payload = {
        ...form,
        document: normalizeDigits(form.document),
        cnpj:
          normalizeDigits(form.document).length === 14
            ? normalizeDigits(form.document)
            : "",
        address: (form.address || "").trim(),
        product: (form.product || "").trim(),
        paymentType: form.paymentType || null,
        purchaseType: form.purchaseType || null,
        purchaseValue:
          form.purchaseValue !== "" && form.purchaseValue != null
            ? Number(form.purchaseValue)
            : null,
        pipelineId: form.pipelineId || null,
        stageId: form.stageId || null,
        score: Number(form.score) || 0,
        ownerUserId: form.ownerUserId ? Number(form.ownerUserId) : null,
        temperature: form.temperature || null,
        contactId: form.contactId || contactId || null,
        birthDate: form.birthDate || undefined,
        clientSince: form.clientSince || undefined,
        acquisitionDate: form.acquisitionDate || undefined,
        expirationDate: form.expirationDate || undefined,
        contactTags: (form.contactId || contactId)
          ? (Array.isArray(form.contactTags) ? form.contactTags : [])
          : undefined,
        cardColor: cardColor || form.cardColor,
        customFields: form.customFields || {},
      };
      delete payload.tags;
      delete payload.sessionid;

      if (resolvedLeadId) {
        await api.put(`/crm/leads/${resolvedLeadId}`, payload);
        toast.success("Lead atualizado com sucesso!");
      } else {
        await api.post("/crm/leads", payload);
        toast.success("Lead criado com sucesso!");
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      toastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <>
      <div style={{ padding: isEmbedded ? 0 : 24 }}>
        {loading && !hasInitialLeadData ? (
          <Grid container justifyContent="center">
            <CircularProgress size={24} />
          </Grid>
        ) : (
          <form onSubmit={handleSubmit} id="lead-form">
            <Grid container spacing={2}>

              {/* ── DADOS BÁSICOS ── */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Dados básicos
                </Typography>
                <Divider />
              </Grid>
              <Grid item xs={12} md={4} style={visibleGridStyle("status")}>
                <TextField
                  select
                  label={fieldLabel("status", "Status")}
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                >
                  {LEAD_STATUS.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4} style={visibleGridStyle("pipelineId")}>
                <TextField
                  select
                  label={fieldLabel("pipelineId", "Funil de Vendas")}
                  name="pipelineId"
                  value={form.pipelineId}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                >
                  <MenuItem value="">Não vincular</MenuItem>
                  {pipelines.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4} style={visibleGridStyle("stageId")}>
                <TextField
                  select
                  label={fieldLabel("stageId", "Estágio Funil")}
                  name="stageId"
                  value={form.stageId}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  disabled={!form.pipelineId}
                >
                  <MenuItem value="">Selecione...</MenuItem>
                  {stages.map((st) => (
                    <MenuItem key={st.id} value={st.id}>
                      {st.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} style={visibleGridStyle("name")}>
                <TextField
                  label={fieldLabel("name", "Nome Contato")}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  required
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6} style={visibleGridStyle("companyName")}>
                <TextField
                  label={fieldLabel("companyName", "Empresa")}
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6} style={visibleGridStyle("document")}>
                <TextField
                  label={fieldLabel("document", "CPF / CNPJ")}
                  name="document"
                  value={form.document}
                  onChange={handleDocumentChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  inputProps={{ maxLength: 18 }}
                />
              </Grid>
              <Grid item xs={12} sm={6} style={visibleGridStyle("email")}>
                <TextField
                  label={fieldLabel("email", "E-mail")}
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  type="email"
                />
              </Grid>
              <Grid item xs={12} sm={6} style={visibleGridStyle("phone")}>
                <TextField
                  label={fieldLabel("phone", "Telefone Celular")}
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6} style={visibleGridStyle("decisionMakerPhone")}>
                <TextField
                  label={fieldLabel("decisionMakerPhone", "Telefone decisor")}
                  name="decisionMakerPhone"
                  value={form.decisionMakerPhone}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} style={visibleGridStyle("address")}>
                <TextField
                  label={fieldLabel("address", "Endereço")}
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  placeholder="Rua, avenida, bairro, complemento..."
                />
              </Grid>

              {/* ── INFORMAÇÕES COMERCIAIS ── */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Informações comerciais
                </Typography>
                <Divider />
              </Grid>
              <Grid item xs={12} sm={4} style={visibleGridStyle("position")}>
                <TextField
                  label={fieldLabel("position", "Cargo")}
                  name="position"
                  value={form.position}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4} style={visibleGridStyle("decisionMakerName")}>
                <TextField
                  label={fieldLabel("decisionMakerName", "Nome decisor")}
                  name="decisionMakerName"
                  value={form.decisionMakerName}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4} style={visibleGridStyle("birthDate")}>
                <TextField
                  label={fieldLabel("birthDate", "Data de nascimento")}
                  name="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4} style={visibleGridStyle("clientSince")}>
                <TextField
                  label={fieldLabel("clientSince", "Cliente desde")}
                  name="clientSince"
                  type="date"
                  value={form.clientSince}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4} style={visibleGridStyle("acquisitionDate")}>
                <TextField
                  label={fieldLabel("acquisitionDate", "Data de aquisição")}
                  name="acquisitionDate"
                  type="date"
                  value={form.acquisitionDate}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  InputLabelProps={{ shrink: true }}
                  helperText="Quando o lead adquiriu o produto/plano."
                />
              </Grid>
              <Grid item xs={12} sm={4} style={visibleGridStyle("expirationDate")}>
                <TextField
                  label={fieldLabel("expirationDate", "Data de vencimento")}
                  name="expirationDate"
                  type="date"
                  value={form.expirationDate}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  InputLabelProps={{ shrink: true }}
                  helperText="Ao atingir a data, o lead expira."
                />
              </Grid>
              <Grid item xs={12} sm={6} style={visibleGridStyle("paymentType")}>
                <TextField
                  label={fieldLabel("paymentType", "Tipo de pagamento")}
                  name="paymentType"
                  value={form.paymentType}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6} style={visibleGridStyle("purchaseType")}>
                <TextField
                  select
                  label={fieldLabel("purchaseType", "Tipo de compra")}
                  name="purchaseType"
                  value={form.purchaseType}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                >
                  <MenuItem value="">Nenhum</MenuItem>
                  {PURCHASE_TYPE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} style={visibleGridStyle("purchaseValue")}>
                <TextField
                  label={fieldLabel("purchaseValue", "Valor da venda/oportunidade")}
                  name="purchaseValue"
                  type="number"
                  value={form.purchaseValue}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  inputProps={{ min: 0, step: "0.01" }}
                />
              </Grid>
              {/* ── PRODUTO VINCULADO ── */}
              <Grid item xs={12} style={visibleGridStyle("product")}>
                <div className={classes.highlightedField}>
                  <Typography className={classes.highlightedLabel}>
                    Produto vinculado ao lead
                  </Typography>
                  <Autocomplete
                    freeSolo
                    options={products}
                    value={form.product || ""}
                    onChange={(event, newValue) => {
                      const productName =
                        typeof newValue === "string"
                          ? newValue
                          : newValue?.inputValue || newValue?.nome || "";
                      setForm((prev) => ({ ...prev, product: productName }));
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason === "input") {
                        setForm((prev) => ({ ...prev, product: newInputValue }));
                      }
                    }}
                    getOptionLabel={(option) => {
                      if (typeof option === "string") return option;
                      return option?.inputValue || option?.nome || "";
                    }}
                    filterOptions={(options, params) => {
                      const filtered = filter(options, params);
                      const inputValue = params.inputValue.trim();
                      if (
                        inputValue &&
                        !options.some(
                          (option) =>
                            (option?.nome || "").toLowerCase() ===
                            inputValue.toLowerCase(),
                        )
                      ) {
                        filtered.push({ inputValue, nome: `Usar "${inputValue}"` });
                      }
                      return filtered;
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={fieldLabel("product", "Produto")}
                        variant="outlined"
                        fullWidth
                        className={classes.formField}
                        placeholder="Selecione ou digite um produto"
                      />
                    )}
                  />
                </div>
              </Grid>

              {/* ── PRESENÇA DIGITAL ── */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Presença digital
                </Typography>
                <Divider />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="GMN"
                  name="gmn"
                  value={form.gmn}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  InputProps={{
                    endAdornment: (
                      <DigitalPresenceLinkAdornment
                        value={form.gmn}
                        label="Abrir Google Meu Negócio"
                      />
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Site"
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  InputProps={{
                    endAdornment: (
                      <DigitalPresenceLinkAdornment
                        value={form.website}
                        label="Abrir site"
                      />
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Instagram"
                  name="instagram"
                  value={form.instagram}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  InputProps={{
                    endAdornment: (
                      <DigitalPresenceLinkAdornment
                        value={form.instagram}
                        label="Abrir Instagram"
                      />
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="LinkedIn"
                  name="linkedin"
                  value={form.linkedin}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  InputProps={{
                    endAdornment: (
                      <DigitalPresenceLinkAdornment
                        value={form.linkedin}
                        label="Abrir LinkedIn"
                      />
                    ),
                  }}
                />
              </Grid>

              {/* ── CRM ── */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  CRM
                </Typography>
                <Divider />
              </Grid>
              <Grid item xs={12} sm={4} style={visibleGridStyle("source")}>
                <TextField
                  label={fieldLabel("source", "Origem")}
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4} style={visibleGridStyle("campaign")}>
                <TextField
                  label={fieldLabel("campaign", "Campanha/Tag")}
                  name="campaign"
                  value={form.campaign}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4} style={visibleGridStyle("temperature")}>
                <TextField
                  select
                  label={fieldLabel("temperature", "Temperatura")}
                  name="temperature"
                  value={form.temperature}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                >
                  <MenuItem value="">Nenhuma</MenuItem>
                  {TEMPERATURE_OPTIONS.map((temp) => (
                    <MenuItem key={temp} value={temp}>
                      {temp}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4} style={visibleGridStyle("score")}>
                <TextField
                  label={fieldLabel("score", "Score")}
                  name="score"
                  value={form.score}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  type="number"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={8} style={visibleGridStyle("ownerUserId")}>
                <TextField
                  select
                  label={fieldLabel("ownerUserId", "Atribuir a")}
                  name="ownerUserId"
                  value={form.ownerUserId}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                >
                  <MenuItem value="">Sem responsável</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} style={visibleGridStyle("tags")}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={tags}
                  getOptionLabel={(option) =>
                    option.name || option.inputValue || option
                  }
                  value={form.contactTags || []}
                  disabled={!(form.contactId || contactId)}
                  onChange={(event, newValue) => {
                    const newTags = newValue.map((item) => {
                      if (typeof item === "string") return { name: item };
                      if (item.inputValue) return { name: item.inputValue };
                      return item;
                    });
                    setForm((prev) => ({ ...prev, contactTags: newTags }));
                  }}
                  filterOptions={(options, params) => {
                    const filtered = filter(options, params);
                    if (params.inputValue !== "") {
                      filtered.push({
                        inputValue: params.inputValue,
                        name: `Criar tag "${params.inputValue}"`,
                      });
                    }
                    return filtered;
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="Tags do contato"
                      placeholder="Selecione ou adicione novas tags..."
                      className={classes.formField}
                    />
                  )}
                />
                <Typography className={classes.helperNote}>
                  {(form.contactId || contactId)
                    ? "Tags do contato usadas no card do Kanban e na conversa."
                    : "Tags disponiveis apenas quando o lead possui contato vinculado."}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} style={visibleGridStyle("notes")}>
                <TextField
                  label={fieldLabel("notes", "Observações")}
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Acesso ID"
                  name="sessionid"
                  value={form.sessionid}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  InputProps={{ readOnly: true }}
                  helperText="Preenchido por automação."
                />
              </Grid>

              {customLeadFields.length > 0 && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" className={classes.sectionTitle}>
                      Campos personalizados
                    </Typography>
                    <Divider />
                  </Grid>
                  {customLeadFields.map((field) => (
                    <Grid item xs={12} sm={field.fieldType === "textarea" ? 12 : 6} key={field.fieldKey}>
                      {field.fieldType === "boolean" ? (
                        <FormControlLabel
                          control={
                            <Switch
                              color="primary"
                              checked={String(form.customFields?.[field.fieldKey] || "false") === "true"}
                              onChange={(event) => handleCustomFieldChange(field.fieldKey, event.target.checked)}
                            />
                          }
                          label={field.label}
                        />
                      ) : (
                        <TextField
                          label={field.label}
                          type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : field.fieldType === "email" ? "email" : "text"}
                          value={form.customFields?.[field.fieldKey] || ""}
                          onChange={(event) => handleCustomFieldChange(field.fieldKey, event.target.value)}
                          variant="outlined"
                          fullWidth
                          multiline={field.fieldType === "textarea"}
                          rows={field.fieldType === "textarea" ? 3 : undefined}
                          className={classes.formField}
                          InputLabelProps={field.fieldType === "date" ? { shrink: true } : undefined}
                        />
                      )}
                    </Grid>
                  ))}
                </>
              )}

            </Grid>
          </form>
        )}
      </div>
      <div
        className={classes.dialogActions}
        style={{
          padding: isEmbedded ? "16px 0 0 0" : undefined,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <div>
          <Button
            variant="contained"
            className={classes.closeButton}
            onClick={onClose}
            disabled={submitting}
            style={{ marginRight: 8 }}
          >
            Fechar
          </Button>
          <Button
            type="submit"
            color="primary"
            variant="contained"
            form="lead-form"
            disabled={submitting || loading}
          >
            {submitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </div>
    </>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle className={classes.dialogTitle}>
        {resolvedLeadId ? "Editar Lead" : "Novo Lead"}
      </DialogTitle>
      <DialogContent dividers>{content}</DialogContent>
    </Dialog>
  );
};

export default LeadModal;
