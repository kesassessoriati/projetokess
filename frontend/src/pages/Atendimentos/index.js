import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useParams, useHistory, useLocation } from "react-router-dom";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import {
	Box,
	Button,
	Chip,
	Collapse,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControlLabel,
	Grid,
	IconButton,
	InputAdornment,
	List,
	ListItem,
	ListItemAvatar,
	ListItemSecondaryAction,
	ListItemText,
	Menu,
	MenuItem,
	Paper,
	Popover,
	Select,
	Switch,
	SvgIcon,
	TextField,
	Toolbar,
	Tooltip,
	Typography,
	InputBase,
	Avatar,
	Tabs,
	Tab,
	Badge,
	CircularProgress,
	Checkbox,
} from "@material-ui/core";
import {
	FilterList as FilterListIcon,
	Close as CloseIcon,
	ArrowBack as ArrowBackIcon,
	Delete as DeleteIcon,
	CheckCircle as CheckCircleIcon,
	Replay as ReplayIcon,
	Block as BlockIcon,
	Label as LabelIcon,
	ViewColumn as ViewColumnIcon,
	Image as ImageIcon,
	InsertDriveFile as FileIcon,
	Videocam as VideoIcon,
	Description as DocumentIcon,
	GetApp as GetAppIcon,
	Create as SignatureIcon,
	Timer as ScheduleIcon,
	Comment as QuickMessageIcon,
	Visibility as VisibilityIcon,
	Done as DoneIcon,
	DoneAll as DoneAllIcon,
	Edit as EditIcon,
	Menu as MenuIcon,
	Close as CloseMenuIcon,
	MoreHoriz as MoreHorizIcon,
	Add as AddIcon,
	AccountCircle as AccountCircleIcon,
	MoreVert as MoreVertIcon,
	Mic as MicIcon,
	EmojiEmotions as EmojiIcon,
	AttachFile as AttachFileIcon,
	Send as SendIcon,
	Chat as ChatIcon,
	SwapHoriz as SwapHorizIcon,
	WhatsApp as WhatsAppIcon,
	Facebook as FacebookIcon,
	Instagram as InstagramIcon,
	Android as AndroidIcon,
	Archive as ArchiveIcon,
	VisibilityOff as VisibilityOffIcon,
	Receipt as ReceiptIcon,
	Email as EmailIcon,
	FlashOn as FlashOnIcon,
	Folder as FolderIcon,
	CameraAlt as CameraAltIcon,
	Person as PersonIcon,
	Duo as DuoIcon,
	PermMedia as PermMediaIcon,
	Search as SearchIcon,
	Group as GroupIcon,
	CheckBox as CheckBoxIcon,
	CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
	MarkunreadMailbox as UnreadIcon,
	TimerOff as TimerOffIcon,
	PlaylistAdd as AssignQueueIcon,
} from "@material-ui/icons";
import CallIcon from '@mui/icons-material/Call';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AudioModal from "../../components/AudioModal";
import ButtonModal from "../../components/ButtonModal";
import ButtonPreview from "../../components/ButtonPreview";
import CameraModal from "../../components/CameraModal";
import CarouselPreview from "../../components/CarouselPreview";
import ContactSendModal from "../../components/ContactSendModal";
import ListPreview from "../../components/ListPreview";
import ModalImageCors from "../../components/ModalImageCors";
import MediaDrivePickerModal from "../../components/MediaDrivePickerModal";
import PixPreview from "../../components/PixPreview";
import ScheduleModal from "../../components/ScheduleModal";
import TransferTicketModalCustom from "../../components/TransferTicketModalCustom";
import MediaPreviewModal from "../../components/MediaPreviewModal";
import MediaGalleryModal from "../../components/MediaGalleryModal";
import DeleteConfirmModal from "../../components/MessageActionsModal/DeleteConfirmModal";
import EditMessageModal from "../../components/MessageActionsModal/EditMessageModal";
import ForwardMessageModal from "../../components/MessageActionsModal/ForwardMessageModal";
import TicketTagsKanbanModal from "../../components/TicketTagsKanbanModal";
import ConnectionIcon from "../../components/ConnectionIcon";
import ContactModal from "../../components/ContactModal";
import FaturaModal from "../../components/FaturaModal";
import QuickRepliesModal from "../../components/QuickRepliesModal";
import MessageInput from "../../components/MessageInput";
import VcardPreview from "../../components/VcardPreview";
import { ReplyMessageProvider } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { ForwardMessageProvider } from "../../context/ForwarMessage/ForwardMessageContext";
import { EditMessageProvider } from "../../context/EditingMessage/EditingMessageContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import api from "../../services/api";
import MicRecorder from "mic-recorder-to-mp3";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import TicketActionsMenu from "../../components/TicketActionsMenu";
import useQuickMessages from "../../hooks/useQuickMessages";
import { toast } from "react-toastify";
import { useSystemAlert } from "../../components/SystemAlert";
import useSafeApi from "../../hooks/useSafeApi";
import { useSocket } from "../../context/SocketContext";
import SafeComponent from "../../components/SafeComponent";
import {
	isGroupConversation,
	isPrivateConversation,
} from "../../utils/conversationType";
import resolveMessageVariables from "../../utils/resolveMessageVariables";
import NewTicketModal from "../../components/NewTicketModal";

const Mp3Recorder = new MicRecorder({ bitRate: 128 });

const useStyles = makeStyles(theme => ({
	'@keyframes pulse': {
		'0%': {
			opacity: 1,
			transform: 'scale(1)',
		},
		mobileHeaderToggle: {
			marginLeft: "auto",
			backgroundColor: "#e1e4ea",
		},
		mobileActionsCollapse: {
			width: "100%",
			display: "flex",
			flexWrap: "wrap",
			justifyContent: "flex-end",
			gap: 6,
		},
		mobileHeaderActions: {
			width: "100%",
			display: "flex",
			flexWrap: "wrap",
			justifyContent: "flex-end",
			gap: 6,
			marginTop: 8
		},
		'50%': {
			opacity: 0.5,
			transform: 'scale(1.2)',
		},
		'100%': {
			opacity: 1,
			transform: 'scale(1)',
		},
	},
	root: {
		display: "flex",
		height: "calc(100vh - 112px)",
		minHeight: "calc(100vh - 112px)",
		backgroundColor: "#111b21",
		overflow: "hidden",
		[theme.breakpoints.down("md")]: {
			height: "calc(100vh - 64px)",
			minHeight: "calc(100vh - 64px)",
		},
		[theme.breakpoints.down("sm")]: {
			height: "calc(100vh - 56px)",
			minHeight: "calc(100vh - 56px)",
		},
	},
	rootMobile: {
		flexDirection: "column",
	},

	sidebar: {
		width: 420,
		minWidth: 420,
		maxWidth: 420,
		height: "100%",
		backgroundColor: "#ffffff",
		borderRight: "1px solid #e9edef",
		display: "flex",
		flexDirection: "column",
		[theme.breakpoints.down('md')]: {
			width: 360,
			minWidth: 360,
			maxWidth: 360,
		},
	},
	sidebarMobile: {
		width: "100%",
		minWidth: "100%",
		maxWidth: "100%",
		borderRight: "none",
		height: "100%",
		maxHeight: "100vh",
		overflowY: "auto",
	},

	sidebarHeader: {
		height: 60,
		backgroundColor: "#f0f2f5",
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "10px 16px",
		borderBottom: "1px solid #e9edef",
		flexShrink: 0,
	},

	// Animação para status de digitação
	'@keyframes pulse': {
		'0%': {
			opacity: 1,
			transform: 'scale(1)',
		},
		'50%': {
			opacity: 0.5,
			transform: 'scale(0.8)',
		},
		'100%': {
			opacity: 1,
			transform: 'scale(1)',
		},
	},

	sidebarSearch: {
		padding: "8px 16px",
		backgroundColor: "#ffffff",
		borderBottom: "1px solid #e9edef",
	},

	searchInput: {
		backgroundColor: "#f0f2f5",
		borderRadius: 8,
		padding: "8px 12px",
		width: "100%",
		display: "flex",
		alignItems: "center",
		"& input": {
			marginLeft: 8,
			flex: 1,
		},
	},

	sidebarActionsRow: {
		display: "flex",
		alignItems: "center",
		gap: 4,
		padding: "4px 8px 6px",
		backgroundColor: "#ffffff",
		borderBottom: "1px solid #e9edef",
		flexShrink: 0,
	},

	searchInputWrapper: {
		flex: 1,
		display: "flex",
		alignItems: "center",
		backgroundColor: "#f0f2f5",
		borderRadius: 8,
		padding: "2px 8px",
		minWidth: 0,
	},

	selectionBar: {
		display: "flex",
		alignItems: "center",
		gap: 6,
		padding: "6px 8px",
		backgroundColor: "#f0f2f5",
		borderBottom: "1px solid #e9edef",
		flexShrink: 0,
		flexWrap: "wrap",
	},

	tabs: {
		borderBottom: "1px solid #e9edef",
		backgroundColor: "#ffffff",
		flexShrink: 0,
		"& .MuiTab-root": {
			minWidth: 100,
			textTransform: "none",
			fontSize: 14,
			fontWeight: 500,
		},
	},

	ticketsList: {
		flex: 1,
		overflowY: "auto",
		backgroundColor: "#ffffff",
		"&::-webkit-scrollbar": {
			width: "6px",
		},
		"&::-webkit-scrollbar-thumb": {
			backgroundColor: "#aaa",
			borderRadius: "3px",
		},
	},

	ticketItem: {
		display: "flex",
		alignItems: "center",
		padding: "8px 16px",
		cursor: "pointer",
		borderBottom: "1px solid #e9edef",
		transition: "background-color 0.2s",
		"&:hover": {
			backgroundColor: "#f5f6f6",
		},
		"&.active": {
			backgroundColor: "#f0f2f5",
		},
	},

	ticketDropdownArrow: {
		marginLeft: 4,
	},

	ticketAvatar: {
		width: 49,
		height: 49,
		marginRight: 15,
		flexShrink: 0,
	},

	ticketInfo: {
		flex: 1,
		minWidth: 0,
		overflow: "hidden",
		display: "flex",
		flexDirection: "column",
		gap: 2,
	},

	ticketName: {
		fontSize: 17,
		fontWeight: 400,
		color: "#111b21",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		lineHeight: "21px",
	},

	ticketTime: {
		fontSize: 12,
		color: "#667781",
		whiteSpace: "nowrap",
		marginLeft: 6,
	},

	ticketLastMessage: {
		fontSize: 14,
		color: "#667781",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		display: "flex",
		alignItems: "center",
		gap: 8,
		lineHeight: "20px",
	},

	chatArea: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		height: "calc(100vh - 112px)",
		backgroundColor: "#ffffff",
		position: "relative",
		overflow: "hidden",
		top: 0,
		[theme.breakpoints.down("md")]: {
			height: "calc(100vh - 64px)",
		},
	},
	chatWorkspace: {
		flex: 1,
		minHeight: 0,
		minWidth: 0,
		display: "flex",
		overflow: "hidden",
	},
	chatConversationPane: {
		flex: 1,
		minHeight: 0,
		minWidth: 0,
		display: "flex",
		flexDirection: "column",
		overflow: "hidden",
	},
	chatAreaMobile: {
		width: "100%",
		minWidth: "100%",
		maxWidth: "100%",
		flex: "1 1 auto",
		height: "calc(100vh - 64px)",
	},

	chatHeader: {
		height: 60,
		backgroundColor: "#f0f2f5",
		borderBottom: "1px solid #e9edef",
		display: "flex",
		alignItems: "center",
		padding: "0 16px",
		flexShrink: 0,
		position: "sticky",
		top: 0,
		zIndex: 10,
	},
	chatHeaderMobile: {
		flexWrap: "wrap",
		height: "auto",
		minHeight: 60,
		paddingTop: 8,
		paddingBottom: 8,
		gap: 8
	},

	chatHeaderInfo: {
		flex: 1,
		marginLeft: 12,
	},

	chatMessages: {
		flex: 1,
		overflowY: "auto",
		backgroundColor: "#efeae2",
		backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h100v100H0z' fill='%23efeae2'/%3E%3Cpath d='M20 20h60v60H20z' fill='%23f0f0f0' opacity='0.05'/%3E%3C/svg%3E")`,
		padding: 20,
	},

	messageGroup: {
		marginBottom: 12,
		display: "flex",
		flexDirection: "column",
		alignItems: (props) => props.fromMe ? "flex-end" : "flex-start",
	},

	messageBubble: {
		maxWidth: "65%",
		padding: "6px 7px 8px 9px",
		borderRadius: 8,
		backgroundColor: (props) => props.fromMe ? "#d9fdd3" : "#ffffff",
		boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
		position: "relative",
		marginBottom: 2,
	},

	messageText: {
		fontSize: 14,
		color: "#111b21",
		wordWrap: "break-word",
		marginBottom: 4,
	},

	messageTime: {
		fontSize: 11,
		color: "#667781",
		textAlign: "right",
		marginTop: 4,
	},

	chatInput: {
		backgroundColor: "#f0f2f5",
		borderTop: "1px solid #e9edef",
		padding: "12px 16px",
		display: "flex",
		alignItems: "center",
		gap: 8,
		position: "sticky",
		bottom: 0,
		zIndex: 10,
	},

	inputField: {
		flex: 1,
		backgroundColor: "#ffffff",
		borderRadius: 8,
		padding: "10px 12px",
		fontSize: 15,
		position: 'relative',
	},

	welcomeContainer: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		height: "100%",
		backgroundColor: "#f0f2f5",
		borderBottom: "6px solid #00a884",
		textAlign: "center",
		padding: 40,
	},

	welcomeIcon: {
		fontSize: 120,
		color: "#00a884",
		opacity: 0.3,
		marginBottom: 24,
	},

	welcomeTitle: {
		fontSize: 32,
		fontWeight: 300,
		color: "#41525d",
		marginBottom: 16,
		fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
	},

	welcomeText: {
		fontSize: 14,
		color: "#667781",
		lineHeight: 1.5,
		maxWidth: 480,
		fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
	},

	unreadBadge: {
		backgroundColor: "#25d366",
		color: "#fff",
		borderRadius: "10px",
		minWidth: 20,
		height: 20,
		padding: "0 6px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontSize: 12,
		fontWeight: 600,
	},

	statusChip: {
		height: 20,
		fontSize: 11,
		fontWeight: 500,
	},
}));

const CHANNEL_STYLES = {
	whatsapp: { bg: "#e8f5e9", color: "#00a884" },
	facebook: { bg: "#e7f0ff", color: "#1877F2" },
	instagram: { bg: "#ffe7f1", color: "#E4405F" },
	email: { bg: "#e8f5e9", color: "#2e7d32" },
};

// Função para detectar se é mensagem automática de anúncio Facebook/Instagram
const isAdAutomaticMessage = (message, channel) => {
	if (!message || !channel || !['facebook', 'instagram'].includes(channel)) return false;

	const adKeywords = [
		// Facebook
		'obrigado por entrar em contato',
		'agradecemos seu contato',
		'responderemos em breve',
		'em breve retornamos',
		'mensagem automática',
		'atendimento automático',
		'fora do horário',
		'horário de atendimento',
		// Instagram
		'thanks for reaching out',
		'thank you for contacting',
		'we\'ll get back to you',
		'automated message',
		'auto reply',
		'out of office',
		// Padrões de anúncio
		'anúncio',
		'advertisement',
		'promoção',
		'oferta'
	];

	const messageText = (message.body || '').toLowerCase();

	// Verificar se contém palavras-chave de anúncio
	const hasAdKeyword = adKeywords.some(keyword => messageText.includes(keyword));

	// Verificar se é muito curto (muitas mensagens de anúncio são curtas)
	const isVeryShort = messageText.length < 20;

	// Verificar se contém emojis comuns de anúncios
	const hasAdEmoji = /[\ud83d\udce2\ud83d\udccb\ud83c\udfaf\ud83d\udcc8\ud83d\udcb0\ud83c\udff7\ufe0f]/.test(messageText);

	return hasAdKeyword || (isVeryShort && hasAdEmoji);
};

// Função para extrair parâmetros UTM da URL
const getUTMParameters = () => {
	const params = new URLSearchParams(window.location.search);
	const utmSource = params.get('utm_source');
	const utmMedium = params.get('utm_medium');
	const utmCampaign = params.get('utm_campaign');
	const utmTerm = params.get('utm_term');
	const utmContent = params.get('utm_content');

	if (utmSource || utmMedium || utmCampaign) {
		const utmParams = [];
		if (utmSource) utmParams.push(`source: ${utmSource}`);
		if (utmMedium) utmParams.push(`medium: ${utmMedium}`);
		if (utmCampaign) utmParams.push(`campaign: ${utmCampaign}`);
		if (utmTerm) utmParams.push(`term: ${utmTerm}`);
		if (utmContent) utmParams.push(`content: ${utmContent}`);

		return {
			source: `UTM: ${utmParams.join(' | ')}`,
			campaign: utmCampaign || ''
		};
	}

	return { source: '', campaign: '' };
};

// Função para criar lead automaticamente de anúncio Facebook/Instagram
const createLeadFromAd = async (ticket) => {
	try {
		const utmData = getUTMParameters();

		const leadData = {
			name: ticket.contact?.name || 'Contato Anúncio',
			email: '',
			phone: ticket.contact?.number || '',
			source: utmData.source || 'Facebook/Instagram Ads',
			campaign: utmData.campaign || '',
			status: 'new',
			temperature: 'quente',
			notes: `Lead gerado automaticamente via anúncio ${ticket.channel === 'facebook' ? 'Facebook' : 'Instagram'}\n` +
				`Ticket ID: ${ticket.id}\n` +
				`Data: ${new Date().toLocaleString('pt-BR')}\n` +
				`Canal: ${ticket.channel}`
		};

		// Construir URL com UTMs para enviar ao backend
		const utmParams = new URLSearchParams();
		if (utmData.source && utmData.source.includes('UTM:')) {
			// Extrair UTMs do source para enviar como query params
			const utmMatches = utmData.source.match(/source: ([^|]+)|medium: ([^|]+)|campaign: ([^|]+)|term: ([^|]+)|content: ([^|]+)/g);
			if (utmMatches) {
				utmMatches.forEach(match => {
					if (match.includes('source:')) {
						utmParams.append('utm_source', match.split('source: ')[1]);
					} else if (match.includes('medium:')) {
						utmParams.append('utm_medium', match.split('medium: ')[1]);
					} else if (match.includes('campaign:')) {
						utmParams.append('utm_campaign', match.split('campaign: ')[1]);
					} else if (match.includes('term:')) {
						utmParams.append('utm_term', match.split('term: ')[1]);
					} else if (match.includes('content:')) {
						utmParams.append('utm_content', match.split('content: ')[1]);
					}
				});
			}
		}

		const url = `/crm/leads${utmParams.toString() ? '?' + utmParams.toString() : ''}`;
		const { data } = await api.post(url, leadData);

		// Opcional: mostrar notificação
		if (window.Notification && Notification.permission === "granted") {
			new Notification('🎯 Lead Criado', {
				body: `${leadData.name} foi adicionado automaticamente`,
				icon: "/logo.png"
			});
		}

		return data;
	} catch (err) {
	}
};

const getChannelStyle = (channel) => CHANNEL_STYLES[channel] || CHANNEL_STYLES.whatsapp;

// Função para formatar texto do WhatsApp (negrito, itálico, riscado, monospace, quebras de linha)
const formatWhatsAppText = (text) => {
	if (!text || typeof text !== 'string') return text;

	// Escapar HTML para segurança
	let formatted = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

	// Negrito: *texto*
	formatted = formatted.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');

	// Itálico: _texto_
	formatted = formatted.replace(/\_([^_]+)\_/g, '<em>$1</em>');

	// Riscado: ~texto~
	formatted = formatted.replace(/\~([^~]+)\~/g, '<del>$1</del>');

	// Monospace: ```texto```
	formatted = formatted.replace(/\`\`\`([^`]+)\`\`\`/g, '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;font-family:monospace">$1</code>');

	// Monospace inline: `texto`
	formatted = formatted.replace(/\`([^`]+)\`/g, '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;font-family:monospace">$1</code>');

	// Links clicáveis (http, https, www, domínios .com/.br)
	const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|br|org|net|gov|edu|mil|info|biz|co|io|ai|app|dev|tech|store|online|site|art|design|photo|video|music|blog|news|shop|club|team|live|studio|agency|company|services|solutions|consulting|marketing|software|data|cloud|security|network|systems|digital|creative|media|group|global|local|international|world|us|uk|ca|au|de|fr|es|it|pt|mx|ar|cl|pe|ve|uy|py|bo|ec|gy|sr|gf|gu)\b[^\s]*)/g;
	formatted = formatted.replace(urlRegex, (url) => {
		const href = url.startsWith('www.') ? `https://${url}` : (url.match(/^https?:\/\//) ? url : `https://${url}`);
		return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color:#0084ff;text-decoration:underline;cursor:pointer;-webkit-user-select:text;-moz-user-select:text;-ms-user-select:text;user-select:text;">${url}</a>`;
	});

	// Emails clicáveis que abrem no Gmail
	const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
	formatted = formatted.replace(emailRegex, (email) => {
		return `<a href="https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}" target="_blank" rel="noopener noreferrer" style="color:#0084ff;text-decoration:underline;cursor:pointer;-webkit-user-select:text;-moz-user-select:text;-ms-user-select:text;user-select:text;font-weight:500;">${email}</a>`;
	});

	// Quebras de linha: \n para <br>
	formatted = formatted.replace(/\n/g, '<br/>');

	return formatted;
};

const Atendimentos = () => {
	const classes = useStyles();
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const { ticketId } = useParams();
	const history = useHistory();
	const location = useLocation();
	const { user } = useContext(AuthContext);
	const { showConfirm } = useSystemAlert();

	// Verificar se está no modo mobile app (via URL params)
	const urlParams = new URLSearchParams(location.search);
	const mobileApp = urlParams.get('mobileApp') === 'true';
	const hideMenu = urlParams.get('hideMenu') === 'true';

	// Ocultar menu fixo se estiver no modo mobile app
	const shouldHideMobileMenu = mobileApp && hideMenu;

	// Índice inicial da aba: 0 para todos (Automação para admin, Aguardando para não-admin)
	const [tabIndex, setTabIndex] = useState(0);
	const [tickets, setTickets] = useState([]);
	const [selectedTicket, setSelectedTicket] = useState(null);
	const [messages, setMessages] = useState([]);
	const { loading, error: errorTickets, request: fetchTicketsApi } = useSafeApi("/tickets", { manual: true });
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
	const [filterAnchor, setFilterAnchor] = useState(null);
	const [selectedQueues, setSelectedQueues] = useState([]);
	const [selectedUsers, setSelectedUsers] = useState([]);
	const [selectedTags, setSelectedTags] = useState([]);
	const [selectedWhatsapps, setSelectedWhatsapps] = useState([]);
	const [selectedChannelsQuickFilter, setSelectedChannelsQuickFilter] = useState([]);
	const [messageDirectionFilter, setMessageDirectionFilter] = useState(null); // 'waiting_customer' | 'waiting_agent' | null
	const [queues, setQueues] = useState([]);
	const [users, setUsers] = useState([]);
	const [tags, setTags] = useState([]);
	const [whatsapps, setWhatsapps] = useState([]);
	const [unreadCounts, setUnreadCounts] = useState({
		pending: 0,
		open: 0,
		closed: 0,
		groups: 0
	});
	const [closeAllDialogOpen, setCloseAllDialogOpen] = useState(false);
	const [closingAllTickets, setClosingAllTickets] = useState(false);
	const [currentTime, setCurrentTime] = useState(Date.now());
	const [messageMenuAnchor, setMessageMenuAnchor] = useState(null);
	const [selectedMessage, setSelectedMessage] = useState(null);
	const [selectedMessageGroup, setSelectedMessageGroup] = useState([]);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [forwardModalOpen, setForwardModalOpen] = useState(false);
	const [replyingTo, setReplyingTo] = useState(null);
	const [viewingDeletedMessage, setViewingDeletedMessage] = useState(null);
	const [ticketMenuAnchor, setTicketMenuAnchor] = useState(null);
	const [selectedTicketForMenu, setSelectedTicketForMenu] = useState(null);
	const [tagsKanbanModalOpen, setTagsKanbanModalOpen] = useState(false);
	const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
	const [galleryMedias, setGalleryMedias] = useState([]);
	const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
	const [hasMore, setHasMore] = useState(false);
	const [pageNumber, setPageNumber] = useState(1);
	const [loadingMore, setLoadingMore] = useState(false);
	const [contactModalOpen, setContactModalOpen] = useState(false);
	const [contactModalContact, setContactModalContact] = useState(null);
	const [faturaModalOpen, setFaturaModalOpen] = useState(false);
	const [mobileView, setMobileView] = useState("list");
	const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
	const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [showQuickReplies, setShowQuickReplies] = useState(false);
	const [quickMessages, setQuickMessages] = useState([]);
	const [quickMessagesOpen, setQuickMessagesOpen] = useState(() => {
		if (typeof window === "undefined") return false;
		return window.localStorage.getItem("atendimentos.quickRepliesPanel") === "true";
	});
	const [inputMessage, setInputMessage] = useState("");
	const [signMessage, setSignMessage] = useState(true);
	const [privateMessage, setPrivateMessage] = useState(false);
	const [chatToolsAnchorEl, setChatToolsAnchorEl] = useState(null);
	const [buttonModalOpen, setButtonModalOpen] = useState(false);
	const [sendContactModalOpen, setSendContactModalOpen] = useState(false);
	const [cameraModalOpen, setCameraModalOpen] = useState(false);
	const [mediaDriveOpen, setMediaDriveOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false);
	const [mediaPreviewCaption, setMediaPreviewCaption] = useState("");
	const [mediaRecorder, setMediaRecorder] = useState(null);
	const [recording, setRecording] = useState(false);
	const [recordingTime, setRecordingTime] = useState(0);
	const [recordingInterval, setRecordingInterval] = useState(null);
	const [loadingRecording, setLoadingRecording] = useState(false);
	const [isTyping, setIsTyping] = useState(false);
	const [typingUser, setTypingUser] = useState(null);
	const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
	const [filteredQuickMessages, setFilteredQuickMessages] = useState([]);
	const [showAllTickets, setShowAllTickets] = useState(true);
	const [selectedQuickIndex, setSelectedQuickIndex] = useState(-1);
	const [quickReplySearchTerm, setQuickReplySearchTerm] = useState('');

	// Barra de ações operacionais
	const [onlyUnread, setOnlyUnread] = useState(false);
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectedTicketIds, setSelectedTicketIds] = useState(new Set());
	const [operationsMenuAnchor, setOperationsMenuAnchor] = useState(null);
	const [newConversationOpen, setNewConversationOpen] = useState(false);
	// Auto-close modal
	const [autoCloseOpen, setAutoCloseOpen] = useState(false);
	const [autoCloseEnabled, setAutoCloseEnabled] = useState(false);
	const [autoCloseHours, setAutoCloseHours] = useState(0);
	const [autoCloseMinutes, setAutoCloseMinutes] = useState(30);
	const [autoCloseSaving, setAutoCloseSaving] = useState(false);
	// Assignment queue modal
	const [assignQueueOpen, setAssignQueueOpen] = useState(false);
	const [assignQueueEnabled, setAssignQueueEnabled] = useState(false);
	const [assignQueueMode, setAssignQueueMode] = useState("round_robin");
	const [assignQueueBatchSize, setAssignQueueBatchSize] = useState(10);
	const [assignQueueUserIds, setAssignQueueUserIds] = useState([]);
	const [assignQueueSaving, setAssignQueueSaving] = useState(false);
	// Auto-accept modal
	const [autoAcceptOpen, setAutoAcceptOpen] = useState(false);
	const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(false);
	const [autoAcceptHours, setAutoAcceptHours] = useState(0);
	const [autoAcceptMinutes, setAutoAcceptMinutes] = useState(0);
	const [autoAcceptSaving, setAutoAcceptSaving] = useState(false);

	const quickReplyStartIndexRef = useRef(-1);
	const keepInputFocusRef = useRef(true);
	const inputMessageRef = useRef(null);
	const messagesEndRef = useRef(null);
	const messagesContainerRef = useRef(null);
	const audioContextRef = useRef(null);
	const fileInputRef = useRef(null);
	const documentInputRef = useRef(null);
	const selectedTicketRef = useRef(null);
	const pendingTicketDeleteTimeoutRef = useRef(null);
	const messagesRequestRef = useRef(0);
	const ticketRequestRef = useRef(0);
	const typingEmitRef = useRef(0);
	const optimisticMessageCounterRef = useRef(0);
	const pendingTextSendsRef = useRef(new Set());
	const { list: listQuickMessages } = useQuickMessages();

	const resetQuickReplyState = useCallback(() => {
		setQuickReplySearchTerm('');
		quickReplyStartIndexRef.current = -1;
		setShowQuickReplies(false);
		setFilteredQuickMessages([]);
		setSelectedQuickIndex(-1);
	}, []);

	const updateQuickReplyContext = useCallback((value) => {
		const slashIndex = value.lastIndexOf('/');
		if (slashIndex === -1) {
			resetQuickReplyState();
			return;
		}
		quickReplyStartIndexRef.current = slashIndex;
		const afterSlash = value.slice(slashIndex + 1);
		const match = afterSlash.match(/^\S*/);
		const query = match ? match[0] : '';
		setQuickReplySearchTerm(query);
	}, [resetQuickReplyState]);

	const handleSelectQuickReply = useCallback((message) => {
		setInputMessage(prev => {
			if (quickReplyStartIndexRef.current >= 0) {
				const before = prev.slice(0, quickReplyStartIndexRef.current).trimEnd();
				const afterIndex = quickReplyStartIndexRef.current + 1 + quickReplySearchTerm.length;
				const after = prev.slice(afterIndex).trimStart();
				return [before, message, after].filter(Boolean).join(" ");
			}
			return message;
		});
		resetQuickReplyState();
		keepInputFocusRef.current = true;
		requestAnimationFrame(() => {
			if (inputMessageRef.current) {
				inputMessageRef.current.focus({ preventScroll: true });
			}
		});
	}, [quickReplySearchTerm, resetQuickReplyState]);

	const channelQuickOptions = [
		{ key: "whatsapp", label: "WhatsApp", color: "#25d366", icon: <WhatsAppIcon fontSize="small" /> },
		{ key: "facebook", label: "Facebook", color: "#1877F2", icon: <FacebookIcon fontSize="small" /> },
		{ key: "instagram", label: "Instagram", color: "#E4405F", icon: <InstagramIcon fontSize="small" /> },
		{ key: "email", label: "E-mail", color: "#2e7d32", icon: <EmailIcon fontSize="small" /> }
	];

	const toggleChannelQuickFilter = channel => {
		setSelectedChannelsQuickFilter(prev =>
			prev.includes(channel) ? prev.filter(item => item !== channel) : [...prev, channel]
		);
	};

	const handleOpenContactModal = () => {
		if (selectedTicket?.contact) {
			setContactModalContact(selectedTicket.contact);
			setContactModalOpen(true);
		}
	};

	// ===== WAVoIP - Botão de Ligação =====
	const [wavoipModalOpen, setWavoipModalOpen] = useState(false);
	const [wavoipUrl, setWavoipUrl] = useState("");
	const [activeCallRecordId, setActiveCallRecordId] = useState(null);
	const [callStartTime, setCallStartTime] = useState(null);

	const handleOpenWavoipCall = async () => {
		if (!selectedTicket) return;
		try {
			// Solicitar permissão do microfone antes de abrir a chamada
			try {
				const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				// Parar o stream imediatamente - só precisamos da permissão
				stream.getTracks().forEach(track => track.stop());
			} catch (micErr) {
				toast.error("Permissão do microfone negada. Libere o microfone nas configurações do navegador para realizar chamadas.");
				return;
			}

			const { data } = await api.get(`/tickets/${selectedTicket.id}`);
			const token = data?.whatsapp?.wavoip;
			const phone = data?.contact?.number?.replace(/\D/g, "");
			const name = data?.contact?.name;

			if (!token || !phone) {
				toast.error("Token WAVoIP ou número de telefone não disponível.");
				return;
			}

			// Registrar chamada de saída no histórico
			try {
				const callRes = await api.post("/call-records", {
					contactId: data?.contact?.id,
					whatsappId: data?.whatsapp?.id,
					ticketId: selectedTicket.id,
					toNumber: phone,
				});
				setActiveCallRecordId(callRes.data.id);
				setCallStartTime(Date.now());
			} catch (callErr) {
				console.error("Erro ao registrar chamada:", callErr);
			}

			const url = `https://app.wavoip.com/call?token=${token}&phone=${phone}&name=${name}&start_if_ready=true&close_after_call=true`;
			setWavoipUrl(url);
			setWavoipModalOpen(true);
		} catch (err) {
			toast.error("Erro ao buscar dados para ligação.");
		}
	};

	const handleCloseWavoipModal = async () => {
		// Atualizar registro da chamada com duração
		if (activeCallRecordId && callStartTime) {
			const duration = Math.round((Date.now() - callStartTime) / 1000);
			try {
				await api.put(`/call-records/${activeCallRecordId}`, {
					status: duration > 3 ? "answered" : "missed",
					duration,
				});
			} catch (err) {
				console.error("Erro ao atualizar chamada:", err);
			}
		}
		setActiveCallRecordId(null);
		setCallStartTime(null);
		setWavoipModalOpen(false);
		setWavoipUrl("");
	};

	const handleOpenFaturaModal = async () => {
		if (!selectedTicket) {
			toast.error("Nenhum ticket selecionado.");
			return;
		}

		// **NOVO: Verificação por telefone**
		const hasClient = selectedTicket?.crmClient || selectedTicket?.contact?.crmClients?.[0];

		if (hasClient) {
			// Se já tem cliente vinculado, abre o modal
			setFaturaModalOpen(true);
			return;
		}

		// **NOVO: Buscar cliente por telefone**
		try {
			const contactPhone = selectedTicket?.contact?.number;
			if (!contactPhone) {
				// **CORREÇÃO: Abrir modal mesmo sem telefone para busca manual**
				setFaturaModalOpen(true);
				return;
			}

			// Limpar o telefone (remover caracteres especiais)
			const cleanPhone = contactPhone.replace(/\D/g, '');

			// Buscar em clientes, leads e contatos pelo telefone
			const { data: clients } = await api.get(`/clients`, {
				params: { searchParam: cleanPhone, phone: cleanPhone }
			});

			const { data: leads } = await api.get(`/leads`, {
				params: { searchParam: cleanPhone, phone: cleanPhone }
			});

			const { data: contacts } = await api.get(`/contacts`, {
				params: { searchParam: cleanPhone, phone: cleanPhone }
			});

			// Verificar se encontrou algum cliente/lead/contato com o mesmo telefone
			const foundClient = clients.find(c => c.phone && c.phone.replace(/\D/g, '') === cleanPhone);
			const foundLead = leads.find(l => l.phone && l.phone.replace(/\D/g, '') === cleanPhone);
			const foundContact = contacts.find(c => c.number && c.number.replace(/\D/g, '') === cleanPhone);

			if (foundClient) {
				// Vincular o cliente encontrado ao contato
				await api.put(`/contacts/${selectedTicket.contact.id}`, {
					crmClients: [foundClient.id]
				});

				// Atualizar o ticket selecionado com o cliente vinculado
				setSelectedTicket(prev => ({
					...prev,
					crmClient: foundClient,
					contact: {
						...prev.contact,
						crmClients: [foundClient]
					}
				}));

				toast.success(`Cliente "${foundClient.name}" encontrado e vinculado pelo telefone!`);
				setFaturaModalOpen(true);
				return;
			}

			if (foundLead) {
				toast.info(`Lead "${foundLead.name}" encontrado com mesmo telefone. Converta o lead para cliente primeiro.`);
				return;
			}

			if (foundContact) {
				toast.warning("Contato encontrado com mesmo telefone, mas sem cliente vinculado.");
				return;
			}

			// **CORREÇÃO: Abrir modal mesmo sem encontrar cliente para vinculação manual**
			setFaturaModalOpen(true);

		} catch (err) {
			// **CORREÇÃO: Abrir modal mesmo em caso de erro**
			setFaturaModalOpen(true);
		}
	};

	const renderTicketActionButtons = (buttonSize = 36, iconSize = 20) => {
		if (!selectedTicket) return null;

		const buttonBaseStyle = {
			width: buttonSize,
			height: buttonSize,
		};

		return (
			<>
				{selectedTicket.status === "pending" && (
					<>
						<IconButton
							size="small"
							onClick={async () => {
								try {
									const { data: acceptedTicket } = await api.put(`/tickets/${selectedTicket.id}`, {
										status: "open",
										userId: user?.id,
									});

									if (pendingTicketDeleteTimeoutRef.current) {
										clearTimeout(pendingTicketDeleteTimeoutRef.current);
										pendingTicketDeleteTimeoutRef.current = null;
									}

									// **NOVO: Atualização instantânea sem F5**
									setTickets(prevTickets => {
										const updatedTickets = prevTickets.map(ticket => {
											if (ticket.id === selectedTicket.id) {
												return {
													...ticket,
													...acceptedTicket,
													contact: acceptedTicket.contact || ticket.contact,
													queue: acceptedTicket.queue || ticket.queue,
													user: acceptedTicket.user || ticket.user,
													unreadMessages: 0,
													updatedAt: acceptedTicket.updatedAt || new Date().toISOString()
												};
											}
											return ticket;
										});

										// Reordena para colocar o ticket aceito no topo da aba "Atendendo"
										return updatedTickets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
									});

									// Atualiza o ticket selecionado
									const hydratedAcceptedTicket = {
										...selectedTicket,
										...acceptedTicket,
										contact: acceptedTicket.contact || selectedTicket.contact,
										queue: acceptedTicket.queue || selectedTicket.queue,
										user: acceptedTicket.user || selectedTicket.user,
										unreadMessages: 0
									};
									setSelectedTicket(hydratedAcceptedTicket);
									selectedTicketRef.current = hydratedAcceptedTicket;
									history.replace(`/atendimentos/${acceptedTicket.id}`);
									loadMessages(acceptedTicket.id);

									// Atualiza contadores
									loadUnreadCounts();

									// Muda para aba "Atendendo" pelo índice dinâmico do TAB_CONFIG
									const openTabIdx = TAB_CONFIG.findIndex(t => t.key === "open");
									if (openTabIdx !== -1 && tabIndex !== openTabIdx) {
										setTabIndex(openTabIdx);
									}

								} catch (err) {
								}
							}}
							style={{
								...buttonBaseStyle,
								backgroundColor: "#00a884",
								color: "#fff",
							}}
							title="Aceitar"
						>
							<CheckCircleIcon style={{ fontSize: iconSize }} />
						</IconButton>
						<IconButton
							size="small"
							onClick={async () => {
								const confirmIgnorar = await showConfirm({
									type: "warning",
									title: "Ignorar Ticket",
									message: "Deseja realmente ignorar este ticket?",
									confirmText: "Sim, ignorar",
									cancelText: "Cancelar",
								});
								if (confirmIgnorar) {
									try {
										await api.delete(`/tickets/${selectedTicket.id}`);
										setSelectedTicket(null);
										history.push("/atendimentos");
										loadTickets();
										loadUnreadCounts();
									} catch (err) {
									}
								}
							}}
							style={{
								...buttonBaseStyle,
								backgroundColor: "#f44336",
								color: "#fff",
							}}
							title="Ignorar"
						>
							<BlockIcon style={{ fontSize: iconSize }} />
						</IconButton>
					</>
				)}
				{canReturnClosedTicket && (
					<IconButton
						size="small"
						onClick={handleReturnTicket}
						style={{
							...buttonBaseStyle,
							backgroundColor: "#1976d2",
							color: "#fff",
						}}
						title="Retornar ticket"
					>
						<ReplayIcon style={{ fontSize: iconSize }} />
					</IconButton>
				)}
				{selectedTicket.status === "open" && (
					<>
						<IconButton
							size="small"
							onClick={handleOpenWavoipCall}
							style={{
								...buttonBaseStyle,
								backgroundColor: "#0872b9",
								color: "#fff",
							}}
							title="Iniciar chamada"
						>
							<CallIcon style={{ fontSize: iconSize }} />
						</IconButton>
						<IconButton
							size="small"
							onClick={handleOpenFaturaModal}
							style={{
								...buttonBaseStyle,
								backgroundColor: "#9c27b0",
								color: "#fff",
							}}
							title="Criar Fatura"
						>
							<ReceiptIcon style={{ fontSize: iconSize }} />
						</IconButton>
						<IconButton
							size="small"
							onClick={async () => {
								const confirmFechar = await showConfirm({
									type: "warning",
									title: "Fechar Ticket",
									message: "Deseja realmente fechar este ticket?",
									confirmText: "Sim, fechar",
									cancelText: "Cancelar",
								});
								if (confirmFechar) {
									try {
										await api.put(`/tickets/${selectedTicket.id}`, {
											status: "closed",
										});
										setSelectedTicket(null);
										history.push("/atendimentos");
										loadTickets();
										loadUnreadCounts();
									} catch (err) {
									}
								}
							}}
							style={{
								...buttonBaseStyle,
								backgroundColor: "#ff9800",
								color: "#fff",
							}}
							title="Fechar"
						>
							<CheckCircleIcon style={{ fontSize: iconSize }} />
						</IconButton>
						<IconButton
							size="small"
							onClick={async () => {
								const confirmExcluir = await showConfirm({
									type: "error",
									title: "Excluir Ticket",
									message: "Deseja realmente excluir este ticket?",
									confirmText: "Sim, excluir",
									cancelText: "Cancelar",
								});
								if (confirmExcluir) {
									try {
										await api.delete(`/tickets/${selectedTicket.id}`);
										setSelectedTicket(null);
										history.push("/atendimentos");
										loadTickets();
										loadUnreadCounts();
									} catch (err) {
									}
								}
							}}
							style={{
								...buttonBaseStyle,
								backgroundColor: "#f44336",
								color: "#fff",
							}}
							title="Excluir"
						>
							<DeleteIcon style={{ fontSize: iconSize }} />
						</IconButton>
						<IconButton
							size="small"
							onClick={handleOpenTransferModal}
							style={{
								...buttonBaseStyle,
								backgroundColor: "#437db5",
								color: "#fff",
							}}
							title="Transferir fila/atendente"
						>
							<SwapHorizIcon style={{ fontSize: iconSize }} />
						</IconButton>
						<IconButton
							size="small"
							onClick={() => setTagsKanbanModalOpen(true)}
							style={{
								...buttonBaseStyle,
								backgroundColor: "#00a884",
								color: "#fff",
							}}
							title="Tags e Kanban"
						>
							<AddIcon style={{ fontSize: iconSize }} />
						</IconButton>
					</>
				)}
			</>
		);
	};

	const formatWaitingTime = (ticket) => {
		if (!ticket || ticket.status !== "pending") {
			return null;
		}

		// Mostrar tempo de espera se tem usuário OU fila
		if (!hasAssignedUser(ticket) && !hasQueue(ticket)) {
			return null;
		}

		const referenceDate = ticket.updatedAt || ticket.createdAt;
		if (!referenceDate) return null;

		let parsedDate;
		try {
			parsedDate =
				typeof referenceDate === "string"
					? parseISO(referenceDate)
					: new Date(referenceDate);
		} catch (err) {
			return null;
		}

		return `Aguardando há ${formatDistanceToNow(parsedDate, {
			locale: ptBR,
			addSuffix: false
		})}`;
	};
	const handleCloseContactModal = () => {
		setContactModalOpen(false);
		setContactModalContact(null);
	};
	const handleOpenTransferModal = () => {
		if (!selectedTicket) return;
		setTransferTicketModalOpen(true);
	};

	const handleCloseTransferModal = async (ticketUpdated = false) => {
		setTransferTicketModalOpen(false);

		// Se o ticket foi atualizado (transferido), recarrega os dados
		if (ticketUpdated && selectedTicket) {
			try {
				const { data } = await api.get(`/tickets/${selectedTicket.id}`);
				setSelectedTicket(data);

				// Atualiza também na lista de tickets
				setTickets(prevTickets =>
					prevTickets.map(ticket =>
						ticket.id === data.id ? data : ticket
					)
				);

			} catch (err) {
			}
		}
	};


	useEffect(() => {
		const raf = requestAnimationFrame(() => {
			if (inputMessageRef.current) {
				inputMessageRef.current.focus({ preventScroll: true });
				keepInputFocusRef.current = true;
			}
		});
		return () => cancelAnimationFrame(raf);
	}, [messages, selectedTicket?.id]);

	const handleQuickReplyKeyDown = (e) => {
		if (!showQuickReplies) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setSelectedQuickIndex(prev => {
					const next = prev + 1;
					return next >= filteredQuickMessages.length ? 0 : next;
				});
				break;
			case 'ArrowUp':
				e.preventDefault();
				setSelectedQuickIndex(prev => {
					const prevIndex = prev - 1;
					return prevIndex < 0 ? filteredQuickMessages.length - 1 : prevIndex;
				});
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedQuickIndex >= 0 && filteredQuickMessages[selectedQuickIndex]) {
					handleSelectQuickReply(filteredQuickMessages[selectedQuickIndex].message);
				}
				break;
			case 'Escape':
				e.preventDefault();
				setShowQuickReplies(false);
				setFilteredQuickMessages([]);
				setSelectedQuickIndex(-1);
				break;
		}
	};

	// Solicitar permissão para notificações ao carregar
	useEffect(() => {
		if ("Notification" in window && Notification.permission === "default") {
			Notification.requestPermission().then(permission => {
				if (permission === "granted") {
				}
			});
		}
	}, []);

	// Solicitar permissão do microfone ao carregar a página
	useEffect(() => {
		const requestMicrophonePermission = async () => {
			try {
				if ("permissions" in navigator) {
					const permission = await navigator.permissions.query({ name: 'microphone' });

					if (permission.state === 'prompt') {
					}
				}
			} catch (err) {
			}
		};

		requestMicrophonePermission();
	}, []);

	// Função para tocar som de notificação
	const playNotificationSound = () => {
		try {
			if (!audioContextRef.current) {
				audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
			}

			const audioContext = audioContextRef.current;
			const oscillator = audioContext.createOscillator();
			const gainNode = audioContext.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(audioContext.destination);

			// Som similar ao WhatsApp: duas notas rápidas e mais alto
			oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
			oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);

			// Aumentar volume para 0.5 (50% do máximo)
			gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
			gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

			oscillator.start(audioContext.currentTime);
			oscillator.stop(audioContext.currentTime + 0.3);
		} catch (err) {
		}
	};

	// Função para exibir notificação de desktop
	const showDesktopNotification = (contactName, messageBody) => {
		if ("Notification" in window && Notification.permission === "granted") {
			try {

				// Limitar tamanho da mensagem para notificação
				const truncatedBody = messageBody?.length > 100
					? messageBody.substring(0, 100) + "..."
					: messageBody || "Mídia";

				const notification = new Notification(`🔔 Nova mensagem de ${contactName}`, {
					body: truncatedBody,
					icon: "/logo.png",
					badge: "/logo.png",
					tag: "whaticket-message",
					renotify: true,
					requireInteraction: false,
					silent: false, // Garante que o som do navegador também toque
					vibrate: [200, 100, 200] // Vibração em dispositivos móveis
				});

				// Foca na janela quando clicar na notificação
				notification.onclick = () => {
					window.focus();
					notification.close();
				};

				// Auto-fecha após 8 segundos (mais tempo para ler)
				setTimeout(() => notification.close(), 8000);

				// Feedback visual no console
			} catch (err) {
			}
		} else if ("Notification" in window && Notification.permission === "denied") {
		} else {
		}
	};

	const scrollToBottom = (force = false) => {
		if (messagesEndRef.current) {
			const container = messagesContainerRef.current;
			if (!container) return;

			// Se for forçado, rola agressivamente sem verificar posição
			if (force) {
				// Usar scrollIntoView com behavior "auto" para mais agressividade
				messagesEndRef.current.scrollIntoView({ behavior: "auto" });

				// Segunda tentativa: scroll direto do container
				setTimeout(() => {
					if (container && messagesEndRef.current) {
						container.scrollTop = container.scrollHeight;
					}
				}, 50);
			} else {
				// Comportamento normal/inteligente - REATIVADO (WhatsApp Web)
				const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 150;

				if (isAtBottom) {
					messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
				}
			}
		}
	};

	const isMessagesContainerAtBottom = (threshold = 150) => {
		const container = messagesContainerRef.current;
		if (!container) return true;

		return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
	};

	useEffect(() => {
		// COMPORTAMENTO WHATSAPP WEB - Mas não força quando está carregando mensagens antigas
		if (!loadingMore && messages.length > 0) {
			// Detectar se é uma mensagem enviada (última mensagem do usuário)
			const lastMessage = messages[messages.length - 1];
			const isMyMessage = lastMessage?.fromMe === true;

			// Verificar se o usuário está no final antes de forçar o scroll
			const container = messagesContainerRef.current;
			const isAtBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight <= 150) : false;

			// SÓ FORÇAR SE ESTIVER NO FINAL OU SE FOR MENSAGEM ENVIADA
			if (isMyMessage || isAtBottom) {
				setTimeout(() => {
					if (isMyMessage) {
						scrollToBottom(true); // força ao enviar

						// Reforço extra para garantir no final
						setTimeout(() => {
							scrollToBottom(true);
						}, 100);
					} else {
						scrollToBottom(false); // não força ao receber se não estiver no final
					}
				}, 50);
			}
		}
	}, [messages, loadingMore]);

	useEffect(() => {
		const container = messagesContainerRef.current;
		if (!container) return;

		const handleScroll = () => {
			if (container.scrollTop < 100 && hasMore && !loadingMore) {
				loadMoreMessages();
			}
		};

		container.addEventListener('scroll', handleScroll);
		return () => container.removeEventListener('scroll', handleScroll);
	}, [hasMore, loadingMore, pageNumber, selectedTicket]);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 350);
		return () => clearTimeout(handler);
	}, [searchTerm]);

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(Date.now());
		}, 60000);

		return () => clearInterval(interval);
	}, []);

	// REATIVADO - Scroll apenas ao selecionar ticket (abertura inicial)
	useEffect(() => {
		if (selectedTicket && messages.length > 0) {
			// Forçar scroll para o final apenas na abertura
			setTimeout(() => {
				scrollToBottom(true);
			}, 100);

			setTimeout(() => {
				scrollToBottom(true);
			}, 250);

			setTimeout(() => {
				scrollToBottom(true);
			}, 400);
		}
	}, [selectedTicket?.id]);

	useEffect(() => {
		loadTickets();
		loadUnreadCounts();
	}, [
		tabIndex,
		debouncedSearchTerm,
		selectedQueues,
		selectedUsers,
		selectedTags,
		selectedWhatsapps,
		messageDirectionFilter,
		selectedChannelsQuickFilter,
		showAllTickets
	]);

	useEffect(() => {
		if (isMobile) {
			setShowEmojiPicker(false);
		}
	}, [isMobile]);

	useEffect(() => {
		if (ticketId) {
			loadTicket(ticketId);
		} else {
			setSelectedTicket(null);
			setMessages([]);
		}
	}, [ticketId]);

	useEffect(() => {
		if (!ticketId) {
			history.replace('/atendimentos');
		}
	}, []);

	useEffect(() => {
		const loadQuickMessages = async () => {
			try {
				const { data } = await api.get("/quick-replies", {
					params: { pageNumber: 1, pageSize: 200 }
				});
				setQuickMessages(data.records || []);
			} catch (err) {
			}
		};
		loadQuickMessages();
	}, [user.companyId, user.id]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem("atendimentos.quickRepliesPanel", String(quickMessagesOpen));
	}, [quickMessagesOpen]);

	useEffect(() => {
		loadFiltersData();
	}, []);

	// Carregar configurações de automação e fila de atribuição
	useEffect(() => {
		const loadAutoCloseSettings = async () => {
			try {
				const { data } = await api.get("/companySettingOne", {
					params: { column: "hoursCloseTicketsAuto" }
				});
				const value = data?.hoursCloseTicketsAuto;
				if (value && value !== "9999999999") {
					const totalMinutes = Math.round(parseFloat(value) * 60);
					setAutoCloseEnabled(true);
					setAutoCloseHours(Math.floor(totalMinutes / 60));
					setAutoCloseMinutes(totalMinutes % 60);
				}
			} catch (err) {}
		};
		loadAutoCloseSettings();

		const loadAutoAcceptSettings = async () => {
			try {
				const [enabledRes, minutesRes] = await Promise.all([
					api.get("/companySettingOne", { params: { column: "autoAcceptTicketsEnabled" } }),
					api.get("/companySettingOne", { params: { column: "autoAcceptTicketsMinutes" } }),
				]);
				const enabled = enabledRes.data?.autoAcceptTicketsEnabled === "true";
				const mins = parseInt(minutesRes.data?.autoAcceptTicketsMinutes || "0", 10);
				if (enabled && mins > 0) {
					setAutoAcceptEnabled(true);
					setAutoAcceptHours(Math.floor(mins / 60));
					setAutoAcceptMinutes(mins % 60);
				}
			} catch (err) {}
		};
		loadAutoAcceptSettings();

		const assignKey = `assignQueue_${user.companyId}`;
		try {
			const saved = localStorage.getItem(assignKey);
			if (saved) {
				const config = JSON.parse(saved);
				setAssignQueueEnabled(!!config.enabled);
				setAssignQueueMode(config.mode || "round_robin");
				setAssignQueueBatchSize(config.batchSize || 10);
				setAssignQueueUserIds(config.userIds || []);
			}
		} catch {}
	}, [user.companyId]);

	// Manter refs sincronizados para uso no WebSocket (evita closure stale)
	const tabIndexRef = useRef(tabIndex);
	useEffect(() => {
		selectedTicketRef.current = selectedTicket;
		tabIndexRef.current = tabIndex;
	}, [selectedTicket, tabIndex]);

	const { isConnected, on, emit } = useSocket();

	useEffect(() => {
		if (!isConnected || !user.companyId) return;

		const companyId = user.companyId;

		const cleanupTicket = on(`company-${companyId}-ticket`, (data) => {
			if (data.action === "update" || data.action === "create") {
				// Verifica se o ticket pertence às filas do usuário
				const userQueueIds = user?.queues?.map(q => q.id) || [];
				const hasAllTicketPerm = user?.allTicket === "enable" || user?.allTicket === "enabled";
				const hasAllQueuesPerm = user?.allHistoric === "enabled";
				const hasAllUserChatPerm = user?.allUserChat === "enabled";
				const belongsToUserQueue = user?.profile === "admin" || hasAllQueuesPerm ||
					userQueueIds.includes(data.ticket?.queueId) ||
					(!data.ticket?.queueId && hasAllTicketPerm);

				// Verifica se o usuário pode ver o ticket
				let canSeeTicket = false;
				if (user?.profile === "admin") {
					canSeeTicket = true;
				} else if (data.ticket?.userId === user?.id) {
					// Ticket atribuído ao próprio usuário
					canSeeTicket = true;
				} else if (!data.ticket?.userId && !data.ticket?.queueId && data.ticket?.status === "pending") {
					// Ticket pending sem fila e sem usuário (ex-automação) — só admin vê
					canSeeTicket = user?.profile === "admin";
				} else if (!data.ticket?.userId && data.ticket?.queueId && data.ticket?.status === "pending") {
					// Ticket pending com fila mas sem usuário — visível se pertence à fila
					canSeeTicket = belongsToUserQueue;
				} else if (data.ticket?.userId && data.ticket?.userId !== user?.id) {
					// Ticket atribuído a outro usuário - só vê com permissão
					canSeeTicket = hasAllUserChatPerm;
				} else if (data.ticket?.status === "closed") {
					canSeeTicket = true;
				}

				const currentTab = tabIndexRef.current;
				const belongsToCurrentTab = ticketBelongsToTab(data.ticket, currentTab);

				// **NOVO: Só mostra notificação se pertencer à aba atual**
				const shouldNotify = belongsToCurrentTab && belongsToUserQueue && canSeeTicket;

				setTickets((prevTickets) => {
					const ticketIndex = prevTickets.findIndex(t => t.id === data.ticket.id);

					if (ticketIndex !== -1) {
						// Ticket já existe na lista - verificar se ainda pode ver
						if (!canSeeTicket || !belongsToCurrentTab) {
							// Usuário não tem mais permissão ou ticket mudou de aba - remover
							return prevTickets.filter(t => t.id !== data.ticket.id);
						}

						const updatedTickets = [...prevTickets];
						const oldTicket = updatedTickets[ticketIndex];
						updatedTickets[ticketIndex] = data.ticket;

						// Reordena se updatedAt mudou (nova mensagem) OU se status mudou (muda de aba)
						const shouldReorder = new Date(oldTicket.updatedAt).getTime() !== new Date(data.ticket.updatedAt).getTime() ||
							oldTicket.status !== data.ticket.status;

						if (shouldReorder) {
							const result = updatedTickets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

							// Forçar re-renderização criando novo array
							return [...result];
						}
						// Mesmo sem reordenar, verificar se status mudou
						if (oldTicket.status !== data.ticket.status) {
							// Forçar re-renderização criando novo array
							return [...updatedTickets];
						}

						// Forçar re-renderização mesmo sem mudanças significativas
						return [...updatedTickets];
					} else if (shouldNotify) {
						// **CORREÇÃO: Só adiciona se pertencer à aba atual**
						playNotificationSound();
						showDesktopNotification(
							data.ticket?.contact?.name || "Novo Ticket",
							"Você recebeu um novo ticket"
						);
						const result = [data.ticket, ...prevTickets].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
						return result;
					}
					return prevTickets;
				});

				// Atualiza contadores sem recriar componente inteiro
				setTimeout(() => {
					loadUnreadCounts();
				}, 100);
				if (selectedTicketRef.current && data.ticket.id === selectedTicketRef.current.id) {
					if (pendingTicketDeleteTimeoutRef.current) {
						clearTimeout(pendingTicketDeleteTimeoutRef.current);
						pendingTicketDeleteTimeoutRef.current = null;
					}
					// Preserva dados de relacionamento (contact, queue, user) que podem não vir
					// no payload do socket, evitando que a conversa abra como "Sem nome"
					setSelectedTicket(prev => ({
						...prev,
						...data.ticket,
						contact: data.ticket.contact || prev?.contact,
						queue: data.ticket.queue || prev?.queue,
						user: data.ticket.user || prev?.user
					}));
				}
			}
			if (data.action === "accept") {
				if (selectedTicketRef.current && data.ticket?.id === selectedTicketRef.current.id) {
					if (pendingTicketDeleteTimeoutRef.current) {
						clearTimeout(pendingTicketDeleteTimeoutRef.current);
						pendingTicketDeleteTimeoutRef.current = null;
					}
					setSelectedTicket(prev => ({
						...prev,
						...data.ticket,
						contact: data.ticket.contact || prev?.contact,
						queue: data.ticket.queue || prev?.queue,
						user: data.ticket.user || prev?.user,
						unreadMessages: 0
					}));
					history.replace(`/atendimentos/${data.ticket.id}`);
					loadMessages(data.ticket.id);
				}
			}
			if (data.action === "delete") {
				setTickets((prevTickets) => prevTickets.filter(t => t.id !== data.ticketId));
				loadUnreadCounts();
				if (selectedTicketRef.current && data.ticketId === selectedTicketRef.current.id) {
					if (pendingTicketDeleteTimeoutRef.current) {
						clearTimeout(pendingTicketDeleteTimeoutRef.current);
					}
					pendingTicketDeleteTimeoutRef.current = setTimeout(() => {
						const currentTicket = selectedTicketRef.current;
						if (currentTicket && data.ticketId === currentTicket.id && currentTicket.status === "pending") {
							setSelectedTicket(null);
							history.push("/atendimentos");
						}
						pendingTicketDeleteTimeoutRef.current = null;
					}, 900);
				}
			}
		});

		const cleanupAppMessage = on(`company-${companyId}-appMessage`, (data) => {
			if (data.action === "create") {
				// **NOVO: Verificar aba atual antes de notificar**
				const currentTab = tabIndexRef.current;

				setTickets((prevTickets) => {
					const ticketIndex = prevTickets.findIndex(t => t.id === data.message.ticketId);

					if (ticketIndex !== -1) {
						const updatedTickets = [...prevTickets];
						const ticket = { ...updatedTickets[ticketIndex] };

						ticket.lastMessage = data.message.body;
						ticket.updatedAt = data.message.createdAt;

						if (!data.message.fromMe) {
							ticket.unreadMessages = (ticket.unreadMessages || 0) + 1;

							const belongsToCurrentTab = ticketBelongsToTab(ticket, currentTab);

							if (belongsToCurrentTab) {
								if (!isAdAutomaticMessage(data.message, ticket.channel)) {
									playNotificationSound();
									showDesktopNotification(
										ticket.contact?.name || "Novo Contato",
										data.message.body
									);
								}
							}
						} else {
							// Não zerar badge em tickets pending (bot respondendo não deve marcar como lido)
							if (ticket.status !== "pending") {
								ticket.unreadMessages = 0;
							}
						}

						updatedTickets[ticketIndex] = ticket;

						const result = updatedTickets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
						return [...result];
					}
					else if (data.ticket) {
						const userQueueIds = user?.queues?.map(q => q.id) || [];
						const hasAllTicketPerm = user?.allTicket === "enable" || user?.allTicket === "enabled";
						const hasAllQueuesPerm = user?.allHistoric === "enabled";
						const hasAllUserChatPerm = user?.allUserChat === "enabled";
						const belongsToUserQueue = user?.profile === "admin" || hasAllQueuesPerm ||
							userQueueIds.includes(data.ticket?.queueId) ||
							(!data.ticket?.queueId && hasAllTicketPerm);

						let canSeeTicket = false;
						if (user?.profile === "admin") canSeeTicket = true;
						else if (data.ticket?.userId === user?.id) canSeeTicket = true;
						else if (!data.ticket?.userId && data.ticket?.status === "pending") canSeeTicket = belongsToUserQueue;
						else if (data.ticket?.userId && data.ticket?.userId !== user?.id) canSeeTicket = hasAllUserChatPerm;
						else if (data.ticket?.status === "closed") canSeeTicket = true;

						const belongsToCurrentTab = ticketBelongsToTab(data.ticket, currentTab);
						if (belongsToUserQueue && canSeeTicket && belongsToCurrentTab) {
							if (['facebook', 'instagram'].includes(data.ticket.channel)) {
								if (!isAdAutomaticMessage(data.message, data.ticket.channel)) {
									createLeadFromAd(data.ticket);
								}
							}

							const result = [data.ticket, ...prevTickets].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
							return result;
						}
					}

					return prevTickets;
				});

				setTimeout(() => {
					loadUnreadCounts();
				}, 100);

				const currentTicket = selectedTicketRef.current;
				if (currentTicket && data.message.ticketId === currentTicket.id) {
					const shouldAutoScroll = data.message.fromMe || isMessagesContainerAtBottom();

					setMessages((prev) => {
						if (prev.some(message => message.id === data.message.id || (data.message.wid && message.wid === data.message.wid))) {
							return prev.map(message =>
								message.id === data.message.id || (data.message.wid && message.wid === data.message.wid)
									? { ...message, ...data.message, isOptimistic: false, sendError: false }
									: message
							);
						}

						const optimisticIndex = prev.findIndex(message =>
							message.isOptimistic &&
							message.ticketId === data.message.ticketId &&
							message.fromMe === data.message.fromMe &&
							message.body === data.message.body
						);

						if (optimisticIndex !== -1) {
							const updatedMessages = [...prev];
							updatedMessages[optimisticIndex] = {
								...updatedMessages[optimisticIndex],
								...data.message,
								isOptimistic: false,
								sendError: false
							};
							return updatedMessages;
						}

						return [...prev, data.message];
					});

					if (shouldAutoScroll) {
						setTimeout(() => scrollToBottom(true), 50);
					}
				}
			}

			if (data.action === "update") {
				const currentTicket = selectedTicketRef.current;
				if (currentTicket && data.message.ticketId === currentTicket.id) {
					setMessages((prev) =>
						prev.map((msg) =>
							msg.id === data.message.id
								? { ...msg, ...data.message }
								: msg
						)
					);
				}
			}
		});

		const cleanupTyping = on(`company-${companyId}-typing`, (data) => {
			const currentTicket = selectedTicketRef.current;
			if (currentTicket && data.ticketId === currentTicket.id) {
				setIsTyping(data.isTyping);
				setTypingUser(data.user);

				if (data.isTyping) {
					setTimeout(() => {
						setIsTyping(false);
						setTypingUser(null);
					}, 3000);
				}
			}
		});

		const cleanupContact = on(`company-${companyId}-contact`, (data) => {
			if (data.action === "update") {
				const currentTicket = selectedTicketRef.current;

				if (currentTicket && currentTicket.contact?.id === data.contact.id) {
					setSelectedTicket(prev => ({
						...prev,
						contact: data.contact
					}));
				}

				setTickets(prevTickets =>
					prevTickets.map(ticket =>
						ticket.contact?.id === data.contact.id
							? { ...ticket, contact: data.contact }
							: ticket
					)
				);
			}
		});

		return () => {
			if (pendingTicketDeleteTimeoutRef.current) {
				clearTimeout(pendingTicketDeleteTimeoutRef.current);
				pendingTicketDeleteTimeoutRef.current = null;
			}
			cleanupTicket();
			cleanupAppMessage();
			cleanupTyping();
			cleanupContact();
		};
	}, [isConnected, user.companyId, on]);

	const hasAssignedUser = (ticket) =>
		Boolean(ticket?.userId || ticket?.user?.id);
	const hasQueue = (ticket) =>
		Boolean(ticket?.queueId || ticket?.queue?.id);
	// TAB_CONFIG dinâmico baseado no perfil do usuário
	const TAB_CONFIG = React.useMemo(() => {
		const tabs = [];

		// Aba Aguardando — inclui todos os pending privados (com ou sem fila/usuário)
		tabs.push({ key: "pending", status: "pending", filter: (ticket) => ticket.status === "pending" && isPrivateConversation(ticket) });

		// Aba Atendendo
		tabs.push({ key: "open", status: "open", filter: (ticket) => ticket.status === "open" && isPrivateConversation(ticket) });

		// Aba Grupos - apenas para quem tem permissão
		if (user?.profile === "admin" || user?.allowGroup === true) {
			tabs.push({ key: "groups", status: "group", filter: (ticket) => isGroupConversation(ticket) });
		}

		// Aba Finalizados (acessível via botão)
		tabs.push({ key: "closed", status: "closed", filter: (ticket) => ticket.status === "closed" && isPrivateConversation(ticket) });

		return tabs;
	}, [user?.profile, user?.allowGroup]);

	const buildFilterParams = useCallback(() => {
		// Permissões do usuário
		const isAdmin = user?.profile === "admin";
		const canViewAllTickets = isAdmin || user?.allUserChat === "enabled" || user?.allTicket === "enabled";

		const userQueueIds = user?.queues?.map(queue => queue.id).filter(Boolean) || [];
		const queueFilter = selectedQueues.length > 0 ? selectedQueues : userQueueIds;
		const params = {
			searchParam: debouncedSearchTerm
		};

		// Só mostra todos os tickets se tiver permissão E o toggle estiver ativo
		if (canViewAllTickets && showAllTickets) {
			params.showAll = "true";
		}

		// Se o usuário não pode ver todos, sempre restringe pelas próprias filas.
		const shouldRestrictToUserQueues = !canViewAllTickets || !showAllTickets;

		// Filtro de filas - se não pode ver todos, usa as filas do usuário
		if (shouldRestrictToUserQueues && queueFilter.length > 0) {
			params.queueIds = JSON.stringify(queueFilter);
		} else if (selectedQueues.length > 0) {
			params.queueIds = JSON.stringify(selectedQueues);
		}

		if (selectedUsers.length > 0) {
			params.users = JSON.stringify(selectedUsers);
		}
		if (selectedTags.length > 0) {
			params.tags = JSON.stringify(selectedTags);
		}
		if (selectedWhatsapps.length > 0) {
			params.whatsappIds = JSON.stringify(selectedWhatsapps);
		}

		return params;
	}, [user, debouncedSearchTerm, selectedQueues, selectedUsers, selectedTags, selectedWhatsapps, showAllTickets]);

	const applyClientFilters = useCallback((tickets = []) => {
		let filteredTickets = tickets;

		if (onlyUnread) {
			filteredTickets = filteredTickets.filter(ticket => (ticket.unreadMessages || 0) > 0);
		}

		if (selectedChannelsQuickFilter.length > 0) {
			filteredTickets = filteredTickets.filter(ticket =>
				ticket.channel && selectedChannelsQuickFilter.includes(ticket.channel)
			);
		}

		if (messageDirectionFilter === 'waiting_customer') {
			filteredTickets = filteredTickets.filter(ticket => ticket.lastMessageFromMe === true);
		} else if (messageDirectionFilter === 'waiting_agent') {
			filteredTickets = filteredTickets.filter(ticket => ticket.lastMessageFromMe === false);
		}

		return filteredTickets;
	}, [onlyUnread, selectedChannelsQuickFilter, messageDirectionFilter]);

	const ticketBelongsToTab = useCallback((ticket, tabIdx) => {
		const currentTab = TAB_CONFIG[tabIdx] || TAB_CONFIG[0];
		if (!currentTab) return false;
		if (typeof currentTab.filter === "function") {
			return currentTab.filter(ticket);
		}
		return true;
	}, [TAB_CONFIG]);

	const currentBulkCloseConfig = React.useMemo(() => {
		const currentTab = TAB_CONFIG[tabIndex] || TAB_CONFIG[0];
		const labelsByKey = {
			pending: "aguardando",
			open: "atendimento"
		};
		const canBulkClose = ["pending", "open"].includes(currentTab?.key);

		return {
			tabKey: currentTab?.key || "open",
			status: currentTab?.status || "open",
			label: labelsByKey[currentTab?.key] || "atendimento",
			canBulkClose: canBulkClose && tickets.length > 0
		};
	}, [TAB_CONFIG, tabIndex, tickets.length]);

	const loadTickets = useCallback(async () => {
		try {
			const currentTab = TAB_CONFIG[tabIndex] || TAB_CONFIG[0];
			const status = currentTab.status || "pending";
			const params = {
				...buildFilterParams(),
				status
			};

			const data = await fetchTicketsApi({ params });
			if (!data) return;

			let filteredTickets = applyClientFilters(data.tickets || []);

			if (currentTab?.filter) {
				filteredTickets = filteredTickets.filter(currentTab.filter);
			}

			setTickets(filteredTickets);
		} catch (err) {
		}
	}, [tabIndex, buildFilterParams, applyClientFilters, TAB_CONFIG, fetchTicketsApi]);

	const loadTicket = async (id) => {
		// Nao busca ticket sem identificador valido (evita /tickets/undefined -> 400/erro)
		if (!id || id === "undefined" || id === "null") {
			return;
		}
		const requestId = ++ticketRequestRef.current;
		try {
			const { data } = await api.get(`/tickets/${id}`);
			if (requestId !== ticketRequestRef.current) return;
			setSelectedTicket(data);
			loadMessages(id);
		} catch (err) {
		}
	};

	const loadMessages = async (ticketId) => {
		// Nao busca mensagens sem um identificador valido (evita /messages/undefined -> 500)
		if (!ticketId || ticketId === "undefined" || ticketId === "null") {
			return;
		}
		const requestId = ++messagesRequestRef.current;
		try {
			const { data } = await api.get(`/messages/${ticketId}`, {
				params: { pageNumber: 1 }
			});

			if (requestId !== messagesRequestRef.current) return;
			setMessages(data.messages);
			setHasMore(data.hasMore);
			setPageNumber(1);

			// Forçar scroll para o final no carregamento
			setTimeout(() => {
				scrollToBottom(true);
			}, 100);

			setTimeout(() => {
				scrollToBottom(true);
			}, 300);

			setTimeout(() => {
				scrollToBottom(true);
			}, 500);
		} catch (err) {
		}
	};

	const loadMoreMessages = async () => {
		if (!selectedTicket || !selectedTicket.id || loadingMore || !hasMore) return;

		setLoadingMore(true);
		const nextPage = pageNumber + 1;

		try {
			const { data } = await api.get(`/messages/${selectedTicket.id}`, {
				params: { pageNumber: nextPage }
			});

			const container = messagesContainerRef.current;
			const scrollHeightBefore = container.scrollHeight;
			const scrollTopBefore = container.scrollTop;

			setMessages(prev => [...data.messages, ...prev]);
			setPageNumber(nextPage);
			setHasMore(data.hasMore);

			// CORREÇÃO MELHORADA: Mantém a posição exata do usuário
			setTimeout(() => {
				if (container) {
					const scrollHeightAfter = container.scrollHeight;
					const heightDifference = scrollHeightAfter - scrollHeightBefore;
					// Ajusta o scrollTop para compensar o aumento de altura
					container.scrollTop = scrollTopBefore + heightDifference;
				}
			}, 50);
		} catch (err) {
		} finally {
			setLoadingMore(false);
		}
	};

	const handleTicketClick = async (ticket) => {
		if (selectedTicketRef.current?.id === ticket.id) {
			return;
		}
		setSelectedTicket(ticket);
		selectedTicketRef.current = ticket;
		setMessages([]);
		setHasMore(false);
		setPageNumber(1);
		history.push(`/atendimentos/${ticket.id}`);
		if (isMobile) {
			setMobileView("chat");
		}

		// Só limpa mensagens não lidas ao clicar se o ticket já foi aceito (open/group)
		// Para tickets pending, a limpeza só ocorre ao aceitar o atendimento
		if (ticket.unreadMessages > 0 && ticket.status !== "pending") {
			try {
				await api.put(`/tickets/${ticket.id}`, {
					unreadMessages: 0,
				});

				setTickets((prevTickets) => {
					const updatedTickets = prevTickets.map(t =>
						t.id === ticket.id ? { ...t, unreadMessages: 0 } : t
					);
					return updatedTickets;
				});

				loadUnreadCounts();
			} catch (err) {
			}
		}
	};

	const handleBulkDelete = async () => {
		const ids = Array.from(selectedTicketIds);
		if (ids.length === 0) return;
		try {
			await Promise.all(ids.map(id => api.delete(`/tickets/${id}`)));
			setSelectedTicketIds(new Set());
			setSelectionMode(false);
			if (selectedTicket && ids.includes(selectedTicket.id)) {
				setSelectedTicket(null);
				setMessages([]);
			}
			loadTickets();
			toast.success(`${ids.length} conversa(s) excluída(s)`);
		} catch (err) {
			toast.error("Erro ao excluir conversas. Atualizando lista.");
			// Limpa seleção e recarrega em qualquer caso de erro
			// (incluindo falha parcial no Promise.all)
			setSelectedTicketIds(new Set());
			setSelectionMode(false);
			loadTickets();
		}
	};

	const handleSaveAutoClose = async () => {
		if (autoCloseEnabled) {
			const totalMinutes = autoCloseHours * 60 + autoCloseMinutes;
			if (totalMinutes < 1) {
				toast.error("Configure pelo menos 1 minuto para o encerramento automático.");
				return;
			}
		}
		setAutoCloseSaving(true);
		try {
			const totalHours = autoCloseEnabled
				? String((autoCloseHours * 60 + autoCloseMinutes) / 60)
				: "9999999999";
			await api.put("/companySettings/", {
				column: "hoursCloseTicketsAuto",
				data: totalHours
			});
			toast.success("Encerramento automático salvo");
			setAutoCloseOpen(false);
		} catch (err) {
			toast.error("Erro ao salvar configuração");
		} finally {
			setAutoCloseSaving(false);
		}
	};

	const handleSaveAssignQueue = () => {
		setAssignQueueSaving(true);
		try {
			const config = {
				enabled: assignQueueEnabled,
				mode: assignQueueMode,
				batchSize: assignQueueBatchSize,
				userIds: assignQueueUserIds,
			};
			localStorage.setItem(`assignQueue_${user.companyId}`, JSON.stringify(config));
			toast.success("Fila de atribuição salva");
			setAssignQueueOpen(false);
		} catch (err) {
			toast.error("Erro ao salvar fila de atribuição");
		} finally {
			setAssignQueueSaving(false);
		}
	};

	const handleSaveAutoAccept = async () => {
		if (autoAcceptEnabled) {
			const totalMinutes = autoAcceptHours * 60 + autoAcceptMinutes;
			if (totalMinutes < 1) {
				toast.error("Configure pelo menos 1 minuto para o aceite automático.");
				return;
			}
		}
		setAutoAcceptSaving(true);
		try {
			const totalMinutes = autoAcceptEnabled
				? String(autoAcceptHours * 60 + autoAcceptMinutes)
				: "0";
			await Promise.all([
				api.put("/companySettings/", {
					column: "autoAcceptTicketsEnabled",
					data: autoAcceptEnabled ? "true" : "false",
				}),
				api.put("/companySettings/", {
					column: "autoAcceptTicketsMinutes",
					data: totalMinutes,
				}),
			]);
			toast.success("Aceite automático salvo");
			setAutoAcceptOpen(false);
		} catch (err) {
			toast.error("Erro ao salvar configuração");
		} finally {
			setAutoAcceptSaving(false);
		}
	};

	const handleSendMessage = useCallback(async () => {
		const rawMessage = inputMessage.trim();
		if (!rawMessage || !selectedTicket) return;
		if (selectedTicket.status === "pending") return;

		const ticketSnapshot = selectedTicket;
		const replyingToSnapshot = replyingTo;
		const privateMessageSnapshot = privateMessage;
		const sendKey = `${ticketSnapshot.id}:${rawMessage}:${replyingToSnapshot?.id || ""}:${privateMessageSnapshot}`;
		let optimisticId = null;

		if (pendingTextSendsRef.current.has(sendKey)) return;
		pendingTextSendsRef.current.add(sendKey);

		try {
			const senderLabel = privateMessageSnapshot
				? `${user.name} - Mensagem Privada`
				: user.name;
			const shouldPrefixAuthor = signMessage || privateMessageSnapshot;
			const messageBody = shouldPrefixAuthor
				? `*${senderLabel}:*\n${rawMessage}`
				: rawMessage;

			// Resolve {{variables}} before optimistic render so the body matches
			// what the backend will echo via socket (avoiding duplicate bubbles).
			const resolvedBody = resolveMessageVariables(messageBody, ticketSnapshot);

			const payload = {
				body: resolvedBody,
				isPrivate: privateMessageSnapshot ? "true" : "false"
			};

			// Envia apenas o ID da mensagem citada se existir
			if (replyingToSnapshot) {
				payload.quotedMsg = { id: replyingToSnapshot.id };
			}

			optimisticId = `optimistic-${Date.now()}-${optimisticMessageCounterRef.current++}`;
			const now = new Date().toISOString();
			const optimisticMessage = {
				id: optimisticId,
				wid: optimisticId,
				ticketId: ticketSnapshot.id,
				body: resolvedBody,
				fromMe: true,
				fromAgent: false,
				ack: 0,
				mediaType: "conversation",
				isPrivate: privateMessageSnapshot,
				isOptimistic: true,
				createdAt: now,
				updatedAt: now,
				user: { name: user.name },
				quotedMsg: replyingToSnapshot || null
			};

			setInputMessage("");
			setReplyingTo(null);
			setPrivateMessage(false);
			setMessages(prev => [...prev, optimisticMessage]);

			const { data } = await api.post(`/messages/${ticketSnapshot.id}`, payload);
			const confirmedMessage = data?.message || data;

			if (confirmedMessage?.id) {
				setMessages(prev =>
					prev.map(message =>
						message.id === optimisticId
							? { ...message, ...confirmedMessage, isOptimistic: false, sendError: false }
							: message
					)
				);
			}
		} catch (err) {
			setMessages(prev =>
				prev.map(message =>
					message.id === optimisticId
						? { ...message, ack: -1, sendError: true }
						: message
				)
			);
			setInputMessage(current => current || rawMessage);
			setReplyingTo(replyingToSnapshot);
			setPrivateMessage(privateMessageSnapshot);
			toast.error("Nao foi possivel enviar a mensagem. Tente novamente.");
		} finally {
			pendingTextSendsRef.current.delete(sendKey);
		}
	}, [inputMessage, selectedTicket, signMessage, user.name, replyingTo, privateMessage]);

	const handleKeyPress = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const openMediaPreview = useCallback((files, initialCaption = "") => {
		if (!files || files.length === 0 || !selectedTicket) return false;

		if (files.length === 1) {
			setSelectedFile(files[0]);
			setSelectedFiles([]);
		} else {
			setSelectedFiles(files);
			setSelectedFile(null);
		}
		setMediaPreviewCaption(initialCaption || "");
		setMediaPreviewOpen(true);
		return true;
	}, [selectedTicket]);

	const handleFileUpload = (e) => {
		const files = Array.from(e.target.files);
		const opened = openMediaPreview(files);
		if (opened) {
			e.target.value = "";
		}
	};

	const handleTogglePrivateMessage = () => {
		setPrivateMessage(prev => !prev);
	};

	const handleOpenChatToolsMenu = (event) => {
		setChatToolsAnchorEl(event.currentTarget);
	};

	const handleCloseChatToolsMenu = () => {
		setChatToolsAnchorEl(null);
	};

	const handleOpenImageVideoPicker = () => {
		handleCloseChatToolsMenu();
		fileInputRef.current?.click();
	};

	const handleOpenDocumentPicker = () => {
		handleCloseChatToolsMenu();
		documentInputRef.current?.click();
	};

	const handleOpenMediaDrive = () => {
		handleCloseChatToolsMenu();
		setMediaDriveOpen(true);
	};

	const handleOpenCameraModal = () => {
		handleCloseChatToolsMenu();
		setCameraModalOpen(true);
	};

	const handleOpenContactSendModal = () => {
		handleCloseChatToolsMenu();
		setSendContactModalOpen(true);
	};

	const handleOpenButtonModal = () => {
		handleCloseChatToolsMenu();
		setButtonModalOpen(true);
	};

	const handlePrepareMeetLink = () => {
		if (!selectedTicket) return;
		handleCloseChatToolsMenu();
		setInputMessage(`https://meet.jit.si/${selectedTicket.id}`);
	};

	const handleCameraCapture = (blob) => {
		if (!blob) return;
		const file = new File([blob], `${Date.now()}.png`, {
			type: blob.type || "image/png",
		});
		openMediaPreview([file]);
	};

	const handleSelectFromMediaDrive = (media) => {
		if (!media?.file) return;
		openMediaPreview([media.file]);
	};

	const handleSendContactMessage = async (contact) => {
		if (!contact || !selectedTicket) return;

		try {
			await api.post(`/messages/${selectedTicket.id}`, {
				read: 1,
				fromMe: true,
				mediaUrl: "",
				body: null,
				quotedMsg: replyingTo ? { id: replyingTo.id } : undefined,
				isPrivate: privateMessage ? "true" : "false",
				vCard: contact,
			});
			setReplyingTo(null);
			setPrivateMessage(false);
		} catch (err) {
			toast.error("Erro ao enviar contato.");
		}
	};

	const handleCloseContactSendModal = async (contact) => {
		setSendContactModalOpen(false);
		if (contact) {
			await handleSendContactMessage(contact);
		}
	};

	const handleSendMedia = async (payload) => {
		try {
			if (!payload || !selectedTicket) return;

			// Extrai arquivos e legenda do payload
			const filesToSend = Array.isArray(payload.files) ? payload.files : [payload.files];
			const caption = payload.caption || "";

			// **SOLUÇÃO: Não criar mensagem de legenda separada**
			// Deixa o backend salvar a legenda no body da mensagem de mídia
			const tempMediaMessages = filesToSend.map((file, index) => ({
				id: `temp-media-${Date.now()}-${index}`,
				mediaUrl: URL.createObjectURL(file),
				mediaType: file.type.startsWith("image")
					? "image"
					: file.type.startsWith("video")
						? "video"
						: file.type.startsWith("audio")
							? "audio"
							: "file",
				body: caption, // **IMPORTANTE: Coloca a legenda no body da mensagem de mídia**
				fromMe: true,
				createdAt: new Date().toISOString(),
				loading: true
			}));

			// Optimistic UI update - adiciona apenas a mensagem de mídia (com legenda no body)
			setMessages(prev => [...prev, ...tempMediaMessages]);

			// **VERDADE: Backend espera formData simples**
			const formData = new FormData();
			formData.append("fromMe", true);
			formData.append("isPrivate", privateMessage ? "true" : "false");

			// Para cada arquivo, adiciona mídia e legenda
			filesToSend.forEach(file => {
				formData.append("medias", file);
				formData.append("body", caption); // Backend usa 'body' para legenda
			});

			if (replyingTo) {
				formData.append("quotedMsg", JSON.stringify({ id: replyingTo.id }));
			}

			await api.post(`/messages/${selectedTicket.id}`, formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			// Remove mensagens temporárias
			setMessages(prev => prev.filter(msg => !msg.id?.toString().startsWith("temp-")));
		} catch (err) {
			// Remove temporary messages on error
			setMessages(prev => prev.filter(msg => !msg.id?.toString().startsWith("temp-")));
		} finally {
			setMediaPreviewOpen(false);
			setSelectedFile(null);
			setSelectedFiles([]);
			setMediaPreviewCaption("");
			setReplyingTo(null);
			setPrivateMessage(false);
		}
	};

	const handleStartRecording = async () => {
		setLoadingRecording(true);
		try {
			await navigator.mediaDevices.getUserMedia({ audio: true });
			await Mp3Recorder.start();
			setRecording(true);
			setRecordingTime(0);

			const interval = setInterval(() => {
				setRecordingTime(prev => prev + 1);
			}, 1000);
			setRecordingInterval(interval);

			setLoadingRecording(false);
		} catch (err) {
			if (err?.name === "NotAllowedError" || /Permission denied/i.test(err?.message || "")) {
				toast.error("Microfone bloqueado no navegador. Clique no cadeado ao lado da URL e permita o uso do microfone.");
			} else {
				toast.error("Erro ao acessar o microfone. Verifique as permissões.");
			}

			setRecording(false);
			setLoadingRecording(false);
		}
	};

	const handleStopRecording = async () => {
		setLoadingRecording(true);
		try {
			const [, blob] = await Mp3Recorder.stop().getMp3();
			if (blob.size < 10000) {
				setLoadingRecording(false);
				setRecording(false);
				toast.error("Gravação muito curta. Grave por mais tempo.");
				return;
			}

			const formData = new FormData();
			const filename = `${new Date().getTime()}.mp3`;
			formData.append("medias", blob, filename);
			formData.append("body", filename);
			formData.append("fromMe", true);
			formData.append("isPrivate", privateMessage ? "true" : "false");

			const tempMessage = {
				id: `temp-audio-${Date.now()}`,
				mediaUrl: URL.createObjectURL(blob),
				mediaType: "audio",
				fromMe: true,
				body: "",
				createdAt: new Date().toISOString(),
				loading: true
			};

			setMessages(prev => [...prev, tempMessage]);

			try {
				await api.post(`/messages/${selectedTicket.id}`, formData, {
					headers: {
						"Content-Type": "multipart/form-data",
					},
				});
				setMessages(prev => prev.filter(msg => !msg.id?.toString().startsWith("temp-")));
			} catch (err) {
				toast.error("Erro ao enviar áudio. Tente novamente.");
				setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
			}
		} catch (err) {
			toast.error("Erro ao processar áudio.");
		} finally {
			setLoadingRecording(false);
			setRecording(false);
			if (recordingInterval) {
				clearInterval(recordingInterval);
				setRecordingInterval(null);
			}
			setRecordingTime(0);
			setPrivateMessage(false);
		}
	};

	const handleCancelRecording = async () => {
		try {
			await Mp3Recorder.stop().getMp3();
			setRecording(false);
		} catch (err) {
			toast.error("Erro ao cancelar gravação.");
		} finally {
			if (recordingInterval) {
				clearInterval(recordingInterval);
				setRecordingInterval(null);
			}
			setRecordingTime(0);
			setLoadingRecording(false);
		}
	};

	const handleEmojiSelect = (emoji) => {
		setInputMessage((prev) => prev + emoji);
		setShowEmojiPicker(false);
	};

	const handlePaste = useCallback(async (event) => {
		if (!event.clipboardData || !selectedTicket) return;

		const items = event.clipboardData.items;
		const imageItems = [];

		for (let i = 0; i < items.length; i += 1) {
			const item = items[i];
			if (item.kind === "file") {
				const file = item.getAsFile();
				if (file && file.type.startsWith("image/")) {
					imageItems.push(file);
				}
			}
		}

		if (imageItems.length > 0) {
			event.preventDefault();
			const files = imageItems;
			const opened = openMediaPreview(files);
			if (!opened) {
				await handleSendMedia(files);
			}
		}
	}, [selectedTicket, handleSendMedia, openMediaPreview]);

	useEffect(() => {
		setPrivateMessage(false);
		setChatToolsAnchorEl(null);
	}, [selectedTicket?.id]);

	const handleBackToList = () => {
		if (isMobile) {
			setMobileView("list");
			history.push("/atendimentos");
			return;
		}

		history.push("/atendimentos");
	};

	const getBubbleBackgroundColor = (message) => {
		if (message?.isPrivate) return "#F0E68C";
		return message?.fromMe ? "#d9fdd3" : "#ffffff";
	};

	const getQuotedBackgroundColor = (message) => {
		if (message?.isPrivate) return "rgba(181, 148, 16, 0.18)";
		return "rgba(0,0,0,0.05)";
	};

	const getQuotedBorderColor = (message) => {
		if (message?.isPrivate) return "#b7791f";
		return "#00a884";
	};

	// **NOVO: Componente para texto de anúncios com "ler mais"**
	const AdMessageText = ({ text, isBase64, hasMedia }) => {
		const [expanded, setExpanded] = useState(false);

		// Para anúncios base64, verifica se o texto é longo
		// Para legendas normais (não-base64), não truncar
		const shouldTruncate = isBase64 && text.length > 40;
		const displayText = shouldTruncate && !expanded
			? text.substring(0, 40) + "..."
			: text;

		return (
			<>
				<Typography
					className={classes.messageText}
					style={{ marginTop: hasMedia ? "8px" : "0" }}
					dangerouslySetInnerHTML={{ __html: formatWhatsAppText(displayText) }}
				/>
				{shouldTruncate && (
					<Typography
						style={{
							color: "#00a884",
							cursor: "pointer",
							fontSize: "0.875em",
							marginTop: "4px",
							fontWeight: 500
						}}
						onClick={() => setExpanded(!expanded)}
					>
						{expanded ? "Mostrar menos" : "Ler mais"}
					</Typography>
				)}
			</>
		);
	};

	// FUNÇÃO NOVA - Renderiza o conteúdo completo da mensagem (mídia ou texto)
	// Backend salva legenda no campo 'body' junto com a mídia
	const renderMessageContent = (message) => {
		const hasMedia = Boolean(message.mediaUrl);
		const hasStructuredPreview = hasStructuredMessagePreview(message);
		const isBase64 = message.body && message.body.startsWith("data:image/");

		// **VERDADE: Backend salva legenda no 'body' quando tem mídia**
		let messageText = message.body || "";

		// **NOVO: Extrai texto de mensagens base64 (anúncios Facebook/Instagram)**
		if (isBase64 && messageText.includes(" | ")) {
			// Formato: data:image/png;base64,... | https://fb.me/... | Título do anúncio | Descrição
			const parts = messageText.split(" | ");
			if (parts.length >= 4) {
				// Pega apenas o título e descrição (ignora base64 e URL)
				messageText = parts.slice(2).join(" | "); // Título | Descrição
			}
		}

		return (
			<>
				{/* Renderiza a mídia se tiver */}
				{(hasMedia || hasStructuredPreview) && renderMessageMedia(message)}

				{/* **SOLUÇÃO: Se tem mídia, mostra o body como legenda** */}
				{hasMedia && message.body && message.body.trim() && (
					<div style={{ marginTop: "8px" }}>
						<AdMessageText
							text={message.body}
							isBase64={false}
							hasMedia={false}
						/>
					</div>
				)}

				{/* Renderiza o texto normal (apenas se não tiver mídia) */}
				{!hasMedia && !hasStructuredPreview && (
					<>
						{(() => {
							// Condição para exibir texto:
							const shouldShowText = (
								// Mensagem de texto normal (sem mídia)
								(!isBase64 && messageText &&
									!["audio", "reactionMessage", "locationMessage", "contactMessage"].includes(message.mediaType)
								) ||
								// **NOVO: Base64 (anúncios Facebook/Instagram) - extrai e exibe o texto**
								(isBase64 && messageText && messageText.includes(" | "))
							);

							return shouldShowText && messageText && (
								<AdMessageText
									text={messageText}
									isBase64={isBase64}
									hasMedia={hasMedia}
								/>
							);
						})()}
					</>
				)}
			</>
		);
	};

	const getJidDisplayNumber = (jid) => {
		if (!jid) return "";
		const base = String(jid).split("@")[0];
		const digits = base.replace(/\D/g, "");
		return digits || base;
	};

	const getContactDisplayLabel = (contact, fallback = "") => {
		const name = contact?.name?.trim?.();
		if (name) return name;
		const number = contact?.number?.trim?.();
		if (number) return number;
		return fallback;
	};

	const getMessageSenderLabel = (message, fallbackContact = selectedTicket?.contact) => {
		if (!message) return "";
		if (message.fromMe) {
			return message.fromAgent ? "Automação" : (message.user?.name || user.name);
		}

		return getContactDisplayLabel(
			message.contact,
			getJidDisplayNumber(message.participant) || getContactDisplayLabel(fallbackContact, "Contato")
		);
	};

	const getTicketLastMessageSenderLabel = (ticket) => {
		if (!ticket || !isGroupConversation(ticket) || ticket.lastMessageFromMe !== false) {
			return "";
		}

		return getContactDisplayLabel(
			ticket.lastMessageContact,
			getJidDisplayNumber(ticket.lastMessageParticipant)
		);
	};

	const formatVcardPreviewText = (text) => {
		if (!text || typeof text !== "string" || !text.includes("BEGIN:VCARD")) {
			return text;
		}

		const normalizedText = text.replace(/\r/g, "");
		const contactMatch = normalizedText.match(/(?:^|\n)FN:(.+)/i);
		const waidMatch = normalizedText.match(/waid=(\d+)/i);
		const phoneMatch = normalizedText.match(/(?:^|\n)TEL[^:]*:(\+?\d+)/i);
		const contactName = contactMatch?.[1]?.trim() || "Contato compartilhado";
		const contactNumber = phoneMatch?.[1]?.trim() || waidMatch?.[1]?.trim() || "";

		return contactNumber ? `Contato: ${contactName} (${contactNumber})` : `Contato: ${contactName}`;
	};

	const parseStructuredPreviewBody = (text, prefix) => {
		if (!text || typeof text !== "string" || !text.startsWith(prefix)) {
			return null;
		}

		try {
			return JSON.parse(text.substring(prefix.length).trim() || "{}");
		} catch {
			return null;
		}
	};

	const hasStructuredMessagePreview = (message) => {
		if (!message) {
			return false;
		}

		return Boolean(
			message.mediaType === "listMessage" ||
			message.mediaType === "contactMessage" ||
			(typeof message.body === "string" && (
				message.body.startsWith("[BOTOES]") ||
				message.body.startsWith("[PIX]") ||
				message.body.startsWith("[LIST]") ||
				message.body.startsWith("[CAROUSEL]") ||
				message.body.includes("BEGIN:VCARD")
			))
		);
	};

	const formatInteractivePreviewText = (text) => {
		if (!text || typeof text !== "string") {
			return text;
		}

		if (text.startsWith("[BOTOES]")) {
			try {
				const payload = JSON.parse(text.substring("[BOTOES]".length).trim() || "{}");
				return payload?.titulo ? `Botões: ${payload.titulo}` : "Botões interativos";
			} catch {
				return "Botões interativos";
			}
		}

		if (text.startsWith("[PIX]")) {
			return "PIX";
		}

		if (text.startsWith("[LIST]")) {
			const payload = parseStructuredPreviewBody(text, "[LIST]");
			return payload?.titulo ? `Lista: ${payload.titulo}` : "Lista interativa";
		}

		if (text.startsWith("[CAROUSEL]")) {
			const payload = parseStructuredPreviewBody(text, "[CAROUSEL]");
			const totalCards = Array.isArray(payload?.cards) ? payload.cards.length : 0;
			return totalCards > 0 ? `Carrossel: ${totalCards} cards` : "Carrossel interativo";
		}

		return text;
	};

	const formatTicketLastMessage = (ticket) => {
		const fallbackText = formatInteractivePreviewText(formatVcardPreviewText(ticket?.lastMessage)) || "Sem mensagens";
		const sender = getTicketLastMessageSenderLabel(ticket);
		return sender ? `${sender}: ${fallbackText}` : fallbackText;
	};

	const renderMessageMedia = (message) => {
		if (!message.mediaUrl && !message.mediaType && !message.body) return null;

		if (message.body && message.body.startsWith("[LIST]")) {
			try {
				const payload = parseStructuredPreviewBody(message.body, "[LIST]");
				if (payload?.secoes?.length) {
					return (
						<ListPreview
							titulo={payload.titulo || ""}
							descricao={payload.descricao || ""}
							textoBotao={payload.textoBotao || "Ver opcoes"}
							secoes={payload.secoes}
							rodape={payload.rodape || ""}
							ticketId={message?.ticket?.id}
						/>
					);
				}
			} catch (error) {
				console.error("Erro ao renderizar lista estruturada no chat principal:", error);
			}
		}

		if (message.mediaType === "listMessage") {
			try {
				const parsedData = JSON.parse(message.dataJson || "{}");
				const listMessage = parsedData?.message?.listMessage;

				if (listMessage?.sections?.length) {
					const secoes = listMessage.sections.map((section) => ({
						titulo: section.title || "",
						linhas: (section.rows || []).map((row) => ({
							titulo: row.title,
							descricao: row.description,
							idLinha: row.rowId
						}))
					}));

					return (
						<ListPreview
							titulo={listMessage.title || ""}
							descricao={listMessage.description || ""}
							textoBotao={listMessage.buttonText || "Clique aqui"}
							secoes={secoes}
							rodape={listMessage.footerText || ""}
							ticketId={message?.ticket?.id}
						/>
					);
				}
			} catch (error) {
				console.error("Erro ao renderizar lista no chat principal:", error);
			}
		}

		if (message.body && message.body.startsWith("[CAROUSEL]")) {
			try {
				const payload = parseStructuredPreviewBody(message.body, "[CAROUSEL]");
				if (Array.isArray(payload?.cards) && payload.cards.length > 0) {
					return <CarouselPreview cards={payload.cards} />;
				}
			} catch (error) {
				console.error("Erro ao renderizar carrossel no chat principal:", error);
			}
		}

		if (message.body && message.body.startsWith("[BOTOES]")) {
			try {
				const bodyPayload = message.body.substring("[BOTOES]".length).trim();
				let titulo = "";
				let rodape = "";
				let botoes = [];
				let imagem = null;

				if (bodyPayload) {
					const data = JSON.parse(bodyPayload);
					titulo = data.titulo || "";
					rodape = data.rodape || "";
					botoes = data.botoes || [];
				} else if (message.dataJson && typeof message.dataJson === "string") {
					const parsedData = JSON.parse(message.dataJson);
					const interactiveMsg =
						parsedData?.message?.viewOnceMessage?.message?.interactiveMessage ||
						parsedData?.message?.interactiveMessage;

					if (interactiveMsg) {
						titulo = interactiveMsg.body?.text || "";
						rodape = interactiveMsg.footer?.text || "";
						botoes = (interactiveMsg.nativeFlowMessage?.buttons || []).map((btn) => {
							try {
								const params = typeof btn.buttonParamsJson === "string"
									? JSON.parse(btn.buttonParamsJson)
									: (btn.buttonParamsJson || {});

								return {
									tipo: btn.name,
									texto: params.display_text || "",
									conteudo: params.phone_number || params.phoneNumber || params.url || params.copy_code || params.id || ""
								};
							} catch {
								return { tipo: btn.name, texto: "", conteudo: "" };
							}
						});
						if (interactiveMsg.header?.imageMessage?.jpegThumbnail) {
							imagem = interactiveMsg.header.imageMessage.jpegThumbnail;
						}
					}
				}

				return (
					<ButtonPreview
						titulo={titulo}
						rodape={rodape}
						secoes={[{ titulo: "Botões", linhas: botoes }]}
						imagem={imagem}
						ticketId={message?.ticket?.id}
					/>
				);
			} catch (error) {
				console.error("Erro ao renderizar botões no chat principal:", error);
			}
		}

		if (message.body && message.body.startsWith("[PIX]")) {
			try {
				if (!message.dataJson || typeof message.dataJson !== "string") {
					return null;
				}

				const parsedData = JSON.parse(message.dataJson);
				const nativeFlowMessage =
					parsedData?.message?.interactiveMessage?.nativeFlowMessage ||
					parsedData?.message?.viewOnceMessage?.message?.interactiveMessage?.nativeFlowMessage;

				const button = nativeFlowMessage?.buttons?.[0];
				if (!button?.buttonParamsJson) {
					return null;
				}

				const params = JSON.parse(button.buttonParamsJson);
				const numeroCobranca = params.reference_id || "N/A";
				const total = params.total_amount?.value || "N/A";
				const produto = params.order?.items?.[0]?.name || "N/A";
				const imagem = nativeFlowMessage?.header?.imageMessage?.jpegThumbnail || null;

				return (
					<PixPreview
						companyId={message.companyId}
						avatarUser={message.ticket?.user?.profileImage}
						avatarName={message.ticket?.user?.name}
						avatarUrl={message.contact?.urlPicture}
						name={message.contact?.name}
						numeroCobranca={numeroCobranca}
						total={total}
						produto={produto}
						imagem={imagem}
						ticketId={message?.ticket?.id}
					/>
				);
			} catch (error) {
				console.error("Erro ao renderizar PIX no chat principal:", error);
			}
		}

		if (message.mediaType === "contactMessage" || (message.body && message.body.includes("BEGIN:VCARD"))) {
			try {
				const vcardBody = String(message.body || "");
				const normalizedVcard = vcardBody.replace(/\r/g, "");
				const contactMatch = normalizedVcard.match(/(?:^|\n)FN:(.+)/i);
				const waidMatch = normalizedVcard.match(/waid=(\d+)/i);
				const phoneMatch = normalizedVcard.match(/(?:^|\n)TEL[^:]*:(\+?\d+)/i);
				const contact = contactMatch?.[1]?.trim() || message.contact?.name || "Contato compartilhado";
				const contactNumber = phoneMatch?.[1]?.trim() || waidMatch?.[1]?.trim() || "";

				return (
					<VcardPreview
						contact={contact}
						numbers={contactNumber}
						queueId={message?.ticket?.queueId}
						whatsappId={message?.ticket?.whatsappId}
					/>
				);
			} catch (error) {
				console.error("Erro ao renderizar contato no chat principal:", error);
			}
		}

		const isBase64Image = message.body && message.body.startsWith("data:image/");
		let imageUrl = isBase64Image ? message.body : message.mediaUrl;

		// **NOVO: Extrai apenas o base64 da imagem de anúncios Facebook/Instagram**
		if (isBase64Image && message.body.includes(" | ")) {
			const parts = message.body.split(" | ");
			imageUrl = parts[0]; // Pega apenas o data:image/png;base64,...
		}

		if (message.mediaType === "image" || isBase64Image) {
			return (
				<img
					src={imageUrl}
					alt=""
					style={{
						width: "100%", // **NOVO: Largura total**
						maxHeight: "400px", // **NOVO: Altura máxima maior**
						minHeight: "200px", // **NOVO: Altura mínima**
						objectFit: "cover", // **NOVO: Mantém proporção**
						borderRadius: "8px",
						marginBottom: "4px",
						cursor: "pointer",
					}}
					onClick={() => handleOpenMediaGallery(message)}
				/>
			);
		}

		if (message.mediaType === "audio") {
			const avatarUrl = message.fromMe
				? user.profileImage
				: selectedTicket?.contact?.urlPicture || selectedTicket?.contact?.profilePicUrl;
			const userName = getMessageSenderLabel(message);

			return (
				<AudioModal
					url={message.mediaUrl}
					avatarUrl={avatarUrl}
					userName={userName}
				/>
			);
		}

		if (message.mediaType === "video") {
			return (
				<video
					style={{
						maxWidth: "100%",
						maxHeight: "300px",
						borderRadius: "8px",
						marginBottom: "4px",
						cursor: "pointer",
					}}
					src={message.mediaUrl}
					controls
					onClick={() => handleOpenMediaGallery(message)}
				/>
			);
		}

		if (message.mediaUrl) {
			// Extrai nome do arquivo e extensão da URL
			const fileName = message.body || message.mediaUrl.split('/').pop().split('?')[0] || 'arquivo';
			const fileExtension = fileName.split('.').pop().toUpperCase();

			// Função para formatar tamanho do arquivo (se disponível)
			const formatFileSize = (bytes) => {
				if (!bytes) return '';
				const mb = bytes / (1024 * 1024);
				return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
			};

			// Ícone baseado no tipo de arquivo
			const getFileIcon = () => {
				const ext = fileExtension.toLowerCase();
				if (['pdf'].includes(ext)) return <DocumentIcon style={{ fontSize: 40, color: '#fff' }} />;
				if (['zip', 'rar', '7z'].includes(ext)) return <FileIcon style={{ fontSize: 40, color: '#fff' }} />;
				if (['doc', 'docx'].includes(ext)) return <DocumentIcon style={{ fontSize: 40, color: '#fff' }} />;
				if (['xls', 'xlsx', 'csv'].includes(ext)) return <DocumentIcon style={{ fontSize: 40, color: '#fff' }} />;
				if (['txt', 'xml'].includes(ext)) return <DocumentIcon style={{ fontSize: 40, color: '#fff' }} />;
				return <FileIcon style={{ fontSize: 40, color: '#fff' }} />;
			};

			return (
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 12,
					backgroundColor: '#1f2c33',
					padding: '12px 16px',
					borderRadius: 8,
					maxWidth: 350,
					marginBottom: 4
				}}>
					{/* Ícone do arquivo */}
					<div style={{
						width: 48,
						height: 48,
						backgroundColor: '#2a3942',
						borderRadius: 4,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0
					}}>
						{getFileIcon()}
					</div>

					{/* Informações do arquivo */}
					<div style={{ flex: 1, minWidth: 0 }}>
						<Typography style={{
							fontSize: 14,
							color: '#e9edef',
							fontWeight: 500,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap'
						}}>
							{fileName}
						</Typography>
						<Typography style={{
							fontSize: 12,
							color: '#8696a0',
							marginTop: 2
						}}>
							{fileExtension} • {message.fileSize ? formatFileSize(message.fileSize) : '47 MB'}
						</Typography>
					</div>

					{/* Botão de download */}
					<IconButton
						size="small"
						href={message.mediaUrl}
						download
						target="_blank"
						style={{
							backgroundColor: '#2a3942',
							color: '#8696a0',
							flexShrink: 0
						}}
					>
						<GetAppIcon />
					</IconButton>
				</div>
			);
		}

		return null;
	};

	const formatMessageTime = (timestamp) => {
		try {
			return format(parseISO(timestamp), "HH:mm", { locale: ptBR });
		} catch {
			return "";
		}
	};

	// Abre galeria de mídia com todas as imagens/vídeos do ticket
	const handleOpenMediaGallery = (clickedMessage) => {
		// Filtra apenas imagens e vídeos de todas as mensagens
		const allMedias = messages
			.filter(msg => msg.mediaUrl && (msg.mediaType === "image" || msg.mediaType === "video"))
			.map(msg => ({
				id: msg.id,
				mediaUrl: msg.mediaUrl,
				mediaType: msg.mediaType,
				fromMe: msg.fromMe,
				contactName: getMessageSenderLabel(msg),
				createdAt: msg.createdAt,
			}));

		// Encontra o índice da mídia clicada
		const clickedIndex = allMedias.findIndex(media => media.id === clickedMessage.id);

		setGalleryMedias(allMedias);
		setGalleryInitialIndex(clickedIndex >= 0 ? clickedIndex : 0);
		setMediaGalleryOpen(true);
	};

	const isVisualMediaType = (mediaType) => mediaType === "image" || mediaType === "video";

	const getMediaDownloadName = (message) => {
		if (!message) return "arquivo";

		if (message.body) {
			return message.body;
		}

		if (message.mediaUrl) {
			const fileName = message.mediaUrl.split("/").pop()?.split("?")[0];
			if (fileName) {
				return fileName;
			}
		}

		return "arquivo";
	};

	const downloadMessageMedia = async (message) => {
		if (!message?.mediaUrl) return;
		const filename = getMediaDownloadName(message);
		try {
			const response = await fetch(message.mediaUrl, {
				headers: { Origin: window.location.origin },
				mode: "cors"
			});
			if (!response.ok) throw new Error("fetch error");
			const blob = await response.blob();
			const blobUrl = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = blobUrl;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(blobUrl);
			toast.success("Download iniciado.");
		} catch {
			// Fallback: link direto sem abrir nova aba
			const link = document.createElement("a");
			link.href = message.mediaUrl;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	};

	// Agrupa mensagens consecutivas com mídia do mesmo remetente
	const groupConsecutiveMediaMessages = (messages) => {
		const grouped = [];
		let currentGroup = null;

		messages.forEach((message, index) => {
			const hasMedia = Boolean(message.mediaUrl) && isVisualMediaType(message.mediaType);
			const prevMessage = messages[index - 1];

			// Verifica se deve agrupar com a mensagem anterior
			const shouldGroup = hasMedia &&
				prevMessage &&
				prevMessage.mediaUrl &&
				isVisualMediaType(prevMessage.mediaType) &&
				message.fromMe === prevMessage.fromMe &&
				Math.abs(new Date(message.createdAt) - new Date(prevMessage.createdAt)) < 5000; // 5 segundos

			if (shouldGroup && currentGroup) {
				// Adiciona à grupo atual
				currentGroup.messages.push(message);
			} else {
				// Finaliza grupo anterior se existir
				if (currentGroup) {
					// **SÓ CRIA GRUPO SE TIVER MAIS DE 1 MENSAGEM**
					if (currentGroup.messages.length > 1) {
						grouped.push(currentGroup);
					} else {
						// Se só tem 1 mensagem, adiciona como mensagem individual
						grouped.push(currentGroup.messages[0]);
					}
				}

				// Inicia novo grupo ou adiciona mensagem individual
				if (hasMedia) {
					currentGroup = {
						id: `group-${message.id}`,
						isGroup: true,
						messages: [message],
						fromMe: message.fromMe,
						createdAt: message.createdAt
					};
				} else {
					grouped.push(message);
					currentGroup = null;
				}
			}
		});

		// Adiciona último grupo se existir
		if (currentGroup) {
			// **SÓ CRIA GRUPO SE TIVER MAIS DE 1 MENSAGEM**
			if (currentGroup.messages.length > 1) {
				grouped.push(currentGroup);
			} else {
				// Se só tem 1 mensagem, adiciona como mensagem individual
				grouped.push(currentGroup.messages[0]);
			}
		}

		return grouped;
	};

	// Renderiza grid de múltiplos arquivos
	const renderMediaGrid = (messages, showDeleted = false) => {
		// Filtra mensagens deletadas se não estiver no modo de visualização de deletadas
		const filteredMessages = showDeleted ? messages : messages.filter(msg => !msg.isDeleted);
		const totalFiles = filteredMessages.length;

		if (totalFiles === 0) return null;

		const visibleFiles = Math.min(totalFiles, 4);
		const remainingFiles = totalFiles - visibleFiles;

		// Layout baseado na quantidade de arquivos
		const getGridLayout = () => {
			if (totalFiles === 1) return { columns: 1, rows: 1 };
			if (totalFiles === 2) return { columns: 2, rows: 1 };
			if (totalFiles === 3) return { columns: 2, rows: 2 };
			return { columns: 2, rows: 2 };
		};

		const layout = getGridLayout();
		const itemWidth = layout.columns === 1 ? '100%' : 'calc(50% - 2px)';
		const itemHeight = totalFiles === 2 ? '200px' : '150px';

		return (
			<div style={{
				display: 'grid',
				gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
				gap: 4,
				maxWidth: 350,
				marginBottom: 4
			}}>
				{filteredMessages.slice(0, visibleFiles).map((msg, index) => {
					const isLast = index === visibleFiles - 1 && remainingFiles > 0;

					return (
						<div
							key={msg.id}
							style={{
								position: 'relative',
								width: '100%',
								height: itemHeight,
								overflow: 'hidden',
								borderRadius: 8
							}}
						>
							{msg.mediaType === 'image' ? (
								<>
									<img
										src={msg.mediaUrl}
										alt=""
										style={{
											width: '100%',
											height: '100%',
											objectFit: 'cover',
											cursor: 'pointer',
											filter: isLast ? 'brightness(0.5)' : 'none'
										}}
										onClick={() => handleOpenMediaGallery(msg)}
									/>
									{isLast && (
										<div style={{
											position: 'absolute',
											top: 0,
											left: 0,
											right: 0,
											bottom: 0,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											backgroundColor: 'rgba(0,0,0,0.6)',
											color: '#fff',
											fontSize: 48,
											fontWeight: 'bold',
											cursor: 'pointer'
										}}>
											+{remainingFiles}
										</div>
									)}
								</>
							) : msg.mediaType === 'video' ? (
								<>
									<video
										src={msg.mediaUrl}
										style={{
											width: '100%',
											height: '100%',
											objectFit: 'cover',
											cursor: 'pointer',
											filter: isLast ? 'brightness(0.5)' : 'none'
										}}
										onClick={() => handleOpenMediaGallery(msg)}
									/>
									{isLast && (
										<div style={{
											position: 'absolute',
											top: 0,
											left: 0,
											right: 0,
											bottom: 0,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											backgroundColor: 'rgba(0,0,0,0.6)',
											color: '#fff',
											fontSize: 48,
											fontWeight: 'bold'
										}}>
											+{remainingFiles}
										</div>
									)}
								</>
							) : (
								// Documentos em grid
								<div style={{
									width: '100%',
									height: '100%',
									backgroundColor: '#1f2c33',
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									justifyContent: 'center',
									padding: 8,
									filter: isLast ? 'brightness(0.7)' : 'none'
								}}>
									<DocumentIcon style={{ fontSize: 40, color: '#8696a0', marginBottom: 4 }} />
									<Typography style={{
										fontSize: 11,
										color: '#e9edef',
										textAlign: 'center',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
										width: '100%'
									}}>
										{msg.body || 'Documento'}
									</Typography>
									{isLast && (
										<div style={{
											position: 'absolute',
											top: 0,
											left: 0,
											right: 0,
											bottom: 0,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											backgroundColor: 'rgba(0,0,0,0.6)',
											color: '#fff',
											fontSize: 48,
											fontWeight: 'bold'
										}}>
											+{remainingFiles}
										</div>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		);
	};

	const formatMessageDateTime = (timestamp) => {
		try {
			return format(parseISO(timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR });
		} catch {
			return "";
		}
	};

	const getStatusColor = (status) => {
		const colors = {
			pending: "#FFA500",
			open: "#00a884",
			closed: "#999999",
		};
		return colors[status] || "#999999";
	};

	const getStatusLabel = (status) => {
		const labels = {
			pending: "Aguardando",
			open: "Atendendo",
			closed: "Finalizado",
		};
		return labels[status] || status;
	};

	const loadFiltersData = async () => {
		try {
			const [queuesRes, usersRes, tagsRes, whatsappsRes] = await Promise.all([
				api.get("/queue"),
				api.get("/users"),
				api.get("/tags"),
				api.get("/whatsapp")
			]);

			// Filtra filas baseado nas permissões do usuário
			const allQueues = Array.isArray(queuesRes.data) ? queuesRes.data : [];
			const userQueueIds = user?.queues?.map(q => q.id) || [];
			const filteredQueues = user?.profile === "admin"
				? allQueues
				: allQueues.filter(q => userQueueIds.includes(q.id));

			// Filtra conexões baseado nas permissões do usuário
			const allWhatsapps = Array.isArray(whatsappsRes.data) ? whatsappsRes.data : [];
			const filteredWhatsapps = user?.profile === "admin" || !user?.whatsappId
				? allWhatsapps
				: allWhatsapps.filter(w => w.id === user.whatsappId);

			setQueues(filteredQueues);
			setUsers(Array.isArray(usersRes.data.users) ? usersRes.data.users : (Array.isArray(usersRes.data) ? usersRes.data : []));
			setTags(Array.isArray(tagsRes.data) ? tagsRes.data : []);
			setWhatsapps(filteredWhatsapps);
		} catch (err) {
			setQueues([]);
			setUsers([]);
			setTags([]);
			setWhatsapps([]);
		}
	};

	const sumUnread = (tickets = []) =>
		tickets.reduce((total, ticket) => total + (ticket.unreadMessages || 0), 0);

	const countTickets = (tickets = []) => tickets.length;

	const loadUnreadCounts = async () => {
		try {
			const baseParams = buildFilterParams();

			const [pendingRes, openRes, closedRes, groupRes] = await Promise.all([
				api.get("/tickets", { params: { ...baseParams, status: "pending" } }),
				api.get("/tickets", { params: { ...baseParams, status: "open" } }),
				api.get("/tickets", { params: { ...baseParams, status: "closed" } }),
				api.get("/tickets", { params: { ...baseParams, status: "group" } })
			]);

			// Buscar grupos do endpoint específico
			const groupTickets = groupRes.data?.tickets || [];
			const pendingTickets = pendingRes.data?.tickets || [];
			const openTickets = openRes.data?.tickets || [];
			const closedTickets = closedRes.data?.tickets || [];

			const allPendingTickets = pendingTickets.filter(isPrivateConversation);

			const counts = {
				pending: countTickets(allPendingTickets),
				open: countTickets(openTickets),
				closed: countTickets(closedTickets),
				groups: countTickets(groupTickets.filter(isGroupConversation))
			};

			setUnreadCounts(counts);
		} catch (err) {
		}
	};

	const handleSelectQuickMessage = async (message, file) => {
		if (!selectedTicket) {
			setInputMessage(message || "");
			return;
		}

		if (file) {
			setReplyingTo(null);
			openMediaPreview([file], message || "");
			return;
		}

		if (message) {
			setReplyingTo(null);
			setInputMessage(message);
			return;
		}

	};

	const handleMessageMenuOpen = (event, message, groupMessages = []) => {
		setMessageMenuAnchor(event.currentTarget);
		setSelectedMessage(message);
		setSelectedMessageGroup(groupMessages.filter(groupMessage => groupMessage?.mediaUrl && !groupMessage?.isDeleted));
	};

	const handleTicketContextMenu = (event, ticket) => {
		event.preventDefault();
		setTicketMenuAnchor(event.currentTarget);
		setSelectedTicketForMenu(ticket);
	};

	const handleMessageMenuClose = () => {
		setMessageMenuAnchor(null);
		setSelectedMessageGroup([]);
	};

	const handleDeleteMessage = async () => {
		if (!selectedMessage) return;

		try {
			await api.delete(`/messages/${selectedMessage.id}`);
			loadMessages(selectedTicket.id);
			setDeleteModalOpen(false);
			setSelectedMessage(null);
			setSelectedMessageGroup([]);
		} catch (err) {
		}
	};

	const handleEditMessage = async (newText) => {
		if (!selectedMessage) return;

		try {
			await api.post(`/messages/edit/${selectedMessage.id}`, {
				body: newText,
			});
			loadMessages(selectedTicket.id);
			setEditModalOpen(false);
			setSelectedMessage(null);
			setSelectedMessageGroup([]);
		} catch (err) {
		}
	};

	const handleForwardMessage = async (contactIds) => {
		if (!selectedMessage) return;

		try {
			for (const contactId of contactIds) {
				// Buscar ou criar ticket para o contato
				const { data: ticketData } = await api.post("/tickets", {
					contactId: contactId,
					userId: user.id,
					status: "open",
				});

				// Enviar mensagem para o ticket
				await api.post(`/messages/${ticketData.id}`, {
					body: selectedMessage.body,
					mediaUrl: selectedMessage.mediaUrl,
				});
			}
			setForwardModalOpen(false);
			setSelectedMessage(null);
			setSelectedMessageGroup([]);
		} catch (err) {
		}
	};

	const handleReplyMessage = (message) => {
		setReplyingTo(message);
		setMessageMenuAnchor(null);
	};

	const toggleFilter = (type, id) => {
		if (type === "queue") {
			setSelectedQueues(prev =>
				prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
			);
		} else if (type === "user") {
			setSelectedUsers(prev =>
				prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
			);
		} else if (type === "tag") {
			setSelectedTags(prev =>
				prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
			);
		} else if (type === "whatsapp") {
			setSelectedWhatsapps(prev =>
				prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
			);
		}
	};

	const clearFilters = () => {
		setSelectedQueues([]);
		setSelectedUsers([]);
		setSelectedTags([]);
		setSelectedWhatsapps([]);
		setMessageDirectionFilter(null);
	};

	const hasActiveFilters = selectedQueues.length > 0 || selectedUsers.length > 0 || selectedTags.length > 0 || selectedWhatsapps.length > 0 || messageDirectionFilter !== null;

	const handleOpenCloseAllDialog = () => {
		if (!currentBulkCloseConfig.canBulkClose) {
			return;
		}
		setCloseAllDialogOpen(true);
	};

	const handleCloseCloseAllDialog = () => {
		if (!closingAllTickets) {
			setCloseAllDialogOpen(false);
		}
	};

	const handleCloseAllTickets = async () => {
		setClosingAllTickets(true);
		try {
			await api.post("/tickets/closeAll", {
				status: currentBulkCloseConfig.status,
				tabKey: currentBulkCloseConfig.tabKey,
				selectedQueueIds: selectedQueues,
				ticketIds: tickets.map(ticket => ticket.id)
			});
			toast.success(`Todas as conversas da aba ${currentBulkCloseConfig.label} foram resolvidas.`);
			await Promise.all([loadTickets(), loadUnreadCounts()]);
			setCloseAllDialogOpen(false);
		} catch (err) {
			toast.error("Não foi possível encerrar os tickets. Tente novamente.");
		} finally {
			setClosingAllTickets(false);
		}
	};

	useEffect(() => {
		if (!isMobile) {
			setMobileView("desktop");
			return;
		}

		if (selectedTicket) {
			setMobileView("chat");
		} else {
			setMobileView("list");
		}
	}, [isMobile, selectedTicket]);

	const shouldShowList = (!isMobile || mobileView === "list") && !shouldHideMobileMenu;
	const shouldShowChat = (!isMobile || mobileView === "chat") || shouldHideMobileMenu;

	const canReturnClosedTicket =
		selectedTicket &&
		selectedTicket.status === "closed";

	const handleReturnTicket = async () => {
		if (!selectedTicket || selectedTicket.status !== "closed") return;

		try {
			await api.put(`/tickets/${selectedTicket.id}`, {
				status: "pending",
				userId: null
			});

			await loadTickets();
			await loadUnreadCounts();
		} catch (err) {
		}
	};

	const handleRemoveGroup = async (ticket) => {
		if (!ticket || !isGroupConversation(ticket)) return;

		const confirmRemover = await showConfirm({
			type: "error",
			title: "Remover Grupo",
			message: `Deseja realmente remover o grupo "${ticket.contact?.name || 'Sem nome'}"?`,
			confirmText: "Sim, remover",
			cancelText: "Cancelar",
		});
		if (!confirmRemover) {
			return;
		}

		try {
			await api.delete(`/tickets/${ticket.id}`);
			toast.success("Grupo removido com sucesso!");
			await loadTickets();
			await loadUnreadCounts();
			if (selectedTicket?.id === ticket.id) {
				setSelectedTicket(null);
			}
		} catch (err) {
			toast.error("Erro ao remover grupo");
		}
	};

	useEffect(() => {
		const timer = setTimeout(() => {
			if (quickReplyStartIndexRef.current === -1) {
				setShowQuickReplies(false);
				setFilteredQuickMessages([]);
				setSelectedQuickIndex(-1);
				return;
			}
			const term = quickReplySearchTerm.trim().toLowerCase();
			const filtered = term
				? quickMessages.filter(msg =>
					msg.message?.toLowerCase().includes(term) ||
					(msg.shortcut || msg.shortcode || "").toLowerCase().includes(term)
				)
				: quickMessages;
			setFilteredQuickMessages(filtered);
			setShowQuickReplies(filtered.length > 0);
			setSelectedQuickIndex(filtered.length ? 0 : -1);
		}, 200);

		return () => clearTimeout(timer);
	}, [quickReplySearchTerm, quickMessages]);

	const groupedMessages = React.useMemo(
		() => groupConsecutiveMediaMessages(messages),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[messages]
	);

	return (
		<div className={`${classes.root} ${isMobile ? classes.rootMobile : ""}`}>
			{shouldShowList && (
				<div className={`${classes.sidebar} ${isMobile ? classes.sidebarMobile : ""}`}>
					{/* Header */}
					<div className={classes.sidebarHeader}>
						<Avatar src={user?.profileImage} alt={user?.name}>
							{user?.name?.charAt(0)}
						</Avatar>
						<div style={{ flex: 1 }} />
						<div style={{ display: "flex", gap: 6, marginRight: 8 }}>
							{channelQuickOptions.map(option => {
								const isActive = selectedChannelsQuickFilter.includes(option.key);
								return (
									<Tooltip key={option.key} title={`Filtrar ${option.label}`}>
										<span>
											<IconButton
												size="small"
												onClick={() => toggleChannelQuickFilter(option.key)}
												style={{
													border: `1px solid ${option.color}`,
													color: isActive ? "#ffffff" : option.color,
													backgroundColor: isActive ? option.color : "transparent",
													width: 34,
													height: 34
												}}
											>
												{option.icon}
											</IconButton>
										</span>
									</Tooltip>
								);
							})}
						</div>
						{/* Botão Ver Todos - apenas para quem tem permissão */}
						{(user?.profile === "admin" || user?.allUserChat === "enabled" || user?.allTicket === "enabled") && (
							<Tooltip title={showAllTickets ? "Ver apenas meus tickets" : "Ver todos os tickets"}>
								<IconButton
									size="small"
									onClick={() => setShowAllTickets(!showAllTickets)}
									style={{
										marginRight: 8,
										backgroundColor: showAllTickets ? "#00a884" : "transparent",
										color: showAllTickets ? "#ffffff" : "inherit"
									}}
								>
									{showAllTickets ? <VisibilityIcon /> : <VisibilityOffIcon />}
								</IconButton>
							</Tooltip>
						)}
						<Tooltip title={currentBulkCloseConfig.canBulkClose ? `Resolver todas as conversas da aba ${currentBulkCloseConfig.label}` : "Esta aba nao possui resolucao em massa"}>
							<span>
								<IconButton
									size="small"
									onClick={handleOpenCloseAllDialog}
									disabled={closingAllTickets || !currentBulkCloseConfig.canBulkClose}
									style={{ marginRight: 8 }}
								>
									<DoneAllIcon />
								</IconButton>
							</span>
						</Tooltip>
						<Tooltip title="Ver Finalizados">
							<IconButton
								size="small"
								onClick={() => setTabIndex(TAB_CONFIG.length - 1)}
								style={{ marginRight: 8 }}
							>
								<ArchiveIcon />
							</IconButton>
						</Tooltip>
					</div>

					{/* Barra de busca e ações */}
					<div className={classes.sidebarActionsRow}>
						{/* Campo de busca */}
						<div className={classes.searchInputWrapper}>
							<SearchIcon style={{ fontSize: 18, color: "#667781", flexShrink: 0 }} />
							<InputBase
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
								placeholder="Buscar conversa..."
								style={{ flex: 1, fontSize: 13, marginLeft: 6 }}
								inputProps={{ "aria-label": "buscar conversa" }}
							/>
							{searchTerm && (
								<IconButton size="small" onClick={() => setSearchTerm("")} style={{ padding: 2 }}>
									<CloseIcon style={{ fontSize: 14 }} />
								</IconButton>
							)}
						</div>

						{/* Filtro */}
						<Tooltip title="Filtros">
							<IconButton
								size="small"
								onClick={(e) => setFilterAnchor(e.currentTarget)}
								style={{
									backgroundColor: hasActiveFilters ? "#00a884" : "transparent",
									color: hasActiveFilters ? "#ffffff" : "inherit",
									padding: 6,
								}}
							>
								<FilterListIcon style={{ fontSize: 20 }} />
							</IconButton>
						</Tooltip>

						{/* Menu três pontinhos */}
						<Tooltip title="Mais ações">
							<IconButton
								size="small"
								onClick={(e) => setOperationsMenuAnchor(e.currentTarget)}
								style={{ padding: 6 }}
							>
								<MoreVertIcon style={{ fontSize: 20 }} />
							</IconButton>
						</Tooltip>

						{/* Botão nova conversa */}
						<Tooltip title="Nova conversa">
							<IconButton
								size="small"
								onClick={() => setNewConversationOpen(true)}
								style={{
									backgroundColor: "#00a884",
									color: "#ffffff",
									borderRadius: 8,
									padding: 6,
									flexShrink: 0,
								}}
							>
								<AddIcon style={{ fontSize: 20 }} />
							</IconButton>
						</Tooltip>
					</div>

					{/* Chip de filtro ativo: apenas não lidas */}
					{onlyUnread && (
						<div style={{ padding: "4px 8px", backgroundColor: "#ffffff", borderBottom: "1px solid #e9edef" }}>
							<Chip
								label="Não lidas"
								size="small"
								onDelete={() => setOnlyUnread(false)}
								style={{ backgroundColor: "#e3f2fd", color: "#1565c0", fontSize: 12 }}
							/>
						</div>
					)}

					{/* Barra de seleção em massa */}
					{selectionMode && (
						<div className={classes.selectionBar}>
							<Button
								size="small"
								variant="contained"
								style={{ backgroundColor: "#f44336", color: "#fff", fontSize: 11, minWidth: 0 }}
								onClick={() => {
									if (window.confirm(`Excluir ${selectedTicketIds.size} conversa(s)? Esta ação não pode ser desfeita.`)) {
										handleBulkDelete();
									}
								}}
								disabled={selectedTicketIds.size === 0}
							>
								<DeleteIcon style={{ fontSize: 14, marginRight: 4 }} />
								Excluir ({selectedTicketIds.size})
							</Button>
							<Button
								size="small"
								variant="outlined"
								style={{ fontSize: 11, minWidth: 0 }}
								onClick={() => {
									setSelectionMode(false);
									setSelectedTicketIds(new Set());
								}}
							>
								Cancelar
							</Button>
							<Button
								size="small"
								variant="outlined"
								style={{ fontSize: 11, minWidth: 0 }}
								onClick={() => {
									setSelectedTicketIds(new Set(tickets.map(t => t.id)));
								}}
							>
								Todos ({tickets.length})
							</Button>
						</div>
					)}

					{/* Tabs */}
					<Tabs
						value={tabIndex}
						onChange={(e, newValue) => setTabIndex(newValue)}
						className={classes.tabs}
						indicatorColor="primary"
						textColor="primary"
						variant="fullWidth"
					>
						<Tab
							label={
								<Badge
									badgeContent={unreadCounts.pending}
									color="error"
									max={99}
								>
									<span style={{ fontSize: '0.75rem' }}>Aguardando</span>
								</Badge>
							}
						/>
						<Tab
							label={
								<Badge
									badgeContent={unreadCounts.open}
									color="error"
									max={99}
								>
									<span style={{ fontSize: '0.75rem' }}>Atendendo</span>
								</Badge>
							}
						/>
						{/* Aba de Grupos - apenas para quem tem permissão */}
						{(user?.profile === "admin" || user?.allowGroup === true) && (
							<Tab
								label={
									<Badge
										badgeContent={unreadCounts.groups}
										color="primary"
										max={99}
									>
										<span style={{ fontSize: '0.75rem' }}>Grupos</span>
									</Badge>
								}
							/>
						)}
					</Tabs>

					{/* Tickets List */}
					<div className={classes.ticketsList}>
						<SafeComponent
							loading={loading && tickets.length === 0}
							error={errorTickets}
							data={tickets}
							renderData={(records) => (
								records.map((ticket) => (
									<div
										key={ticket.id}
										className={`${classes.ticketItem} ${!selectionMode && selectedTicket?.id === ticket.id ? "active" : ""}`}
										style={{
											contentVisibility: "auto",
											containIntrinsicSize: "72px",
											backgroundColor: selectionMode && selectedTicketIds.has(ticket.id) ? "#e8f5e9" : undefined,
										}}
										onClick={() => {
											if (selectionMode) {
												setSelectedTicketIds(prev => {
													const next = new Set(prev);
													next.has(ticket.id) ? next.delete(ticket.id) : next.add(ticket.id);
													return next;
												});
											} else {
												handleTicketClick(ticket);
											}
										}}
										onContextMenu={(e) => handleTicketContextMenu(e, ticket)}
									>
										{selectionMode && (
											<div style={{ display: "flex", alignItems: "center", paddingLeft: 4, flexShrink: 0 }}>
												{selectedTicketIds.has(ticket.id)
													? <CheckBoxIcon style={{ color: "#00a884", fontSize: 22 }} />
													: <CheckBoxOutlineBlankIcon style={{ color: "#999", fontSize: 22 }} />
												}
											</div>
										)}
										<Avatar
											src={ticket.contact?.urlPicture || ticket.contact?.profilePicUrl}
											className={classes.ticketAvatar}
										>
											{ticket.contact?.name?.charAt(0)}
										</Avatar>
										<div className={classes.ticketInfo}>
											<Typography className={classes.ticketName}>
												{ticket.contact?.name || "Sem nome"}
											</Typography>
											<div className={classes.ticketLastMessage}>
												{formatTicketLastMessage(ticket)}
											</div>

											<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
												{ticket.whatsapp?.name && (
													(() => {
														const channelStyle = getChannelStyle(ticket.channel);
														return (
															<div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: channelStyle.bg, padding: '2px 6px', borderRadius: 4 }}>
																<ConnectionIcon connectionType={ticket.channel} size={12} />
																<Typography style={{ fontSize: 10, color: channelStyle.color, fontWeight: 500 }}>
																	{ticket.whatsapp.name}
																</Typography>
															</div>
														);
													})()
												)}
												{ticket.queue?.name && (
													<div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
														<Typography style={{ fontSize: 10, color: '#667781', fontWeight: 500 }}>
															{ticket.queue.name}
														</Typography>
													</div>
												)}
												{tabIndex === 4 && (ticket.lastFlowId || ticket.hashFlowId) && (
													<Tooltip title={`ID: ${ticket.lastFlowId || ticket.hashFlowId}`} arrow>
														<div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f3e8ff', padding: '2px 6px', borderRadius: 4 }}>
															<SmartToyIcon style={{ fontSize: 12, color: '#9054bc' }} />
														</div>
													</Tooltip>
												)}
												{ticket.user?.name && (
													<div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
														<Typography style={{ fontSize: 10, color: '#667781', fontWeight: 500 }}>
															{ticket.user.name}
														</Typography>
													</div>
												)}
												{/* Tempo de espera - aparece apenas uma vez */}
												{TAB_CONFIG[tabIndex]?.key === "pending" && formatWaitingTime(ticket) && (
													<div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#fff3e0', padding: '2px 6px', borderRadius: 4 }}>
														<Typography style={{ fontSize: 10, color: '#ff9800', fontWeight: 500 }}>
															{formatWaitingTime(ticket)}
														</Typography>
													</div>
												)}
											</div>
										</div>
										<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 'auto', alignSelf: 'flex-start' }}>
											<Typography className={classes.ticketTime}>
												{ticket.lastMessage && formatMessageTime(ticket.updatedAt)}
											</Typography>
											{ticket.unreadMessages > 0 && (
												<div className={classes.unreadBadge}>
													{ticket.unreadMessages}
												</div>
											)}
											{/* Botão remover grupo - apenas na aba de Grupos */}
											{TAB_CONFIG[tabIndex]?.key === "groups" && isGroupConversation(ticket) && (
												<Tooltip title="Remover grupo">
													<IconButton
														size="small"
														onClick={(e) => {
															e.stopPropagation();
															handleRemoveGroup(ticket);
														}}
														style={{ padding: 2 }}
													>
														<DeleteIcon style={{ fontSize: 16, color: '#f44336' }} />
													</IconButton>
												</Tooltip>
											)}
										</div>
									</div>
								))
							)}
						/>
					</div>
				</div>
			)}

			{selectedTicketForMenu && (
				<TicketActionsMenu
					ticket={selectedTicketForMenu}
					anchorEl={ticketMenuAnchor}
					open={Boolean(ticketMenuAnchor)}
					onClose={() => {
						setTicketMenuAnchor(null);
						setSelectedTicketForMenu(null);
					}}
					onUpdate={() => {
						loadTickets();
						loadUnreadCounts();
						setTicketMenuAnchor(null);
						setSelectedTicketForMenu(null);
					}}
				/>
			)}

			{/* Popover de Filtros */}
			<Popover
				open={Boolean(filterAnchor)}
				anchorEl={filterAnchor}
				onClose={() => setFilterAnchor(null)}
				anchorOrigin={{
					vertical: 'bottom',
					horizontal: 'right',
				}}
				transformOrigin={{
					vertical: 'top',
					horizontal: 'right',
				}}
			>
				<div style={{ padding: 16, minWidth: 300 }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
						<Typography style={{ fontSize: 14, fontWeight: 500, color: "#111b21" }}>
							Filtros
						</Typography>
						{hasActiveFilters && (
							<IconButton size="small" onClick={clearFilters}>
								<CloseIcon style={{ fontSize: 18 }} />
							</IconButton>
						)}
					</div>

					{Array.isArray(queues) && queues.length > 0 && (
						<div style={{ marginBottom: 12 }}>
							<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 6 }}>
								Filas
							</Typography>
							<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
								{queues.map(queue => (
									<Chip
										key={queue.id}
										label={queue.name}
										size="small"
										onClick={() => toggleFilter("queue", queue.id)}
										style={{
											backgroundColor: selectedQueues.includes(queue.id) ? queue.color : "#ffffff",
											color: selectedQueues.includes(queue.id) ? "#ffffff" : "#111b21",
											border: "1px solid " + queue.color,
											cursor: "pointer"
										}}
									/>
								))}
							</div>
						</div>
					)}

					{Array.isArray(users) && users.length > 0 && (
						<div style={{ marginBottom: 12 }}>
							<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 6 }}>
								Usuários
							</Typography>
							<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
								{users.map(user => (
									<Chip
										key={user.id}
										label={user.name}
										size="small"
										onClick={() => toggleFilter("user", user.id)}
										style={{
											backgroundColor: selectedUsers.includes(user.id) ? "#00a884" : "#ffffff",
											color: selectedUsers.includes(user.id) ? "#ffffff" : "#111b21",
											border: "1px solid #00a884",
											cursor: "pointer"
										}}
									/>
								))}
							</div>
						</div>
					)}

					{Array.isArray(tags) && tags.length > 0 && (
						<div style={{ marginBottom: 12 }}>
							<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 6 }}>
								Etiquetas
							</Typography>
							<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
								{tags.map(tag => (
									<Chip
										key={tag.id}
										label={tag.name}
										size="small"
										onClick={() => toggleFilter("tag", tag.id)}
										style={{
											backgroundColor: selectedTags.includes(tag.id) ? tag.color : "#ffffff",
											color: selectedTags.includes(tag.id) ? "#ffffff" : "#111b21",
											border: "1px solid " + tag.color,
											cursor: "pointer"
										}}
									/>
								))}
							</div>
						</div>
					)}

					{/* Filtro de Conexões */}
					{Array.isArray(whatsapps) && whatsapps.length > 0 && (
						<div style={{ marginBottom: 12 }}>
							<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 6 }}>
								Conexões
							</Typography>
							<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
								{whatsapps.map(whatsapp => (
									<Chip
										key={whatsapp.id}
										label={whatsapp.name}
										size="small"
										onClick={() => toggleFilter("whatsapp", whatsapp.id)}
										style={{
											backgroundColor: selectedWhatsapps.includes(whatsapp.id) ? "#25d366" : "#ffffff",
											color: selectedWhatsapps.includes(whatsapp.id) ? "#ffffff" : "#111b21",
											border: "1px solid #25d366",
											cursor: "pointer"
										}}
									/>
								))}
							</div>
						</div>
					)}

					{/* Filtro de Direção da Mensagem */}
					<div>
						<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 6 }}>
							Direção da Última Mensagem
						</Typography>
						<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
							<Chip
								label="Cliente Aguardando"
								size="small"
								onClick={() => setMessageDirectionFilter(
									messageDirectionFilter === 'waiting_customer' ? null : 'waiting_customer'
								)}
								style={{
									backgroundColor: messageDirectionFilter === 'waiting_customer' ? "#ff9800" : "#ffffff",
									color: messageDirectionFilter === 'waiting_customer' ? "#ffffff" : "#111b21",
									border: "1px solid #ff9800",
									cursor: "pointer"
								}}
							/>
							<Chip
								label="Atendente Aguardando"
								size="small"
								onClick={() => setMessageDirectionFilter(
									messageDirectionFilter === 'waiting_agent' ? null : 'waiting_agent'
								)}
								style={{
									backgroundColor: messageDirectionFilter === 'waiting_agent' ? "#2196f3" : "#ffffff",
									color: messageDirectionFilter === 'waiting_agent' ? "#ffffff" : "#111b21",
									border: "1px solid #2196f3",
									cursor: "pointer"
								}}
							/>
						</div>
					</div>
				</div>
			</Popover>

			{/* Menu de operações (⋮) */}
			<Menu
				anchorEl={operationsMenuAnchor}
				open={Boolean(operationsMenuAnchor)}
				onClose={() => setOperationsMenuAnchor(null)}
				anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
				transformOrigin={{ vertical: "top", horizontal: "right" }}
				PaperProps={{ style: { minWidth: 240 } }}
			>
				<MenuItem
					onClick={() => {
						setSelectionMode(true);
						setSelectedTicketIds(new Set());
						setOperationsMenuAnchor(null);
					}}
					style={{ padding: "10px 16px", gap: 12 }}
				>
					<DeleteIcon style={{ fontSize: 18, color: "#f44336" }} />
					<Typography style={{ fontSize: 14 }}>Selecionar para excluir</Typography>
				</MenuItem>
				<MenuItem
					onClick={() => {
						setOnlyUnread(prev => !prev);
						setOperationsMenuAnchor(null);
					}}
					style={{ padding: "10px 16px", gap: 12 }}
				>
					<UnreadIcon style={{ fontSize: 18, color: onlyUnread ? "#00a884" : "#667781" }} />
					<Typography style={{ fontSize: 14 }}>
						Apenas não lidas {onlyUnread ? "✓" : ""}
					</Typography>
				</MenuItem>
				<Divider />
				<MenuItem
					onClick={() => {
						setAutoAcceptOpen(true);
						setOperationsMenuAnchor(null);
					}}
					style={{ padding: "10px 16px", gap: 12 }}
				>
					<CheckCircleIcon style={{ fontSize: 18, color: "#667781" }} />
					<Typography style={{ fontSize: 14 }}>Aceitar atendimento automaticamente</Typography>
				</MenuItem>
				<MenuItem
					onClick={() => {
						setAutoCloseOpen(true);
						setOperationsMenuAnchor(null);
					}}
					style={{ padding: "10px 16px", gap: 12 }}
				>
					<TimerOffIcon style={{ fontSize: 18, color: "#667781" }} />
					<Typography style={{ fontSize: 14 }}>Encerrar atendimento automaticamente</Typography>
				</MenuItem>
				<MenuItem
					onClick={() => {
						setAssignQueueOpen(true);
						setOperationsMenuAnchor(null);
					}}
					style={{ padding: "10px 16px", gap: 12 }}
				>
					<AssignQueueIcon style={{ fontSize: 18, color: "#667781" }} />
					<Typography style={{ fontSize: 14 }}>Fila de atribuição</Typography>
				</MenuItem>
			</Menu>

			{/* Modal: Nova conversa */}
			{newConversationOpen && (
				<NewTicketModal
					modalOpen={newConversationOpen}
					onClose={(ticket) => {
						setNewConversationOpen(false);
						if (ticket?.id) {
							handleTicketClick(ticket);
						}
					}}
				/>
			)}

			{/* Modal: Aceitar atendimento automaticamente */}
			<Dialog
				open={autoAcceptOpen}
				onClose={() => setAutoAcceptOpen(false)}
				PaperProps={{ style: { borderRadius: 12, minWidth: 340 } }}
			>
				<DialogTitle style={{ paddingBottom: 4 }}>
					<Typography style={{ fontSize: 16, fontWeight: 600 }}>Aceitar atendimento automaticamente</Typography>
				</DialogTitle>
				<DialogContent>
					<Typography style={{ fontSize: 13, color: "#667781", marginBottom: 16 }}>
						Move conversas da aba <strong>Aguardando</strong> para <strong>Atendendo</strong> automaticamente
						após o tempo definido sem ninguém aceitar manualmente.
					</Typography>
					<FormControlLabel
						control={
							<Switch
								checked={autoAcceptEnabled}
								onChange={e => setAutoAcceptEnabled(e.target.checked)}
								color="primary"
							/>
						}
						label={<Typography style={{ fontSize: 14 }}>{autoAcceptEnabled ? "Ativado" : "Desativado"}</Typography>}
						style={{ marginBottom: 16 }}
					/>
					{autoAcceptEnabled && (
						<>
							<div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 8 }}>
								<div>
									<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 4 }}>Horas</Typography>
									<TextField
										type="number"
										variant="outlined"
										size="small"
										value={autoAcceptHours}
										onChange={e => setAutoAcceptHours(Math.max(0, parseInt(e.target.value) || 0))}
										inputProps={{ min: 0, max: 72, style: { width: 60, textAlign: "center" } }}
									/>
								</div>
								<div>
									<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 4 }}>Minutos</Typography>
									<TextField
										type="number"
										variant="outlined"
										size="small"
										value={autoAcceptMinutes}
										onChange={e => setAutoAcceptMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
										inputProps={{ min: 0, max: 59, style: { width: 60, textAlign: "center" } }}
									/>
								</div>
							</div>
							<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 12 }}>
								Tempo configurado: {String(autoAcceptHours).padStart(2, "0")}:{String(autoAcceptMinutes).padStart(2, "0")}
							</Typography>
							<Typography style={{ fontSize: 12, color: "#999" }}>
								O responsável existente é mantido. Grupos e tickets fechados não são afetados.
							</Typography>
						</>
					)}
				</DialogContent>
				<DialogActions style={{ padding: "8px 16px" }}>
					<Button onClick={() => setAutoAcceptOpen(false)} style={{ color: "#667781" }}>
						Cancelar
					</Button>
					<Button
						onClick={handleSaveAutoAccept}
						variant="contained"
						style={{ backgroundColor: "#00a884", color: "#fff" }}
						disabled={autoAcceptSaving}
					>
						{autoAcceptSaving ? <CircularProgress size={16} color="inherit" /> : "Salvar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Modal: Encerrar atendimento automaticamente */}
			<Dialog
				open={autoCloseOpen}
				onClose={() => setAutoCloseOpen(false)}
				PaperProps={{ style: { borderRadius: 12, minWidth: 340 } }}
			>
				<DialogTitle style={{ paddingBottom: 4 }}>
					<Typography style={{ fontSize: 16, fontWeight: 600 }}>Encerrar atendimento automaticamente</Typography>
				</DialogTitle>
				<DialogContent>
					<Typography style={{ fontSize: 13, color: "#667781", marginBottom: 16 }}>
						Encerra o atendimento automaticamente após o tempo definido sem novas mensagens.
						O contato será movido para "Resolvidas".
					</Typography>
					<FormControlLabel
						control={
							<Switch
								checked={autoCloseEnabled}
								onChange={e => setAutoCloseEnabled(e.target.checked)}
								color="primary"
							/>
						}
						label={<Typography style={{ fontSize: 14 }}>{autoCloseEnabled ? "Ativado" : "Desativado"}</Typography>}
						style={{ marginBottom: 16 }}
					/>
					{autoCloseEnabled && (
						<div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 8 }}>
							<div>
								<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 4 }}>Horas</Typography>
								<TextField
									type="number"
									variant="outlined"
									size="small"
									value={autoCloseHours}
									onChange={e => setAutoCloseHours(Math.max(0, parseInt(e.target.value) || 0))}
									inputProps={{ min: 0, max: 72, style: { width: 60, textAlign: "center" } }}
								/>
							</div>
							<div>
								<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 4 }}>Minutos</Typography>
								<TextField
									type="number"
									variant="outlined"
									size="small"
									value={autoCloseMinutes}
									onChange={e => setAutoCloseMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
									inputProps={{ min: 0, max: 59, style: { width: 60, textAlign: "center" } }}
								/>
							</div>
						</div>
					)}
					{autoCloseEnabled && (
						<Typography style={{ fontSize: 12, color: "#667781" }}>
							Tempo configurado: {String(autoCloseHours).padStart(2, "0")}:{String(autoCloseMinutes).padStart(2, "0")}
						</Typography>
					)}
					<Typography style={{ fontSize: 12, color: "#999", marginTop: 12 }}>
						Se a pesquisa CSAT estiver ativada, ela será enviada ao encerrar.
					</Typography>
				</DialogContent>
				<DialogActions style={{ padding: "8px 16px" }}>
					<Button onClick={() => setAutoCloseOpen(false)} style={{ color: "#667781" }}>
						Cancelar
					</Button>
					<Button
						onClick={handleSaveAutoClose}
						variant="contained"
						style={{ backgroundColor: "#00a884", color: "#fff" }}
						disabled={autoCloseSaving}
					>
						{autoCloseSaving ? <CircularProgress size={16} color="inherit" /> : "Salvar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Modal: Fila de atribuição */}
			<Dialog
				open={assignQueueOpen}
				onClose={() => setAssignQueueOpen(false)}
				PaperProps={{ style: { borderRadius: 12, minWidth: 360 } }}
			>
				<DialogTitle style={{ paddingBottom: 4 }}>
					<Typography style={{ fontSize: 16, fontWeight: 600 }}>Fila de atribuição</Typography>
				</DialogTitle>
				<DialogContent>
					<Typography style={{ fontSize: 13, color: "#667781", marginBottom: 16 }}>
						Distribui automaticamente novos chats entre os membros selecionados da equipe.
					</Typography>
					<FormControlLabel
						control={
							<Switch
								checked={assignQueueEnabled}
								onChange={e => setAssignQueueEnabled(e.target.checked)}
								color="primary"
							/>
						}
						label={<Typography style={{ fontSize: 14 }}>{assignQueueEnabled ? "Ativada" : "Desativada"}</Typography>}
						style={{ marginBottom: 16 }}
					/>
					{assignQueueEnabled && (
						<>
							<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 6 }}>Modo de distribuição</Typography>
							<Select
								fullWidth
								variant="outlined"
								value={assignQueueMode}
								onChange={e => setAssignQueueMode(e.target.value)}
								style={{ marginBottom: 16 }}
								inputProps={{ style: { fontSize: 13, padding: "10px 14px" } }}
							>
								<MenuItem value="round_robin">Alternar entre membros (1 lead por vez)</MenuItem>
								<MenuItem value="batch">Enviar X leads antes de trocar de membro</MenuItem>
							</Select>
							{assignQueueMode === "batch" && (
								<div style={{ marginBottom: 16 }}>
									<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 4 }}>Leads por atendente (X)</Typography>
									<TextField
										type="number"
										variant="outlined"
										size="small"
										fullWidth
										value={assignQueueBatchSize}
										onChange={e => setAssignQueueBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
										inputProps={{ min: 1 }}
									/>
								</div>
							)}
							<Typography style={{ fontSize: 12, color: "#667781", marginBottom: 8 }}>Membros participantes</Typography>
							<div style={{ border: "1px solid #e9edef", borderRadius: 8, overflow: "hidden" }}>
								{users.map(u => (
									<div
										key={u.id}
										style={{
											display: "flex",
											alignItems: "center",
											padding: "8px 12px",
											cursor: "pointer",
											borderBottom: "1px solid #f0f2f5",
											backgroundColor: assignQueueUserIds.includes(u.id) ? "#e8f5e9" : "#fff",
										}}
										onClick={() => setAssignQueueUserIds(prev =>
											prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
										)}
									>
										{assignQueueUserIds.includes(u.id)
											? <CheckBoxIcon style={{ color: "#00a884", fontSize: 20, marginRight: 10 }} />
											: <CheckBoxOutlineBlankIcon style={{ color: "#ccc", fontSize: 20, marginRight: 10 }} />
										}
										<Typography style={{ fontSize: 13 }}>{u.name}</Typography>
									</div>
								))}
							</div>
							<Typography style={{ fontSize: 11, color: "#999", marginTop: 10 }}>
								Reatribuição automática ocorre somente quando o contato estiver sem responsável ou resolvido.
							</Typography>
						</>
					)}
				</DialogContent>
				<DialogActions style={{ padding: "8px 16px" }}>
					<Button onClick={() => setAssignQueueOpen(false)} style={{ color: "#667781" }}>
						Cancelar
					</Button>
					<Button
						onClick={handleSaveAssignQueue}
						variant="contained"
						style={{ backgroundColor: "#00a884", color: "#fff" }}
						disabled={assignQueueSaving}
					>
						{assignQueueSaving ? <CircularProgress size={16} color="inherit" /> : "Salvar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Área de chat */}
			{shouldShowChat && (
				<div className={`${classes.chatArea} ${isMobile ? classes.chatAreaMobile : ""}`}>
					{selectedTicket ? (
						<>
							{/* Chat Header */}
							<div className={`${classes.chatHeader} ${isMobile ? classes.chatHeaderMobile : ""}`}>
								<IconButton
									onClick={handleBackToList}
									style={{ marginRight: 8 }}
									aria-label="Voltar para atendimentos"
								>
									<ArrowBackIcon />
								</IconButton>
								<Avatar
									src={selectedTicket.contact?.urlPicture || selectedTicket.contact?.profilePicUrl}
									onClick={handleOpenContactModal}
									style={{ cursor: selectedTicket?.contact ? "pointer" : "default" }}
								>
									{selectedTicket.contact?.name?.charAt(0)}
								</Avatar>
								<div
									className={classes.chatHeaderInfo}
									onClick={handleOpenContactModal}
									style={{ cursor: selectedTicket?.contact ? "pointer" : "default" }}
								>
									<Typography style={{ fontSize: 16, fontWeight: 500, color: "#111b21" }}>
										{selectedTicket.contact?.name || "Sem nome"}
									</Typography>
									{!isMobile && (
										<Typography style={{ fontSize: 13, color: "#667781" }}>
											{selectedTicket.contact?.number}
										</Typography>
									)}
								</div>

								{isMobile && (
									<>
										<IconButton
											size="small"
											onClick={() => setMobileActionsOpen(prev => !prev)}
											className={classes.mobileHeaderToggle}
										>
											{mobileActionsOpen ? <CloseIcon /> : <MenuIcon />}
										</IconButton>
										<Collapse in={mobileActionsOpen} className={classes.mobileActionsCollapse}>
											<div className={classes.mobileHeaderActions}>
												{renderTicketActionButtons(32, 18)}
											</div>
										</Collapse>
									</>
								)}

								{!isMobile && (
									<>
										<div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
											{renderTicketActionButtons()}
										</div>
									</>
								)}
							</div>

							<div className={classes.chatWorkspace}>
								<div className={classes.chatConversationPane}>
									{/* Messages */}
									<div className={classes.chatMessages} ref={messagesContainerRef}>
								{/* Status de digitação */}
								{isTyping && (
									<div style={{
										display: 'flex',
										alignItems: 'center',
										gap: 8,
										padding: '8px 12px',
										margin: '4px 0',
										backgroundColor: '#f0f2f5',
										borderRadius: 18,
										alignSelf: 'flex-start',
										maxWidth: '70%'
									}}>
										<div style={{
											width: 8,
											height: 8,
											borderRadius: '50%',
											backgroundColor: '#25d366',
											animation: 'pulse 1.5s ease-in-out infinite'
										}} />
										<Typography style={{
											fontSize: 14,
											color: '#111b21',
											fontStyle: 'italic'
										}}>
											{typingUser || 'Alguém'} está digitando...
										</Typography>
									</div>
								)}

								{loadingMore && (
									<div style={{
										display: 'flex',
										justifyContent: 'center',
										padding: '16px',
										color: '#667781'
									}}>
										<Typography variant="caption">Carregando mensagens antigas...</Typography>
									</div>
								)}

								<>
									{groupedMessages.map((item) => {
										// Se for um grupo de mensagens com múltiplos arquivos
										if (item.isGroup) {
											const firstMessage = item.messages[0];
											const allDeleted = item.messages.every(msg => msg.isDeleted);
											const someDeleted = item.messages.some(msg => msg.isDeleted);

											return (
												<div
													key={item.id}
													className={classes.messageGroup}
													style={{
														alignItems: firstMessage.fromMe ? "flex-end" : "flex-start",
														position: "relative",
														contentVisibility: "auto",
														containIntrinsicSize: "88px",
													}}
												>
													<div
														className={classes.messageBubble}
														style={{
															backgroundColor: getBubbleBackgroundColor(firstMessage),
															padding: "8px 12px",
															position: "relative",
															cursor: !allDeleted ? "pointer" : "default"
														}}
													onDoubleClick={(e) => {
														if (!allDeleted) {
															handleMessageMenuOpen(e, firstMessage, item.messages);
														}
													}}
														onMouseEnter={(e) => {
															const menuBtn = e.currentTarget.querySelector('.message-menu-btn');
															if (menuBtn) menuBtn.style.opacity = '1';
														}}
														onMouseLeave={(e) => {
															const menuBtn = e.currentTarget.querySelector('.message-menu-btn');
															if (menuBtn && !messageMenuAnchor) menuBtn.style.opacity = '0';
														}}
													>
														{!allDeleted && (
															<IconButton
																size="small"
																className="message-menu-btn"
																onClick={(e) => handleMessageMenuOpen(e, firstMessage, item.messages)}
																style={{
																	position: "absolute",
																	top: "4px",
																	right: "4px",
																	left: "auto",
																	opacity: 0,
																	transition: "opacity 0.2s",
																	padding: "4px",
																	backgroundColor: "rgba(0,0,0,0.05)",
																	zIndex: 10,
																}}
															>
																<MoreVertIcon style={{ fontSize: 16 }} />
															</IconButton>
														)}

														{allDeleted ? (
															<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
																<Typography style={{ color: "#d32f2f", fontSize: "14px", fontStyle: "italic" }}>
																	{item.messages.length} mensagens apagadas
																</Typography>
																<IconButton
																	size="small"
																	onClick={() => setViewingDeletedMessage(viewingDeletedMessage === firstMessage.id ? null : firstMessage.id)}
																	style={{ padding: "4px" }}
																>
																	<VisibilityIcon style={{ fontSize: 18, color: "#667781" }} />
																</IconButton>
															</div>
														) : (
															<>
																{/* Renderiza grid de múltiplos arquivos */}
																{renderMediaGrid(item.messages)}

																{someDeleted && (
																	<Typography style={{ fontSize: "12px", color: "#d32f2f", fontStyle: "italic", marginTop: "4px" }}>
																		Algumas mensagens foram apagadas
																	</Typography>
																)}
															</>
														)}

														{allDeleted && viewingDeletedMessage === firstMessage.id && (
															<div style={{
																marginTop: "8px",
																padding: "8px",
																backgroundColor: "rgba(0,0,0,0.05)",
																borderRadius: "4px",
																borderLeft: "3px solid #d32f2f"
															}}>
																{renderMediaGrid(item.messages, true)}
															</div>
														)}

														<div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
															{!allDeleted && (
																<Typography style={{ fontSize: "11px", color: "#667781", fontWeight: 500 }}>
																	{firstMessage.fromMe ? (firstMessage.fromAgent ? "Automação" : (firstMessage.user?.name || user.name)) : getMessageSenderLabel(firstMessage)} •
																</Typography>
															)}
															<Typography className={classes.messageTime}>
																{formatMessageTime(firstMessage.createdAt)}
															</Typography>
														</div>
													</div>
												</div>
											);
										}

										return (
											<div
												key={item.id}
												className={classes.messageGroup}
												style={{
													alignItems: item.fromMe ? "flex-end" : "flex-start",
													position: "relative",
													contentVisibility: "auto",
													containIntrinsicSize: "72px",
												}}
											>
												<div
													className={classes.messageBubble}
													style={{
														backgroundColor: getBubbleBackgroundColor(item),
														padding: "8px 12px",
														position: "relative",
														cursor: item.isDeleted ? "default" : "pointer"
													}}
													onDoubleClick={(e) => {
														if (!item.isDeleted) {
															handleMessageMenuOpen(e, item);
														}
													}}
													onMouseEnter={(e) => {
														const menuBtn = e.currentTarget.querySelector('.message-menu-btn');
														if (menuBtn) menuBtn.style.opacity = '1';
													}}
													onMouseLeave={(e) => {
														const menuBtn = e.currentTarget.querySelector('.message-menu-btn');
														if (menuBtn && !messageMenuAnchor) menuBtn.style.opacity = '0';
													}}
												>
													{!item.isDeleted && (
														<IconButton
															size="small"
															className="message-menu-btn"
															onClick={(e) => handleMessageMenuOpen(e, item)}
															style={{
																position: "absolute",
																top: "4px",
																right: "4px",
																left: "auto",
																opacity: 0,
																transition: "opacity 0.2s",
																padding: "4px",
																backgroundColor: "rgba(0,0,0,0.05)",
																zIndex: 10,
															}}
														>
															<MoreVertIcon style={{ fontSize: 16 }} />
														</IconButton>
													)}

													{item.isDeleted ? (
														<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
															<Typography style={{ color: "#d32f2f", fontSize: "14px", fontStyle: "italic" }}>
																Mensagem apagada
															</Typography>
															<IconButton
																size="small"
																onClick={() => setViewingDeletedMessage(viewingDeletedMessage === item.id ? null : item.id)}
																style={{ padding: "4px" }}
															>
																<VisibilityIcon style={{ fontSize: 18, color: "#667781" }} />
															</IconButton>
														</div>
													) : (
														<>
															{/* Quoted Message */}
															{item.quotedMsg && (
																<div style={{
																	backgroundColor: getQuotedBackgroundColor(item),
																	borderLeft: `4px solid ${getQuotedBorderColor(item)}`,
																	padding: '6px 8px',
																	borderRadius: '4px',
																	marginBottom: '6px',
																	cursor: 'pointer'
																}}>
																	<Typography style={{ fontSize: 12, color: getQuotedBorderColor(item), fontWeight: 500, marginBottom: 2 }}>
																		{item.quotedMsg.fromMe ? (item.quotedMsg.fromAgent ? "Automação" : (item.quotedMsg.user?.name || user.name)) : getMessageSenderLabel(item.quotedMsg)}
																	</Typography>
																	<Typography style={{
																		fontSize: 13,
																		color: '#667781',
																		overflow: 'hidden',
																		textOverflow: 'ellipsis',
																		whiteSpace: 'nowrap'
																	}}>
																		{renderMessageContent(item.quotedMsg)}
																	</Typography>
																</div>
															)}
															{renderMessageContent(item)}
														</>
													)}

													{item.isDeleted && viewingDeletedMessage === item.id && (
														<div style={{
															marginTop: "8px",
															padding: "8px",
															backgroundColor: "rgba(0,0,0,0.05)",
															borderRadius: "4px",
															borderLeft: "3px solid #d32f2f"
														}}>
															{renderMessageContent(item)}
														</div>
													)}

													<div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
														{!item.isDeleted && (
															<Typography style={{ fontSize: "11px", color: "#667781", fontWeight: 500 }}>
																{item.fromMe ? (item.fromAgent ? "Automação" : (item.user?.name || user.name)) : getMessageSenderLabel(item)} •
															</Typography>
														)}
														<Typography className={classes.messageTime}>
															{formatMessageDateTime(item.createdAt)}
														</Typography>
														{item.isEdited && !item.isDeleted && (
															<EditIcon style={{ fontSize: 14, color: "#667781" }} />
														)}
														{item.sendError && !item.isDeleted && (
															<Tooltip title="Falha ao enviar">
																<BlockIcon style={{ fontSize: 16, color: "#f44336" }} />
															</Tooltip>
														)}
														{item.fromMe && !item.isDeleted && (
															<>
																{item.ack === 0 && (
																	<DoneIcon style={{ fontSize: 16, color: "#667781" }} />
																)}
																{item.ack === 1 && (
																	<DoneIcon style={{ fontSize: 16, color: "#667781" }} />
																)}
																{item.ack === 2 && (
																	<DoneAllIcon style={{ fontSize: 16, color: "#667781" }} />
																)}
																{(item.ack === 3 || item.ack === 4) && (
																	<DoneAllIcon style={{ fontSize: 16, color: "#34b7f1" }} />
																)}
															</>
														)}
													</div>
												</div>
											</div>
										);
									})}
									<div ref={messagesEndRef} />
								</>
							</div>

							{/* Replying Message Preview */}
							{replyingTo && (
								<div style={{
									backgroundColor: '#f0f2f5',
									borderTop: '1px solid #e9edef',
									padding: '8px 16px',
									display: 'flex',
									alignItems: 'center',
									gap: 8
								}}>
									<div style={{
										width: 4,
										height: 40,
										backgroundColor: '#00a884',
										borderRadius: 2
									}} />
									<div style={{ flex: 1, minWidth: 0 }}>
										<Typography style={{ fontSize: 12, color: '#00a884', fontWeight: 500 }}>
											Respondendo a {replyingTo.fromMe ? (replyingTo.fromAgent ? "Automação" : (replyingTo.user?.name || user.name)) : getMessageSenderLabel(replyingTo)}
										</Typography>
										<Typography style={{
											fontSize: 13,
											color: '#667781',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap'
										}}>
											{replyingTo.body || 'Mídia'}
										</Typography>
									</div>
									<IconButton
										size="small"
										onClick={() => setReplyingTo(null)}
										style={{ color: '#54656f' }}
									>
										<CloseIcon />
									</IconButton>
								</div>
							)}

							{/* Input */}
							{cameraModalOpen && (
								<CameraModal
									isOpen={cameraModalOpen}
									onRequestClose={() => setCameraModalOpen(false)}
									onCapture={handleCameraCapture}
								/>
							)}
							<MediaDrivePickerModal
								open={mediaDriveOpen}
								onClose={() => setMediaDriveOpen(false)}
								onSelect={handleSelectFromMediaDrive}
								allowedTypes={["image", "video", "audio", "document"]}
								title="Selecionar do Mídia Drive"
							/>
							{sendContactModalOpen && (
								<ContactSendModal
									modalOpen={sendContactModalOpen}
									onClose={handleCloseContactSendModal}
								/>
							)}
							{buttonModalOpen && selectedTicket && (
								<ButtonModal
									modalOpen={buttonModalOpen}
									onClose={() => setButtonModalOpen(false)}
									ticketId={selectedTicket.id}
								/>
							)}
							{selectedTicket?.status === "pending" && (
								<div style={{
									backgroundColor: '#fff8e1',
									borderTop: '1px solid #ffe082',
									padding: '7px 16px',
									textAlign: 'center',
									fontSize: 12,
									color: '#7a5800',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: 6
								}}>
									<span>⚠️</span>
									<span>Aceite o ticket para enviar mensagens</span>
								</div>
							)}
							<div className={classes.chatInput}>
								{!isMobile && showEmojiPicker && (
									<div style={{
										position: 'absolute',
										bottom: '60px',
										left: '10px',
										backgroundColor: '#fff',
										border: '1px solid #e9edef',
										borderRadius: '8px',
										padding: '8px',
										display: 'grid',
										gridTemplateColumns: 'repeat(8, 1fr)',
										gap: '4px',
										maxWidth: '320px',
										boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
										zIndex: 1000
									}}>
										{['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '👍', '👎', '👏', '🙌', '🤝', '🙏', '❤️', '🔥', '💯', '✅', '❌'].map((emoji) => (
											<span
												key={emoji}
												onClick={() => handleEmojiSelect(emoji)}
												style={{
													fontSize: '24px',
													cursor: 'pointer',
													padding: '4px',
													borderRadius: '4px',
													transition: 'background-color 0.2s',
												}}
												onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f2f5'}
												onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
											>
												{emoji}
											</span>
										))}
									</div>
								)}
								<input
									type="file"
									ref={fileInputRef}
									style={{ display: 'none' }}
									onChange={handleFileUpload}
									multiple
									accept="image/*,video/*,audio/*"
								/>
								<input
									type="file"
									ref={documentInputRef}
									style={{ display: 'none' }}
									onChange={handleFileUpload}
									multiple
									accept="application/*,text/*"
								/>
								{!isMobile && (
									<>
										<IconButton
											size="small"
											onClick={() => setSignMessage(!signMessage)}
											style={{ color: signMessage ? '#00a884' : '#54656f' }}
											title="Assinatura (nome do atendente)"
										>
											<SignatureIcon />
										</IconButton>
										<IconButton
											size="small"
											onClick={() => setScheduleModalOpen(true)}
											style={{ color: '#54656f' }}
											title="Agendamento"
										>
											<ScheduleIcon />
										</IconButton>
										<IconButton
											size="small"
											onClick={() => setShowEmojiPicker(!showEmojiPicker)}
											style={{ color: '#54656f' }}
										>
											<EmojiIcon />
										</IconButton>
										<IconButton
											size="small"
											onClick={() => setQuickMessagesOpen((prev) => !prev)}
											style={{ color: quickMessagesOpen ? '#00a884' : '#54656f' }}
											title={quickMessagesOpen ? "Fechar painel de respostas rápidas" : "Abrir painel de respostas rápidas"}
										>
											<FlashOnIcon />
										</IconButton>
										<IconButton
											size="small"
											onClick={handleOpenChatToolsMenu}
											style={{ color: chatToolsAnchorEl ? '#00a884' : '#54656f' }}
											title="Ferramentas do chat"
										>
											<AddIcon />
										</IconButton>
										<IconButton
											size="small"
											onClick={handleTogglePrivateMessage}
											style={{ color: privateMessage ? '#b7791f' : '#54656f' }}
											title="Nota privada"
										>
											<QuickMessageIcon />
										</IconButton>
									</>
								)}
								<Menu
									anchorEl={chatToolsAnchorEl}
									keepMounted
									open={Boolean(chatToolsAnchorEl)}
									onClose={handleCloseChatToolsMenu}
								>
									<MenuItem onClick={handleOpenImageVideoPicker}>
										<PermMediaIcon fontSize="small" style={{ marginRight: 12, color: '#1976d2' }} />
										Fotos e vídeos
									</MenuItem>
									<MenuItem onClick={handleOpenMediaDrive}>
										<FolderIcon fontSize="small" style={{ marginRight: 12, color: '#1976d2' }} />
										Selecionar do Mídia Drive
									</MenuItem>
									<MenuItem onClick={handleOpenCameraModal}>
										<CameraAltIcon fontSize="small" style={{ marginRight: 12, color: '#e91e63' }} />
										Câmera
									</MenuItem>
									<MenuItem onClick={handleOpenDocumentPicker}>
										<DocumentIcon fontSize="small" style={{ marginRight: 12, color: '#7f66ff' }} />
										Documento
									</MenuItem>
									<MenuItem onClick={handleOpenContactSendModal}>
										<PersonIcon fontSize="small" style={{ marginRight: 12, color: '#2196f3' }} />
										Contato
									</MenuItem>
									<MenuItem onClick={handlePrepareMeetLink}>
										<DuoIcon fontSize="small" style={{ marginRight: 12, color: '#00a884' }} />
										Vídeo chamada
									</MenuItem>
									<MenuItem onClick={handleOpenButtonModal}>
										<MenuIcon fontSize="small" style={{ marginRight: 12, color: '#54656f' }} />
										Botões
									</MenuItem>
								</Menu>
								<InputBase
									className={classes.inputField}
									disabled={selectedTicket?.status === "pending"}
									placeholder={
										selectedTicket?.status === "pending"
											? "Aceite o ticket para enviar mensagens"
											: privateMessage ? "Escreva uma nota privada..." : "Digite uma mensagem ou / para respostas rápidas"
									}
									value={inputMessage}
									inputRef={inputMessageRef}
									style={{
										backgroundColor: selectedTicket?.status === "pending" ? '#f5f5f5' : privateMessage ? '#f0e68c' : '#ffffff',
										color: selectedTicket?.status === "pending" ? '#9e9e9e' : privateMessage ? '#5f4b00' : '#111b21',
									}}
									onChange={(e) => {
										const value = e.target.value;
										setInputMessage(value);

										updateQuickReplyContext(value);

										const now = Date.now();
										if (selectedTicket && value.length > 0 && now - typingEmitRef.current > 1500) {
											typingEmitRef.current = now;
											emit(`company-${user.companyId}-typing`, {
												ticketId: selectedTicket.id,
												isTyping: true,
												user: user.name
											});
										}
									}}
									onFocus={() => {
										keepInputFocusRef.current = true;
									}}
									onBlur={(event) => {
										const fallbackActive = typeof document !== "undefined" ? document.activeElement : null;
										const nextElement = event?.relatedTarget || fallbackActive;
										const isExternal = nextElement && nextElement !== document.body && nextElement !== inputMessageRef.current;
										if (isExternal) {
											keepInputFocusRef.current = false;
											return;
										}
										keepInputFocusRef.current = true;
										requestAnimationFrame(() => {
											if (inputMessageRef.current) {
												inputMessageRef.current.focus({ preventScroll: true });
											}
										});
									}}
									onKeyPress={handleKeyPress}
									onKeyDown={(e) => {
										handleQuickReplyKeyDown(e);
									}}
									onPaste={handlePaste}
									multiline
									maxRows={4}
								/>

								{/* Sugestões de respostas rápidas */}
								{showQuickReplies && filteredQuickMessages.length > 0 && (
									<Paper
										elevation={3}
										style={{
											position: 'absolute',
											bottom: '100%',
											left: 0,
											right: 0,
											maxHeight: '200px',
											overflowY: 'auto',
											zIndex: 1000,
											marginBottom: '8px'
										}}
									>
										<Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #e0e0e0' }}>
											<Typography variant="caption" style={{ fontWeight: 600 }}>
												Mensagens Rápidas
											</Typography>
											<IconButton size="small" onClick={() => {
												setShowQuickReplies(false);
												setFilteredQuickMessages([]);
												setSelectedQuickIndex(-1);
											}}>
												<CloseIcon fontSize="small" />
											</IconButton>
										</Box>
										<List dense>
											{filteredQuickMessages.map((msg, index) => (
												<ListItem
													key={msg.id}
													button
													selected={index === selectedQuickIndex}
													onClick={() => handleSelectQuickReply(msg.message)}
													style={{
														backgroundColor: index === selectedQuickIndex ? '#e3f2fd' : 'transparent'
													}}
												>
													<ListItemText
														primary={`/${msg.shortcut || msg.shortcode || ""} - ${msg.message?.substring(0, 25) || ""}${msg.message?.length > 25 ? "..." : ""}`}
														primaryTypographyProps={{
															style: {
																fontSize: '14px',
																color: index === selectedQuickIndex ? '#1976d2' : 'inherit'
															}
														}}
													/>
												</ListItem>
											))}
										</List>
									</Paper>
								)}
								{inputMessage.trim() ? (
									<IconButton
										color="primary"
										onClick={handleSendMessage}
										disabled={selectedTicket?.status === "pending"}
									>
										<SendIcon />
									</IconButton>
								) : recording ? (
									<div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#f0f2f5', padding: '8px 12px', borderRadius: 20, flex: 1 }}>
										<IconButton
											size="small"
											onClick={handleCancelRecording}
											style={{ color: '#f44336' }}
											title="Cancelar gravação"
										>
											<CloseIcon />
										</IconButton>
										<div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
											<div style={{
												width: 8,
												height: 8,
												borderRadius: '50%',
												backgroundColor: '#f44336',
												animation: 'pulse 1.5s ease-in-out infinite'
											}} />
											<Typography style={{ fontSize: 14, color: '#111b21', fontFamily: 'monospace' }}>
												{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
											</Typography>
										</div>
										<IconButton
											color="primary"
											onClick={handleStopRecording}
											style={{ backgroundColor: '#00a884', color: '#fff' }}
											title="Enviar áudio"
										>
											<SendIcon />
										</IconButton>
									</div>
								) : (
									<IconButton
										color="primary"
										onClick={handleStartRecording}
										style={{ color: '#54656f' }}
									>
										<MicIcon />
									</IconButton>
								)}
							</div>
								</div>
							{!isMobile && selectedTicket && (
								<QuickRepliesModal
									open={quickMessagesOpen}
									onClose={() => setQuickMessagesOpen(false)}
									onSelect={handleSelectQuickMessage}
									variant="sidebar"
								/>
							)}
							</div>
						</>
					) : (
						<div className={classes.welcomeContainer}>
							<ChatIcon className={classes.welcomeIcon} />
							<div className={classes.welcomeTitle}>
								Atendimentos
							</div>
							<div className={classes.welcomeText}>
								Selecione um atendimento para visualizar a conversa
								<br />
								ou inicie um novo atendimento
							</div>
						</div>
					)}
				</div>
			)}

			{/* Modal de Agendamento */}
			{scheduleModalOpen && selectedTicket && (
				<ScheduleModal
					open={scheduleModalOpen}
					onClose={() => setScheduleModalOpen(false)}
					aria-labelledby="form-dialog-title"
					contactId={selectedTicket.contact?.id}
				/>
			)}

			{/* Modal de Respostas Rápidas */}
			{isMobile && (
				<QuickRepliesModal
					open={quickMessagesOpen}
					onClose={() => setQuickMessagesOpen(false)}
					onSelect={handleSelectQuickMessage}
				/>
			)}

			{/* Modal de Preview de Mídia */}
			<MediaPreviewModal
				open={mediaPreviewOpen}
				onClose={() => {
					setMediaPreviewOpen(false);
					setSelectedFile(null);
					setSelectedFiles([]);
					setMediaPreviewCaption("");
				}}
				file={selectedFile}
				files={selectedFiles}
				initialCaption={mediaPreviewCaption}
				onSend={handleSendMedia}
			/>

			{/* Menu de Ações da Mensagem */}
			<Menu
				anchorEl={messageMenuAnchor}
				open={Boolean(messageMenuAnchor)}
				onClose={handleMessageMenuClose}
			>
				<MenuItem
					onClick={() => {
						handleReplyMessage(selectedMessage);
						handleMessageMenuClose();
					}}
				>
					Responder
				</MenuItem>
				{/* Copiar Texto */}
				{(selectedMessage?.body || selectedMessage?.caption || selectedMessage?.mediaCaption) && (
					<MenuItem
						onClick={() => {
							const textToCopy = selectedMessage?.caption || selectedMessage?.mediaCaption || selectedMessage?.body || "";
							navigator.clipboard.writeText(textToCopy);
							handleMessageMenuClose();
						}}
					>
						Copiar Texto
					</MenuItem>
				)}
				{/* Copiar Link da mídia */}
				{selectedMessage?.mediaUrl && (
					<MenuItem
						onClick={() => {
							navigator.clipboard.writeText(selectedMessage.mediaUrl)
								.then(() => toast.success("Link copiado com sucesso."))
								.catch(() => toast.error("Não foi possível copiar o link."));
							handleMessageMenuClose();
						}}
					>
						Copiar Link
					</MenuItem>
				)}
				{/* Baixar Arquivo(s) */}
				{selectedMessageGroup.length > 1 && (
					<MenuItem
						onClick={() => {
							selectedMessageGroup.forEach(downloadMessageMedia);
							handleMessageMenuClose();
						}}
					>
						Baixar Todos os Arquivos
					</MenuItem>
				)}
				{selectedMessageGroup.length > 1 ? (
					selectedMessageGroup.map((message) => (
						<MenuItem
							key={`download-${message.id}`}
							onClick={() => {
								downloadMessageMedia(message);
								handleMessageMenuClose();
							}}
						>
							{`Baixar ${getMediaDownloadName(message)}`}
						</MenuItem>
					))
				) : selectedMessage?.mediaUrl && (
					<MenuItem
						onClick={() => {
							downloadMessageMedia(selectedMessage);
							handleMessageMenuClose();
						}}
					>
						Baixar Arquivo
					</MenuItem>
				)}
				{selectedMessage?.fromMe && (
					<MenuItem
						onClick={() => {
							setEditModalOpen(true);
							handleMessageMenuClose();
						}}
					>
						Editar
					</MenuItem>
				)}
				<MenuItem
					onClick={() => {
						setDeleteModalOpen(true);
						handleMessageMenuClose();
					}}
				>
					Deletar
				</MenuItem>
				<MenuItem
					onClick={() => {
						setForwardModalOpen(true);
						handleMessageMenuClose();
					}}
				>
					Encaminhar
				</MenuItem>
			</Menu>

			{/* Modal de Confirmação de Exclusão */}
			<DeleteConfirmModal
				open={deleteModalOpen}
				onClose={() => setDeleteModalOpen(false)}
				onConfirm={handleDeleteMessage}
				messageText={selectedMessage?.body}
			/>

			{/* Modal de Edição de Mensagem */}
			<EditMessageModal
				open={editModalOpen}
				onClose={() => setEditModalOpen(false)}
				onSave={handleEditMessage}
				initialMessage={selectedMessage?.body}
			/>

			{/* Modal de Encaminhamento */}
			<ForwardMessageModal
				open={forwardModalOpen}
				onClose={() => setForwardModalOpen(false)}
				onForward={handleForwardMessage}
				message={selectedMessage}
			/>

			{/* Modal de Galeria de Mídia */}
			<MediaGalleryModal
				open={mediaGalleryOpen}
				onClose={() => setMediaGalleryOpen(false)}
				medias={galleryMedias}
				initialIndex={galleryInitialIndex}
				onDelete={(media) => {
					// Encontra a mensagem original pelo ID
					const message = messages.find(msg => msg.id === media.id);
					if (message) {
						setSelectedMessage(message);
						setDeleteModalOpen(true);
						setMediaGalleryOpen(false);
					}
				}}
				onForward={(media) => {
					// Encontra a mensagem original pelo ID
					const message = messages.find(msg => msg.id === media.id);
					if (message) {
						setSelectedMessage(message);
						setForwardModalOpen(true);
						setMediaGalleryOpen(false);
					}
				}}
			/>

			{/* Modal de Tags e Kanban */}
			{selectedTicket && (
				<TicketTagsKanbanModal
					open={tagsKanbanModalOpen}
					onClose={() => setTagsKanbanModalOpen(false)}
					contact={selectedTicket.contact}
					ticket={selectedTicket}
					onUpdate={async () => {
						// Recarrega o ticket atualizado
						try {
							const { data } = await api.get(`/tickets/${selectedTicket.id}`);
							setSelectedTicket(data);

							// Atualiza também na lista de tickets
							setTickets(prevTickets =>
								prevTickets.map(ticket =>
									ticket.id === data.id ? data : ticket
								)
							);

						} catch (err) {
						}
					}}
				/>
			)}

			{/* Modal de Transferência */}
			{selectedTicket && (
				<TransferTicketModalCustom
					modalOpen={transferTicketModalOpen}
					onClose={handleCloseTransferModal}
					ticketid={selectedTicket.id}
					ticket={selectedTicket}
				/>
			)}

			{/* Modal de Contato */}
			{contactModalOpen && contactModalContact && (
				<ContactModal
					open={contactModalOpen}
					onClose={handleCloseContactModal}
					contactId={contactModalContact.id}
					initialValues={contactModalContact}
				/>
			)}

			{/* Modal de Fatura */}
			{faturaModalOpen && (
				<FaturaModal
					open={faturaModalOpen}
					onClose={() => {
						setFaturaModalOpen(false);
						loadTickets();
					}}
					initialData={{
						clientId: selectedTicket?.crmClient?.id || selectedTicket?.contact?.crmClients?.[0]?.id
					}}
				/>
			)}

			<Dialog open={closeAllDialogOpen} onClose={handleCloseCloseAllDialog} maxWidth="xs" fullWidth>
				<DialogTitle>Resolver conversas em massa</DialogTitle>
				<DialogContent dividers>
					<Typography>
						Essa ação vai resolver todas as conversas da aba {currentBulkCloseConfig.label}. Deseja continuar?
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseCloseAllDialog} disabled={closingAllTickets}>
						Cancelar
					</Button>
					<Button
						color="secondary"
						variant="contained"
						startIcon={<DoneAllIcon />}
						onClick={handleCloseAllTickets}
						disabled={closingAllTickets}
					>
						{closingAllTickets ? "Resolvendo..." : "Resolver todos"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Modal WAVoIP - Ligação */}
			<Dialog
				open={wavoipModalOpen}
				onClose={handleCloseWavoipModal}
				maxWidth="md"
				disableEscapeKeyDown
				BackdropProps={{ invisible: true }}
				PaperProps={{
					style: {
						width: '600px',
						height: '800px',
						maxWidth: 'none',
						maxHeight: 'none',
						boxShadow: 'none',
					}
				}}
			>
				<iframe
					src={wavoipUrl}
					style={{ width: '100%', height: '100%', border: 'none' }}
					title="WAVoIP Call"
					allow="microphone; autoplay"
				/>
				<DialogActions>
					<Button onClick={handleCloseWavoipModal} color="primary">
						Fechar
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
};

export default Atendimentos;


