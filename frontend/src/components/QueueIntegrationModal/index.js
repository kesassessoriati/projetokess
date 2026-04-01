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
  Box,
  IconButton
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
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
import CloseIcon from "@material-ui/icons/Close";
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
    background: "linear-gradient(135deg, #181818 0%, #080808 100%)",
    cursor: "move",
    padding: 0,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  dialogTitleBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    padding: theme.spacing(2.25, 2.5),
  },
  dialogTitleText: {
    color: "#f8fafc",
    fontSize: "1.1rem",
    fontWeight: 700,
    letterSpacing: "0.01em",
  },
  dialogCloseButton: {
    width: 34,
    height: 34,
    color: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.12)",
      color: "#ffffff",
    },
  },
  dialogContent: {
    backgroundColor: "#ffffff",
    padding: theme.spacing(3),
    "& .MuiFormControl-root": {
      marginTop: 0,
    },
    "& .MuiFormLabel-root": {
      color: "#4b5563",
      fontWeight: 600,
    },
    "& .MuiFormLabel-root.Mui-focused": {
      color: "#111827",
    },
    "& .MuiInputAdornment-root .MuiSvgIcon-root": {
      color: "#111827",
      fontSize: 20,
    },
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      backgroundColor: "#ffffff",
      transition: "box-shadow 0.2s ease, transform 0.2s ease",
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "#cfd6df",
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: "#111827",
      },
      "&.Mui-focused": {
        boxShadow: "0 0 0 4px rgba(15, 23, 42, 0.08)",
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "#111827",
        borderWidth: 1,
      },
    },
  },
  dialogActions: {
    background: "linear-gradient(135deg, #181818 0%, #080808 100%)",
    padding: theme.spacing(2, 2.5),
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.25),
    flexWrap: "wrap",
    "& > :not(:first-child)": {
      marginLeft: 0,
    },
  },
  actionSpacer: {
    flex: 1,
  },
  buttonBase: {
    borderRadius: 11,
    textTransform: "none",
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.2,
    minWidth: 110,
    padding: "8px 16px",
    boxShadow: "none",
    border: "1px solid transparent",
    transition: "transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
    "& .MuiButton-startIcon": {
      marginRight: 6,
    },
    "&:hover": {
      boxShadow: "none",
      transform: "translateY(-1px)",
    },
    "&.Mui-disabled": {
      opacity: 0.65,
      color: "#ffffff",
    },
  },
  buttonSave: {
    backgroundColor: "#2f7cf6",
    borderColor: "#5d9dff",
    color: "#ffffff",
    "&:hover": {
      backgroundColor: "#2468d8",
    },
  },
  buttonCancel: {
    backgroundColor: "#d95d5d",
    borderColor: "#ef9a9a",
    color: "#ffffff",
    "&:hover": {
      backgroundColor: "#c74b4b",
    },
  },
  buttonTest: {
    backgroundColor: "#1b7f5d",
    borderColor: "#4fd1a1",
    color: "#ffffff",
    "&:hover": {
      backgroundColor: "#16684c",
    },
  },
  paperComponent: {
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 32px 90px rgba(2, 6, 23, 0.42)",
    backgroundColor: "#ffffff",
  },
  mainPaper: {
    backgroundColor: "transparent",
    boxShadow: "none",
  },
  eventCard: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(2.25),
    border: "1px solid #e3e8ef",
    borderRadius: 14,
    background: "linear-gradient(180deg, #ffffff 0%, #f9fbfd 100%)",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
  },
  eventHeader: {
    fontWeight: 700,
    marginBottom: 8,
    color: "#3559c7",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  eventDescription: {
    color: "#6b7280",
    display: "block",
    marginBottom: 14,
    lineHeight: 1.45,
  },
  eventGroup: {
    marginBottom: theme.spacing(1.5),
  },
  eventGroupLabel: {
    fontWeight: 700,
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: 11,
  },
  checkboxRow: {
    marginTop: 4,
  },
  checkboxControl: {
    padding: "2px 6px",
    color: "#9aa4b2",
    "&.Mui-checked": {
      color: "#2f7cf6",
    },
  },
  checkboxLabel: {
    fontSize: 13,
    color: "#1f2937",
  },
  checkboxItem: {
    marginRight: 16,
    marginBottom: 2,
  },
  eventDivider: {
    marginTop: 8,
    backgroundColor: "#e5e7eb",
  },
  "@media (max-width: 600px)": {
    dialogTitleBar: {
      padding: theme.spacing(2),
    },
    dialogContent: {
      padding: theme.spacing(2),
    },
    dialogActions: {
      padding: theme.spacing(1.5, 2),
    },
    actionSpacer: {
      display: "none",
    },
    buttonBase: {
      flex: "1 1 calc(50% - 8px)",
      minWidth: 0,
    },
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
        BackdropProps={{
          style: {
            backgroundColor: "rgba(2, 6, 23, 0.58)"
          }
        }}
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
        <DialogTitle disableTypography className={`${classes.dialogTitle} dialog-title`}>
          <Box className={classes.dialogTitleBar}>
            <Typography component="h2" className={classes.dialogTitleText}>
              {integrationId
                ? `${i18n.t("queueIntegrationModal.title.edit")}`
                : `${i18n.t("queueIntegrationModal.title.add")}`}
            </Typography>
            <IconButton
              aria-label="fechar modal de integração"
              className={classes.dialogCloseButton}
              onClick={handleClose}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
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
                          <Box className={classes.eventCard}>
                            <Typography
                              variant="subtitle2"
                              className={classes.eventHeader}
                            >
                              <WebhookIcon fontSize="small" />
                              Eventos para receber neste webhook
                            </Typography>
                            <Typography
                              variant="caption"
                              className={classes.eventDescription}
                            >
                              Selecione quais eventos serão enviados para a URL acima. Deixar sem seleção desativa os eventos (modo chatbot via fila).
                            </Typography>

                            {WEBHOOK_EVENT_GROUPS.map((group) => (
                              <Box key={group.group} className={classes.eventGroup}>
                                <Typography
                                  variant="caption"
                                  className={classes.eventGroupLabel}
                                >
                                  {group.group}
                                </Typography>
                                <FormGroup row className={classes.checkboxRow}>
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
                                          className={classes.checkboxControl}
                                        />
                                      }
                                      label={
                                        <Typography variant="body2" className={classes.checkboxLabel}>
                                          {evt.label}
                                        </Typography>
                                      }
                                      className={classes.checkboxItem}
                                    />
                                  ))}
                                </FormGroup>
                                <Divider className={classes.eventDivider} />
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
                    className={`${classes.buttonBase} ${classes.buttonTest}`}
                    disabled={isSubmitting}
                    name="testSession"
                    variant="contained"
                  >
                    {i18n.t("queueIntegrationModal.buttons.test")}
                  </Button>
                )}
                <Box className={classes.actionSpacer} />
                <Button
                  startIcon={<CancelIcon />}
                  onClick={handleClose}
                  className={`${classes.buttonBase} ${classes.buttonCancel}`}
                  disabled={isSubmitting}
                  variant="contained"
                >
                  {i18n.t("queueIntegrationModal.buttons.cancel")}
                </Button>
                <Button
                  startIcon={<SaveIcon />}
                  type="submit"
                  className={`${classes.buttonBase} ${classes.buttonSave}`}
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
