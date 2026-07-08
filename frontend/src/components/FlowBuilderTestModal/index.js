import React, { useState, useEffect } from "react";

import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import CircularProgress from "@material-ui/core/CircularProgress";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";

// Modal simples que substitui os window.prompt() do "Testar Fluxo".
// Coleta número, nome, mensagem e conexão WhatsApp e delega a execução ao
// callback onRun (que chama /flowbuilder/test/:id). Não é um sandbox — o envio
// é real, então o texto deixa isso explícito.
const FlowBuilderTestModal = ({ open, onClose, onRun, running }) => {
  const [contactNumber, setContactNumber] = useState("");
  const [contactName, setContactName] = useState("Contato Teste");
  const [message, setMessage] = useState("teste manual");
  const [whatsappId, setWhatsappId] = useState("");
  const [whatsapps, setWhatsapps] = useState([]);

  useEffect(() => {
    if (!open) return;
    setContactNumber(localStorage.getItem("flowbuilderTestContactNumber") || "");
    setContactName(localStorage.getItem("flowbuilderTestContactName") || "Contato Teste");
    api
      .get("/whatsapp", { params: { session: 0 } })
      .then(({ data }) => setWhatsapps((data || []).filter(w => w.status === "CONNECTED")))
      .catch(() => setWhatsapps([]));
  }, [open]);

  const handleRun = () => {
    const number = String(contactNumber || "").replace(/\D/g, "");
    if (!number) {
      toast.error("Informe o número de destino (somente números, com DDI).");
      return;
    }
    localStorage.setItem("flowbuilderTestContactNumber", number);
    if (contactName) localStorage.setItem("flowbuilderTestContactName", contactName);

    onRun({
      contactNumber: number,
      contactName,
      message,
      whatsappId: whatsappId || undefined
    }).catch(err => toastError(err));
  };

  return (
    <Dialog open={!!open} onClose={running ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Testar fluxo</DialogTitle>
      <DialogContent dividers>
        <Box mb={1}>
          <Typography variant="caption" color="textSecondary">
            Atenção: o teste envia mensagens reais pela conexão selecionada e cria
            contato/atendimento reais. Use um número controlado.
          </Typography>
        </Box>
        <TextField
          label="Número de destino (com DDI)"
          variant="outlined"
          fullWidth
          margin="dense"
          value={contactNumber}
          onChange={e => setContactNumber(e.target.value)}
          placeholder="5581999999999"
          disabled={running}
        />
        <TextField
          label="Nome do contato (opcional)"
          variant="outlined"
          fullWidth
          margin="dense"
          value={contactName}
          onChange={e => setContactName(e.target.value)}
          disabled={running}
        />
        <TextField
          label="Mensagem/frase de teste (opcional)"
          variant="outlined"
          fullWidth
          margin="dense"
          value={message}
          onChange={e => setMessage(e.target.value)}
          disabled={running}
        />
        <FormControl variant="outlined" fullWidth margin="dense" disabled={running}>
          <InputLabel id="test-wa-label">Conexão WhatsApp</InputLabel>
          <Select
            labelId="test-wa-label"
            label="Conexão WhatsApp"
            value={whatsappId}
            onChange={e => setWhatsappId(e.target.value)}
          >
            <MenuItem value="">Automática (primeira conectada)</MenuItem>
            {whatsapps.map(w => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" variant="outlined" disabled={running}>
          Cancelar
        </Button>
        <Button
          onClick={handleRun}
          color="primary"
          variant="contained"
          disabled={running}
          startIcon={running ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {running ? "Executando..." : "Executar teste"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlowBuilderTestModal;
