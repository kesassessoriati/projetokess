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
  },
  alertBox: {
    background: "#fefce8",
    border: "1px solid #fde047",
    borderRadius: 8,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(2)
  }
}));

const ApiGrupoPage = () => {
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

  const handleSendGroupMessage = async (values) => {
    try {
      const body = {
        number: values.number,
        body: values.body,
        whatsappId: Number(values.whatsappId),
        noRegister: true
      };
      const { data } = await axios.post(
        `${getBaseUrl()}/api/messages/send`,
        body,
        { headers: { Authorization: `Bearer ${values.token}` } }
      );
      saveResult("Mensagem enviada para o grupo", data);
      toast.success("Mensagem enviada com sucesso!");
    } catch (err) {
      toastError(err);
    }
  };

  const params = [
    { campo: "number",      tipo: "string",  obrigatorio: true,  desc: "ID do grupo WhatsApp (somente dígitos, sem traços ou @). Ex: 120363404386455482" },
    { campo: "body",        tipo: "string",  obrigatorio: true,  desc: "Texto da mensagem a ser enviada ao grupo." },
    { campo: "whatsappId",  tipo: "number",  obrigatorio: true,  desc: "ID da conexão WhatsApp que enviará a mensagem. Visível na tela de Canais (ex: ID: 12)." },
    { campo: "noRegister",  tipo: "boolean", obrigatorio: true,  desc: 'Deve ser true para grupos. Envia direto sem criar ticket. Obrigatório para grupos.' },
    { campo: "userId",      tipo: "number",  obrigatorio: false, desc: "ID do usuário responsável (opcional, para registro no ticket)." },
    { campo: "queueId",     tipo: "number",  obrigatorio: false, desc: "ID da fila de atendimento (opcional)." }
  ];

  return (
    <Paper className={classes.mainPaper} style={{ marginLeft: "5px" }} variant="outlined">
      {/* Header */}
      <Box display="flex" alignItems="center" mb={2} gap={8}>
        <Button startIcon={<ReplyIcon />} onClick={() => history.push("/documentacao")}>
          Voltar
        </Button>
        <Box>
          <Typography variant="h5">API de Mensagem em Grupo</Typography>
          <Typography variant="body2" color="textSecondary">
            Envie mensagens para grupos WhatsApp via API autenticada pelo token do canal.
          </Typography>
        </Box>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Autenticação */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Autenticação</strong></Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Use o <strong>token do canal WhatsApp</strong> (visível ao editar a conexão em Canais). Diferente do token da empresa.
        </Typography>
        <div className={classes.codeBlock}>
          {`Authorization: Bearer <token_do_canal_whatsapp>`}
        </div>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Como obter os IDs */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Como obter os IDs</strong></Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          • <strong>whatsappId:</strong> Acesse <strong>Canais</strong>. O ID aparece ao lado do nome: <code>gabiaa · ID: 12</code>
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          • <strong>number (ID do grupo):</strong> O ID do grupo tem 18+ dígitos e pode ser obtido pelo próprio WhatsApp ou consultando os grupos via wbot.
        </Typography>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Aviso importante */}
      <Box className={classes.alertBox} mb={3}>
        <Typography variant="body2" style={{ color: "#854d0e" }}>
          ⚠️ <strong>Importante:</strong> Para envio em grupos, o campo <code>noRegister: true</code> é <strong>obrigatório</strong>. Sem ele, o sistema tenta validar o número de grupo como contato e a requisição não responde.
        </Typography>
      </Box>

      {/* Endpoint */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Endpoint</strong></Typography>
        <Box display="flex" alignItems="center" gap={8} mb={1}>
          <Chip
            label="POST"
            size="small"
            style={{ background: "#dcfce7", color: "#166534", fontWeight: 700, fontFamily: "monospace", minWidth: 58 }}
          />
          <Typography variant="body2" style={{ fontFamily: "monospace" }}>/api/messages/send</Typography>
          <Typography variant="body2" color="textSecondary">— Envia mensagem para grupo ou contato.</Typography>
        </Box>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Parâmetros */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Parâmetros do body</strong></Typography>
        {params.map((p) => (
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

      {/* Exemplo */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom><strong>Exemplo de requisição</strong></Typography>
        <div className={classes.codeBlock}>
          {`POST /api/messages/send
Authorization: Bearer <token_do_canal_whatsapp>
Content-Type: application/json

{
  "number": "120363404386455482",
  "body": "Olá pessoal! Mensagem enviada via API.",
  "whatsappId": 12,
  "noRegister": true
}`}
        </div>
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
          Resposta de sucesso (200):
        </Typography>
        <div className={classes.codeBlock}>
          {`{
  "status": "SUCCESS"
}`}
        </div>
      </Box>

      <Divider style={{ marginBottom: 24 }} />

      {/* Testar */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Testar — Enviar mensagem para grupo</Typography>
        <Formik
          initialValues={{
            token: "",
            number: "",
            body: "",
            whatsappId: ""
          }}
          onSubmit={handleSendGroupMessage}
        >
          {({ isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field as={TextField} label="Token do Canal WhatsApp (Bearer)" name="token" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={8}>
                  <Field as={TextField} label="ID do Grupo (somente dígitos)" name="number" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field as={TextField} label="WhatsApp ID (Canal)" name="whatsappId" variant="outlined" margin="dense" fullWidth required />
                </Grid>
                <Grid item xs={12}>
                  <Field as={TextField} label="Mensagem" name="body" variant="outlined" margin="dense" fullWidth multiline rows={3} required />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button type="submit" variant="contained" color="primary" startIcon={isSubmitting ? <CircularProgress size={18} /> : <SendIcon />} disabled={isSubmitting}>
                    Enviar para Grupo
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

export default ApiGrupoPage;
