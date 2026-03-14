import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@material-ui/core";
import { toast } from "react-toastify";
import api from "../../services/api";
import MediaDrivePickerModal from "../../components/MediaDrivePickerModal";
import toastError from "../../errors/toastError";

const ReplyModal = ({ open, onClose, reply, groups }) => {
  const [shortcut, setShortcut] = useState("");
  const [message, setMessage] = useState("");
  const [groupId, setGroupId] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [file, setFile] = useState(null);
  const [libraryMedia, setLibraryMedia] = useState(null);
  const [type, setType] = useState("text");
  const [mediaDriveOpen, setMediaDriveOpen] = useState(false);

  useEffect(() => {
    if (reply) {
      setShortcut(reply.shortcut || "");
      setMessage(reply.message || "");
      setGroupId(reply.groupId || "");
      setMediaUrl(reply.mediaUrl || "");
      setFile(null);
      setLibraryMedia(null);

      if (reply.mediaUrl) {
        if (reply.mediaType?.startsWith("image")) setType("image");
        else if (reply.mediaType?.startsWith("video")) setType("video");
        else if (reply.mediaType?.startsWith("audio")) setType("audio");
        else setType("file");
      } else {
        setType("text");
      }
    } else {
      setShortcut("");
      setMessage("");
      setGroupId("");
      setMediaUrl("");
      setFile(null);
      setLibraryMedia(null);
      setType("text");
    }
  }, [reply, open]);

  const handleTypeChange = (newType) => {
    if (newType === "text") {
      setFile(null);
      setLibraryMedia(null);
    } else if (newType === "audio") {
      setMessage("");
    }
    setType(newType);
  };

  const handleSave = async () => {
    try {
      if (type === "audio") {
        setMessage("");
      }

      const payload = { shortcut, message, groupId: groupId || null };
      let replyResponse;

      if (reply) {
        replyResponse = await api.put(`/quick-replies/${reply.id}`, payload);
        toast.success("Resposta atualizada com sucesso!");
      } else {
        replyResponse = await api.post("/quick-replies", payload);
        toast.success("Resposta criada com sucesso!");
      }

      const id = reply ? reply.id : replyResponse.data.id;

      if (file) {
        const formData = new FormData();
        formData.append("media", file);
        formData.append("typeArch", "quickReply");
        await api.post(`/quick-replies/${id}/media`, formData);
        toast.success("Mídia anexada com sucesso!");
      } else if (libraryMedia?.id) {
        await api.post(`/quick-replies/${id}/media-from-library`, { mediaFileId: libraryMedia.id });
        toast.success("Mídia vinculada do Mídia Drive!");
      } else if (type !== "text" && !mediaUrl) {
        toast.warn("Lembre-se de anexar uma mídia caso tenha mudado o tipo.");
      }

      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const allowedTypes =
    type === "image" ? ["image"] :
    type === "video" ? ["video"] :
    type === "audio" ? ["audio"] :
    ["image", "video", "audio", "document"];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <MediaDrivePickerModal
        open={mediaDriveOpen}
        onClose={() => setMediaDriveOpen(false)}
        allowedTypes={allowedTypes}
        onSelect={(media) => {
          setLibraryMedia(media);
          setFile(null);
        }}
      />

      <DialogTitle>{reply ? "Editar Resposta" : "Nova Resposta"}</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column">
          <FormControl variant="outlined" style={{ marginBottom: 16 }}>
            <InputLabel>Grupo</InputLabel>
            <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} label="Grupo">
              <MenuItem value="">Nenhum (Geral)</MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" style={{ marginBottom: 16 }}>
            <InputLabel>Tipo de Resposta</InputLabel>
            <Select value={type} onChange={(e) => handleTypeChange(e.target.value)} label="Tipo de Resposta">
              <MenuItem value="text">Texto</MenuItem>
              <MenuItem value="image">Imagem</MenuItem>
              <MenuItem value="video">Vídeo</MenuItem>
              <MenuItem value="audio">Áudio</MenuItem>
              <MenuItem value="file">Arquivo / Outros</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Atalho"
            fullWidth
            variant="outlined"
            value={shortcut}
            onChange={(e) => setShortcut(e.target.value)}
            style={{ marginBottom: 16 }}
            helperText="Ex: /bomdia"
          />

          {type !== "audio" && (
            <TextField
              label={type === "text" ? "Mensagem" : "Legenda (opcional)"}
              fullWidth
              variant="outlined"
              multiline
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ marginBottom: 16 }}
              helperText="Variáveis dinâmicas suportadas: {firstName}, {name}, {date}, {time}"
            />
          )}

          {type !== "text" && (
            <Box display="flex" gridGap={8} style={{ marginBottom: 8 }}>
              <Button variant="outlined" component="label">
                Upload de Mídia
                <input
                  type="file"
                  hidden
                  accept={type === "image" ? "image/*" : type === "video" ? "video/*" : type === "audio" ? "audio/*" : "*/*"}
                  onChange={(e) => {
                    setFile(e.target.files[0]);
                    setLibraryMedia(null);
                  }}
                />
              </Button>
              <Button variant="outlined" onClick={() => setMediaDriveOpen(true)}>
                Selecionar do Mídia Drive
              </Button>
            </Box>
          )}

          {(file || mediaUrl || libraryMedia) && type !== "text" && (
            <Typography variant="caption" color="primary">
              Mídia selecionada: {file ? file.name : libraryMedia?.name || (mediaUrl ? mediaUrl.split("/").pop() : "")}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancelar
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReplyModal;
