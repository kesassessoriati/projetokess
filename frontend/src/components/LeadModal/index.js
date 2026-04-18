import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  makeStyles,
  CircularProgress,
  Typography,
  Divider,
} from "@material-ui/core";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { LEAD_STATUS } from "../../constants/leadStatus";
import Autocomplete, {
  createFilterOptions,
} from "@material-ui/lab/Autocomplete";

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
  const rawDocument = lead.document || lead.cnpj || "";

  return {
    ...defaultForm,
    ...lead,
    document: formatDocument(rawDocument),
    address: lead.address || "",
    product: lead.product || "",
    paymentType: lead.paymentType || "",
    purchaseType: lead.purchaseType || "",
    purchaseValue: lead.purchaseValue != null ? lead.purchaseValue : "",
    birthDate: lead.birthDate ? lead.birthDate.substring(0, 10) : "",
    clientSince: lead.clientSince ? lead.clientSince.substring(0, 10) : "",
    acquisitionDate: lead.acquisitionDate
      ? lead.acquisitionDate.substring(0, 10)
      : "",
    expirationDate: lead.expirationDate
      ? lead.expirationDate.substring(0, 10)
      : "",
    score: lead.score || 0,
    status: lead.status || lead.leadStatus || "novo",
    tags: Array.isArray(lead.tags) ? lead.tags : [],
    cardColor: lead.cardColor || lead.card_color || "#FFFFFF",
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
  cardColor: "#FFFFFF",
};

const LeadModal = ({
  open,
  onClose,
  leadId,
  onSuccess,
  isEmbedded = false,
  leadData = null,
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

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        const [
          { data: usersData },
          { data: pipelinesData },
          { data: tagsData },
          { data: productsData },
        ] = await Promise.all([
          api.get("/users/"),
          api.get("/pipelines"),
          api.get("/tags/list"),
          api.get("/produtos", { params: { limit: 100 } }),
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
      } catch (err) {
        toastError(err);
      }
    };

    fetchData();

    if (leadData) {
      setForm(normalizeLeadForm(leadData));
    } else if (leadId) {
      loadLead();
    } else {
      // Para novos leads, preencher automaticamente com UTMs da URL
      const utmData = getUTMParameters();

      setForm({
        ...defaultForm,
        source: utmData.source || defaultForm.source,
        campaign: utmData.campaign || defaultForm.campaign,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, leadData, open]);

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

  const loadLead = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/crm/leads/${leadId}`);
      setForm(normalizeLeadForm(data));
    } catch (err) {
      toastError(err);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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
        birthDate: form.birthDate || undefined,
        clientSince: form.clientSince || undefined,
        acquisitionDate: form.acquisitionDate || undefined,
        expirationDate: form.expirationDate || undefined,
        tags: form.tags && form.tags.length > 0 ? form.tags : undefined,
        cardColor: cardColor || form.cardColor,
      };

      if (leadId) {
        await api.put(`/crm/leads/${leadId}`, payload);
        toast.success("Lead atualizado com sucesso!");
      } else {
        await api.post("/crm/leads", payload);
        toast.success("Lead criado com sucesso!");
      }

      onClose();
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
        {loading ? (
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
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Status"
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
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Funil de Vendas"
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
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Estágio Funil"
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
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nome Contato"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  required
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Empresa"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="CPF / CNPJ"
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
              <Grid item xs={12} sm={6}>
                <TextField
                  label="E-mail"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  type="email"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefone Celular"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefone decisor"
                  name="decisionMakerPhone"
                  value={form.decisionMakerPhone}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>

              {/* ── PRODUTO VINCULADO ── */}
              <Grid item xs={12}>
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
                        label="Produto"
                        variant="outlined"
                        fullWidth
                        className={classes.formField}
                        placeholder="Selecione ou digite um produto"
                      />
                    )}
                  />
                </div>
              </Grid>

              {/* ── INFORMAÇÕES COMERCIAIS ── */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Informações comerciais
                </Typography>
                <Divider />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Cargo"
                  name="position"
                  value={form.position}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Nome decisor"
                  name="decisionMakerName"
                  value={form.decisionMakerName}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Data de nascimento"
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
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Cliente desde"
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
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Data de aquisição"
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
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Data de vencimento"
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
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Tipo de pagamento"
                  name="paymentType"
                  value={form.paymentType}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Tipo de compra"
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
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Valor da venda/oportunidade"
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
                />
              </Grid>

              {/* ── CRM ── */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  CRM
                </Typography>
                <Divider />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Origem"
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Campanha/Tag"
                  name="campaign"
                  value={form.campaign}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Temperatura"
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
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Score"
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
              <Grid item xs={12} sm={8}>
                <TextField
                  select
                  label="Atribuir a"
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
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={tags}
                  getOptionLabel={(option) =>
                    option.name || option.inputValue || option
                  }
                  value={form.tags || []}
                  onChange={(event, newValue) => {
                    const newTags = newValue.map((item) => {
                      if (typeof item === "string") return { name: item };
                      if (item.inputValue) return { name: item.inputValue };
                      return item;
                    });
                    setForm((prev) => ({ ...prev, tags: newTags }));
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
                      label="Tags"
                      placeholder="Selecione ou adicione novas tags..."
                      className={classes.formField}
                    />
                  )}
                />
                <Typography className={classes.helperNote}>
                  Tags vinculadas ao módulo de etiquetas.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Observações"
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

              {/* ── ENDEREÇO ── */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Endereço
                </Typography>
                <Divider />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Endereço"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  placeholder="Rua, avenida, bairro, complemento..."
                />
              </Grid>

            </Grid>
          </form>
        )}
      </div>
      <div
        className={classes.dialogActions}
        style={{
          padding: isEmbedded ? "16px 0 0 0" : undefined,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
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
    </>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle className={classes.dialogTitle}>
        {leadId ? "Editar Lead" : "Novo Lead"}
      </DialogTitle>
      <DialogContent dividers>{content}</DialogContent>
    </Dialog>
  );
};

export default LeadModal;
