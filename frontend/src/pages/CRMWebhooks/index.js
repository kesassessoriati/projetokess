import React, { useState, useEffect } from "react";
import { makeStyles, Typography, Box, Paper, Button, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Chip } from "@material-ui/core";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, PlayArrow as PlayArrowIcon } from "@material-ui/icons";
import CRMWebhookModal from "../../components/CRMWebhookModal";
import api from "../../services/api";
import { toast } from "react-toastify";
import ContextPageHeader from "../../components/ContextPageHeader";

const useStyles = makeStyles((theme) => ({
    container: {
        padding: theme.spacing(4),
        backgroundColor: "#f8fafc",
        minHeight: "100vh"
    },
    paper: {
        padding: theme.spacing(3),
        borderRadius: 16,
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing(4)
    }
}));

const CRMWebhooks = () => {
    const classes = useStyles();
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedWebhookId, setSelectedWebhookId] = useState(null);

    useEffect(() => {
        fetchWebhooks();
    }, []);

    const fetchWebhooks = async () => {
        try {
            const { data } = await api.get("/crm/webhooks");
            setWebhooks(data);
        } catch (err) {
            toast.error("Erro ao carregar webhooks");
            setWebhooks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Deseja realmente excluir este webhook?")) return;
        try {
            await api.delete(`/crm/webhooks/${id}`);
            toast.success("Webhook excluído");
            fetchWebhooks();
        } catch (err) {
            toast.error("Erro ao excluir webhook");
        }
    };

    const handleTestWebhook = async (webhook) => {
        try {
            await api.post("/crm/webhooks/test", { eventType: webhook.eventType });
            toast.success(`Webhook de teste disparado para o evento: ${webhook.eventType}`);
        } catch (err) {
            toast.error("Erro ao disparar webhook de teste");
        }
    };

    const handleOpenModal = (id = null) => {
        setSelectedWebhookId(id);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedWebhookId(null);
    };

    return (
        <Box className={classes.container}>
            <ContextPageHeader
                title="Webhooks CRM"
                subtitle="Gerencie integrações de eventos do funil"
                fallbackTo="/kanban"
                actions={(
                    <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenModal()}>
                        Novo Webhook
                    </Button>
                )}
            />

            <Paper className={classes.paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Evento</TableCell>
                            <TableCell>URL</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {webhooks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center">Nenhum webhook configurado</TableCell>
                            </TableRow>
                        ) : (
                            webhooks.map(webhook => (
                                <TableRow key={webhook.id}>
                                    <TableCell>{webhook.eventType}</TableCell>
                                    <TableCell>{webhook.url}</TableCell>
                                    <TableCell><Chip size="small" label={webhook.isActive ? "Ativo" : "Inativo"} color={webhook.isActive ? "primary" : "secondary"} /></TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" color="primary" onClick={() => handleTestWebhook(webhook)} title="Testar Disparo Manual"><PlayArrowIcon /></IconButton>
                                        <IconButton size="small" onClick={() => handleOpenModal(webhook.id)} title="Editar"><EditIcon /></IconButton>
                                        <IconButton size="small" color="secondary" onClick={() => handleDelete(webhook.id)} title="Excluir"><DeleteIcon /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Paper>

            <CRMWebhookModal
                open={modalOpen}
                onClose={handleCloseModal}
                webhookId={selectedWebhookId}
                onSave={fetchWebhooks}
            />
        </Box>
    );
};

export default CRMWebhooks;
