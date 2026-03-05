import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Button,
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

const ApiPipelinePage = () => {
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
        setTimeout(() => { history.push(`/`); }, 1000);
      }
    }
    checkPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const BASE = process.env.REACT_APP_BACKEND_URL;
  const getPipelinesEndpoint = () => `${BASE}/api/external/pipelines`;
  const getOpportunitiesEndpoint = () => `${BASE}/api/external/opportunities`;

  const postmanRequests = [
    { name: "Listar pipelines", method: "GET", url: getPipelinesEndpoint(), description: "Retorna pipelines com seus estágios." },
    { name: "Board de um pipeline", method: "GET", url: `${getPipelinesEndpoint()}/1/board`, description: "Retorna board completo com oportunidades por estágio." },
    { name: "Listar oportunidades", method: "GET", url: getOpportunitiesEndpoint(), description: "Filtros: pipelineId, stageId, contactId." },
    { name: "Buscar oportunidade por ID", method: "GET", url: `${getOpportunitiesEndpoint()}/1`, description: "Detalhes de uma oportunidade." },
    {
      name: "Criar oportunidade",
      method: "POST",
      url: getOpportunitiesEndpoint(),
      description: "Cria uma oportunidade no funil.",
      body: { pipelineId: 1, stageId: 2, title: "Proposta Empresa XYZ", value: 5000 }
    },
    {
      name: "Mover oportunidade",
      method: "POST",
      url: `${getOpportunitiesEndpoint()}/1/move`,
      description: "Move a oportunidade para outro estágio.",
      body: { toStageId: 4, reason: "Cliente aprovou" }
    }
  ];

  const formatJSON = (data) => JSON.stringify(data, null, 2);
  const saveResult = (title, payload) => {
    setTestResult({ title, payload: typeof payload === "string" ? payload : formatJSON(payload), timestamp: new Date().toLocaleString() });
  };

  const handleListPipelines = async (values) => {
    try {
      const { data } = await axios.get(getPipelinesEndpoint(), { headers: { apikey: values.token } });
      saveResult("Pipelines", data);
      toast.success("Pipelines carregados!");
    } catch (err) { toastError(err); }
  };

  const handleGetBoard = async (values) => {
    try {
      const params = {};
      if (values.limit) params.limit = values.limit;
      const { data } = await axios.get(`${getPipelinesEndpoint()}/${values.pipelineId}/board`, {
        headers: { apikey: values.token },
        params
      });
      saveResult(`Board Pipeline ${values.pipelineId}`, data);
      toast.success("Board carregado!");
    } catch (err) { toastError(err); }
  };

  const handleListOpportunities = async (values) => {
    try {
      const params = {};
      if (values.pipelineId) params.pipelineId = values.pipelineId;
      if (values.stageId) params.stageId = values.stageId;
      const { data } = await axios.get(getOpportunitiesEndpoint(), {
        headers: { apikey: values.token },
        params
      });
      saveResult("Oportunidades", data);
      toast.success("Oportunidades carregadas!");
    } catch (err) { toastError(err); }
  };

  const handleCreateOpportunity = async (values) => {
    try {
      const payload = {
        pipelineId: Number(values.pipelineId),
        stageId: Number(values.stageId),
        title: values.title,
        value: values.value ? Number(values.value) : undefined,
        contactId: values.contactId ? Number(values.contactId) : undefined,
        assignedUserId: values.assignedUserId ? Number(values.assignedUserId) : undefined
      };
      const { data } = await axios.post(getOpportunitiesEndpoint(), payload, {
        headers: { apikey: values.token }
      });
      saveResult("Oportunidade criada", data);
      toast.success("Oportunidade criada com sucesso!");
    } catch (err) { toastError(err); }
  };

  const handleMoveOpportunity = async (values) => {
    try {
      const { data } = await axios.post(
        `${getOpportunitiesEndpoint()}/${values.opportunityId}/move`,
        { toStageId: Number(values.toStageId), reason: values.reason || undefined },
        { headers: { apikey: values.token } }
      );
      saveResult("Oportunidade movida", data);
      toast.success("Oportunidade movida!");
    } catch (err) { toastError(err); }
  };

  return (
    <Paper className={classes.mainPaper} style={{ marginLeft: "5px" }} variant="outlined">
      <Box display="flex" alignItems="center" mb={2} gap={8}>
        <Button startIcon={<ReplyIcon />} onClick={() => history.push("/documentacao")}>
          Voltar
        </Button>
        <Box>
          <Typography variant="h5">API de Pipeline / Funil de Vendas</Typography>
          <Typography variant="body2" color="textSecondary">
            Gerencie pipelines, estágios e oportunidades via API externa.
          </Typography>
        </Box>
        <Box ml="auto">
          <ApiPostmanDownload requests={postmanRequests} collectionName="AtendZappy - Pipeline" />
        </Box>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Auth */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Autenticação</strong></Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Header obrigatório em todas as requisições:
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
          { method: "GET", path: "/api/external/pipelines", desc: "Listar pipelines com estágios" },
          { method: "GET", path: "/api/external/pipelines/:id/board", desc: "Board completo com oportunidades por estágio" },
          { method: "GET", path: "/api/external/opportunities", desc: "Listar oportunidades (filtros: pipelineId, stageId, contactId)" },
          { method: "GET", path: "/api/external/opportunities/:id", desc: "Detalhes de uma oportunidade" },
          { method: "POST", path: "/api/external/opportunities", desc: "Criar oportunidade" },
          { method: "PUT", path: "/api/external/opportunities/:id", desc: "Atualizar oportunidade" },
          { method: "POST", path: "/api/external/opportunities/:id/move", desc: "Mover para outro estágio" }
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

      {/* Listar Pipelines */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Listar pipelines</Typography>
        <Formik initialValues={{ token: "" }} onSubmit={handleListPipelines}>
          {({ isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field as={TextField} label="Token (apikey)" name="token" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button type="submit" variant="contained" color="primary" startIcon={<SendIcon />} disabled={isSubmitting}>
                    Listar pipelines
                  </Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Board */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Board de um pipeline</Typography>
        <Formik initialValues={{ token: "", pipelineId: "", limit: "50" }} onSubmit={handleGetBoard}>
          {({ isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field as={TextField} label="Token (apikey)" name="token" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Pipeline ID *" name="pipelineId" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Limite por estágio" name="limit" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button type="submit" variant="contained" color="primary" startIcon={<SendIcon />} disabled={isSubmitting}>
                    Ver board
                  </Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Listar Oportunidades */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Listar oportunidades</Typography>
        <Formik initialValues={{ token: "", pipelineId: "", stageId: "" }} onSubmit={handleListOpportunities}>
          {({ isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field as={TextField} label="Token (apikey)" name="token" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Pipeline ID (filtro)" name="pipelineId" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Stage ID (filtro)" name="stageId" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button type="submit" variant="contained" color="primary" startIcon={<SendIcon />} disabled={isSubmitting}>
                    Listar oportunidades
                  </Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Criar Oportunidade */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Criar oportunidade</Typography>
        <Formik
          initialValues={{ token: "", pipelineId: "", stageId: "", title: "", value: "", contactId: "", assignedUserId: "" }}
          onSubmit={handleCreateOpportunity}
        >
          {({ isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field as={TextField} label="Token (apikey)" name="token" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12}>
                  <Field as={TextField} label="Título *" name="title" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Pipeline ID *" name="pipelineId" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Stage ID *" name="stageId" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field as={TextField} label="Valor (R$)" name="value" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field as={TextField} label="Contact ID" name="contactId" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field as={TextField} label="Usuário responsável ID" name="assignedUserId" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button type="submit" variant="contained" color="primary" startIcon={<SendIcon />} disabled={isSubmitting}>
                    Criar oportunidade
                  </Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Mover Oportunidade */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Mover oportunidade de estágio</Typography>
        <Formik initialValues={{ token: "", opportunityId: "", toStageId: "", reason: "" }} onSubmit={handleMoveOpportunity}>
          {({ isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field as={TextField} label="Token (apikey)" name="token" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field as={TextField} label="Oportunidade ID *" name="opportunityId" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field as={TextField} label="Para Stage ID *" name="toStageId" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field as={TextField} label="Motivo (opcional)" name="reason" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button type="submit" variant="contained" color="secondary" startIcon={<SendIcon />} disabled={isSubmitting}>
                    Mover
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

export default ApiPipelinePage;
