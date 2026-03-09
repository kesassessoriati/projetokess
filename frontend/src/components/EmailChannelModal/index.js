import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  CircularProgress
} from "@material-ui/core";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const initialState = {
  name: "",
  status: "CONNECTED",
  emailAddress: "",
  emailDisplayName: "",
  emailSignature: "",
  emailUseCompanySmtp: true,
  emailSmtpHost: "",
  emailSmtpPort: 587,
  emailSmtpSecure: false,
  emailSmtpUser: "",
  emailSmtpPassword: "",
  emailImapHost: "",
  emailImapPort: 993,
  emailImapSecure: true,
  emailImapUser: "",
  emailImapPassword: "",
  emailSyncEnabled: true
};

const EmailChannelModal = ({ open, onClose, emailChannelId }) => {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!emailChannelId) {
      setState(initialState);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/email-channels/${emailChannelId}`);
        setState({
          ...initialState,
          ...data,
          emailImapPassword: "",
          emailSmtpPassword: ""
        });
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, emailChannelId]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setState(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (emailChannelId) {
        await api.put(`/email-channels/${emailChannelId}`, state);
        toast.success("Canal de e-mail atualizado.");
      } else {
        await api.post("/email-channels", state);
        toast.success("Canal de e-mail criado.");
      }
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{emailChannelId ? "Editar canal de e-mail" : "Novo canal de e-mail"}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <CircularProgress />
          </div>
        ) : (
          <form id="email-channel-form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="name" label="Nome do canal" value={state.name} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="emailAddress" label="E-mail do canal" value={state.emailAddress} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="emailDisplayName" label="Nome exibicao do remetente" value={state.emailDisplayName} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="status" label="Status" value={state.status} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} name="emailSignature" label="Assinatura" value={state.emailSignature} onChange={handleChange} />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch checked={state.emailUseCompanySmtp} onChange={handleChange} name="emailUseCompanySmtp" color="primary" />}
                  label="Usar SMTP da empresa (configurado na tela SMTP)"
                />
              </Grid>

              {!state.emailUseCompanySmtp && (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth name="emailSmtpHost" label="SMTP host" value={state.emailSmtpHost} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField fullWidth name="emailSmtpPort" label="SMTP porta" type="number" value={state.emailSmtpPort} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth name="emailSmtpUser" label="SMTP usuario" value={state.emailSmtpUser} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth name="emailSmtpPassword" label="SMTP senha" type="password" value={state.emailSmtpPassword} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={<Switch checked={state.emailSmtpSecure} onChange={handleChange} name="emailSmtpSecure" color="primary" />}
                      label="SMTP seguro (SSL/TLS)"
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} sm={4}>
                <TextField fullWidth name="emailImapHost" label="IMAP host" value={state.emailImapHost} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField fullWidth name="emailImapPort" label="IMAP porta" type="number" value={state.emailImapPort} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth name="emailImapUser" label="IMAP usuario" value={state.emailImapUser} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth name="emailImapPassword" label="IMAP senha" type="password" value={state.emailImapPassword} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={<Switch checked={state.emailImapSecure} onChange={handleChange} name="emailImapSecure" color="primary" />}
                  label="IMAP seguro (SSL/TLS)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={<Switch checked={state.emailSyncEnabled} onChange={handleChange} name="emailSyncEnabled" color="primary" />}
                  label="Sincronizacao de caixa de entrada ativa"
                />
              </Grid>
            </Grid>
          </form>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="email-channel-form" color="primary" variant="contained" disabled={saving || loading}>
          {saving ? <CircularProgress size={20} color="inherit" /> : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailChannelModal;

