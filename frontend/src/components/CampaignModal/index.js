import React, { useState, useEffect, useRef, useContext } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { head } from "lodash";
import { makeStyles } from "@material-ui/core/styles";
import { green, blue, red, orange } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import { Slide } from "@material-ui/core";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import { isNil } from "lodash";
import { i18n } from "../../translate/i18n";
import moment from "moment";
import CancelIcon from "@mui/icons-material/Cancel";
import SaveIcon from "@mui/icons-material/Save";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import {
  Box,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Tab,
  Tabs,
  InputAdornment,
  Avatar,
  Popover,
  Typography,
} from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import UserStatusIcon from "../UserModal/statusIcon";
import Autocomplete, {
  createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import EmojiPicker from "emoji-picker-react";
import Draggable from "react-draggable";
import Paper from "@material-ui/core/Paper";
import { getBackendUrl } from "../../config";
import MediaDrivePickerModal from "../MediaDrivePickerModal";
import QuickRepliesModal from "../QuickRepliesModal";
import {
  getPreferredWhatsappId,
  sortWhatsappsByUserQueues,
} from "../../utils/whatsappQueuePreference";

// Icons for fields
import CampaignIcon from "@mui/icons-material/Campaign";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContactsIcon from "@mui/icons-material/Contacts";
import LabelIcon from "@mui/icons-material/Label";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TicketIcon from "@mui/icons-material/ConfirmationNumber";
import QueueIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import MessageIcon from "@mui/icons-material/Message";
import InsertEmoticonIcon from "@mui/icons-material/InsertEmoticon";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

// Transition component
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  dialogPaper: {
    borderRadius: "8px",
    boxShadow:
      "0px 8px 40px rgba(0, 212, 255, 0.12), 0px 4px 16px rgba(0, 0, 0, 0.5)",
    background: "#ffffff",
    minWidth: "500px",
    maxWidth: "800px",
  },
  dialogPaperExpanded: {
    borderRadius: "8px",
    boxShadow:
      "0px 8px 40px rgba(0, 212, 255, 0.12), 0px 4px 16px rgba(0, 0, 0, 0.5)",
    background: "#ffffff",
    width: "min(1180px, 96vw)",
    maxWidth: "96vw",
  },
  dialogTitle: {
    backgroundColor: "#0a0a0a",
    borderBottom: "2px solid #00d4ff",
    color: "white",
    padding: "16px 24px",
    borderRadius: "8px 8px 0 0",
    fontSize: "1.5rem",
    fontWeight: 600,
    cursor: "move",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start", // Alterado para alinhar à esquerda
    gap: theme.spacing(1),
  },
  dialogContent: {
    padding: "24px",
    background: "#f9fafc",
    overflow: "hidden",
  },
  dialogContentLayout: {
    display: "flex",
    alignItems: "stretch",
    gap: 16,
  },
  dialogContentMain: {
    flex: 1,
    minWidth: 0,
  },
  dialogActions: {
    padding: "16px 24px",
    background: "#f5f7fa",
    borderRadius: "0 0 8px 8px",
    display: "flex",
    justifyContent: "space-between",
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      "& fieldset": {
        borderColor: "#e0e0e0",
      },
      "&:hover fieldset": {
        borderColor: "#00d4ff",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#00d4ff",
        borderWidth: "1px",
      },
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "#00d4ff",
    },
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
    },
  },
  cancelButton: {
    backgroundColor: red[500],
    color: "white",
    "&:hover": {
      backgroundColor: red[700],
    },
    borderRadius: "8px",
    padding: "8px 16px",
    textTransform: "none",
    fontWeight: 500,
    boxShadow: "none",
  },
  saveButton: {
    backgroundColor: blue[500],
    color: "white",
    "&:hover": {
      backgroundColor: blue[700],
    },
    borderRadius: "8px",
    padding: "8px 16px",
    textTransform: "none",
    fontWeight: 500,
    boxShadow: "none",
  },
  attachButton: {
    backgroundColor: green[500],
    color: "white",
    "&:hover": {
      backgroundColor: green[700],
    },
    borderRadius: "8px",
    padding: "8px 16px",
    textTransform: "none",
    fontWeight: 500,
    boxShadow: "none",
  },
  restartButton: {
    backgroundColor: orange[500],
    color: "white",
    "&:hover": {
      backgroundColor: orange[700],
    },
    borderRadius: "8px",
    padding: "8px 16px",
    textTransform: "none",
    fontWeight: 500,
    boxShadow: "none",
  },
  tabs: {
    backgroundColor: "#0f0f0f",
    color: "white",
    borderRadius: "8px 8px 0 0",
    "& .MuiTabs-indicator": {
      backgroundColor: "#00d4ff",
      height: "3px",
      boxShadow: "0 0 8px #00d4ff",
    },
  },
  tab: {
    color: "white",
    fontWeight: 500,
    minWidth: "auto",
    padding: "12px 16px",
    "&.Mui-selected": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  },
  emojiPickerContainer: {
    padding: "10px",
    borderRadius: "8px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    backgroundColor: "#fff",
  },
  fieldIcon: {
    color: "#00d4ff",
    marginRight: theme.spacing(1),
  },
  avatar: {
    backgroundColor: "#00d4ff",
    width: theme.spacing(4),
    height: theme.spacing(4),
  },
  statusBadge: {
    backgroundColor: green[500],
    width: 12,
    height: 12,
    borderRadius: "50%",
    position: "absolute",
    bottom: 0,
    right: 0,
    border: "2px solid white",
  },
  messageField: {
    position: "relative",
    "& .MuiInputBase-root": {
      alignItems: "flex-start",
    },
  },
  emojiButton: {
    position: "absolute",
    right: 8,
    top: 8,
    zIndex: 1,
  },
  quickRepliesToggle: {
    borderRadius: 10,
    border: "1px solid rgba(0, 212, 255, 0.18)",
    backgroundColor: "#eef9ff",
    color: "#0891b2",
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "none",
    "&:hover": {
      backgroundColor: "#dff6ff",
    },
  },
  phonePreviewContainer: {
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  phoneFrame: {
    width: 260,
    height: 480,
    borderRadius: 32,
    padding: 12,
    background: "linear-gradient(145deg, #111827, #1f2937)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  phoneScreen: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    backgroundColor: "#020617",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  phoneHeader: {
    padding: "8px 10px",
    background: "linear-gradient(90deg, #22c55e, #16a34a)",
    color: "#ecfdf5",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 500,
  },
  phoneHeaderTitle: {
    display: "flex",
    flexDirection: "column",
  },
  phoneHeaderSubtitle: {
    fontSize: 10,
    opacity: 0.85,
  },
  phoneMessagesArea: {
    flex: 1,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    backgroundColor: "#0a141a",
    backgroundImage: "url('/papeldeparedewhatsapp.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    overflowY: "auto",
    scrollbarWidth: "thin",
  },
  phoneMessageBubble: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    borderRadius: 14,
    borderTopRightRadius: 2,
    padding: "7px 9px",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "#ecfdf5",
    fontSize: 12,
    lineHeight: 1.35,
    boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  phoneMediaFileRow: {
    alignSelf: "flex-end",
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.9)",
    color: "#e5e7eb",
    fontSize: 11,
    boxShadow: "0 6px 14px rgba(0,0,0,0.4)",
  },
  phonePlaceholder: {
    alignSelf: "flex-start",
    maxWidth: "90%",
    borderRadius: 12,
    padding: "6px 8px",
    fontSize: 11,
    color: "#9ca3af",
    backgroundColor: "rgba(15,23,42,0.75)",
    border: "1px dashed rgba(148,163,184,0.5)",
  },
}));

const CampaignSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
});

const DraggablePaper = (props) => {
  return (
    <Draggable
      handle="#draggable-dialog-title"
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      <Paper {...props} />
    </Draggable>
  );
};

const backendUrl = getBackendUrl();

const MESSAGE_FIELDS = [
  "message1",
  "message2",
  "message3",
  "message4",
  "message5",
];

const CAMPAIGN_VARIABLES = [
  { token: "{{ms}}", label: "Saudação" },
  { token: "{{firstName}}", label: "Primeiro nome" },
  { token: "{{name}}", label: "Nome completo" },
  { token: "{{number}}", label: "Número" },
  { token: "{{email}}", label: "E-mail" },
  { token: "{{date}}", label: "Data" },
  { token: "{{hour}}", label: "Hora" },
];

const BUTTONS_TEMPLATE = [
  { displayText: "Sim, quero!", type: "reply", value: "btn_sim" },
  { displayText: "Não, obrigado", type: "reply", value: "btn_nao" },
  { displayText: "Ver site", type: "url", value: "https://seusite.com.br" },
  { displayText: "Ligar agora", type: "call", value: "5511999998888" },
];

const LIST_TEMPLATE = {
  message: "Selecione uma das opções abaixo para continuar o atendimento:",
  buttonText: "Ver opções",
  footer: "Atendimento de segunda a sexta, das 8h às 18h.",
  sections: [
    {
      title: "Atendimento",
      rows: [
        {
          title: "Suporte técnico",
          rowId: "suporte",
          description: "Dúvidas e problemas técnicos",
        },
        {
          title: "Financeiro",
          rowId: "financeiro",
          description: "Boletos, pagamentos e faturas",
        },
      ],
    },
    {
      title: "Comercial",
      rows: [
        {
          title: "Vendas e propostas",
          rowId: "comercial",
          description: "Orçamentos e novos contratos",
        },
      ],
    },
  ],
};

const CAROUSEL_TEMPLATE = [
  {
    headerTitle: "Oferta Especial",
    imageUrl: "https://www.w3schools.com/w3css/img_lights.jpg",
    body: "Aproveite nossas melhores ofertas com desconto exclusivo!",
    footer: "Válido até hoje",
    buttons: [
      {
        displayText: "Ver oferta",
        type: "url",
        value: "https://seusite.com.br/oferta",
      },
      { displayText: "Quero!", type: "reply", value: "btn_quero" },
    ],
  },
  {
    headerTitle: "Novo Produto",
    imageUrl: "https://www.w3schools.com/w3css/img_forest.jpg",
    body: "Conheça nossa nova linha de produtos premium.",
    footer: "Frete grátis",
    buttons: [
      { displayText: "Saber mais", type: "reply", value: "btn_info" },
      { displayText: "Ligar", type: "call", value: "5511999998888" },
    ],
  },
];

const POLL_TEMPLATE = {
  message: "Qual o seu horário preferido para atendimento?",
  options: [
    { displayText: "Manhã (8h-12h)", type: "reply", value: "" },
    { displayText: "Tarde (13h-17h)", type: "reply", value: "" },
    { displayText: "Noite (18h-22h)", type: "reply", value: "" },
  ],
};

const cloneButtons = (items = []) => items.map((item) => ({ ...item }));
const cloneCarouselCards = (cards = []) =>
  cards.map((card) => ({ ...card, buttons: cloneButtons(card.buttons || []) }));
const cloneListSections = (sections = []) =>
  sections.map((section) => ({
    ...section,
    rows: (section.rows || []).map((row) => ({ ...row })),
  }));

const normalizeListSections = (input = []) => {
  if (!Array.isArray(input) || input.length === 0) {
    return cloneListSections(LIST_TEMPLATE.sections);
  }

  const alreadyGrouped = input.every(
    (section) => section && Array.isArray(section.rows),
  );
  if (alreadyGrouped) {
    const sections = input
      .map((section, sectionIndex) => ({
        title:
          typeof section?.title === "string"
            ? section.title
            : `Seção ${sectionIndex + 1}`,
        rows: (section.rows || [])
          .map((row, rowIndex) => ({
            title: row?.title || row?.displayText || `Item ${rowIndex + 1}`,
            rowId:
              row?.rowId ||
              row?.value ||
              `item_${sectionIndex + 1}_${rowIndex + 1}`,
            description: row?.description || "",
          }))
          .filter((row) => row.title),
      }))
      .filter((section) => section.rows.length > 0);

    return sections.length > 0
      ? cloneListSections(sections)
      : cloneListSections(LIST_TEMPLATE.sections);
  }

  const rows = input
    .map((item, index) => ({
      title: item?.title || item?.displayText || `Item ${index + 1}`,
      rowId: item?.rowId || item?.value || `item_${index + 1}`,
      description: item?.description || "",
    }))
    .filter((row) => row.title);

  return rows.length > 0
    ? [{ title: "Opções", rows }]
    : cloneListSections(LIST_TEMPLATE.sections);
};

const flattenListSections = (sections = []) =>
  (sections || []).flatMap((section) =>
    (section.rows || []).map((row) => ({
      displayText: row.title || "",
      type: "reply",
      value: row.rowId || "",
      description: row.description || "",
    })),
  );

const getListRowCount = (sections = []) =>
  (sections || []).reduce(
    (acc, section) => acc + (section.rows || []).length,
    0,
  );

const hasAnyCampaignMessage = (values) =>
  MESSAGE_FIELDS.some(
    (field) => String(values?.[field] || "").trim().length > 0,
  );

const appendQuickReplyMessage = (currentValue, nextValue) => {
  const safeCurrent = String(currentValue || "").trimEnd();
  const safeNext = String(nextValue || "").trim();

  if (!safeNext) {
    return safeCurrent;
  }

  if (!safeCurrent) {
    return safeNext;
  }

  return `${safeCurrent}${safeCurrent.endsWith("\n") ? "\n" : "\n\n"}${safeNext}`;
};

const validateInteractiveCampaign = (values) => {
  if (values.messageType === "carousel") {
    if (!(values.carouselCards || []).length)
      return "Adicione pelo menos um card ao carrossel.";
    const invalidCard = (values.carouselCards || []).find(
      (card) =>
        !String(card.body || "").trim() ||
        (card.buttons || []).some(
          (btn) =>
            !String(btn.displayText || "").trim() ||
            ((btn.type === "url" ||
              btn.type === "call" ||
              btn.type === "copy") &&
              !String(btn.value || "").trim()),
        ),
    );
    if (invalidCard)
      return "Preencha o corpo do card e os botões obrigatórios do carrossel.";
    return "";
  }

  if (!hasAnyCampaignMessage(values)) {
    return "Preencha pelo menos uma mensagem da campanha antes de salvar.";
  }

  if (values.messageType === "buttons") {
    const buttonList = values.buttons || [];
    if (!buttonList.length) return "Adicione pelo menos um botão de ação.";
    const invalidButton = buttonList.find(
      (btn) =>
        !String(btn.displayText || "").trim() ||
        ((btn.type === "url" || btn.type === "call" || btn.type === "copy") &&
          !String(btn.value || "").trim()),
    );
    if (invalidButton)
      return "Preencha o texto e os valores obrigatórios dos botões.";
  }

  if (values.messageType === "list") {
    const sections = values.listSections || [];
    const totalRows = getListRowCount(sections);
    if (!String(values.listButtonText || "").trim())
      return "Defina o texto do botão da lista.";
    if (totalRows < 1 || totalRows > 10)
      return "A lista precisa ter entre 1 e 10 itens.";
    const invalidRow = sections.find(
      (section) =>
        !(section.rows || []).length ||
        (section.rows || []).some(
          (row) =>
            !String(row.title || "").trim() || !String(row.rowId || "").trim(),
        ),
    );
    if (invalidRow) return "Preencha o título e o ID de cada item da lista.";
  }

  if (values.messageType === "poll") {
    const options = (values.buttons || []).filter((btn) =>
      String(btn.displayText || "").trim(),
    );
    if (options.length < 2)
      return "A enquete precisa ter pelo menos duas opções.";
  }

  return "";
};

const CampaignModal = ({
  open,
  onClose,
  campaignId,
  initialValues,
  onSave,
  resetPagination,
}) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const { user } = useContext(AuthContext);
  const { companyId } = user;

  const initialState = {
    name: "",
    message1: "",
    message2: "",
    message3: "",
    message4: "",
    message5: "",
    status: "INATIVA",
    scheduledAt: "",
    contactListId: "",
    tagListId: "Nenhuma",
    companyId,
    messageType: "text",
    buttons: [],
    carouselCards: [],
    listSections: cloneListSections(LIST_TEMPLATE.sections),
    listButtonText: LIST_TEMPLATE.buttonText,
    listFooter: LIST_TEMPLATE.footer,
    randomizedDispatch: false,
    dispatchMinDelayMinutes: 0,
    dispatchMaxDelayMinutes: 0,
    dailyLimit: 0,
    enableTypingIndicator: false,
    typingDurationSeconds: 0,
    enableAiMessageVariation: false,
  };

  const [campaign, setCampaign] = useState(initialState);
  const [whatsapps, setWhatsapps] = useState([]);
  const [whatsappId, setWhatsappId] = useState(false);
  const [contactLists, setContactLists] = useState([]);
  const [tagLists, setTagLists] = useState([]);
  const [messageTab, setMessageTab] = useState(0);
  const [attachment, setAttachment] = useState(null);
  const [mediaDriveOpen, setMediaDriveOpen] = useState(false);
  const [campaignEditable, setCampaignEditable] = useState(true);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const attachmentFile = useRef(null);

  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const emojiButtonRef = useRef(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  const detectMediaType = (ext = "") => {
    const normalizedExt = (ext || "").toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(normalizedExt)) {
      return "image";
    }

    if (["mp4", "webm", "ogg", "mov", "mkv"].includes(normalizedExt)) {
      return "video";
    }

    if (["mp3", "wav", "ogg", "aac", "m4a"].includes(normalizedExt)) {
      return "audio";
    }

    if (["pdf", "doc", "docx", "txt"].includes(normalizedExt)) {
      return "document";
    }

    return "file";
  };

  const getAttachmentPreview = () => {
    const buildPreview = (ext, url) => ({
      type: detectMediaType(ext),
      url: detectMediaType(ext) === "file" ? null : url,
    });

    if (attachment) {
      const name = attachment.name ? attachment.name.toLowerCase() : "";
      const ext = name.includes(".") ? name.split(".").pop() : "";
      try {
        const url = URL.createObjectURL(attachment);
        return buildPreview(ext, url);
      } catch (e) {
        return { type: "file", url: null };
      }
    }

    if (campaign.mediaPath) {
      const nameSource = (
        campaign.mediaName ||
        campaign.mediaPath ||
        ""
      ).toLowerCase();
      const ext = nameSource.includes(".") ? nameSource.split(".").pop() : "";
      const url = campaign.mediaPath.startsWith("http")
        ? campaign.mediaPath
        : `${backendUrl}/public/company${companyId}/${campaign.mediaPath}`;
      return buildPreview(ext, url);
    }

    return { type: "none", url: null };
  };

  const handleEmojiClick = (event) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  const handleEmojiClose = () => {
    setEmojiAnchorEl(null);
  };

  const emojiOpen = Boolean(emojiAnchorEl);
  const emojiId = emojiOpen ? "emoji-popover" : undefined;

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isMounted.current) {
      if (initialValues) {
        setCampaign((prevState) => {
          return { ...prevState, ...initialValues };
        });
      }

      api
        .get(`/whatsapp`, { params: { companyId, session: 0 } })
        .then(({ data }) => {
          const mappedWhatsapps = data.map((whatsapp) => ({
            ...whatsapp,
            selected: false,
          }));
          const sortedWhatsapps = sortWhatsappsByUserQueues(mappedWhatsapps, user);
          setWhatsapps(sortedWhatsapps);
          if (!campaignId) {
            setWhatsappId((current) => {
              const currentStillAvailable = sortedWhatsapps.some(
                (whatsapp) => Number(whatsapp.id) === Number(current),
              );
              return currentStillAvailable
                ? current
                : getPreferredWhatsappId(sortedWhatsapps, user);
            });
          }
        });

      api
        .get(`/tags/list`, { params: { companyId, kanban: 0 } })
        .then(({ data }) => {
          const formattedTagLists = data
            .filter((tag) => tag.contactsCount > 0)
            .map((tag) => ({
              id: tag.id,
              name: `${tag.name} (${tag.contactsCount})`,
            }));
          setTagLists(formattedTagLists);
        })
        .catch((error) => {
          console.error("Error retrieving tags:", error);
        });

      // Carregar listas de contatos
      api
        .get(`/contact-lists/`, { params: { companyId } })
        .then(({ data }) => {
          const formattedContactLists = data.records ? data.records : data;
          setContactLists(formattedContactLists);
        })
        .catch((error) => {
          console.error("Error retrieving contact lists:", error);
        });

      if (!campaignId) return;

      api.get(`/campaigns/${campaignId}`).then(({ data }) => {
        if (data?.whatsappId) setWhatsappId(data.whatsappId);
        setCampaign((prev) => {
          let prevCampaignData = Object.assign({}, prev);
          Object.entries(data).forEach(([key, value]) => {
            if (key === "scheduledAt" && value !== "" && value !== null) {
              prevCampaignData[key] = moment(value).format("YYYY-MM-DDTHH:mm");
            } else {
              prevCampaignData[key] = value === null ? "" : value;
            }
          });
          if ((data.messageType || "text") === "list") {
            prevCampaignData.listSections = normalizeListSections(
              data.listSections || data.buttons || [],
            );
            prevCampaignData.listButtonText =
              data.listButtonText || LIST_TEMPLATE.buttonText;
            prevCampaignData.listFooter = data.listFooter || "";
          } else {
            prevCampaignData.listSections = Array.isArray(data.listSections)
              ? normalizeListSections(data.listSections)
              : cloneListSections(LIST_TEMPLATE.sections);
            prevCampaignData.listButtonText =
              data.listButtonText || LIST_TEMPLATE.buttonText;
            prevCampaignData.listFooter = data.listFooter || "";
          }
          if (Array.isArray(data.carouselCards)) {
            prevCampaignData.carouselCards = cloneCarouselCards(
              data.carouselCards,
            );
          }
          if (Array.isArray(data.buttons)) {
            prevCampaignData.buttons = cloneButtons(data.buttons);
          }
          prevCampaignData.dispatchMinDelayMinutes = Number(data.dispatchMinDelaySeconds)
            ? Math.round(Number(data.dispatchMinDelaySeconds) / 60)
            : 0;
          prevCampaignData.dispatchMaxDelayMinutes = Number(data.dispatchMaxDelaySeconds)
            ? Math.round(Number(data.dispatchMaxDelaySeconds) / 60)
            : 0;
          return prevCampaignData;
        });
      });
    }
  }, [campaignId, open, initialValues, companyId, user]);

  useEffect(() => {
    const now = moment();
    const scheduledAt = moment(campaign.scheduledAt);
    const moreThenAnHour =
      !Number.isNaN(scheduledAt.diff(now)) && scheduledAt.diff(now, "hour") > 1;
    const isEditable =
      campaign.status === "INATIVA" ||
      (campaign.status === "PROGRAMADA" && moreThenAnHour);
    setCampaignEditable(isEditable);
  }, [campaign.status, campaign.scheduledAt]);

  const handleClose = () => {
    onClose();
    setCampaign(initialState);
    setQuickRepliesOpen(false);
  };

  const handleAttachmentFile = (e) => {
    const file = head(e.target.files);
    if (file) {
      setAttachment(file);
      setCampaign((prev) => ({ ...prev, mediaPath: "", mediaName: "" }));
    }
  };

  const handleCampaignQuickReplySelect = (
    replyMessage,
    file,
    values,
    setFieldValue,
  ) => {
    const currentField = MESSAGE_FIELDS[messageTab] || "message1";
    const currentValue = values?.[currentField] || "";

    setFieldValue(
      currentField,
      appendQuickReplyMessage(currentValue, replyMessage),
    );

    if (file) {
      setAttachment(file);
      setCampaign((prev) => ({
        ...prev,
        mediaPath: "",
        mediaName: file.name || prev.mediaName || "",
      }));
    }

    setQuickRepliesOpen(false);
  };

  const handleGenerateVariations = async (values, setFieldValue) => {
    const baseMessage = (values.message1 || "").trim();
    if (!baseMessage) {
      toast.warn("Escreva uma mensagem base na aba Msg. 1 antes de gerar variações.");
      return;
    }

    setAiGenerating(true);
    try {
      const { data } = await api.post("/campaigns/ai/generate-variations", {
        baseMessage,
        quantity: 5,
      });

      const msgs = data.messages || [];
      MESSAGE_FIELDS.forEach((field, idx) => {
        if (msgs[idx]) setFieldValue(field, msgs[idx]);
      });

      toast.success(
        `${msgs.length} variação(ões) gerada(s). Crédito consumido: ${data.creditsConsumed ?? 1}.`
      );
    } catch (err) {
      if (err?.response?.status === 402) {
        toast.error(
          "Saldo de créditos de IA insuficiente. Adicione créditos ou desative a personalização com IA."
        );
      } else {
        toastError(err);
      }
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveCampaign = async (values) => {
    const validationError = validateInteractiveCampaign(values);
    if (validationError) {
      toast.warn(validationError);
      return;
    }

    try {
      const normalizedListSections = normalizeListSections(
        values.listSections || [],
      );
      const normalizedValues = {
        ...values,
        buttons:
          values.messageType === "list"
            ? flattenListSections(normalizedListSections)
            : cloneButtons(values.buttons || []),
        carouselCards:
          values.messageType === "carousel"
            ? cloneCarouselCards(values.carouselCards || [])
            : [],
        listSections:
          values.messageType === "list" ? normalizedListSections : [],
        listButtonText:
          values.messageType === "list"
            ? values.listButtonText || LIST_TEMPLATE.buttonText
            : "",
        listFooter:
          values.messageType === "list" ? values.listFooter || "" : "",
      };

      const dataValues = {
        ...normalizedValues,
        whatsappId: whatsappId,
        mediaPath: attachment ? values.mediaPath : campaign.mediaPath || null,
        mediaName: attachment ? values.mediaName : campaign.mediaName || null,
      };

      Object.entries(normalizedValues).forEach(([key, value]) => {
        if (key === "scheduledAt" && value !== "" && value !== null) {
          dataValues[key] = moment(value).format("YYYY-MM-DD HH:mm:ss");
        } else {
          dataValues[key] = value === "" ? null : value;
        }
      });

      // Cadência: converter minutos (display) → segundos (backend)
      const minMinutes = Number(values.dispatchMinDelayMinutes) || 0;
      const maxMinutes = Number(values.dispatchMaxDelayMinutes) || 0;
      dataValues.dispatchMinDelaySeconds = minMinutes > 0 ? minMinutes * 60 : null;
      dataValues.dispatchMaxDelaySeconds = maxMinutes > 0 ? maxMinutes * 60 : null;
      delete dataValues.dispatchMinDelayMinutes;
      delete dataValues.dispatchMaxDelayMinutes;

      if (campaignId) {
        await api.put(`/campaigns/${campaignId}`, dataValues);
        if (attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/campaigns/${campaignId}/media-upload`, formData);
        }
        handleClose();
      } else {
        const { data } = await api.post("/campaigns", dataValues);
        if (attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/campaigns/${data.id}/media-upload`, formData);
        }
        if (onSave) {
          onSave(data);
        }
        handleClose();
      }
      toast.success(i18n.t("campaigns.toasts.success"));
    } catch (err) {
      console.log(err);
      toastError(err);
    }
  };

  const renderMessageField = (identifier, values, setFieldValue) => {
    const handleEmojiSelect = (emojiObject) => {
      const emoji = emojiObject.emoji;
      const currentValue = values[identifier] || "";
      setFieldValue(identifier, currentValue + emoji);
      handleEmojiClose();
    };

    const insertToken = (token) => {
      const current = String(values[identifier] || "").trimEnd();
      const spacer = current && !current.endsWith(" ") ? " " : "";
      setFieldValue(identifier, `${current}${spacer}${token}`);
    };

    return (
      <div className={classes.messageField}>
        <Field
          as={TextField}
          id={identifier}
          name={identifier}
          fullWidth
          rows={5}
          label={i18n.t(`campaigns.dialog.form.${identifier}`)}
          placeholder={i18n.t("campaigns.dialog.form.messagePlaceholder")}
          multiline={true}
          variant="outlined"
          helperText="Clique nas variáveis abaixo para inserir automaticamente na mensagem."
          disabled={!campaignEditable && campaign.status !== "CANCELADA"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MessageIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        {/* Botões de variáveis dinâmicas */}
        <Box display="flex" flexWrap="wrap" style={{ gap: 6, marginTop: 8, marginBottom: 4 }}>
          {CAMPAIGN_VARIABLES.map((v) => (
            <Box
              key={v.token}
              component="button"
              type="button"
              onClick={() => insertToken(v.token)}
              disabled={!campaignEditable && campaign.status !== "CANCELADA"}
              style={{
                background: "#111827",
                color: "#f1f5f9",
                border: "none",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: 0.2,
                opacity: (!campaignEditable && campaign.status !== "CANCELADA") ? 0.5 : 1,
              }}
            >
              {v.label}
            </Box>
          ))}
        </Box>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mt={0.5}
        >
          <Button
            size="small"
            className={classes.quickRepliesToggle}
            startIcon={<FlashOnIcon fontSize="small" />}
            onClick={() => setQuickRepliesOpen((prev) => !prev)}
          >
            Respostas rápidas
          </Button>
          <Typography style={{ fontSize: 11, color: "#64748b" }}>
            Use o raio para aproveitar campanhas prontas.
          </Typography>
        </Box>
        <IconButton
          ref={emojiButtonRef}
          onClick={handleEmojiClick}
          className={classes.emojiButton}
        >
          <InsertEmoticonIcon color="action" />
        </IconButton>
        <Popover
          id={emojiId}
          open={emojiOpen}
          anchorEl={emojiAnchorEl}
          onClose={handleEmojiClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
        >
          <div className={classes.emojiPickerContainer}>
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              width={350}
              height={400}
            />
          </div>
        </Popover>
      </div>
    );
  };

  const cancelCampaign = async () => {
    try {
      await api.post(`/campaigns/${campaign.id}/cancel`);
      toast.success(i18n.t("campaigns.toasts.cancel"));
      setCampaign((prev) => ({ ...prev, status: "CANCELADA" }));
      resetPagination();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const restartCampaign = async () => {
    try {
      await api.post(`/campaigns/${campaign.id}/restart`);
      toast.success(i18n.t("campaigns.toasts.restart"));
      setCampaign((prev) => ({ ...prev, status: "EM_ANDAMENTO" }));
      resetPagination();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filterOptions = createFilterOptions({
    trim: true,
  });

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        scroll="paper"
        TransitionComponent={Transition}
        classes={{
          paper: quickRepliesOpen
            ? classes.dialogPaperExpanded
            : classes.dialogPaper,
        }}
        PaperComponent={DraggablePaper}
        disableBackdropClick
        disableEscapeKeyDown
      >
        <MediaDrivePickerModal
          open={mediaDriveOpen}
          onClose={() => setMediaDriveOpen(false)}
          onSelect={(media) => {
            setAttachment(null);
            setCampaign((prev) => ({
              ...prev,
              mediaPath: media.storagePath,
              mediaName: media.name,
            }));
          }}
          title="Selecionar mídia da campanha"
        />
        <DialogTitle
          id="draggable-dialog-title"
          className={classes.dialogTitle}
        >
          <CampaignIcon fontSize="large" />
          {campaignEditable ? (
            <>
              {campaignId
                ? `${i18n.t("campaigns.dialog.update")}`
                : `${i18n.t("campaigns.dialog.new")}`}
            </>
          ) : (
            <>{`${i18n.t("campaigns.dialog.readonly")}`}</>
          )}
        </DialogTitle>
        <div style={{ display: "none" }}>
          <input
            type="file"
            ref={attachmentFile}
            onChange={(e) => handleAttachmentFile(e)}
          />
        </div>
        <Formik
          initialValues={campaign}
          enableReinitialize={true}
          validationSchema={CampaignSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveCampaign(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ values, errors, touched, isSubmitting, setFieldValue }) => (
            <Form>
              <DialogContent dividers className={classes.dialogContent}>
                <Box className={classes.dialogContentLayout}>
                  <Box className={classes.dialogContentMain}>
                    <Grid container spacing={2}>
                      {/* Coluna esquerda: formulário */}
                      <Grid item xs={12} md={8}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Field
                              as={TextField}
                              label={i18n.t("campaigns.dialog.form.name")}
                              name="name"
                              error={touched.name && Boolean(errors.name)}
                              helperText={touched.name && errors.name}
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              className={classes.textField}
                              disabled={!campaignEditable}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <CampaignIcon color="action" />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <FormControl
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              className={classes.formControl}
                            >
                              <InputLabel id="contactList-selection-label">
                                {i18n.t("campaigns.dialog.form.contactList")}
                              </InputLabel>
                              <Field
                                as={Select}
                                label={i18n.t(
                                  "campaigns.dialog.form.contactList",
                                )}
                                placeholder={i18n.t(
                                  "campaigns.dialog.form.contactList",
                                )}
                                labelId="contactList-selection-label"
                                id="contactListId"
                                name="contactListId"
                                error={
                                  touched.contactListId &&
                                  Boolean(errors.contactListId)
                                }
                                disabled={!campaignEditable}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <ContactsIcon color="action" />
                                    </InputAdornment>
                                  ),
                                }}
                              >
                                <MenuItem value="">Nenhuma</MenuItem>
                                {contactLists &&
                                  contactLists.map((contactList) => (
                                    <MenuItem
                                      key={contactList.id}
                                      value={contactList.id}
                                    >
                                      {contactList.name}
                                    </MenuItem>
                                  ))}
                              </Field>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <FormControl
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              className={classes.formControl}
                            >
                              <InputLabel id="tagList-selection-label">
                                {i18n.t("campaigns.dialog.form.tagList")}
                              </InputLabel>
                              <Field
                                as={Select}
                                label={i18n.t("campaigns.dialog.form.tagList")}
                                placeholder={i18n.t(
                                  "campaigns.dialog.form.tagList",
                                )}
                                labelId="tagList-selection-label"
                                id="tagListId"
                                name="tagListId"
                                error={
                                  touched.tagListId && Boolean(errors.tagListId)
                                }
                                disabled={!campaignEditable}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <LabelIcon color="action" />
                                    </InputAdornment>
                                  ),
                                }}
                              >
                                {Array.isArray(tagLists) &&
                                  tagLists.map((tagList) => (
                                    <MenuItem
                                      key={tagList.id}
                                      value={tagList.id}
                                    >
                                      {tagList.name}
                                    </MenuItem>
                                  ))}
                              </Field>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <FormControl
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              className={classes.formControl}
                            >
                              <InputLabel id="whatsapp-selection-label">
                                {i18n.t("campaigns.dialog.form.whatsapp")}
                              </InputLabel>
                              <Field
                                as={Select}
                                label={i18n.t("campaigns.dialog.form.whatsapp")}
                                placeholder={i18n.t(
                                  "campaigns.dialog.form.whatsapp",
                                )}
                                labelId="whatsapp-selection-label"
                                id="whatsappIds"
                                name="whatsappIds"
                                required
                                error={
                                  touched.whatsappId &&
                                  Boolean(errors.whatsappId)
                                }
                                disabled={!campaignEditable}
                                value={whatsappId}
                                onChange={(event) => {
                                  setWhatsappId(event.target.value);
                                }}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <WhatsAppIcon color="action" />
                                    </InputAdornment>
                                  ),
                                }}
                              >
                                {whatsapps &&
                                  whatsapps.map((whatsapp) => (
                                    <MenuItem
                                      key={whatsapp.id}
                                      value={whatsapp.id}
                                    >
                                      {whatsapp.name}
                                    </MenuItem>
                                  ))}
                              </Field>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Field
                              as={TextField}
                              label={i18n.t(
                                "campaigns.dialog.form.scheduledAt",
                              )}
                              name="scheduledAt"
                              error={
                                touched.scheduledAt &&
                                Boolean(errors.scheduledAt)
                              }
                              helperText={
                                touched.scheduledAt && errors.scheduledAt
                              }
                              variant="outlined"
                              margin="dense"
                              type="datetime-local"
                              InputLabelProps={{
                                shrink: true,
                              }}
                              fullWidth
                              className={classes.textField}
                              disabled={!campaignEditable}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <ScheduleIcon color="action" />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Tabs
                              value={messageTab}
                              indicatorColor="primary"
                              onChange={(e, v) => setMessageTab(v)}
                              variant="fullWidth"
                              centered
                              className={classes.tabs}
                            >
                              <Tab
                                label="Msg. 1"
                                index={0}
                                className={classes.tab}
                              />
                              <Tab
                                label="Msg. 2"
                                index={1}
                                className={classes.tab}
                              />
                              <Tab
                                label="Msg. 3"
                                index={2}
                                className={classes.tab}
                              />
                              <Tab
                                label="Msg. 4"
                                index={3}
                                className={classes.tab}
                              />
                              <Tab
                                label="Msg. 5"
                                index={4}
                                className={classes.tab}
                              />
                            </Tabs>
                            <Box style={{ paddingTop: 20 }}>
                              {messageTab === 0 &&
                                renderMessageField(
                                  "message1",
                                  values,
                                  setFieldValue,
                                )}
                              {messageTab === 1 &&
                                renderMessageField(
                                  "message2",
                                  values,
                                  setFieldValue,
                                )}
                              {messageTab === 2 &&
                                renderMessageField(
                                  "message3",
                                  values,
                                  setFieldValue,
                                )}
                              {messageTab === 3 &&
                                renderMessageField(
                                  "message4",
                                  values,
                                  setFieldValue,
                                )}
                              {messageTab === 4 &&
                                renderMessageField(
                                  "message5",
                                  values,
                                  setFieldValue,
                                )}
                            </Box>
                          </Grid>

                          {/* ── Mensagem Interativa ─────────────────────── */}
                          <Grid item xs={12}>
                            <FormControl
                              variant="outlined"
                              margin="dense"
                              fullWidth
                            >
                              <InputLabel id="messageType-label">
                                Tipo de Mensagem
                              </InputLabel>
                              <Select
                                labelId="messageType-label"
                                label="Tipo de Mensagem"
                                value={values.messageType || "text"}
                                onChange={(e) => {
                                  const newType = e.target.value;
                                  setFieldValue("messageType", newType);
                                  if (newType !== "carousel") {
                                    setFieldValue("carouselCards", []);
                                  }
                                  if (newType !== "list") {
                                    setFieldValue("listSections", []);
                                    setFieldValue("listButtonText", "");
                                    setFieldValue("listFooter", "");
                                  }
                                  if (newType === "text") {
                                    setFieldValue("buttons", []);
                                  }

                                  if (newType === "buttons") {
                                    setFieldValue(
                                      "buttons",
                                      cloneButtons(BUTTONS_TEMPLATE),
                                    );
                                  }

                                  if (newType === "list") {
                                    if (!hasAnyCampaignMessage(values)) {
                                      setFieldValue(
                                        "message1",
                                        LIST_TEMPLATE.message,
                                      );
                                    }
                                    setFieldValue(
                                      "buttons",
                                      flattenListSections(
                                        LIST_TEMPLATE.sections,
                                      ),
                                    );
                                    setFieldValue(
                                      "listSections",
                                      cloneListSections(LIST_TEMPLATE.sections),
                                    );
                                    setFieldValue(
                                      "listButtonText",
                                      LIST_TEMPLATE.buttonText,
                                    );
                                    setFieldValue(
                                      "listFooter",
                                      LIST_TEMPLATE.footer,
                                    );
                                  }

                                  if (newType === "carousel") {
                                    setFieldValue("buttons", []);
                                    setFieldValue(
                                      "carouselCards",
                                      cloneCarouselCards(CAROUSEL_TEMPLATE),
                                    );
                                  }

                                  if (newType === "poll") {
                                    if (!values.message1) {
                                      setFieldValue(
                                        "message1",
                                        POLL_TEMPLATE.message,
                                      );
                                    }
                                    setFieldValue(
                                      "buttons",
                                      cloneButtons(POLL_TEMPLATE.options),
                                    );
                                  }
                                }}
                                disabled={!campaignEditable}
                              >
                                <MenuItem value="text">Texto simples</MenuItem>
                                <MenuItem value="buttons">
                                  Botões de ação
                                </MenuItem>
                                <MenuItem value="list">
                                  Lista selecionável
                                </MenuItem>
                                <MenuItem value="carousel">
                                  Carrossel de cards
                                </MenuItem>
                                <MenuItem value="poll">Enquete (Poll)</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>

                          {/* Botões */}
                          {values.messageType === "buttons" && (
                            <Grid item xs={12}>
                              <Box
                                style={{
                                  border: "1px solid #e0e0e0",
                                  borderRadius: 8,
                                  padding: 12,
                                }}
                              >
                                <Box
                                  style={{
                                    fontWeight: 600,
                                    marginBottom: 4,
                                    fontSize: 13,
                                    color: "#555",
                                  }}
                                >
                                  Botões (máx. 4)
                                </Box>
                                <Box
                                  style={{
                                    fontSize: 11,
                                    color: "#856404",
                                    backgroundColor: "#fff3cd",
                                    border: "1px solid #ffc107",
                                    borderRadius: 6,
                                    padding: "6px 10px",
                                    marginBottom: 10,
                                  }}
                                >
                                  ✏️ Modelo pré-preenchido com exemplos. Edite
                                  os textos e valores com seus dados reais antes
                                  de salvar.
                                </Box>
                                {(values.buttons || []).map((btn, idx) => (
                                  <Grid
                                    container
                                    spacing={1}
                                    key={idx}
                                    style={{ marginBottom: 6 }}
                                  >
                                    <Grid item xs={4}>
                                      <TextField
                                        label="Texto do botão"
                                        value={btn.displayText || ""}
                                        onChange={(e) => {
                                          const updated = [
                                            ...(values.buttons || []),
                                          ];
                                          updated[idx] = {
                                            ...updated[idx],
                                            displayText: e.target.value,
                                          };
                                          setFieldValue("buttons", updated);
                                        }}
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        disabled={!campaignEditable}
                                      />
                                    </Grid>
                                    <Grid item xs={3}>
                                      <FormControl
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                      >
                                        <InputLabel>Tipo</InputLabel>
                                        <Select
                                          label="Tipo"
                                          value={btn.type || "reply"}
                                          onChange={(e) => {
                                            const updated = [
                                              ...(values.buttons || []),
                                            ];
                                            updated[idx] = {
                                              ...updated[idx],
                                              type: e.target.value,
                                            };
                                            setFieldValue("buttons", updated);
                                          }}
                                          disabled={!campaignEditable}
                                        >
                                          <MenuItem value="reply">
                                            Resposta
                                          </MenuItem>
                                          <MenuItem value="url">
                                            Link URL
                                          </MenuItem>
                                          <MenuItem value="call">
                                            Ligar
                                          </MenuItem>
                                          <MenuItem value="copy">
                                            Copiar código
                                          </MenuItem>
                                        </Select>
                                      </FormControl>
                                    </Grid>
                                    <Grid item xs={4}>
                                      <TextField
                                        label={
                                          btn.type === "url"
                                            ? "URL"
                                            : btn.type === "call"
                                              ? "Telefone"
                                              : "Valor / ID"
                                        }
                                        value={btn.value || ""}
                                        onChange={(e) => {
                                          const updated = [
                                            ...(values.buttons || []),
                                          ];
                                          updated[idx] = {
                                            ...updated[idx],
                                            value: e.target.value,
                                          };
                                          setFieldValue("buttons", updated);
                                        }}
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        disabled={!campaignEditable}
                                      />
                                    </Grid>
                                    <Grid
                                      item
                                      xs={1}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          const updated = (
                                            values.buttons || []
                                          ).filter((_, i) => i !== idx);
                                          setFieldValue("buttons", updated);
                                        }}
                                        disabled={!campaignEditable}
                                      >
                                        <DeleteOutlineIcon fontSize="small" />
                                      </IconButton>
                                    </Grid>
                                  </Grid>
                                ))}
                                {(values.buttons || []).length < 4 && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    onClick={() =>
                                      setFieldValue("buttons", [
                                        ...(values.buttons || []),
                                        {
                                          displayText: "",
                                          type: "reply",
                                          value: "",
                                        },
                                      ])
                                    }
                                    disabled={!campaignEditable}
                                    style={{ marginTop: 4 }}
                                  >
                                    + Adicionar botão
                                  </Button>
                                )}
                              </Box>
                            </Grid>
                          )}

                          {values.messageType === "list" && (
                            <Grid item xs={12}>
                              <Box
                                style={{
                                  border: "1px solid #e0e0e0",
                                  borderRadius: 8,
                                  padding: 12,
                                  backgroundColor: "#f8fafc",
                                }}
                              >
                                <Box
                                  style={{
                                    fontWeight: 600,
                                    marginBottom: 6,
                                    fontSize: 13,
                                    color: "#555",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  📋 Lista selecionável
                                </Box>
                                <Box
                                  style={{
                                    fontSize: 11,
                                    color: "#856404",
                                    backgroundColor: "#fff3cd",
                                    border: "1px solid #ffc107",
                                    borderRadius: 6,
                                    padding: "6px 10px",
                                    marginBottom: 8,
                                  }}
                                >
                                  ✏️ O texto principal vem do campo{" "}
                                  <strong>Mensagem 1</strong> acima. Aqui você
                                  define botão, rodapé, seções e itens da lista.
                                </Box>
                                <Grid
                                  container
                                  spacing={1}
                                  style={{ marginBottom: 8 }}
                                >
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      label="Texto do botão *"
                                      value={values.listButtonText || ""}
                                      placeholder="Ex: Ver opções"
                                      onChange={(e) =>
                                        setFieldValue(
                                          "listButtonText",
                                          e.target.value,
                                        )
                                      }
                                      variant="outlined"
                                      size="small"
                                      fullWidth
                                      disabled={!campaignEditable}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      label="Rodapé (opcional)"
                                      value={values.listFooter || ""}
                                      placeholder="Ex: Atendimento de segunda a sexta"
                                      onChange={(e) =>
                                        setFieldValue(
                                          "listFooter",
                                          e.target.value,
                                        )
                                      }
                                      variant="outlined"
                                      size="small"
                                      fullWidth
                                      disabled={!campaignEditable}
                                    />
                                  </Grid>
                                </Grid>
                                <Box
                                  style={{
                                    fontSize: 11,
                                    color: "#666",
                                    marginBottom: 10,
                                  }}
                                >
                                  Itens configurados:{" "}
                                  <strong>
                                    {getListRowCount(values.listSections || [])}
                                    /10
                                  </strong>
                                </Box>
                                {(values.listSections || []).map(
                                  (section, sectionIndex) => (
                                    <Box
                                      key={sectionIndex}
                                      style={{
                                        border: "1px dashed #cbd5e1",
                                        borderRadius: 6,
                                        padding: 10,
                                        marginBottom: 10,
                                        backgroundColor: "#fff",
                                      }}
                                    >
                                      <Box
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          marginBottom: 6,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                          }}
                                        >
                                          Seção {sectionIndex + 1}
                                        </span>
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            const updated = (
                                              values.listSections || []
                                            ).filter(
                                              (_, index) =>
                                                index !== sectionIndex,
                                            );
                                            if (updated.length > 0)
                                              setFieldValue(
                                                "listSections",
                                                updated,
                                              );
                                          }}
                                          disabled={
                                            !campaignEditable ||
                                            (values.listSections || [])
                                              .length <= 1
                                          }
                                        >
                                          <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                      <TextField
                                        label="Título da seção (opcional)"
                                        value={section.title || ""}
                                        onChange={(e) => {
                                          const updated = cloneListSections(
                                            values.listSections || [],
                                          );
                                          updated[sectionIndex] = {
                                            ...updated[sectionIndex],
                                            title: e.target.value,
                                          };
                                          setFieldValue(
                                            "listSections",
                                            updated,
                                          );
                                        }}
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        disabled={!campaignEditable}
                                        style={{ marginBottom: 10 }}
                                      />
                                      {(section.rows || []).map(
                                        (row, rowIndex) => (
                                          <Grid
                                            container
                                            spacing={1}
                                            key={`${sectionIndex}-${rowIndex}`}
                                            style={{ marginBottom: 6 }}
                                          >
                                            <Grid item xs={12} md={4}>
                                              <TextField
                                                label="Título do item *"
                                                value={row.title || ""}
                                                onChange={(e) => {
                                                  const updated =
                                                    cloneListSections(
                                                      values.listSections || [],
                                                    );
                                                  updated[sectionIndex].rows[
                                                    rowIndex
                                                  ] = {
                                                    ...updated[sectionIndex]
                                                      .rows[rowIndex],
                                                    title: e.target.value,
                                                  };
                                                  setFieldValue(
                                                    "listSections",
                                                    updated,
                                                  );
                                                }}
                                                variant="outlined"
                                                size="small"
                                                fullWidth
                                                disabled={!campaignEditable}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={3}>
                                              <TextField
                                                label="ID do item *"
                                                value={row.rowId || ""}
                                                onChange={(e) => {
                                                  const updated =
                                                    cloneListSections(
                                                      values.listSections || [],
                                                    );
                                                  updated[sectionIndex].rows[
                                                    rowIndex
                                                  ] = {
                                                    ...updated[sectionIndex]
                                                      .rows[rowIndex],
                                                    rowId: e.target.value,
                                                  };
                                                  setFieldValue(
                                                    "listSections",
                                                    updated,
                                                  );
                                                }}
                                                variant="outlined"
                                                size="small"
                                                fullWidth
                                                disabled={!campaignEditable}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                              <TextField
                                                label="Descrição (opcional)"
                                                value={row.description || ""}
                                                onChange={(e) => {
                                                  const updated =
                                                    cloneListSections(
                                                      values.listSections || [],
                                                    );
                                                  updated[sectionIndex].rows[
                                                    rowIndex
                                                  ] = {
                                                    ...updated[sectionIndex]
                                                      .rows[rowIndex],
                                                    description: e.target.value,
                                                  };
                                                  setFieldValue(
                                                    "listSections",
                                                    updated,
                                                  );
                                                }}
                                                variant="outlined"
                                                size="small"
                                                fullWidth
                                                disabled={!campaignEditable}
                                              />
                                            </Grid>
                                            <Grid
                                              item
                                              xs={12}
                                              md={1}
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                              }}
                                            >
                                              <IconButton
                                                size="small"
                                                onClick={() => {
                                                  const updated =
                                                    cloneListSections(
                                                      values.listSections || [],
                                                    );
                                                  const nextRows = updated[
                                                    sectionIndex
                                                  ].rows.filter(
                                                    (_, index) =>
                                                      index !== rowIndex,
                                                  );
                                                  if (nextRows.length > 0) {
                                                    updated[sectionIndex] = {
                                                      ...updated[sectionIndex],
                                                      rows: nextRows,
                                                    };
                                                    setFieldValue(
                                                      "listSections",
                                                      updated,
                                                    );
                                                  }
                                                }}
                                                disabled={
                                                  !campaignEditable ||
                                                  (section.rows || []).length <=
                                                    1
                                                }
                                              >
                                                <DeleteOutlineIcon fontSize="small" />
                                              </IconButton>
                                            </Grid>
                                          </Grid>
                                        ),
                                      )}
                                      {getListRowCount(
                                        values.listSections || [],
                                      ) < 10 && (
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          onClick={() => {
                                            const updated = cloneListSections(
                                              values.listSections || [],
                                            );
                                            updated[sectionIndex] = {
                                              ...updated[sectionIndex],
                                              rows: [
                                                ...(updated[sectionIndex]
                                                  .rows || []),
                                                {
                                                  title: "",
                                                  rowId: "",
                                                  description: "",
                                                },
                                              ],
                                            };
                                            setFieldValue(
                                              "listSections",
                                              updated,
                                            );
                                          }}
                                          disabled={!campaignEditable}
                                          style={{ fontSize: 11 }}
                                        >
                                          + Item
                                        </Button>
                                      )}
                                    </Box>
                                  ),
                                )}
                                {getListRowCount(values.listSections || []) <
                                  10 && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    onClick={() =>
                                      setFieldValue("listSections", [
                                        ...(values.listSections || []),
                                        {
                                          title: "",
                                          rows: [
                                            {
                                              title: "",
                                              rowId: "",
                                              description: "",
                                            },
                                          ],
                                        },
                                      ])
                                    }
                                    disabled={!campaignEditable}
                                    style={{ marginTop: 4 }}
                                  >
                                    + Adicionar seção
                                  </Button>
                                )}
                              </Box>
                            </Grid>
                          )}

                          {/* Carrossel */}
                          {values.messageType === "carousel" && (
                            <Grid item xs={12}>
                              <Box
                                style={{
                                  border: "1px solid #e0e0e0",
                                  borderRadius: 8,
                                  padding: 12,
                                }}
                              >
                                <Box
                                  style={{
                                    fontWeight: 600,
                                    marginBottom: 4,
                                    fontSize: 13,
                                    color: "#555",
                                  }}
                                >
                                  🎠 Cards do Carrossel (máx. 10)
                                </Box>
                                <Box
                                  style={{
                                    fontSize: 11,
                                    color: "#856404",
                                    backgroundColor: "#fff3cd",
                                    border: "1px solid #ffc107",
                                    borderRadius: 6,
                                    padding: "6px 10px",
                                    marginBottom: 10,
                                  }}
                                >
                                  ✏️ Modelo pré-preenchido com 2 cards de
                                  exemplo. Edite título, imagem, texto e botões
                                  com seus dados reais antes de salvar.
                                </Box>
                                {(values.carouselCards || []).map(
                                  (card, cidx) => (
                                    <Box
                                      key={cidx}
                                      style={{
                                        border: "1px dashed #ccc",
                                        borderRadius: 6,
                                        padding: 10,
                                        marginBottom: 10,
                                      }}
                                    >
                                      <Box
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          marginBottom: 6,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                          }}
                                        >
                                          Card {cidx + 1}
                                        </span>
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            const updated = (
                                              values.carouselCards || []
                                            ).filter((_, i) => i !== cidx);
                                            setFieldValue(
                                              "carouselCards",
                                              updated,
                                            );
                                          }}
                                          disabled={!campaignEditable}
                                        >
                                          <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                      <Grid container spacing={1}>
                                        <Grid item xs={6}>
                                          <TextField
                                            label="Título"
                                            value={card.headerTitle || ""}
                                            onChange={(e) => {
                                              const updated = [
                                                ...(values.carouselCards || []),
                                              ];
                                              updated[cidx] = {
                                                ...updated[cidx],
                                                headerTitle: e.target.value,
                                              };
                                              setFieldValue(
                                                "carouselCards",
                                                updated,
                                              );
                                            }}
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            disabled={!campaignEditable}
                                          />
                                        </Grid>
                                        <Grid item xs={6}>
                                          <TextField
                                            label="URL da Imagem"
                                            value={card.imageUrl || ""}
                                            onChange={(e) => {
                                              const updated = [
                                                ...(values.carouselCards || []),
                                              ];
                                              updated[cidx] = {
                                                ...updated[cidx],
                                                imageUrl: e.target.value,
                                              };
                                              setFieldValue(
                                                "carouselCards",
                                                updated,
                                              );
                                            }}
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            disabled={!campaignEditable}
                                          />
                                        </Grid>
                                        <Grid item xs={12}>
                                          <TextField
                                            label="Corpo da mensagem"
                                            value={card.body || ""}
                                            onChange={(e) => {
                                              const updated = [
                                                ...(values.carouselCards || []),
                                              ];
                                              updated[cidx] = {
                                                ...updated[cidx],
                                                body: e.target.value,
                                              };
                                              setFieldValue(
                                                "carouselCards",
                                                updated,
                                              );
                                            }}
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            multiline
                                            rows={2}
                                            disabled={!campaignEditable}
                                          />
                                        </Grid>
                                        <Grid item xs={12}>
                                          <TextField
                                            label="Rodapé (opcional)"
                                            value={card.footer || ""}
                                            onChange={(e) => {
                                              const updated = [
                                                ...(values.carouselCards || []),
                                              ];
                                              updated[cidx] = {
                                                ...updated[cidx],
                                                footer: e.target.value,
                                              };
                                              setFieldValue(
                                                "carouselCards",
                                                updated,
                                              );
                                            }}
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            disabled={!campaignEditable}
                                          />
                                        </Grid>
                                        {/* Botões do card */}
                                        <Grid item xs={12}>
                                          <Box
                                            style={{
                                              fontSize: 12,
                                              color: "#777",
                                              marginBottom: 4,
                                            }}
                                          >
                                            Botões do card (máx. 3)
                                          </Box>
                                          {(card.buttons || []).map(
                                            (btn, bidx) => (
                                              <Grid
                                                container
                                                spacing={1}
                                                key={bidx}
                                                style={{ marginBottom: 4 }}
                                              >
                                                <Grid item xs={4}>
                                                  <TextField
                                                    label="Texto"
                                                    value={
                                                      btn.displayText || ""
                                                    }
                                                    onChange={(e) => {
                                                      const updatedCards = [
                                                        ...(values.carouselCards ||
                                                          []),
                                                      ];
                                                      const updatedBtns = [
                                                        ...(updatedCards[cidx]
                                                          .buttons || []),
                                                      ];
                                                      updatedBtns[bidx] = {
                                                        ...updatedBtns[bidx],
                                                        displayText:
                                                          e.target.value,
                                                      };
                                                      updatedCards[cidx] = {
                                                        ...updatedCards[cidx],
                                                        buttons: updatedBtns,
                                                      };
                                                      setFieldValue(
                                                        "carouselCards",
                                                        updatedCards,
                                                      );
                                                    }}
                                                    variant="outlined"
                                                    size="small"
                                                    fullWidth
                                                    disabled={!campaignEditable}
                                                  />
                                                </Grid>
                                                <Grid item xs={3}>
                                                  <FormControl
                                                    variant="outlined"
                                                    size="small"
                                                    fullWidth
                                                  >
                                                    <InputLabel>
                                                      Tipo
                                                    </InputLabel>
                                                    <Select
                                                      label="Tipo"
                                                      value={
                                                        btn.type || "reply"
                                                      }
                                                      onChange={(e) => {
                                                        const updatedCards = [
                                                          ...(values.carouselCards ||
                                                            []),
                                                        ];
                                                        const updatedBtns = [
                                                          ...(updatedCards[cidx]
                                                            .buttons || []),
                                                        ];
                                                        updatedBtns[bidx] = {
                                                          ...updatedBtns[bidx],
                                                          type: e.target.value,
                                                        };
                                                        updatedCards[cidx] = {
                                                          ...updatedCards[cidx],
                                                          buttons: updatedBtns,
                                                        };
                                                        setFieldValue(
                                                          "carouselCards",
                                                          updatedCards,
                                                        );
                                                      }}
                                                      disabled={
                                                        !campaignEditable
                                                      }
                                                    >
                                                      <MenuItem value="reply">
                                                        Resposta
                                                      </MenuItem>
                                                      <MenuItem value="url">
                                                        URL
                                                      </MenuItem>
                                                      <MenuItem value="call">
                                                        Ligar
                                                      </MenuItem>
                                                    </Select>
                                                  </FormControl>
                                                </Grid>
                                                <Grid item xs={4}>
                                                  <TextField
                                                    label="Valor"
                                                    value={btn.value || ""}
                                                    onChange={(e) => {
                                                      const updatedCards = [
                                                        ...(values.carouselCards ||
                                                          []),
                                                      ];
                                                      const updatedBtns = [
                                                        ...(updatedCards[cidx]
                                                          .buttons || []),
                                                      ];
                                                      updatedBtns[bidx] = {
                                                        ...updatedBtns[bidx],
                                                        value: e.target.value,
                                                      };
                                                      updatedCards[cidx] = {
                                                        ...updatedCards[cidx],
                                                        buttons: updatedBtns,
                                                      };
                                                      setFieldValue(
                                                        "carouselCards",
                                                        updatedCards,
                                                      );
                                                    }}
                                                    variant="outlined"
                                                    size="small"
                                                    fullWidth
                                                    disabled={!campaignEditable}
                                                  />
                                                </Grid>
                                                <Grid
                                                  item
                                                  xs={1}
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                  }}
                                                >
                                                  <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                      const updatedCards = [
                                                        ...(values.carouselCards ||
                                                          []),
                                                      ];
                                                      updatedCards[cidx] = {
                                                        ...updatedCards[cidx],
                                                        buttons: (
                                                          updatedCards[cidx]
                                                            .buttons || []
                                                        ).filter(
                                                          (_, i) => i !== bidx,
                                                        ),
                                                      };
                                                      setFieldValue(
                                                        "carouselCards",
                                                        updatedCards,
                                                      );
                                                    }}
                                                    disabled={!campaignEditable}
                                                  >
                                                    <DeleteOutlineIcon fontSize="small" />
                                                  </IconButton>
                                                </Grid>
                                              </Grid>
                                            ),
                                          )}
                                          {(card.buttons || []).length < 3 && (
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              onClick={() => {
                                                const updatedCards = [
                                                  ...(values.carouselCards ||
                                                    []),
                                                ];
                                                updatedCards[cidx] = {
                                                  ...updatedCards[cidx],
                                                  buttons: [
                                                    ...(updatedCards[cidx]
                                                      .buttons || []),
                                                    {
                                                      displayText: "",
                                                      type: "reply",
                                                      value: "",
                                                    },
                                                  ],
                                                };
                                                setFieldValue(
                                                  "carouselCards",
                                                  updatedCards,
                                                );
                                              }}
                                              disabled={!campaignEditable}
                                              style={{ fontSize: 11 }}
                                            >
                                              + Botão
                                            </Button>
                                          )}
                                        </Grid>
                                      </Grid>
                                    </Box>
                                  ),
                                )}
                                {(values.carouselCards || []).length < 10 && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    onClick={() =>
                                      setFieldValue("carouselCards", [
                                        ...(values.carouselCards || []),
                                        {
                                          headerTitle: "",
                                          imageUrl: "",
                                          body: "",
                                          footer: "",
                                          buttons: [],
                                        },
                                      ])
                                    }
                                    disabled={!campaignEditable}
                                    style={{ marginTop: 4 }}
                                  >
                                    + Adicionar card
                                  </Button>
                                )}
                              </Box>
                            </Grid>
                          )}

                          {/* Enquete (Poll) */}
                          {values.messageType === "poll" && (
                            <Grid item xs={12}>
                              <Box
                                style={{
                                  border: "1px solid #e0e0e0",
                                  borderRadius: 8,
                                  padding: 12,
                                  backgroundColor: "#fffbf0",
                                }}
                              >
                                <Box
                                  style={{
                                    fontWeight: 600,
                                    marginBottom: 6,
                                    fontSize: 13,
                                    color: "#555",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  📊 Enquete — Pergunta e opções de resposta
                                </Box>
                                <Box
                                  style={{
                                    fontSize: 11,
                                    color: "#856404",
                                    backgroundColor: "#fff3cd",
                                    border: "1px solid #ffc107",
                                    borderRadius: 6,
                                    padding: "6px 10px",
                                    marginBottom: 8,
                                  }}
                                >
                                  ✏️ Modelo pré-preenchido. Edite a pergunta no
                                  campo <strong>Mensagem 1</strong> acima e
                                  substitua as opções pelos textos reais.
                                </Box>
                                <Box
                                  style={{
                                    fontSize: 11,
                                    color: "#888",
                                    marginBottom: 10,
                                  }}
                                >
                                  A <strong>pergunta</strong> vem do campo
                                  Mensagem 1 acima. As <strong>opções</strong>{" "}
                                  são os textos de botão abaixo (mín. 2, máx.
                                  12).
                                </Box>
                                {(values.buttons || []).map((opt, idx) => (
                                  <Grid
                                    container
                                    spacing={1}
                                    key={idx}
                                    style={{ marginBottom: 6 }}
                                  >
                                    <Grid item xs={10}>
                                      <TextField
                                        label={`Opção ${idx + 1}`}
                                        value={opt.displayText || ""}
                                        placeholder={
                                          idx === 0
                                            ? "Ex: Manhã (8h–12h)"
                                            : idx === 1
                                              ? "Ex: Tarde (13h–17h)"
                                              : "Ex: Noite (18h–22h)"
                                        }
                                        onChange={(e) => {
                                          const updated = [
                                            ...(values.buttons || []),
                                          ];
                                          updated[idx] = {
                                            displayText: e.target.value,
                                            type: "reply",
                                            value: "",
                                          };
                                          setFieldValue("buttons", updated);
                                        }}
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        disabled={!campaignEditable}
                                        inputProps={{ maxLength: 100 }}
                                      />
                                    </Grid>
                                    <Grid
                                      item
                                      xs={2}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          const updated = (
                                            values.buttons || []
                                          ).filter((_, i) => i !== idx);
                                          setFieldValue("buttons", updated);
                                        }}
                                        disabled={
                                          !campaignEditable ||
                                          (values.buttons || []).length <= 2
                                        }
                                      >
                                        <DeleteOutlineIcon fontSize="small" />
                                      </IconButton>
                                    </Grid>
                                  </Grid>
                                ))}
                                {(values.buttons || []).length < 12 && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    onClick={() =>
                                      setFieldValue("buttons", [
                                        ...(values.buttons || []),
                                        {
                                          displayText: "",
                                          type: "reply",
                                          value: "",
                                        },
                                      ])
                                    }
                                    disabled={!campaignEditable}
                                    style={{ marginTop: 4 }}
                                  >
                                    + Adicionar opção
                                  </Button>
                                )}
                                {(values.buttons || []).length === 0 && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    onClick={() =>
                                      setFieldValue("buttons", [
                                        {
                                          displayText: "Manhã (8h–12h)",
                                          type: "reply",
                                          value: "",
                                        },
                                        {
                                          displayText: "Tarde (13h–17h)",
                                          type: "reply",
                                          value: "",
                                        },
                                        {
                                          displayText: "Noite (18h–22h)",
                                          type: "reply",
                                          value: "",
                                        },
                                      ])
                                    }
                                    disabled={!campaignEditable}
                                  >
                                    Usar modelo de exemplo
                                  </Button>
                                )}
                              </Box>
                            </Grid>
                          )}

                          {/* Seção: Cadência de disparo */}
                          <Grid item xs={12}>
                            <Box
                              style={{
                                border: "1px solid #bfdbfe",
                                borderRadius: 8,
                                padding: 16,
                                backgroundColor: "#eff6ff",
                              }}
                            >
                              <Typography
                                style={{
                                  fontWeight: 700,
                                  marginBottom: 12,
                                  fontSize: 13,
                                  color: "#1e40af",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                ⏱️ Cadência de disparo
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={Boolean(values.randomizedDispatch)}
                                        onChange={(e) =>
                                          setFieldValue("randomizedDispatch", e.target.checked)
                                        }
                                        color="primary"
                                        disabled={!campaignEditable}
                                      />
                                    }
                                    label="Randomizar intervalo entre mensagens"
                                  />
                                </Grid>
                                <Grid item xs={6}>
                                  <TextField
                                    label="Intervalo mínimo (minutos)"
                                    type="number"
                                    value={values.dispatchMinDelayMinutes || 0}
                                    onChange={(e) =>
                                      setFieldValue(
                                        "dispatchMinDelayMinutes",
                                        Math.max(0, Number(e.target.value)),
                                      )
                                    }
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    disabled={!campaignEditable}
                                    inputProps={{ min: 0, step: 1 }}
                                  />
                                </Grid>
                                <Grid item xs={6}>
                                  <TextField
                                    label="Intervalo máximo (minutos)"
                                    type="number"
                                    value={values.dispatchMaxDelayMinutes || 0}
                                    onChange={(e) =>
                                      setFieldValue(
                                        "dispatchMaxDelayMinutes",
                                        Math.max(0, Number(e.target.value)),
                                      )
                                    }
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    disabled={!campaignEditable}
                                    inputProps={{ min: 0, step: 1 }}
                                  />
                                </Grid>
                                <Grid item xs={6}>
                                  <TextField
                                    label="Limite diário de envios"
                                    type="number"
                                    value={values.dailyLimit || 0}
                                    onChange={(e) =>
                                      setFieldValue(
                                        "dailyLimit",
                                        Math.max(0, Number(e.target.value)),
                                      )
                                    }
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    disabled={!campaignEditable}
                                    helperText="0 = sem limite diário"
                                    inputProps={{ min: 0, step: 1 }}
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={Boolean(values.enableTypingIndicator)}
                                        onChange={(e) =>
                                          setFieldValue(
                                            "enableTypingIndicator",
                                            e.target.checked,
                                          )
                                        }
                                        color="primary"
                                        disabled={!campaignEditable}
                                      />
                                    }
                                    label="Simular digitando antes de enviar"
                                  />
                                </Grid>
                                {values.enableTypingIndicator && (
                                  <Grid item xs={6}>
                                    <TextField
                                      label="Tempo digitando (segundos)"
                                      type="number"
                                      value={values.typingDurationSeconds || 0}
                                      onChange={(e) =>
                                        setFieldValue(
                                          "typingDurationSeconds",
                                          Math.min(20, Math.max(0, Number(e.target.value))),
                                        )
                                      }
                                      variant="outlined"
                                      size="small"
                                      fullWidth
                                      disabled={!campaignEditable}
                                      helperText="Máximo: 20 segundos"
                                      inputProps={{ min: 0, max: 20, step: 1 }}
                                    />
                                  </Grid>
                                )}
                                {Number(values.dailyLimit) > 0 && (
                                  <Grid item xs={12}>
                                    <Box
                                      style={{
                                        backgroundColor: "#dbeafe",
                                        border: "1px solid #93c5fd",
                                        borderRadius: 6,
                                        padding: "8px 12px",
                                        fontSize: 12,
                                        color: "#1d4ed8",
                                      }}
                                    >
                                      📅 Limite de{" "}
                                      <strong>{values.dailyLimit} envios/dia</strong>. A
                                      campanha pausa automaticamente ao atingir o limite e
                                      retoma no dia seguinte no horário de início.
                                    </Box>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          </Grid>

                          {/* Seção: Inteligência Artificial */}
                          <Grid item xs={12}>
                            <Box
                              style={{
                                border: "1px solid #e9d5ff",
                                borderRadius: 8,
                                padding: 16,
                                backgroundColor: "#faf5ff",
                              }}
                            >
                              <Typography
                                style={{
                                  fontWeight: 700,
                                  marginBottom: 12,
                                  fontSize: 13,
                                  color: "#6d28d9",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                🤖 Inteligência Artificial
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
                                  <Box
                                    style={{
                                      fontSize: 11,
                                      color: "#7c3aed",
                                      backgroundColor: "#ede9fe",
                                      borderRadius: 6,
                                      padding: "6px 10px",
                                      marginBottom: 8,
                                    }}
                                  >
                                    Cada ação de IA consome <strong>1 crédito</strong> do plano.
                                    A geração de variações usa 1 crédito por clique.
                                    A personalização no envio usa 1 crédito por mensagem enviada.
                                    Se os créditos acabarem, a campanha continuará com a mensagem original, sem personalização por IA.
                                  </Box>
                                </Grid>
                                <Grid item xs={12}>
                                  <Button
                                    variant="contained"
                                    disabled={aiGenerating || (!campaignEditable && campaign.status !== "CANCELADA")}
                                    onClick={() => handleGenerateVariations(values, setFieldValue)}
                                    style={{
                                      background: aiGenerating ? "#9ca3af" : "#6d28d9",
                                      color: "white",
                                      textTransform: "none",
                                      fontWeight: 600,
                                      fontSize: 13,
                                      borderRadius: 8,
                                      boxShadow: "none",
                                    }}
                                  >
                                    {aiGenerating ? "Gerando mensagens..." : "✨ Gerar variações com IA"}
                                  </Button>
                                  <Typography
                                    style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}
                                  >
                                    Escreva a mensagem base na aba Msg. 1, depois clique para
                                    gerar 5 variações que preencherão Msg. 1–5.
                                  </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={Boolean(values.enableAiMessageVariation)}
                                        onChange={(e) =>
                                          setFieldValue(
                                            "enableAiMessageVariation",
                                            e.target.checked,
                                          )
                                        }
                                        color="primary"
                                        disabled={!campaignEditable && campaign.status !== "CANCELADA"}
                                        style={{ color: "#6d28d9" }}
                                      />
                                    }
                                    label={
                                      <Typography style={{ fontSize: 13, fontWeight: 600 }}>
                                        Personalização inteligente no envio
                                      </Typography>
                                    }
                                  />
                                  <Typography
                                    style={{ fontSize: 11, color: "#64748b", marginLeft: 44 }}
                                  >
                                    A IA adapta levemente cada mensagem antes do envio para tornar
                                    a comunicação mais natural. Consome 1 crédito por mensagem enviada.
                                    Se os créditos acabarem, a campanha continuará com a mensagem original, sem personalização por IA.
                                  </Typography>
                                </Grid>
                              </Grid>
                            </Box>
                          </Grid>

                          {(campaign.mediaPath || attachment) && (
                            <Grid item xs={12}>
                              <Box display="flex" alignItems="center">
                                <AttachFileIcon
                                  color="action"
                                  style={{ marginRight: 8 }}
                                />
                                <span>
                                  {attachment != null
                                    ? attachment.name
                                    : campaign.mediaName}
                                </span>
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      </Grid>

                      {/* Coluna direita: preview no celular */}
                      <Grid item xs={12} md={4}>
                        <div className={classes.phonePreviewContainer}>
                          <div className={classes.phoneFrame}>
                            <div className={classes.phoneScreen}>
                              <div className={classes.phoneHeader}>
                                <WhatsAppIcon fontSize="small" />
                                <div className={classes.phoneHeaderTitle}>
                                  <span>
                                    {values.name ||
                                      campaign.name ||
                                      "Campanha em massa"}
                                  </span>
                                  <span className={classes.phoneHeaderSubtitle}>
                                    Pré-visualização da mensagem
                                  </span>
                                </div>
                              </div>
                              <div className={classes.phoneMessagesArea}>
                                {/* Mídia primeiro */}
                                {(() => {
                                  const preview = getAttachmentPreview();

                                  if (preview.type === "image" && preview.url) {
                                    return (
                                      <div
                                        className={classes.phoneMediaFileRow}
                                      >
                                        <img
                                          src={preview.url}
                                          alt={
                                            attachment?.name ||
                                            campaign.mediaName ||
                                            "mídia"
                                          }
                                          style={{
                                            maxWidth: "100%",
                                            borderRadius: 12,
                                          }}
                                        />
                                      </div>
                                    );
                                  }

                                  if (preview.type === "video" && preview.url) {
                                    return (
                                      <div
                                        className={classes.phoneMediaFileRow}
                                      >
                                        <video
                                          src={preview.url}
                                          controls
                                          style={{
                                            width: "100%",
                                            borderRadius: 12,
                                          }}
                                        />
                                      </div>
                                    );
                                  }

                                  if (preview.type === "audio" && preview.url) {
                                    return (
                                      <div
                                        className={classes.phoneMediaFileRow}
                                      >
                                        <audio
                                          src={preview.url}
                                          controls
                                          style={{ width: "100%" }}
                                        />
                                      </div>
                                    );
                                  }

                                  if (preview.type === "document") {
                                    const name =
                                      attachment?.name || campaign.mediaName;
                                    const ext =
                                      name && name.includes(".")
                                        ? name.split(".").pop().toUpperCase()
                                        : "DOC";

                                    return (
                                      <div
                                        className={classes.phoneMediaFileRow}
                                      >
                                        <AttachFileIcon fontSize="small" />
                                        <div
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 10,
                                              opacity: 0.8,
                                            }}
                                          >
                                            {ext} • arquivo
                                          </span>
                                          <span>{name}</span>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (
                                    campaign.mediaPath ||
                                    campaign.mediaName ||
                                    attachment
                                  ) {
                                    return (
                                      <div
                                        className={classes.phoneMediaFileRow}
                                      >
                                        <AttachFileIcon fontSize="small" />
                                        <span>
                                          {attachment != null
                                            ? attachment.name
                                            : campaign.mediaName}
                                        </span>
                                      </div>
                                    );
                                  }

                                  return null;
                                })()}

                                {/* Texto sempre abaixo da mídia */}
                                {values[`message${messageTab + 1}`] ? (
                                  <div className={classes.phoneMessageBubble}>
                                    {values[`message${messageTab + 1}`]}
                                  </div>
                                ) : (
                                  <div className={classes.phonePlaceholder}>
                                    Comece a digitar a mensagem para ver aqui
                                    como ela ficará no celular.
                                  </div>
                                )}
                                {values.messageType === "buttons" &&
                                  (values.buttons || []).length > 0 && (
                                    <div
                                      style={{
                                        alignSelf: "flex-end",
                                        width: "85%",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 6,
                                      }}
                                    >
                                      {(values.buttons || [])
                                        .slice(0, 4)
                                        .map((btn, index) => (
                                          <div
                                            key={`preview-button-${index}`}
                                            style={{
                                              padding: "8px 10px",
                                              borderRadius: 10,
                                              backgroundColor: "#111827",
                                              color: "#e5e7eb",
                                              fontSize: 11,
                                              border:
                                                "1px solid rgba(34,197,94,0.35)",
                                              textAlign: "center",
                                              fontWeight: 600,
                                            }}
                                          >
                                            {btn.displayText ||
                                              `Botão ${index + 1}`}
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                {values.messageType === "list" && (
                                  <div
                                    style={{
                                      alignSelf: "flex-end",
                                      width: "85%",
                                      borderRadius: 14,
                                      overflow: "hidden",
                                      backgroundColor: "#111827",
                                      color: "#e5e7eb",
                                      boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
                                    }}
                                  >
                                    <div
                                      style={{
                                        padding: "8px 10px",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        borderBottom:
                                          "1px solid rgba(255,255,255,0.08)",
                                      }}
                                    >
                                      {values.listButtonText ||
                                        LIST_TEMPLATE.buttonText}
                                    </div>
                                    <div
                                      style={{
                                        padding: "8px 10px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 6,
                                      }}
                                    >
                                      {(values.listSections || [])
                                        .slice(0, 2)
                                        .map((section, sectionIndex) => (
                                          <div
                                            key={`preview-section-${sectionIndex}`}
                                          >
                                            <div
                                              style={{
                                                fontSize: 10,
                                                textTransform: "uppercase",
                                                opacity: 0.7,
                                                marginBottom: 4,
                                              }}
                                            >
                                              {section.title ||
                                                `Seção ${sectionIndex + 1}`}
                                            </div>
                                            {(section.rows || [])
                                              .slice(0, 3)
                                              .map((row, rowIndex) => (
                                                <div
                                                  key={`preview-row-${sectionIndex}-${rowIndex}`}
                                                  style={{ marginBottom: 4 }}
                                                >
                                                  <div
                                                    style={{
                                                      fontSize: 11,
                                                      fontWeight: 600,
                                                    }}
                                                  >
                                                    {row.title ||
                                                      `Item ${rowIndex + 1}`}
                                                  </div>
                                                  {row.description ? (
                                                    <div
                                                      style={{
                                                        fontSize: 10,
                                                        opacity: 0.75,
                                                      }}
                                                    >
                                                      {row.description}
                                                    </div>
                                                  ) : null}
                                                </div>
                                              ))}
                                          </div>
                                        ))}
                                      {values.listFooter ? (
                                        <div
                                          style={{
                                            fontSize: 10,
                                            opacity: 0.7,
                                            borderTop:
                                              "1px solid rgba(255,255,255,0.08)",
                                            paddingTop: 6,
                                          }}
                                        >
                                          {values.listFooter}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                )}
                                {values.messageType === "carousel" &&
                                  (values.carouselCards || []).length > 0 && (
                                    <div
                                      style={{
                                        alignSelf: "flex-end",
                                        width: "100%",
                                        display: "flex",
                                        gap: 8,
                                        overflowX: "auto",
                                        paddingBottom: 4,
                                      }}
                                    >
                                      {(values.carouselCards || [])
                                        .slice(0, 3)
                                        .map((card, index) => (
                                          <div
                                            key={`preview-carousel-${index}`}
                                            style={{
                                              minWidth: 150,
                                              borderRadius: 14,
                                              backgroundColor: "#111827",
                                              color: "#e5e7eb",
                                              overflow: "hidden",
                                              boxShadow:
                                                "0 6px 14px rgba(0,0,0,0.35)",
                                            }}
                                          >
                                            <div
                                              style={{
                                                padding: "8px 10px",
                                                borderBottom:
                                                  "1px solid rgba(255,255,255,0.08)",
                                              }}
                                            >
                                              <div
                                                style={{
                                                  fontSize: 11,
                                                  fontWeight: 700,
                                                }}
                                              >
                                                {card.headerTitle ||
                                                  `Card ${index + 1}`}
                                              </div>
                                            </div>
                                            <div
                                              style={{ padding: "8px 10px" }}
                                            >
                                              <div
                                                style={{
                                                  fontSize: 11,
                                                  marginBottom: 8,
                                                }}
                                              >
                                                {card.body ||
                                                  "Descrição do card"}
                                              </div>
                                              {(card.buttons || [])
                                                .slice(0, 2)
                                                .map((btn, buttonIndex) => (
                                                  <div
                                                    key={`preview-carousel-btn-${index}-${buttonIndex}`}
                                                    style={{
                                                      fontSize: 10,
                                                      color: "#86efac",
                                                      marginBottom: 4,
                                                    }}
                                                  >
                                                    •{" "}
                                                    {btn.displayText ||
                                                      `Botão ${buttonIndex + 1}`}
                                                  </div>
                                                ))}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                {values.messageType === "poll" &&
                                  (values.buttons || []).length > 0 && (
                                    <div
                                      style={{
                                        alignSelf: "flex-end",
                                        width: "85%",
                                        borderRadius: 14,
                                        backgroundColor: "#111827",
                                        color: "#e5e7eb",
                                        padding: "8px 10px",
                                        boxShadow:
                                          "0 6px 14px rgba(0,0,0,0.35)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 700,
                                          marginBottom: 6,
                                        }}
                                      >
                                        Enquete
                                      </div>
                                      {(values.buttons || [])
                                        .slice(0, 4)
                                        .map((option, index) => (
                                          <div
                                            key={`preview-poll-${index}`}
                                            style={{
                                              fontSize: 10,
                                              padding: "6px 8px",
                                              borderRadius: 8,
                                              backgroundColor:
                                                "rgba(255,255,255,0.05)",
                                              marginBottom: 4,
                                            }}
                                          >
                                            {option.displayText ||
                                              `Opção ${index + 1}`}
                                          </div>
                                        ))}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Grid>
                    </Grid>
                  </Box>
                  {quickRepliesOpen && (
                    <QuickRepliesModal
                      open={quickRepliesOpen}
                      onClose={() => setQuickRepliesOpen(false)}
                      onSelect={(replyMessage, file) =>
                        handleCampaignQuickReplySelect(
                          replyMessage,
                          file,
                          values,
                          setFieldValue,
                        )
                      }
                      variant="sidebar"
                    />
                  )}
                </Box>
              </DialogContent>

              <DialogActions className={classes.dialogActions}>
                <Box>
                  {campaign.status === "CANCELADA" && (
                    <Button
                      style={{
                        color: "white",
                        backgroundColor: "#1E90FF",
                        boxShadow: "none",
                        borderRadius: "5px",
                        fontSize: "12px",
                        marginRight: 8,
                      }}
                      startIcon={<RestartAltIcon />}
                      onClick={() => restartCampaign()}
                      variant="contained"
                    >
                      {i18n.t("campaigns.dialog.buttons.restart")}
                    </Button>
                  )}
                  {campaign.status === "EM_ANDAMENTO" && (
                    <Button
                      style={{
                        color: "white",
                        backgroundColor: "#db6565",
                        boxShadow: "none",
                        borderRadius: "5px",
                        fontSize: "12px",
                        marginRight: 8,
                      }}
                      startIcon={<CancelIcon />}
                      onClick={() => cancelCampaign()}
                      variant="contained"
                    >
                      {i18n.t("campaigns.dialog.buttons.cancel")}
                    </Button>
                  )}
                  {!attachment && !campaign.mediaPath && campaignEditable && (
                    <Box display="flex" alignItems="center" gridGap={8}>
                      <Button
                        style={{
                          color: "white",
                          backgroundColor: "#4ec24e",
                          boxShadow: "none",
                          borderRadius: "5px",
                          fontSize: "12px",
                        }}
                        startIcon={<AttachFileIcon />}
                        onClick={() => attachmentFile.current.click()}
                        disabled={isSubmitting}
                        variant="contained"
                      >
                        {i18n.t("campaigns.dialog.buttons.attach")}
                      </Button>
                      <Button
                        style={{
                          color: "white",
                          backgroundColor: "#2563eb",
                          boxShadow: "none",
                          borderRadius: "5px",
                          fontSize: "12px",
                        }}
                        onClick={() => setMediaDriveOpen(true)}
                        disabled={isSubmitting}
                        variant="contained"
                      >
                        Mídia Drive
                      </Button>
                    </Box>
                  )}
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Button
                    style={{
                      color: "white",
                      backgroundColor: "#db6565",
                      boxShadow: "none",
                      borderRadius: "5px",
                      fontSize: "12px",
                      marginRight: 16,
                    }}
                    startIcon={<CancelIcon />}
                    onClick={handleClose}
                    disabled={isSubmitting}
                    variant="contained"
                  >
                    {i18n.t("campaigns.dialog.buttons.close")}
                  </Button>
                  {(campaignEditable || campaign.status === "CANCELADA") && (
                    <Button
                      style={{
                        color: "white",
                        backgroundColor: "#437db5",
                        boxShadow: "none",
                        borderRadius: "5px",
                        fontSize: "12px",
                      }}
                      startIcon={<SaveIcon />}
                      type="submit"
                      disabled={isSubmitting}
                      variant="contained"
                    >
                      {campaignId
                        ? `${i18n.t("campaigns.dialog.buttons.edit")}`
                        : `${i18n.t("campaigns.dialog.buttons.add")}`}
                      {isSubmitting && (
                        <CircularProgress
                          size={24}
                          className={classes.buttonProgress}
                        />
                      )}
                    </Button>
                  )}
                </Box>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default CampaignModal;
