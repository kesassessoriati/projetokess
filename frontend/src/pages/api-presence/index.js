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
import StopIcon from "@mui/icons-material/Stop";

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

const ApiPresencePage = () => {
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

  const handleSendTyping = async (values) => {
    try {
      const { data } = await axios.post(
        `${getBaseUrl()}/api/external/presence/typing`,
        {
          number: values.number,
          whatsappId: Number(values.whatsappId),
          duration: values.duration ? Number(values.duration) : 3000
        },
        { headers: { Authorization: `Bearer ${values.token}` } }
      );
      saveResult("Digitando enviado", data);
      toast.success("Status 'digitando' enviado com sucesso!");
    } catch (err) {
      toastError(err);
    }
  };

  const handleStopTyping = async (values) => {
    try {
      const { data } = await axios.post(
        `${getBaseUrl()}/api/external/presence/stop`,
        {
          number: values.number,
          whatsappId: Number(values.whatsappId)
        },
        { headers: { Authorization: `Bearer ${values.token}` } }
      );
      saveResult("Digitando parado", data);
      toast.success("Status 'digitando' encerrado!");
    } catch (err) {
      toastError(err);
    }
  };

  const endpoints = [
    { method: "POST", path: "/api/external/presence/typing", desc: "Envia o status 'digitando...' para um número. Para automaticamente após o duration." },
    { method: "POST", path: "/api/external/presence/stop", desc: "Encerra imediatamente o status 'digitando...' para um número." }
  ];

  const methodColor = {
    POST: { bg: "#dcfce7", text: "#166534" }
  };

  return (
    <Paper className={classes.mainPaper} style={{ marginLeft: "5px" }} variant="outlined">
      {/* Header */}
      <Box display="flex" alignItems="center" mb={2} gap={8}>
        <Button startIcon={<ReplyIcon />} onClick={() => history.push("/documentacao")}>
          Voltar
        </Button>
        <Box>
          <Typography variant="h5">API de Presença — Digitando</Typography>
          <Typography variant="body2" color="textSecondary">
            Simule o status "digitando..." no WhatsApp para um contato via API autenticada.
          </Typography>
        </Box>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Autenticação */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Autenticação</strong></Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Todas as requisições exigem o header <code>Authorization: Bearer</code> com o token gerado na página de Documentação (apikey da empresa).
        </Typography>
        <div className={classes.codeBlock}>
          {`Authorization: Bearer <seu-api-token>`}
        </div>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Endpoints */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Endpoints disponíveis</strong></Typography>
        {endpoints.map((ep) => (
          <Box key={ep.path} display="flex" alignItems="center" gap={8} mb={1} flexWrap="wrap">
            <Chip
              label={ep.method}
              size="small"
              style={{
                background: methodColor[ep.method]?.bg,
                color: methodColor[ep.method]?.text,
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

      {/* Parâmetros */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Parâmetros do body</strong></Typography>
        {[
          { campo: "number", tipo: "string", obrigatorio: true, desc: 'Número do destinatário no formato DDI+DDD+número. Ex: "5511999999999"' },
          { campo: "whatsappId", tipo: "number", obrigatorio: true, desc: "ID da conexão WhatsApp que enviará o status." },
          { campo: "duration", tipo: "number", obrigatorio: false, desc: "Tempo em ms que o 'digitando' ficará ativo. Padrão: 3000 (3 segundos)." }
        ].map((p) => (
          <Box key={p.campo} display="flex" alignItems="flex-start" gap={8} mb={1.5} flexWrap="wrap">
            <Typography variant="body2" style={{ fontFamily: "monospace", minWidth: 110 }}>{p.campo}</Typography>
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

      {/* Exemplo de requisição */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Exemplo de requisição</strong></Typography>
        <div className={classes.codeBlock}>
          {`POST /api/external/presence/typing
Authorization: Bearer <api-token>
Content-Type: application/json

{
  "number": "5511999999999",
  "whatsappId": 1,
  "duration": 5000
}`}
        </div>
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
          Resposta de sucesso:
        </Typography>
        <div className={classes.codeBlock}>
          {`{
  "ok": true,
  "jid": "5511999999999@s.whatsapp.net",
  "duration": 5000
}`}
        </div>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Testar: Enviar digitando */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Testar — Enviar "digitando..."</Typography>
        <Formik
          initialValues={{ token: "", number: "", whatsappId: "", duration: "3000" }}
          onSubmit={(values) => handleSendTyping(values)}
        >
          {({ isSubmitting, values }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field as={TextField} label="API Token (Bearer)" name="token" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field as={TextField} label="Número (ex: 5511999999999)" name="number" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Field as={TextField} label="WhatsApp ID" name="whatsappId" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Field as={TextField} label="Duration (ms)" name="duration" variant="outlined" margin="dense" fullWidth />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<StopIcon />}
                    disabled={isSubmitting}
                    style={{ marginRight: 8 }}
                    onClick={() => handleStopTyping(values)}
                  >
                    Parar
                  </Button>
                  <Button type="submit" variant="contained" color="primary" startIcon={<SendIcon />} disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={20} /> : "Enviar digitando"}
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

export default ApiPresencePage;
