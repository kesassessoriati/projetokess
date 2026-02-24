import React, { useState, useEffect, useContext, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
    Box,
    Typography,
    TextField,
    IconButton,
    InputAdornment,
    MenuItem,
    FormControl,
    Select,
    InputLabel,
    Tooltip,
    Modal,
    Paper,
    Button,
    Chip,
    CircularProgress
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import VisibilityIcon from "@material-ui/icons/Visibility";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import FilterListIcon from "@material-ui/icons/FilterList";
import StorageIcon from "@material-ui/icons/Storage";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import useSafeApi from "../../hooks/useSafeApi";
import SafeComponent from "../../components/SafeComponent";
import moment from "moment";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#f5f5f5",
        ...theme.scrollbarStyles
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 24px",
        borderBottom: "1px solid #e0e0e0",
        backgroundColor: "#fff",
        flexWrap: "wrap",
        gap: 12
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: 16
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: "50%",
        backgroundColor: "#e3f2fd",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "& svg": {
            fontSize: 28,
            color: "#1976d2"
        }
    },
    headerTitle: {
        fontSize: "1.5rem",
        fontWeight: 600,
        color: "#1a1a1a"
    },
    headerSubtitle: {
        fontSize: "0.85rem",
        color: "#666",
        marginTop: 4
    },
    content: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "20px 24px",
        gap: 16,
        minHeight: 0
    },
    filtersRow: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        backgroundColor: "#fff",
        padding: "12px 16px",
        borderRadius: 12,
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
    },
    filterField: {
        minWidth: 150,
    },
    listWrapper: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: 20
    },
    card: {
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: "16px 20px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        gap: 12,
        borderLeft: props => `4px solid ${props.severityColor}`,
        transition: "transform 0.2s ease",
        "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 8px 12px rgba(0,0,0,0.1)"
        }
    },
    cardHeader: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between"
    },
    cardFooter: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "0.8rem",
        color: "#777",
        borderTop: "1px solid #eee",
        paddingTop: 8
    },
    badge: {
        fontSize: "0.7rem",
        height: 24
    },
    modal: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing(2)
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 24,
        width: "100%",
        maxWidth: 1000,
        maxHeight: "90vh",
        overflowY: "auto",
        outline: "none"
    },
    stackContainer: {
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
        padding: 16,
        borderRadius: 8,
        fontFamily: "Consolas, Monaco, 'Courier New', monospace",
        fontSize: "0.85rem",
        whiteSpace: "pre-wrap",
        marginTop: 16,
        overflowX: "auto"
    },
    severityCritical: { backgroundColor: "#b71c1c", color: "#fff" },
    severityHigh: { backgroundColor: "#ffebee", color: "#c62828" },
    severityMedium: { backgroundColor: "#fff3e0", color: "#ef6c00" },
    severityLow: { backgroundColor: "#e8f5e9", color: "#2e7d32" }
}));

const BackendErrors = () => {
    const classes = useStyles({});
    const { user: loggedInUser } = useContext(AuthContext);
    const isMounted = useRef(true);

    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [errorsList, setErrorsList] = useState([]);
    const [selectedError, setSelectedError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Filters
    const [severityFilter, setSeverityFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [routeFilter, setRouteFilter] = useState("");
    const [dateFrom, setDateFrom] = useState(moment().subtract(7, "days").format("YYYY-MM-DD"));
    const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));

    const {
        loading: loadingErrors,
        error: apiError,
        request: fetchErrorsApi
    } = useSafeApi("/backend-errors", { manual: true });

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const loadData = async (reset = false) => {
        if (!isMounted.current) return;

        const currentPage = reset ? 1 : pageNumber;

        const data = await fetchErrorsApi({
            params: {
                severity: severityFilter,
                status: statusFilter,
                route: routeFilter,
                dateFrom,
                dateTo,
                pageNumber: currentPage
            }
        });

        if (data && isMounted.current) {
            if (reset) {
                setErrorsList(data.backendErrors || []);
            } else {
                setErrorsList(prev => [...prev, ...(data.backendErrors || [])]);
            }
            setHasMore(data.hasMore);
        }
    };

    useEffect(() => {
        setPageNumber(1);
        loadData(true);
    }, [severityFilter, statusFilter, routeFilter, dateFrom, dateTo]);

    useEffect(() => {
        if (pageNumber > 1) {
            loadData(false);
        }
    }, [pageNumber]);

    const handleScroll = (e) => {
        if (!hasMore || loadingErrors) return;
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - (scrollTop + 100) < clientHeight) {
            setPageNumber(prev => prev + 1);
        }
    };

    const handleResolveError = async (errorId) => {
        try {
            await api.put(`/backend-errors/${errorId}`, { status: "RESOLVED" });
            toast.success("Erro marcado como resolvido!");
            setErrorsList(prev => prev.map(err => err.id === errorId ? { ...err, status: "RESOLVED" } : err));
        } catch (err) {
            toastError(err);
        }
    };

    const getColorBySeverity = (severity) => {
        switch (severity) {
            case "CRITICAL": return "#b71c1c";
            case "HIGH": return "#f44336";
            case "MEDIUM": return "#ff9800";
            case "LOW": return "#4caf50";
            default: return "#9e9e9e";
        }
    };

    const ErrorCard = ({ error }) => {
        const severityColor = getColorBySeverity(error.severity);
        const cardClasses = useStyles({ severityColor });

        return (
            <Box className={cardClasses.card}>
                <Box className={cardClasses.cardHeader}>
                    <Box style={{ flex: 1 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                                label={error.severity}
                                className={`${cardClasses.badge} ${error.severity === 'CRITICAL' ? cardClasses.severityCritical :
                                        error.severity === 'HIGH' ? cardClasses.severityHigh :
                                            error.severity === 'MEDIUM' ? cardClasses.severityMedium : cardClasses.severityLow
                                    }`}
                            />
                            <Chip
                                label={error.status}
                                variant="outlined"
                                size="small"
                                color={error.status === 'RESOLVED' ? "primary" : "secondary"}
                                className={cardClasses.badge}
                            />
                            <Typography variant="body2" color="textSecondary">
                                {moment(error.createdAt).format("DD/MM/YYYY HH:mm")}
                            </Typography>
                        </Box>
                        <Typography variant="subtitle1" style={{ fontWeight: 600, marginTop: 8 }}>
                            {error.method} {error.route} - <span style={{ color: severityColor }}>{error.statusCode}</span>
                        </Typography>
                        <Typography variant="body2" color="textPrimary" style={{ marginTop: 4 }}>
                            {error.message}
                        </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                        <Tooltip title="Ver Detalhes">
                            <IconButton size="small" onClick={() => { setSelectedError(error); setModalOpen(true); }}>
                                <VisibilityIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        {error.status !== 'RESOLVED' && (
                            <Tooltip title="Resolver">
                                <IconButton size="small" onClick={() => handleResolveError(error.id)} color="primary">
                                    <CheckCircleOutlineIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>

                <Box className={cardClasses.cardFooter}>
                    <Box display="flex" gap={2}>
                        <span>Ocorrências: <strong>{error.occurrences}</strong></span>
                        <span>Empresa: {error.company?.name || "Global"}</span>
                    </Box>
                    <span>Usuário: {error.user?.name || "N/A"}</span>
                </Box>
            </Box>
        );
    };

    return (
        <Box className={classes.root}>
            <Box className={classes.header}>
                <Box className={classes.headerLeft}>
                    <Box className={classes.headerIcon}>
                        <StorageIcon />
                    </Box>
                    <Box>
                        <Typography className={classes.headerTitle}>
                            Monitoramento Backend
                        </Typography>
                        <Typography className={classes.headerSubtitle}>
                            Logs detalhados de falhas do servidor
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Box className={classes.content}>
                <Box className={classes.filtersRow}>
                    <FilterListIcon color="action" />
                    <FormControl variant="outlined" size="small" className={classes.filterField}>
                        <InputLabel>Severidade</InputLabel>
                        <Select
                            value={severityFilter}
                            onChange={(e) => setSeverityFilter(e.target.value)}
                            label="Severidade"
                        >
                            <MenuItem value="">Todas</MenuItem>
                            <MenuItem value="CRITICAL">Crítica</MenuItem>
                            <MenuItem value="HIGH">Alta</MenuItem>
                            <MenuItem value="MEDIUM">Média</MenuItem>
                            <MenuItem value="LOW">Baixa</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl variant="outlined" size="small" className={classes.filterField}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            label="Status"
                        >
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="NEW">Novo</MenuItem>
                            <MenuItem value="INVESTIGATING">Em Analise</MenuItem>
                            <MenuItem value="RESOLVED">Resolvido</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        label="Rota"
                        variant="outlined"
                        size="small"
                        className={classes.filterField}
                        value={routeFilter}
                        onChange={(e) => setRouteFilter(e.target.value)}
                    />

                    <TextField
                        label="De"
                        type="date"
                        variant="outlined"
                        size="small"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />

                    <TextField
                        label="Até"
                        type="date"
                        variant="outlined"
                        size="small"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                </Box>

                <Box className={classes.listWrapper} onScroll={handleScroll}>
                    <SafeComponent
                        loading={loadingErrors && errorsList.length === 0}
                        error={apiError}
                        data={errorsList}
                        renderData={() => (
                            <>
                                {errorsList.map((error) => (
                                    <ErrorCard key={error.id} error={error} />
                                ))}
                                {loadingErrors && (
                                    <Box display="flex" justifyContent="center" py={4}>
                                        <CircularProgress size={24} />
                                    </Box>
                                )}
                            </>
                        )}
                    />
                </Box>
            </Box>

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} className={classes.modal}>
                <Paper className={classes.modalContent}>
                    <Typography variant="h6" gutterBottom>Detalhes do Erro Backend</Typography>
                    {selectedError && (
                        <>
                            <Box display="flex" gap={2} mb={2} flexWrap="wrap">
                                <Chip label={`Recorrência: ${selectedError.occurrences}`} variant="outlined" />
                                <Chip label={`Usuário: ${selectedError.user?.name || "Desconhecido"}`} variant="outlined" />
                                <Chip label={`Status Code: ${selectedError.statusCode}`} variant="outlined" color="secondary" />
                                <Chip label={`Método: ${selectedError.method}`} variant="outlined" />
                            </Box>

                            <Typography variant="subtitle2">Mensagem:</Typography>
                            <Box p={2} bgcolor="#f5f5f5" borderRadius={4} mb={2}>
                                <Typography variant="body2" style={{ fontWeight: 600 }}>{selectedError.message}</Typography>
                            </Box>

                            <Typography variant="subtitle2">Rota:</Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>{selectedError.route}</Typography>

                            <Typography variant="subtitle2" style={{ marginTop: 16 }}>Stack Trace:</Typography>
                            <Box className={classes.stackContainer}>
                                {selectedError.stack || "Nenhum stack disponível"}
                            </Box>

                            <Box mt={4} display="flex" justifyContent="flex-end">
                                <Button onClick={() => setModalOpen(false)} variant="contained" color="primary">
                                    Fechar
                                </Button>
                            </Box>
                        </>
                    )}
                </Paper>
            </Modal>
        </Box>
    );
};

export default BackendErrors;
