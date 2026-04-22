import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  makeStyles,
} from "@material-ui/core";
import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  field: {
    marginBottom: theme.spacing(2),
  },
}));

const NewPropostaModal = ({ open, onClose, onSave }) => {
  const classes = useStyles();
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) {
      toast.warning("Preencha o título e o nome do cliente");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/proposals", {
        title: title.trim(),
        clientName: clientName.trim(),
        status: "rascunho",
        data: {}
      });
      toast.success("Proposta criada com sucesso!");
      setTitle("");
      setClientName("");
      onSave(data);
    } catch (err) {
      toast.error("Erro ao criar proposta");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setClientName("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Nova Proposta</DialogTitle>
        <DialogContent>
          <TextField
            className={classes.field}
            label="Título da Proposta"
            variant="outlined"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            placeholder="Ex: Proposta de Serviços de Marketing Digital"
          />
          <TextField
            className={classes.field}
            label="Nome do Cliente"
            variant="outlined"
            fullWidth
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex: Empresa ABC Ltda"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            Criar Proposta
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default NewPropostaModal;
