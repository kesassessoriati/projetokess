import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Button,
  CircularProgress,
  Chip,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography
} from "@material-ui/core";
import { Field, Form, Formik } from "formik";
import axios from "axios";
import { toast } from "react-toastify";

import toastError from "../../errors/toastError";
import ReplyIcon from "@mui/icons-material/Reply";
import SendIcon from "@mui/icons-material/Send";

import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";
import ApiPostmanDownload from "../../components/ApiPostmanDownload";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    paddingBottom: 100
  },
  elementMargin: {
    padding: theme.spacing(2)
  },
  formContainer: {
    maxWidth: 520
  },
  textRight: {
    textAlign: "right"
  },
  resultBox: {
    background: "#0f172a",
    color: "#e2e8f0",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 13,
    padding: theme.spacing(2),
    borderRadius: 8,
    overflowX: "auto"
  }
}));

const ApiCrmLeadsPage = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const { getPlanCompany } = usePlans();

  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    async function checkPermission() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useExternalApi) {
        toast.error("Esta empresa não possui permissão para acessar essa página!");
        setTimeout(() => {
          history.push(`/`);
        }, 1000);
      }
    }
    checkPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLeadsEndpoint = () => `${process.env.REACT_APP_BACKEND_URL}/api/external/crm-leads`;

  const postmanRequests = [
    {
      name: "Listar leads",
      method: "GET",
      url: getLeadsEndpoint(),
      description: "Retorna os leads do CRM. Suporta filtros por status, ownerUserId e busca por texto."
    },
    {
      name: "Buscar lead por ID",
      method: "GET",
      url: `${getLeadsEndpoint()}/1`,
      description: "Substitua o ID ao final da URL para consultar um lead específico."
    },
    {
      name: "Criar lead no funil",
      method: "POST",
      url: getLeadsEndpoint(),
      description: "Cria um novo lead. Se informar pipelineId e stageId, o lead é criado naquele estágio do funil.",
      body: {
        name: "João Silva",
        email: "joao@empresa.com",
        phone: "11999999999",
        companyName: "Empresa Ltda",
        pipelineId: 1,
        stageId: 3,
        source: "site",
        temperature: "quente",
        notes: "Interesse no plano Pro"
      }
    },
    {
      name: "Atualizar lead",
      method: "PUT",
      url: `${getLeadsEndpoint()}/1`,
      description: "Atualiza campos do lead. Informe o ID na URL.",
      body: {
        status: "negociando",
        temperature: "quente",
        stageId: 4,
        notes: "Reunião agendada"
      }
    },
    {
      name: "Converter lead em cliente",
      method: "POST",
      url: `${getLeadsEndpoint()}/1/convert`,
      description: "Converte o lead em cliente CRM. Informe contactId ou phone para vincular o contato.",
      body: {
        phone: "11999999999"
      }
    }
  ];

  const formatJSON = (data) => JSON.stringify(data, null, 2);

  const saveResult = (title, payload) => {
    setTestResult({
      title,
      payload: typeof payload === "string" ? payload : formatJSON(payload),
      timestamp: new Date().toLocaleString()
    });
  };

  const handleListLeads = async (values) => {
    try {
      const params = {};
      if (values.searchParam) params.searchParam = values.searchParam;
      if (values.status) params.status = values.status;
      const { data } = await axios.get(getLeadsEndpoint(), {
        headers: { apikey: values.token },
        params
      });
      saveResult("Lista de leads", data);
      toast.success("Leads carregados!");
    } catch (err) {
      toastError(err);
    }
  };

  const handleShowLead = async (values) => {
    try {
      const { data } = await axios.get(`${getLeadsEndpoint()}/${values.leadId}`, {
        headers: { apikey: values.token }
      });
      saveResult(`Lead ${values.leadId}`, data);
      toast.success("Lead carregado!");
    } catch (err) {
      toastError(err);
    }
  };

  const handleCreateLead = async (values) => {
    try {
      const payload = {
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        companyName: values.companyName || undefined,
        pipelineId: values.pipelineId ? Number(values.pipelineId) : undefined,
        stageId: values.stageId ? Number(values.stageId) : undefined,
        source: values.source || undefined,
        temperature: values.temperature || undefined,
        notes: values.notes || undefined
      };
      const { data } = await axios.post(getLeadsEndpoint(), payload, {
        headers: { apikey: values.token }
      });
      saveResult("Lead criado", data);
      toast.success("Lead criado com sucesso!");
    } catch (err) {
      toastError(err);
    }
  };

  const handleConvertLead = async (values) => {
    try {
      const { data } = await axios.post(
        `${getLeadsEndpoint()}/${values.leadId}/convert`,
        { phone: values.phone || undefined, contactId: values.contactId ? Number(values.contactId) : undefined },
        { headers: { apikey: values.token } }
      );
      saveResult("Lead convertido", data);
      toast.success("Lead convertido em cliente!");
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Paper className={classes.mainPaper} style={{ marginLeft: "5px" }} variant="outlined">
      <Box display="flex" alignItems="center" mb={2} gap={8}>
        <Button startIcon={<ReplyIcon />} onClick={() => history.push("/documentacao")}>
          Voltar
        </Button>
        <Box>
          <Typography variant="h5">API de CRM — Leads</Typography>
          <Typography variant="body2" color="textSecondary">
            Crie, atualize e consulte leads no funil de vendas via API externa.
          </Typography>
        </Box>
        <Box ml="auto">
          <ApiPostmanDownload requests={postmanRequests} collectionName="AtendZappy - CRM Leads" />
        </Box>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Autenticação */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Autenticação</strong></Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Todas as requisições exigem o header <code>apikey</code> com o token gerado na página de Documentação.
        </Typography>
        <Box style={{ background: "#0f172a", color: "#cbd5f5", fontFamily: "monospace", padding: 12, borderRadius: 8, marginTop: 8 }}>
          apikey: sua-chave-aqui
        </Box>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Endpoints */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Endpoints disponíveis</strong></Typography>
        {[
          { method: "GET", path: "/api/external/crm-leads", desc: "Listar leads (filtros: searchParam, status, ownerUserId, pageNumber, limit)" },
          { method: "GET", path: "/api/external/crm-leads/:id", desc: "Detalhes de um lead" },
          { method: "POST", path: "/api/external/crm-leads", desc: "Criar lead" },
          { method: "PUT", path: "/api/external/crm-leads/:id", desc: "Atualizar lead" },
          { method: "POST", path: "/api/external/crm-leads/:id/convert", desc: "Converter lead em cliente" }
        ].map((ep) => (
          <Box key={ep.path} display="flex" alignItems="center" gap={8} mb={1}>
            <Chip
              label={ep.method}
              size="small"
              style={{
                background: ep.method === "GET" ? "#dbeafe" : ep.method === "POST" ? "#dcfce7" : "#fef9c3",
                color: ep.method === "GET" ? "#1e40af" : ep.method === "POST" ? "#166534" : "#854d0e",
                fontWeight: 700,
                fontFamily: "monospace",
                minWidth: 58
              }}
            />
            <Typography variant="body2" style={{ fontFamily: "monospace" }}>{ep.path}</Typography>
            <Typography variant="body2" color="textSecondary">— {ep.desc}</Typography>
          </Box>
        ))}
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Testar: Listar / Buscar */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Listar / Buscar lead</Typography>
        <Formik
          initialValues={{ token: "", searchParam: "", status: "", leadId: "" }}
          onSubmit={(values) => handleListLeads(values)}
        >
          {({ values, isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field as={TextField} label="Token (apikey)" name="token" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Busca (nome, email, telefone)" name="searchParam" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Status (novo, negociando, ...)" name="status" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Lead ID (para buscar um)" name="leadId" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button
                    type="button"
                    variant="outlined"
                    disabled={isSubmitting}
                    style={{ marginRight: 8 }}
                    onClick={() => handleShowLead(values)}
                  >
                    Buscar por ID
                  </Button>
                  <Button type="submit" variant="contained" color="primary" startIcon={<SendIcon />} disabled={isSubmitting}>
                    Listar leads
                  </Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Testar: Criar */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Criar lead no funil</Typography>
        <Formik
          initialValues={{ token: "", name: "", email: "", phone: "", companyName: "", pipelineId: "", stageId: "", source: "", temperature: "", notes: "" }}
          onSubmit={(values) => handleCreateLead(values)}
        >
          {({ isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field as={TextField} label="Token (apikey)" name="token" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Nome *" name="name" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Telefone" name="phone" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Email" name="email" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Empresa" name="companyName" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Pipeline ID" name="pipelineId" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Stage ID (estágio)" name="stageId" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Origem (source)" name="source" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Temperatura (frio/morno/quente)" name="temperature" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <Field as={TextField} label="Observações" name="notes" variant="outlined" margin="dense" fullWidth multiline rows={2} />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button type="submit" variant="contained" color="primary" startIcon={<SendIcon />} disabled={isSubmitting}>
                    Criar lead
                  </Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Testar: Converter */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Converter lead em cliente</Typography>
        <Formik
          initialValues={{ token: "", leadId: "", phone: "", contactId: "" }}
          onSubmit={(values) => handleConvertLead(values)}
        >
          {({ isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field as={TextField} label="Token (apikey)" name="token" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field as={TextField} label="Lead ID *" name="leadId" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field as={TextField} label="Telefone" name="phone" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field as={TextField} label="Contact ID" name="contactId" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button type="submit" variant="contained" color="secondary" startIcon={<SendIcon />} disabled={isSubmitting}>
                    Converter
                  </Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </Box>

      {/* Resultado */}
      {testResult && (
        <Box mt={3}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            {testResult.title} — {testResult.timestamp}
          </Typography>
          <pre className={classes.resultBox}>{testResult.payload}</pre>
        </Box>
      )}
    </Paper>
  );
};

export default ApiCrmLeadsPage;
