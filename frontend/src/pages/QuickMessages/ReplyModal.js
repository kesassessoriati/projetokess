import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
} from "@material-ui/core";
import api from "../../services/api";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";

const ReplyModal = ({ open, onClose, reply, groups }) => {
  const [shortcut, setShortcut] = useState("");
  const [message, setMessage] = useState("");
  const [groupId, setGroupId] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (reply) {
      setShortcut(reply.shortcut || "");
      setMessage(reply.message || "");
      setGroupId(reply.groupId || "");
      setMediaUrl(reply.mediaUrl || "");
    }
  }, [reply]);

  const handleSave = async () => {
    try {
      const payload = { shortcut, message, groupId: groupId || null };
      let replyResponse;

      if (reply) {
        replyResponse = await api.put(`/quick-replies/${reply.id}`, payload);
        toast.success("Resposta atualizada com sucesso!");
      } else {
        replyResponse = await api.post(`/quick-replies`, payload);
        toast.success("Resposta criada com sucesso!");
      }

      const id = reply ? reply.id : replyResponse.data.id;

      if (file) {
        const formData = new FormData();
        formData.append("media", file);
        formData.append("typeArch", "quickReply");
        await api.post(`/quick-replies/${id}/media`, formData);
        toast.success("Mídia anexada com sucesso!");
      }

      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{reply ? "Editar Resposta" : "Nova Resposta"}</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column">
          <FormControl variant="outlined" style={{ marginBottom: 16 }}>
            <InputLabel>Grupo</InputLabel>
            <Select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              label="Grupo"
            >
              <MenuItem value="">Nenhum (Geral)</MenuItem>
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
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
            helperText="Ex: /bomdia"
          />
          <TextField
            label="Mensagem"
            fullWidth
            variant="outlined"
            multiline
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ marginBottom: 16 }}
            helperText="Variáveis dinâmicas suportadas: {firstName}, {name}, {date}, {time}"
          />
          <Button variant="outlined" component="label" style={{ marginBottom: 8 }}>
            Upload de Mídia
            <input
              type="file"
              hidden
              onChange={(e) => setFile(e.target.files[0])}
            />
          </Button>
          {(file || mediaUrl) && (
            <Typography variant="caption" color="primary">
              Mídia selecionada: {file ? file.name : mediaUrl}
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
