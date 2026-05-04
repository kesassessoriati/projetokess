import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography
} from "@material-ui/core";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const defaultConfig = {
  baseUrl: "",
  sendMethod: "POST",
  sendPath: "/send",
  contentType: "application/json",
  timeoutMs: 30000,
  authType: "none",
  credentials: {},
  headers: [{ key: "Content-Type", value: "application/json" }],
  queryParams: [],
  bodyTemplate: `{
  "to": "\${contact.externalId}",
  "name": "\${contact.name}",
  "message": "\${message.body}",
  "ticketId": "\${ticket.id}"
}`,
  responseIdPath: "id",
  responseSuccessPath: "ok"
};

const initialState = {
  name: "",
  universalConfig: defaultConfig
};

const safeJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
};

const UniversalHttpChannelModal = ({ open, onClose, channelId }) => {
  const [state, setState] = useState(initialState);
  const [headersText, setHeadersText] = useState(JSON.stringify(defaultConfig.headers, null, 2));
  const [queryText, setQueryText] = useState("[]");
  const [credentialsText, setCredentialsText] = useState("{}");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (!channelId) {
      setState(initialState);
      setHeadersText(JSON.stringify(defaultConfig.headers, null, 2));
      setQueryText("[]");
      setCredentialsText("{}");
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/whatsapp/${channelId}?session=0`);
        const config = { ...defaultConfig, ...(data.universalConfig || {}) };
        setState({ name: data.name || "", universalConfig: config });
        setHeadersText(JSON.stringify(config.headers || [], null, 2));
        setQueryText(JSON.stringify(config.queryParams || [], null, 2));
        setCredentialsText(JSON.stringify(config.credentials || {}, null, 2));
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, channelId]);

  const handleConfigChange = event => {
    const { name, value } = event.target;
    setState(prev => ({
      ...prev,
      universalConfig: {
        ...prev.universalConfig,
        [name]: name === "timeoutMs" ? Number(value || 0) : value
      }
    }));
  };

  const handleSubmit = async event => {
    event.preventDefault();

    const headers = safeJson(headersText, null);
    const queryParams = safeJson(queryText, null);
    const credentials = safeJson(credentialsText, null);
    if (!Array.isArray(headers) || !Array.isArray(queryParams) || !credentials) {
      toast.error("Headers, parametros e credenciais precisam estar em JSON valido.");
      return;
    }

    const payload = {
      name: state.name,
      channel: "http",
      status: "CONNECTED",
      provider: "http",
      universalConfig: {
        ...state.universalConfig,
        headers,
        queryParams,
        credentials
      }
    };

    try {
      if (channelId) {
        await api.put(`/whatsapp/${channelId}`, payload);
      } else {
        await api.post("/whatsapp", payload);
      }
      toast.success("Canal HTTP Request salvo com sucesso.");
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{channelId ? "Editar canal HTTP Request" : "Novo canal HTTP Request"}</DialogTitle>
      <DialogContent>
        <form id="universal-http-channel-form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary">
                Use variaveis como ${"{contact.externalId}"}, ${"{contact.name}"}, ${"{message.body}"}, ${"{ticket.id}"} e ${"{credentials.token}"}.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Nome da conexao" value={state.name} onChange={event => setState(prev => ({ ...prev, name: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="URL Base" name="baseUrl" value={state.universalConfig.baseUrl} onChange={handleConfigChange} placeholder="https://api.exemplo.com" />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField select fullWidth label="Metodo" name="sendMethod" value={state.universalConfig.sendMethod} onChange={handleConfigChange}>
                {["POST", "PUT", "PATCH"].map(method => <MenuItem key={method} value={method}>{method}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField fullWidth label="Endpoint de envio" name="sendPath" value={state.universalConfig.sendPath} onChange={handleConfigChange} placeholder="/send" />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField fullWidth label="Timeout" name="timeoutMs" type="number" value={state.universalConfig.timeoutMs} onChange={handleConfigChange} />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField select fullWidth label="Auth" name="authType" value={state.universalConfig.authType} onChange={handleConfigChange}>
                <MenuItem value="none">Nenhuma</MenuItem>
                <MenuItem value="bearer">Bearer</MenuItem>
                <MenuItem value="basic">Basic</MenuItem>
                <MenuItem value="apiKey">API Key</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={8} label="Template do body" name="bodyTemplate" value={state.universalConfig.bodyTemplate} onChange={handleConfigChange} variant="outlined" />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth multiline minRows={5} label="Headers JSON" value={headersText} onChange={event => setHeadersText(event.target.value)} variant="outlined" />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth multiline minRows={5} label="Parametros de query JSON" value={queryText} onChange={event => setQueryText(event.target.value)} variant="outlined" />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth multiline minRows={5} label="Credenciais JSON" value={credentialsText} onChange={event => setCredentialsText(event.target.value)} variant="outlined" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Caminho do ID da resposta" name="responseIdPath" value={state.universalConfig.responseIdPath} onChange={handleConfigChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Caminho do sucesso" name="responseSuccessPath" value={state.universalConfig.responseSuccessPath} onChange={handleConfigChange} />
            </Grid>
          </Grid>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="universal-http-channel-form" color="primary" variant="contained" disabled={loading}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UniversalHttpChannelModal;
