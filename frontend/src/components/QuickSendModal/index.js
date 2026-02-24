import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    TextField,
    Button,
    Typography,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    InputAdornment,
    CircularProgress,
    Chip,
    IconButton,
    Divider,
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
import { toast } from 'react-toastify';
import { useHistory } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/Auth/AuthContext';
import InputMask from 'react-input-mask';

const useStyles = makeStyles((theme) => ({
    // ─── Dialog ────────────────────────────────────────────────────────────────
    dialog: {
        '& .MuiDialog-paper': {
            borderRadius: 16,
            maxWidth: 480,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        },
    },

    // ─── Header com gradiente ──────────────────────────────────────────────────
    header: {
        background: 'linear-gradient(135deg, #075E54 0%, #128C7E 60%, #25D366 100%)',
        padding: '20px 24px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#fff',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontWeight: 700,
        fontSize: 18,
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    closeBtn: {
        color: '#fff',
        '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
    },

    // ─── Conteúdo ─────────────────────────────────────────────────────────────
    content: {
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        backgroundColor: '#f0f2f5',
    },

    // ─── Campo de número com máscara ──────────────────────────────────────────
    numberCard: {
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

    // ─── Status da conexão ────────────────────────────────────────────────────
    connectionStatus: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
    },
    connected: { color: '#25D366' },
    disconnected: { color: '#ef4444' },
    pending: { color: '#f59e0b' },

    // ─── Campo de mensagem ────────────────────────────────────────────────────
    messageCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
    charCount: {
        textAlign: 'right',
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 4,
    },

    // ─── Opções avançadas ─────────────────────────────────────────────────────
    advancedCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },

    // ─── Resultado do envio ───────────────────────────────────────────────────
    resultCard: {
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    resultSuccess: {
        backgroundColor: '#dcfce7',
        border: '1px solid #86efac',
    },
    resultError: {
        backgroundColor: '#fee2e2',
        border: '1px solid #fca5a5',
    },
    resultWarning: {
        backgroundColor: '#fef3c7',
        border: '1px solid #fde68a',
    },
    openTicketBtn: {
        marginTop: 8,
        width: '100%',
        backgroundColor: '#075E54',
        color: '#fff',
        borderRadius: 8,
        '&:hover': { backgroundColor: '#064d46' },
    },

    // ─── Actions ──────────────────────────────────────────────────────────────
    actions: {
        padding: '12px 24px 20px',
        backgroundColor: '#f0f2f5',
        gap: 8,
        justifyContent: 'flex-end',
    },
    cancelBtn: {
        borderRadius: 8,
        textTransform: 'none',
        fontWeight: 600,
    },
    sendBtn: {
        borderRadius: 8,
        textTransform: 'none',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #075E54, #25D366)',
        color: '#fff',
        padding: '8px 24px',
        '&:hover': {
            background: 'linear-gradient(135deg, #064d46, #1aab52)',
        },
        '&:disabled': {
            background: '#e2e8f0',
            color: '#94a3b8',
        },
    },
}));

// ─── Chip de status da conexão ────────────────────────────────────────────────
function ConnectionStatusChip({ status }) {
    const classes = useStyles();
    const map = {
        CONNECTED: { label: 'Conectado', cls: 'connected', color: '#25D366' },
        CONNECTING: { label: 'Conectando', cls: 'pending', color: '#f59e0b' },
        DISCONNECTED: { label: 'Desconectado', cls: 'disconnected', color: '#ef4444' },
        qrcode: { label: 'Aguardando QR', cls: 'pending', color: '#f59e0b' },
    };
    const s = map[status] || { label: status, cls: 'pending', color: '#94a3b8' };

    return (
        <Box
            component="span"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: s.color,
                fontWeight: 600,
            }}
        >
            <WifiIcon style={{ fontSize: 12 }} />
            {s.label}
        </Box>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function QuickSendModal({ open, onClose }) {
    const classes = useStyles();
    const history = useHistory();
    const { user } = useContext(AuthContext);

    // Formulário
    const [number, setNumber] = useState('');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [whatsappId, setWhatsappId] = useState('');
    const [queueId, setQueueId] = useState('');

    // Estado da operação
    const [loading, setLoading] = useState(false);
    const [connections, setConnections] = useState([]);
    const [queues, setQueues] = useState([]);
    const [result, setResult] = useState(null); // { type: 'success'|'error'|'warning', msg, ticket }

    // ─── Carrega conexões e filas ao abrir ──────────────────────────────────
    useEffect(() => {
        if (!open) return;
        setResult(null);
        setNumber('');
        setName('');
        setMessage('');
        setWhatsappId('');
        setQueueId('');
        setLoading(false);

        const load = async () => {
            try {
                const [connRes, queueRes] = await Promise.all([
                    api.get('/quick-send/connections'),
                    api.get('/queue'),
                ]);
                setConnections(connRes.data || []);
                setQueues(queueRes.data || []);

                // Pré-seleciona primeira conexão CONNECTED
                const firstConn = (connRes.data || []).find((c) => c.status === 'CONNECTED');
                if (firstConn) setWhatsappId(firstConn.id);
            } catch (err) {
                console.error('Erro ao carregar conexões:', err);
            }
        };
        load();
    }, [open]);

    // ─── Normaliza número ────────────────────────────────────────────────────
    const normalizedNumber = number.replace(/\D/g, '');

    // ─── Validação inline ────────────────────────────────────────────────────
    const isNumberValid = normalizedNumber.length >= 10 && normalizedNumber.length <= 15;
    const canSend = isNumberValid && message.trim().length > 0 && whatsappId;

    // ─── Envio ───────────────────────────────────────────────────────────────
    const handleSend = async () => {
        if (!canSend || loading) return;
        setLoading(true);
        setResult(null);

        try {
            const resp = await api.post('/quick-send', {
                number: normalizedNumber,
                message: message.trim(),
                whatsappId: Number(whatsappId),
                name: name.trim() || undefined,
                queueId: queueId ? Number(queueId) : undefined,
                createIfNotExists: true,
            }, { timeout: 20000 });

            const { ticket } = resp.data;
            setResult({ type: 'success', msg: 'Mensagem enviada com sucesso! ✓', ticket });
            toast.success('Mensagem enviada!');
        } catch (err) {
            if (err?.response?.status === 206) {
                // Parcial: ticket criado mas mensagem falhou
                const { ticket, warning } = err.response.data;
                setResult({ type: 'warning', msg: warning, ticket });
            } else {
                let msg = err?.response?.data?.error || 'Erro ao enviar mensagem.';
                if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                    msg = 'Tempo esgotado: o servidor não respondeu a tempo. Verifique sua conexão ou se o WhatsApp está conectado.';
                }
                setResult({ type: 'error', msg });
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    // ─── Abre o ticket no chat ───────────────────────────────────────────────
    const handleOpenTicket = () => {
        if (!result?.ticket) return;
        onClose();
        history.push(`/tickets/${result.ticket.id}`);
    };

    // ─── Atalho: Enter no campo de mensagem ─────────────────────────────────
    const handleMessageKeyDown = (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onClose={onClose} className={classes.dialog} maxWidth="sm">
            {/* ── Header WhatsApp ────────────────────────────────────────────────── */}
            <Box className={classes.header}>
                <Box className={classes.headerLeft}>
                    <Box className={classes.headerIcon}>
                        <SendIcon style={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography className={classes.headerTitle}>
                            Mensagem Rápida
                        </Typography>
                        <Typography className={classes.headerSubtitle}>
                            Envie sem abrir conversa
                        </Typography>
                    </Box>
                </Box>
                <Tooltip title="Fechar">
                    <IconButton className={classes.closeBtn} size="small" onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* ── Conteúdo ──────────────────────────────────────────────────────── */}
            <DialogContent className={classes.content} style={{ padding: 0 }}>
                <Box style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* ── Número de destino ─────────────────────────────────────────── */}
                    <Box className={classes.numberCard}>
                        <Typography className={classes.sectionLabel}>
                            <PhoneIcon style={{ fontSize: 13 }} />
                            Número de destino
                        </Typography>
                        <TextField
                            id="quick-send-number"
                            fullWidth
                            variant="outlined"
                            size="small"
                            placeholder="5511999998888 (com DDD e código do país)"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            error={number.length > 0 && !isNumberValid}
                            helperText={
                                number.length > 0 && !isNumberValid
                                    ? 'Informe pelo menos 10 dígitos (DDD + número)'
                                    : normalizedNumber.length > 0
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
                        <TextField
                            id="quick-send-name"
                            fullWidth
                            variant="outlined"
                            size="small"
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

                    {/* ── Conexão WhatsApp ──────────────────────────────────────────── */}
                    <Box className={classes.numberCard}>
                        <Typography className={classes.sectionLabel}>
                            <WifiIcon style={{ fontSize: 13 }} />
                            Conexão WhatsApp
                        </Typography>
                        <FormControl fullWidth variant="outlined" size="small">
                            <Select
                                id="quick-send-connection"
                                value={whatsappId}
                                onChange={(e) => setWhatsappId(e.target.value)}
                                displayEmpty
                                style={{ borderRadius: 8 }}
                            >
                                <MenuItem value="" disabled>
                                    <em>Selecione uma conexão...</em>
                                </MenuItem>
                                {connections.map((conn) => (
                                    <MenuItem key={conn.id} value={conn.id}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" style={{ gap: 8 }}>
                                            <Box>
                                                <Typography style={{ fontWeight: 600, fontSize: 13 }}>
                                                    {conn.name}
                                                </Typography>
                                                <Typography style={{ fontSize: 11, color: '#667781' }}>
                                                    {conn.number || 'Sem número'}
                                                </Typography>
                                            </Box>
                                            <ConnectionStatusChip status={conn.status} />
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth variant="outlined" size="small" style={{ marginTop: 8 }}>
                            <Select
                                id="quick-send-queue"
                                value={queueId}
                                onChange={(e) => setQueueId(e.target.value)}
                                displayEmpty
                                style={{ borderRadius: 8 }}
                            >
                                <MenuItem value="">
                                    <em>Sem fila (opcional)</em>
                                </MenuItem>
                                {queues.map((q) => (
                                    <MenuItem key={q.id} value={q.id}>
                                        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                                            <Box
                                                style={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    backgroundColor: q.color || '#54656f',
                                                    flexShrink: 0,
                                                }}
                                            />
                                            {q.name}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* ── Mensagem ──────────────────────────────────────────────────── */}
                    <Box className={classes.messageCard}>
                        <Typography className={classes.sectionLabel}>
                            Mensagem
                        </Typography>
                        <TextField
                            id="quick-send-message"
                            fullWidth
                            multiline
                            minRows={3}
                            maxRows={7}
                            variant="outlined"
                            placeholder="Digite sua mensagem... (Ctrl+Enter para enviar)"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleMessageKeyDown}
                            InputProps={{ style: { borderRadius: 8, fontSize: 14 } }}
                        />
                        <Typography className={classes.charCount}>
                            {message.length} caracteres
                        </Typography>
                    </Box>

                    {/* ── Resultado ─────────────────────────────────────────────────── */}
                    {result && (
                        <Box
                            className={`${classes.resultCard} ${result.type === 'success'
                                ? classes.resultSuccess
                                : result.type === 'warning'
                                    ? classes.resultWarning
                                    : classes.resultError
                                }`}
                        >
                            <Box style={{ flex: 1 }}>
                                {result.type === 'success' && <CheckCircleIcon style={{ color: '#16a34a', marginRight: 6 }} />}
                                {result.type === 'error' && <ErrorIcon style={{ color: '#dc2626', marginRight: 6 }} />}
                                <Typography style={{ display: 'inline', fontSize: 13, fontWeight: 500 }}>
                                    {result.msg}
                                </Typography>
                                {result.ticket && (
                                    <Button
                                        id="quick-send-open-ticket-btn"
                                        className={classes.openTicketBtn}
                                        startIcon={<OpenInNewIcon />}
                                        onClick={handleOpenTicket}
                                        size="small"
                                    >
                                        Abrir conversa #{result.ticket.id}
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            {/* ── Actions ───────────────────────────────────────────────────────── */}
            <DialogActions className={classes.actions}>
                <Button className={classes.cancelBtn} onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    id="quick-send-submit-btn"
                    className={classes.sendBtn}
                    startIcon={loading ? <CircularProgress size={16} style={{ color: '#fff' }} /> : <SendIcon />}
                    onClick={handleSend}
                    disabled={!canSend || loading}
                >
                    {loading ? 'Enviando...' : 'Enviar mensagem'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
