import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import ImageIcon from "@material-ui/icons/Image";
import LibraryMusicIcon from "@material-ui/icons/LibraryMusic";
import MovieIcon from "@material-ui/icons/Movie";
import DescriptionIcon from "@material-ui/icons/Description";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import MediaDrivePickerModal from "../../components/MediaDrivePickerModal";

const INTERACTIVE_EXAMPLES = {
  text: null,
  buttons: {
    text: "Escolha uma das opcoes abaixo:",
    footer: "Atendimento automatico",
    buttons: [
      { type: "quick_reply", displayText: "Quero saber mais", id: "quero_saber_mais" },
      { type: "cta_url", displayText: "Ver site", url: "https://seusite.com.br" },
      { type: "cta_call", displayText: "Falar no WhatsApp", phoneNumber: "5511999999999" }
    ]
  },
  list: {
    title: "",
    text: "Selecione uma das opcoes abaixo:",
    buttonText: "Ver opcoes",
    footer: "Escolha um departamento",
    sections: [{
      title: "Atendimento",
      rows: [
        { title: "Suporte tecnico", rowId: "suporte", description: "Ajuda com produto ou servico" },
        { title: "Financeiro", rowId: "financeiro", description: "Pagamentos e boletos" },
        { title: "Comercial", rowId: "comercial", description: "Orcamentos e propostas" }
      ]
    }]
  },
  carousel: {
    cards: [{
      header: { title: "Oferta Especial", imageUrl: "https://www.w3schools.com/w3css/img_lights.jpg", subtitle: "" },
      body: "Aproveite nossas melhores ofertas com desconto exclusivo.",
      footer: "Valido por tempo limitado",
      buttons: [
        { type: "cta_url", displayText: "Ver oferta", url: "https://seusite.com.br/oferta" },
        { type: "quick_reply", displayText: "Tenho interesse", id: "interesse_oferta" }
      ]
    }]
  },
  poll: {
    name: "Qual horario voce prefere para atendimento?",
    options: ["Manha", "Tarde", "Noite"],
    selectableCount: 1
  }
};

const INTERACTIVE_TYPES = [
  { value: "text", label: "Texto / Midia" },
  { value: "buttons", label: "Botoes" },
  { value: "list", label: "Lista" },
  { value: "carousel", label: "Carrossel" },
  { value: "poll", label: "Enquete" }
];

const stringifyConfig = (value) => JSON.stringify(value || {}, null, 2);

const getMediaKind = (mimeType = "") => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
};

const getMediaIcon = (mimeType = "") => {
  switch (getMediaKind(mimeType)) {
    case "image":
      return <ImageIcon color="primary" />;
    case "video":
      return <MovieIcon color="primary" />;
    case "audio":
      return <LibraryMusicIcon color="primary" />;
    default:
      return <DescriptionIcon color="primary" />;
  }
};

const REPLY_VARIABLES = [
  { token: "{{ms}}", label: "Saudação" },
  { token: "{{firstName}}", label: "Primeiro nome" },
  { token: "{{name}}", label: "Nome completo" },
  { token: "{{number}}", label: "Número" },
  { token: "{{email}}", label: "E-mail" },
  { token: "{{date}}", label: "Data" },
  { token: "{{time}}", label: "Hora" },
];

const ReplyModal = ({ open, onClose, reply, groups, defaultGroupId = "", onSaved }) => {
  const fileInputRef = useRef(null);
  const messageRef = useRef(null);
  const [shortcut, setShortcut] = useState("");
  const [message, setMessage] = useState("");
  const [groupId, setGroupId] = useState("");
  const [interactiveType, setInteractiveType] = useState("text");
  const [interactiveConfig, setInteractiveConfig] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [selectedLibraryMedia, setSelectedLibraryMedia] = useState(null);
  const [removeExistingMedia, setRemoveExistingMedia] = useState(false);

  useEffect(() => {
    if (!open) return;

    setShortcut(reply?.shortcut || "");
    setMessage(reply?.message || "");
    setGroupId(reply?.groupId || defaultGroupId || "");
    const nextType = reply?.interactiveType || "text";
    setInteractiveType(nextType);
    setInteractiveConfig(
      nextType !== "text"
        ? stringifyConfig(reply?.interactiveConfig || INTERACTIVE_EXAMPLES[nextType])
        : ""
    );
    setSelectedUploadFile(null);
    setSelectedLibraryMedia(null);
    setRemoveExistingMedia(false);
  }, [defaultGroupId, open, reply]);

  const uploadPreviewUrl = useMemo(() => {
    if (!selectedUploadFile) return "";
    return URL.createObjectURL(selectedUploadFile);
  }, [selectedUploadFile]);

  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) {
        URL.revokeObjectURL(uploadPreviewUrl);
      }
    };
  }, [uploadPreviewUrl]);

  const currentMedia = useMemo(() => {
    if (selectedUploadFile) {
      return {
        source: "upload",
        name: selectedUploadFile.name,
        mimeType: selectedUploadFile.type,
        url: uploadPreviewUrl
      };
    }

    if (selectedLibraryMedia) {
      return {
        source: "library",
        name: selectedLibraryMedia.name,
        mimeType: selectedLibraryMedia.mimeType,
        url: selectedLibraryMedia.url,
        folderPath: selectedLibraryMedia.folderPath
      };
    }

    if (reply?.mediaUrl && !removeExistingMedia) {
      return {
        source: reply.mediaSource || "existing",
        name: reply.mediaName || "Mídia vinculada",
        mimeType: reply.mediaType || "",
        url: reply.mediaUrl
      };
    }

    return null;
  }, [removeExistingMedia, reply, selectedLibraryMedia, selectedUploadFile, uploadPreviewUrl]);

  const handleSave = async () => {
    try {
      let parsedInteractiveConfig = null;

      if (interactiveType !== "text") {
        try {
          parsedInteractiveConfig = JSON.parse(interactiveConfig || "{}");
        } catch (_) {
          toast.error("Revise o JSON da mensagem premium antes de salvar.");
          return;
        }
      }

      const payload = {
        shortcut: shortcut.trim(),
        message,
        groupId: groupId || null,
        interactiveType,
        interactiveConfig: parsedInteractiveConfig
      };

      let savedReply;
      if (reply) {
        const { data } = await api.put(`/quick-replies/${reply.id}`, payload);
        savedReply = data;
      } else {
        const { data } = await api.post("/quick-replies", payload);
        savedReply = data;
      }

      const replyId = savedReply?.id || reply?.id;

      if (removeExistingMedia && !selectedUploadFile && !selectedLibraryMedia && replyId) {
        await api.delete(`/quick-replies/${replyId}/media`);
      }

      if (selectedLibraryMedia && replyId) {
        await api.post(`/quick-replies/${replyId}/media-from-library`, {
          mediaFileId: selectedLibraryMedia.id
        });
      } else if (selectedUploadFile && replyId) {
        const formData = new FormData();
        formData.append("media", selectedUploadFile);
        formData.append("typeArch", "quickReply");

        await api.post(`/quick-replies/${replyId}/media`, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
      }

      toast.success(reply ? "Resposta atualizada com sucesso!" : "Resposta criada com sucesso!");

      if (onSaved) {
        onSaved();
      }
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const handleUploadSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedUploadFile(file);
    setSelectedLibraryMedia(null);
    setRemoveExistingMedia(false);
    event.target.value = "";
  };

  const handleRemoveMedia = () => {
    setSelectedUploadFile(null);
    setSelectedLibraryMedia(null);
    if (reply?.mediaUrl) {
      setRemoveExistingMedia(true);
    }
  };

  const handleInteractiveTypeChange = (nextType) => {
    setInteractiveType(nextType);
    setInteractiveConfig(nextType === "text" ? "" : stringifyConfig(INTERACTIVE_EXAMPLES[nextType]));
    if (nextType !== "text" && !message) {
      setMessage(INTERACTIVE_EXAMPLES[nextType]?.text || INTERACTIVE_EXAMPLES[nextType]?.name || "");
    }
  };

  const insertVariable = (token) => {
    const textarea = messageRef.current;
    if (!textarea) {
      setMessage((prev) => `${prev || ""}${token}`);
      return;
    }
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const nextValue = message.substring(0, start) + token + message.substring(end);
    setMessage(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPosition = start + token.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>{reply ? "Editar Resposta" : "Nova Resposta"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <FormControl variant="outlined" fullWidth style={{ marginBottom: 16 }}>
                <InputLabel>Pipeline</InputLabel>
                <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} label="Pipeline">
                  <MenuItem value="">Sem pipeline</MenuItem>
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Atalho"
                fullWidth
                variant="outlined"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                style={{ marginBottom: 16 }}
                helperText="Ex: /campanha-boasvindas"
              />

              <TextField
                label="Mensagem"
                fullWidth
                variant="outlined"
                multiline
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                inputRef={messageRef}
              />

              <Box mt={1} mb={1}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Typography style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Variáveis dinâmicas
                  </Typography>
                  <Typography style={{ fontSize: 11, color: "#64748b" }}>
                    Clique para inserir
                  </Typography>
                </Box>
                <Box display="flex" flexWrap="wrap" style={{ gap: 6 }}>
                  {REPLY_VARIABLES.map((item) => (
                    <Chip
                      key={item.token}
                      label={item.label}
                      size="small"
                      clickable
                      onClick={() => insertVariable(item.token)}
                      style={{
                        backgroundColor: "#e0f2fe",
                        color: "#0f172a",
                        fontWeight: 600,
                        border: "1px solid #bae6fd",
                      }}
                    />
                  ))}
                </Box>
                <Typography style={{ fontSize: 11, color: "#15803d", marginTop: 6, padding: "6px 10px", backgroundColor: "#f0fdf4", borderRadius: 6, border: "1px solid #bbf7d0" }}>
                  Use <strong>{"{{firstName}}"}</strong>, <strong>{"{{name}}"}</strong>, <strong>{"{{ms}}"}</strong> para personalizar cada mensagem automaticamente.
                </Typography>
              </Box>

              <Box mt={2}>
                <FormControl variant="outlined" fullWidth style={{ marginBottom: 12 }}>
                  <InputLabel>Recurso premium</InputLabel>
                  <Select
                    value={interactiveType}
                    onChange={(e) => handleInteractiveTypeChange(e.target.value)}
                    label="Recurso premium"
                  >
                    {INTERACTIVE_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {interactiveType !== "text" && (
                  <TextField
                    label="Configuração premium"
                    fullWidth
                    variant="outlined"
                    multiline
                    rows={10}
                    value={interactiveConfig}
                    onChange={(e) => setInteractiveConfig(e.target.value)}
                    helperText="Exemplo pronto para editar. O chat reutiliza as rotas atuais de botões, lista, carrossel e enquete."
                  />
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={5}>
              <Box
                style={{
                  border: "1px solid #dfe3e8",
                  borderRadius: 14,
                  padding: 16,
                  minHeight: 320,
                  background: "#f8fafc"
                }}
              >
                <Typography variant="subtitle2" style={{ fontWeight: 700, marginBottom: 8 }}>
                  Mídia vinculada
                </Typography>
                <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                  Escolha um áudio, vídeo, imagem ou documento da biblioteca, ou envie um arquivo local.
                </Typography>

                <Box display="flex" flexWrap="wrap" style={{ gap: 8, marginBottom: 16 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<FolderOpenIcon />}
                    onClick={() => setMediaPickerOpen(true)}
                  >
                    Biblioteca
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<AttachFileIcon />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload
                  </Button>
                  {currentMedia && (
                    <Button
                      variant="text"
                      color="secondary"
                      startIcon={<DeleteOutlineIcon />}
                      onClick={handleRemoveMedia}
                    >
                      Remover
                    </Button>
                  )}
                </Box>

                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  accept="image/*,video/*,audio/*,application/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleUploadSelection}
                />

                {currentMedia ? (
                  <Box
                    style={{
                      borderRadius: 14,
                      border: "1px solid #dfe3e8",
                      background: "#fff",
                      overflow: "hidden"
                    }}
                  >
                    {getMediaKind(currentMedia.mimeType) === "image" && currentMedia.url ? (
                      <img
                        src={currentMedia.url}
                        alt={currentMedia.name}
                        style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        style={{ height: 180, background: "linear-gradient(135deg, #eef2ff, #f8fafc)" }}
                      >
                        {getMediaIcon(currentMedia.mimeType)}
                      </Box>
                    )}

                    <Box style={{ padding: 12 }}>
                      <Box display="flex" alignItems="center" style={{ gap: 8, marginBottom: 8 }}>
                        {getMediaIcon(currentMedia.mimeType)}
                        <Typography variant="body2" style={{ fontWeight: 600, wordBreak: "break-word" }}>
                          {currentMedia.name}
                        </Typography>
                      </Box>
                      <Box display="flex" flexWrap="wrap" style={{ gap: 8 }}>
                        <Chip
                          size="small"
                          label={
                            currentMedia.source === "library"
                              ? "Biblioteca de mídia"
                              : currentMedia.source === "upload"
                                ? "Upload local"
                                : "Já vinculada"
                          }
                        />
                        {currentMedia.folderPath && (
                          <Chip size="small" color="primary" variant="outlined" label={currentMedia.folderPath} />
                        )}
                        {currentMedia.mimeType && (
                          <Chip size="small" variant="outlined" label={getMediaKind(currentMedia.mimeType)} />
                        )}
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    style={{
                      minHeight: 180,
                      borderRadius: 14,
                      border: "1px dashed #b6c2cf",
                      background: "#fff",
                      textAlign: "center",
                      padding: 24
                    }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      Esta resposta pode ser só texto, ou texto + mídia.
                    </Typography>
                  </Box>
                )}

                <Box mt={2}>
                  <Tooltip title="As mídias escolhidas aqui ficam prontas para uso rápido no atendimento.">
                    <Typography variant="caption" color="textSecondary">
                      Dica: use um pipeline por campanha, etapa ou contexto de atendimento.
                    </Typography>
                  </Tooltip>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="secondary">
            Cancelar
          </Button>
          <Button onClick={handleSave} color="primary" variant="contained" disabled={!shortcut.trim()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <MediaDrivePickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        allowedTypes={["image", "video", "audio", "document"]}
        title="Selecionar mídia para a resposta rápida"
        onSelect={(media) => {
          setSelectedLibraryMedia(media);
          setSelectedUploadFile(null);
          setRemoveExistingMedia(false);
        }}
      />
    </>
  );
};

export default ReplyModal;
