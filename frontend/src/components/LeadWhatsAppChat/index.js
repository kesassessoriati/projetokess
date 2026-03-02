import React, { useState, useEffect, useRef } from "react";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    FormControl,
    IconButton,
    MenuItem,
    Paper,
    Select,
    TextField,
    Tooltip,
    Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import InsertEmoticonIcon from "@material-ui/icons/InsertEmoticon";
import PhoneIcon from "@material-ui/icons/Phone";
import ScheduleIcon from "@material-ui/icons/Schedule";
import SendIcon from "@material-ui/icons/Send";
import WifiIcon from "@material-ui/icons/Wifi";
import Picker from "@emoji-mart/react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import api from "../../services/api";
import loadEmojiData from "../../utils/loadEmojiData";
import ScheduleModal from "../ScheduleModal";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "#e5ddd5",
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
    },
    connectionBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 10,
        backgroundColor: "rgba(0,0,0,0.45)",
        color: "#fff",
        borderRadius: 4,
        padding: "2px 10px",
        fontSize: 11,
        display: "flex",
        alignItems: "center",
        gap: 4,
        cursor: "pointer",
        "&:hover": { backgroundColor: "rgba(0,0,0,0.6)" },
    },
    messagesList: {
        flex: 1,
        padding: theme.spacing(2),
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(1),
        paddingTop: 36,
    },
    messageRow: {
        display: "flex",
        width: "100%",
    },
    messageRowAgent: { justifyContent: "flex-end" },
    messageRowLead: { justifyContent: "flex-start" },
    messageBubble: {
        maxWidth: "75%",
        padding: theme.spacing(1, 1.5),
        borderRadius: 8,
        position: "relative",
        boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
        display: "flex",
        flexDirection: "column",
    },
    bubbleAgent: {
        backgroundColor: "#dcf8c6",
        borderTopRightRadius: 0,
    },
    bubbleLead: {
        backgroundColor: "#ffffff",
        borderTopLeftRadius: 0,
    },
    messageText: {
        fontSize: "0.875rem",
        wordWrap: "break-word",
        whiteSpace: "pre-wrap",
    },
    timestamp: {
        fontSize: "0.65rem",
        color: "rgba(0,0,0,0.45)",
        alignSelf: "flex-end",
        marginTop: 2,
    },
    inputArea: {
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f0f0f0",
        borderTop: "1px solid #d3d3d3",
        position: "relative",
    },
    emojiPickerWrapper: {
        position: "absolute",
        bottom: "100%",
        left: 0,
        zIndex: 9999,
    },
    attachmentChips: {
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        padding: "4px 12px",
    },
    toolbarRow: {
        display: "flex",
        alignItems: "center",
        padding: "2px 8px",
        gap: 2,
        borderBottom: "1px solid #e0e0e0",
    },
    toolbarBtn: {
        color: "#54656f",
        padding: 6,
    },
    inputRow: {
        display: "flex",
        alignItems: "center",
        padding: "4px 8px",
        gap: 8,
    },
    textField: {
        flex: 1,
        backgroundColor: "#ffffff",
        borderRadius: 20,
        "& .MuiOutlinedInput-root": {
            borderRadius: 20,
            "& fieldset": { border: "none" },
        },
    },
    sendButton: {
        backgroundColor: "#128c7e",
        color: "#ffffff",
        "&:hover": { backgroundColor: "#075e54" },
        "&:disabled": { backgroundColor: "#ccc" },
    },
    // ─── Pre-modal ────────────────────────────────────────────────────────────
    preModalHeader: {
        background: "linear-gradient(135deg, #075E54 0%, #128C7E 60%, #25D366 100%)",
        color: "#fff",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 10,
    },
    preModalContent: {
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        backgroundColor: "#f0f2f5",
    },
    preModalCard: {
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: 700,
        color: "#54656f",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        display: "flex",
        alignItems: "center",
        gap: 4,
    },
}));

const LeadWhatsAppChat = ({ leadId, op }) => {
    const classes = useStyles();

    // ── Pre-modal state ───────────────────────────────────────────────────────
    const [preModalOpen, setPreModalOpen] = useState(true);
    const [connections, setConnections] = useState([]);
    const [selectedPhone, setSelectedPhone] = useState("");
    const [selectedWhatsappId, setSelectedWhatsappId] = useState("");
    const [selectedWhatsappName, setSelectedWhatsappName] = useState("");
    const [loadingConnections, setLoadingConnections] = useState(false);

    // ── Chat state ────────────────────────────────────────────────────────────
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [medias, setMedias] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiData, setEmojiData] = useState(null);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);

    // ── Load connections + pre-fill phone ────────────────────────────────────
    useEffect(() => {
        setLoadingConnections(true);
        api.get("/quick-send/connections")
            .then(({ data }) => {
                setConnections(data || []);
                const firstConn = (data || []).find((c) => c.status === "CONNECTED");
                if (firstConn) {
                    setSelectedWhatsappId(firstConn.id);
                    setSelectedWhatsappName(firstConn.name);
                }
            })
            .catch(() => {})
            .finally(() => setLoadingConnections(false));

        // Pre-fill phone from contact
        const contactNumber = op?.contact?.number || "";
        if (contactNumber) setSelectedPhone(contactNumber);

        // Load emoji data lazily
        loadEmojiData().then(setEmojiData).catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Load messages after pre-modal confirmed ───────────────────────────────
    useEffect(() => {
        if (!leadId || preModalOpen) return;
        setLoading(true);
        api.get(`/crm/leads/${leadId}/messages`)
            .then(({ data }) => setMessages(data || []))
            .catch(() => toast.error("Erro ao carregar mensagens."))
            .finally(() => setLoading(false));
    }, [leadId, preModalOpen]);

    // ── Auto-scroll ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // ── Confirm pre-modal ─────────────────────────────────────────────────────
    const handleConfirm = () => {
        const normalized = selectedPhone.replace(/\D/g, "");
        if (normalized.length < 10) {
            toast.warning("Informe um número válido (mínimo 10 dígitos com DDI + DDD).");
            return;
        }
        if (!selectedWhatsappId) {
            toast.warning("Selecione uma conexão WhatsApp.");
            return;
        }
        const conn = connections.find((c) => c.id === selectedWhatsappId);
        if (conn) setSelectedWhatsappName(conn.name);
        setPreModalOpen(false);
    };

    // ── Send message via WhatsApp ─────────────────────────────────────────────
    const handleSend = async () => {
        const normalizedPhone = selectedPhone.replace(/\D/g, "");
        if ((!newMessage.trim() && medias.length === 0) || !normalizedPhone || !selectedWhatsappId) return;
        setSending(true);
        setShowEmojiPicker(false);
        try {
            const formData = new FormData();
            formData.append("number", normalizedPhone);
            formData.append("message", newMessage.trim());
            formData.append("whatsappId", Number(selectedWhatsappId));
            formData.append("createIfNotExists", "true");
            if (op?.contact?.name) formData.append("name", op.contact.name);
            medias.forEach((f) => formData.append("medias", f));

            await api.post("/quick-send", formData, {
                timeout: 30000,
                headers: { "Content-Type": "multipart/form-data" },
            });

            // Record in internal history
            if (leadId && newMessage.trim()) {
                const { data: savedMsg } = await api.post(`/crm/leads/${leadId}/messages`, {
                    message: newMessage.trim(),
                    senderType: "agent",
                });
                setMessages((prev) => [...prev, savedMsg]);
            }

            setNewMessage("");
            setMedias([]);
            toast.success("Mensagem enviada via WhatsApp!");
        } catch (err) {
            const errMsg = err?.response?.data?.error || "Erro ao enviar mensagem.";
            toast.error(errMsg);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleEmojiSelect = (emoji) => {
        setNewMessage((prev) => prev + (emoji.native || ""));
        setShowEmojiPicker(false);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        const valid = files.filter((f) => f.size <= 10 * 1024 * 1024);
        if (valid.length < files.length) toast.warning("Alguns arquivos excedem 10MB e foram ignorados.");
        setMedias((prev) => [...prev, ...valid]);
        e.target.value = "";
    };

    const handleRemoveMedia = (idx) => {
        setMedias((prev) => prev.filter((_, i) => i !== idx));
    };

    // ── Guard: no leadId ──────────────────────────────────────────────────────
    if (!leadId) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography color="textSecondary">
                    Salve o lead primeiro para habilitar o chat.
                </Typography>
            </Box>
        );
    }

    return (
        <>
            {/* ─── Pre-modal: seleção de número e conexão ───────────────────────── */}
            <Dialog open={preModalOpen} maxWidth="xs" fullWidth>
                <Box className={classes.preModalHeader}>
                    <WifiIcon />
                    <Box>
                        <Typography style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
                            Enviar via WhatsApp
                        </Typography>
                        <Typography style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                            Confirme o número e a conexão
                        </Typography>
                    </Box>
                </Box>

                <DialogContent className={classes.preModalContent}>
                    {/* Número de destino */}
                    <Box className={classes.preModalCard}>
                        <Typography className={classes.sectionLabel}>
                            <PhoneIcon style={{ fontSize: 13 }} /> Número de destino
                        </Typography>
                        <TextField
                            fullWidth
                            variant="outlined"
                            size="small"
                            label="Número (DDI + DDD + número)"
                            placeholder="5511999998888"
                            value={selectedPhone}
                            onChange={(e) => setSelectedPhone(e.target.value)}
                            InputProps={{ style: { borderRadius: 8, fontSize: 14 } }}
                        />
                    </Box>

                    {/* Conexão WhatsApp */}
                    <Box className={classes.preModalCard}>
                        <Typography className={classes.sectionLabel}>
                            <WifiIcon style={{ fontSize: 13 }} /> Conexão WhatsApp
                        </Typography>
                        {loadingConnections ? (
                            <Box display="flex" justifyContent="center" py={1}>
                                <CircularProgress size={22} />
                            </Box>
                        ) : (
                            <FormControl fullWidth variant="outlined" size="small">
                                <Select
                                    value={selectedWhatsappId}
                                    onChange={(e) => setSelectedWhatsappId(e.target.value)}
                                    displayEmpty
                                    style={{ borderRadius: 8 }}
                                >
                                    <MenuItem value="" disabled>
                                        <em>Selecione uma conexão...</em>
                                    </MenuItem>
                                    {connections.map((conn) => (
                                        <MenuItem key={conn.id} value={conn.id}>
                                            <Box
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                width="100%"
                                                style={{ gap: 8 }}
                                            >
                                                <Typography style={{ fontWeight: 600, fontSize: 13 }}>
                                                    {conn.name}
                                                </Typography>
                                                <Typography
                                                    style={{
                                                        fontSize: 11,
                                                        color:
                                                            conn.status === "CONNECTED"
                                                                ? "#25D366"
                                                                : "#ef4444",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {conn.status === "CONNECTED" ? "Conectado" : conn.status}
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions style={{ padding: "10px 16px", gap: 8, backgroundColor: "#f0f2f5" }}>
                    {/* Cancel only available if already configured (i.e., re-opening to change) */}
                    {selectedWhatsappName && (
                        <Button
                            onClick={() => setPreModalOpen(false)}
                            style={{ textTransform: "none", color: "#54656f" }}
                            size="small"
                        >
                            Cancelar
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleConfirm}
                        disabled={!selectedPhone.replace(/\D/g, "") || !selectedWhatsappId}
                        style={{
                            background: "linear-gradient(135deg, #075E54, #25D366)",
                            color: "#fff",
                            borderRadius: 8,
                            textTransform: "none",
                            fontWeight: 600,
                        }}
                    >
                        Iniciar Chat
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ─── Mini-chat WhatsApp ───────────────────────────────────────────── */}
            <Paper elevation={0} className={classes.root}>
                {/* Badge da conexão ativa — clique para alterar */}
                <Tooltip title="Clique para alterar número/conexão">
                    <Box className={classes.connectionBadge} onClick={() => setPreModalOpen(true)}>
                        <WifiIcon style={{ fontSize: 11 }} />
                        {selectedWhatsappName || "WhatsApp"}
                        {" · "}
                        {selectedPhone.replace(/\D/g, "").slice(-8) || "—"}
                    </Box>
                </Tooltip>

                {/* Lista de mensagens */}
                <Box className={classes.messagesList} ref={scrollRef}>
                    {loading ? (
                        <Box display="flex" justifyContent="center" pt={3}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : messages.length === 0 ? (
                        <Box display="flex" justifyContent="center" mt={4}>
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                style={{
                                    backgroundColor: "#fff",
                                    padding: "4px 12px",
                                    borderRadius: 12,
                                    boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                                }}
                            >
                                Nenhuma mensagem ainda. Inicie a conversa!
                            </Typography>
                        </Box>
                    ) : (
                        messages.map((msg) => {
                            const isAgent = msg.senderType === "agent";
                            return (
                                <div
                                    key={msg.id}
                                    className={`${classes.messageRow} ${
                                        isAgent ? classes.messageRowAgent : classes.messageRowLead
                                    }`}
                                >
                                    <div
                                        className={`${classes.messageBubble} ${
                                            isAgent ? classes.bubbleAgent : classes.bubbleLead
                                        }`}
                                    >
                                        <Typography className={classes.messageText}>
                                            {msg.message}
                                        </Typography>
                                        <Typography className={classes.timestamp}>
                                            {msg.createdAt
                                                ? format(new Date(msg.createdAt), "HH:mm")
                                                : ""}
                                        </Typography>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </Box>

                {/* Anexos selecionados */}
                {medias.length > 0 && (
                    <Box className={classes.attachmentChips}>
                        {medias.map((f, idx) => (
                            <Chip
                                key={idx}
                                size="small"
                                label={f.name}
                                onDelete={() => handleRemoveMedia(idx)}
                                deleteIcon={<HighlightOffIcon />}
                                style={{ maxWidth: 180 }}
                                title={`${(f.size / 1024 / 1024).toFixed(2)} MB`}
                            />
                        ))}
                    </Box>
                )}

                {/* Área de entrada */}
                <Box className={classes.inputArea}>
                    {/* Emoji picker — posicionado acima da barra */}
                    {showEmojiPicker && emojiData && (
                        <Box className={classes.emojiPickerWrapper}>
                            <Picker
                                data={emojiData}
                                onEmojiSelect={handleEmojiSelect}
                                locale="pt"
                                theme="light"
                                previewPosition="none"
                                set="native"
                            />
                        </Box>
                    )}

                    {/* Barra de ferramentas: emoji, anexo, agendamento */}
                    <Box className={classes.toolbarRow}>
                        <Tooltip title="Emoji">
                            <IconButton
                                className={classes.toolbarBtn}
                                size="small"
                                onClick={() => setShowEmojiPicker((v) => !v)}
                            >
                                <InsertEmoticonIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>

                        <input
                            type="file"
                            multiple
                            style={{ display: "none" }}
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <Tooltip title="Anexar arquivo ou mídia">
                            <IconButton
                                className={classes.toolbarBtn}
                                size="small"
                                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            >
                                <AttachFileIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Agendar mensagem">
                            <IconButton
                                className={classes.toolbarBtn}
                                size="small"
                                onClick={() => setScheduleModalOpen(true)}
                            >
                                <ScheduleIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Input de texto + botão enviar */}
                    <Box className={classes.inputRow}>
                        <TextField
                            className={classes.textField}
                            variant="outlined"
                            size="small"
                            placeholder="Digite uma mensagem... (Enter para enviar)"
                            multiline
                            maxRows={4}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={sending}
                            onClick={() => showEmojiPicker && setShowEmojiPicker(false)}
                        />
                        <IconButton
                            className={classes.sendButton}
                            size="small"
                            onClick={handleSend}
                            disabled={sending || (!newMessage.trim() && medias.length === 0)}
                        >
                            {sending ? (
                                <CircularProgress size={18} color="inherit" />
                            ) : (
                                <SendIcon fontSize="small" />
                            )}
                        </IconButton>
                    </Box>
                </Box>
            </Paper>

            {/* ─── Modal de agendamento ─────────────────────────────────────────── */}
            <ScheduleModal
                open={scheduleModalOpen}
                onClose={() => setScheduleModalOpen(false)}
                contactId={op?.contact?.id || null}
                reload={() => {}}
            />
        </>
    );
};

export default LeadWhatsAppChat;
