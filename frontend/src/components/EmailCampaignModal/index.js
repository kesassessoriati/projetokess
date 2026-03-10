import React, { useState, useEffect, useRef, useContext } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import { green, blue, red } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import { Slide, Typography, InputAdornment, FormControl, InputLabel, Select, MenuItem, Grid, Chip } from "@material-ui/core";
import CancelIcon from "@mui/icons-material/Cancel";
import SaveIcon from "@mui/icons-material/Save";
import EmailIcon from "@mui/icons-material/Email";
import SubjectIcon from "@mui/icons-material/Subject";
import PeopleIcon from "@mui/icons-material/People";
import ScheduleIcon from "@mui/icons-material/Schedule";
import WarningIcon from "@mui/icons-material/Warning";
import Draggable from "react-draggable";
import Paper from "@material-ui/core/Paper";
import moment from "moment";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const DraggablePaper = (props) => (
  <Draggable handle="#email-campaign-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
    <Paper {...props} />
  </Draggable>
);

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    borderRadius: "8px",
    boxShadow: "0px 8px 40px rgba(0, 212, 255, 0.12), 0px 4px 16px rgba(0, 0, 0, 0.5)",
    background: "#ffffff",
    minWidth: "560px",
    maxWidth: "780px",
  },
  dialogTitle: {
    backgroundColor: "#0a0a0a",
    borderBottom: "2px solid #00d4ff",
    color: "white",
    padding: "16px 24px",
    borderRadius: "8px 8px 0 0",
    fontSize: "1.2rem",
    fontWeight: 600,
    cursor: "move",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  dialogContent: {
    padding: "24px",
    background: "#f9fafc",
  },
  dialogActions: {
    padding: "16px 24px",
    background: "#f5f7fa",
    borderRadius: "0 0 8px 8px",
    display: "flex",
    justifyContent: "space-between",
  },
  cancelButton: {
    backgroundColor: red[500],
    color: "white",
    "&:hover": { backgroundColor: red[700] },
    borderRadius: "8px",
    textTransform: "none",
    fontWeight: 500,
    boxShadow: "none",
  },
  saveButton: {
    backgroundColor: blue[500],
    color: "white",
    "&:hover": { backgroundColor: blue[700] },
    borderRadius: "8px",
    textTransform: "none",
    fontWeight: 500,
    boxShadow: "none",
  },
  btnWrapper: { position: "relative" },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  field: {
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      "& fieldset": { borderColor: "#e0e0e0" },
      "&:hover fieldset": { borderColor: "#00d4ff" },
      "&.Mui-focused fieldset": { borderColor: "#00d4ff", borderWidth: "1px" },
    },
    "& .MuiInputLabel-root.Mui-focused": { color: "#00d4ff" },
  },
  smtpWarning: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    backgroundColor: "#fff3cd",
    border: "1px solid #ffc107",
    borderRadius: "8px",
    padding: "10px 14px",
    marginBottom: theme.spacing(2),
    color: "#856404",
    fontSize: "0.875rem",
  },
  statusChip: {
    margin: theme.spacing(0.5),
  },
  bodyField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      fontFamily: "monospace",
      fontSize: "0.85rem",
    },
  },
  helperHtml: {
    fontSize: "0.75rem",
    color: "#666",
    marginTop: 4,
  },
}));

const EmailCampaignSchema = Yup.object().shape({
  name: Yup.string().min(3, "Mínimo 3 caracteres").required("Nome obrigatório"),
  emailSubject: Yup.string().min(2, "Mínimo 2 caracteres").required("Assunto obrigatório"),
  emailBody: Yup.string().min(5, "Corpo do e-mail obrigatório").required("Corpo obrigatório"),
  contactListId: Yup.number().required("Selecione uma lista de contatos"),
});

const EmailCampaignModal = ({ open, onClose, campaignId, onSave }) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const { user } = useContext(AuthContext);
  const { companyId } = user;

  const initialState = {
    name: "",
    status: "INATIVA",
    scheduledAt: "",
    contactListId: "",
    emailSubject: "",
    emailBody: "",
    campaignType: "email",
    companyId,
  };

  const [campaign, setCampaign] = useState(initialState);
  const [contactLists, setContactLists] = useState([]);
  const [smtpConfigured, setSmtpConfigured] = useState(true);
  const [campaignEditable, setCampaignEditable] = useState(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!open) return;

    // Verificar se SMTP está configurado
    api.get("/smtp").then(({ data }) => {
      setSmtpConfigured(!!(data && data.host && data.user));
    }).catch(() => setSmtpConfigured(false));

    // Carregar listas de contatos
    api.get("/contact-lists/", { params: { companyId } }).then(({ data }) => {
      if (isMounted.current) {
        setContactLists(data.records ? data.records : data);
      }
    }).catch((err) => console.error(err));

    if (!campaignId) {
      setCampaign(initialState);
      return;
    }

    api.get(`/campaigns/${campaignId}`).then(({ data }) => {
      if (!isMounted.current) return;
      setCampaign((prev) => {
        const updated = { ...prev };
        Object.entries(data).forEach(([key, value]) => {
          if (key === "scheduledAt" && value !== "" && value !== null) {
            updated[key] = moment(value).format("YYYY-MM-DDTHH:mm");
          } else {
            updated[key] = value === null ? "" : value;
          }
        });
        return updated;
      });
    });
  }, [campaignId, open, companyId]);

  useEffect(() => {
    const now = moment();
    const scheduledAt = moment(campaign.scheduledAt);
    const moreThanAnHour =
      !Number.isNaN(scheduledAt.diff(now)) && scheduledAt.diff(now, "hour") > 1;
    const isEditable =
      campaign.status === "INATIVA" ||
      (campaign.status === "PROGRAMADA" && moreThanAnHour);
    setCampaignEditable(isEditable);
  }, [campaign.status, campaign.scheduledAt]);

  const handleClose = () => {
    onClose();
    setCampaign(initialState);
  };

  const handleSave = async (values) => {
    try {
      const payload = {
        ...values,
        campaignType: "email",
        companyId,
      };

      if (payload.scheduledAt && payload.scheduledAt !== "") {
        payload.scheduledAt = moment(payload.scheduledAt).format("YYYY-MM-DD HH:mm:ss");
      } else {
        payload.scheduledAt = null;
      }

      if (campaignId) {
        await api.put(`/campaigns/${campaignId}`, payload);
      } else {
        const { data } = await api.post("/campaigns", payload);
        if (onSave) onSave(data);
      }
      toast.success("Disparo de e-mail salvo com sucesso!");
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  const statusLabel = {
    INATIVA: { label: "Inativa", color: "default" },
    PROGRAMADA: { label: "Agendada", color: "primary" },
    EM_ANDAMENTO: { label: "Em andamento", color: "secondary" },
    FINALIZADA: { label: "Finalizada", color: "default" },
    CANCELADA: { label: "Cancelada", color: "default" },
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      PaperComponent={DraggablePaper}
      PaperProps={{ className: classes.dialogPaper }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle
        id="email-campaign-dialog-title"
        className={classes.dialogTitle}
        disableTypography
      >
        <EmailIcon style={{ color: "#00d4ff" }} />
        <span>{campaignId ? "Editar Disparo de E-mail" : "Novo Disparo de E-mail"}</span>
        {campaign.status && statusLabel[campaign.status] && (
          <Chip
            size="small"
            label={statusLabel[campaign.status].label}
            color={statusLabel[campaign.status].color}
            className={classes.statusChip}
            style={{ marginLeft: "auto" }}
          />
        )}
      </DialogTitle>

      <Formik
        initialValues={campaign}
        enableReinitialize
        validationSchema={EmailCampaignSchema}
        onSubmit={handleSave}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form>
            <DialogContent className={classes.dialogContent} dividers>
              {/* Aviso SMTP */}
              {!smtpConfigured && (
                <div className={classes.smtpWarning}>
                  <WarningIcon fontSize="small" />
                  <span>
                    <strong>SMTP não configurado.</strong> Configure o servidor de e-mail em{" "}
                    <strong>Configurações → E-mail (SMTP)</strong> antes de disparar.
                  </span>
                </div>
              )}

              <Grid container spacing={2}>
                {/* Nome da campanha */}
                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    name="name"
                    label="Nome do Disparo"
                    variant="outlined"
                    fullWidth
                    className={classes.field}
                    disabled={!campaignEditable}
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon style={{ color: "#00d4ff" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Lista de Contatos */}
                <Grid item xs={12} sm={6}>
                  <FormControl variant="outlined" fullWidth className={classes.field}>
                    <InputLabel>Lista de Contatos *</InputLabel>
                    <Select
                      value={values.contactListId || ""}
                      onChange={(e) => setFieldValue("contactListId", e.target.value)}
                      label="Lista de Contatos *"
                      disabled={!campaignEditable}
                      startAdornment={
                        <InputAdornment position="start">
                          <PeopleIcon style={{ color: "#00d4ff" }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="">
                        <em>Selecione uma lista</em>
                      </MenuItem>
                      {contactLists.map((list) => (
                        <MenuItem key={list.id} value={list.id}>
                          {list.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {touched.contactListId && errors.contactListId && (
                      <Typography variant="caption" color="error" style={{ paddingLeft: 14 }}>
                        {errors.contactListId}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                {/* Agendamento */}
                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    name="scheduledAt"
                    label="Agendamento (opcional)"
                    type="datetime-local"
                    variant="outlined"
                    fullWidth
                    className={classes.field}
                    disabled={!campaignEditable}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ScheduleIcon style={{ color: "#00d4ff" }} />
                        </InputAdornment>
                      ),
                    }}
                    helperText="Deixe em branco para envio imediato ao iniciar."
                  />
                </Grid>

                {/* Assunto */}
                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    name="emailSubject"
                    label="Assunto do E-mail *"
                    variant="outlined"
                    fullWidth
                    className={classes.field}
                    disabled={!campaignEditable}
                    error={touched.emailSubject && Boolean(errors.emailSubject)}
                    helperText={
                      (touched.emailSubject && errors.emailSubject) ||
                      "Use variáveis: {nome}, {numero}, {email}"
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SubjectIcon style={{ color: "#00d4ff" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Corpo do E-mail (HTML) */}
                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    name="emailBody"
                    label="Corpo do E-mail (HTML ou texto) *"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={10}
                    className={classes.bodyField}
                    disabled={!campaignEditable}
                    error={touched.emailBody && Boolean(errors.emailBody)}
                    helperText={touched.emailBody && errors.emailBody}
                  />
                  <div className={classes.helperHtml}>
                    Suporta HTML. Variáveis disponíveis:{" "}
                    <code>{"{nome}"}</code>, <code>{"{numero}"}</code>, <code>{"{email}"}</code>.
                    Exemplo: <code>{"<p>Olá {nome}, temos uma oferta especial!</p>"}</code>
                  </div>
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions className={classes.dialogActions}>
              <Button
                onClick={handleClose}
                variant="contained"
                className={classes.cancelButton}
                startIcon={<CancelIcon />}
              >
                Cancelar
              </Button>
              <div className={classes.btnWrapper}>
                <Button
                  type="submit"
                  variant="contained"
                  className={classes.saveButton}
                  disabled={isSubmitting || !smtpConfigured}
                  startIcon={<SaveIcon />}
                >
                  Salvar
                </Button>
                {isSubmitting && <CircularProgress size={24} className={classes.buttonProgress} />}
              </div>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default EmailCampaignModal;
