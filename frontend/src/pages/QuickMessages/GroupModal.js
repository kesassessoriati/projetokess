import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box
} from "@material-ui/core";
import api from "../../services/api";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";

const GroupModal = ({ open, onClose, group, onSaved }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (group) {
      setName(group.name || "");
      setDescription(group.description || "");
      return;
    }
    setName("");
    setDescription("");
  }, [group]);

  const handleSave = async () => {
    try {
      const payload = { name, description };
      if (group) {
        await api.put(`/quick-reply-groups/${group.id}`, payload);
        toast.success("Grupo atualizado com sucesso!");
      } else {
        await api.post(`/quick-reply-groups`, payload);
        toast.success("Grupo criado com sucesso!");
      }
      if (onSaved) {
        onSaved();
      }
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{group ? "Editar Pipeline" : "Novo Pipeline"}</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Nome do Pipeline"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <TextField
            label="Descrição"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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

export default GroupModal;
