import { Chip, Select, MenuItem, InputLabel, FormControl, ListSubheader, CircularProgress, Avatar, Typography } from "@material-ui/core";
import React, { useContext, useEffect, useState } from "react";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
    menuListItem: {
        paddingTop: 0,
        paddingBottom: 0,
        border: "none",
    },
    menuItem: {
        maxHeight: 30,
    },
    chips: {
        display: "flex",
        flexWrap: "wrap",
    },
    chip: {
        margin: 2,
    },
    stageMenuItem: {
        paddingLeft: 24,
        fontSize: "0.9rem",
    },
    pipelineHeader: {
        lineHeight: "32px",
        fontWeight: 600,
        color: theme.palette.text.secondary,
        fontSize: "0.75rem",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
    },
}));

/**
 * TagsKanbanContainer - Refatorado para usar o Board Inteligente (Pipelines/Stages/Opportunities)
 * 
 * Fluxo:
 * 1. GET /pipelines → lista de funis
 * 2. GET /pipelines/:id/board → estágios do funil
 * 3. GET /opportunities?contactId=X → verifica oportunidade existente
 * 4. POST /opportunities → cria/vincula oportunidade ao estágio
 * 5. POST /opportunities/:id/move → move para outro estágio
 */
export function TagsKanbanContainer({ ticket, onStageChange, currentLeadValue }) {
    const classes = useStyles();
    const { user: currentUser } = useContext(AuthContext);

    const [pipelines, setPipelines] = useState([]);
    const [stagesByPipeline, setStagesByPipeline] = useState({}); // { pipelineId: [stages] }
    const [selected, setSelected] = useState(""); // "pipelineId:stageId"
    const [loading, setLoading] = useState(true);
    const [existingOpportunity, setExistingOpportunity] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState("");

    const resolveLeadValue = () => {
        if (currentLeadValue !== null && currentLeadValue !== undefined && currentLeadValue !== "") {
            const parsed = Number(currentLeadValue);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }

        const ticketValue = Number(ticket?.leadValue);
        return Number.isNaN(ticketValue) ? 0 : ticketValue;
    };

    useEffect(() => {
        let isMounted = true;
        loadPipelinesAndStages(isMounted);
        loadUsers(isMounted);
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        if (currentUser?.id && !selectedUserId) {
            setSelectedUserId(currentUser.id);
        }
    }, [currentUser]);

    useEffect(() => {
        if (ticket?.contact?.id && pipelines.length > 0) {
            loadExistingOpportunity();
        }
    }, [ticket?.contact?.id, pipelines]);

    const loadUsers = async (isMounted) => {
        try {
            const { data } = await api.get("/users/", { params: { pageNumber: 1 } });
            const list = data?.users || data || [];
            if (isMounted) setUsers(list);
        } catch (err) {
            // silently — usuários não são críticos aqui
        }
    };

    const loadPipelinesAndStages = async (isMounted) => {
        setLoading(true);
        try {
            const { data: pipelinesData } = await api.get("/pipelines");
            const pipelinesList = pipelinesData || [];

            if (!isMounted) return;
            setPipelines(pipelinesList);

            // Para cada pipeline, buscar seus estágios
            const stagesMap = {};
            for (const pipeline of pipelinesList) {
                try {
                    const { data: boardData } = await api.get(`/pipelines/${pipeline.id}/board`);
                    stagesMap[pipeline.id] = boardData?.stages || boardData?.columns || [];
                } catch (err) {
                    console.warn(`Não foi possível carregar estágios do pipeline ${pipeline.id}:`, err);
                    stagesMap[pipeline.id] = [];
                }
            }

            if (isMounted) {
                setStagesByPipeline(stagesMap);
            }
        } catch (err) {
            toastError(err);
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    const loadExistingOpportunity = async () => {
        try {
            const contactId = ticket?.contact?.id;
            if (!contactId) return;

            const { data } = await api.get("/opportunities", {
                params: { contactId }
            });

            const opportunities = data?.opportunities || data || [];
            if (Array.isArray(opportunities) && opportunities.length > 0) {
                const opp = opportunities[0];
                setExistingOpportunity(opp);
                if (opp.stageId && opp.pipelineId) {
                    setSelected(`${opp.pipelineId}:${opp.stageId}`);
                }
                if (opp.assignedUserId) {
                    setSelectedUserId(opp.assignedUserId);
                }
            }
        } catch (err) {
            // Silently handle - pode não ter oportunidade vinculada
            console.warn("Nenhuma oportunidade existente encontrada:", err?.message);
        }
    };

    const onChange = async (e) => {
        const value = e.target.value;

        if (!value) {
            setSelected("");
            return;
        }

        const [pipelineId, stageId] = value.split(":").map(Number);

        if (!pipelineId || !stageId) return;

        try {
            const resolvedLeadValue = resolveLeadValue();

            if (existingOpportunity?.id) {
                if (Number(existingOpportunity.value || 0) !== resolvedLeadValue) {
                    await api.put(`/opportunities/${existingOpportunity.id}`, {
                        value: resolvedLeadValue
                    });
                    setExistingOpportunity(prev => prev ? { ...prev, value: resolvedLeadValue } : prev);
                }

                // Mover oportunidade existente para novo estágio
                await api.post(`/opportunities/${existingOpportunity.id}/move`, {
                    toStageId: stageId,
                    pipelineId,
                });
                toast.success("Etapa do Kanban atualizada!");
            } else {
                // Criar nova oportunidade no Board Inteligente
                const contactId = ticket?.contact?.id;
                const contactName = ticket?.contact?.name || ticket?.contact?.number || "Contato";

                const { data: newOpp } = await api.post("/opportunities", {
                    title: contactName,
                    stageId,
                    pipelineId,
                    contactId,
                    ticketId: ticket?.id,
                    value: resolvedLeadValue,
                    assignedUserId: selectedUserId || currentUser?.id || undefined,
                });

                setExistingOpportunity(newOpp);
                toast.success("Contato vinculado ao Board Inteligente!");
            }

            setSelected(value);
            if (typeof onStageChange === "function") {
                onStageChange(value);
            }
        } catch (err) {
            toastError(err);
        }
    };

    const onUserChange = async (e) => {
        const userId = e.target.value;
        setSelectedUserId(userId);

        if (existingOpportunity?.id) {
            try {
                await api.put(`/opportunities/${existingOpportunity.id}`, {
                    assignedUserId: userId || null,
                });
                setExistingOpportunity(prev => ({ ...prev, assignedUserId: userId }));
                toast.success("Responsável atualizado!");
            } catch (err) {
                toastError(err);
            }
        }
    };

    const renderSelectedValue = () => {
        if (!selected) return null;

        const [pipelineId, stageId] = selected.split(":").map(Number);
        const stages = stagesByPipeline[pipelineId] || [];
        const stage = stages.find(s => s.id === stageId);
        const pipeline = pipelines.find(p => p.id === pipelineId);

        if (!stage) return null;

        return (
            <Chip
                style={{
                    backgroundColor: stage.color || "#3b82f6",
                    color: "#FFF",
                    marginRight: 1,
                    padding: 1,
                    fontWeight: "bold",
                    paddingLeft: 5,
                    paddingRight: 5,
                    borderRadius: 3,
                    fontSize: "0.8em",
                    whiteSpace: "nowrap",
                }}
                label={`${pipeline?.name ? pipeline.name + " → " : ""}${stage.name}`}
                size="small"
            />
        );
    };

    if (loading) {
        return (
            <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel id="kanban-stage-id">{i18n.t("Etapa Kanban")}</InputLabel>
                <Select disabled value="">
                    <MenuItem value="">
                        <CircularProgress size={16} style={{ marginRight: 8 }} />
                        Carregando...
                    </MenuItem>
                </Select>
            </FormControl>
        );
    }

    return (
        <>
            <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel id="kanban-stage-id">{i18n.t("Etapa Kanban")}</InputLabel>
                <Select
                    labelWidth={90}
                    value={selected}
                    labelId="kanban-stage-id"
                    label={i18n.t("Etapa Kanban")}
                    onChange={onChange}
                    MenuProps={{
                        anchorOrigin: {
                            vertical: "bottom",
                            horizontal: "left",
                        },
                        transformOrigin: {
                            vertical: "top",
                            horizontal: "left",
                        },
                        getContentAnchorEl: null,
                    }}
                    renderValue={renderSelectedValue}
                >
                    <MenuItem value="">&nbsp;</MenuItem>
                    {pipelines.map(pipeline => {
                        const stages = stagesByPipeline[pipeline.id] || [];
                        if (stages.length === 0) return null;

                        return [
                            <ListSubheader
                                key={`header-${pipeline.id}`}
                                className={classes.pipelineHeader}
                                disableSticky
                            >
                                📋 {pipeline.name}
                            </ListSubheader>,
                            ...stages.map(stage => (
                                <MenuItem
                                    key={`${pipeline.id}:${stage.id}`}
                                    value={`${pipeline.id}:${stage.id}`}
                                    className={classes.stageMenuItem}
                                >
                                    <Chip
                                        size="small"
                                        style={{
                                            backgroundColor: stage.color || "#e2e8f0",
                                            color: stage.color ? "#fff" : "#333",
                                            marginRight: 8,
                                            width: 12,
                                            height: 12,
                                        }}
                                    />
                                    {stage.name}
                                </MenuItem>
                            )),
                        ];
                    })}
                </Select>
            </FormControl>

            <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel id="kanban-user-id">Responsável</InputLabel>
                <Select
                    labelWidth={90}
                    value={selectedUserId || ""}
                    labelId="kanban-user-id"
                    label="Responsável"
                    onChange={onUserChange}
                    MenuProps={{
                        anchorOrigin: { vertical: "bottom", horizontal: "left" },
                        transformOrigin: { vertical: "top", horizontal: "left" },
                        getContentAnchorEl: null,
                    }}
                    renderValue={(val) => {
                        const u = users.find(u => u.id === val);
                        return u ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <Avatar
                                    src={u.profileImage || undefined}
                                    style={{ width: 20, height: 20, fontSize: "0.65rem" }}
                                >
                                    {u.name?.charAt(0)}
                                </Avatar>
                                <Typography variant="body2" style={{ lineHeight: 1 }}>{u.name}</Typography>
                            </span>
                        ) : null;
                    }}
                >
                    <MenuItem value="">
                        <em>Sem responsável</em>
                    </MenuItem>
                    {users.map(u => (
                        <MenuItem key={u.id} value={u.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar
                                src={u.profileImage || undefined}
                                style={{ width: 24, height: 24, fontSize: "0.7rem", marginRight: 8 }}
                            >
                                {u.name?.charAt(0)}
                            </Avatar>
                            {u.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </>
    );
}
