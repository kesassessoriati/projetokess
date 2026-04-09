import React, { useMemo, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import AddIcon from "@material-ui/icons/Add";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import SendIcon from "@material-ui/icons/Send";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(() => ({
  paper: { borderRadius: 16, overflow: "hidden" },
  titleRoot: {
    padding: 0,
    background: "linear-gradient(135deg, #075E54 0%, #128C7E 55%, #25D366 100%)",
    color: "#fff"
  },
  titleInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 20px 14px"
  },
  titleText: { fontWeight: 700, fontSize: 20 },
  subtitle: { fontSize: 12, opacity: 0.82, marginTop: 4 },
  closeBtn: { color: "#fff" },
  content: { backgroundColor: "#f4f7f8", padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    marginBottom: 14
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#667781",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 10
  },
  typeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
    gap: 8
  },
  typeBtn: {
    borderRadius: 12,
    padding: "10px 8px",
    border: "2px solid transparent",
    backgroundColor: "#f8fafc",
    textAlign: "center",
    color: "#667781",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer"
  },
  typeBtnActive: {
    borderColor: "#075E54",
    backgroundColor: "#e8f5e9",
    color: "#075E54"
  },
  note: {
    borderRadius: 10,
    padding: "10px 12px",
    border: "1px solid #fde68a",
    backgroundColor: "#fffbeb",
    marginBottom: 12,
    fontSize: 11,
    color: "#92400e"
  },
  okNote: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
    color: "#15803d"
  },
  row: {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    marginTop: 8,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    border: "1px solid #e2e8f0"
  },
  index: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    backgroundColor: "#075E54",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 8
  },
  addBtn: {
    marginTop: 10,
    borderRadius: 10,
    textTransform: "none",
    borderColor: "#075E54",
    color: "#075E54"
  },
  sectionCard: {
    padding: 12,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    marginTop: 10
  },
  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  actions: { backgroundColor: "#f4f7f8", padding: "0 16px 18px" },
  cancelBtn: { borderRadius: 10, textTransform: "none", fontWeight: 700 },
  sendBtn: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 700,
    background: "linear-gradient(135deg, #075E54, #25D366)",
    color: "#fff",
    "&:hover": { background: "linear-gradient(135deg, #064d46, #1aab52)" }
  }
}));

const MESSAGE_TYPES = [
  { value: "buttons", label: "Botoes" },
  { value: "list", label: "Lista" },
  { value: "carousel", label: "Carrossel" },
  { value: "poll", label: "Enquete" },
  { value: "pix", label: "PIX" }
];

const BUTTON_TYPES = [
  { value: "quick_reply", label: "Resposta rapida" },
  { value: "cta_url", label: "Abrir URL" },
  { value: "cta_call", label: "Ligar" },
  { value: "cta_copy", label: "Copiar codigo" }
];

const BUTTONS_TEMPLATE = {
  text: "Selecione uma das opcoes abaixo para continuar o atendimento:",
  footer: "Mensagem de teste com botoes",
  buttons: [
    { displayText: "Sim, quero!", type: "quick_reply", value: "btn_sim" },
    { displayText: "Ver site", type: "cta_url", value: "https://seusite.com.br" },
    { displayText: "Ligar agora", type: "cta_call", value: "5511999998888" },
    { displayText: "Copiar codigo", type: "cta_copy", value: "CODIGO123" }
  ]
};

const LIST_TEMPLATE = {
  text: "Selecione uma das opcoes abaixo para continuar o atendimento:",
  buttonText: "Ver opcoes",
  footer: "",
  sections: [{
    title: "Servicos",
    rows: [
      { title: "Suporte tecnico", rowId: "row_suporte", description: "Duvidas e problemas" },
      { title: "Financeiro", rowId: "row_financeiro", description: "Boletos, pagamentos" },
      { title: "Comercial", rowId: "row_comercial", description: "Orcamentos e propostas" }
    ]
  }]
};

const CAROUSEL_TEMPLATE = [
  {
    headerTitle: "Oferta Especial",
    imageUrl: "https://www.w3schools.com/w3css/img_lights.jpg",
    body: "Aproveite nossas melhores ofertas com desconto exclusivo!",
    footer: "Valido ate hoje",
    buttons: [
      { displayText: "Ver oferta", type: "cta_url", value: "https://seusite.com.br/oferta" },
      { displayText: "Quero!", type: "quick_reply", value: "btn_quero" }
    ]
  },
  {
    headerTitle: "Novo Produto",
    imageUrl: "https://www.w3schools.com/w3css/img_forest.jpg",
    body: "Conheca nossa nova linha de produtos premium.",
    footer: "Frete gratis",
    buttons: [
      { displayText: "Saber mais", type: "quick_reply", value: "btn_info" },
      { displayText: "Ligar", type: "cta_call", value: "5511999998888" }
    ]
  }
];

const POLL_TEMPLATE = {
  name: "Qual o seu horario preferido para atendimento?",
  options: ["Manha (8h-12h)", "Tarde (13h-17h)", "Noite (18h-22h)"],
  selectableCount: 1
};

const PIX_TEMPLATE = {
  title: "Pagamento via PIX",
  value: "49,90",
  keyType: "PHONE",
  merchantName: "Sua Empresa",
  key: "11999998888"
};

const cloneButtons = () => BUTTONS_TEMPLATE.buttons.map((button) => ({ ...button }));
const cloneSections = () => LIST_TEMPLATE.sections.map((section) => ({ ...section, rows: section.rows.map((row) => ({ ...row })) }));
const cloneCards = () => CAROUSEL_TEMPLATE.map((card) => ({ ...card, buttons: card.buttons.map((button) => ({ ...button })) }));

const parseMoney = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return NaN;
  if (raw.includes(",") && raw.includes(".")) return Number(raw.replace(/\./g, "").replace(",", "."));
  if (raw.includes(",")) return Number(raw.replace(",", "."));
  return Number(raw);
};

const mapButtonPayload = (button) => {
  const base = { type: button.type, displayText: String(button.displayText || "").trim() };
  if (button.type === "quick_reply") return { ...base, id: String(button.value || button.displayText || "").trim() };
  if (button.type === "cta_url") return { ...base, url: String(button.value || "").trim() };
  if (button.type === "cta_call") return { ...base, phoneNumber: String(button.value || "").trim() };
  return { ...base, code: String(button.value || "").trim() };
};

const getValueLabel = (type) => type === "cta_url" ? "URL" : type === "cta_call" ? "Numero" : type === "cta_copy" ? "Codigo" : "ID";
const getValuePlaceholder = (type) => type === "cta_url" ? "https://seusite.com.br" : type === "cta_call" ? "5511999998888" : type === "cta_copy" ? "CODIGO123" : "btn_confirmar";

export default function ButtonModal({ modalOpen, onClose, ticketId }) {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState("buttons");
  const [buttonsText, setButtonsText] = useState(BUTTONS_TEMPLATE.text);
  const [buttonsFooter, setButtonsFooter] = useState(BUTTONS_TEMPLATE.footer);
  const [buttons, setButtons] = useState(cloneButtons());
  const [listText, setListText] = useState(LIST_TEMPLATE.text);
  const [listButtonText, setListButtonText] = useState(LIST_TEMPLATE.buttonText);
  const [listFooter, setListFooter] = useState(LIST_TEMPLATE.footer);
  const [listSections, setListSections] = useState(cloneSections());
  const [carouselCards, setCarouselCards] = useState(cloneCards());
  const [pollName, setPollName] = useState(POLL_TEMPLATE.name);
  const [pollOptions, setPollOptions] = useState([...POLL_TEMPLATE.options]);
  const [pollSelectableCount, setPollSelectableCount] = useState(POLL_TEMPLATE.selectableCount);
  const [pixTitle, setPixTitle] = useState(PIX_TEMPLATE.title);
  const [pixValue, setPixValue] = useState(PIX_TEMPLATE.value);
  const [pixKeyType, setPixKeyType] = useState(PIX_TEMPLATE.keyType);
  const [pixMerchantName, setPixMerchantName] = useState(PIX_TEMPLATE.merchantName);
  const [pixKey, setPixKey] = useState(PIX_TEMPLATE.key);

  const totalListRows = useMemo(() => listSections.reduce((acc, section) => acc + ((section.rows || []).length), 0), [listSections]);
  const buttonsValid = useMemo(() => buttons.length > 0 && buttons.every((button) => {
    if (!String(button.displayText || "").trim()) return false;
    if (button.type !== "quick_reply" && !String(button.value || "").trim()) return false;
    return true;
  }), [buttons]);
  const listValid = useMemo(() => String(listText || "").trim() && String(listButtonText || "").trim() && totalListRows >= 1 && totalListRows <= 10 && listSections.every((section) => (section.rows || []).every((row) => String(row.title || "").trim() && String(row.rowId || "").trim())), [listButtonText, listSections, listText, totalListRows]);
  const carouselValid = useMemo(() => carouselCards.length >= 1 && carouselCards.every((card) => String(card.body || "").trim()) && carouselCards.every((card) => (card.buttons || []).every((button) => String(button.displayText || "").trim() && (button.type === "quick_reply" || String(button.value || "").trim()))), [carouselCards]);
  const pollValid = useMemo(() => String(pollName || "").trim() && pollOptions.length >= 2 && pollOptions.every((option) => String(option || "").trim()), [pollName, pollOptions]);
  const pixValid = useMemo(() => !Number.isNaN(parseMoney(pixValue)) && parseMoney(pixValue) > 0 && String(pixTitle || "").trim() && String(pixKeyType || "").trim() && String(pixMerchantName || "").trim() && String(pixKey || "").trim(), [pixKey, pixKeyType, pixMerchantName, pixTitle, pixValue]);

  const canSend = useMemo(() => {
    if (messageType === "buttons") return String(buttonsText || "").trim() && buttonsValid;
    if (messageType === "list") return listValid;
    if (messageType === "carousel") return carouselValid;
    if (messageType === "poll") return pollValid;
    if (messageType === "pix") return pixValid;
    return false;
  }, [buttonsText, buttonsValid, carouselValid, listValid, messageType, pixValid, pollValid]);

  const updateButton = (index, field, value) => setButtons((prev) => prev.map((button, current) => current === index ? { ...button, [field]: value } : button));
  const addButton = () => buttons.length < 4 && setButtons((prev) => [...prev, { displayText: "", type: "quick_reply", value: "" }]);
  const removeButton = (index) => setButtons((prev) => {
    const next = prev.filter((_, current) => current !== index);
    return next.length ? next : [{ displayText: "", type: "quick_reply", value: "" }];
  });

  const updateSectionTitle = (sectionIndex, value) => setListSections((prev) => prev.map((section, current) => current === sectionIndex ? { ...section, title: value } : section));
  const updateRow = (sectionIndex, rowIndex, field, value) => setListSections((prev) => prev.map((section, currentSection) => currentSection !== sectionIndex ? section : { ...section, rows: (section.rows || []).map((row, currentRow) => currentRow === rowIndex ? { ...row, [field]: value } : row) }));
  const addRow = (sectionIndex) => totalListRows < 10 && setListSections((prev) => prev.map((section, current) => current !== sectionIndex ? section : { ...section, rows: [...(section.rows || []), { title: "", rowId: "", description: "" }] }));
  const removeRow = (sectionIndex, rowIndex) => setListSections((prev) => prev.map((section, currentSection) => {
    if (currentSection !== sectionIndex) return section;
    const nextRows = (section.rows || []).filter((_, currentRow) => currentRow !== rowIndex);
    return { ...section, rows: nextRows.length ? nextRows : [{ title: "", rowId: "", description: "" }] };
  }));
  const addSection = () => totalListRows < 10 && setListSections((prev) => [...prev, { title: "", rows: [{ title: "", rowId: "", description: "" }] }]);
  const removeSection = (sectionIndex) => setListSections((prev) => {
    const next = prev.filter((_, current) => current !== sectionIndex);
    return next.length ? next : [{ title: "", rows: [{ title: "", rowId: "", description: "" }] }];
  });

  const updateCard = (cardIndex, field, value) => setCarouselCards((prev) => prev.map((card, current) => current === cardIndex ? { ...card, [field]: value } : card));
  const addCard = () => carouselCards.length < 10 && setCarouselCards((prev) => [...prev, { headerTitle: "", imageUrl: "", body: "", footer: "", buttons: [{ displayText: "", type: "quick_reply", value: "" }] }]);
  const removeCard = (cardIndex) => setCarouselCards((prev) => prev.filter((_, current) => current !== cardIndex));
  const updateCardButton = (cardIndex, buttonIndex, field, value) => setCarouselCards((prev) => prev.map((card, currentCard) => currentCard !== cardIndex ? card : { ...card, buttons: (card.buttons || []).map((button, currentButton) => currentButton === buttonIndex ? { ...button, [field]: value } : button) }));
  const addCardButton = (cardIndex) => setCarouselCards((prev) => prev.map((card, current) => current !== cardIndex || (card.buttons || []).length >= 3 ? card : { ...card, buttons: [...(card.buttons || []), { displayText: "", type: "quick_reply", value: "" }] }));
  const removeCardButton = (cardIndex, buttonIndex) => setCarouselCards((prev) => prev.map((card, current) => {
    if (current !== cardIndex) return card;
    const next = (card.buttons || []).filter((_, currentButton) => currentButton !== buttonIndex);
    return { ...card, buttons: next.length ? next : [{ displayText: "", type: "quick_reply", value: "" }] };
  }));

  const updatePollOption = (index, value) => setPollOptions((prev) => prev.map((option, current) => current === index ? value : option));
  const addPollOption = () => pollOptions.length < 12 && setPollOptions((prev) => [...prev, ""]);
  const removePollOption = (index) => pollOptions.length > 2 && setPollOptions((prev) => prev.filter((_, current) => current !== index));

  const handleClose = () => !loading && onClose();

  const handleSend = async () => {
    if (!canSend || loading) return;
    setLoading(true);
    try {
      if (messageType === "buttons") {
        await api.post(`/messages/buttons/${ticketId}`, {
          text: String(buttonsText || "").trim(),
          footer: String(buttonsFooter || "").trim(),
          buttons: buttons.map(mapButtonPayload)
        });
      } else if (messageType === "list") {
        await api.post(`/messages/lista/${ticketId}`, {
          title: "",
          text: String(listText || "").trim(),
          buttonText: String(listButtonText || "").trim(),
          footer: String(listFooter || "").trim(),
          sections: listSections.map((section) => ({
            title: String(section.title || "").trim(),
            rows: (section.rows || []).map((row) => ({
              title: String(row.title || "").trim(),
              rowId: String(row.rowId || "").trim(),
              description: String(row.description || "").trim()
            }))
          }))
        });
      } else if (messageType === "carousel") {
        await api.post(`/messages/carousel/${ticketId}`, {
          cards: carouselCards.map((card) => ({
            header: { imageUrl: String(card.imageUrl || "").trim(), title: String(card.headerTitle || "").trim(), subtitle: "" },
            body: String(card.body || "").trim(),
            footer: String(card.footer || "").trim(),
            buttons: (card.buttons || []).map(mapButtonPayload)
          }))
        });
      } else if (messageType === "poll") {
        await api.post(`/messages/poll/${ticketId}`, {
          name: String(pollName || "").trim(),
          options: pollOptions.map((option) => String(option || "").trim()).filter(Boolean),
          selectableCount: Number(pollSelectableCount) || 1
        });
      } else if (messageType === "pix") {
        let normalizedPixKey = String(pixKey || "").trim();
        if (pixKeyType === "PHONE") {
          normalizedPixKey = normalizedPixKey.replace(/\D/g, "");
          if (normalizedPixKey && !normalizedPixKey.startsWith("55")) normalizedPixKey = `55${normalizedPixKey}`;
          if (normalizedPixKey) normalizedPixKey = `+${normalizedPixKey}`;
        }
        await api.post(`/messages/PIX/${ticketId}`, {
          title: String(pixTitle || "").trim(),
          sendvalue: parseMoney(pixValue),
          sendkey_type: pixKeyType,
          sendmerchant_name: String(pixMerchantName || "").trim(),
          sendKey: normalizedPixKey
        });
      }
      onClose();
    } catch (error) {
      toastError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={modalOpen} onClose={handleClose} maxWidth="md" fullWidth classes={{ paper: classes.paper }}>
      <DialogTitle disableTypography className={classes.titleRoot}>
        <div className={classes.titleInner}>
          <div>
            <Typography className={classes.titleText}>Mensagem Interativa</Typography>
            <Typography className={classes.subtitle}>Modelos prontos para usar direto no chat.</Typography>
          </div>
          <IconButton className={classes.closeBtn} onClick={handleClose}><CloseIcon /></IconButton>
        </div>
      </DialogTitle>

      <DialogContent className={classes.content}>
        <Box className={classes.card}>
          <Typography className={classes.label}>Tipo de mensagem</Typography>
          <div className={classes.typeGrid}>
            {MESSAGE_TYPES.map((type) => (
              <div
                key={type.value}
                className={`${classes.typeBtn} ${messageType === type.value ? classes.typeBtnActive : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => setMessageType(type.value)}
                onKeyPress={(event) => (event.key === "Enter" || event.key === " ") && setMessageType(type.value)}
              >
                {type.label}
              </div>
            ))}
          </div>
        </Box>

        {messageType === "buttons" && (
          <Box className={classes.card}>
            <Typography className={classes.label}>Botoes de acao</Typography>
            <Box className={classes.note}>Mesmo modelo do disparador rapido: texto principal, rodape e ate 4 botoes mistos.</Box>
            <TextField fullWidth variant="outlined" size="small" label="Mensagem principal *" value={buttonsText} onChange={(e) => setButtonsText(e.target.value)} multiline rows={3} InputProps={{ style: { borderRadius: 10, fontSize: 14 } }} />
            <TextField fullWidth variant="outlined" size="small" label="Rodape (opcional)" value={buttonsFooter} onChange={(e) => setButtonsFooter(e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 14 } }} style={{ marginTop: 10 }} />
            {buttons.map((button, index) => (
              <Box key={`button-${index}`} className={classes.row}>
                <Box className={classes.index}>{index + 1}</Box>
                <Box flex={1} display="flex" flexDirection="column" style={{ gap: 8 }}>
                  <TextField fullWidth variant="outlined" size="small" label="Texto do botao *" value={button.displayText} onChange={(e) => updateButton(index, "displayText", e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} />
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={4}>
                      <FormControl variant="outlined" size="small" fullWidth>
                        <Select value={button.type} onChange={(e) => updateButton(index, "type", e.target.value)} style={{ borderRadius: 10, fontSize: 13 }}>
                          {BUTTON_TYPES.map((type) => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={8}>
                      <TextField fullWidth variant="outlined" size="small" label={`${getValueLabel(button.type)}${button.type === "quick_reply" ? " (opcional)" : " *"}`} placeholder={getValuePlaceholder(button.type)} value={button.value} onChange={(e) => updateButton(index, "value", e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} />
                    </Grid>
                  </Grid>
                </Box>
                <IconButton size="small" onClick={() => removeButton(index)} disabled={buttons.length <= 1} style={{ color: "#ef4444", marginTop: 4 }}><DeleteOutlineIcon fontSize="small" /></IconButton>
              </Box>
            ))}
            {buttons.length < 4 && <Button variant="outlined" size="small" className={classes.addBtn} startIcon={<AddIcon />} onClick={addButton}>Adicionar botao</Button>}
          </Box>
        )}

        {messageType === "list" && (
          <Box className={classes.card}>
            <Typography className={classes.label}>Lista selecionavel</Typography>
            <Box className={`${classes.note} ${classes.okNote}`}>Exemplo valido ja carregado. Edite botao, secoes e itens antes de enviar.</Box>
            <TextField fullWidth variant="outlined" size="small" label="Texto da mensagem da lista *" value={listText} onChange={(e) => setListText(e.target.value)} multiline rows={3} InputProps={{ style: { borderRadius: 10, fontSize: 14 } }} />
            <Grid container spacing={1} style={{ marginTop: 2 }}>
              <Grid item xs={12} sm={6}><TextField fullWidth variant="outlined" size="small" label="Texto do botao *" value={listButtonText} onChange={(e) => setListButtonText(e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 14 } }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth variant="outlined" size="small" label="Rodape (opcional)" value={listFooter} onChange={(e) => setListFooter(e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 14 } }} /></Grid>
            </Grid>
            <Typography className={classes.label} style={{ marginTop: 14 }}>Secoes e itens ({totalListRows}/10)</Typography>
            {listSections.map((section, sectionIndex) => (
              <Box key={`section-${sectionIndex}`} className={classes.sectionCard}>
                <Box className={classes.sectionHead}>
                  <Typography style={{ fontWeight: 700, fontSize: 13, color: "#075E54" }}>Secao {sectionIndex + 1}</Typography>
                  {listSections.length > 1 && <IconButton size="small" onClick={() => removeSection(sectionIndex)} style={{ color: "#ef4444" }}><DeleteOutlineIcon fontSize="small" /></IconButton>}
                </Box>
                <TextField fullWidth variant="outlined" size="small" label="Titulo da secao (opcional)" value={section.title} onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} />
                {(section.rows || []).map((row, rowIndex) => (
                  <Box key={`row-${sectionIndex}-${rowIndex}`} className={classes.row}>
                    <Box className={classes.index}>{rowIndex + 1}</Box>
                    <Box flex={1} display="flex" flexDirection="column" style={{ gap: 8 }}>
                      <TextField fullWidth variant="outlined" size="small" label="Titulo do item *" value={row.title} onChange={(e) => updateRow(sectionIndex, rowIndex, "title", e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} />
                      <Grid container spacing={1}>
                        <Grid item xs={12} sm={6}><TextField fullWidth variant="outlined" size="small" label="ID do item *" value={row.rowId} onChange={(e) => updateRow(sectionIndex, rowIndex, "rowId", e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth variant="outlined" size="small" label="Descricao (opcional)" value={row.description || ""} onChange={(e) => updateRow(sectionIndex, rowIndex, "description", e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} /></Grid>
                      </Grid>
                    </Box>
                    <IconButton size="small" onClick={() => removeRow(sectionIndex, rowIndex)} disabled={(section.rows || []).length <= 1} style={{ color: "#ef4444", marginTop: 4 }}><DeleteOutlineIcon fontSize="small" /></IconButton>
                  </Box>
                ))}
                {totalListRows < 10 && <Button variant="outlined" size="small" className={classes.addBtn} startIcon={<AddIcon />} onClick={() => addRow(sectionIndex)}>Adicionar item</Button>}
              </Box>
            ))}
            {totalListRows < 10 && <Button variant="outlined" size="small" className={classes.addBtn} startIcon={<AddIcon />} onClick={addSection}>Adicionar secao</Button>}
          </Box>
        )}

        {messageType === "carousel" && (
          <Box className={classes.card}>
            <Typography className={classes.label}>Cards do carrossel ({carouselCards.length}/10)</Typography>
            <Box className={classes.note}>Mesmo exemplo do disparador rapido. Edite imagem, texto e botoes de cada card.</Box>
            {carouselCards.map((card, cardIndex) => (
              <Box key={`card-${cardIndex}`} className={classes.sectionCard}>
                <Box className={classes.sectionHead}>
                  <Typography style={{ fontWeight: 700, fontSize: 13, color: "#075E54" }}>Card {cardIndex + 1}</Typography>
                  {carouselCards.length > 1 && <IconButton size="small" onClick={() => removeCard(cardIndex)} style={{ color: "#ef4444" }}><DeleteOutlineIcon fontSize="small" /></IconButton>}
                </Box>
                <Box display="flex" flexDirection="column" style={{ gap: 8 }}>
                  <TextField fullWidth variant="outlined" size="small" label="Titulo" value={card.headerTitle} onChange={(e) => updateCard(cardIndex, "headerTitle", e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} />
                  <TextField fullWidth variant="outlined" size="small" label="URL da imagem" value={card.imageUrl} onChange={(e) => updateCard(cardIndex, "imageUrl", e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} />
                  <TextField fullWidth variant="outlined" size="small" label="Corpo da mensagem *" value={card.body} onChange={(e) => updateCard(cardIndex, "body", e.target.value)} multiline rows={2} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} />
                  <TextField fullWidth variant="outlined" size="small" label="Rodape (opcional)" value={card.footer} onChange={(e) => updateCard(cardIndex, "footer", e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} />
                  {(card.buttons || []).map((button, buttonIndex) => (
                    <Box key={`card-button-${cardIndex}-${buttonIndex}`} className={classes.row}>
                      <Box className={classes.index}>{buttonIndex + 1}</Box>
                      <Box flex={1} display="flex" flexDirection="column" style={{ gap: 8 }}>
                        <TextField fullWidth variant="outlined" size="small" label="Texto do botao *" value={button.displayText} onChange={(e) => updateCardButton(cardIndex, buttonIndex, "displayText", e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} />
                        <Grid container spacing={1}>
                          <Grid item xs={12} sm={4}>
                            <FormControl variant="outlined" size="small" fullWidth>
                              <Select value={button.type} onChange={(e) => updateCardButton(cardIndex, buttonIndex, "type", e.target.value)} style={{ borderRadius: 10, fontSize: 13 }}>
                                {BUTTON_TYPES.map((type) => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={8}>
                            <TextField fullWidth variant="outlined" size="small" label={`${getValueLabel(button.type)}${button.type === "quick_reply" ? " (opcional)" : " *"}`} placeholder={getValuePlaceholder(button.type)} value={button.value} onChange={(e) => updateCardButton(cardIndex, buttonIndex, "value", e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} />
                          </Grid>
                        </Grid>
                      </Box>
                      <IconButton size="small" onClick={() => removeCardButton(cardIndex, buttonIndex)} disabled={(card.buttons || []).length <= 1} style={{ color: "#ef4444", marginTop: 4 }}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Box>
                  ))}
                  {(card.buttons || []).length < 3 && <Button variant="outlined" size="small" className={classes.addBtn} startIcon={<AddIcon />} onClick={() => addCardButton(cardIndex)}>Adicionar botao</Button>}
                </Box>
              </Box>
            ))}
            {carouselCards.length < 10 && <Button variant="outlined" size="small" className={classes.addBtn} startIcon={<AddIcon />} onClick={addCard}>Adicionar card</Button>}
          </Box>
        )}

        {messageType === "poll" && (
          <Box className={classes.card}>
            <Typography className={classes.label}>Enquete</Typography>
            <Box className={classes.note}>Mesmo modelo do disparador rapido. Edite a pergunta e as opcoes antes de enviar.</Box>
            <TextField fullWidth variant="outlined" size="small" label="Pergunta da enquete *" value={pollName} onChange={(e) => setPollName(e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 14 } }} />
            <FormControl variant="outlined" size="small" fullWidth style={{ marginTop: 10 }}>
              <Select value={pollSelectableCount} onChange={(e) => setPollSelectableCount(e.target.value)} style={{ borderRadius: 10, fontSize: 13 }}>
                <MenuItem value={1}>Escolha unica (1)</MenuItem>
                <MenuItem value={0}>Multipla escolha</MenuItem>
              </Select>
            </FormControl>
            {pollOptions.map((option, index) => (
              <Box key={`poll-${index}`} className={classes.row}>
                <Box className={classes.index}>{index + 1}</Box>
                <Box flex={1}><TextField fullWidth variant="outlined" size="small" label={`Opcao ${index + 1}`} value={option} onChange={(e) => updatePollOption(index, e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 13 } }} /></Box>
                <IconButton size="small" onClick={() => removePollOption(index)} disabled={pollOptions.length <= 2} style={{ color: "#ef4444", marginTop: 4 }}><DeleteOutlineIcon fontSize="small" /></IconButton>
              </Box>
            ))}
            {pollOptions.length < 12 && <Button variant="outlined" size="small" className={classes.addBtn} startIcon={<AddIcon />} onClick={addPollOption}>Adicionar opcao</Button>}
            <Box className={`${classes.note} ${classes.okNote}`} style={{ marginTop: 10 }}>Enquetes funcionam apenas em conversas individuais. Os votos aparecem na conversa em tempo real.</Box>
          </Box>
        )}

        {messageType === "pix" && (
          <Box className={classes.card}>
            <Typography className={classes.label}>Pagamento por PIX</Typography>
            <Box className={classes.note}>A API atual tem rota dedicada de PIX, entao a opcao foi mantida e validada no modal.</Box>
            <Grid container spacing={1}>
              <Grid item xs={12}><TextField fullWidth variant="outlined" size="small" label="Titulo *" value={pixTitle} onChange={(e) => setPixTitle(e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 14 } }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth variant="outlined" size="small" label="Valor *" helperText="Use virgula ou ponto. Ex.: 49,90" value={pixValue} onChange={(e) => setPixValue(e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 14 } }} /></Grid>
              <Grid item xs={12} sm={6}>
                <FormControl variant="outlined" size="small" fullWidth>
                  <Select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value)} style={{ borderRadius: 10, fontSize: 13 }}>
                    <MenuItem value="CNPJ">CNPJ</MenuItem>
                    <MenuItem value="CPF">CPF</MenuItem>
                    <MenuItem value="PHONE">Telefone</MenuItem>
                    <MenuItem value="EMAIL">E-mail</MenuItem>
                    <MenuItem value="EVP">Chave aleatoria</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}><TextField fullWidth variant="outlined" size="small" label="Nome do recebedor *" value={pixMerchantName} onChange={(e) => setPixMerchantName(e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 14 } }} /></Grid>
              <Grid item xs={12}><TextField fullWidth variant="outlined" size="small" label="Chave PIX *" value={pixKey} onChange={(e) => setPixKey(e.target.value)} InputProps={{ style: { borderRadius: 10, fontSize: 14 } }} /></Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions className={classes.actions}>
        <Button onClick={handleClose} className={classes.cancelBtn}>Cancelar</Button>
        <Button className={classes.sendBtn} startIcon={<SendIcon />} onClick={handleSend} disabled={!canSend || loading}>
          {loading ? "Enviando..." : { buttons: "Enviar com Botoes", list: "Enviar Lista", carousel: "Enviar Carrossel", poll: "Enviar Enquete", pix: "Enviar PIX" }[messageType]}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
