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
    Chip,
    Menu,
    MenuItem
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
import ConfirmationModal from "../../components/ConfirmationModal";
import ColorPicker from "../../components/ColorPicker";
import ContextPageHeader from "../../components/ContextPageHeader";

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
    const [isEditingPipeline, setIsEditingPipeline] = useState(false);
    const [pipelineMenuAnchorEl, setPipelineMenuAnchorEl] = useState(null);
    const [menuPipeline, setMenuPipeline] = useState(null);
    const [editingStage, setEditingStage] = useState(null);
    const [stageConfirmModalOpen, setStageConfirmModalOpen] = useState(false);
    const [stageToDelete, setStageToDelete] = useState(null);

    const [stageForm, setStageForm] = useState({ name: "", color: "#764ba2", slaDays: 2, probability: 50 });
    const [colorPickerModalOpen, setColorPickerModalOpen] = useState(false);

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

    const handleSaveStage = async () => {
        try {
            if (!stageForm.name) {
                toast.error("O nome do estágio é obrigatório");
                return;
            }
            if (editingStage && editingStage.id) {
                await api.put(`/pipelines/stages/${editingStage.id}`, stageForm);
                toast.success("Estágio atualizado");
            } else {
                await api.post(`/pipelines/${selectedPipeline.id}/stages`, stageForm);
                toast.success("Estágio criado");
            }
            fetchPipelines();
            
            // Fix local state list update so the user sees the new stage exactly here
            if (selectedPipeline) {
                const { data } = await api.get("/pipelines");
                const currentUpdated = data.find(p => p.id === selectedPipeline.id);
                if (currentUpdated) {
                    setSelectedPipeline(currentUpdated);
                }
            }

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

    const handleOpenPipelineMenu = (e, pipe) => {
        e.stopPropagation();
        setPipelineMenuAnchorEl(e.currentTarget);
        setMenuPipeline(pipe);
    };

    const handleClosePipelineMenu = () => {
        setPipelineMenuAnchorEl(null);
        // menuPipeline is intentionally kept so handleSavePipeline can use its id for PUT
    };

    const handleEditPipelineAction = () => {
        setNewPipelineName(menuPipeline.name);
        setIsEditingPipeline(true);
        setPipelineModalOpen(true);
        handleClosePipelineMenu();
    };

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [pipelineToDelete, setPipelineToDelete] = useState(null);

    const handleDeletePipelineAction = () => {
        setPipelineToDelete(menuPipeline);
        setConfirmModalOpen(true);
        handleClosePipelineMenu();
    };

    const handleConfirmDeletePipeline = async () => {
        try {
            await api.delete(`/pipelines/${pipelineToDelete.id}`);
            toast.success("Funil excluído com sucesso!");
            fetchPipelines();
        } catch (err) {
            toast.error(err.response?.data?.error || "Erro ao excluir funil.");
        } finally {
            setConfirmModalOpen(false);
            setPipelineToDelete(null);
        }
    };

    const handleDeleteStageAction = (stage) => {
        setStageToDelete(stage);
        setStageConfirmModalOpen(true);
    };

    const handleConfirmDeleteStage = async () => {
        if (!stageToDelete) return;
        try {
            await api.delete(`/pipelines/stages/${stageToDelete.id}`);
            toast.success("Estágio excluído com sucesso!");

            const updatedStages = selectedPipeline.stages.filter(s => s.id !== stageToDelete.id);
            const reorderedStages = updatedStages.map((stage, index) => ({ ...stage, order: index }));

            setSelectedPipeline({ ...selectedPipeline, stages: reorderedStages });
            setPipelines(pipelines.map(p => p.id === selectedPipeline.id ? { ...p, stages: reorderedStages } : p));
        } catch (err) {
            toast.error(err.response?.data?.error || "Erro ao excluir estágio.");
        } finally {
            setStageConfirmModalOpen(false);
            setStageToDelete(null);
        }
    };

    const handleOpenCreatePipeline = () => {
        setNewPipelineName("");
        setIsEditingPipeline(false);
        setMenuPipeline(null);
        setPipelineModalOpen(true);
    };

    const handleSavePipeline = async () => {
        if (!newPipelineName.trim()) {
            return toast.error("Por favor, digite um nome para o funil.");
        }
        try {
            if (isEditingPipeline && menuPipeline) {
                await api.put(`/pipelines/${menuPipeline.id}`, { name: newPipelineName });
                toast.success("Funil atualizado com sucesso!");
                setPipelines(pipelines.map(p => p.id === menuPipeline.id ? { ...p, name: newPipelineName } : p));
                if (selectedPipeline && selectedPipeline.id === menuPipeline.id) {
                    setSelectedPipeline({ ...selectedPipeline, name: newPipelineName });
                }
            } else {
                await api.post("/pipelines", { name: newPipelineName });
                toast.success("Funil criado com sucesso!");
                fetchPipelines();
            }
            setPipelineModalOpen(false);
            setNewPipelineName("");
            setIsEditingPipeline(false);
            setMenuPipeline(null);
        } catch (err) {
            toast.error("Erro ao salvar funil.");
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

    return (
        <Box className={classes.container}>
            <ContextPageHeader
                title="Configuração de Funil"
                subtitle="Estruture pipelines, estágios e regras do CRM"
                fallbackTo="/kanban"
                actions={!selectedPipeline ? (
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
                            onClick={handleOpenCreatePipeline}
                            style={{ borderRadius: 12 }}
                        >
                            Novo Funil
                        </Button>
                    </Box>
                ) : null}
            />

            {!selectedPipeline ? (
                <Grid container spacing={4}>
                    {pipelines.length > 0 ? pipelines.map(pipe => (
                        <Grid item xs={12} md={4} key={pipe.id}>
                            <Card className={classes.pipelineCard} onClick={() => setSelectedPipeline(pipe)} style={{ cursor: "pointer" }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="h6" style={{ fontWeight: 700 }}>
                                            {pipe.name}
                                            <Typography component="span" variant="caption" color="textSecondary" style={{ marginLeft: 8, fontWeight: 500 }}>
                                                | ID: {pipe.id}
                                            </Typography>
                                        </Typography>
                                        <IconButton size="small" onClick={(e) => handleOpenPipelineMenu(e, pipe)}>
                                            <SettingsIcon color="action" />
                                        </IconButton>
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
                        <Typography variant="h5" style={{ fontWeight: 800 }}>
                            Configurando Estágios: {selectedPipeline.name}
                            <Typography component="span" variant="h6" color="textSecondary" style={{ marginLeft: 8, fontWeight: 500 }}>
                                | ID: {selectedPipeline.id}
                            </Typography>
                        </Typography>
                    </Box>

                    <Paper style={{ padding: 24, borderRadius: 16 }}>
                        <Box mb={3} display="flex" justifyContent="space-between">
                            <Typography variant="h6">Sequência do Funil</Typography>
                            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { 
                                setEditingStage({}); 
                                setStageForm({ name: "", color: "#764ba2", slaDays: 2, probability: 50 });
                                setModalOpen(true); 
                            }}>Adicionar Estágio</Button>
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
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <Typography style={{ fontWeight: 700 }}>{stage.name}</Typography>
                                                                <Typography variant="caption" color="textSecondary" style={{ fontSize: "0.8rem" }}>
                                                                    | ID: {stage.id}
                                                                </Typography>
                                                            </Box>
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
                                                            <IconButton size="small" onClick={() => { 
                                                                setEditingStage(stage); 
                                                                setStageForm({
                                                                    name: stage.name || "",
                                                                    color: stage.color || "#764ba2",
                                                                    slaDays: stage.slaDays || 2,
                                                                    probability: stage.probability || 50
                                                                });
                                                                setModalOpen(true); 
                                                            }}><EditIcon /></IconButton>
                                                            <IconButton size="small" color="secondary" onClick={() => handleDeleteStageAction(stage)}><DeleteIcon /></IconButton>
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

            <Menu
                anchorEl={pipelineMenuAnchorEl}
                keepMounted
                open={Boolean(pipelineMenuAnchorEl)}
                onClose={handleClosePipelineMenu}
                PaperProps={{ style: { borderRadius: 12 } }}
            >
                <MenuItem onClick={() => { handleClosePipelineMenu(); setSelectedPipeline(menuPipeline); }}>
                    Configurar estágios
                </MenuItem>
                <MenuItem onClick={handleEditPipelineAction}>
                    Editar nome do funil
                </MenuItem>
                <MenuItem onClick={handleDeletePipelineAction} style={{ color: "red" }}>
                    Excluir funil
                </MenuItem>
            </Menu>

            <ConfirmationModal
                title={`Excluir Funil ${pipelineToDelete?.name}?`}
                open={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={handleConfirmDeletePipeline}
            >
                Tem certeza que deseja excluir o funil <b>{pipelineToDelete?.name}</b>?<br /><br />
                <b>Atenção:</b> Você não poderá excluir casos existam oportunidades atualmente neste funil.
            </ConfirmationModal>

            <ConfirmationModal
                title={`Excluir Estágio ${stageToDelete?.name}?`}
                open={stageConfirmModalOpen}
                onClose={() => setStageConfirmModalOpen(false)}
                onConfirm={handleConfirmDeleteStage}
            >
                Tem certeza que deseja excluir o estágio <b>{stageToDelete?.name}</b>? Esta ação não pode ser desfeita.<br /><br />
                <b>Atenção:</b> Você não poderá excluir se houver contatos vinculados a este estágio.
            </ConfirmationModal>

            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingStage?.id ? "Editar Estágio" : "Novo Estágio"}</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField 
                                label="Nome do Estágio" 
                                fullWidth 
                                variant="outlined" 
                                value={stageForm.name}
                                onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField 
                                label="Cor do Estágio" 
                                fullWidth 
                                variant="outlined" 
                                value={stageForm.color}
                                onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })}
                                InputProps={{
                                    startAdornment: (
                                        <div 
                                            style={{ 
                                                width: 24, 
                                                height: 24, 
                                                backgroundColor: stageForm.color || "#ccc", 
                                                borderRadius: "50%", 
                                                marginRight: 12,
                                                border: "1px solid #ddd"
                                            }} 
                                        />
                                    ),
                                    endAdornment: (
                                        <IconButton size="small" onClick={() => setColorPickerModalOpen(true)}>
                                            <PaletteIcon />
                                        </IconButton>
                                    )
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField 
                                label="Dias de SLA" 
                                type="number" 
                                fullWidth 
                                variant="outlined" 
                                value={stageForm.slaDays}
                                onChange={(e) => setStageForm({ ...stageForm, slaDays: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField 
                                label="Probabilidade (%)" 
                                type="number" 
                                fullWidth 
                                variant="outlined" 
                                value={stageForm.probability}
                                onChange={(e) => setStageForm({ ...stageForm, probability: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions style={{ padding: 16 }}>
                    <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
                    <Button color="primary" variant="contained" onClick={handleSaveStage}>Salvar</Button>
                </DialogActions>
            </Dialog>

            {colorPickerModalOpen && (
                <ColorPicker
                    open={colorPickerModalOpen}
                    handleClose={() => setColorPickerModalOpen(false)}
                    currentColor={stageForm.color}
                    onChange={(color) => {
                        setStageForm({ ...stageForm, color });
                    }}
                />
            )}

            <Dialog open={pipelineModalOpen} onClose={() => setPipelineModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{isEditingPipeline ? "Editar Nome do Funil" : "Novo Funil"}</DialogTitle>
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
                    <Button color="primary" variant="contained" onClick={handleSavePipeline}>Salvar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PipelineConfig;
