import React, { useState, useEffect, useRef } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    CircularProgress,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Divider,
    Paper,
    Tooltip
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";
import InfoIcon from "@mui/icons-material/Info";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(2),
    },
    editorContainer: {
        "& .ql-container": {
            minHeight: "200px",
            fontSize: "14px",
        },
    },
    attachmentBox: {
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: theme.spacing(1),
        marginTop: theme.spacing(1),
    },
    attachmentItem: {
        display: "flex",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        padding: "4px 12px",
        borderRadius: "16px",
        fontSize: "12px",
    },
    historyTitle: {
        marginTop: theme.spacing(4),
        marginBottom: theme.spacing(1),
        fontWeight: 600,
        color: theme.palette.text.secondary,
        textTransform: "uppercase",
        fontSize: "0.75rem",
    },
    historyItem: {
        padding: theme.spacing(1.5),
        borderBottom: "1px solid #f0f0f0",
        "&:last-child": {
            borderBottom: "none",
        },
    },
    noConfig: {
        padding: theme.spacing(4),
        textAlign: "center",
        backgroundColor: "#fff9eb",
        border: "1px solid #ffe58f",
        borderRadius: theme.spacing(1),
    }
}));

const LeadEmailComponent = ({ op, lead, onEmailSent }) => {
    const classes = useStyles();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [hasSmtp, setHasSmtp] = useState(false);

    const [emailData, setEmailData] = useState({
        to: "",
        subject: "",
        body: ""
    });
    const [attachments, setAttachments] = useState([]);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        checkSmtpAndFetchHistory();
    }, [op, lead]);

    const checkSmtpAndFetchHistory = async () => {
        setLoading(true);
        try {
            const { data: smtp } = await api.get("/smtp");
            setHasSmtp(!!(smtp && smtp.host && smtp.user));

            if (lead && lead.email) {
                setEmailData(prev => ({ ...prev, to: lead.email }));
            }

            // Fetch history from events
            const leadId = (lead && lead.id) || (op && op.leadId);
            if (leadId) {
                const { data: events } = await api.get(`/opportunity-events/${leadId}`);
                const emailHistory = events.filter(e => e.type === "EMAIL");
                setHistory(emailHistory);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendEmail = async () => {
        if (!emailData.to || !emailData.subject || !emailData.body) {
            toast.warning("Preencha destinatário, assunto e mensagem.");
            return;
        }

        setSending(true);
        try {
            const formData = new FormData();
            formData.append("to", emailData.to);
            formData.append("subject", emailData.subject);
            formData.append("body", emailData.body);
            formData.append("leadId", (lead && lead.id) || (op && op.leadId));
            if (op && op.id) formData.append("opportunityId", op.id);

            attachments.forEach(file => {
                formData.append("attachments", file);
            });

            await api.post("/send-lead-email", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            toast.success("E-mail enviado com sucesso!");
            setEmailData(prev => ({ ...prev, subject: "", body: "" }));
            setAttachments([]);

            if (onEmailSent) onEmailSent();
            checkSmtpAndFetchHistory(); // Refresh history
        } catch (err) {
            toastError(err);
        } finally {
            setSending(false);
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setAttachments(prev => [...prev, ...files]);
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (!hasSmtp) {
        return (
            <Box className={classes.noConfig}>
                <InfoIcon style={{ color: "#faad14", fontSize: 40, marginBottom: 16 }} />
                <Typography variant="h6" gutterBottom>SMTP não configurado</Typography>
                <Typography variant="body2" color="textSecondary">
                    Você precisa configurar o servidor de e-mail (SMTP) antes de enviar e-mails para este Lead.
                    Vá em <b>Sistema {"->"} SMTP (E-mail)</b> para configurar.
                </Typography>
            </Box>
        );
    }

    return (
        <Box className={classes.root}>
            <TextField
                fullWidth
                label="Para"
                variant="outlined"
                size="small"
                value={emailData.to}
                onChange={e => setEmailData({ ...emailData, to: e.target.value })}
            />
            <TextField
                fullWidth
                label="Assunto"
                variant="outlined"
                size="small"
                value={emailData.subject}
                onChange={e => setEmailData({ ...emailData, subject: e.target.value })}
            />

            <Box className={classes.editorContainer}>
                <ReactQuill
                    theme="snow"
                    value={emailData.body}
                    onChange={val => setEmailData({ ...emailData, body: val })}
                    placeholder="Escreva sua mensagem aqui..."
                />
            </Box>

            <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                <Box className={classes.attachmentBox}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AttachFileIcon />}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Anexar
                    </Button>
                    <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />
                    {attachments.map((file, index) => (
                        <div key={index} className={classes.attachmentItem}>
                            {file.name}
                            <IconButton size="small" onClick={() => removeAttachment(index)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </div>
                    ))}
                </Box>

                <Button
                    variant="contained"
                    color="primary"
                    startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    disabled={sending}
                    onClick={handleSendEmail}
                >
                    {sending ? "Enviando..." : "Enviar E-mail"}
                </Button>
            </Box>

            {history.length > 0 && (
                <Box>
                    <Typography className={classes.historyTitle}>Histórico de E-mails Enviados</Typography>
                    <List disablePadding>
                        {history.map(item => (
                            <ListItem key={item.id} className={classes.historyItem}>
                                <ListItemText
                                    primary={
                                        <Typography variant="body2" style={{ fontWeight: 600 }}>
                                            {(item.metadata && item.metadata.subject) || "(Sem assunto)"}
                                        </Typography>
                                    }
                                    secondary={
                                        <>
                                            <Typography variant="caption" color="textSecondary">
                                                Enviado para: {item.metadata && item.metadata.to} • {new Date(item.createdAt).toLocaleString()}
                                            </Typography>
                                            {item.metadata && item.metadata.attachments && item.metadata.attachments.length > 0 && (
                                                <Box display="flex" mt={0.5} gap={1}>
                                                    <Typography variant="caption" color="primary">
                                                        📎 {item.metadata.attachments.length} anexo(s)
                                                    </Typography>
                                                </Box>
                                            )}
                                        </>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}
        </Box>
    );
};

export default LeadEmailComponent;
