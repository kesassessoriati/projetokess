import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import {
    Box,
    IconButton,
    TextField,
    InputAdornment,
    Typography,
    Chip,
    CircularProgress,
} from "@material-ui/core";

import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import AddIcon from "@material-ui/icons/Add";
import VisibilityIcon from "@material-ui/icons/Visibility";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import DeviceHubIcon from "@material-ui/icons/DeviceHub";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import KanbanAutomationModal from "../../components/KanbanAutomationModal";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#f5f5f5",
        overflowY: "auto",
        ...theme.scrollbarStyles,
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        backgroundColor: "#f5f5f5",
        borderBottom: "1px solid #e0e0e0",
        flexWrap: "wrap",
        gap: "16px",
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: "50%",
        backgroundColor: "#e3f2fd",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "& svg": {
            fontSize: 24,
            color: "#1976d2",
        },
    },
    headerTitle: {
        fontSize: "1.5rem",
        fontWeight: 600,
        color: "#1a1a1a",
    },
    headerSubtitle: {
        fontSize: "0.875rem",
        color: "#666",
    },
    headerRight: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
    },
    searchField: {
        backgroundColor: "#fff",
        borderRadius: 8,
        "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            "& fieldset": {
                borderColor: "#e0e0e0",
            },
            "&:hover fieldset": {
                borderColor: "#1976d2",
            },
        },
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: "50%",
        backgroundColor: "#1a1a1a",
        color: "#fff",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        "&:hover": {
            backgroundColor: "#333",
            transform: "scale(1.05)",
        },
    },
    content: {
        flex: 1,
        padding: "24px",
    },
    gridContainer: {
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "12px",
        padding: "8px",
    },
    listItem: {
        display: "flex",
        flexDirection: "column",
        padding: "16px 12px",
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        boxShadow: "none",
        transition: "all 0.2s ease",
        border: "1px solid #333",
        position: "relative",
        minHeight: "180px",
        "&:hover": {
            border: "1px solid #555",
        },
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "#e9ecef",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 12px auto",
        "& svg": {
            fontSize: 20,
            color: "#495057",
        },
    },
    itemInfo: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "pointer",
        textAlign: "center",
        justifyContent: "flex-start",
    },
    itemName: {
        fontSize: "0.9rem",
        fontWeight: 500,
        color: "#333",
        marginBottom: 6,
        lineHeight: 1.2,
        textAlign: "center",
    },
    itemDetails: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        fontSize: "0.75rem",
        color: "#666",
        marginBottom: 8,
        textAlign: "center",
    },
    statusChip: {
        fontWeight: 400,
        fontSize: "0.65rem",
        height: 16,
        padding: "0 6px",
        borderRadius: 8,
    },
    itemActions: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        marginTop: "auto",
        paddingTop: 8,
        borderTop: "1px solid #dee2e6",
    },
    actionButton: {
        width: 24,
        height: 24,
        borderRadius: 4,
        opacity: 0.7,
        transition: "all 0.2s ease",
        "&:hover": {
            opacity: 1,
        },
        "& svg": {
            fontSize: 12,
        },
    },
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        color: "#999",
        "& svg": {
            fontSize: 64,
            marginBottom: 16,
            opacity: 0.5,
        },
    },
    loadingContainer: {
        display: "flex",
        justifyContent: "center",
        padding: "24px",
    },
}));

const KanbanAutomations = () => {
    const classes = useStyles();
    const history = useHistory();
    const { user } = useContext(AuthContext);

    const [loading, setLoading] = useState(false);
    const [searchParam, setSearchParam] = useState("");
    const [automations, setAutomations] = useState([]);
    const [reloadData, setReloadData] = useState(false);

    const [selectedId, setSelectedId] = useState(null);
    const [selectedName, setSelectedName] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingAuto, setDeletingAuto] = useState(null);

    useEffect(() => {
        const fetchAutomations = async () => {
            setLoading(true);
            try {
                const { data } = await api.get("/kanban-automations");
                setAutomations(data || []);
            } catch (err) {
                toastError(err);
            }
            setLoading(false);
        };
        fetchAutomations();
    }, [reloadData]);

    const handleSearch = (event) => {
        setSearchParam(event.target.value.toLowerCase());
    };

    const handleOpenModal = () => {
        setSelectedId(null);
        setSelectedName(null);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedId(null);
        setSelectedName(null);
        setModalOpen(false);
    };

    const handleEdit = (auto) => {
        setSelectedId(auto.id);
        setSelectedName(auto.nome_automacao);
        setModalOpen(true);
    };

    const handleDelete = async (autoId) => {
        try {
            await api.delete(`/kanban-automations/${autoId}`);
            toast.success("Automação excluída com sucesso");
            setReloadData((old) => !old);
        } catch (err) {
            toastError(err);
        }
        setDeletingAuto(null);
        setConfirmOpen(false);
    };

    const filteredAutomations = automations.filter((auto) =>
        auto.nome_automacao?.toLowerCase().includes(searchParam)
    );

    const getStatusChip = (status) => {
        if (status) {
            return (
                <Chip
                    label="Ativo"
                    size="small"
                    className={classes.statusChip}
                    style={{
                        backgroundColor: "#d4edda",
                        color: "#155724"
                    }}
                />
            );
        }
        return (
            <Chip
                label="Desativado"
                size="small"
                className={classes.statusChip}
                style={{
                    backgroundColor: "#f8f9fa",
                    color: "#6c757d"
                }}
            />
        );
    };

    return (
        <Box className={classes.root}>
            {/* Modais */}
            <KanbanAutomationModal
                open={modalOpen}
                onClose={handleCloseModal}
                automationId={selectedId}
                automationName={selectedName}
                onSave={() => setReloadData((old) => !old)}
            />
            <ConfirmationModal
                title={deletingAuto ? `Excluir automação ${deletingAuto.nome_automacao}?` : ""}
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={() => handleDelete(deletingAuto.id)}
            >
                Tem certeza que deseja deletar esta automação?
            </ConfirmationModal>

            {/* Header */}
            <Box className={classes.header}>
                <Box className={classes.headerLeft}>
                    <Box className={classes.headerIcon}>
                        <DeviceHubIcon />
                    </Box>
                    <Box>
                        <Typography className={classes.headerTitle}>Automações do Kanban</Typography>
                        <Typography className={classes.headerSubtitle}>
                            {automations.length} {automations.length === 1 ? "automação" : "automações"}
                        </Typography>
                    </Box>
                </Box>

                <Box className={classes.headerRight}>
                    <TextField
                        placeholder={i18n.t("contacts.searchPlaceholder")}
                        variant="outlined"
                        size="small"
                        value={searchParam}
                        onChange={handleSearch}
                        className={classes.searchField}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon style={{ color: "#999" }} />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <button className={classes.addButton} onClick={handleOpenModal}>
                        <AddIcon style={{ fontSize: 24 }} />
                    </button>
                </Box>
            </Box>

            {/* Content */}
            <Box className={classes.content}>
                {filteredAutomations.length === 0 && !loading ? (
                    <Box className={classes.emptyState}>
                        <DeviceHubIcon />
                        <Typography>Nenhuma automação encontrada</Typography>
                    </Box>
                ) : (
                    <Box className={classes.gridContainer}>
                        {filteredAutomations.map((auto) => (
                            <Box key={auto.id} className={classes.listItem}>
                                <Box className={classes.itemIcon}>
                                    <DeviceHubIcon />
                                </Box>

                                {/* Info */}
                                <Box
                                    className={classes.itemInfo}
                                    onClick={() => history.push(`/kanban-automations-config/${auto.id}`)}
                                >
                                    <Typography className={classes.itemName}>{auto.nome_automacao}</Typography>
                                    <Box className={classes.itemDetails}>
                                        <span>ID: {auto.id}</span>
                                        {getStatusChip(auto.status)}
                                    </Box>
                                </Box>

                                {/* Actions */}
                                <Box className={classes.itemActions}>
                                    <IconButton
                                        size="small"
                                        className={`${classes.actionButton}`}
                                        onClick={() => history.push(`/kanban-automations-config/${auto.id}`)}
                                    >
                                        <VisibilityIcon fontSize="small" style={{ color: "#666" }} />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        className={`${classes.actionButton}`}
                                        onClick={() => handleEdit(auto)}
                                    >
                                        <EditIcon fontSize="small" style={{ color: "#666" }} />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        className={`${classes.actionButton}`}
                                        onClick={() => {
                                            setDeletingAuto(auto);
                                            setConfirmOpen(true);
                                        }}
                                    >
                                        <DeleteOutlineIcon fontSize="small" style={{ color: "#666" }} />
                                    </IconButton>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}

                {loading && (
                    <Box className={classes.loadingContainer}>
                        <CircularProgress size={32} />
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default KanbanAutomations;
