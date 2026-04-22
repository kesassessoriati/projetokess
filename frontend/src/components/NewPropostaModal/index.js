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
import { buildProposalTitle, defaultProposalData } from "../../utils/proposalBuilder";

const useStyles = makeStyles((theme) => ({
  field: {
    marginBottom: theme.spacing(2),
  },
}));

const NewPropostaModal = ({ open, onClose, onSave }) => {
  const classes = useStyles();
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [city, setCity] = useState("Vitória da Conquista - BA");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.warning("Preencha o nome do cliente");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/proposals", {
        title: title.trim() || buildProposalTitle(clientName.trim()),
        clientName: clientName.trim(),
        status: "rascunho",
        data: defaultProposalData(clientName.trim(), city.trim())
      });
      toast.success("Proposta criada com sucesso!");
      setTitle("");
      setClientName("");
      setCity("Vitória da Conquista - BA");
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
    setCity("Vitória da Conquista - BA");
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
          <TextField
            className={classes.field}
            label="Cidade"
            variant="outlined"
            fullWidth
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Vitória da Conquista - BA"
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
