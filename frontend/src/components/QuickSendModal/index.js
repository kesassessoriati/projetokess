import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Box,
    TextField,
    Button,
    Typography,
    MenuItem,
    Select,
    FormControl,
    InputAdornment,
    CircularProgress,
    Chip,
    IconButton,
    Tooltip,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import SendIcon from '@material-ui/icons/Send';
import PhoneIcon from '@material-ui/icons/Phone';
import CloseIcon from '@material-ui/icons/Close';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import WifiIcon from '@material-ui/icons/Wifi';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import AddIcon from '@material-ui/icons/Add';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import { toast } from 'react-toastify';
import { useHistory } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/Auth/AuthContext';

const useStyles = makeStyles((theme) => ({
    dialog: {
        '& .MuiDialog-paper': {
            borderRadius: 16,
            maxWidth: 540,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        },
    },
    header: {
        background: 'linear-gradient(135deg, #075E54 0%, #128C7E 60%, #25D366 100%)',
        padding: '20px 24px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#fff',
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontWeight: 700, fontSize: 18, color: '#fff' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    closeBtn: { color: '#fff', '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' } },
    content: {
        padding: 0,
        backgroundColor: '#f0f2f5',
        maxHeight: '80vh',
        overflowY: 'auto',
    },
    inner: { padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: 700,
        color: '#667781',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    },
    charCount: { textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 4 },
    resultCard: {
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    resultSuccess: { backgroundColor: '#dcfce7', border: '1px solid #86efac' },
    resultError: { backgroundColor: '#fee2e2', border: '1px solid #fca5a5' },
    resultWarning: { backgroundColor: '#fef3c7', border: '1px solid #fde68a' },
    openTicketBtn: {
        marginTop: 8,
        width: '100%',
        backgroundColor: '#075E54',
        color: '#fff',
        borderRadius: 8,
        '&:hover': { backgroundColor: '#064d46' },
    },
    actions: {
        padding: '12px 24px 20px',
        backgroundColor: '#f0f2f5',
        gap: 8,
        justifyContent: 'flex-end',
    },
    cancelBtn: { borderRadius: 8, textTransform: 'none', fontWeight: 600 },
    sendBtn: {
        borderRadius: 8,
        textTransform: 'none',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #075E54, #25D366)',
        color: '#fff',
        padding: '8px 24px',
        '&:hover': { background: 'linear-gradient(135deg, #064d46, #1aab52)' },
        '&:disabled': { background: '#e2e8f0', color: '#94a3b8' },
    },
    msgTypeBtn: {
        flex: 1,
        padding: '10px 8px',
        borderRadius: 10,
        border: '2px solid transparent',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 600,
        color: '#667781',
        backgroundColor: '#f8fafc',
        transition: 'all 0.15s',
        '&:hover': { backgroundColor: '#e8f5e9', color: '#075E54' },
    },
    msgTypeBtnActive: {
        border: '2px solid #075E54',
        backgroundColor: '#e8f5e9',
        color: '#075E54',
    },
    buttonRow: {
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        marginTop: 8,
        padding: '10px 12px',
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
    },
    buttonIndex: {
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: '#075E54',
        color: '#fff',
        fontSize: 12,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 8,
    },
    addBtnRow: { display: 'flex', justifyContent: 'center', marginTop: 8 },
    addBtn: {
        borderRadius: 8,
        textTransform: 'none',
        fontSize: 13,
        borderColor: '#075E54',
        color: '#075E54',
        '&:hover': { backgroundColor: 'rgba(7,94,84,0.06)' },
    },
    cardRow: {
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        marginTop: 8,
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoBox: {
        padding: '8px 12px',
        backgroundColor: '#f0fdf4',
        borderRadius: 8,
        border: '1px solid #bbf7d0',
        marginTop: 8,
    },
    warnBox: {
        padding: '8px 12px',
        backgroundColor: '#fffbeb',
        borderRadius: 8,
        border: '1px solid #fde68a',
        marginTop: 8,
    },
}));

// ─── Tipos de botão (formato legado para /quick-send) ──────────────────────
const BUTTON_TYPES = [
    { value: 'reply', label: '↩ Resposta rápida' },
    { value: 'url', label: '🔗 Abrir URL' },
    { value: 'call', label: '📞 Ligar' },
    { value: 'copy', label: '📋 Copiar código' },
];

const DEFAULT_BUTTON = { displayText: '', type: 'reply', value: '' };

// ─── Templates pré-preenchidos ─────────────────────────────────────────────
const BUTTONS_TEMPLATE = [
    { displayText: 'Sim, quero!', type: 'reply', value: 'btn_sim' },
    { displayText: 'Não, obrigado', type: 'reply', value: 'btn_nao' },
    { displayText: 'Ver site', type: 'url', value: 'https://seusite.com.br' },
    { displayText: 'Ligar agora', type: 'call', value: '5511999998888' },
];

const CAROUSEL_TEMPLATE = [
    {
        headerTitle: 'Oferta Especial',
        imageUrl: 'https://www.w3schools.com/w3css/img_lights.jpg',
        body: 'Aproveite nossas melhores ofertas com desconto exclusivo!',
        footer: 'Válido até hoje',
        buttons: [
            { displayText: 'Ver oferta', type: 'url', value: 'https://seusite.com.br/oferta' },
            { displayText: 'Quero!', type: 'reply', value: 'btn_quero' },
        ],
    },
    {
        headerTitle: 'Novo Produto',
        imageUrl: 'https://www.w3schools.com/w3css/img_forest.jpg',
        body: 'Conheça nossa nova linha de produtos premium.',
        footer: 'Frete grátis',
        buttons: [
            { displayText: 'Saber mais', type: 'reply', value: 'btn_info' },
            { displayText: 'Ligar', type: 'call', value: '5511999998888' },
        ],
    },
];

const POLL_TEMPLATE = {
    name: 'Qual o seu horário preferido para atendimento?',
    options: ['Manhã (8h–12h)', 'Tarde (13h–17h)', 'Noite (18h–22h)'],
    selectableCount: 1,
};

function ConnectionStatusChip({ status }) {
    const map = {
        CONNECTED: { label: 'Conectado', color: '#25D366' },
        CONNECTING: { label: 'Conectando', color: '#f59e0b' },
        DISCONNECTED: { label: 'Desconectado', color: '#ef4444' },
        qrcode: { label: 'Aguardando QR', color: '#f59e0b' },
    };
    const s = map[status] || { label: status, color: '#94a3b8' };
    return (
        <Box component="span" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: s.color, fontWeight: 600 }}>
            <WifiIcon style={{ fontSize: 12 }} />
            {s.label}
        </Box>
    );
}

export default function QuickSendModal({ open, onClose }) {
    const classes = useStyles();
    const history = useHistory();
    const { user } = useContext(AuthContext);

    const [number, setNumber] = useState('');
    const [name, setName] = useState('');
    const [whatsappId, setWhatsappId] = useState('');
    const [queueId, setQueueId] = useState('');
    const [medias, setMedias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [connections, setConnections] = useState([]);
    const [queues, setQueues] = useState([]);
    const [result, setResult] = useState(null);
    const [numberValidation, setNumberValidation] = useState({ status: 'idle', normalizedNumber: '', existingContact: null, error: '' });
    const validationTimerRef = useRef(null);

    // Tipo de mensagem: text | buttons | carousel | poll
    const [messageType, setMessageType] = useState('text');

    // Texto (usado em text e buttons)
    const [message, setMessage] = useState('');

    // Botões
    const [buttons, setButtons] = useState([...BUTTONS_TEMPLATE]);

    // Carrossel
    const [carouselCards, setCarouselCards] = useState(CAROUSEL_TEMPLATE.map(c => ({ ...c, buttons: c.buttons.map(b => ({ ...b })) })));

    // Enquete
    const [pollName, setPollName] = useState(POLL_TEMPLATE.name);
    const [pollOptions, setPollOptions] = useState([...POLL_TEMPLATE.options]);
    const [pollSelectableCount, setPollSelectableCount] = useState(1);

    const resetState = () => {
        setResult(null);
        setNumber('');
        setName('');
        setMessage('');
        setWhatsappId('');
        setQueueId('');
        setMedias([]);
        setMessageType('text');
        setButtons([...BUTTONS_TEMPLATE]);
        setCarouselCards(CAROUSEL_TEMPLATE.map(c => ({ ...c, buttons: c.buttons.map(b => ({ ...b })) })));
        setPollName(POLL_TEMPLATE.name);
        setPollOptions([...POLL_TEMPLATE.options]);
        setPollSelectableCount(1);
        setLoading(false);
        setNumberValidation({ status: 'idle', normalizedNumber: '', existingContact: null, error: '' });
    };

    useEffect(() => {
        if (!open) return;
        resetState();
        const load = async () => {
            try {
                const [connRes, queueRes] = await Promise.all([
                    api.get('/quick-send/connections'),
                    api.get('/queue'),
                ]);
                setConnections(connRes.data || []);
                setQueues(queueRes.data || []);
                const firstConn = (connRes.data || []).find((c) => c.status === 'CONNECTED');
                if (firstConn) setWhatsappId(firstConn.id);
            } catch (err) {
                console.error('Erro ao carregar conexões:', err);
            }
        };
        load();
    }, [open]);

    // Validação de número com debounce
    useEffect(() => {
        if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
        const digits = number.replace(/\D/g, '');
        if (digits.length < 10 || !whatsappId) {
            setNumberValidation({ status: 'idle', normalizedNumber: '', existingContact: null, error: '' });
            return;
        }
        setNumberValidation(prev => ({ ...prev, status: 'loading' }));
        validationTimerRef.current = setTimeout(async () => {
            try {
                const { data } = await api.get('/quick-send/validate', { params: { number: digits, whatsappId } });
                setNumberValidation({
                    status: data.valid ? 'valid' : 'invalid',
                    normalizedNumber: data.normalizedNumber || '',
                    existingContact: data.existingContact || null,
                    error: data.error || ''
                });
            } catch {
                setNumberValidation({ status: 'invalid', normalizedNumber: '', existingContact: null, error: 'Erro ao validar número' });
            }
        }, 800);
        return () => clearTimeout(validationTimerRef.current);
    }, [number, whatsappId]);

    // ── Handlers de mídia ──────────────────────────────────────────────────────
    const handleChangeMedias = (e) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files).filter(f => f.size <= 10 * 1024 * 1024);
        setMedias([...medias, ...files]);
    };

    // ── Helpers de botões ──────────────────────────────────────────────────────
    const addButton = () => { if (buttons.length < 4) setButtons([...buttons, { ...DEFAULT_BUTTON }]); };
    const removeButton = (i) => setButtons(buttons.filter((_, idx) => idx !== i).length ? buttons.filter((_, idx) => idx !== i) : [{ ...DEFAULT_BUTTON }]);
    const updateButton = (i, field, val) => {
        const next = [...buttons];
        next[i] = { ...next[i], [field]: val };
        if (field === 'type' && val === 'reply') next[i].value = '';
        setButtons(next);
    };
    const valuePlaceholder = (type) => {
        if (type === 'url') return 'https://seusite.com.br';
        if (type === 'call') return '5511999998888';
        if (type === 'copy') return 'CODIGO123';
        return '(opcional)';
    };
    const valueLabel = (type) => {
        if (type === 'url') return 'URL';
        if (type === 'call') return 'Número';
        if (type === 'copy') return 'Código';
        return 'ID (opcional)';
    };

    // ── Helpers de carrossel ───────────────────────────────────────────────────
    const addCard = () => {
        if (carouselCards.length >= 10) return;
        setCarouselCards([...carouselCards, { headerTitle: '', imageUrl: '', body: '', footer: '', buttons: [{ displayText: 'Saiba mais', type: 'reply', value: 'btn_info' }] }]);
    };
    const removeCard = (i) => setCarouselCards(carouselCards.filter((_, idx) => idx !== i));
    const updateCard = (i, field, val) => {
        const next = [...carouselCards];
        next[i] = { ...next[i], [field]: val };
        setCarouselCards(next);
    };
    const addCardButton = (ci) => {
        if ((carouselCards[ci].buttons || []).length >= 3) return;
        const next = [...carouselCards];
        next[ci] = { ...next[ci], buttons: [...(next[ci].buttons || []), { displayText: '', type: 'reply', value: '' }] };
        setCarouselCards(next);
    };
    const removeCardButton = (ci, bi) => {
        const next = [...carouselCards];
        next[ci] = { ...next[ci], buttons: (next[ci].buttons || []).filter((_, i) => i !== bi) };
        setCarouselCards(next);
    };
    const updateCardButton = (ci, bi, field, val) => {
        const next = [...carouselCards];
        const btns = [...(next[ci].buttons || [])];
        btns[bi] = { ...btns[bi], [field]: val };
        if (field === 'type' && val === 'reply') btns[bi].value = '';
        next[ci] = { ...next[ci], buttons: btns };
        setCarouselCards(next);
    };

    // ── Helpers de enquete ─────────────────────────────────────────────────────
    const addPollOption = () => { if (pollOptions.length < 12) setPollOptions([...pollOptions, '']); };
    const removePollOption = (i) => { if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, idx) => idx !== i)); };
    const updatePollOption = (i, val) => { const next = [...pollOptions]; next[i] = val; setPollOptions(next); };

    // ── Validação ─────────────────────────────────────────────────────────────
    const normalizedNumber = number.replace(/\D/g, '');
    const isNumberValid = numberValidation.status === 'valid';

    const buttonsValid = buttons.every(b => {
        if (!b.displayText.trim()) return false;
        if (b.type === 'url' && !b.value.trim()) return false;
        if (b.type === 'call' && !b.value.trim()) return false;
        return true;
    });

    const carouselValid = carouselCards.length >= 1 && carouselCards.every(c => c.body.trim());

    const pollValid = pollName.trim().length > 0 && pollOptions.length >= 2 && pollOptions.every(o => o.trim().length > 0);

    const canSend = isNumberValid && whatsappId && (() => {
        if (messageType === 'text') return message.trim().length > 0;
        if (messageType === 'buttons') return message.trim().length > 0 && buttonsValid;
        if (messageType === 'carousel') return carouselValid;
        if (messageType === 'poll') return pollValid;
        return false;
    })();

    // ── Envio ─────────────────────────────────────────────────────────────────
    const handleSend = async () => {
        if (!canSend || loading) return;
        setLoading(true);
        setResult(null);

        try {
            const numberToSend = numberValidation.normalizedNumber || normalizedNumber;
            const formData = new FormData();
            formData.append('number', numberToSend);
            formData.append('whatsappId', Number(whatsappId));
            if (name.trim()) formData.append('name', name.trim());
            if (queueId) formData.append('queueId', Number(queueId));
            formData.append('createIfNotExists', 'true');
            formData.append('messageType', messageType);

            if (messageType === 'text') {
                formData.append('message', message.trim());
                medias.forEach(media => formData.append('medias', media));
            } else if (messageType === 'buttons') {
                formData.append('message', message.trim());
                formData.append('buttons', JSON.stringify(buttons));
            } else if (messageType === 'carousel') {
                formData.append('carouselCards', JSON.stringify(carouselCards));
            } else if (messageType === 'poll') {
                formData.append('pollName', pollName.trim());
                formData.append('pollOptions', JSON.stringify(pollOptions.map(o => o.trim()).filter(Boolean)));
                formData.append('pollSelectableCount', String(pollSelectableCount));
            }

            const resp = await api.post('/quick-send', formData, {
                timeout: 30000,
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { ticket } = resp.data;
            setResult({ type: 'success', msg: 'Mensagem enviada com sucesso! ✓', ticket });
            toast.success('Mensagem enviada!');
        } catch (err) {
            if (err?.response?.status === 206) {
                const { ticket, warning } = err.response.data;
                setResult({ type: 'warning', msg: warning, ticket });
            } else {
                let msg = err?.response?.data?.error || 'Erro ao enviar mensagem.';
                if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                    msg = 'Tempo esgotado. Verifique se o WhatsApp está conectado.';
                }
                setResult({ type: 'error', msg });
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOpenTicket = () => {
        if (!result?.ticket) return;
        onClose();
        history.push(`/tickets/${result.ticket.id}`);
    };

    if (!open) return null;

    const MSG_TYPES = [
        { value: 'text', icon: '💬', label: 'Texto' },
        { value: 'buttons', icon: '🔘', label: 'Botões' },
        { value: 'carousel', icon: '🎠', label: 'Carrossel' },
        { value: 'poll', icon: '📊', label: 'Enquete' },
    ];

    return (
        <Dialog open={open} onClose={onClose} className={classes.dialog} maxWidth="sm">
            {/* Header */}
            <Box className={classes.header}>
                <Box className={classes.headerLeft}>
                    <Box className={classes.headerIcon}>
                        <SendIcon style={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography className={classes.headerTitle}>Mensagem Rápida</Typography>
                        <Typography className={classes.headerSubtitle}>Envie sem abrir conversa</Typography>
                    </Box>
                </Box>
                <Tooltip title="Fechar">
                    <IconButton className={classes.closeBtn} size="small" onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <DialogContent className={classes.content}>
                <Box className={classes.inner}>

                    {/* Número de destino */}
                    <Box className={classes.card}>
                        <Typography className={classes.sectionLabel}>
                            <PhoneIcon style={{ fontSize: 13 }} />
                            Número de destino
                        </Typography>
                        <TextField
                            fullWidth variant="outlined" size="small"
                            placeholder="5511999998888 (com DDD e código do país)"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            error={numberValidation.status === 'invalid'}
                            helperText={normalizedNumber.length > 0 ? `${normalizedNumber.length} dígitos` : 'Digite com DDI+DDD (ex: 5511999998888)'}
                            InputProps={{
                                style: { borderRadius: 8, fontSize: 15 },
                                startAdornment: <InputAdornment position="start"><PhoneIcon style={{ color: '#54656f', fontSize: 18 }} /></InputAdornment>,
                            }}
                        />
                        {numberValidation.status === 'loading' && (
                            <Box display="flex" alignItems="center" mt={1} style={{ gap: 6 }}>
                                <CircularProgress size={14} style={{ color: '#54656f' }} />
                                <Typography style={{ fontSize: 12, color: '#54656f' }}>Validando número no WhatsApp...</Typography>
                            </Box>
                        )}
                        {numberValidation.status === 'valid' && (
                            <Box style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#dcfce7', borderRadius: 8, border: '1px solid #86efac' }}>
                                <Box display="flex" alignItems="center" style={{ gap: 6 }}>
                                    <CheckCircleIcon style={{ color: '#16a34a', fontSize: 16 }} />
                                    <Typography style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>Número válido no WhatsApp ✓</Typography>
                                </Box>
                                {numberValidation.existingContact && (
                                    <Typography style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                                        Contato existente: <strong>{numberValidation.existingContact.name}</strong>
                                    </Typography>
                                )}
                            </Box>
                        )}
                        {numberValidation.status === 'invalid' && (
                            <Box style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#fee2e2', borderRadius: 8, border: '1px solid #fca5a5' }}>
                                <Box display="flex" alignItems="center" style={{ gap: 6 }}>
                                    <ErrorIcon style={{ color: '#dc2626', fontSize: 16 }} />
                                    <Typography style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>Número inválido — não encontrado no WhatsApp ✗</Typography>
                                </Box>
                            </Box>
                        )}
                        <TextField
                            fullWidth variant="outlined" size="small"
                            placeholder="Nome do contato (opcional — usado ao criar)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{ marginTop: 8 }}
                            InputProps={{
                                style: { borderRadius: 8, fontSize: 13 },
                                startAdornment: <InputAdornment position="start"><PersonAddIcon style={{ color: '#54656f', fontSize: 16 }} /></InputAdornment>,
                            }}
                        />
                    </Box>

                    {/* Conexão WhatsApp */}
                    <Box className={classes.card}>
                        <Typography className={classes.sectionLabel}>
                            <WifiIcon style={{ fontSize: 13 }} />
                            Conexão WhatsApp
                        </Typography>
                        <FormControl fullWidth variant="outlined" size="small">
                            <Select value={whatsappId} onChange={(e) => setWhatsappId(e.target.value)} displayEmpty style={{ borderRadius: 8 }}>
                                <MenuItem value="" disabled><em>Selecione uma conexão...</em></MenuItem>
                                {connections.map((conn) => (
                                    <MenuItem key={conn.id} value={conn.id}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" style={{ gap: 8 }}>
                                            <Box>
                                                <Typography style={{ fontWeight: 600, fontSize: 13 }}>{conn.name}</Typography>
                                                <Typography style={{ fontSize: 11, color: '#667781' }}>{conn.number || 'Sem número'}</Typography>
                                            </Box>
                                            <ConnectionStatusChip status={conn.status} />
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth variant="outlined" size="small" style={{ marginTop: 8 }}>
                            <Select value={queueId} onChange={(e) => setQueueId(e.target.value)} displayEmpty style={{ borderRadius: 8 }}>
                                <MenuItem value=""><em>Sem fila (opcional)</em></MenuItem>
                                {queues.map((q) => (
                                    <MenuItem key={q.id} value={q.id}>
                                        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                                            <Box style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: q.color || '#54656f', flexShrink: 0 }} />
                                            {q.name}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Tipo de Mensagem */}
                    <Box className={classes.card}>
                        <Typography className={classes.sectionLabel}>Tipo de mensagem</Typography>
                        <Box display="flex" gap={1} style={{ gap: 8 }}>
                            {MSG_TYPES.map(t => (
                                <Box
                                    key={t.value}
                                    className={`${classes.msgTypeBtn} ${messageType === t.value ? classes.msgTypeBtnActive : ''}`}
                                    onClick={() => setMessageType(t.value)}
                                    component="button"
                                    style={{ border: messageType === t.value ? '2px solid #075E54' : '2px solid #e2e8f0', cursor: 'pointer', background: 'none', outline: 'none' }}
                                >
                                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                                    <span>{t.label}</span>
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    {/* ── Texto simples ──────────────────────────────────────── */}
                    {messageType === 'text' && (
                        <Box className={classes.card}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography className={classes.sectionLabel} style={{ marginBottom: 0 }}>Mensagem e Anexos</Typography>
                                <>
                                    <input type="file" multiple style={{ display: 'none' }} id="quick-send-upload" onChange={handleChangeMedias} />
                                    <label htmlFor="quick-send-upload">
                                        <IconButton component="span" size="small" style={{ color: '#075E54' }}>
                                            <AttachFileIcon fontSize="small" />
                                        </IconButton>
                                    </label>
                                </>
                            </Box>
                            {medias.length > 0 && (
                                <Box display="flex" flexWrap="wrap" mb={2} style={{ gap: 4 }}>
                                    {medias.map((media, idx) => (
                                        <Chip key={idx} size="small" label={media.name} onDelete={() => setMedias(medias.filter((_, i) => i !== idx))} deleteIcon={<HighlightOffIcon />} />
                                    ))}
                                </Box>
                            )}
                            <TextField
                                fullWidth multiline minRows={3} maxRows={6} variant="outlined"
                                placeholder="Digite sua mensagem... (Ctrl+Enter para enviar)"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                                InputProps={{ style: { borderRadius: 8, fontSize: 14 } }}
                            />
                            <Typography className={classes.charCount}>{message.length} caracteres</Typography>
                        </Box>
                    )}

                    {/* ── Botões interativos ─────────────────────────────────── */}
                    {messageType === 'buttons' && (
                        <Box className={classes.card}>
                            <Typography className={classes.sectionLabel}>💬 Texto da mensagem (aparece acima dos botões)</Typography>
                            <TextField
                                fullWidth multiline minRows={2} maxRows={4} variant="outlined"
                                placeholder="Ex: Escolha uma das opções abaixo:"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                InputProps={{ style: { borderRadius: 8, fontSize: 14 } }}
                            />
                            <Typography className={classes.charCount}>{message.length} caracteres</Typography>

                            <Box mt={2}>
                                <Typography className={classes.sectionLabel}>🔘 Botões interativos ({buttons.length}/4)</Typography>
                                {buttons.map((btn, i) => (
                                    <Box key={i} className={classes.buttonRow}>
                                        <Box className={classes.buttonIndex}>{i + 1}</Box>
                                        <Box flex={1} display="flex" flexDirection="column" style={{ gap: 6 }}>
                                            <TextField
                                                fullWidth variant="outlined" size="small"
                                                label="Texto do botão" placeholder="Ex: Sim, quero!"
                                                value={btn.displayText}
                                                onChange={(e) => updateButton(i, 'displayText', e.target.value)}
                                                inputProps={{ maxLength: 25 }}
                                                helperText={`${btn.displayText.length}/25`}
                                                InputProps={{ style: { borderRadius: 8, fontSize: 13 } }}
                                            />
                                            <Box display="flex" style={{ gap: 6 }}>
                                                <FormControl variant="outlined" size="small" style={{ minWidth: 160 }}>
                                                    <Select value={btn.type} onChange={(e) => updateButton(i, 'type', e.target.value)} style={{ borderRadius: 8, fontSize: 13 }}>
                                                        {BUTTON_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                                                    </Select>
                                                </FormControl>
                                                {btn.type !== 'reply' && (
                                                    <TextField
                                                        variant="outlined" size="small"
                                                        label={valueLabel(btn.type)} placeholder={valuePlaceholder(btn.type)}
                                                        value={btn.value}
                                                        onChange={(e) => updateButton(i, 'value', e.target.value)}
                                                        InputProps={{ style: { borderRadius: 8, fontSize: 13 } }}
                                                        style={{ flex: 1 }}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                        <IconButton size="small" onClick={() => removeButton(i)} style={{ color: '#ef4444', marginTop: 4 }}>
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ))}
                                {buttons.length < 4 && (
                                    <Box className={classes.addBtnRow}>
                                        <Button variant="outlined" size="small" className={classes.addBtn} startIcon={<AddIcon />} onClick={addButton}>
                                            Adicionar botão
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                            <Box className={classes.infoBox}>
                                <Typography style={{ fontSize: 11, color: '#15803d' }}>
                                    💡 Modelo pré-preenchido com exemplo. Edite os textos e valores para a sua mensagem real.
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {/* ── Carrossel de cards ──────────────────────────────────── */}
                    {messageType === 'carousel' && (
                        <Box className={classes.card}>
                            <Typography className={classes.sectionLabel}>🎠 Cards do carrossel ({carouselCards.length}/10)</Typography>
                            <Box className={classes.warnBox} style={{ marginBottom: 10 }}>
                                <Typography style={{ fontSize: 11, color: '#92400e' }}>
                                    ✏️ Modelo pré-preenchido. Edite os campos com seus dados reais e clique em Enviar.
                                </Typography>
                            </Box>
                            {carouselCards.map((card, ci) => (
                                <Box key={ci} className={classes.cardRow}>
                                    <Box className={classes.cardHeader}>
                                        <Typography style={{ fontWeight: 700, fontSize: 13, color: '#075E54' }}>Card {ci + 1}</Typography>
                                        {carouselCards.length > 1 && (
                                            <IconButton size="small" onClick={() => removeCard(ci)} style={{ color: '#ef4444' }}>
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Box>
                                    <Box display="flex" flexDirection="column" style={{ gap: 8 }}>
                                        <TextField fullWidth variant="outlined" size="small" label="Título" placeholder="Ex: Oferta Especial"
                                            value={card.headerTitle} onChange={(e) => updateCard(ci, 'headerTitle', e.target.value)}
                                            InputProps={{ style: { borderRadius: 8, fontSize: 13 } }} />
                                        <TextField fullWidth variant="outlined" size="small" label="URL da Imagem" placeholder="https://..."
                                            value={card.imageUrl} onChange={(e) => updateCard(ci, 'imageUrl', e.target.value)}
                                            InputProps={{ style: { borderRadius: 8, fontSize: 13 } }} />
                                        <TextField fullWidth variant="outlined" size="small" label="Corpo da mensagem *" placeholder="Descrição do produto ou oferta" required
                                            value={card.body} onChange={(e) => updateCard(ci, 'body', e.target.value)}
                                            multiline rows={2} InputProps={{ style: { borderRadius: 8, fontSize: 13 } }} />
                                        <TextField fullWidth variant="outlined" size="small" label="Rodapé (opcional)" placeholder="Ex: Frete grátis"
                                            value={card.footer} onChange={(e) => updateCard(ci, 'footer', e.target.value)}
                                            InputProps={{ style: { borderRadius: 8, fontSize: 13 } }} />

                                        {/* Botões do card */}
                                        <Typography style={{ fontSize: 11, color: '#667781', fontWeight: 700, marginTop: 4 }}>
                                            Botões do card ({(card.buttons || []).length}/3)
                                        </Typography>
                                        {(card.buttons || []).map((btn, bi) => (
                                            <Box key={bi} display="flex" alignItems="center" style={{ gap: 6 }}>
                                                <TextField variant="outlined" size="small" label="Texto" placeholder="Ex: Ver oferta"
                                                    value={btn.displayText} onChange={(e) => updateCardButton(ci, bi, 'displayText', e.target.value)}
                                                    inputProps={{ maxLength: 25 }} InputProps={{ style: { borderRadius: 8, fontSize: 12 } }} style={{ flex: 1 }} />
                                                <FormControl variant="outlined" size="small" style={{ minWidth: 130 }}>
                                                    <Select value={btn.type} onChange={(e) => updateCardButton(ci, bi, 'type', e.target.value)} style={{ borderRadius: 8, fontSize: 12 }}>
                                                        {BUTTON_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                                                    </Select>
                                                </FormControl>
                                                {btn.type !== 'reply' && (
                                                    <TextField variant="outlined" size="small" label={valueLabel(btn.type)} placeholder={valuePlaceholder(btn.type)}
                                                        value={btn.value} onChange={(e) => updateCardButton(ci, bi, 'value', e.target.value)}
                                                        InputProps={{ style: { borderRadius: 8, fontSize: 12 } }} style={{ flex: 1 }} />
                                                )}
                                                <IconButton size="small" onClick={() => removeCardButton(ci, bi)} style={{ color: '#ef4444' }}>
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ))}
                                        {(card.buttons || []).length < 3 && (
                                            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => addCardButton(ci)}
                                                style={{ borderColor: '#075E54', color: '#075E54', borderRadius: 8, textTransform: 'none', fontSize: 12 }}>
                                                + Botão
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                            {carouselCards.length < 10 && (
                                <Box className={classes.addBtnRow} style={{ marginTop: 10 }}>
                                    <Button variant="outlined" size="small" className={classes.addBtn} startIcon={<AddIcon />} onClick={addCard}>
                                        Adicionar card
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* ── Enquete (Poll) ─────────────────────────────────────── */}
                    {messageType === 'poll' && (
                        <Box className={classes.card}>
                            <Typography className={classes.sectionLabel}>📊 Enquete</Typography>
                            <Box className={classes.warnBox} style={{ marginBottom: 12 }}>
                                <Typography style={{ fontSize: 11, color: '#92400e' }}>
                                    ✏️ Modelo pré-preenchido. Edite a pergunta e as opções para a sua enquete real.
                                </Typography>
                            </Box>
                            <TextField
                                fullWidth variant="outlined" size="small"
                                label="Pergunta da enquete *"
                                placeholder="Ex: Qual o seu horário preferido?"
                                value={pollName}
                                onChange={(e) => setPollName(e.target.value)}
                                inputProps={{ maxLength: 255 }}
                                helperText={`${pollName.length}/255`}
                                InputProps={{ style: { borderRadius: 8, fontSize: 14 } }}
                                style={{ marginBottom: 12 }}
                            />

                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography style={{ fontSize: 11, fontWeight: 700, color: '#667781', textTransform: 'uppercase' }}>
                                    Opções ({pollOptions.length}/12) — mín. 2
                                </Typography>
                                <FormControl variant="outlined" size="small" style={{ minWidth: 170 }}>
                                    <Select
                                        value={pollSelectableCount}
                                        onChange={(e) => setPollSelectableCount(e.target.value)}
                                        style={{ borderRadius: 8, fontSize: 12 }}
                                    >
                                        <MenuItem value={1}>Escolha única (1)</MenuItem>
                                        <MenuItem value={0}>Múltipla escolha</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>

                            {pollOptions.map((opt, i) => (
                                <Box key={i} display="flex" alignItems="center" style={{ gap: 8, marginBottom: 8 }}>
                                    <Box className={classes.buttonIndex}>{i + 1}</Box>
                                    <TextField
                                        fullWidth variant="outlined" size="small"
                                        placeholder={i === 0 ? "Ex: Manhã (8h–12h)" : i === 1 ? "Ex: Tarde (13h–17h)" : "Ex: Noite (18h–22h)"}
                                        value={opt}
                                        onChange={(e) => updatePollOption(i, e.target.value)}
                                        inputProps={{ maxLength: 100 }}
                                        InputProps={{ style: { borderRadius: 8, fontSize: 13 } }}
                                    />
                                    <IconButton size="small" onClick={() => removePollOption(i)} disabled={pollOptions.length <= 2} style={{ color: '#ef4444' }}>
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            ))}
                            {pollOptions.length < 12 && (
                                <Box className={classes.addBtnRow}>
                                    <Button variant="outlined" size="small" className={classes.addBtn} startIcon={<AddIcon />} onClick={addPollOption}>
                                        Adicionar opção
                                    </Button>
                                </Box>
                            )}
                            <Box className={classes.infoBox} style={{ marginTop: 10 }}>
                                <Typography style={{ fontSize: 11, color: '#15803d' }}>
                                    📌 Enquetes funcionam apenas em conversas individuais. Os votos aparecem na conversa em tempo real.
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {/* Resultado */}
                    {result && (
                        <Box className={`${classes.resultCard} ${result.type === 'success' ? classes.resultSuccess : result.type === 'warning' ? classes.resultWarning : classes.resultError}`}>
                            <Box style={{ flex: 1 }}>
                                {result.type === 'success' && <CheckCircleIcon style={{ color: '#16a34a', marginRight: 6 }} />}
                                {result.type === 'error' && <ErrorIcon style={{ color: '#dc2626', marginRight: 6 }} />}
                                <Typography style={{ display: 'inline', fontSize: 13, fontWeight: 500 }}>{result.msg}</Typography>
                                {result.ticket && (
                                    <Button className={classes.openTicketBtn} startIcon={<OpenInNewIcon />} onClick={handleOpenTicket} size="small">
                                        Abrir conversa #{result.ticket.id}
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions className={classes.actions}>
                <Button className={classes.cancelBtn} onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    className={classes.sendBtn}
                    startIcon={loading ? <CircularProgress size={16} style={{ color: '#fff' }} /> : <SendIcon />}
                    onClick={handleSend}
                    disabled={!canSend || loading}
                >
                    {loading ? 'Enviando...' : {
                        text: 'Enviar',
                        buttons: 'Enviar com Botões',
                        carousel: 'Enviar Carrossel',
                        poll: 'Enviar Enquete',
                    }[messageType] || 'Enviar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
