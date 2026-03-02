import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import {
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Select,
  InputLabel,
  MenuItem,
  FormControl,
  TextField,
  Grid,
  Paper,
  Slide,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  Box
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { green, blue, red, orange } from "@material-ui/core/colors";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TranslateIcon from '@mui/icons-material/Translate';
import DescriptionIcon from '@mui/icons-material/Description';
import WebhookIcon from '@mui/icons-material/Webhook';
import LinkIcon from '@mui/icons-material/Link';
import TimerIcon from '@mui/icons-material/Timer';
import ScheduleIcon from '@mui/icons-material/Schedule';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import MessageIcon from '@mui/icons-material/Message';
import CodeIcon from '@mui/icons-material/Code';
import Draggable from 'react-draggable';

// Definindo a transição de Slide
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  btnLeft: {
    display: "flex",
    marginRight: "auto",
    marginLeft: 12,
  },
  colorAdorment: {
    width: 20,
    height: 20,
  },
  dialogTitle: {
    background: "#3f51b5",
    color: "white",
    padding: theme.spacing(2),
    cursor: 'move',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
  },
  dialogContent: {
    backgroundColor: "#f5f5f5",
    padding: theme.spacing(3),
  },
  dialogActions: {
    backgroundColor: "#f5f5f5",
    padding: theme.spacing(2),
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px',
  },
  buttonSave: {
    backgroundColor: green[500],
    color: "white",
    "&:hover": {
      backgroundColor: green[700],
    },
  },
  buttonCancel: {
    backgroundColor: red[500],
    color: "white",
    "&:hover": {
      backgroundColor: red[700],
    },
  },
  buttonTest: {
    backgroundColor: orange[500],
    color: "white",
    "&:hover": {
      backgroundColor: orange[700],
    },
  },
  paperComponent: {
    borderRadius: '8px',
    overflow: 'hidden',
  },
}));

const DialogflowSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Obrigatório"),
});

// ── Eventos disponíveis para n8n/webhook ──────────────────────────────────
const WEBHOOK_EVENT_GROUPS = [
  {
    group: "Mensagens",
    events: [
      { key: "MESSAGE_RECEIVED", label: "Nova mensagem recebida" }
    ]
  },
  {
    group: "Conversas",
    events: [
      { key: "TICKET_CREATED", label: "Nova conversa criada" },
      { key: "TICKET_ASSIGNED", label: "Conversa atribuída a agente" },
      { key: "TICKET_QUEUE_CHANGED", label: "Conversa transferida de fila" },
      { key: "TICKET_RESOLVED", label: "Conversa resolvida" },
      { key: "TICKET_CLOSED", label: "Conversa encerrada" }
    ]
  },
  {
    group: "Contatos",
    events: [
      { key: "CONTACT_CREATED", label: "Novo contato criado" }
    ]
  },
  {
    group: "CRM – Leads",
    events: [
      { key: "LEAD_CREATED", label: "Lead criado" },
      { key: "LEAD_UPDATED", label: "Lead atualizado" },
      { key: "LEAD_STATUS_CHANGED", label: "Status do lead alterado" },
      { key: "LEAD_CONVERTED", label: "Lead convertido em cliente" },
      { key: "LEAD_LOST", label: "Lead marcado como perdido" }
    ]
  },
  {
    group: "CRM – Oportunidades",
    events: [
      { key: "OPPORTUNITY_CREATED", label: "Oportunidade criada" },
      { key: "OPPORTUNITY_MOVED", label: "Oportunidade movida no pipeline" },
      { key: "OPPORTUNITY_WON", label: "Oportunidade ganha" },
      { key: "OPPORTUNITY_LOST", label: "Oportunidade perdida" }
    ]
  }
];

const QueueIntegration = ({ open, onClose, integrationId }) => {
  const classes = useStyles();

  const initialState = {
    type: "typebot",
    name: "",
    projectName: "",
    jsonContent: "",
    language: "",
    urlN8N: "",
    typebotDelayMessage: 1000,
    typebotExpires: 1,
    typebotKeywordFinish: "",
    typebotKeywordRestart: "",
    typebotRestartMessage: "",
    typebotSlug: "",
    typebotUnknownMessage: "",
    promptId: "",
    webhookEvents: [],
  };

  const [integration, setIntegration] = useState(initialState);
  const [prompts, setPrompts] = useState([]);

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const { data } = await api.get("/prompt");
        setPrompts(data.prompts || data || []);
      } catch (err) {
        console.error("Erro ao carregar agentes de IA:", err);
      }
    };
    if (open) fetchPrompts();
  }, [open]);

  useEffect(() => {
    (async () => {
      if (!integrationId) return;
      try {
        const { data } = await api.get(`/queueIntegration/${integrationId}`);
        setIntegration((prevState) => {
          return { ...prevState, ...data };
        });
      } catch (err) {
        toastError(err);
      }
    })();

    return () => {
      setIntegration({
        type: "dialogflow",
        name: "",
        projectName: "",
        jsonContent: "",
        language: "",
        urlN8N: "",
        typebotDelayMessage: 1000,
        promptId: "",
      });
    };
  }, [integrationId, open]);

  const handleClose = () => {
    onClose();
    setIntegration(initialState);
  };

  const handleTestSession = async (event, values) => {
    try {
      const { projectName, jsonContent, language } = values;

      await api.post(`/queueIntegration/testSession`, {
        projectName,
        jsonContent,
        language,
      });

      toast.success(i18n.t("queueIntegrationModal.messages.testSuccess"));
    } catch (err) {
      toastError(err);
    }
  };

  const handleSaveDialogflow = async (values) => {
    try {
      if (values.type === 'n8n' || values.type === 'webhook' || values.type === 'typebot' || values.type === "flowbuilder" || values.type === "openai") values.projectName = values.name;
      if (integrationId) {
        await api.put(`/queueIntegration/${integrationId}`, values);
        toast.success(i18n.t("queueIntegrationModal.messages.editSuccess"));
      } else {
        await api.post("/queueIntegration", values);
        toast.success(i18n.t("queueIntegrationModal.messages.addSuccess"));
      }
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        scroll="paper"
        disableBackdropClick
        disableEscapeKeyDown
        TransitionComponent={Transition}
        PaperProps={{
          className: classes.paperComponent
        }}
        PaperComponent={(props) => (
          <Draggable
            handle=".dialog-title"
            cancel="[class*='MuiDialogContent-root'], [class*='MuiDialogActions-root']"
          >
            <div {...props} />
          </Draggable>
        )}
      >
        <DialogTitle className={`${classes.dialogTitle} dialog-title`}>
          {integrationId
            ? `${i18n.t("queueIntegrationModal.title.edit")}`
            : `${i18n.t("queueIntegrationModal.title.add")}`}
        </DialogTitle>
        <Formik
          initialValues={integration}
          enableReinitialize={true}
          validationSchema={DialogflowSchema}
          onSubmit={(values, actions, event) => {
            setTimeout(() => {
              handleSaveDialogflow(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ touched, errors, isSubmitting, values, setFieldValue }) => (
            <Form>
              <Paper square className={classes.mainPaper} elevation={1}>
                <DialogContent dividers className={classes.dialogContent}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={6} xl={6}>
                      <FormControl
                        variant="outlined"
                        className={classes.formControl}
                        margin="dense"
                        fullWidth
                      >
                        <InputLabel id="type-selection-input-label">
                          {i18n.t("queueIntegrationModal.form.type")}
                        </InputLabel>

                        <Field
                          as={Select}
                          label={i18n.t("queueIntegrationModal.form.type")}
                          name="type"
                          labelId="profile-selection-label"
                          error={touched.type && Boolean(errors.type)}
                          helpertext={touched.type && errors.type}
                          id="type"
                          required
                          startAdornment={
                            <InputAdornment position="start">
                              <AccountTreeIcon />
                            </InputAdornment>
                          }
                        >
                          <MenuItem value="dialogflow">DialogFlow</MenuItem>
                          <MenuItem value="n8n">N8N</MenuItem>
                          <MenuItem value="webhook">WebHooks</MenuItem>
                          <MenuItem value="typebot">Typebot</MenuItem>
                          <MenuItem value="flowbuilder">Flowbuilder</MenuItem>
                          <MenuItem value="openai">ChatGPT / OpenAI</MenuItem>
                        </Field>
                      </FormControl>
                    </Grid>
                    {values.type === "dialogflow" && (
                      <>
                        <Grid item xs={12} md={6} xl={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.name")}
                            autoFocus
                            name="name"
                            fullWidth
                            error={touched.name && Boolean(errors.name)}
                            helpertext={touched.name && errors.name}
                            variant="outlined"
                            margin="dense"
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <DescriptionIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6} xl={6}>
                          <FormControl
                            variant="outlined"
                            className={classes.formControl}
                            margin="dense"
                            fullWidth
                          >
                            <InputLabel id="language-selection-input-label">
                              {i18n.t("queueIntegrationModal.form.language")}
                            </InputLabel>

                            <Field
                              as={Select}
                              label={i18n.t("queueIntegrationModal.form.language")}
                              name="language"
                              labelId="profile-selection-label"
                              fullWidth
                              error={touched.language && Boolean(errors.language)}
                              helpertext={touched.language && errors.language}
                              id="language-selection"
                              required
                              startAdornment={
                                <InputAdornment position="start">
                                  <TranslateIcon />
                                </InputAdornment>
                              }
                            >
                              <MenuItem value="pt-BR">Portugues</MenuItem>
                              <MenuItem value="en">Inglês</MenuItem>
                              <MenuItem value="es">Español</MenuItem>
                            </Field>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6} xl={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.projectName")}
                            name="projectName"
                            error={touched.projectName && Boolean(errors.projectName)}
                            helpertext={touched.projectName && errors.projectName}
                            fullWidth
                            variant="outlined"
                            margin="dense"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <AccountTreeIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={12} xl={12}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.jsonContent")}
                            type="jsonContent"
                            multiline
                            maxRows={5}
                            minRows={5}
                            fullWidth
                            name="jsonContent"
                            error={touched.jsonContent && Boolean(errors.jsonContent)}
                            helpertext={touched.jsonContent && errors.jsonContent}
                            variant="outlined"
                            margin="dense"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <CodeIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                      </>
                    )}

                    {(values.type === "n8n" || values.type === "webhook") && (
                      <>
                        <Grid item xs={12} md={6} xl={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.name")}
                            autoFocus
                            required
                            name="name"
                            error={touched.name && Boolean(errors.name)}
                            helpertext={touched.name && errors.name}
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <DescriptionIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={12} xl={12}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.urlN8N")}
                            name="urlN8N"
                            error={touched.urlN8N && Boolean(errors.urlN8N)}
                            helpertext={touched.urlN8N && errors.urlN8N}
                            variant="outlined"
                            margin="dense"
                            required
                            fullWidth
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <WebhookIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>

                        {/* Seleção de Eventos */}
                        <Grid item xs={12}>
                          <Box
                            mt={1}
                            p={2}
                            style={{
                              border: "1px solid #e0e0e0",
                              borderRadius: 8,
                              backgroundColor: "#fff"
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              style={{
                                fontWeight: 700,
                                marginBottom: 8,
                                color: "#3f51b5",
                                display: "flex",
                                alignItems: "center",
                                gap: 6
                              }}
                            >
                              <WebhookIcon fontSize="small" />
                              Eventos para receber neste webhook
                            </Typography>
                            <Typography
                              variant="caption"
                              style={{ color: "#757575", display: "block", marginBottom: 12 }}
                            >
                              Selecione quais eventos serão enviados para a URL acima. Deixar sem seleção desativa os eventos (modo chatbot via fila).
                            </Typography>

                            {WEBHOOK_EVENT_GROUPS.map((group) => (
                              <Box key={group.group} mb={1.5}>
                                <Typography
                                  variant="caption"
                                  style={{
                                    fontWeight: 600,
                                    color: "#555",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px"
                                  }}
                                >
                                  {group.group}
                                </Typography>
                                <FormGroup row style={{ marginTop: 2 }}>
                                  {group.events.map((evt) => (
                                    <FormControlLabel
                                      key={evt.key}
                                      control={
                                        <Checkbox
                                          size="small"
                                          checked={
                                            Array.isArray(values.webhookEvents) &&
                                            values.webhookEvents.includes(evt.key)
                                          }
                                          onChange={(e) => {
                                            const current = Array.isArray(values.webhookEvents)
                                              ? values.webhookEvents
                                              : [];
                                            const next = e.target.checked
                                              ? [...current, evt.key]
                                              : current.filter((k) => k !== evt.key);
                                            setFieldValue("webhookEvents", next);
                                          }}
                                          color="primary"
                                          style={{ padding: "2px 6px" }}
                                        />
                                      }
                                      label={
                                        <Typography variant="body2" style={{ fontSize: 13 }}>
                                          {evt.label}
                                        </Typography>
                                      }
                                      style={{ marginRight: 16, marginBottom: 2 }}
                                    />
                                  ))}
                                </FormGroup>
                                <Divider style={{ marginTop: 6 }} />
                              </Box>
                            ))}
                          </Box>
                        </Grid>
                      </>
                    )}

                    {(values.type === "flowbuilder") && (
                      <Grid item xs={12} md={6} xl={6}>
                        <Field
                          as={TextField}
                          label={i18n.t("queueIntegrationModal.form.name")}
                          autoFocus
                          name="name"
                          fullWidth
                          error={touched.name && Boolean(errors.name)}
                          helpertext={touched.name && errors.name}
                          variant="outlined"
                          margin="dense"
                          className={classes.textField}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <AccountTreeIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                    )}

                    {(values.type === "openai") && (
                      <>
                        <Grid item xs={12} md={6} xl={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.name")}
                            autoFocus
                            name="name"
                            fullWidth
                            error={touched.name && Boolean(errors.name)}
                            helpertext={touched.name && errors.name}
                            variant="outlined"
                            margin="dense"
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <DescriptionIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6} xl={6}>
                          <FormControl
                            variant="outlined"
                            className={classes.formControl}
                            margin="dense"
                            fullWidth
                          >
                            <InputLabel id="prompt-selection-label">
                              Agente de IA (Prompt)
                            </InputLabel>
                            <Field
                              as={Select}
                              label="Agente de IA (Prompt)"
                              name="promptId"
                              labelId="prompt-selection-label"
                              id="promptId"
                              required
                              startAdornment={
                                <InputAdornment position="start">
                                  <AccountTreeIcon />
                                </InputAdornment>
                              }
                            >
                              {prompts.map((prompt) => (
                                <MenuItem key={prompt.id} value={prompt.id}>
                                  {prompt.name}
                                </MenuItem>
                              ))}
                            </Field>
                          </FormControl>
                        </Grid>
                      </>
                    )}
                    {(values.type === "typebot") && (
                      <>
                        <Grid item xs={12} md={6} xl={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.name")}
                            autoFocus
                            name="name"
                            error={touched.name && Boolean(errors.name)}
                            helpertext={touched.name && errors.name}
                            variant="outlined"
                            margin="dense"
                            required
                            fullWidth
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <DescriptionIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={12} xl={12}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.urlN8N")}
                            name="urlN8N"
                            error={touched.urlN8N && Boolean(errors.urlN8N)}
                            helpertext={touched.urlN8N && errors.urlN8N}
                            variant="outlined"
                            margin="dense"
                            required
                            fullWidth
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <LinkIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6} xl={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.typebotSlug")}
                            name="typebotSlug"
                            error={touched.typebotSlug && Boolean(errors.typebotSlug)}
                            helpertext={touched.typebotSlug && errors.typebotSlug}
                            required
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <AccountTreeIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6} xl={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.typebotExpires")}
                            name="typebotExpires"
                            error={touched.typebotExpires && Boolean(errors.typebotExpires)}
                            helpertext={touched.typebotExpires && errors.typebotExpires}
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <ScheduleIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6} xl={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.typebotDelayMessage")}
                            name="typebotDelayMessage"
                            error={touched.typebotDelayMessage && Boolean(errors.typebotDelayMessage)}
                            helpertext={touched.typebotDelayMessage && errors.typebotDelayMessage}
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <TimerIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6} xl={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.typebotKeywordFinish")}
                            name="typebotKeywordFinish"
                            error={touched.typebotKeywordFinish && Boolean(errors.typebotKeywordFinish)}
                            helpertext={touched.typebotKeywordFinish && errors.typebotKeywordFinish}
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <RestartAltIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6} xl={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.typebotKeywordRestart")}
                            name="typebotKeywordRestart"
                            error={touched.typebotKeywordRestart && Boolean(errors.typebotKeywordRestart)}
                            helpertext={touched.typebotKeywordRestart && errors.typebotKeywordRestart}
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <RestartAltIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6} xl={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.typebotUnknownMessage")}
                            name="typebotUnknownMessage"
                            error={touched.typebotUnknownMessage && Boolean(errors.typebotUnknownMessage)}
                            helpertext={touched.typebotUnknownMessage && errors.typebotUnknownMessage}
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <MessageIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={12} xl={12}>
                          <Field
                            as={TextField}
                            label={i18n.t("queueIntegrationModal.form.typebotRestartMessage")}
                            name="typebotRestartMessage"
                            error={touched.typebotRestartMessage && Boolean(errors.typebotRestartMessage)}
                            helpertext={touched.typebotRestartMessage && errors.typebotRestartMessage}
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            className={classes.textField}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <MessageIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </DialogContent>
              </Paper>

              <DialogActions className={classes.dialogActions}>
                {values.type === "dialogflow" && (
                  <Button
                    startIcon={<SettingsIcon />}
                    onClick={(e) => handleTestSession(e, values)}
                    style={{
                      color: "white",
                      backgroundColor: "#4ec24e",
                      boxShadow: "none",
                      borderRadius: "5px",
                      fontSize: "12px",
                    }}
                    disabled={isSubmitting}
                    name="testSession"
                    variant="contained"
                  >
                    {i18n.t("queueIntegrationModal.buttons.test")}
                  </Button>
                )}
                <Button
                  startIcon={<CancelIcon />}
                  onClick={handleClose}
                  style={{
                    color: "white",
                    backgroundColor: "#db6565",
                    boxShadow: "none",
                    borderRadius: "5px",
                    fontSize: "12px",
                  }}
                  disabled={isSubmitting}
                  variant="contained"
                >
                  {i18n.t("queueIntegrationModal.buttons.cancel")}
                </Button>
                <Button
                  startIcon={<SaveIcon />}
                  type="submit"
                  style={{
                    color: "white",
                    backgroundColor: "#437db5",
                    boxShadow: "none",
                    borderRadius: "5px",
                    fontSize: "12px",
                  }}
                  disabled={isSubmitting}
                  variant="contained"
                >
                  {integrationId
                    ? `${i18n.t("queueIntegrationModal.buttons.okEdit")}`
                    : `${i18n.t("queueIntegrationModal.buttons.okAdd")}`}
                  {isSubmitting && (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default QueueIntegration;