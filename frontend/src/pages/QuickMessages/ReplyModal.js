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

const ReplyModal = ({ open, onClose, reply, groups, defaultGroupId = "", onSaved }) => {
  const fileInputRef = useRef(null);
  const [shortcut, setShortcut] = useState("");
  const [message, setMessage] = useState("");
  const [groupId, setGroupId] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [selectedLibraryMedia, setSelectedLibraryMedia] = useState(null);
  const [removeExistingMedia, setRemoveExistingMedia] = useState(false);

  useEffect(() => {
    if (!open) return;

    setShortcut(reply?.shortcut || "");
    setMessage(reply?.message || "");
    setGroupId(reply?.groupId || defaultGroupId || "");
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
      const payload = {
        shortcut: shortcut.trim(),
        message,
        groupId: groupId || null
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
                helperText="Variáveis dinâmicas suportadas: {firstName}, {name}, {date}, {time}"
              />
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
