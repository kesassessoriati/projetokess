import React, { useState, useEffect } from "react";
import {
    Popover,
    Typography,
    Box,
    Button,
    CircularProgress,
    Avatar,
    makeStyles,
    IconButton,
    Chip
} from "@material-ui/core";
import { TrendingUp, OpenInNew } from "@material-ui/icons";
import { useHistory } from "react-router-dom";
import api from "../../services/api";
import { format, parseISO } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";

const useStyles = makeStyles((theme) => ({
    popoverPaper: {
        padding: theme.spacing(2),
        borderRadius: 12,
        minWidth: 280,
        boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
        border: "1px solid #e2e8f0"
    },
    header: {
        display: "flex",
        alignItems: "center",
        marginBottom: theme.spacing(2),
        gap: theme.spacing(1.5)
    },
    avatar: {
        backgroundColor: theme.palette.primary.main,
        color: "#fff",
        width: 40,
        height: 40
    },
    infoRow: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: theme.spacing(1),
        alignItems: "center"
    },
    label: {
        fontSize: "0.75rem",
        color: theme.palette.text.secondary,
        fontWeight: 600,
        textTransform: "uppercase"
    },
    value: {
        fontSize: "0.85rem",
        fontWeight: 500,
        color: theme.palette.text.primary
    },
    kanbanButton: {
        marginTop: theme.spacing(2),
        width: "100%",
        borderRadius: 8,
        textTransform: "none",
        fontWeight: "bold",
        backgroundColor: "#eff6ff",
        color: "#1d4ed8",
        "&:hover": {
            backgroundColor: "#dbeafe"
        }
    }
}));

const fCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const QuickLeadPreview = ({ leadId, anchorEl, onClose }) => {
    const classes = useStyles();
    const history = useHistory();
    const [loading, setLoading] = useState(true);
    const [leadInfo, setLeadInfo] = useState(null);
    const [oppInfo, setOppInfo] = useState(null);

    useEffect(() => {
        if (!anchorEl) return;

        let isMounted = true;

        const fetchData = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/crm/leads/${leadId}`);
                if (isMounted) {
                    setLeadInfo(data);
                    // O backend do lead.ts não retorna a Opportunity em /crm/leads/:id atualmente,
                    // Então precisamos buscar a opportunity se não vier, 
                    // ou modificar /crm/leads/${leadId} para incluir a opportunity? 
                    // Outra alternativa: Listar as Opportunities do Lead
                    try {
                        const oppResp = await api.get(`/opportunities`, { params: { leadId } });
                        if (isMounted && oppResp.data && oppResp.data.opportunities && oppResp.data.opportunities.length > 0) {
                            setOppInfo(oppResp.data.opportunities[0]);
                        }
                    } catch (e) { /* ignore */ }
                }
            } catch (err) {
                console.error("Erro ao carregar preview do lead", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [leadId, anchorEl]);

    const open = Boolean(anchorEl);

    const handleOpenKanban = () => {
        history.push("/kanban"); // Redireciona para o Kanban
        onClose();
    };

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
            classes={{ paper: classes.popoverPaper }}
            onClick={(e) => e.stopPropagation()}
        >
            {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress size={24} />
                </Box>
            ) : leadInfo ? (
                <Box>
                    <Box className={classes.header}>
                        <Avatar className={classes.avatar}>
                            {leadInfo.name ? leadInfo.name.charAt(0).toUpperCase() : "L"}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" style={{ fontWeight: 700, lineHeight: 1.2 }}>
                                {leadInfo.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                Lead / Oportunidade
                            </Typography>
                        </Box>
                    </Box>

                    <Box className={classes.infoRow}>
                        <Typography className={classes.label}>Status</Typography>
                        <Chip
                            label={oppInfo ? "Em Negociação" : leadInfo.status}
                            size="small"
                            style={{ height: 20, fontSize: "0.7rem", backgroundColor: "#e2e8f0", fontWeight: 'bold' }}
                        />
                    </Box>

                    <Box className={classes.infoRow}>
                        <Typography className={classes.label}>Fase Atual</Typography>
                        <Typography className={classes.value}>
                            {oppInfo ? oppInfo.stage?.name || 'Sem fase' : leadInfo.stage?.name || 'Sem fase'}
                        </Typography>
                    </Box>

                    <Box className={classes.infoRow}>
                        <Typography className={classes.label}>Responsável</Typography>
                        <Typography className={classes.value}>
                            {oppInfo ? oppInfo.assignedUser?.name || 'Nenhum' : leadInfo.owner?.name || 'Nenhum'}
                        </Typography>
                    </Box>

                    <Box className={classes.infoRow}>
                        <Typography className={classes.label}>Valor</Typography>
                        <Typography className={classes.value} style={{ color: "#10b981", fontWeight: 700 }}>
                            {fCurrency(oppInfo?.value || 0)}
                        </Typography>
                    </Box>

                    <Box className={classes.infoRow}>
                        <Typography className={classes.label}>Últ. Atividade</Typography>
                        <Typography className={classes.value} style={{ fontSize: "0.75rem" }}>
                            {leadInfo.lastActivityAt ? format(parseISO(leadInfo.lastActivityAt), "dd/MM/yyyy HH:mm") : "-"}
                        </Typography>
                    </Box>

                    <Button
                        className={classes.kanbanButton}
                        variant="contained"
                        disableElevation
                        startIcon={<TrendingUp />}
                        onClick={handleOpenKanban}
                    >
                        Abrir no Kanban
                    </Button>
                </Box>
            ) : (
                <Typography variant="body2" color="error" style={{ padding: 8 }}>
                    Erro ao carregar os dados.
                </Typography>
            )}
        </Popover>
    );
};

export default QuickLeadPreview;
