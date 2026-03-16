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
import toastError from "../../errors/toastError";

const ReplyModal = ({ open, onClose, reply, groups }) => {
  const [shortcut, setShortcut] = useState("");
  const [message, setMessage] = useState("");
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    if (reply) {
      setShortcut(reply.shortcut || "");
      setMessage(reply.message || "");
      setGroupId(reply.groupId || "");
      return;
    }

    setShortcut("");
    setMessage("");
    setGroupId("");
  }, [reply, open]);

  const handleSave = async () => {
    try {
      // Media quick replies are temporarily disabled in this release.
      // Keep the active payload explicitly text-only until the media flow is re-enabled.
      const payload = {
        shortcut,
        message,
        groupId: groupId || null,
        mediaType: null
      };

      if (reply) {
        await api.put(`/quick-replies/${reply.id}`, payload);
        toast.success("Resposta atualizada com sucesso!");
      } else {
        await api.post("/quick-replies", payload);
        toast.success("Resposta criada com sucesso!");
      }

      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const hasLegacyMedia = Boolean(reply?.mediaUrl);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
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
            <Select value="text" disabled label="Tipo de Resposta">
              <MenuItem value="text">Texto</MenuItem>
            </Select>
            <Typography variant="caption" color="textSecondary" style={{ marginTop: 6 }}>
              Tipos com midia estao temporariamente desativados neste modulo e podem ser reativados em uma futura atualizacao.
            </Typography>
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
            helperText="Variaveis dinamicas suportadas: {firstName}, {name}, {date}, {time}"
          />

          {hasLegacyMedia && (
            <Typography variant="caption" color="textSecondary">
              Este registro possui midia legada vinculada. Ela foi preservada para futura reativacao, mas nao e usada no fluxo ativo de respostas rapidas.
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
