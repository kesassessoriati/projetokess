import React, { useState, useEffect, useRef } from "react";
import {
    makeStyles,
    Paper,
    Box,
    Typography,
    TextField,
    IconButton,
    CircularProgress
} from "@material-ui/core";
import { Send as SendIcon } from "@material-ui/icons";
import api from "../../services/api";
import { format } from "date-fns";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "#e5ddd5",
        borderRadius: 8,
        overflow: "hidden"
    },
    messagesList: {
        flex: 1,
        padding: theme.spacing(2),
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(1)
    },
    messageRow: {
        display: "flex",
        width: "100%",
    },
    messageRowAgent: {
        justifyContent: "flex-end"
    },
    messageRowLead: {
        justifyContent: "flex-start"
    },
    messageBubble: {
        maxWidth: "75%",
        padding: theme.spacing(1, 1.5),
        borderRadius: 8,
        position: "relative",
        boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
        display: "flex",
        flexDirection: "column"
    },
    bubbleAgent: {
        backgroundColor: "#dcf8c6",
        borderTopRightRadius: 0
    },
    bubbleLead: {
        backgroundColor: "#ffffff",
        borderTopLeftRadius: 0
    },
    messageText: {
        fontSize: "0.9rem",
        wordWrap: "break-word"
    },
    timestamp: {
        fontSize: "0.65rem",
        color: "rgba(0,0,0,0.45)",
        alignSelf: "flex-end",
        marginTop: 4
    },
    inputArea: {
        display: "flex",
        alignItems: "center",
        padding: theme.spacing(1, 2),
        backgroundColor: "#f0f0f0",
        borderTop: "1px solid #d3d3d3",
        gap: theme.spacing(1)
    },
    input: {
        flex: 1,
        backgroundColor: "#ffffff",
        borderRadius: 20,
        padding: theme.spacing(0, 2),
        "& .MuiInput-underline:before": {
            display: "none"
        },
        "& .MuiInput-underline:after": {
            display: "none"
        }
    },
    sendButton: {
        backgroundColor: "#128c7e",
        color: "#ffffff",
        "&:hover": {
            backgroundColor: "#075e54"
        }
    }
}));

const LeadChat = ({ leadId }) => {
    const classes = useStyles();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (!leadId) {
            setLoading(false);
            return;
        }

        const fetchMessages = async () => {
            try {
                const { data } = await api.get(`/crm/leads/${leadId}/messages`);
                setMessages(data);
            } catch (err) {
                toast.error("Erro ao carregar mensagens do lead.");
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [leadId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !leadId) return;

        setSending(true);
        try {
            const { data } = await api.post(`/crm/leads/${leadId}/messages`, {
                message: newMessage.trim(),
                senderType: "agent"
            });
            setMessages((prev) => [...prev, data]);
            setNewMessage("");
        } catch (err) {
            toast.error("Erro ao enviar mensagem.");
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
            </Box>
        );
    }

    if (!leadId) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography color="textSecondary">Salve o lead primeiro para habilitar o chat.</Typography>
            </Box>
        );
    }

    return (
        <Paper className={classes.container} elevation={0}>
            {/* Messages List */}
            <Box className={classes.messagesList} ref={scrollRef}>
                {messages.length === 0 && (
                    <Box display="flex" justifyContent="center" mt={4}>
                        <Typography variant="body2" color="textSecondary" style={{ backgroundColor: "#fff", padding: "4px 12px", borderRadius: 12, boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)" }}>
                            Nenhuma mensagem ainda. Inicie a conversa!
                        </Typography>
                    </Box>
                )}

                {messages.map((msg) => {
                    const isAgent = msg.senderType === "agent";
                    return (
                        <div key={msg.id} className={`${classes.messageRow} ${isAgent ? classes.messageRowAgent : classes.messageRowLead}`}>
                            <div className={`${classes.messageBubble} ${isAgent ? classes.bubbleAgent : classes.bubbleLead}`}>
                                <Typography className={classes.messageText}>
                                    {msg.message.split("\n").map((line, i) => (
                                        <React.Fragment key={i}>
                                            {line}
                                            <br />
                                        </React.Fragment>
                                    ))}
                                </Typography>
                                <Typography className={classes.timestamp}>
                                    {format(new Date(msg.createdAt), "HH:mm")}
                                </Typography>
                            </div>
                        </div>
                    );
                })}
            </Box>

            {/* Input Area */}
            <Box className={classes.inputArea}>
                <TextField
                    className={classes.input}
                    placeholder="Digite uma mensagem..."
                    multiline
                    maxRows={4}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={sending}
                />
                <IconButton
                    className={classes.sendButton}
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    size="small"
                >
                    {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
                </IconButton>
            </Box>
        </Paper>
    );
};

export default LeadChat;
