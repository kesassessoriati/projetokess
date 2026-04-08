import React, { useState, useEffect, useRef, useContext } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    FormControl,
    MenuItem,
    Paper,
    Select,
    TextField,
    Tooltip,
    Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import PhoneIcon from "@material-ui/icons/Phone";
import WifiIcon from "@material-ui/icons/Wifi";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";
import { toast } from "react-toastify";
import api from "../../services/api";

import MessagesList from "../MessagesList";
import MessageInput from "../MessageInput";
import { ReplyMessageProvider } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { ForwardMessageProvider } from "../../context/ForwarMessage/ForwardMessageContext";
import { EditMessageProvider } from "../../context/EditingMessage/EditingMessageContext";
import { QueueSelectedProvider } from "../../context/QueuesSelected/QueuesSelectedContext";

import { AuthContext } from "../../context/Auth/AuthContext";

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

const LeadWhatsAppChat = ({ leadId, op, onBackToInfo }) => {
    const classes = useStyles();
    const { user } = useContext(AuthContext);

    const normalizeDestinationNumber = (value = "") => {
        let digits = String(value || "").replace(/\D/g, "").replace(/^0+/, "");
        const referenceDigits = String(op?.contact?.number || op?.lead?.phone || "")
            .replace(/\D/g, "")
            .replace(/^0+/, "");
        const referenceNational = referenceDigits.startsWith("55")
            ? referenceDigits.slice(2)
            : referenceDigits;
        const referenceDdd = referenceNational.length >= 10 ? referenceNational.slice(0, 2) : "";

        if ((digits.length === 8 || digits.length === 9) && referenceDdd) {
            digits = `${referenceDdd}${digits}`;
        }

        if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
            digits = `55${digits}`;
        }

        return digits;
    };

    // ── Pre-modal state ───────────────────────────────────────────────────────
    const [preModalOpen, setPreModalOpen] = useState(true);
    const [connections, setConnections] = useState([]);
    const [selectedPhone, setSelectedPhone] = useState("");
    const [selectedWhatsappId, setSelectedWhatsappId] = useState("");
    const [selectedWhatsappName, setSelectedWhatsappName] = useState("");
    const [loadingConnections, setLoadingConnections] = useState(false);

    // ── Validação de número ───────────────────────────────────────────────────
    const [numberValidation, setNumberValidation] = useState({ status: "idle", normalizedNumber: "", error: "" });
    const validationTimerRef = useRef(null);

    // ── Chat state ────────────────────────────────────────────────────────────
    const [activeTicket, setActiveTicket] = useState(null);
    const [loadingTicket, setLoadingTicket] = useState(false);
    const [dragDropFiles, setDragDropFiles] = useState([]);

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

        const preferredPhone =
            op?.lead?.phone ||
            op?.contact?.number ||
            "";
        if (preferredPhone) {
            setSelectedPhone(preferredPhone);
        }
    }, [op]);

    // ── Validação de número com debounce de 800ms ─────────────────────────────
    useEffect(() => {
        if (validationTimerRef.current) clearTimeout(validationTimerRef.current);

        const digits = selectedPhone.replace(/\D/g, "");

        if (digits.length < 10 || !selectedWhatsappId) {
            setNumberValidation({ status: "idle", normalizedNumber: "", error: "" });
            return;
        }

        setNumberValidation((prev) => ({ ...prev, status: "loading" }));

        validationTimerRef.current = setTimeout(async () => {
            try {
                const { data } = await api.get("/quick-send/validate", {
                    params: { number: digits, whatsappId: selectedWhatsappId },
                });
                setNumberValidation({
                    status: data.valid ? "valid" : "invalid",
                    normalizedNumber: data.normalizedNumber || "",
                    error: data.error || "",
                });
            } catch {
                setNumberValidation({ status: "invalid", normalizedNumber: "", error: "Erro ao validar número" });
            }
        }, 800);

        return () => clearTimeout(validationTimerRef.current);
    }, [selectedPhone, selectedWhatsappId]);

    // ── Confirm pre-modal ─────────────────────────────────────────────────────
    const handleConfirm = async () => {
        if (!selectedWhatsappId) {
            toast.warning("Selecione uma conexão WhatsApp.");
            return;
        }
        if (numberValidation.status !== "valid") {
            toast.warning("Aguarde a validação do número no WhatsApp antes de acessar o chat.");
            return;
        }

        const conn = connections.find((c) => c.id === selectedWhatsappId);
        if (conn) setSelectedWhatsappName(conn.name);

        setLoadingTicket(true);
        try {
            const formData = new FormData();
            // Usa número validado e normalizado pelo backend
            const normalized = numberValidation.normalizedNumber || normalizeDestinationNumber(selectedPhone);
            formData.append("number", normalized);
            formData.append("whatsappId", Number(selectedWhatsappId));
            formData.append("leadId", Number(leadId));
            formData.append("createIfNotExists", "true");
            if (op?.contact?.name) formData.append("name", op.contact.name);

            // Chamada para inicializar ou resgatar o ticket ativo (sem enviar mensagem obrigatoriamente)
            const { data } = await api.post("/quick-send", formData, {
                timeout: 30000,
                headers: { "Content-Type": "multipart/form-data" },
            });
            
            if (data.ticket) {
                setActiveTicket(data.ticket);
                setPreModalOpen(false);
            } else {
                toast.error("Erro ao carregar o chat.");
            }
        } catch (err) {
            const errMsg = err?.response?.data?.error || "Erro ao iniciar o chat.";
            toast.error(errMsg);
        } finally {
            setLoadingTicket(false);
        }
    };

    const handleBackToInfo = () => {
        setPreModalOpen(false);
        if (typeof onBackToInfo === "function") {
            onBackToInfo();
        }
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
            <Dialog open={preModalOpen} maxWidth="xs" fullWidth>
                <Box className={classes.preModalHeader}>
                    <WifiIcon />
                    <Box>
                        <Typography style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
                            Conversa do WhatsApp
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
                            error={numberValidation.status === "invalid"}
                            helperText={
                                numberValidation.status === "loading"
                                    ? "Validando no WhatsApp..."
                                    : selectedPhone.replace(/\D/g, "").length > 0
                                        ? `${selectedPhone.replace(/\D/g, "").length} dígitos`
                                        : ""
                            }
                            InputProps={{ style: { borderRadius: 8, fontSize: 14 } }}
                        />
                        {numberValidation.status === "valid" && (
                            <Box display="flex" alignItems="center" style={{ gap: 4, marginTop: 4 }}>
                                <CheckCircleIcon style={{ color: "#16a34a", fontSize: 14 }} />
                                <Typography style={{ fontSize: 11, color: "#15803d", fontWeight: 600 }}>
                                    Número válido no WhatsApp ✓
                                </Typography>
                            </Box>
                        )}
                        {numberValidation.status === "invalid" && (
                            <Box display="flex" alignItems="center" style={{ gap: 4, marginTop: 4 }}>
                                <ErrorIcon style={{ color: "#dc2626", fontSize: 14 }} />
                                <Typography style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>
                                    Número inválido — não encontrado no WhatsApp ✗
                                </Typography>
                            </Box>
                        )}
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
                    <Button
                        onClick={handleBackToInfo}
                        style={{ textTransform: "none", color: "#54656f" }}
                        size="small"
                    >
                        Voltar
                    </Button>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleConfirm}
                        disabled={loadingTicket || numberValidation.status !== "valid" || !selectedWhatsappId}
                        style={{
                            background: "linear-gradient(135deg, #075E54, #25D366)",
                            color: "#fff",
                            borderRadius: 8,
                            textTransform: "none",
                            fontWeight: 600,
                        }}
                    >
                        {loadingTicket ? <CircularProgress size={22} color="inherit" /> : "Acessar Chat"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ─── Chat Completo Reutilizando Main Chat ───────────────────────────────────────────── */}
            <Paper elevation={0} className={classes.root}>
                {selectedWhatsappName && activeTicket && (
                    <Tooltip title="Clique para alterar número/conexão">
                        <Box className={classes.connectionBadge} onClick={() => setPreModalOpen(true)}>
                            <WifiIcon style={{ fontSize: 11 }} />
                            {selectedWhatsappName || "WhatsApp"}
                            {" · "}
                            {selectedPhone.replace(/\D/g, "").slice(-8) || "—"}
                        </Box>
                    </Tooltip>
                )}

                {activeTicket ? (
                    <QueueSelectedProvider>
                        <ReplyMessageProvider>
                            <ForwardMessageProvider>
                                <EditMessageProvider>
                                    <MessagesList
                                        ticketId={activeTicket.uuid}
                                        isGroup={activeTicket.isGroup}
                                        onDrop={setDragDropFiles}
                                        whatsappId={activeTicket.whatsappId}
                                        queueId={activeTicket.queueId}
                                        channel={activeTicket.channel}
                                    />
                                    <MessageInput
                                        ticketId={activeTicket.id}
                                        ticketStatus={activeTicket.status}
                                        ticketChannel={activeTicket.channel}
                                        notificameHub={false}
                                        droppedFiles={dragDropFiles}
                                        contactId={activeTicket.contactId}
                                    />
                                </EditMessageProvider>
                            </ForwardMessageProvider>
                        </ReplyMessageProvider>
                    </QueueSelectedProvider>
                ) : (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%" style={{ gap: 16 }}>
                        <Typography color="textSecondary">
                            Para iniciar a conversa, confirme o número e a conexão.
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setPreModalOpen(true)}
                            style={{ textTransform: "none" }}
                        >
                            Iniciar Chat
                        </Button>
                    </Box>
                )}
            </Paper>
        </>
    );
};

export default LeadWhatsAppChat;
