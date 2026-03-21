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
    Switch,
    FormControlLabel,
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

// Estados possíveis de validação do número
// idle → loading → valid | invalid

const useStyles = makeStyles((theme) => ({
    dialog: {
        '& .MuiDialog-paper': {
            borderRadius: 16,
            maxWidth: 500,
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
        maxHeight: '78vh',
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
    // Botões builder
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
    addBtnRow: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: 8,
    },
    addBtn: {
        borderRadius: 8,
        textTransform: 'none',
        fontSize: 13,
        borderColor: '#075E54',
        color: '#075E54',
        '&:hover': { backgroundColor: 'rgba(7,94,84,0.06)' },
    },
    buttonTypeBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 6,
        backgroundColor: '#e0f2fe',
        color: '#0369a1',
        textTransform: 'uppercase',
        marginTop: 2,
    },
}));

const BUTTON_TYPES = [
    { value: 'reply', label: '↩ Resposta rápida' },
    { value: 'url', label: '🔗 Abrir URL' },
    { value: 'call', label: '📞 Ligar' },
    { value: 'copy', label: '📋 Copiar código' },
];

const DEFAULT_BUTTON = { displayText: '', type: 'reply', value: '' };

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
    const [message, setMessage] = useState('');
    const [whatsappId, setWhatsappId] = useState('');
    const [queueId, setQueueId] = useState('');
    const [medias, setMedias] = useState([]);

    // Botões
    const [useButtons, setUseButtons] = useState(false);
    const [buttons, setButtons] = useState([{ ...DEFAULT_BUTTON }]);

    const [loading, setLoading] = useState(false);
    const [connections, setConnections] = useState([]);
    const [queues, setQueues] = useState([]);
    const [result, setResult] = useState(null);

    // Validação de número
    const [numberValidation, setNumberValidation] = useState({ status: 'idle', normalizedNumber: '', existingContact: null, error: '' });
    const validationTimerRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        setResult(null);
        setNumber('');
        setName('');
        setMessage('');
        setWhatsappId('');
        setQueueId('');
        setMedias([]);
        setUseButtons(false);
        setButtons([{ ...DEFAULT_BUTTON }]);
        setLoading(false);
        setNumberValidation({ status: 'idle', normalizedNumber: '', existingContact: null, error: '' });

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

    // Validação de número com debounce de 800ms após parar de digitar
    useEffect(() => {
        if (validationTimerRef.current) clearTimeout(validationTimerRef.current);

        const digits = number.replace(/\D/g, '');

        if (digits.length < 10) {
            setNumberValidation({ status: 'idle', normalizedNumber: '', existingContact: null, error: '' });
            return;
        }

        if (!whatsappId) {
            setNumberValidation({ status: 'idle', normalizedNumber: '', existingContact: null, error: '' });
            return;
        }

        setNumberValidation(prev => ({ ...prev, status: 'loading' }));

        validationTimerRef.current = setTimeout(async () => {
            try {
                const { data } = await api.get('/quick-send/validate', {
                    params: { number: digits, whatsappId }
                });
                setNumberValidation({
                    status: data.valid ? 'valid' : 'invalid',
                    normalizedNumber: data.normalizedNumber || '',
                    existingContact: data.existingContact || null,
                    error: data.error || ''
                });
            } catch (err) {
                setNumberValidation({ status: 'invalid', normalizedNumber: '', existingContact: null, error: 'Erro ao validar número' });
            }
        }, 800);

        return () => clearTimeout(validationTimerRef.current);
    }, [number, whatsappId]);

    const handleChangeMedias = (e) => {
        if (!e.target.files) return;
        const selectedFiles = Array.from(e.target.files);
        const validFiles = selectedFiles.filter(file => file.size <= 10 * 1024 * 1024);
        if (validFiles.length < selectedFiles.length) toast.error("Alguns arquivos excedem 10MB.");
        setMedias([...medias, ...validFiles]);
    };

    const handleRemoveMedia = (index) => {
        const newMedias = [...medias];
        newMedias.splice(index, 1);
        setMedias(newMedias);
    };

    // ─── Botões helpers ──────────────────────────────────────────────────────
    const addButton = () => {
        if (buttons.length >= 4) return;
        setButtons([...buttons, { ...DEFAULT_BUTTON }]);
    };

    const removeButton = (i) => {
        const next = buttons.filter((_, idx) => idx !== i);
        setButtons(next.length ? next : [{ ...DEFAULT_BUTTON }]);
    };

    const updateButton = (i, field, val) => {
        const next = [...buttons];
        next[i] = { ...next[i], [field]: val };
        // Clear value when changing to reply (no URL/phone needed)
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

    const buttonsValid = buttons.every(b => {
        if (!b.displayText.trim()) return false;
        if (b.type === 'url' && !b.value.trim()) return false;
        if (b.type === 'call' && !b.value.trim()) return false;
        return true;
    });

    const normalizedNumber = number.replace(/\D/g, '');
    const isNumberValid = numberValidation.status === 'valid';
    const canSend = isNumberValid && message.trim().length > 0 && whatsappId &&
        (!useButtons || buttonsValid);

    const handleSend = async () => {
        if (!canSend || loading) return;
        setLoading(true);
        setResult(null);

        try {
            const formData = new FormData();
            // Usa o número normalizado/validado pelo backend (com 55, variante correta)
            const numberToSend = numberValidation.normalizedNumber || normalizedNumber;
            formData.append('number', numberToSend);
            formData.append('message', message.trim());
            formData.append('whatsappId', Number(whatsappId));
            if (name.trim()) formData.append('name', name.trim());
            if (queueId) formData.append('queueId', Number(queueId));
            formData.append('createIfNotExists', 'true');

            if (useButtons && !medias.length) {
                formData.append('buttons', JSON.stringify(buttons));
            } else {
                medias.forEach(media => formData.append('medias', media));
            }

            const resp = await api.post('/quick-send', formData, {
                timeout: 30000,
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { ticket } = resp.data;
            setResult({ type: 'success', msg: 'Mensagem enviada com sucesso! ✓', ticket });
            toast.success('Mensagem enviada!');
            setMessage('');
            setMedias([]);
            setButtons([{ ...DEFAULT_BUTTON }]);
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

    const handleMessageKeyDown = (e) => {
        if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSend(); }
    };

    if (!open) return null;

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
                            helperText={
                                normalizedNumber.length > 0
                                    ? `${normalizedNumber.length} dígitos`
                                    : 'Digite com DDI+DDD (ex: 5511999998888)'
                            }
                            InputProps={{
                                style: { borderRadius: 8, fontSize: 15 },
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PhoneIcon style={{ color: '#54656f', fontSize: 18 }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Feedback de validação em tempo real */}
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
                                    <Typography style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                                        Número válido no WhatsApp ✓
                                    </Typography>
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
                                    <Typography style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                                        Número inválido — não encontrado no WhatsApp ✗
                                    </Typography>
                                </Box>
                                <Typography style={{ fontSize: 11, color: '#991b1b', marginTop: 2 }}>
                                    Verifique o número e tente novamente. Envio bloqueado.
                                </Typography>
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
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonAddIcon style={{ color: '#54656f', fontSize: 16 }} />
                                    </InputAdornment>
                                ),
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

                    {/* Mensagem */}
                    <Box className={classes.card}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography className={classes.sectionLabel} style={{ marginBottom: 0 }}>
                                Mensagem{useButtons ? ' com Botões' : ' e Anexos'}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                                {/* Toggle botões */}
                                <Tooltip title={useButtons ? "Desativar botões" : "Adicionar botões interativos"}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                size="small"
                                                checked={useButtons}
                                                onChange={(e) => {
                                                    setUseButtons(e.target.checked);
                                                    setMedias([]);
                                                }}
                                                style={{ color: '#075E54' }}
                                            />
                                        }
                                        label={<Typography style={{ fontSize: 11, color: '#667781', fontWeight: 600 }}>Botões</Typography>}
                                        style={{ margin: 0 }}
                                    />
                                </Tooltip>
                                {/* Attach (só sem botões) */}
                                {!useButtons && (
                                    <>
                                        <input type="file" multiple style={{ display: 'none' }} id="quick-send-upload" onChange={handleChangeMedias} />
                                        <label htmlFor="quick-send-upload">
                                            <IconButton component="span" size="small" style={{ color: '#075E54' }}>
                                                <AttachFileIcon fontSize="small" />
                                            </IconButton>
                                        </label>
                                    </>
                                )}
                            </Box>
                        </Box>

                        {!useButtons && medias.length > 0 && (
                            <Box display="flex" flexWrap="wrap" mb={2} style={{ gap: 4 }}>
                                {medias.map((media, idx) => (
                                    <Chip
                                        key={idx} size="small" label={media.name}
                                        onDelete={() => handleRemoveMedia(idx)}
                                        deleteIcon={<HighlightOffIcon />}
                                        style={{ maxWidth: '100%' }}
                                        title={`${(media.size / 1024 / 1024).toFixed(2)} MB`}
                                    />
                                ))}
                            </Box>
                        )}

                        <TextField
                            fullWidth multiline minRows={3} maxRows={6}
                            variant="outlined"
                            placeholder={useButtons ? "Texto da mensagem (aparece acima dos botões)" : "Digite sua mensagem... (Ctrl+Enter para enviar)"}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleMessageKeyDown}
                            InputProps={{ style: { borderRadius: 8, fontSize: 14 } }}
                        />
                        <Typography className={classes.charCount}>{message.length} caracteres</Typography>
                    </Box>

                    {/* Builder de Botões */}
                    {useButtons && (
                        <Box className={classes.card}>
                            <Typography className={classes.sectionLabel}>
                                🔘 Botões interativos ({buttons.length}/4)
                            </Typography>

                            {buttons.map((btn, i) => (
                                <Box key={i} className={classes.buttonRow}>
                                    <Box className={classes.buttonIndex}>{i + 1}</Box>
                                    <Box flex={1} display="flex" flexDirection="column" gap={1}>
                                        <TextField
                                            fullWidth variant="outlined" size="small"
                                            label="Texto do botão"
                                            placeholder="Ex: Sim, quero!"
                                            value={btn.displayText}
                                            onChange={(e) => updateButton(i, 'displayText', e.target.value)}
                                            inputProps={{ maxLength: 25 }}
                                            helperText={`${btn.displayText.length}/25`}
                                            InputProps={{ style: { borderRadius: 8, fontSize: 13 } }}
                                        />
                                        <Box display="flex" gap={1}>
                                            <FormControl variant="outlined" size="small" style={{ minWidth: 160 }}>
                                                <Select
                                                    value={btn.type}
                                                    onChange={(e) => updateButton(i, 'type', e.target.value)}
                                                    style={{ borderRadius: 8, fontSize: 13 }}
                                                >
                                                    {BUTTON_TYPES.map(t => (
                                                        <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                            {btn.type !== 'reply' && (
                                                <TextField
                                                    flex={1} variant="outlined" size="small"
                                                    label={valueLabel(btn.type)}
                                                    placeholder={valuePlaceholder(btn.type)}
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
                                    <Button
                                        variant="outlined" size="small"
                                        className={classes.addBtn}
                                        startIcon={<AddIcon />}
                                        onClick={addButton}
                                    >
                                        Adicionar botão
                                    </Button>
                                </Box>
                            )}

                            <Box mt={1.5} p={1} style={{ backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                                <Typography style={{ fontSize: 11, color: '#15803d' }}>
                                    💡 Botões interativos funcionam apenas em conversas individuais. Grupos recebem texto numerado como fallback.
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
                    {loading ? 'Enviando...' : useButtons ? 'Enviar com Botões' : 'Enviar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
