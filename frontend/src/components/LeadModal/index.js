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
  CircularProgress
} from "@material-ui/core";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { LEAD_STATUS } from "../../constants/leadStatus";

const useStyles = makeStyles((theme) => ({
  dialogTitle: {
    fontWeight: 600
  },
  formField: {
    marginBottom: theme.spacing(2)
  },
  dialogActions: {
    justifyContent: "space-between",
    padding: theme.spacing(2, 3)
  }
}));



const TEMPERATURE_OPTIONS = ["frio", "morno", "quente"];

// Função para extrair parâmetros UTM da URL
const getUTMParameters = () => {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source');
  const utmMedium = params.get('utm_medium');
  const utmCampaign = params.get('utm_campaign');
  const utmTerm = params.get('utm_term');
  const utmContent = params.get('utm_content');

  if (utmSource || utmMedium || utmCampaign) {
    const utmParams = [];
    if (utmSource) utmParams.push(`source: ${utmSource}`);
    if (utmMedium) utmParams.push(`medium: ${utmMedium}`);
    if (utmCampaign) utmParams.push(`campaign: ${utmCampaign}`);
    if (utmTerm) utmParams.push(`term: ${utmTerm}`);
    if (utmContent) utmParams.push(`content: ${utmContent}`);

    return {
      source: `UTM: ${utmParams.join(' | ')}`,
      campaign: utmCampaign || ''
    };
  }

  return { source: '', campaign: '' };
};

const defaultForm = {
  name: "",
  companyName: "",
  decisionMakerName: "",
  email: "",
  phone: "",
  decisionMakerPhone: "",
  gmn: "",
  website: "",
  instagram: "",
  linkedin: "",
  position: "",
  source: "",
  campaign: "",
  status: "novo",
  pipelineId: "",
  stageId: "",
  temperature: "",
  score: 0,
  ownerUserId: "",
  notes: ""
};

const LeadModal = ({ open, onClose, leadId, onSuccess, isEmbedded = false, leadData = null }) => {
  const classes = useStyles();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState([]);

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        const [{ data: usersData }, { data: pipelinesData }] = await Promise.all([
          api.get("/users/"),
          api.get("/pipelines")
        ]);
        setUsers(usersData.users || []);
        setPipelines(pipelinesData || []);
      } catch (err) {
        toastError(err);
      }
    };

    fetchData();

    if (leadData && leadData.name) {
      setForm({
        ...defaultForm,
        ...leadData,
        birthDate: leadData.birthDate ? leadData.birthDate.substring(0, 10) : "",
        score: leadData.score || 0,
        status: leadData.status || "novo"
      });
    } else if (leadId) {
      loadLead();
    } else {
      // Para novos leads, preencher automaticamente com UTMs da URL
      const utmData = getUTMParameters();
      console.log('🔍 UTMs detectadas:', utmData);
      console.log('🌐 URL atual:', window.location.search);

      setForm({
        ...defaultForm,
        source: utmData.source || defaultForm.source,
        campaign: utmData.campaign || defaultForm.campaign
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
      setForm({
        ...defaultForm,
        ...data,
        birthDate: data.birthDate ? data.birthDate.substring(0, 10) : "",
        score: data.score || 0,
        status: data.status || "novo"
      });
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
      [name]: value
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
        pipelineId: form.pipelineId || null,
        stageId: form.stageId || null,
        score: Number(form.score) || 0,
        ownerUserId: form.ownerUserId ? Number(form.ownerUserId) : null,
        temperature: form.temperature || null,
        birthDate: form.birthDate || undefined
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
              {/* Row 1 */}
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

              {/* Row 2 */}
              <Grid item xs={12} sm={6}>
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

              {/* Row 3 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefone"
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

              {/* Row 4 */}
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
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

              {/* Row 5 */}
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Linkedin"
                  name="linkedin"
                  value={form.linkedin}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>

              {/* Row 6 */}
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
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

              {/* Row 7 */}
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
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

              {/* Row 8 */}
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
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

              {/* Row 9 */}
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
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

              {/* Row 10 */}
              <Grid item xs={12} sm={12}>
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
                  <MenuItem value="">
                    Sem responsável
                  </MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Row 11 */}
              <Grid item xs={12}>
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

            </Grid>
          </form>
        )}
      </div>
      <div className={classes.dialogActions} style={{ padding: isEmbedded ? '16px 0 0 0' : undefined, display: 'flex', justifyContent: 'space-between' }}>
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
          {submitting ? <CircularProgress size={20} color="inherit" /> : "Salvar"}
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
      <DialogContent dividers>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default LeadModal;
