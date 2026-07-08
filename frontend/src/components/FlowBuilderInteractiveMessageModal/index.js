import React, { useState, useEffect } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import IconButton from "@material-ui/core/IconButton";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import AddIcon from "@material-ui/icons/Add";
import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";

// Botões padrão pré-preenchidos (editáveis) — dados fictícios para o usuário
// entender o formato e ajustar para dados reais.
const DEFAULT_TEXT = "Olá {{firstName}}, escolha uma das opções abaixo:";
const DEFAULT_BUTTONS = [
  { id: "talk_to_agent", label: "Falar com atendente" },
  { id: "see_options", label: "Ver opções" },
  { id: "close_service", label: "Encerrar atendimento" }
];

// Modelos preparados para tipos futuros (ainda não executados no runtime).
const FUTURE_TEMPLATES = {
  list: "Ex.: seção 'Opções disponíveis' com Comercial, Suporte, Financeiro.",
  carousel: "Ex.: cards de produto/serviço com botão 'Ver detalhes'.",
  poll: "Ex.: 'Como você avalia nosso atendimento?' (Excelente/Bom/Regular/Ruim)."
};

const MAX_BUTTONS = 3; // Limite real da API/WhatsApp para botões nativos.

const useStyles = makeStyles(theme => ({
  root: { display: "flex", flexWrap: "wrap" },
  textField: { marginRight: theme.spacing(1), flex: 1 },
  buttonRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  notice: {
    background: "#fffbeb",
    border: "1px solid #fcd34d",
    color: "#92400e",
    borderRadius: 6,
    padding: "10px 12px",
    fontSize: 13,
    marginTop: 8
  }
}));

const FlowBuilderInteractiveMessageModal = ({ open, onSave, onUpdate, data, close }) => {
  const classes = useStyles();

  const [active, setActive] = useState(false);
  const [labels, setLabels] = useState({ title: "Adicionar mensagem interativa", btn: "Adicionar" });
  const [tab, setTab] = useState("buttons");
  const [text, setText] = useState(DEFAULT_TEXT);
  const [buttons, setButtons] = useState(DEFAULT_BUTTONS.map(b => ({ ...b })));

  useEffect(() => {
    if (open === "edit") {
      setLabels({ title: "Editar mensagem interativa", btn: "Salvar" });
      const d = data?.data || {};
      setTab(d.messageType || "buttons");
      setText(d.text || d.label || DEFAULT_TEXT);
      setButtons(
        Array.isArray(d.buttons) && d.buttons.length
          ? d.buttons.map(b => ({ id: b.id || "", label: b.label || b.displayText || "" }))
          : DEFAULT_BUTTONS.map(b => ({ ...b }))
      );
      setActive(true);
    } else if (open === "create") {
      setLabels({ title: "Adicionar mensagem interativa", btn: "Adicionar" });
      setTab("buttons");
      setText(DEFAULT_TEXT);
      setButtons(DEFAULT_BUTTONS.map(b => ({ ...b })));
      setActive(true);
    } else {
      setActive(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    close(null);
    setActive(false);
  };

  const addButton = () => {
    if (buttons.length >= MAX_BUTTONS) {
      toast.warning(`Limite de ${MAX_BUTTONS} botões (WhatsApp).`);
      return;
    }
    setButtons([...buttons, { id: "", label: "" }]);
  };

  const removeButton = i => {
    if (buttons.length <= 1) return;
    setButtons(buttons.filter((_, idx) => idx !== i));
  };

  const updateButton = (i, field, value) => {
    const next = [...buttons];
    next[i] = { ...next[i], [field]: value };
    setButtons(next);
  };

  const buildSummary = (validButtons) =>
    `${text.slice(0, 60)}${text.length > 60 ? "…" : ""} • ${validButtons.length} botão(ões)`;

  const handleSave = () => {
    // Nesta entrega, apenas Botões é executável no backend.
    if (tab !== "buttons") {
      toast.info("Nesta versão, apenas o tipo Botões é enviado. Lista/Carrossel/Enquete estão preparados para uma próxima etapa.");
      return;
    }

    const cleanText = String(text || "").trim();
    if (!cleanText) {
      toast.error("Informe o texto principal da mensagem.");
      return;
    }
    const validButtons = buttons
      .map(b => ({
        id: String(b.id || "").trim() || String(b.label || "").trim().toLowerCase().replace(/\s+/g, "_"),
        label: String(b.label || "").trim()
      }))
      .filter(b => b.label);
    if (!validButtons.length) {
      toast.error("Configure ao menos um botão com texto.");
      return;
    }

    const payload = {
      messageType: "buttons",
      text: cleanText,
      buttons: validButtons,
      label: buildSummary(validButtons)
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
    <div className={classes.root}>
      <Dialog open={active} onClose={handleClose} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>{labels.title}</DialogTitle>
        <DialogContent dividers>
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Botões" value="buttons" />
            <Tab label="Lista" value="list" />
            <Tab label="Carrossel" value="carousel" />
            <Tab label="Enquete" value="poll" />
          </Tabs>

          {tab === "buttons" && (
            <Box mt={2}>
              <TextField
                label="Texto da mensagem"
                multiline
                rows={3}
                variant="outlined"
                fullWidth
                margin="dense"
                value={text}
                onChange={e => setText(e.target.value)}
                helperText="Você pode usar variáveis como {{firstName}}."
              />
              <Typography variant="subtitle2" style={{ marginTop: 12, marginBottom: 4 }}>
                Botões (máx. {MAX_BUTTONS})
              </Typography>
              {buttons.map((btn, i) => (
                <div className={classes.buttonRow} key={i}>
                  <TextField
                    label={`Botão ${i + 1}`}
                    variant="outlined"
                    size="small"
                    style={{ flex: 2 }}
                    value={btn.label}
                    onChange={e => updateButton(i, "label", e.target.value)}
                  />
                  <TextField
                    label="ID (opcional)"
                    variant="outlined"
                    size="small"
                    style={{ flex: 1 }}
                    value={btn.id}
                    onChange={e => updateButton(i, "id", e.target.value)}
                  />
                  <IconButton size="small" onClick={() => removeButton(i)} disabled={buttons.length <= 1}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </div>
              ))}
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={addButton}
                disabled={buttons.length >= MAX_BUTTONS}
              >
                Adicionar botão
              </Button>
            </Box>
          )}

          {tab !== "buttons" && (
            <Box mt={2}>
              <div className={classes.notice}>
                O tipo <b>{tab === "list" ? "Lista" : tab === "carousel" ? "Carrossel" : "Enquete"}</b> está
                preparado visualmente, mas ainda não é enviado pelo fluxo nesta versão — use <b>Botões</b> por
                enquanto. {FUTURE_TEMPLATES[tab]}
              </div>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary" variant="outlined">
            {i18n.t("contactModal.buttons.cancel")}
          </Button>
          <Button color="primary" variant="contained" onClick={handleSave}>
            {labels.btn}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default FlowBuilderInteractiveMessageModal;
