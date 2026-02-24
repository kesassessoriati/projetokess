import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    Box,
    TextField,
    IconButton,
    Typography,
    CircularProgress,
    Tooltip,
    Chip,
    Avatar,
    Collapse,
    Divider,
    Button,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import LockIcon from '@material-ui/icons/Lock';
import SendIcon from '@material-ui/icons/Send';
import DeleteIcon from '@material-ui/icons/Delete';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import NoteAddIcon from '@material-ui/icons/NoteAdd';
import { toast } from 'react-toastify';
import moment from 'moment';
import api from '../../services/api';
import { AuthContext } from '../../context/Auth/AuthContext';
import ConfirmationModal from '../ConfirmationModal';

const useStyles = makeStyles((theme) => ({
    // ─── Container principal ──────────────────────────────────────────────
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
    },

    // ─── Cabeçalho da seção ───────────────────────────────────────────────
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
        cursor: 'pointer',
        userSelect: 'none',
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontWeight: 600,
        fontSize: 13,
        color: '#92400e', // Amber-800 — tom quente que remete a "nota"
    },
    lockIcon: {
        fontSize: 16,
        color: '#d97706', // Amber-600
    },
    noteCount: {
        backgroundColor: '#fde68a', // Amber-200
        color: '#92400e',
        fontWeight: 700,
        fontSize: 11,
        height: 20,
        minWidth: 20,
    },

    // ─── Input de nova nota ───────────────────────────────────────────────
    inputArea: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        backgroundColor: '#fffbeb', // Amber-50
        border: '1px solid #fde68a',
        borderRadius: 10,
        padding: '10px 12px',
    },
    inputRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
    },
    textField: {
        flex: 1,
        '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#fff',
            fontSize: 13,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#d97706',
            },
        },
        '& .MuiInputLabel-root.Mui-focused': {
            color: '#d97706',
        },
    },
    sendButton: {
        backgroundColor: '#d97706',
        color: '#fff',
        borderRadius: 8,
        width: 40,
        height: 40,
        flexShrink: 0,
        '&:hover': {
            backgroundColor: '#b45309',
        },
        '&:disabled': {
            backgroundColor: '#fde68a',
        },
    },
    inputHint: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: '#92400e',
        opacity: 0.8,
    },

    // ─── Lista de notas ───────────────────────────────────────────────────
    notesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        maxHeight: 320,
        overflowY: 'auto',
        paddingRight: 2,
        '&::-webkit-scrollbar': {
            width: 4,
        },
        '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#fde68a',
            borderRadius: 4,
        },
    },

    // ─── Card de nota privada (amarelo) ──────────────────────────────────
    noteCard: {
        backgroundColor: '#fefce8', // Yellow-50 — fundo amarelo suave
        border: '1px solid #fde68a', // Yellow-200
        borderLeft: '3px solid #d97706', // Amber-600 — destaque lateral
        borderRadius: '0 8px 8px 0',
        padding: '8px 10px',
        position: 'relative',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.15)',
            '& $noteActions': {
                opacity: 1,
            },
        },
    },
    noteHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    noteAvatar: {
        width: 22,
        height: 22,
        fontSize: 10,
        backgroundColor: '#d97706',
        color: '#fff',
    },
    noteAuthor: {
        fontSize: 12,
        fontWeight: 600,
        color: '#92400e',
        flex: 1,
    },
    noteTime: {
        fontSize: 11,
        color: '#b45309',
        opacity: 0.8,
    },
    noteBody: {
        fontSize: 13,
        color: '#451a03', // Amber-950 — legível sobre fundo amarelo
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },
    notePrivateBadge: {
        position: 'absolute',
        top: 6,
        right: 34,
        fontSize: 10,
        height: 18,
        backgroundColor: '#fde68a',
        color: '#78350f',
        borderRadius: 4,
    },
    noteActions: {
        position: 'absolute',
        top: 6,
        right: 6,
        opacity: 0,
        transition: 'opacity 0.2s ease',
    },
    deleteBtn: {
        padding: 3,
        color: '#ef4444',
        '& svg': {
            fontSize: 15,
        },
    },

    // ─── Estado vazio ─────────────────────────────────────────────────────
    emptyState: {
        textAlign: 'center',
        padding: '12px 8px',
        color: '#92400e',
        opacity: 0.6,
        fontSize: 12,
    },

    // ─── Botão "adicionar nota" colapsado ────────────────────────────────
    addNoteBtn: {
        fontSize: 12,
        color: '#d97706',
        borderColor: '#fde68a',
        textTransform: 'none',
        padding: '4px 12px',
        borderRadius: 8,
        '&:hover': {
            borderColor: '#d97706',
            backgroundColor: '#fffbeb',
        },
    },
}));

// ─── Componente principal ─────────────────────────────────────────────────────
export function PrivateNoteInput({ ticket }) {
    const classes = useStyles();
    const { user } = useContext(AuthContext);

    const [notes, setNotes] = useState([]);
    const [noteText, setNoteText] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [inputVisible, setInputVisible] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const ticketId = ticket?.id;
    const contactId = ticket?.contactId;

    // ─── Carrega notas privadas do ticket ────────────────────────────────
    const loadNotes = useCallback(async () => {
        if (!ticketId || !contactId) return;
        setLoading(true);
        try {
            const { data } = await api.get('/ticket-notes/list', {
                params: { ticketId, contactId, includePublic: 'false' }
            });
            setNotes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Erro ao carregar notas privadas:', err);
        } finally {
            setLoading(false);
        }
    }, [ticketId, contactId]);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    // ─── Salva nova nota ─────────────────────────────────────────────────
    const handleSave = async () => {
        const text = noteText.trim();
        if (!text || text.length < 2) {
            toast.warning('A nota deve ter pelo menos 2 caracteres.');
            return;
        }

        setSaving(true);
        try {
            await api.post('/ticket-notes', {
                note: text,
                ticketId,
                contactId,
                isPrivate: true
            });
            setNoteText('');
            setInputVisible(false);
            await loadNotes();
            toast.success('Nota privada salva!');
        } catch (err) {
            const msg = err?.response?.data?.error || 'Erro ao salvar nota.';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    // ─── Deleta nota ─────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/ticket-notes/${deleteTarget.id}`);
            setDeleteTarget(null);
            await loadNotes();
            toast.success('Nota removida.');
        } catch (err) {
            const msg = err?.response?.data?.error || 'Erro ao remover nota.';
            toast.error(msg);
        }
    };

    // ─── Atalho de teclado: Ctrl+Enter salva ─────────────────────────────
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    };

    // ─── Iniciais do usuário para o avatar ───────────────────────────────
    const getInitials = (name = '') =>
        name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

    const canDelete = (note) =>
        user?.profile === 'admin' || String(note.userId) === String(user?.id);

    return (
        <Box className={classes.root}>
            {/* ── Modal de confirmação de deleção ─────────────────────────────── */}
            <ConfirmationModal
                title="Remover nota privada"
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                Esta nota privada será removida permanentemente. Continuar?
            </ConfirmationModal>

            {/* ── Cabeçalho colapsável ─────────────────────────────────────────── */}
            <Box className={classes.sectionHeader} onClick={() => setExpanded((v) => !v)}>
                <Box className={classes.sectionTitle}>
                    <LockIcon className={classes.lockIcon} />
                    <span>Notas Privadas</span>
                    {notes.length > 0 && (
                        <Chip
                            label={notes.length}
                            size="small"
                            className={classes.noteCount}
                        />
                    )}
                </Box>
                <Box display="flex" alignItems="center" gap={4}>
                    {!inputVisible && (
                        <Tooltip title="Nova nota privada">
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setInputVisible(true);
                                    setExpanded(true);
                                }}
                            >
                                <NoteAddIcon style={{ fontSize: 18, color: '#d97706' }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {expanded ? (
                        <ExpandLessIcon style={{ fontSize: 18, color: '#92400e' }} />
                    ) : (
                        <ExpandMoreIcon style={{ fontSize: 18, color: '#92400e' }} />
                    )}
                </Box>
            </Box>

            <Collapse in={expanded}>
                <Box display="flex" flexDirection="column" style={{ gap: 8 }}>
                    {/* ── Área de input (visível ao clicar em +) ──────────────────── */}
                    <Collapse in={inputVisible}>
                        <Box className={classes.inputArea}>
                            <Box className={classes.inputRow}>
                                <TextField
                                    id="private-note-input"
                                    className={classes.textField}
                                    label="Escreva uma nota privada..."
                                    multiline
                                    minRows={2}
                                    maxRows={5}
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    variant="outlined"
                                    size="small"
                                    autoFocus
                                    disabled={saving}
                                />
                                <Tooltip title="Salvar nota (Ctrl+Enter)">
                                    <IconButton
                                        id="private-note-save-btn"
                                        className={classes.sendButton}
                                        onClick={handleSave}
                                        disabled={saving || noteText.trim().length < 2}
                                    >
                                        {saving ? (
                                            <CircularProgress size={18} style={{ color: '#fff' }} />
                                        ) : (
                                            <SendIcon style={{ fontSize: 18 }} />
                                        )}
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Box className={classes.inputHint}>
                                <LockIcon style={{ fontSize: 12 }} />
                                <span>Visível apenas para sua equipe · Ctrl+Enter para salvar</span>
                            </Box>
                        </Box>
                    </Collapse>

                    {/* ── Lista de notas ──────────────────────────────────────────── */}
                    {loading ? (
                        <Box display="flex" justifyContent="center" p={1}>
                            <CircularProgress size={20} style={{ color: '#d97706' }} />
                        </Box>
                    ) : notes.length === 0 ? (
                        !inputVisible && (
                            <Box className={classes.emptyState}>
                                <LockIcon style={{ fontSize: 24, opacity: 0.4, display: 'block', margin: '0 auto 4px' }} />
                                Nenhuma nota privada ainda.
                                <br />
                                <Button
                                    id="private-note-add-first-btn"
                                    variant="outlined"
                                    size="small"
                                    className={classes.addNoteBtn}
                                    style={{ marginTop: 8 }}
                                    onClick={() => setInputVisible(true)}
                                >
                                    + Adicionar nota
                                </Button>
                            </Box>
                        )
                    ) : (
                        <Box className={classes.notesList}>
                            {notes.map((note) => (
                                <Box key={note.id} className={classes.noteCard}>
                                    {/* Header da nota */}
                                    <Box className={classes.noteHeader}>
                                        <Avatar className={classes.noteAvatar}>
                                            {getInitials(note.user?.name)}
                                        </Avatar>
                                        <Typography className={classes.noteAuthor}>
                                            {note.user?.name || 'Usuário'}
                                        </Typography>
                                        <Typography className={classes.noteTime}>
                                            {moment(note.createdAt).format('DD/MM/YY HH:mm')}
                                        </Typography>
                                    </Box>

                                    {/* Corpo da nota */}
                                    <Typography className={classes.noteBody}>
                                        {note.note}
                                    </Typography>

                                    {/* Badge "Privada" */}
                                    <Chip
                                        icon={<LockIcon style={{ fontSize: 10 }} />}
                                        label="Privada"
                                        size="small"
                                        className={classes.notePrivateBadge}
                                    />

                                    {/* Botão deletar (hover) */}
                                    {canDelete(note) && (
                                        <Box className={classes.noteActions}>
                                            <Tooltip title="Remover nota">
                                                <IconButton
                                                    className={classes.deleteBtn}
                                                    size="small"
                                                    onClick={() => setDeleteTarget(note)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}

export default PrivateNoteInput;
