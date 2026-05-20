import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
  makeStyles
} from "@material-ui/core";
import {
  AttachFile as AttachFileIcon,
  Audiotrack as AudioIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Description as DocIcon,
  Error as ErrorIcon,
  FlashOn as FlashIcon,
  Image as ImageIcon,
  Message as MessageIcon,
  Schedule as ScheduleIcon,
  Videocam as VideoIcon
} from "@material-ui/icons";
import useWhatsApps from "../../hooks/useWhatsApps";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import {
  getPreferredWhatsappId,
  sortWhatsappsByUserQueues,
} from "../../utils/whatsappQueuePreference";
import {
  createScheduledDispatcher,
  eventTypeOptions,
  getScheduledDispatcher,
  testScheduledDispatcher,
  updateScheduledDispatcher
} from "../../services/scheduledDispatcherService";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

const ACCEPTED_TYPES = ".jpg,.jpeg,.png,.gif,.webp,.mp4,.mpeg,.mp3,.ogg,.wav,.pdf";

const MAX_SIZES = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 10 * 1024 * 1024,
  application: 10 * 1024 * 1024
};

const MAX_SIZE_LABELS = { image: "5MB", video: "16MB", audio: "10MB", application: "10MB" };

const getMediaCategory = mimetype => {
  if (!mimetype) return "other";
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  return "document";
};

const MediaIcon = ({ category, style }) => {
  const props = { style };
  if (category === "image") return <ImageIcon {...props} />;
  if (category === "video") return <VideoIcon {...props} />;
  if (category === "audio") return <AudioIcon {...props} />;
  return <DocIcon {...props} />;
};

const useStyles = makeStyles(theme => ({
  dialog: {
    "& .MuiDialog-paper": {
      maxWidth: 720,
      width: "100%",
      borderRadius: 24
    }
  },
  title: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  section: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(1)
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
    fontWeight: 600
  },
  field: {
    marginBottom: theme.spacing(2)
  },
  templateHint: {
    fontSize: 12,
    color: theme.palette.text.secondary
  },
  chipGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
  },
  mediaUploadArea: {
    border: `2px dashed ${theme.palette.divider}`,
    borderRadius: 12,
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.2s",
    "&:hover": {
      borderColor: theme.palette.primary.main
    }
  },
  mediaPreview: {
    position: "relative",
    marginTop: theme.spacing(1.5),
    borderRadius: 12,
    overflow: "hidden",
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper
  },
  mediaPreviewImg: {
    width: "100%",
    maxHeight: 200,
    objectFit: "contain",
    display: "block",
    background: "#000"
  },
  mediaPreviewRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.5)
  },
  mediaRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    background: "rgba(0,0,0,0.5)",
    color: "#fff",
    "&:hover": {
      background: "rgba(0,0,0,0.75)"
    }
  }
}));

const defaultForm = {
  title: "",
  messageTemplate: "",
  eventType: "birthday",
  whatsappId: "",
  startTime: "09:00",
  sendIntervalSeconds: 60,
  daysBeforeDue: 0,
  daysAfterDue: 0,
  active: true,
  mediaCaption: ""
};

const scheduledDispatcherVariables = [
  { token: "{{ms}}", label: "Saudação" },
  { token: "{{firstName}}", label: "Primeiro nome" },
  { token: "{{contactName}}", label: "Nome completo" },
  { token: "{{contactNumber}}", label: "Número" },
  { token: "{{contactEmail}}", label: "E-mail" },
  { token: "{{invoiceDueDate}}", label: "Data de vencimento" },
  { token: "{{invoiceValue}}", label: "Valor da fatura" },
  { token: "{{clientProduct}}", label: "Produto" },
  { token: "{{connection}}", label: "Conexão" }
];

const ScheduledDispatcherModal = ({ open, onClose, dispatcher }) => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { whatsApps } = useWhatsApps();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [testNumberValidation, setTestNumberValidation] = useState({ status: "idle", normalizedNumber: "", error: "" });
  const testValidationTimerRef = useRef(null);

  // Media state
  const [mediaFile, setMediaFile] = useState(null);          // new File to upload
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(""); // object URL for preview
  const [existingMediaUrl, setExistingMediaUrl] = useState(null); // URL from DB
  const [existingMediaType, setExistingMediaType] = useState(null);
  const [removeMedia, setRemoveMedia] = useState(false);

  const sortedWhatsApps = useMemo(
    () => sortWhatsappsByUserQueues(whatsApps, user),
    [whatsApps, user]
  );

  const whatsappOptions = useMemo(
    () =>
      sortedWhatsApps.map(connection => ({
        value: connection.id,
        label: connection.name || `Conexão #${connection.id}`,
        channel: connection.channel
      })),
    [sortedWhatsApps]
  );

  useEffect(() => {
    if (!open) {
      setForm(defaultForm);
      setLoading(false);
      setSaving(false);
      setTesting(false);
      setTestNumber("");
      setTestNumberValidation({ status: "idle", normalizedNumber: "", error: "" });
      setMediaFile(null);
      setMediaPreviewUrl("");
      setExistingMediaUrl(null);
      setExistingMediaType(null);
      setRemoveMedia(false);
      return;
    }

    if (!dispatcher) {
      setForm({
        ...defaultForm,
        whatsappId: getPreferredWhatsappId(sortedWhatsApps, user)
      });
      setTestNumber("");
      setTestNumberValidation({ status: "idle", normalizedNumber: "", error: "" });
      return;
    }

    const loadDetails = async () => {
      try {
        setLoading(true);
        const data = await getScheduledDispatcher(dispatcher.id);
        setForm({
          title: data.title || "",
          messageTemplate: data.messageTemplate || "",
          eventType: data.eventType || "birthday",
          whatsappId: data.whatsappId || "",
          startTime: data.startTime || "09:00",
          sendIntervalSeconds: data.sendIntervalSeconds || 60,
          daysBeforeDue: data.daysBeforeDue ?? 0,
          daysAfterDue: data.daysAfterDue ?? 0,
          active: data.active,
          mediaCaption: data.mediaCaption || ""
        });
        if (data.mediaUrl) {
          setExistingMediaUrl(data.mediaUrl);
          setExistingMediaType(data.mediaType || "document");
        }
      } catch (error) {
        toast.error("Não foi possível carregar o disparo");
        onClose(false);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [dispatcher, open, onClose, sortedWhatsApps, user]);

  // Clean up object URL on unmount / change
  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    };
  }, [mediaPreviewUrl]);

  // Validação de número de teste com debounce de 800ms
  useEffect(() => {
    if (testValidationTimerRef.current) clearTimeout(testValidationTimerRef.current);
    const digits = testNumber.replace(/\D/g, "");
    if (digits.length < 10 || !form.whatsappId) {
      setTestNumberValidation({ status: "idle", normalizedNumber: "", error: "" });
      return;
    }
    setTestNumberValidation((prev) => ({ ...prev, status: "loading" }));
    testValidationTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/quick-send/validate", {
          params: { number: digits, whatsappId: form.whatsappId },
        });
        setTestNumberValidation({
          status: data.valid ? "valid" : "invalid",
          normalizedNumber: data.normalizedNumber || "",
          error: data.error || "",
        });
      } catch {
        setTestNumberValidation({ status: "invalid", normalizedNumber: "", error: "Erro ao validar número" });
      }
    }, 800);
    return () => clearTimeout(testValidationTimerRef.current);
  }, [testNumber, form.whatsappId]);

  const handleChange = event => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitch = event => {
    const { name, checked } = event.target;
    setForm(prev => ({ ...prev, [name]: checked }));
  };

  const handleFileChange = event => {
    const file = event.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    const category = getMediaCategory(file.type);
    const limit = MAX_SIZES[category] || MAX_SIZES.application;
    const label = MAX_SIZE_LABELS[category] || "10MB";

    if (file.size > limit) {
      toast.error(`Arquivo muito grande. Limite para ${category}: ${label}`);
      return;
    }

    // Revoke old preview
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);

    setMediaFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    setRemoveMedia(false);
  };

  const handleRemoveMedia = () => {
    if (mediaFile) {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
      setMediaFile(null);
      setMediaPreviewUrl("");
    } else {
      setRemoveMedia(true);
      setExistingMediaUrl(null);
      setExistingMediaType(null);
    }
  };

  const hasMedia = !removeMedia && (!!mediaFile || !!existingMediaUrl);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Informe um título para a regra.");
      return;
    }
    if (!form.messageTemplate.trim() && !hasMedia) {
      toast.error("Defina a mensagem de texto ou adicione uma mídia.");
      return;
    }
    if (!form.whatsappId) {
      toast.error("Selecione a conexão WhatsApp.");
      return;
    }

    const payload = {
      title: form.title,
      messageTemplate: form.messageTemplate,
      eventType: form.eventType,
      whatsappId: form.whatsappId || null,
      startTime: form.startTime,
      sendIntervalSeconds: Number(form.sendIntervalSeconds),
      daysBeforeDue:
        form.eventType === "invoice_reminder" || form.eventType === "client_expiration"
          ? Number(form.daysBeforeDue || 0)
          : null,
      daysAfterDue:
        form.eventType === "invoice_overdue" ? Number(form.daysAfterDue || 0) : null,
      active: form.active,
      mediaCaption: hasMedia ? form.mediaCaption : null,
      removeMedia: removeMedia ? "true" : undefined,
      mediaFile: mediaFile || undefined
    };

    try {
      setSaving(true);
      if (dispatcher) {
        await updateScheduledDispatcher(dispatcher.id, payload);
        toast.success("Disparo atualizado com sucesso.");
      } else {
        await createScheduledDispatcher(payload);
        toast.success("Disparo criado com sucesso.");
      }
      onClose(true);
    } catch (error) {
      toast.error("Não foi possível salvar. Verifique os campos e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickTest = async () => {
    if (!testNumber.trim()) {
      toast.warn("Informe um numero de teste antes de enviar.");
      return;
    }
    if (testNumberValidation.status !== "valid") {
      toast.warn("Valide o número antes de testar. Aguarde a verificação no WhatsApp.");
      return;
    }
    if (!form.whatsappId) {
      toast.warn("Selecione a conexao WhatsApp antes de testar.");
      return;
    }
    if (!form.messageTemplate.trim() && !hasMedia) {
      toast.warn("Defina a mensagem de texto ou adicione uma midia antes de testar.");
      return;
    }

    const payload = {
      title: form.title || "Teste de automacao",
      messageTemplate: form.messageTemplate,
      eventType: form.eventType,
      whatsappId: form.whatsappId || null,
      startTime: form.startTime,
      sendIntervalSeconds: Number(form.sendIntervalSeconds),
      daysBeforeDue:
        form.eventType === "invoice_reminder" || form.eventType === "client_expiration"
          ? Number(form.daysBeforeDue || 0)
          : null,
      daysAfterDue:
        form.eventType === "invoice_overdue" ? Number(form.daysAfterDue || 0) : null,
      mediaCaption: hasMedia ? form.mediaCaption : null,
      mediaUrl: !mediaFile && !removeMedia ? existingMediaUrl : null,
      mediaFile: mediaFile || undefined,
      targetNumber: testNumberValidation.normalizedNumber || testNumber
    };

    try {
      setTesting(true);
      await testScheduledDispatcher(payload);
      toast.success("Teste da automacao executado com sucesso!");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao testar automacao");
    } finally {
      setTesting(false);
    }
  };

  const eventMeta = eventTypeOptions.find(item => item.value === form.eventType);
  const showDaysBefore = form.eventType === "invoice_reminder" || form.eventType === "client_expiration";
  const showDaysAfter = form.eventType === "invoice_overdue";

  const existingMediaFullUrl = existingMediaUrl
    ? `${BACKEND_URL}/public/${existingMediaUrl}`
    : null;

  const previewCategory = mediaFile
    ? getMediaCategory(mediaFile.type)
    : existingMediaType || "document";

  const previewLabel = mediaFile
    ? mediaFile.name
    : existingMediaUrl
    ? existingMediaUrl.split("/").pop()
    : "";

  return (
    <Dialog open={open} onClose={() => onClose(false)} className={classes.dialog}>
      <DialogTitle disableTypography className={classes.title}>
        <Box display="flex" alignItems="center" gap={8}>
          <FlashIcon />
          <div>
            <Typography variant="h6">
              {dispatcher ? "Editar disparo" : "Novo disparo automático"}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Configure quando e como a mensagem será enviada.
            </Typography>
          </div>
        </Box>
        <IconButton onClick={() => onClose(false)} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* ── Configurações ── */}
            <Box className={classes.section}>
              <Typography className={classes.sectionHeader}>
                <ScheduleIcon fontSize="small" /> Configurações
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    label="Título"
                    name="title"
                    fullWidth
                    variant="outlined"
                    value={form.title}
                    onChange={handleChange}
                    className={classes.field}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl variant="outlined" fullWidth className={classes.field}>
                    <InputLabel>Evento</InputLabel>
                    <Select
                      name="eventType"
                      value={form.eventType}
                      onChange={handleChange}
                      label="Evento"
                    >
                      {eventTypeOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {eventMeta && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      {eventMeta.description}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl variant="outlined" fullWidth className={classes.field}>
                  <InputLabel>Conexão WhatsApp</InputLabel>
                  <Select
                    name="whatsappId"
                    value={form.whatsappId}
                    onChange={handleChange}
                    label="Conexão WhatsApp"
                  >
                    {whatsappOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label="Início (HH:mm)"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.field}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label="Intervalo (seg)"
                  name="sendIntervalSeconds"
                  value={form.sendIntervalSeconds}
                  onChange={handleChange}
                  variant="outlined"
                  type="number"
                  fullWidth
                  className={classes.field}
                  inputProps={{ min: 10 }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              {showDaysBefore && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Dias antes do vencimento"
                    name="daysBeforeDue"
                    type="number"
                    variant="outlined"
                    fullWidth
                    value={form.daysBeforeDue}
                    onChange={handleChange}
                  />
                </Grid>
              )}
              {showDaysAfter && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Dias após o atraso"
                    name="daysAfterDue"
                    type="number"
                    variant="outlined"
                    fullWidth
                    value={form.daysAfterDue}
                    onChange={handleChange}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" height="100%">
                  <Switch
                    checked={form.active}
                    onChange={handleSwitch}
                    name="active"
                    color="primary"
                  />
                  <Typography variant="body2">
                    {form.active ? "Disparo ativo" : "Disparo desativado"}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* ── Mensagem ── */}
            <Box className={classes.section}>
              <Typography className={classes.sectionHeader}>
                <MessageIcon fontSize="small" /> Mensagem
              </Typography>
              <TextField
                name="messageTemplate"
                value={form.messageTemplate}
                onChange={handleChange}
                multiline
                minRows={4}
                variant="outlined"
                fullWidth
                placeholder={
                  hasMedia
                    ? "Texto adicional enviado antes da mídia (opcional)"
                    : "Olá {{firstName}}, estamos passando para lembrar..."
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Total de caracteres">
                        <Chip label={`${form.messageTemplate.length}`} size="small" />
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
              />
              <Typography className={classes.templateHint}>
                Dica: use variáveis como {"{{firstName}}"}, {"{{contactName}}"},
                {" {{invoiceDueDate}}"} para personalizar a mensagem. Clique nas variaveis abaixo para inserir.
              </Typography>
              <Box className={classes.chipGroup}>
                {scheduledDispatcherVariables.map(variable => (
                  <Chip
                    key={variable.token}
                    label={variable.label}
                    size="small"
                    onClick={() =>
                      setForm(prev => ({
                        ...prev,
                        messageTemplate: prev.messageTemplate + ` ${variable.token}`
                      }))
                    }
                  />
                ))}
              </Box>
            </Box>

            {/* ── Mídia ── */}
            <Box className={classes.section}>
              <Typography className={classes.sectionHeader}>
                <AttachFileIcon fontSize="small" /> Mídia (opcional)
              </Typography>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              {/* Preview of selected/existing media */}
              {hasMedia ? (
                <Box className={classes.mediaPreview}>
                  {/* Image preview */}
                  {previewCategory === "image" && (
                    <img
                      src={mediaFile ? mediaPreviewUrl : existingMediaFullUrl}
                      alt="preview"
                      className={classes.mediaPreviewImg}
                    />
                  )}

                  {/* Video preview */}
                  {previewCategory === "video" && (
                    <video
                      src={mediaFile ? mediaPreviewUrl : existingMediaFullUrl}
                      controls
                      className={classes.mediaPreviewImg}
                    />
                  )}

                  {/* Audio / Document preview row */}
                  {(previewCategory === "audio" || previewCategory === "document") && (
                    <Box className={classes.mediaPreviewRow}>
                      <MediaIcon
                        category={previewCategory}
                        style={{ fontSize: 36, color: "#666" }}
                      />
                      <Typography variant="body2" noWrap style={{ flex: 1 }}>
                        {previewLabel}
                      </Typography>
                    </Box>
                  )}

                  {/* Remove button */}
                  <IconButton
                    size="small"
                    className={classes.mediaRemoveBtn}
                    onClick={handleRemoveMedia}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box
                  className={classes.mediaUploadArea}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <AttachFileIcon style={{ fontSize: 32, color: "#aaa", marginBottom: 4 }} />
                  <Typography variant="body2" color="textSecondary">
                    Clique para adicionar mídia
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Imagem (5MB) · Vídeo (16MB) · Áudio (10MB) · PDF (10MB)
                  </Typography>
                </Box>
              )}

              {/* Replace button when media is already shown */}
              {hasMedia && (
                <Box mt={1} display="flex" gap={8}>
                  <Button
                    size="small"
                    startIcon={<AttachFileIcon />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Substituir mídia
                  </Button>
                </Box>
              )}

              {/* Caption field — shown only when media is present */}
              {hasMedia && (
                <Box mt={2}>
                  <TextField
                    name="mediaCaption"
                    label="Legenda da mídia (opcional)"
                    value={form.mediaCaption}
                    onChange={handleChange}
                    multiline
                    minRows={2}
                    variant="outlined"
                    fullWidth
                    placeholder="Olá {{firstName}}, feliz aniversário!"
                    helperText="Suporta as mesmas variáveis da mensagem."
                  />
                </Box>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions style={{ padding: 16 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gridGap={12}
          width="100%"
        >
          <Box display="flex" alignItems="center" flexWrap="wrap" gridGap={12}>
            <Box>
              <TextField
                label="Numero de teste"
                value={testNumber}
                onChange={event => setTestNumber(event.target.value)}
                variant="outlined"
                size="small"
                placeholder="+55 11 99999-9999"
                style={{ minWidth: 260 }}
                error={testNumberValidation.status === "invalid"}
                helperText={
                  testNumberValidation.status === "loading"
                    ? "Validando no WhatsApp..."
                    : "Numero usado exclusivamente no teste da automacao."
                }
                disabled={testing || saving || loading}
              />
              {testNumberValidation.status === "valid" && (
                <Box display="flex" alignItems="center" style={{ gap: 4, marginTop: 4 }}>
                  <CheckCircleIcon style={{ color: "#16a34a", fontSize: 14 }} />
                  <Typography style={{ fontSize: 11, color: "#15803d", fontWeight: 600 }}>Número válido no WhatsApp ✓</Typography>
                </Box>
              )}
              {testNumberValidation.status === "invalid" && (
                <Box display="flex" alignItems="center" style={{ gap: 4, marginTop: 4 }}>
                  <ErrorIcon style={{ color: "#dc2626", fontSize: 14 }} />
                  <Typography style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Número inválido — envio bloqueado ✗</Typography>
                </Box>
              )}
            </Box>
            <Button
              onClick={handleQuickTest}
              variant="outlined"
              disabled={testing || saving || loading || testNumberValidation.status !== "valid"}
            >
              {testing ? "Testando..." : "Testar automacao"}
            </Button>
          </Box>

          <Box display="flex" alignItems="center" gridGap={8}>
            <Button onClick={() => onClose(false)} disabled={saving || testing}>
              Cancelar
            </Button>
            <Button
              color="primary"
              variant="contained"
              onClick={handleSubmit}
              disabled={saving || loading || testing}
            >
              {saving ? <CircularProgress size={20} /> : "Salvar disparo"}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduledDispatcherModal;
