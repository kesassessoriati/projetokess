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
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { toast } from "react-toastify";

import api from "../../services/api";

// Modal do nó "Caixa de Mensagem": escolhe a conexão WhatsApp (instância) por
// onde a mensagem sai, o texto (com variáveis) e, opcionalmente, um número
// fixo de destino (padrão: contato do fluxo).
const FlowBuilderChannelMessageModal = ({ open, onSave, onUpdate, data, close }) => {
  const [active, setActive] = useState(false);
  const [labels, setLabels] = useState({ title: "Adicionar caixa de mensagem", btn: "Adicionar" });
  const [message, setMessage] = useState("");
  const [whatsappId, setWhatsappId] = useState("");
  const [number, setNumber] = useState("");
  const [whatsapps, setWhatsapps] = useState([]);

  useEffect(() => {
    if (!open) {
      setActive(false);
      return;
    }
    api
      .get("/whatsapp", { params: { session: 0 } })
      .then(({ data: list }) => setWhatsapps(list || []))
      .catch(() => setWhatsapps([]));

    if (open === "edit") {
      setLabels({ title: "Editar caixa de mensagem", btn: "Salvar" });
      const d = data?.data || {};
      setMessage(d.message || "");
      setWhatsappId(d.whatsappId || "");
      setNumber(d.number || "");
      setActive(true);
    } else if (open === "create") {
      setLabels({ title: "Adicionar caixa de mensagem", btn: "Adicionar" });
      setMessage("");
      setWhatsappId("");
      setNumber("");
      setActive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    close(null);
    setActive(false);
  };

  const handleSave = () => {
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) {
      toast.error("Informe o texto da mensagem.");
      return;
    }

    const chosen = whatsapps.find(w => String(w.id) === String(whatsappId));
    const payload = {
      message: cleanMessage,
      whatsappId: whatsappId || "",
      whatsappName: chosen ? chosen.name : "Conexão do fluxo",
      number: String(number || "").replace(/\D/g, "")
    };

    if (open === "edit") {
      handleClose();
      onUpdate({ ...data, data: { ...(data?.data || {}), ...payload } });
    } else {
      handleClose();
      onSave(payload);
    }
  };

  return (
    <Dialog open={active} onClose={handleClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>{labels.title}</DialogTitle>
      <DialogContent dividers>
        <Box mb={1}>
          <Typography variant="caption" color="textSecondary">
            Envia a mensagem pela conexão selecionada (independente da conexão
            que iniciou o fluxo). Destino padrão: o contato do fluxo. Variáveis
            suportadas: {"{{firstName}}"}, {"{{name}}"} e variáveis do fluxo.
          </Typography>
        </Box>
        <FormControl variant="outlined" fullWidth margin="dense">
          <InputLabel id="channel-msg-wa-label">Conexão WhatsApp (instância)</InputLabel>
          <Select
            labelId="channel-msg-wa-label"
            label="Conexão WhatsApp (instância)"
            value={whatsappId}
            onChange={e => setWhatsappId(e.target.value)}
          >
            <MenuItem value="">Conexão do fluxo (automática)</MenuItem>
            {whatsapps.map(w => (
              <MenuItem key={w.id} value={w.id}>
                {w.name} {w.status === "CONNECTED" ? "" : `(${w.status})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Mensagem"
          variant="outlined"
          fullWidth
          margin="dense"
          multiline
          minRows={4}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Olá {{firstName}}, tudo bem?"
        />
        <TextField
          label="Número de destino fixo (opcional, com DDI)"
          variant="outlined"
          fullWidth
          margin="dense"
          value={number}
          onChange={e => setNumber(e.target.value)}
          placeholder="Vazio = contato do fluxo"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary" variant="outlined">
          Cancelar
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          {labels.btn}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlowBuilderChannelMessageModal;
