import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography
} from "@material-ui/core";
import { Field, Form, Formik } from "formik";
import axios from "axios";
import { toast } from "react-toastify";
import ReplyIcon from "@mui/icons-material/Reply";
import SendIcon from "@mui/icons-material/Send";

import toastError from "../../errors/toastError";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    paddingBottom: 100
  },
  formContainer: {
    maxWidth: 620
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
  },
  codeBlock: {
    background: "#0f172a",
    color: "#cbd5f5",
    fontFamily: "monospace",
    fontSize: 13,
    padding: theme.spacing(1.5),
    borderRadius: 8,
    marginTop: 8,
    whiteSpace: "pre-wrap",
    overflowX: "auto"
  }
}));

const methodColor = {
  GET:    { bg: "#dbeafe", text: "#1e40af" },
  POST:   { bg: "#dcfce7", text: "#166534" },
  PUT:    { bg: "#fef9c3", text: "#854d0e" },
  DELETE: { bg: "#fee2e2", text: "#991b1b" }
};

const ApiAgendaPage = () => {
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
        setTimeout(() => history.push("/"), 1000);
      }
    }
    checkPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getBaseUrl = () => process.env.REACT_APP_BACKEND_URL;

  const saveResult = (title, payload) => {
    setTestResult({
      title,
      payload: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
      timestamp: new Date().toLocaleString()
    });
  };

  const handleCreateAppointment = async (values) => {
    try {
      const body = {
        title: values.title,
        description: values.description || undefined,
        startDatetime: values.startDatetime,
        durationMinutes: Number(values.durationMinutes) || 60,
        status: values.status || "scheduled",
        scheduleId: Number(values.scheduleId),
        leadName: values.leadName || undefined,
        leadPhone: values.leadPhone || undefined
      };
      const { data } = await axios.post(
        `${getBaseUrl()}/api/external/appointments`,
        body,
        { headers: { Authorization: `Bearer ${values.token}` } }
      );
      saveResult("Compromisso criado", data);
      toast.success("Compromisso criado com sucesso!");
    } catch (err) {
      toastError(err);
    }
  };

  const endpoints = [
    { method: "POST",   path: "/api/external/appointments",     desc: "Cria um novo compromisso na agenda." },
    { method: "GET",    path: "/api/external/appointments",     desc: "Lista compromissos (filtros: scheduleId, status, startDate, endDate)." },
    { method: "GET",    path: "/api/external/appointments/:id", desc: "Retorna um compromisso pelo ID." },
    { method: "PUT",    path: "/api/external/appointments/:id", desc: "Atualiza dados de um compromisso." },
    { method: "DELETE", path: "/api/external/appointments/:id", desc: "Remove um compromisso." }
  ];

  const params = [
    { campo: "title",           tipo: "string",  obrigatorio: true,  desc: 'Título do compromisso. Ex: "Consulta - João Silva"' },
    { campo: "startDatetime",   tipo: "string",  obrigatorio: true,  desc: 'Data e hora de início. Formato ISO: "2026-03-30T10:00:00"' },
    { campo: "scheduleId",      tipo: "number",  obrigatorio: true,  desc: "ID da agenda. Visível na tela de Agendas (ex: · ID: 16)." },
    { campo: "durationMinutes", tipo: "number",  obrigatorio: false, desc: "Duração em minutos. Padrão: 60." },
    { campo: "status",          tipo: "string",  obrigatorio: false, desc: 'Status: "scheduled" | "confirmed" | "cancelled". Padrão: "scheduled".' },
    { campo: "description",     tipo: "string",  obrigatorio: false, desc: "Descrição ou observações do compromisso." },
    { campo: "leadName",        tipo: "string",  obrigatorio: false, desc: "Nome do lead/cliente." },
    { campo: "leadPhone",       tipo: "string",  obrigatorio: false, desc: "Telefone do lead. Ex: 5511999887766" },
    { campo: "contactId",       tipo: "number",  obrigatorio: false, desc: "ID do contato vinculado no sistema." },
    { campo: "serviceId",       tipo: "number",  obrigatorio: false, desc: "ID do serviço vinculado." },
    { campo: "meetingLink",     tipo: "string",  obrigatorio: false, desc: "Link de reunião (Zoom, Meet, etc.)." },
    { campo: "operationalNote", tipo: "string",  obrigatorio: false, desc: "Nota operacional interna." }
  ];

  return (
    <Paper className={classes.mainPaper} style={{ marginLeft: "5px" }} variant="outlined">
      {/* Header */}
      <Box display="flex" alignItems="center" mb={2} gap={8}>
        <Button startIcon={<ReplyIcon />} onClick={() => history.push("/documentacao")}>
          Voltar
        </Button>
        <Box>
          <Typography variant="h5">API de Agenda — Compromissos</Typography>
          <Typography variant="body2" color="textSecondary">
            Crie e gerencie compromissos na agenda via API externa autenticada pelo token da empresa. Não requer Google Calendar.
          </Typography>
        </Box>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Autenticação */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Autenticação</strong></Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Use o <strong>token da empresa</strong> (token_sistema) gerado na página de Documentação. Não é necessário JWT nem login.
        </Typography>
        <div className={classes.codeBlock}>
          {`Authorization: Bearer <token_sistema>`}
        </div>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Como obter o scheduleId */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Como obter o scheduleId</strong></Typography>
        <Typography variant="body2" color="textSecondary">
          Acesse <strong>Agenda → Agendas</strong>. O ID aparece ao lado do nome de cada agenda: <code>Agenda IA Teste · ID: 16</code>
        </Typography>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Endpoints */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Endpoints disponíveis</strong></Typography>
        {endpoints.map((ep) => (
          <Box key={ep.path + ep.method} display="flex" alignItems="center" gap={8} mb={1} flexWrap="wrap">
            <Chip
              label={ep.method}
              size="small"
              style={{
                background: methodColor[ep.method]?.bg,
                color: methodColor[ep.method]?.text,
                fontWeight: 700,
                fontFamily: "monospace",
                minWidth: 62
              }}
            />
            <Typography variant="body2" style={{ fontFamily: "monospace" }}>{ep.path}</Typography>
            <Typography variant="body2" color="textSecondary">— {ep.desc}</Typography>
          </Box>
        ))}
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Parâmetros */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Parâmetros do body (POST)</strong></Typography>
        {params.map((p) => (
          <Box key={p.campo} display="flex" alignItems="flex-start" gap={8} mb={1.5} flexWrap="wrap">
            <Typography variant="body2" style={{ fontFamily: "monospace", minWidth: 130 }}>{p.campo}</Typography>
            <Chip label={p.tipo} size="small" style={{ background: "#e0e7ff", color: "#3730a3", fontSize: 11 }} />
            {p.obrigatorio
              ? <Chip label="obrigatório" size="small" style={{ background: "#fee2e2", color: "#991b1b", fontSize: 11 }} />
              : <Chip label="opcional" size="small" style={{ background: "#f3f4f6", color: "#6b7280", fontSize: 11 }} />
            }
            <Typography variant="body2" color="textSecondary">{p.desc}</Typography>
          </Box>
        ))}
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Exemplo */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Exemplo de requisição</strong></Typography>
        <div className={classes.codeBlock}>
          {`POST /api/external/appointments
Authorization: Bearer <token_sistema>
Content-Type: application/json

{
  "title": "Consulta - João Silva",
  "description": "Agendamento via agente de IA",
  "startDatetime": "2026-03-30T10:00:00",
  "durationMinutes": 60,
  "status": "scheduled",
  "scheduleId": 16,
  "leadName": "João Silva",
  "leadPhone": "5511999887766"
}`}
        </div>
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
          Resposta de sucesso (201):
        </Typography>
        <div className={classes.codeBlock}>
          {`{
  "id": 292,
  "title": "Consulta - João Silva",
  "startDatetime": "2026-03-30T13:00:00.000Z",
  "durationMinutes": 60,
  "status": "scheduled",
  "scheduleId": 16,
  "companyId": 174,
  "googleEventId": null,
  "googleMeetLink": null,
  "createdAt": "2026-03-28T08:42:56.033Z"
}`}
        </div>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Testar */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Testar — Criar Compromisso</Typography>
        <Formik
          initialValues={{
            token: "",
            title: "",
            description: "",
            startDatetime: "",
            durationMinutes: "60",
            status: "scheduled",
            scheduleId: "",
            leadName: "",
            leadPhone: ""
          }}
          onSubmit={handleCreateAppointment}
        >
          {({ isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field as={TextField} label="API Token (Bearer)" name="token" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={8}>
                  <Field as={TextField} label="Título" name="title" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field as={TextField} label="Schedule ID (Agenda)" name="scheduleId" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Data/Hora (ex: 2026-03-30T10:00:00)" name="startDatetime" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Field as={TextField} label="Duração (min)" name="durationMinutes" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Field as={TextField} label="Status" name="status" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <Field as={TextField} label="Descrição" name="description" variant="outlined" margin="dense" fullWidth multiline rows={2} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Nome do Lead" name="leadName" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Telefone do Lead" name="leadPhone" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button type="submit" variant="contained" color="primary" startIcon={isSubmitting ? <CircularProgress size={18} /> : <SendIcon />} disabled={isSubmitting}>
                    Criar Compromisso
                  </Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </Box>

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

export default ApiAgendaPage;
