import React, { useState, useEffect, useCallback } from "react";
import {
    makeStyles,
    Typography,
    Box,
    Paper,
    Button,
    IconButton,
    Dialog,
    TextField,
    Grid,
    Card,
    CardContent,
    Tooltip,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Chip
} from "@material-ui/core";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIcon,
    Settings as SettingsIcon,
    Palette as PaletteIcon,
    Timer as TimerIcon
} from "@material-ui/icons";
import api from "../../services/api";
import { toast } from "react-toastify";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const useStyles = makeStyles((theme) => ({
    container: {
        padding: theme.spacing(4),
        backgroundColor: "#f8fafc",
        minHeight: "100vh"
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing(4)
    },
    pipelineCard: {
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        "&:hover": {
            transform: "translateY(-4px)",
            transition: "all 0.3s ease"
        }
    },
    stageItem: {
        display: "flex",
        alignItems: "center",
        padding: theme.spacing(2),
        backgroundColor: "#fff",
        borderRadius: 12,
        marginBottom: theme.spacing(1),
        border: "1px solid #e2e8f0",
        gap: theme.spacing(2)
    },
    colorDot: {
        width: 16,
        height: 16,
        borderRadius: "50%",
    }
}));

const PipelineConfig = () => {
    const classes = useStyles();
    const [pipelines, setPipelines] = useState([]);
    const [selectedPipeline, setSelectedPipeline] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
    const [newPipelineName, setNewPipelineName] = useState("");
    const [editingStage, setEditingStage] = useState(null);

    useEffect(() => {
        fetchPipelines();
    }, []);

    const fetchPipelines = async () => {
        try {
            const { data } = await api.get("/pipelines");
            setPipelines(data);
        } catch (err) {
            toast.error("Erro ao carregar pipelines");
        } finally {
            setLoading(false);
        }
    };

    const handleOnDragEnd = async (result) => {
        if (!result.destination) return;

        const items = Array.from(selectedPipeline.stages);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update sequence locally
        const updatedStages = items.map((stage, index) => ({ ...stage, order: index }));
        setSelectedPipeline({ ...selectedPipeline, stages: updatedStages });

        // Save to DB
        try {
            await api.put(`/pipelines/${selectedPipeline.id}/stages/sort`, {
                stages: updatedStages.map(s => ({ id: s.id, order: s.order }))
            });
            toast.success("Ordem atualizada");
        } catch (err) {
            toast.error("Erro ao salvar ordem");
        }
    };

    const handleSaveStage = async (stageData) => {
        try {
            if (editingStage && editingStage.id) {
                await api.put(`/pipelines/${selectedPipeline.id}/stages/${editingStage.id}`, stageData);
                toast.success("Estágio atualizado");
            } else {
                await api.post(`/pipelines/${selectedPipeline.id}/stages`, stageData);
                toast.success("Estágio criado");
            }
            fetchPipelines();
            setModalOpen(false);
        } catch (err) {
            toast.error("Erro ao salvar estágio");
        }
    };

    const handleMigrateLegacy = async () => {
        try {
            await api.post("/migrate-kanban");
            toast.success("Migração concluída com sucesso!");
            fetchPipelines();
        } catch (err) {
            toast.error("Erro ao migrar dados.");
        }
    };

    const handleCreatePipeline = async () => {
        if (!newPipelineName.trim()) {
            return toast.error("Por favor, digite um nome para o funil.");
        }
        try {
            await api.post("/pipelines", { name: newPipelineName });
            toast.success("Funil criado com sucesso!");
            setPipelineModalOpen(false);
            setNewPipelineName("");
            fetchPipelines();
        } catch (err) {
            toast.error("Erro ao criar funil.");
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

    return (
        <Box className={classes.container}>
            <Box className={classes.header}>
                <Typography variant="h4" style={{ fontWeight: 900, color: "#0f172a" }}>Construtor Visual de Funil</Typography>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={handleMigrateLegacy}
                        style={{ borderRadius: 12 }}
                    >
                        Migrar Kanban Legado
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => setPipelineModalOpen(true)}
                        style={{ borderRadius: 12 }}
                    >
                        Novo Funil
                    </Button>
                </Box>
            </Box>

            {!selectedPipeline ? (
                <Grid container spacing={4}>
                    {pipelines.length > 0 ? pipelines.map(pipe => (
                        <Grid item xs={12} md={4} key={pipe.id}>
                            <Card className={classes.pipelineCard} onClick={() => setSelectedPipeline(pipe)} style={{ cursor: "pointer" }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="h6" style={{ fontWeight: 700 }}>{pipe.name}</Typography>
                                        <SettingsIcon color="action" />
                                    </Box>
                                    <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>{pipe.stages?.length || 0} estágios configurados</Typography>
                                    {pipe.isDefault && <Chip label="Padrão" size="small" color="primary" style={{ marginTop: 12 }} />}
                                </CardContent>
                            </Card>
                        </Grid>
                    )) : (
                        <Grid item xs={12}>
                            <Paper style={{ padding: 40, textAlign: "center", borderRadius: 16 }}>
                                <Typography variant="h6">Nenhum funil encontrado.</Typography>
                                <Typography color="textSecondary" style={{ marginTop: 8 }}>Você ainda não possui funis configurados. Clique em "Migrar Kanban Legado" para importar seus dados ou crie um novo funil do zero.</Typography>
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            ) : (
                <Box>
                    <Box mb={4} display="flex" alignItems="center" gap={2}>
                        <Button onClick={() => setSelectedPipeline(null)}>← Voltar para listagem</Button>
                        <Typography variant="h5" style={{ fontWeight: 800 }}>Configurando Estágios: {selectedPipeline.name}</Typography>
                    </Box>

                    <Paper style={{ padding: 24, borderRadius: 16 }}>
                        <Box mb={3} display="flex" justifyContent="space-between">
                            <Typography variant="h6">Sequência do Funil</Typography>
                            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { setEditingStage({}); setModalOpen(true); }}>Adicionar Estágio</Button>
                        </Box>

                        <DragDropContext onDragEnd={handleOnDragEnd}>
                            <Droppable droppableId="stages">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef}>
                                        {selectedPipeline.stages.map((stage, index) => (
                                            <Draggable key={stage.id} draggableId={stage.id.toString()} index={index}>
                                                {(provided) => (
                                                    <div className={classes.stageItem} ref={provided.innerRef} {...provided.draggableProps}>
                                                        <div {...provided.dragHandleProps}><DragIcon color="action" /></div>
                                                        <div className={classes.colorDot} style={{ backgroundColor: stage.color || "#ccc" }} />
                                                        <Box flex={1}>
                                                            <Typography style={{ fontWeight: 700 }}>{stage.name}</Typography>
                                                            <Box display="flex" gap={2} mt={0.5}>
                                                                <Typography variant="caption" color="textSecondary">
                                                                    <TimerIcon style={{ fontSize: 12, verticalAlign: "middle", marginRight: 4 }} />
                                                                    SLA: {stage.slaDays || 2} dias
                                                                </Typography>
                                                                <Typography variant="caption" color="textSecondary">
                                                                    Probabilidade: {stage.probability}%
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                        <Box>
                                                            <IconButton size="small" onClick={() => { setEditingStage(stage); setModalOpen(true); }}><EditIcon /></IconButton>
                                                            <IconButton size="small" color="secondary"><DeleteIcon /></IconButton>
                                                        </Box>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </Paper>
                </Box>
            )}

            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{editingStage?.id ? "Editar Estágio" : "Novo Estágio"}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} pt={1}>
                        <TextField label="Nome do Estágio" fullWidth variant="outlined" defaultValue={editingStage?.name} />
                        <TextField label="Cor (Hex)" fullWidth variant="outlined" placeholder="#FFFFFF" defaultValue={editingStage?.color} />
                        <TextField label="Dias de SLA" type="number" fullWidth variant="outlined" defaultValue={editingStage?.slaDays || 2} />
                        <TextField label="Probabilidade (%)" type="number" fullWidth variant="outlined" defaultValue={editingStage?.probability || 50} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
                    <Button color="primary" variant="contained" onClick={() => handleSaveStage({})}>Salvar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={pipelineModalOpen} onClose={() => setPipelineModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Novo Funil</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} pt={1}>
                        <TextField
                            label="Nome do Funil"
                            fullWidth
                            variant="outlined"
                            value={newPipelineName}
                            onChange={(e) => setNewPipelineName(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPipelineModalOpen(false)}>Cancelar</Button>
                    <Button color="primary" variant="contained" onClick={handleCreatePipeline}>Criar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PipelineConfig;
