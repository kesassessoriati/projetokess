import React, { useState, useEffect, useContext, useCallback } from "react";
import {
    makeStyles,
    Box,
    Typography,
    Grid,
    Paper,
    Avatar,
    Chip,
    IconButton,
    Tooltip,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    InputAdornment,
} from "@material-ui/core";
import GroupIcon from "@material-ui/icons/Group";
import SearchIcon from "@material-ui/icons/Search";
import PersonAddIcon from "@material-ui/icons/PersonAdd";
import RemoveCircleOutlineIcon from "@material-ui/icons/RemoveCircleOutline";
import StarIcon from "@material-ui/icons/Star";
import StarBorderIcon from "@material-ui/icons/StarBorder";
import LinkIcon from "@material-ui/icons/Link";
import RefreshIcon from "@material-ui/icons/Refresh";
import NotificationsActiveIcon from "@material-ui/icons/NotificationsActive";
import ContentCopyIcon from "@material-ui/icons/FileCopy";
import { toast } from "react-toastify";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
    root: {
        padding: theme.spacing(3),
        height: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(2),
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(1),
        marginBottom: theme.spacing(1),
    },
    pageTitle: {
        fontSize: "1.5rem",
        fontWeight: 700,
        color: "#111827",
    },
    layout: {
        display: "flex",
        gap: theme.spacing(2),
        flex: 1,
        overflow: "hidden",
    },
    leftPanel: {
        width: 300,
        minWidth: 260,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(1.5),
    },
    rightPanel: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    },
    paper: {
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    },
    connectionSelect: {
        padding: theme.spacing(1.5),
    },
    groupList: {
        overflowY: "auto",
        flex: 1,
        padding: theme.spacing(1),
    },
    groupItem: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(1.5),
        padding: theme.spacing(1, 1.5),
        borderRadius: 8,
        cursor: "pointer",
        transition: "background 0.15s",
        "&:hover": {
            backgroundColor: "#f3f4f6",
        },
        "&.selected": {
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
        },
    },
    groupAvatar: {
        backgroundColor: "#3b82f6",
        width: 40,
        height: 40,
        fontSize: "1rem",
    },
    groupName: {
        fontWeight: 600,
        fontSize: "0.9rem",
        color: "#111827",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    groupMeta: {
        fontSize: "0.75rem",
        color: "#6b7280",
    },
    groupHeader: {
        padding: theme.spacing(2.5),
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    groupInfo: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(2),
    },
    groupHeaderName: {
        fontSize: "1.2rem",
        fontWeight: 700,
        color: "#111827",
    },
    groupHeaderMeta: {
        fontSize: "0.8rem",
        color: "#6b7280",
    },
    toolbar: {
        padding: theme.spacing(1.5, 2.5),
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        gap: theme.spacing(1),
        flexWrap: "wrap",
    },
    memberList: {
        overflowY: "auto",
        flex: 1,
        padding: theme.spacing(1, 2),
    },
    memberRow: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(1.5),
        padding: theme.spacing(1, 1.5),
        borderRadius: 8,
        "&:hover": {
            backgroundColor: "#f9fafb",
            "& $memberActions": {
                opacity: 1,
            },
        },
    },
    memberAvatar: {
        width: 36,
        height: 36,
        backgroundColor: "#e5e7eb",
        color: "#374151",
        fontSize: "0.85rem",
    },
    memberName: {
        fontWeight: 500,
        fontSize: "0.875rem",
        color: "#111827",
    },
    memberNumber: {
        fontSize: "0.75rem",
        color: "#9ca3af",
    },
    memberActions: {
        marginLeft: "auto",
        opacity: 0,
        transition: "opacity 0.15s",
        display: "flex",
        gap: 4,
    },
    adminChip: {
        height: 20,
        fontSize: "0.7rem",
        backgroundColor: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fde68a",
    },
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing(6),
        color: "#9ca3af",
        gap: theme.spacing(1),
    },
}));

export default function GroupManagement() {
    const classes = useStyles();
    const { user } = useContext(AuthContext);
    const isAdmin = user?.profile === "admin" || user?.profile === "super";

    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState("");
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groupInfo, setGroupInfo] = useState(null);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [searchGroup, setSearchGroup] = useState("");
    const [searchMember, setSearchMember] = useState("");
    const [tagAllDialog, setTagAllDialog] = useState(false);
    const [tagMessage, setTagMessage] = useState("");
    const [inviteLink, setInviteLink] = useState("");

    const loadGroups = useCallback(async () => {
        setLoadingGroups(true);
        try {
            const { data } = await api.get("/group-management/groups");
            // Flatten all connections and their groups
            const allGroups = [];
            const conns = [];
            data.forEach((conn) => {
                conns.push({ id: conn.whatsappId, name: conn.whatsappName });
                conn.groups.forEach((g) => allGroups.push({ ...g, whatsappId: conn.whatsappId, whatsappName: conn.whatsappName }));
            });
            setConnections(conns);
            setGroups(allGroups);
        } catch {
            toast.error("Erro ao carregar grupos");
        }
        setLoadingGroups(false);
    }, []);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    const loadGroupInfo = useCallback(async (group) => {
        setLoadingInfo(true);
        setGroupInfo(null);
        setInviteLink("");
        try {
            const { data } = await api.get(`/group-management/groups/${encodeURIComponent(group.id)}/info?whatsappId=${group.whatsappId}`);
            setGroupInfo(data);
        } catch {
            toast.error("Erro ao carregar informações do grupo");
        }
        setLoadingInfo(false);
    }, []);

    const handleSelectGroup = (group) => {
        setSelectedGroup(group);
        loadGroupInfo(group);
    };

    const handleKick = async (memberId) => {
        if (!selectedGroup) return;
        try {
            await api.delete(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/members/${encodeURIComponent(memberId)}`, {
                data: { whatsappId: selectedGroup.whatsappId }
            });
            toast.success("Membro removido");
            loadGroupInfo(selectedGroup);
        } catch {
            toast.error("Erro ao remover membro");
        }
    };

    const handlePromote = async (memberId) => {
        if (!selectedGroup) return;
        try {
            await api.post(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/members/${encodeURIComponent(memberId)}/promote`, {
                whatsappId: selectedGroup.whatsappId
            });
            toast.success("Membro promovido a admin");
            loadGroupInfo(selectedGroup);
        } catch {
            toast.error("Erro ao promover membro");
        }
    };

    const handleDemote = async (memberId) => {
        if (!selectedGroup) return;
        try {
            await api.post(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/members/${encodeURIComponent(memberId)}/demote`, {
                whatsappId: selectedGroup.whatsappId
            });
            toast.success("Admin rebaixado");
            loadGroupInfo(selectedGroup);
        } catch {
            toast.error("Erro ao rebaixar admin");
        }
    };

    const handleTagAll = async () => {
        if (!selectedGroup) return;
        try {
            await api.post(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/tag-all`, {
                whatsappId: selectedGroup.whatsappId,
                message: tagMessage
            });
            toast.success("Mensagem enviada para todos os membros");
            setTagAllDialog(false);
            setTagMessage("");
        } catch {
            toast.error("Erro ao mencionar todos");
        }
    };

    const handleGetInviteLink = async () => {
        if (!selectedGroup) return;
        try {
            const { data } = await api.get(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/invite-link?whatsappId=${selectedGroup.whatsappId}`);
            setInviteLink(data.inviteLink);
            navigator.clipboard?.writeText(data.inviteLink);
            toast.success("Link copiado para a área de transferência!");
        } catch {
            toast.error("Erro ao obter link de convite");
        }
    };

    const handleRevokeInviteLink = async () => {
        if (!selectedGroup) return;
        try {
            const { data } = await api.post(`/group-management/groups/${encodeURIComponent(selectedGroup.id)}/invite-revoke`, {
                whatsappId: selectedGroup.whatsappId
            });
            setInviteLink(data.newInviteLink || "");
            toast.success("Link revogado. Novo link gerado.");
        } catch {
            toast.error("Erro ao revogar link");
        }
    };

    const filteredGroups = groups.filter(
        (g) => (!selectedConnection || g.whatsappId === selectedConnection) &&
            g.subject?.toLowerCase().includes(searchGroup.toLowerCase())
    );

    const filteredMembers = groupInfo?.participants?.filter((m) => {
        const num = m.id.split("@")[0];
        return num.includes(searchMember);
    }) || [];

    return (
        <Box className={classes.root}>
            <Box className={classes.header}>
                <GroupIcon style={{ color: "#3b82f6", fontSize: 28 }} />
                <Typography className={classes.pageTitle}>Gestão de Grupos</Typography>
            </Box>

            <Box className={classes.layout}>
                {/* ─── Painel Esquerdo: lista de grupos ─── */}
                <Box className={classes.leftPanel}>
                    <Paper className={classes.paper} style={{ padding: "12px" }}>
                        <FormControl variant="outlined" size="small" fullWidth>
                            <InputLabel>Filtrar por conexão</InputLabel>
                            <Select
                                label="Filtrar por conexão"
                                value={selectedConnection}
                                onChange={(e) => setSelectedConnection(e.target.value)}
                            >
                                <MenuItem value="">Todas</MenuItem>
                                {connections.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            placeholder="Buscar grupo..."
                            value={searchGroup}
                            onChange={(e) => setSearchGroup(e.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth
                            style={{ marginTop: 8 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon style={{ fontSize: 18, color: "#9ca3af" }} />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Box style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                            <Tooltip title="Atualizar grupos">
                                <IconButton size="small" onClick={loadGroups} disabled={loadingGroups}>
                                    <RefreshIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Paper>

                    <Paper className={classes.paper} style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <Box className={classes.groupList}>
                            {loadingGroups ? (
                                <Box style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : filteredGroups.length === 0 ? (
                                <Box className={classes.emptyState}>
                                    <GroupIcon style={{ fontSize: 40 }} />
                                    <Typography variant="body2">Nenhum grupo encontrado</Typography>
                                </Box>
                            ) : (
                                filteredGroups.map((group) => (
                                    <Box
                                        key={group.id}
                                        className={`${classes.groupItem} ${selectedGroup?.id === group.id ? "selected" : ""}`}
                                        onClick={() => handleSelectGroup(group)}
                                    >
                                        <Avatar className={classes.groupAvatar}>
                                            {(group.subject || "G")[0].toUpperCase()}
                                        </Avatar>
                                        <Box style={{ overflow: "hidden" }}>
                                            <Typography className={classes.groupName}>{group.subject || group.id}</Typography>
                                            <Typography className={classes.groupMeta}>{group.size} membros · {group.whatsappName}</Typography>
                                        </Box>
                                    </Box>
                                ))
                            )}
                        </Box>
                    </Paper>
                </Box>

                {/* ─── Painel Direito: detalhes do grupo ─── */}
                <Paper className={`${classes.paper} ${classes.rightPanel}`}>
                    {!selectedGroup ? (
                        <Box className={classes.emptyState}>
                            <GroupIcon style={{ fontSize: 56, color: "#d1d5db" }} />
                            <Typography variant="h6" style={{ color: "#9ca3af" }}>Selecione um grupo</Typography>
                            <Typography variant="body2" style={{ color: "#d1d5db" }}>
                                Escolha um grupo na lista à esquerda para gerenciar
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            {/* Header do grupo */}
                            <Box className={classes.groupHeader}>
                                <Box className={classes.groupInfo}>
                                    <Avatar style={{ backgroundColor: "#3b82f6", width: 48, height: 48, fontSize: "1.2rem" }}>
                                        {(selectedGroup.subject || "G")[0].toUpperCase()}
                                    </Avatar>
                                    <Box>
                                        <Typography className={classes.groupHeaderName}>{selectedGroup.subject || selectedGroup.id}</Typography>
                                        <Typography className={classes.groupHeaderMeta}>
                                            {groupInfo?.participants?.length || selectedGroup.size} membros · {selectedGroup.whatsappName}
                                        </Typography>
                                        {inviteLink && (
                                            <Typography style={{ fontSize: "0.75rem", color: "#3b82f6", marginTop: 2 }}>
                                                {inviteLink}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                                <Tooltip title="Atualizar">
                                    <IconButton size="small" onClick={() => loadGroupInfo(selectedGroup)}>
                                        <RefreshIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>

                            {/* Toolbar de ações */}
                            {isAdmin && (
                                <Box className={classes.toolbar}>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        style={{ backgroundColor: "#3b82f6", color: "#fff", textTransform: "none", borderRadius: 8 }}
                                        startIcon={<NotificationsActiveIcon />}
                                        onClick={() => setTagAllDialog(true)}
                                    >
                                        Mencionar Todos
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        style={{ textTransform: "none", borderRadius: 8, borderColor: "#d1d5db" }}
                                        startIcon={<LinkIcon />}
                                        onClick={handleGetInviteLink}
                                    >
                                        Link de Convite
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        style={{ textTransform: "none", borderRadius: 8, borderColor: "#fca5a5", color: "#ef4444" }}
                                        onClick={handleRevokeInviteLink}
                                    >
                                        Revogar Link
                                    </Button>
                                </Box>
                            )}

                            {/* Busca de membros */}
                            <Box style={{ padding: "8px 16px", borderBottom: "1px solid #f3f4f6" }}>
                                <TextField
                                    placeholder="Buscar membro por número..."
                                    value={searchMember}
                                    onChange={(e) => setSearchMember(e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon style={{ fontSize: 16, color: "#9ca3af" }} />
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            </Box>

                            {/* Lista de membros */}
                            <Box className={classes.memberList}>
                                {loadingInfo ? (
                                    <Box style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                                        <CircularProgress size={32} />
                                    </Box>
                                ) : (
                                    filteredMembers.map((member) => {
                                        const number = member.id.split("@")[0];
                                        const initials = number.slice(-2);
                                        return (
                                            <Box key={member.id} className={classes.memberRow}>
                                                <Avatar className={classes.memberAvatar}>{initials}</Avatar>
                                                <Box>
                                                    <Typography className={classes.memberName}>{number}</Typography>
                                                    {member.isAdmin && (
                                                        <Chip label="Admin" size="small" className={classes.adminChip} />
                                                    )}
                                                </Box>
                                                {isAdmin && (
                                                    <Box className={classes.memberActions}>
                                                        {!member.isAdmin ? (
                                                            <Tooltip title="Promover a Admin">
                                                                <IconButton size="small" onClick={() => handlePromote(member.id)}>
                                                                    <StarBorderIcon fontSize="small" style={{ color: "#f59e0b" }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        ) : (
                                                            <Tooltip title="Rebaixar a Membro">
                                                                <IconButton size="small" onClick={() => handleDemote(member.id)}>
                                                                    <StarIcon fontSize="small" style={{ color: "#f59e0b" }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip title="Remover do grupo">
                                                            <IconButton size="small" onClick={() => handleKick(member.id)}>
                                                                <RemoveCircleOutlineIcon fontSize="small" style={{ color: "#ef4444" }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                )}
                                            </Box>
                                        );
                                    })
                                )}
                            </Box>
                        </>
                    )}
                </Paper>
            </Box>

            {/* Dialog: Mencionar Todos */}
            <Dialog open={tagAllDialog} onClose={() => setTagAllDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Mencionar Todos os Membros</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Mensagem (opcional)"
                        value={tagMessage}
                        onChange={(e) => setTagMessage(e.target.value)}
                        multiline
                        rows={3}
                        variant="outlined"
                        fullWidth
                        style={{ marginTop: 8 }}
                        placeholder="Digite uma mensagem para acompanhar as menções..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTagAllDialog(false)}>Cancelar</Button>
                    <Button variant="contained" color="primary" onClick={handleTagAll}>
                        Enviar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
