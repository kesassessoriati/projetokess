import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from "react";
import * as Yup from "yup";
import { Formik, Form, Field, useFormikContext } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import CircularProgress from "@material-ui/core/CircularProgress";
import { i18n } from "../../translate/i18n";
import { MenuItem, FormControl, FormControlLabel, InputLabel, Select, Typography, Box, Checkbox, Chip, Tooltip, Tabs, Tab, Switch, Paper, Grid } from "@material-ui/core";
import { Visibility, VisibilityOff } from "@material-ui/icons";
import { InputAdornment, IconButton } from "@material-ui/core";
import QueueSelectSingle from "../QueueSelectSingle";
import { AuthContext } from "../../context/Auth/AuthContext";

// Ícones modernos
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import Filter9PlusIcon from '@mui/icons-material/Filter9Plus';
import ChatIcon from '@mui/icons-material/Chat';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';
import CompareArrowsIcon from "@material-ui/icons/CompareArrows";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import PersonAddIcon from "@material-ui/icons/PersonAdd";
import ShoppingCartIcon from "@material-ui/icons/ShoppingCart";
import ExtensionIcon from "@material-ui/icons/Extension";
import FavoriteBorderIcon from "@material-ui/icons/FavoriteBorder";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import InsertEmoticonIcon from "@material-ui/icons/InsertEmoticon";
import ScheduleIcon from "@material-ui/icons/Schedule";
import EventNoteIcon from "@material-ui/icons/EventNote";
import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import EventBusyIcon from "@material-ui/icons/EventBusy";
import EditIcon from "@material-ui/icons/Edit";
import InfoIcon from "@material-ui/icons/Info";
import GroupWorkIcon from "@material-ui/icons/GroupWork";
import ForumIcon from "@material-ui/icons/Forum";
import FormatQuoteIcon from "@material-ui/icons/FormatQuote";
import CodeIcon from "@material-ui/icons/Code";
import CallSplitIcon from "@material-ui/icons/CallSplit";
import PeopleOutlineIcon from "@material-ui/icons/PeopleOutline";
import BusinessIcon from "@material-ui/icons/Business";
import AssignmentIcon from "@material-ui/icons/Assignment";
import LibraryBooksIcon from "@material-ui/icons/LibraryBooks";
import LinkIcon from "@material-ui/icons/Link";
import ImageIcon from "@material-ui/icons/Image";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import SendIcon from "@material-ui/icons/Send";

import api from "../../services/api";
import { getBackendUrl } from "../../config";
import toastError from "../../errors/toastError";
import { TOOL_CATALOG, DEFAULT_SENSITIVE_TOOLS } from "../../constants/aiTools";
import { getCompanyAiConfig, updateCompanyAiConfig } from "../../services/companyAiConfig";
import { listAiAgentTemplates } from "../../services/aiAgentTemplates";

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexWrap: "wrap",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    multFieldLine: {
        display: "flex",
        gap: theme.spacing(2),
        "& > *": {
            flex: 1,
        },
        [theme.breakpoints.down('xs')]: {
            flexDirection: 'column',
            gap: theme.spacing(1),
        }
    },
    dialogPaper: {
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0px 16px 24px rgba(0, 0, 0, 0.12), 0px 6px 30px rgba(0, 0, 0, 0.08)",
        fontFamily: "'Inter', sans-serif",
        maxWidth: "1000px",
        width: "98%",
        margin: "auto",
    },
    dialogHeader: {
        background: "var(--color-primary)",
        padding: theme.spacing(1.2),
        color: "var(--btn-primary-text, #fff)",
        display: "flex",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "url('data:image/svg+xml,<svg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" fill-rule=\"evenodd\"><g fill=\"%23ffffff\" fill-opacity=\"0.05\"><circle cx=\"30\" cy=\"30\" r=\"4\"/></g></g></svg>') repeat",
            opacity: 0.3,
        }
    },
    dialogTitle: {
        fontWeight: 600,
        fontSize: "0.875rem",
        flexGrow: 1,
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        zIndex: 1,
    },
    dialogIcon: {
        marginRight: theme.spacing(1),
        fontSize: "1.25rem",
        position: "relative",
        zIndex: 1,
    },
    dialogContent: {
        padding: theme.spacing(1.5),
        backgroundColor: "var(--modal-body-bg, #fafafa)",
        fontFamily: "'Inter', sans-serif",
    },
    sectionTitle: {
        fontSize: "0.875rem",
        fontWeight: 600,
        color: "#374151",
        marginBottom: theme.spacing(0.6),
        marginTop: theme.spacing(1.5),
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        alignItems: "center",
        "&:first-child": {
            marginTop: 0,
        }
    },
    sectionIcon: {
        marginRight: theme.spacing(0.5),
        color: "var(--color-primary)",
        fontSize: "1rem",
    },
    formControl: {
        margin: theme.spacing(0.5, 0),
        "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            backgroundColor: "white",
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.875rem",
            "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--color-primary)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--color-primary)",
                borderWidth: "2px",
            }
        },
        "& .MuiInputLabel-outlined": {
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: "0.875rem",
        }
    },
    fieldIcon: {
        color: "#6b7280",
    },
    providerChip: {
        height: 32,
        borderRadius: 16,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        "& .MuiChip-label": {
            paddingLeft: 12,
            paddingRight: 12,
        }
    },
    openaiChip: {
        backgroundColor: "#10b981",
        color: "white",
        "&:hover": {
            backgroundColor: "#059669",
        }
    },
    geminiChip: {
        backgroundColor: "#3b82f6",
        color: "white",
        "&:hover": {
            backgroundColor: "#2563eb",
        }
    },
    modelSelect: {
        "& .MuiSelect-select": {
            display: 'flex',
            alignItems: 'center',
            fontFamily: "'Inter', sans-serif",
        },
        "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            backgroundColor: "white",
        }
    },
    freeLabel: {
        fontSize: "0.625rem",
        backgroundColor: "#dcfce7",
        color: "#166534",
        padding: "2px 6px",
        borderRadius: "4px",
        fontWeight: 600,
        marginLeft: theme.spacing(1),
        fontFamily: "'Inter', sans-serif",
    },
    saveButton: {
        background: "var(--btn-primary-bg, var(--color-primary))",
        color: "var(--btn-primary-text, #fff)",
        fontWeight: 600,
        borderRadius: "8px",
        padding: "8px 20px",
        fontSize: "0.8rem",
        textTransform: "none",
        boxShadow: "none",
        fontFamily: "'Inter', sans-serif",
        '&:hover': {
            background: "var(--btn-primary-bg, var(--color-primary))",
            filter: "brightness(0.88)",
            boxShadow: "none",
        },
        transition: "all 0.2s ease-in-out",
    },
    cancelButton: {
        background: "var(--btn-destructive-bg, #ef4444)",
        color: "var(--btn-destructive-text, #fff)",
        fontWeight: 600,
        borderRadius: "8px",
        padding: "8px 20px",
        fontSize: "0.8rem",
        textTransform: "none",
        marginRight: theme.spacing(1.5),
        boxShadow: "none",
        fontFamily: "'Inter', sans-serif",
        '&:hover': {
            background: "var(--btn-destructive-hover-bg, #dc2626)",
            boxShadow: "none",
        },
        transition: "all 0.2s ease-in-out",
    },
    dialogActions: {
        padding: theme.spacing(1.5, 3),
        backgroundColor: "var(--modal-body-bg, #fff)",
        borderTop: "1px solid #e5e7eb",
        justifyContent: "flex-end",
    },
    voiceSection: {
        backgroundColor: "white",
        borderRadius: "8px",
        padding: theme.spacing(1.5),
        border: "1px solid #e5e7eb",
        marginTop: theme.spacing(1),
    },
    configSection: {
        backgroundColor: "white",
        borderRadius: "8px", 
        padding: theme.spacing(1.5),
        border: "1px solid #e5e7eb",
        marginTop: theme.spacing(1),
    },
    templateGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: theme.spacing(1.5),
        marginTop: theme.spacing(1.5),
    },
    templateCard: {
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: theme.spacing(1.5),
        cursor: "pointer",
        backgroundColor: "#fff",
        transition: "all 0.2s ease",
        "&:hover": {
            borderColor: "var(--color-primary)",
            boxShadow: "0 10px 24px rgba(0, 0, 0, 0.12)",
        },
        "&.active": {
            borderColor: "var(--color-primary)",
            backgroundColor: "var(--bg-surface, #eef2ff)",
            boxShadow: "0 12px 26px rgba(0, 0, 0, 0.12)",
        }
    },
    usageModeGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: theme.spacing(1.5),
        marginTop: theme.spacing(1.5),
        marginBottom: theme.spacing(1.5),
    },
    usageModeCard: {
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: theme.spacing(1.5),
        cursor: "pointer",
        backgroundColor: "#fff",
        transition: "all 0.2s ease",
        "&.active": {
            borderColor: "var(--color-primary)",
            backgroundColor: "var(--bg-surface, #ecfdf5)",
        }
    },
    usageInfoBox: {
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        backgroundColor: "#f8fafc",
        padding: theme.spacing(1.5),
        marginTop: theme.spacing(1.5),
    },
    inlineMeta: {
        display: "flex",
        flexWrap: "wrap",
        gap: theme.spacing(1),
        marginTop: theme.spacing(1),
    },
    toolGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: theme.spacing(1.5),
        marginTop: theme.spacing(1.5),
    },
    toolCard: {
        padding: theme.spacing(1.5),
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        minHeight: 160,
        backgroundColor: "#fff",
    },
    toolHeader: {
        display: "flex",
        alignItems: "center",
        marginBottom: theme.spacing(1),
        gap: theme.spacing(1),
    },
    toolIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#eef2ff",
        color: "#4f46e5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.2rem",
    },
    toolDescription: {
        fontSize: "0.8rem",
        color: "#4b5563",
        marginBottom: theme.spacing(1),
    },
    toolInstruction: {
        fontSize: "0.75rem",
        color: "#6b7280",
        fontStyle: "italic",
    },
    toolFooter: {
        marginTop: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    knowledgeContainer: {
        backgroundColor: "#fff",
        borderRadius: 12,
        border: "1px dashed #cbd5f5",
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
    knowledgeHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: theme.spacing(1),
    },
    knowledgeList: {
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(1.5),
        width: "100%"
    },
    knowledgeCard: {
        width: "100%",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: theme.spacing(1.5),
        display: "flex",
        alignItems: "center",
        backgroundColor: "#fff",
        minWidth: 220
    },
    knowledgeThumb: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: "#eef2ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        "& img": {
            width: "100%",
            height: "100%",
            objectFit: "cover"
        }
    },
    knowledgeMeta: {
        flexGrow: 1,
        display: "flex",
        flexDirection: "column"
    },
    knowledgeActions: {
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(0.5),
        alignItems: "flex-end"
    },
    knowledgeEmpty: {
        border: "1px dashed #d1d5db",
        borderRadius: 12,
        padding: theme.spacing(2),
        textAlign: "center",
        color: "#6b7280",
        width: "100%",
        backgroundColor: "#f9fafb"
    },
    fileInput: {
        display: "none",
    },
    uploadButton: {
        marginTop: theme.spacing(1),
        textTransform: "none",
    },
    previewChip: {
        paddingRight: theme.spacing(1),
        "& svg": {
            marginLeft: theme.spacing(0.5),
        },
    },
    testChatGrid: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 360px)",
        gap: theme.spacing(2),
        [theme.breakpoints.down("sm")]: {
            gridTemplateColumns: "1fr"
        }
    },
    testInfoPanel: {
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        padding: theme.spacing(2)
    },
    testPhone: {
        height: 520,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #d1d5db",
        backgroundColor: "#0f172a",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 14px 28px rgba(15, 23, 42, 0.18)"
    },
    testPhoneHeader: {
        height: 58,
        padding: theme.spacing(1, 1.5),
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "#fff",
        background: "#075e54"
    },
    testAvatar: {
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "#dbeafe",
        color: "#1d4ed8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginRight: theme.spacing(1)
    },
    testMessages: {
        flex: 1,
        padding: theme.spacing(2),
        overflowY: "auto",
        backgroundColor: "#102027",
        backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "18px 18px"
    },
    testEmpty: {
        minHeight: "100%",
        color: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontWeight: 700
    },
    testBubbleRow: {
        display: "flex",
        marginBottom: theme.spacing(1)
    },
    testBubble: {
        maxWidth: "82%",
        borderRadius: 8,
        padding: theme.spacing(1, 1.25),
        fontSize: "0.875rem",
        lineHeight: 1.45,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word"
    },
    testBubbleUser: {
        marginLeft: "auto",
        backgroundColor: "#dcf8c6",
        color: "#111827"
    },
    testBubbleAssistant: {
        marginRight: "auto",
        backgroundColor: "#fff",
        color: "#111827"
    },
    testComposer: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(1),
        padding: theme.spacing(1),
        backgroundColor: "#1f2937"
    }
}));

const TOOL_ICONS = {
    send_product: ShoppingCartIcon,
    execute_tool: ExtensionIcon,
    like_message: FavoriteBorderIcon,
    send_contact_file: AttachFileIcon,
    send_emoji: InsertEmoticonIcon,
    get_company_schedule: ScheduleIcon,
    get_contact_schedules: EventNoteIcon,
    create_contact_schedule: EventAvailableIcon,
    update_contact_schedule: EventBusyIcon,
    get_contact_info: InfoIcon,
    update_contact_info: EditIcon,
    get_company_groups: GroupWorkIcon,
    send_group_message: ForumIcon,
    format_message: FormatQuoteIcon,
    execute_command: CodeIcon,
    call_prompt_agent: CallSplitIcon,
    list_professionals: PeopleOutlineIcon,
    get_asaas_second_copy: LocalOfferIcon,
    create_company: BusinessIcon,
    list_plans: AssignmentIcon,
};

const TOOL_INSTRUCTIONS = {
    send_product: 'Diga: "Use send_product com o código PROD-123".',
    execute_tool: 'Instrua: "Chame execute_tool usando o conector cobrança".',
    like_message: 'Comando simples: "like_message".',
    send_contact_file: 'Peça: "Use send_contact_file enviando o contrato".',
    send_emoji: 'Diga: "send_emoji 😀".',
    get_company_schedule: 'Pergunte: "get_company_schedule".',
    get_contact_schedules: 'Use: "get_contact_schedules".',
    create_contact_schedule: 'Exemplo: "create_contact_schedule dia 10 às 15h".',
    update_contact_schedule: 'Exemplo: "update_contact_schedule reagende para amanhã".',
    get_contact_info: 'Instrua: "get_contact_info".',
    update_contact_info: 'Instrua: "update_contact_info campo=telefone valor=55999999999".',
    get_company_groups: 'Comando: "get_company_groups".',
    send_group_message: 'Diga: "send_group_message para grupo ClientesVIP".',
    format_message: 'Use: "format_message "{{ms}}, {{name}}!"".',
    execute_command: 'Sempre use JSON: #{ "queueId":"5", "userId":"1", "tagId":"14" }.',
    call_prompt_agent: 'Fale: "call_prompt_agent vendedor_pro".',
    list_professionals: 'Comando: "list_professionals".',
    get_asaas_second_copy: 'Instrua: "Use get_asaas_second_copy com o CPF informado pelo cliente".',
    create_company: 'Somente matriz: "create_company" com os dados exigidos.',
    list_plans: 'Apenas matriz: "list_plans".'
};

const openaiModels = [
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" }
];

const geminiModels = [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", free: true },
    { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite", free: false },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", free: false },
    { value: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash-8B", free: false },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", free: false },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", free: false },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", free: false }
];

const openrouterModels = [
    { value: "deepseek/deepseek-chat-v3.1:free", label: "DeepSeek Chat V3.1 (OpenRouter)", free: true },
    { value: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek Chat V3 0324 (OpenRouter)", free: true },
    { value: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash Experimental (OpenRouter)", free: true }
];

const providerFallbackModels = {
    openai: openaiModels,
    gemini: geminiModels,
    openrouter: openrouterModels,
    groq: [
        { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant (Groq)" },
        { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile (Groq)" }
    ]
};

const providerLabels = {
    openai: "OpenAI",
    gemini: "Google Gemini",
    openrouter: "OpenRouter",
    groq: "Groq"
};

const providerKeyPayloadFields = {
    openai: "openaiApiKey",
    gemini: "geminiApiKey",
    openrouter: "openrouterApiKey",
    groq: "groqApiKey"
};

const getFallbackModelForProvider = provider =>
    providerFallbackModels[provider]?.[0]?.value || "gpt-4o-mini";

const TOOL_PROMPT_BLOCKS = {
    get_company_schedule: "Use get_company_schedule quando o cliente perguntar horario, disponibilidade ou funcionamento. Nao invente horarios.",
    get_contact_schedules: "Use get_contact_schedules para consultar agendamentos existentes antes de remarcar ou quando o cliente perguntar.",
    create_contact_schedule: "Use create_contact_schedule somente apos confirmar data, horario, objetivo e dados principais do cliente.",
    update_contact_schedule: "Use update_contact_schedule quando o cliente pedir remarcacao ou alteracao de um compromisso existente.",
    get_contact_info: "Use get_contact_info para verificar dados ja cadastrados antes de perguntar novamente.",
    update_contact_info: "Use update_contact_info para registrar nome, email, telefone, endereco, interesse, preferencias e observacoes relevantes.",
    send_product: "Use send_product para enviar produtos, imoveis, planos ou ofertas cadastradas quando forem relevantes ao interesse do cliente.",
    send_contact_file: "Use send_contact_file para enviar documentos, propostas, fichas ou materiais ja vinculados ao contato.",
    execute_tool: "Use execute_tool apenas quando uma integracao externa estiver configurada e o contexto indicar exatamente qual ferramenta usar.",
    format_message: "Use format_message quando precisar aplicar variaveis ou padronizar uma mensagem.",
    execute_command: "Use execute_command para organizar fila, atendente, tag ou encerramento quando houver regra clara.",
    call_prompt_agent: "Use call_prompt_agent para consultar outro agente especializado quando ele estiver configurado e for adequado ao assunto.",
    call_flow_builder: "Use call_flow_builder para iniciar um fluxo automatizado especifico quando fizer sentido.",
    list_professionals: "Use list_professionals para consultar profissionais, corretores, vendedores ou horarios por area/servico.",
    like_message: "Use like_message apenas quando uma reacao discreta combinar com a conversa.",
    send_emoji: "Use send_emoji apenas quando o tom do agente permitir uma resposta curta com emoji."
};

const DEFAULT_AGENT_FIELDS = {
    agentName: "Agente IA",
    companyName: "sua empresa",
    industry: "Atendimento comercial",
    language: "Portugues brasileiro",
    mainGoal: "Atender, qualificar e conduzir o cliente para o proximo passo",
    communicationTone: "Cordial, objetivo e profissional",
    businessDescription: "Descreva brevemente o negocio, publico e diferenciais.",
    productsOrServices: "Informe os principais produtos ou servicos atendidos.",
    openingHours: "Use os horarios cadastrados no sistema quando disponiveis.",
    address: "Informe endereco, cidade ou regiao de atendimento quando relevante.",
    handoffRules: "Transfira para humano quando o cliente pedir, quando houver negociacao sensivel ou quando faltar informacao segura.",
    qualificationQuestions: "Colete interesse, necessidade, prazo, orcamento e melhor horario de contato.",
    customInstructions: ""
};

const stripStaticToolsBlock = (promptText = "") =>
    promptText.replace(/# Ferramentas disponiveis[\s\S]*?(?=# Regras especificas do nicho)/, "");

const replaceTemplateVariables = (text = "", values = {}) => {
    const variables = { ...DEFAULT_AGENT_FIELDS, ...values };
    return text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => variables[key] || "");
};

const buildToolsPromptBlock = (toolsEnabled = []) => {
    const enabled = TOOL_CATALOG.filter(tool => toolsEnabled.includes(tool.value));
    if (enabled.length === 0) {
        return "# Ferramentas habilitadas\nNenhuma ferramenta opcional foi habilitada para este agente.";
    }

    const lines = enabled.map(tool => {
        const instruction = TOOL_PROMPT_BLOCKS[tool.value] || `Use ${tool.value} somente quando for necessario e permitido pelo contexto.`;
        return `- ${tool.value}: ${instruction}`;
    });

    return `# Ferramentas habilitadas\n${lines.join("\n")}`;
};

const buildPromptFromTemplate = (template, values = {}, toolsEnabled = []) => {
    const basePrompt = stripStaticToolsBlock(template?.defaultPrompt || values.prompt || "");
    const filledPrompt = replaceTemplateVariables(basePrompt, values);
    return `${filledPrompt.trim()}\n\n${buildToolsPromptBlock(toolsEnabled)}`;
};

const TemplateAutoApplier = ({ templateKey, templates, onApply }) => {
    const { values, setFieldValue } = useFormikContext();
    const applied = useRef(false);
    useEffect(() => {
        if (applied.current || !templateKey || !templates.length) return;
        const tpl = templates.find(t => t.key === templateKey);
        if (tpl) {
            applied.current = true;
            onApply(tpl, values, setFieldValue);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templates, templateKey]);
    return null;
};

const PromptModal = ({ open, onClose, promptId, initialTemplateKey }) => {
    const classes = useStyles();
    const { user } = useContext(AuthContext);
    const [selectedVoice, setSelectedVoice] = useState("texto");
    const [showApiKey, setShowApiKey] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState("openai");
    const [selectedModel, setSelectedModel] = useState("");
    const [activeTab, setActiveTab] = useState(0);
    const [savedPrompts, setSavedPrompts] = useState([]);
    const [selectedSavedPrompt, setSelectedSavedPrompt] = useState("");
    const [knowledgeUploading, setKnowledgeUploading] = useState(false);
    const [companyAiConfig, setCompanyAiConfig] = useState(null);
    const [aiTemplates, setAiTemplates] = useState([]);
    const [companyApiKeyInput, setCompanyApiKeyInput] = useState({ openai: "", gemini: "", openrouter: "", groq: "" });
    const [whatsappOptions, setWhatsappOptions] = useState([]);
    const [testMessages, setTestMessages] = useState([]);
    const [testInput, setTestInput] = useState("");
    const [testLoading, setTestLoading] = useState(false);
    const imageInputRef = useRef(null);
    const pdfInputRef = useRef(null);
    const [linkForm, setLinkForm] = useState({ title: "", url: "" });

    const backendBaseUrl = useMemo(() => {
        const url = getBackendUrl();
        if (!url) return "";
        return url.replace(/\/+$/, "");
    }, []);

    const buildPublicUrl = useCallback(
        (path = "") => {
            if (!path) return "";
            if (path.startsWith("http://") || path.startsWith("https://")) {
                return path;
            }
            const sanitized = path.replace(/^\/+/, "");
            if (!backendBaseUrl) {
                return sanitized.startsWith("public/")
                    ? `/${sanitized}`
                    : `/public/${sanitized}`;
            }
            if (sanitized.startsWith("public/")) {
                return `${backendBaseUrl}/${sanitized}`;
            }
            return `${backendBaseUrl}/public/${sanitized}`;
        },
        [backendBaseUrl]
    );

    const resolveKnowledgeUrl = useCallback(
        (item) => {
            if (!item) return "";
            if (item.url) return buildPublicUrl(item.url);
            if (item.path) return buildPublicUrl(item.path);
            return "";
        },
        [buildPublicUrl]
    );

    const inferKnowledgeType = useCallback((item) => {
        if (item?.type) return item.type;
        const reference = `${item?.title || ""} ${item?.url || ""} ${item?.path || ""}`.toLowerCase();
        if (/\.(png|jpe?g|gif|bmp|webp|svg)$/.test(reference)) return "image";
        if (/\.pdf$/.test(reference)) return "pdf";
        return "link";
    }, []);

    const handleCopyToClipboard = useCallback(async (text) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Link copiado!");
        } catch (err) {
            toastError("Não foi possível copiar o link.");
        }
    }, []);

    const uploadKnowledgeFile = useCallback(async (file) => {
        if (!file) return "";
        setKnowledgeUploading(true);
        const formData = new FormData();
        formData.append("medias", file);

        try {
            const { data } = await api.post("/flowbuilder/content", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            if (Array.isArray(data)) {
                return data[0];
            }

            if (typeof data === "string") {
                return data;
            }

            return data?.url || data?.path || "";
        } catch (err) {
            toastError(err);
            return "";
        } finally {
            setKnowledgeUploading(false);
        }
    }, []);

    const handleKnowledgeFileAdd = useCallback(async (file, type, values, setFieldValue) => {
        if (!file) return;
        const storedPath = await uploadKnowledgeFile(file);

        if (!storedPath) {
            toast.error("Não foi possível enviar o arquivo.");
            return;
        }

        const resource = {
            id: `${type}-${Date.now()}-${file.name}`,
            type,
            title: file.name,
            path: storedPath,
            size: file.size,
            mimeType: file.type,
            createdAt: new Date().toISOString()
        };

        const nextKnowledge = [...(values.knowledgeBase || []), resource];
        setFieldValue("knowledgeBase", nextKnowledge);
        toast.success("Arquivo adicionado à base de conhecimento!");
    }, [uploadKnowledgeFile]);

    const handleRemoveKnowledge = useCallback((resourceIndex, values, setFieldValue) => {
        const current = values.knowledgeBase || [];
        const next = current.filter((_, index) => index !== resourceIndex);
        setFieldValue("knowledgeBase", next);
    }, []);

    const isValidUrl = useCallback((url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }, []);

    const handleAddLinkResource = useCallback((values, setFieldValue) => {
        if (!linkForm.title.trim() || !linkForm.url.trim()) {
            toast.error("Informe o título e o link.");
            return;
        }

        if (!isValidUrl(linkForm.url.trim())) {
            toast.error("Informe um link válido (https://...).");
            return;
        }

        const resource = {
            id: `link-${Date.now()}`,
            type: "link",
            title: linkForm.title.trim(),
            url: linkForm.url.trim(),
            createdAt: new Date().toISOString()
        };

        const next = [...(values.knowledgeBase || []), resource];
        setFieldValue("knowledgeBase", next);
        setLinkForm({ title: "", url: "" });
        toast.success("Link adicionado à base de conhecimento!");
    }, [isValidUrl, linkForm]);

    const handleLinkInputChange = useCallback(
        field => event => {
            const value = event?.target?.value ?? "";
            setLinkForm(prev => ({ ...prev, [field]: value }));
        },
        []
    );

    const handleToggleApiKey = () => {
        setShowApiKey(!showApiKey);
    };

    const handleTabChange = (_event, newValue) => {
        setActiveTab(newValue);
    };

    const initialState = {
        name: "",
        prompt: "",
        voice: "texto",
        voiceKey: "",
        voiceRegion: "",
        maxTokens: 100,
        temperature: 1,
        apiKey: "",
        aiUsageMode: "system",
        queueId: null,
        maxMessages: 10,
        provider: "openai",
        model: "",
        templateKey: "",
        description: "",
        toolsEnabled: [],
        knowledgeBase: [],
        config: {},
        channelBinding: {
            channelType: "whatsapp",
            whatsappId: "",
            isActive: true,
            events: ["message_received"]
        },
        ...DEFAULT_AGENT_FIELDS
    };

    const [prompt, setPrompt] = useState(initialState);
    const restrictedTools = useMemo(
        () => new Set(["create_company", "list_plans", "get_company_groups", "send_group_message"]),
        []
    );
    const filteredTools = useMemo(() => {
        return TOOL_CATALOG.filter(tool => {
            if (restrictedTools.has(tool.value)) {
                return user?.companyId === 1;
            }
            return true;
        });
    }, [user, restrictedTools]);

    useEffect(() => {
        const fetchPrompt = async () => {
            if (!promptId) {
                setPrompt(initialState);
                setSelectedProvider("openai");
                setSelectedModel("");
                return;
            }
            try {
                const { data } = await api.get(`/prompt/${promptId}`);
                setPrompt(prevState => {
                    const whatsappBinding = (data.channelBindings || []).find(binding => binding.channelType === "whatsapp");
                    return {
                        ...prevState,
                        ...data,
                        aiUsageMode: data.aiUsageMode || "system",
                        toolsEnabled: data.toolsEnabled || [],
                        knowledgeBase: data.knowledgeBase || [],
                        config: data.config || {},
                        channelBinding: {
                            channelType: "whatsapp",
                            whatsappId: whatsappBinding?.whatsappId || "",
                            isActive: whatsappBinding ? Boolean(whatsappBinding.isActive) : true,
                            events: whatsappBinding?.events || ["message_received"]
                        }
                    };
                });
                setSelectedVoice(data.voice);
                setSelectedProvider(data.provider || "openai");
                setSelectedModel(data.model || "");
            } catch (err) {
                toastError(err);
            }
        };

        fetchPrompt();
    }, [promptId, open]);

    useEffect(() => {
        const fetchAiMeta = async () => {
            if (!open || !user?.companyId) return;
            try {
                const [companyConfig, templates] = await Promise.all([
                    getCompanyAiConfig(user.companyId),
                    listAiAgentTemplates()
                ]);
                setCompanyAiConfig(companyConfig);
                setAiTemplates(Array.isArray(templates) ? templates : []);

                if (!promptId) {
                    const preferredProvider = companyConfig?.preferredProvider || "openai";
                    setSelectedProvider(preferredProvider);
                    const syncedModels = companyConfig?.globalModels?.[preferredProvider] || [];
                    setSelectedModel(
                        syncedModels[0]?.id || providerFallbackModels[preferredProvider]?.[0]?.value || ""
                    );
                }
            } catch (err) {
                toastError(err);
            }
        };

        fetchAiMeta();
    }, [open, promptId, user]);

    useEffect(() => {
        const fetchSavedPrompts = async () => {
            if (!open) return;
            try {
                const { data } = await api.get("/prompt");
                setSavedPrompts(Array.isArray(data?.prompts) ? data.prompts : []);
            } catch (err) {
                toastError(err);
            }
        };

        fetchSavedPrompts();
    }, [open]);

    useEffect(() => {
        const fetchWhatsapps = async () => {
            if (!open) return;
            try {
                const { data } = await api.get("/whatsapp/filter", {
                    params: { session: 0, channel: "whatsapp" }
                });
                setWhatsappOptions(Array.isArray(data) ? data : []);
            } catch (err) {
                toastError(err);
            }
        };

        fetchWhatsapps();
    }, [open]);

    const handleClose = (savedPrompt) => {
        setPrompt(initialState);
        setSelectedVoice("texto");
        setSelectedProvider("openai");
        setSelectedModel("");
        setActiveTab(0);
        setSelectedSavedPrompt("");
        setCompanyApiKeyInput({ openai: "", gemini: "", openrouter: "", groq: "" });
        setTestMessages([]);
        setTestInput("");
        setTestLoading(false);
        onClose(savedPrompt);
    };

    const handleProviderChange = (e) => {
        const newProvider = e.target.value;
        setSelectedProvider(newProvider);
        setSelectedModel(""); // Reset model when provider changes
    };

    const handleModelChange = (e) => {
        setSelectedModel(e.target.value);
    };

    const getCurrentModels = () => {
        const syncedModels = companyAiConfig?.globalModels?.[selectedProvider] || [];
        if (syncedModels.length > 0) {
            return syncedModels.map(model => ({
                value: model.id,
                label: model.name || model.id,
                free: /:free$/i.test(model.id)
            }));
        }
        return providerFallbackModels[selectedProvider] || openaiModels;
    };

    const getCreditsLabel = useCallback(() => {
        const creditInfo = companyAiConfig?.creditInfo;
        if (!creditInfo) return "...";
        if (creditInfo.allowed === 0) return "Ilimitado";
        return `${creditInfo.remaining} restantes`;
    }, [companyAiConfig]);

    const handleApplyTemplate = useCallback((template, values, setFieldValue) => {
        if (!template) return;
        const nextValues = {
            ...values,
            agentName: values.agentName || template.name || DEFAULT_AGENT_FIELDS.agentName,
            companyName: values.companyName || user?.company?.name || user?.companyName || DEFAULT_AGENT_FIELDS.companyName,
            industry: template.name || values.industry || DEFAULT_AGENT_FIELDS.industry,
            language: values.language || DEFAULT_AGENT_FIELDS.language,
            mainGoal: template.objective || values.mainGoal || DEFAULT_AGENT_FIELDS.mainGoal,
            communicationTone: template.defaultTone || values.communicationTone || DEFAULT_AGENT_FIELDS.communicationTone,
            handoffRules: template.handoffRules || values.handoffRules || DEFAULT_AGENT_FIELDS.handoffRules,
            qualificationQuestions: Array.isArray(template.qualificationQuestions)
                ? template.qualificationQuestions.join("\n")
                : values.qualificationQuestions || DEFAULT_AGENT_FIELDS.qualificationQuestions,
            toolsEnabled: template.enabledTools || []
        };
        setFieldValue("templateKey", template.key);
        setFieldValue("description", template.description || "");
        setFieldValue("agentName", nextValues.agentName);
        setFieldValue("companyName", nextValues.companyName);
        setFieldValue("industry", nextValues.industry);
        setFieldValue("language", nextValues.language);
        setFieldValue("mainGoal", nextValues.mainGoal);
        setFieldValue("communicationTone", nextValues.communicationTone);
        setFieldValue("handoffRules", nextValues.handoffRules);
        setFieldValue("qualificationQuestions", nextValues.qualificationQuestions);
        setFieldValue("prompt", buildPromptFromTemplate(template, nextValues, nextValues.toolsEnabled));
        setFieldValue("toolsEnabled", template.enabledTools || []);
        setFieldValue("maxTokens", template.suggestedConfiguration?.maxTokens || values.maxTokens);
        setFieldValue("temperature", template.suggestedConfiguration?.temperature || values.temperature);
        setFieldValue("aiUsageMode", template.suggestedConfiguration?.usageMode || "system");
        if (!values.name) {
            setFieldValue("name", template.name || "");
        }
        setSelectedProvider(template.suggestedConfiguration?.provider || "openai");
        setSelectedModel(template.suggestedConfiguration?.model || "");
        toast.success("Template aplicado com sucesso.");
    }, [user]);

    const handleRegeneratePrompt = useCallback((values, setFieldValue, toolsOverride) => {
        const selectedTemplate = aiTemplates.find(template => template.key === values.templateKey);
        if (!selectedTemplate) {
            toast.error("Selecione um template antes de gerar o prompt.");
            return;
        }
        const nextTools = toolsOverride || values.toolsEnabled || [];
        setFieldValue("prompt", buildPromptFromTemplate(selectedTemplate, values, nextTools));
        toast.success("Prompt atualizado com os campos do agente.");
    }, [aiTemplates]);

    const handleCompanyKeyInputChange = useCallback((provider, value) => {
        setCompanyApiKeyInput(prev => ({ ...prev, [provider]: value }));
    }, []);

    const handleSavePrompt = async values => {
        const providerKeyField = selectedProvider || "openai";
        const nextUsageMode = values.aiUsageMode || "system";
        const ownKeyInput = (companyApiKeyInput[providerKeyField] || "").trim();
        const normalizedProvider = selectedProvider || companyAiConfig?.preferredProvider || "openai";
        const normalizedModel = selectedModel || getFallbackModelForProvider(normalizedProvider);

        if (nextUsageMode === "own" && !ownKeyInput && !companyAiConfig?.hasOwnKeys?.[providerKeyField]) {
            toastError("Informe uma API key da empresa para usar o modo próprio.");
            return;
        }

        const transientFields = new Set([
            "agentName",
            "companyName",
            "industry",
            "language",
            "mainGoal",
            "communicationTone",
            "businessDescription",
            "productsOrServices",
            "openingHours",
            "address",
            "handoffRules",
            "qualificationQuestions",
            "customInstructions"
        ]);
        const persistedValues = Object.keys(values).reduce((acc, key) => {
            if (!transientFields.has(key)) {
                acc[key] = values[key];
            }
            return acc;
        }, {});

        const promptData = {
            ...persistedValues,
            voice: selectedVoice, 
            provider: normalizedProvider,
            model: normalizedModel,
            aiUsageMode: nextUsageMode,
            apiKey: "",
            queueId: persistedValues.queueId || null,
            toolsEnabled: persistedValues.toolsEnabled || [],
            channelBinding: persistedValues.channelBinding?.whatsappId
                ? {
                    channelType: "whatsapp",
                    whatsappId: persistedValues.channelBinding.whatsappId,
                    isActive: Boolean(persistedValues.channelBinding?.isActive),
                    events: persistedValues.channelBinding?.events?.length
                        ? persistedValues.channelBinding.events
                        : ["message_received"]
                }
                : null
        };
        if (!normalizedProvider) {
            toastError("Selecione o provedor de IA");
            return;
        }
        if (nextUsageMode === "own" && !normalizedModel) {
            toastError("Selecione o modelo");
            return;
        }
        try {
            const aiConfigPayload = {
                aiUsageMode: nextUsageMode === "own" ? "own" : "system",
                aiPreferredProvider: normalizedProvider
            };

            if (nextUsageMode === "own" && ownKeyInput) {
                aiConfigPayload[providerKeyPayloadFields[providerKeyField] || "openaiApiKey"] = ownKeyInput;
            }

            await updateCompanyAiConfig(user.companyId, aiConfigPayload);

            let savedPrompt;
            if (promptId) {
                const { data } = await api.put(`/prompt/${promptId}`, promptData);
                savedPrompt = data;
            } else {
                const { data } = await api.post("/prompt", promptData);
                savedPrompt = data;
            }
            const refreshedConfig = await getCompanyAiConfig(user.companyId);
            setCompanyAiConfig(refreshedConfig);
            toast.success(promptId ? "Agente atualizado com sucesso" : "Agente criado com sucesso");
            handleClose(savedPrompt);
        } catch (err) {
            toastError(err);
            return;
        }
    };

    const buildTestPayload = useCallback((values, message) => {
        const provider = selectedProvider || companyAiConfig?.preferredProvider || "openai";
        return {
            prompt: values.prompt,
            message,
            provider,
            model: selectedModel || getFallbackModelForProvider(provider),
            temperature: Number(values.temperature || 0.7),
            maxTokens: Number(values.maxTokens || 300),
            aiUsageMode: values.aiUsageMode || "system",
            allowedTools: values.toolsEnabled || [],
            context: testMessages.map(item => ({
                role: item.role,
                content: item.content
            }))
        };
    }, [companyAiConfig, selectedModel, selectedProvider, testMessages]);

    const handleSendTestMessage = useCallback(async values => {
        const message = testInput.trim();
        if (!message) return;
        if (!values.prompt?.trim()) {
            toastError("Preencha o prompt antes de testar.");
            return;
        }

        const userMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: message
        };
        setTestMessages(prev => [...prev, userMessage]);
        setTestInput("");
        setTestLoading(true);

        try {
            const endpoint = promptId ? `/prompt/${promptId}/test` : "/prompt/test";
            const { data } = await api.post(endpoint, buildTestPayload(values, message));
            setTestMessages(prev => [
                ...prev,
                {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: data?.reply || "Nao consegui gerar uma resposta agora."
                }
            ]);
        } catch (err) {
            const message =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                "Nao foi possivel testar o agente agora.";
            toastError(message);
            setTestMessages(prev => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    content: message
                }
            ]);
        } finally {
            setTestLoading(false);
        }
    }, [buildTestPayload, promptId, testInput]);

    return (
        <div className={classes.root}>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                scroll="paper"
                fullWidth
                classes={{ paper: classes.dialogPaper }}
            >
                <div className={classes.dialogHeader}>
                    <SmartToyIcon className={classes.dialogIcon} />
                    <Typography variant="h6" className={classes.dialogTitle}>
                        {promptId
                            ? `${i18n.t("promptModal.title.edit")}`
                            : `${i18n.t("promptModal.title.add")}`}
                    </Typography>
                </div>
                
                <DialogContent className={classes.dialogContent}>
                    <Formik
                        initialValues={prompt}
                        enableReinitialize={true}
                        onSubmit={async (values, actions) => {
                            await handleSavePrompt(values);
                            actions.setSubmitting(false);
                        }}
                    >
                        {({ touched, errors, isSubmitting, values, setFieldValue, submitForm }) => (
                            <Form style={{ width: "100%" }}>
                                {initialTemplateKey && !promptId && (
                                    <TemplateAutoApplier
                                        templateKey={initialTemplateKey}
                                        templates={aiTemplates}
                                        onApply={handleApplyTemplate}
                                    />
                                )}
                                <Tabs
                                    value={activeTab}
                                    onChange={handleTabChange}
                                    indicatorColor="primary"
                                    textColor="primary"
                                    variant="scrollable"
                                    scrollButtons="auto"
                                    style={{ marginBottom: 16 }}
                                >
                                    <Tab label="Identificação" />
                                    <Tab label="Prompt & Fila" />
                                    <Tab label="Canais" />
                                    <Tab label="Configuração IA" />
                                    <Tab label="Ferramentas" />
                                    <Tab label="Conhecimento" />
                                    <Tab label="Teste do agente" />
                                    <Tab label="Instruções" />
                                </Tabs>

                                {activeTab === 0 && (
                                    <>
                                        <Typography className={classes.sectionTitle}>
                                            <SmartToyIcon className={classes.sectionIcon} />
                                            Template pronto
                                        </Typography>

                                        <Typography variant="body2" color="textSecondary">
                                            Selecione um template para criar um agente funcional em poucos segundos.
                                        </Typography>

                                        <div className={classes.templateGrid}>
                                            {aiTemplates.map(template => (
                                                <div
                                                    key={template.key}
                                                    className={`${classes.templateCard} ${values.templateKey === template.key ? "active" : ""}`}
                                                    onClick={() => handleApplyTemplate(template, values, setFieldValue)}
                                                >
                                                    <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
                                                        {template.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {template.niche}
                                                    </Typography>
                                                    <Typography variant="body2" style={{ marginTop: 8, color: "#475569" }}>
                                                        {template.description}
                                                    </Typography>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Etapa 1: Nome */}
                                        <Typography className={classes.sectionTitle}>
                                            <PersonIcon className={classes.sectionIcon} />
                                            Nome do Prompt
                                        </Typography>

                                        <Typography variant="body2" color="textSecondary">
                                            Escolha um nome curto e fácil de identificar para este prompt.
                                        </Typography>

                                        <Field
                                            as={TextField}
                                            label={i18n.t("promptModal.form.name")}
                                            name="name"
                                            error={touched.name && Boolean(errors.name)}
                                            helperText={touched.name && errors.name}
                                            variant="outlined"
                                            margin="dense"
                                            fullWidth
                                            required
                                            className={classes.formControl}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <PersonIcon className={classes.fieldIcon} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />

                                        <Typography className={classes.sectionTitle}>
                                            <AssignmentIcon className={classes.sectionIcon} />
                                            Perfil do agente
                                        </Typography>

                                        <Typography variant="body2" color="textSecondary">
                                            Preencha dados simples para montar o prompt profissional automaticamente.
                                        </Typography>

                                        <Grid container spacing={1}>
                                            <Grid item xs={12} md={6}>
                                                <Field
                                                    as={TextField}
                                                    label="Nome do agente"
                                                    name="agentName"
                                                    variant="outlined"
                                                    margin="dense"
                                                    fullWidth
                                                    className={classes.formControl}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Field
                                                    as={TextField}
                                                    label="Nome da empresa"
                                                    name="companyName"
                                                    variant="outlined"
                                                    margin="dense"
                                                    fullWidth
                                                    className={classes.formControl}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Field
                                                    as={TextField}
                                                    label="Setor / industria"
                                                    name="industry"
                                                    variant="outlined"
                                                    margin="dense"
                                                    fullWidth
                                                    className={classes.formControl}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Field
                                                    as={TextField}
                                                    label="Idioma"
                                                    name="language"
                                                    variant="outlined"
                                                    margin="dense"
                                                    fullWidth
                                                    className={classes.formControl}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Field
                                                    as={TextField}
                                                    label="Tom de comunicacao"
                                                    name="communicationTone"
                                                    variant="outlined"
                                                    margin="dense"
                                                    fullWidth
                                                    className={classes.formControl}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Field
                                                    as={TextField}
                                                    label="Objetivo principal"
                                                    name="mainGoal"
                                                    variant="outlined"
                                                    margin="dense"
                                                    fullWidth
                                                    className={classes.formControl}
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Field
                                                    as={TextField}
                                                    label="Descricao comercial"
                                                    name="businessDescription"
                                                    variant="outlined"
                                                    margin="dense"
                                                    fullWidth
                                                    multiline
                                                    rows={2}
                                                    className={classes.formControl}
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Field
                                                    as={TextField}
                                                    label="Instrucoes extras"
                                                    name="customInstructions"
                                                    variant="outlined"
                                                    margin="dense"
                                                    fullWidth
                                                    multiline
                                                    rows={3}
                                                    className={classes.formControl}
                                                />
                                            </Grid>
                                        </Grid>
                                    </>
                                )}

                                {activeTab === 1 && (
                                    <>
                                        {/* Etapa 3: Prompt gerado e fila */}
                                        <Typography className={classes.sectionTitle}>
                                            Prompt principal
                                        </Typography>

                                        <Typography variant="body2" color="textSecondary">
                                            Revise, ajuste ou substitua o texto do prompt antes de escolher a fila de atendimento.
                                        </Typography>

                                        <Box display="flex" justifyContent="flex-end" mb={1}>
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                startIcon={<ModelTrainingIcon />}
                                                onClick={() => handleRegeneratePrompt(values, setFieldValue)}
                                            >
                                                Gerar prompt pelos campos
                                            </Button>
                                        </Box>

                                        <Field
                                            as={TextField}
                                            label={i18n.t("promptModal.form.prompt")}
                                            name="prompt"
                                            error={touched.prompt && Boolean(errors.prompt)}
                                            helperText={touched.prompt && errors.prompt}
                                            variant="outlined"
                                            margin="dense"
                                            fullWidth
                                            multiline
                                            rows={18}
                                            className={classes.formControl}
                                            InputProps={{
                                                style: { minHeight: 260 }
                                            }}
                                        />

                                        <Typography className={classes.sectionTitle}>
                                            <AccountTreeIcon className={classes.sectionIcon} />
                                            Fila de atendimento
                                        </Typography>

                                        <Typography variant="body2" color="textSecondary">
                                            Selecione a fila/setor onde este assistente de IA será utilizado.
                                        </Typography>

                                        <QueueSelectSingle 
                                            className={classes.formControl}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <AccountTreeIcon className={classes.fieldIcon} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </>
                                )}

                                {activeTab === 2 && (
                                    <>
                                        <div className={classes.configSection}>
                                            <Typography className={classes.sectionTitle}>
                                                <SettingsInputAntennaIcon className={classes.sectionIcon} />
                                                Canais de atuação
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
                                                Escolha onde este agente interno deve atuar. Sem conexão selecionada, o agente fica salvo, mas não responde automaticamente por canal.
                                            </Typography>
                                            <Paper variant="outlined" style={{ padding: 14, borderRadius: 8 }}>
                                                <Grid container spacing={2} alignItems="center">
                                                    <Grid item xs={12} md={5}>
                                                        <FormControl variant="outlined" fullWidth margin="dense" className={classes.formControl}>
                                                            <InputLabel>Conexão WhatsApp</InputLabel>
                                                            <Select
                                                                value={values.channelBinding?.whatsappId || ""}
                                                                onChange={event =>
                                                                    setFieldValue("channelBinding", {
                                                                        ...(values.channelBinding || {}),
                                                                        channelType: "whatsapp",
                                                                        whatsappId: event.target.value
                                                                    })
                                                                }
                                                                label="Conexão WhatsApp"
                                                            >
                                                                <MenuItem value="">Sem conexão direta</MenuItem>
                                                                {whatsappOptions.map(whatsapp => (
                                                                    <MenuItem key={whatsapp.id} value={whatsapp.id}>
                                                                        {whatsapp.name}
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    </Grid>
                                                    <Grid item xs={12} md={3}>
                                                        <FormControlLabel
                                                            control={
                                                                <Switch
                                                                    color="primary"
                                                                    checked={Boolean(values.channelBinding?.isActive)}
                                                                    onChange={event =>
                                                                        setFieldValue("channelBinding", {
                                                                            ...(values.channelBinding || {}),
                                                                            channelType: "whatsapp",
                                                                            isActive: event.target.checked
                                                                        })
                                                                    }
                                                                />
                                                            }
                                                            label={values.channelBinding?.isActive ? "Ativo" : "Inativo"}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} md={4}>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    color="primary"
                                                                    checked={(values.channelBinding?.events || []).includes("message_received")}
                                                                    onChange={event =>
                                                                        setFieldValue("channelBinding", {
                                                                            ...(values.channelBinding || {}),
                                                                            channelType: "whatsapp",
                                                                            events: event.target.checked ? ["message_received"] : []
                                                                        })
                                                                    }
                                                                />
                                                            }
                                                            label="Mensagem recebida"
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Paper>
                                        </div>
                                    </>
                                )}

                                {activeTab === 3 && (
                                    <>
                                        {/* Etapa 4: Configuração de IA */}
                                        <Typography className={classes.sectionTitle}>
                                            <SmartToyIcon className={classes.sectionIcon} />
                                            Configuração de IA
                                        </Typography>

                                        <Typography variant="body2" color="textSecondary">
                                            Escolha o provedor, o modelo e como este agente deve consumir IA.
                                        </Typography>

                                        <div className={classes.usageModeGrid}>
                                            <div
                                                className={`${classes.usageModeCard} ${values.aiUsageMode === "system" ? "active" : ""}`}
                                                onClick={() => setFieldValue("aiUsageMode", "system")}
                                            >
                                                <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
                                                    Usar créditos do sistema
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Usa a chave central do backend e desconta créditos da empresa.
                                                </Typography>
                                            </div>
                                            <div
                                                className={`${classes.usageModeCard} ${values.aiUsageMode === "own" ? "active" : ""}`}
                                                onClick={() => setFieldValue("aiUsageMode", "own")}
                                            >
                                                <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
                                                    Usar minha API key
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Usa a chave da própria empresa e não consome créditos do sistema.
                                                </Typography>
                                            </div>
                                        </div>

                                        {/* Provedor e modelo: visíveis APENAS quando o usuário usa API key própria */}
                                        {values.aiUsageMode === "own" && (
                                            <div className={classes.multFieldLine}>
                                                <FormControl
                                                    variant="outlined"
                                                    className={classes.formControl}
                                                    margin="dense"
                                                >
                                                    <InputLabel>Provedor de IA</InputLabel>
                                                    <Select
                                                        value={selectedProvider}
                                                        onChange={handleProviderChange}
                                                        label="Provedor de IA"
                                                        className={classes.modelSelect}
                                                    >
                                                        <MenuItem value="openai">OpenAI</MenuItem>
                                                        <MenuItem value="gemini">Google Gemini</MenuItem>
                                                        <MenuItem value="openrouter">OpenRouter</MenuItem>
                                                        <MenuItem value="groq">Groq</MenuItem>
                                                    </Select>
                                                </FormControl>

                                                <FormControl
                                                    variant="outlined"
                                                    className={classes.formControl}
                                                    margin="dense"
                                                >
                                                    <InputLabel>Modelo</InputLabel>
                                                    <Select
                                                        value={selectedModel}
                                                        onChange={handleModelChange}
                                                        label="Modelo"
                                                        className={classes.modelSelect}
                                                    >
                                                        {getCurrentModels().map((model) => (
                                                            <MenuItem key={model.value} value={model.value}>
                                                                <Box display="flex" alignItems="center" width="100%">
                                                                    {model.label}
                                                                    {model.free && (
                                                                        <span className={classes.freeLabel}>
                                                                            Grátis
                                                                        </span>
                                                                    )}
                                                                </Box>
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </div>
                                        )}

                                        {values.aiUsageMode === "system" ? (
                                            <div className={classes.usageInfoBox}>
                                                <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
                                                    Créditos disponíveis
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Saldo atual da empresa: {getCreditsLabel()}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
                                                    Cada resposta do agente consome 1 crédito. O provedor e modelo são gerenciados pelo sistema.
                                                </Typography>
                                                <div className={classes.inlineMeta}>
                                                    <Chip label="Modo protegido via backend" size="small" color="primary" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={classes.usageInfoBox}>
                                                <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
                                                    API key da empresa
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    A chave fica armazenada no backend e não é devolvida ao frontend.
                                                </Typography>
                                                <TextField
                                                    label={`${providerLabels[selectedProvider] || "IA"} API Key da empresa`}
                                                    value={companyApiKeyInput[selectedProvider] || ""}
                                                    onChange={event =>
                                                        handleCompanyKeyInputChange(
                                                            selectedProvider,
                                                            event.target.value
                                                        )
                                                    }
                                                    type={showApiKey ? "text" : "password"}
                                                    variant="outlined"
                                                    margin="dense"
                                                    fullWidth
                                                    className={classes.formControl}
                                                    helperText={
                                                        companyAiConfig?.hasOwnKeys?.[selectedProvider]
                                                            ? `Já existe uma chave salva: ${companyAiConfig?.maskedKeys?.[selectedProvider]}`
                                                            : "Nenhuma chave salva ainda para este provedor."
                                                    }
                                                    InputProps={{
                                                        startAdornment: (
                                                            <InputAdornment position="start">
                                                                <VpnKeyIcon className={classes.fieldIcon} />
                                                            </InputAdornment>
                                                        ),
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton onClick={handleToggleApiKey}>
                                                                    {showApiKey ? <VisibilityOff style={{ color: "#ef4444" }} /> : <Visibility style={{ color: "#6366f1" }} />}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {/* Mensagens Humanizadas */}
                                        <div className={classes.configSection} style={{ marginTop: 24 }}>
                                            <Typography className={classes.sectionTitle}>
                                                <ChatIcon className={classes.sectionIcon} />
                                                Mensagens Humanizadas
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
                                                Divida respostas longas em mensagens menores para simular comportamento humano no WhatsApp.
                                            </Typography>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={Boolean(values.config?.splitMessagesEnabled)}
                                                        onChange={e => setFieldValue("config", { ...values.config, splitMessagesEnabled: e.target.checked })}
                                                        color="primary"
                                                    />
                                                }
                                                label="Dividir respostas longas em mensagens menores"
                                            />
                                            {values.config?.splitMessagesEnabled && (
                                                <Grid container spacing={2} style={{ marginTop: 4 }}>
                                                    <Grid item xs={6}>
                                                        <TextField
                                                            label="Máx. mensagens por resposta"
                                                            type="number"
                                                            variant="outlined"
                                                            size="small"
                                                            fullWidth
                                                            value={values.config?.maxMessagesPerReply ?? 4}
                                                            onChange={e => setFieldValue("config", { ...values.config, maxMessagesPerReply: Number(e.target.value) })}
                                                            inputProps={{ min: 2, max: 8 }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <TextField
                                                            label="Máx. chars por mensagem"
                                                            type="number"
                                                            variant="outlined"
                                                            size="small"
                                                            fullWidth
                                                            value={values.config?.maxCharsPerMessage ?? 300}
                                                            onChange={e => setFieldValue("config", { ...values.config, maxCharsPerMessage: Number(e.target.value) })}
                                                            inputProps={{ min: 100, max: 1000 }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <FormControlLabel
                                                            control={
                                                                <Switch
                                                                    checked={Boolean(values.config?.typingSimulationEnabled ?? true)}
                                                                    onChange={e => setFieldValue("config", { ...values.config, typingSimulationEnabled: e.target.checked })}
                                                                    color="primary"
                                                                    size="small"
                                                                />
                                                            }
                                                            label="Simular digitando entre mensagens"
                                                        />
                                                    </Grid>
                                                    {values.config?.typingSimulationEnabled && (
                                                        <>
                                                            <Grid item xs={6}>
                                                                <TextField
                                                                    label="Delay mínimo (ms)"
                                                                    type="number"
                                                                    variant="outlined"
                                                                    size="small"
                                                                    fullWidth
                                                                    value={values.config?.typingDelayMinMs ?? 800}
                                                                    onChange={e => setFieldValue("config", { ...values.config, typingDelayMinMs: Number(e.target.value) })}
                                                                    inputProps={{ min: 200, max: 5000 }}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={6}>
                                                                <TextField
                                                                    label="Delay máximo (ms)"
                                                                    type="number"
                                                                    variant="outlined"
                                                                    size="small"
                                                                    fullWidth
                                                                    value={values.config?.typingDelayMaxMs ?? 2000}
                                                                    onChange={e => setFieldValue("config", { ...values.config, typingDelayMaxMs: Number(e.target.value) })}
                                                                    inputProps={{ min: 500, max: 10000 }}
                                                                />
                                                            </Grid>
                                                        </>
                                                    )}
                                                </Grid>
                                            )}
                                        </div>

                                        {/* Capacidades de Mídia */}
                                        <div className={classes.configSection} style={{ marginTop: 24 }}>
                                            <Typography className={classes.sectionTitle}>
                                                <ImageIcon className={classes.sectionIcon} />
                                                Capacidades de Mídia
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
                                                Configure o que este agente consegue processar e enviar como mídia.
                                            </Typography>
                                            <FormControlLabel
                                                control={<Switch checked={Boolean(values.config?.audioEnabled)} onChange={e => setFieldValue("config", { ...values.config, audioEnabled: e.target.checked })} color="primary" />}
                                                label="Entender áudios (transcrever e compreender)"
                                            />
                                            <br />
                                            <FormControlLabel
                                                control={<Switch checked={false} disabled color="primary" />}
                                                label={<span>Arquivos e imagens <Chip size="small" label="Em breve" style={{ marginLeft: 6, fontSize: "0.65rem", height: 18 }} /></span>}
                                            />
                                        </div>

                                        {/* Notificar Escalonamento Humano */}
                                        <div className={classes.configSection} style={{ marginTop: 24 }}>
                                            <Typography className={classes.sectionTitle}>
                                                <PeopleOutlineIcon className={classes.sectionIcon} />
                                                Notificar Escalonamento Humano
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
                                                Receba um e-mail quando um contato solicitar atendimento humano.
                                            </Typography>
                                            <FormControlLabel
                                                control={<Switch checked={Boolean(values.config?.handoffNotificationEnabled)} onChange={e => setFieldValue("config", { ...values.config, handoffNotificationEnabled: e.target.checked })} color="primary" />}
                                                label="Ativar notificação de escalonamento"
                                            />
                                            {values.config?.handoffNotificationEnabled && (
                                                <TextField
                                                    label="E-mail para notificação"
                                                    type="email"
                                                    variant="outlined"
                                                    size="small"
                                                    fullWidth
                                                    style={{ marginTop: 8 }}
                                                    value={values.config?.handoffNotificationEmail || ""}
                                                    onChange={e => setFieldValue("config", { ...values.config, handoffNotificationEmail: e.target.value })}
                                                    placeholder="email@suaempresa.com"
                                                />
                                            )}
                                        </div>

                                        {/* Site / Ecommerce */}
                                        <div className={classes.configSection} style={{ marginTop: 24 }}>
                                            <Typography className={classes.sectionTitle}>
                                                <LinkIcon className={classes.sectionIcon} />
                                                Site / Ecommerce
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
                                                Insira o link do seu site ou loja. O sistema poderá mapear produtos, categorias e páginas úteis para alimentar a base de conhecimento do agente.
                                            </Typography>
                                            <Box display="flex" gridGap={8} alignItems="center">
                                                <TextField
                                                    label="URL do site ou loja"
                                                    variant="outlined"
                                                    size="small"
                                                    fullWidth
                                                    value={values.config?.siteUrl || ""}
                                                    onChange={e => setFieldValue("config", { ...values.config, siteUrl: e.target.value })}
                                                    placeholder="https://www.seusite.com.br"
                                                />
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    size="small"
                                                    disabled
                                                    style={{ whiteSpace: "nowrap" }}
                                                >
                                                    Sincronizar Site
                                                </Button>
                                            </Box>
                                            <Typography variant="caption" color="textSecondary" style={{ marginTop: 6, display: "block" }}>
                                                Sincronização de e-commerce e sites — O sistema prioriza páginas de produtos, categorias e conteúdo institucional. Disponível em breve.
                                            </Typography>
                                        </div>
                                    </>
                                )}

                                {activeTab === 4 && (
                                    <>
                                        <div className={classes.configSection}>
                                            <Typography className={classes.sectionTitle}>
                                                <SettingsInputAntennaIcon className={classes.sectionIcon} />
                                                Ferramentas disponíveis para este prompt
                                            </Typography>

                                            <Typography variant="body2" color="textSecondary">
                                                Marque somente as ferramentas que este agente deve usar. Funções sensíveis (ex.: integrações externas ou criação de empresa) ficam desabilitadas até você ativar explicitamente.
                                            </Typography>

                                            <Box className={classes.toolGrid}>
                                                {filteredTools.map(tool => {
                                                    const checked = values.toolsEnabled?.includes(tool.value);
                                                    const isSensitive = DEFAULT_SENSITIVE_TOOLS.includes(tool.value);
                                                    const Icon = TOOL_ICONS[tool.value] || SmartToyIcon;
                                                    return (
                                                        <Paper key={tool.value} className={classes.toolCard} elevation={0}>
                                                            <div className={classes.toolHeader}>
                                                                <div className={classes.toolIcon}>
                                                                    <Icon fontSize="small" />
                                                                </div>
                                                                <div>
                                                                    <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
                                                                        {tool.title}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="textSecondary">
                                                                        {tool.value}
                                                                    </Typography>
                                                                </div>
                                                                {isSensitive && (
                                                                    <Chip
                                                                        size="small"
                                                                        label="Sensível"
                                                                        style={{ marginLeft: "auto", backgroundColor: "#fee2e2", color: "#b91c1c" }}
                                                                    />
                                                                )}
                                                            </div>
                                                            <Typography className={classes.toolDescription}>
                                                                {tool.description}
                                                            </Typography>
                                                            <Typography className={classes.toolInstruction}>
                                                                {TOOL_INSTRUCTIONS[tool.value] || "Instrua a IA mencionando o nome da ferramenta quando precisar usá-la."}
                                                            </Typography>
                                                            <div className={classes.toolFooter}>
                                                                <Typography variant="caption" color="textSecondary">
                                                                    {checked ? "Ativa para este agente" : "Desativada"}
                                                                </Typography>
                                                                <Switch
                                                                    color={isSensitive ? "secondary" : "primary"}
                                                                    checked={checked}
                                                                    onChange={(_, newValue) => {
                                                                        const current = values.toolsEnabled || [];
                                                                        const next = newValue
                                                                            ? [...current, tool.value]
                                                                            : current.filter(name => name !== tool.value);
                                                                        setFieldValue("toolsEnabled", next);
                                                                        const selectedTemplate = aiTemplates.find(template => template.key === values.templateKey);
                                                                        if (selectedTemplate) {
                                                                            setFieldValue("prompt", buildPromptFromTemplate(selectedTemplate, values, next));
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </Paper>
                                                    );
                                                })}
                                            </Box>
                                        </div>
                                    </>
                                )}

                                {activeTab === 5 && (
                                    <>
                                        <div className={classes.configSection}>
                                            <Typography className={classes.sectionTitle}>
                                                <LibraryBooksIcon className={classes.sectionIcon} />
                                                Base de conhecimento
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                                                Envie PDFs, imagens ou cadastre links para fornecer contexto adicional à IA. Esses materiais serão usados para enriquecer as respostas do agente.
                                            </Typography>

                                            <Grid container spacing={2}>
                                                <Grid item xs={12} md={6}>
                                                    <div className={classes.knowledgeContainer}>
                                                        <div className={classes.knowledgeHeader}>
                                                            <Box display="flex" alignItems="center" gap={8}>
                                                                <ImageIcon color="primary" />
                                                                <Typography variant="subtitle2">Adicionar imagem</Typography>
                                                            </Box>
                                                        </div>
                                                        <Button
                                                            variant="outlined"
                                                            fullWidth
                                                            startIcon={<ImageIcon />}
                                                            className={classes.uploadButton}
                                                            disabled={knowledgeUploading}
                                                            onClick={() => imageInputRef.current?.click()}
                                                        >
                                                            {knowledgeUploading ? "Enviando..." : "Selecionar imagem"}
                                                        </Button>
                                                        <input
                                                            ref={imageInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            className={classes.fileInput}
                                                            onChange={event => {
                                                                const file = event.target.files?.[0];
                                                                if (file) {
                                                                    handleKnowledgeFileAdd(file, "image", values, setFieldValue);
                                                                }
                                                                event.target.value = null;
                                                            }}
                                                        />
                                                    </div>
                                                </Grid>

                                                <Grid item xs={12} md={6}>
                                                    <div className={classes.knowledgeContainer}>
                                                        <div className={classes.knowledgeHeader}>
                                                            <Box display="flex" alignItems="center" gap={8}>
                                                                <LibraryBooksIcon color="secondary" />
                                                                <Typography variant="subtitle2">Adicionar PDF</Typography>
                                                            </Box>
                                                        </div>
                                                        <Button
                                                            variant="outlined"
                                                            fullWidth
                                                            startIcon={<LibraryBooksIcon />}
                                                            className={classes.uploadButton}
                                                            disabled={knowledgeUploading}
                                                            onClick={() => pdfInputRef.current?.click()}
                                                        >
                                                            {knowledgeUploading ? "Enviando..." : "Selecionar PDF"}
                                                        </Button>
                                                        <input
                                                            ref={pdfInputRef}
                                                            type="file"
                                                            accept="application/pdf,.pdf"
                                                            className={classes.fileInput}
                                                            onChange={event => {
                                                                const file = event.target.files?.[0];
                                                                if (file) {
                                                                    handleKnowledgeFileAdd(file, "pdf", values, setFieldValue);
                                                                }
                                                                event.target.value = null;
                                                            }}
                                                        />
                                                    </div>
                                                </Grid>

                                                <Grid item xs={12}>
                                                    <div className={classes.knowledgeContainer}>
                                                        <div className={classes.knowledgeHeader}>
                                                            <Box display="flex" alignItems="center" gap={8}>
                                                                <LinkIcon color="action" />
                                                                <Typography variant="subtitle2">Adicionar link</Typography>
                                                            </Box>
                                                        </div>
                                                        <Grid container spacing={1}>
                                                            <Grid item xs={12} md={4}>
                                                                <TextField
                                                                    label="Título do link"
                                                                    fullWidth
                                                                    variant="outlined"
                                                                    size="small"
                                                                    value={linkForm.title}
                                                                    onChange={handleLinkInputChange("title")}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} md={6}>
                                                                <TextField
                                                                    label="URL (https://...)"
                                                                    fullWidth
                                                                    variant="outlined"
                                                                    size="small"
                                                                    value={linkForm.url}
                                                                    onChange={handleLinkInputChange("url")}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} md={2}>
                                                                <Button
                                                                    variant="contained"
                                                                    color="primary"
                                                                    fullWidth
                                                                    style={{ height: "100%" }}
                                                                    onClick={() => handleAddLinkResource(values, setFieldValue)}
                                                                >
                                                                    Adicionar
                                                                </Button>
                                                            </Grid>
                                                        </Grid>
                                                    </div>
                                                </Grid>
                                            </Grid>

                                            <Box mt={2}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Recursos adicionados
                                                </Typography>
                                                <div className={classes.knowledgeList}>
                                                    {(values.knowledgeBase || []).length === 0 && (
                                                        <div className={classes.knowledgeEmpty}>
                                                            <Typography variant="body2">
                                                                Nenhum conteúdo cadastrado ainda. Adicione arquivos ou links para disponibilizar conhecimento à IA.
                                                            </Typography>
                                                        </div>
                                                    )}

                                                    {(values.knowledgeBase || []).map((item, index) => {
                                                        const type = inferKnowledgeType(item);
                                                        const url = resolveKnowledgeUrl(item);

                                                        const Icon = type === "image" ? ImageIcon : LinkIcon;

                                                        return (
                                                            <div key={item.id || `${type}-${index}`} className={classes.knowledgeCard}>
                                                                <div className={classes.knowledgeThumb}>
                                                                    {type === "image" && url ? (
                                                                        <img src={url} alt={item.title} />
                                                                    ) : (
                                                                        <Icon color={type === "pdf" ? "secondary" : "primary"} />
                                                                    )}
                                                                </div>

                                                                <div style={{ flex: 1, marginLeft: 12 }} className={classes.knowledgeMeta}>
                                                                    <Typography variant="subtitle2" noWrap>
                                                                        {item.title || (type === "link" ? "Link salvo" : "Imagem")}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="textSecondary" noWrap>
                                                                        {item.url || item.path || "Sem URL"}
                                                                    </Typography>
                                                                    <Chip
                                                                        label={
                                                                            type === "image" ? "Imagem" : type === "pdf" ? "PDF" : "Link"
                                                                        }
                                                                        size="small"
                                                                        style={{ marginTop: 4, width: "fit-content" }}
                                                                    />
                                                                </div>

                                                                <div className={classes.knowledgeActions}>
                                                                    {url && (
                                                                        <Box display="flex" gap={4}>
                                                                            <Tooltip title="Abrir">
                                                                                <IconButton size="small" onClick={() => window.open(url, "_blank")}>
                                                                                    <OpenInNewIcon fontSize="small" />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                            <Tooltip title="Copiar link">
                                                                                <IconButton size="small" onClick={() => handleCopyToClipboard(url)}>
                                                                                    <FileCopyIcon fontSize="small" />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </Box>
                                                                    )}
                                                                    <Tooltip title="Remover">
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => handleRemoveKnowledge(index, values, setFieldValue)}
                                                                        >
                                                                            <DeleteOutlineIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </Box>
                                        </div>
                                    </>
                                )}

                                {activeTab === 6 && (
                                    <div className={classes.testChatGrid}>
                                        <div className={classes.testInfoPanel}>
                                            <Typography className={classes.sectionTitle}>
                                                <ChatIcon className={classes.sectionIcon} />
                                                Teste do agente
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" paragraph>
                                                Modo teste: nenhuma mensagem sera enviada a clientes e nenhum ticket sera criado.
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" paragraph>
                                                O teste usa o prompt atual do formulario, incluindo template, ferramentas e configuracao de IA.
                                            </Typography>
                                            <div className={classes.inlineMeta}>
                                                <Chip label="Sem canal real" size="small" />
                                                <Chip label="Ferramentas sensiveis simuladas" size="small" />
                                                <Chip label={values.aiUsageMode === "own" ? "API key propria" : "Creditos do sistema"} size="small" color="primary" />
                                            </div>
                                            <Box mt={2}>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<DeleteOutlineIcon />}
                                                    onClick={() => setTestMessages([])}
                                                    disabled={testLoading || testMessages.length === 0}
                                                >
                                                    Limpar conversa
                                                </Button>
                                            </Box>
                                        </div>

                                        <div className={classes.testPhone}>
                                            <div className={classes.testPhoneHeader}>
                                                <Box display="flex" alignItems="center" minWidth={0}>
                                                    <div className={classes.testAvatar}>
                                                        <SmartToyIcon fontSize="small" />
                                                    </div>
                                                    <Box minWidth={0}>
                                                        <Typography variant="subtitle2" noWrap style={{ fontWeight: 700 }}>
                                                            {values.agentName || values.name || "Agente IA"}
                                                        </Typography>
                                                        <Typography variant="caption" style={{ color: "#d1fae5" }}>
                                                            Modo teste
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Tooltip title="Limpar conversa">
                                                    <IconButton size="small" onClick={() => setTestMessages([])} style={{ color: "#fff" }}>
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </div>

                                            <div className={classes.testMessages}>
                                                {testMessages.length === 0 ? (
                                                    <div className={classes.testEmpty}>
                                                        Envie a primeira mensagem
                                                    </div>
                                                ) : (
                                                    testMessages.map(item => (
                                                        <div
                                                            key={item.id}
                                                            className={classes.testBubbleRow}
                                                        >
                                                            <div
                                                                className={`${classes.testBubble} ${
                                                                    item.role === "user"
                                                                        ? classes.testBubbleUser
                                                                        : classes.testBubbleAssistant
                                                                }`}
                                                            >
                                                                {item.content}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                                {testLoading && (
                                                    <div className={classes.testBubbleRow}>
                                                        <div className={`${classes.testBubble} ${classes.testBubbleAssistant}`}>
                                                            Digitando...
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className={classes.testComposer}>
                                                <TextField
                                                    value={testInput}
                                                    onChange={event => setTestInput(event.target.value)}
                                                    onKeyDown={event => {
                                                        if (event.key === "Enter" && !event.shiftKey) {
                                                            event.preventDefault();
                                                            handleSendTestMessage(values);
                                                        }
                                                    }}
                                                    placeholder="Digite sua mensagem..."
                                                    variant="outlined"
                                                    size="small"
                                                    fullWidth
                                                    multiline
                                                    rowsMax={3}
                                                    disabled={testLoading}
                                                    InputProps={{
                                                        style: {
                                                            backgroundColor: "#fff",
                                                            borderRadius: 8
                                                        }
                                                    }}
                                                />
                                                <IconButton
                                                    color="primary"
                                                    onClick={() => handleSendTestMessage(values)}
                                                    disabled={testLoading || !testInput.trim()}
                                                    style={{ backgroundColor: "#22c55e", color: "#fff" }}
                                                >
                                                    {testLoading ? <CircularProgress size={20} /> : <SendIcon />}
                                                </IconButton>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 7 && (
                                    <div className={classes.configSection}>
                                        <Typography className={classes.sectionTitle}>
                                            <AssignmentIcon className={classes.sectionIcon} />
                                            Configuração de Instruções
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                                            Configure como o agente deve se comportar em cada situação. Clique em "Usar padrão" para preencher com o padrão do template selecionado.
                                        </Typography>

                                        {[
                                            { key: "roleDefinition", label: "Definição de Função", placeholder: "Nome: [Nome]\nFunção: Consultor de Vendas via WhatsApp.\nObjetivo: Qualificar leads e conduzir para fechamento.", maxLen: 2500 },
                                            { key: "companyInfo", label: "Sobre a Empresa, Produtos e Serviços", placeholder: "Empresa: [Nome da empresa]\nSegmento: [Seu segmento]\n\nProdutos/Serviços principais:\n- [Produto 1]: [Benefícios]", maxLen: 10000 },
                                            { key: "communicationToneBlock", label: "Tom da Conversa", placeholder: "Tom de Voz: Profissional, energico e consultivo.\nPersonalidade: Especialista que entende a dor do cliente.\n\nRegras de Ouro:\n1. Use linguagem natural e fluida.", maxLen: 2500 },
                                            { key: "knowledgeBaseGuidelines", label: "Orientações sobre a Base de Conhecimento", placeholder: "1. Prioridade Máxima: Consulte sempre a Base de Conhecimento antes de responder.\n2. Se a informação não estiver na base, admita de forma profissional.", maxLen: 2500 },
                                            { key: "antiHallucination", label: "Prevenção de Informações Incorretas", placeholder: "CRÍTICO: Nunca invente preços, prazos ou especificações técnicas.\nPROIBIDO: Nunca diga 'Só um momento', 'Vou verificar', 'Aguarde' ou 'Já retorno'.", maxLen: 2500 },
                                            { key: "humanHandoff", label: "Encaminhamento para Atendimento Humano", placeholder: "Acione o transbordo humano imediatamente se:\n- O cliente pedir explicitamente para falar com uma pessoa.\n- Houver negociação de preço fora das regras.\n- O cliente demonstrar irritação grave.", maxLen: 2500 },
                                            { key: "usefulLinks", label: "Links Úteis", placeholder: "- Catálogo: https://www.suaempresa.com.br/catalogo\n- Site Oficial: https://www.suaempresa.com.br\n- Depoimentos: https://www.suaempresa.com.br/clientes", maxLen: 2500 },
                                            { key: "conversationExamples", label: "Exemplos de Conversa", placeholder: "Cliente: Quanto custa o produto X?\nAgente: O investimento no [Produto X] é de R$ [Valor]. Posso te enviar mais detalhes?", maxLen: 5000 },
                                            { key: "schedulingRules", label: "Regras de Agendamento", placeholder: "1. Nunca invente horário disponível sem consultar a agenda.\n2. Sempre ofereça no máximo 3 opções de horário.\n3. Confirme nome, data e horário antes de criar.", maxLen: 2500 },
                                            { key: "crmRules", label: "Regras de CRM / Pipeline", placeholder: "1. Atualize o contato após cada interação relevante.\n2. Mova o card apenas após confirmar com o cliente.\n3. Registre anotações sobre objeções.", maxLen: 2500 },
                                            { key: "closingRules", label: "Regras de Fechamento", placeholder: "1. Sempre ofereça um próximo passo claro.\n2. Nunca encerre sem confirmar se o cliente está satisfeito.\n3. Use urgência real quando disponível.", maxLen: 2500 },
                                            { key: "extraInstructions", label: "Instruções Extras", placeholder: "Adicione qualquer instrução específica para este agente que não se encaixe nas seções acima.", maxLen: 2500 },
                                        ].map(({ key, label, placeholder, maxLen }) => {
                                            const blockValue = values.config?.instructionBlocks?.[key] || "";
                                            return (
                                                <Box key={key} style={{ marginBottom: 20 }}>
                                                    <Box display="flex" alignItems="center" justifyContent="space-between" style={{ marginBottom: 4 }}>
                                                        <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
                                                            {label}
                                                        </Typography>
                                                        <Button
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => setFieldValue("config", {
                                                                ...values.config,
                                                                instructionBlocks: {
                                                                    ...(values.config?.instructionBlocks || {}),
                                                                    [key]: placeholder
                                                                }
                                                            })}
                                                            style={{ fontSize: "0.72rem" }}
                                                        >
                                                            Usar padrão
                                                        </Button>
                                                    </Box>
                                                    <TextField
                                                        variant="outlined"
                                                        size="small"
                                                        fullWidth
                                                        multiline
                                                        rows={4}
                                                        value={blockValue}
                                                        placeholder={placeholder}
                                                        onChange={e => setFieldValue("config", {
                                                            ...values.config,
                                                            instructionBlocks: {
                                                                ...(values.config?.instructionBlocks || {}),
                                                                [key]: e.target.value
                                                            }
                                                        })}
                                                        inputProps={{ maxLength: maxLen }}
                                                        helperText={`${blockValue.length} / ${maxLen} caracteres`}
                                                    />
                                                </Box>
                                            );
                                        })}
                                    </div>
                                )}

                                <DialogActions className={classes.dialogActions}>
                                    <Button
                                        startIcon={<CancelIcon />}
                                        onClick={handleClose}
                                        className={classes.cancelButton}
                                        disabled={isSubmitting}
                                        variant="contained"
                                    >
                                        {i18n.t("promptModal.buttons.cancel")}
                                    </Button>

                                    <Button
                                        startIcon={<SaveIcon />}
                                        type="button"
                                        onClick={submitForm}
                                        className={classes.saveButton}
                                        disabled={isSubmitting}
                                        variant="contained"
                                    >
                                        Salvar agente
                                        {isSubmitting && (
                                            <CircularProgress
                                                size={24}
                                                style={{ color: green[500], marginLeft: 15 }}
                                            />
                                        )}
                                    </Button>
                                </DialogActions>
                            </Form>
                        )}
                    </Formik>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PromptModal;
