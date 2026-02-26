import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    MenuItem,
    makeStyles,
    CircularProgress,
    TextField,
    Typography,
} from "@material-ui/core";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import AttachFileIcon from '@material-ui/icons/AttachFile';

const useStyles = makeStyles((theme) => ({
    dialogTitle: {
        fontWeight: 600,
    },
    formField: {
        marginBottom: theme.spacing(2),
    },
    dialogActions: {
        justifyContent: "space-between",
        padding: theme.spacing(2, 3),
    },
    uploadContainer: {
        border: "2px dashed #ccc",
        borderRadius: 8,
        padding: theme.spacing(3),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: theme.spacing(2),
        backgroundColor: "#fafafa",
    },
    fileName: {
        marginTop: theme.spacing(1),
        fontWeight: 600,
        color: theme.palette.primary.main,
    },
}));

const ImportLeadsModal = ({ open, onClose, defaultPipelineId, defaultStageId, onSuccess }) => {
    const classes = useStyles();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [file, setFile] = useState(null);

    const [users, setUsers] = useState([]);
    const [pipelines, setPipelines] = useState([]);
    const [stages, setStages] = useState([]);

    const [form, setForm] = useState({
        ownerUserId: "",
        pipelineId: defaultPipelineId || "",
        stageId: defaultStageId || "",
        source: "",
        autoTag: "",
    });

    useEffect(() => {
        if (!open) return;

        setForm({
            ownerUserId: "",
            pipelineId: defaultPipelineId || "",
            stageId: defaultStageId || "",
            source: "",
            autoTag: "",
        });
        setFile(null);

        const fetchData = async () => {
            setLoading(true);
            try {
                const [{ data: usersData }, { data: pipelinesData }] = await Promise.all([
                    api.get("/users/"),
                    api.get("/pipelines"),
                ]);
                setUsers(usersData.users || []);
                setPipelines(pipelinesData);
            } catch (err) {
                toastError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [open, defaultPipelineId, defaultStageId]);

    useEffect(() => {
        if (form.pipelineId && pipelines.length > 0) {
            const selectedPipeline = pipelines.find((p) => p.id === form.pipelineId);
            if (selectedPipeline && selectedPipeline.stages) {
                setStages(selectedPipeline.stages);
            } else {
                setStages([]);
            }
        } else {
            setStages([]);
        }
    }, [form.pipelineId, pipelines]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error("Por favor, selecione um arquivo.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            if (form.ownerUserId) formData.append("ownerUserId", form.ownerUserId);
            if (form.pipelineId) formData.append("pipelineId", form.pipelineId);
            if (form.stageId) formData.append("stageId", form.stageId);
            if (form.source) formData.append("source", form.source);
            if (form.autoTag) formData.append("autoTag", form.autoTag);

            const { data } = await api.post("/crm/leads/import", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            toast.success(`${data.imported} leads importados com sucesso!`);

            if (data.errors && data.errors.length > 0) {
                toast.warn(`${data.errors.length} erros encontrados. Consulte o log.`);
                console.warn("Erros na importação:", data.errors);
            }

            onClose();
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            toastError(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle className={classes.dialogTitle}>Importar Leads (CSV)</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Grid container justifyContent="center">
                        <CircularProgress size={24} />
                    </Grid>
                ) : (
                    <form onSubmit={handleSubmit} id="import-leads-form">
                        <div className={classes.uploadContainer}>
                            <input
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                style={{ display: "none" }}
                                id="raised-button-file"
                                type="file"
                                onChange={handleFileChange}
                            />
                            <label htmlFor="raised-button-file">
                                <Button
                                    variant="contained"
                                    color="default"
                                    component="span"
                                    startIcon={<AttachFileIcon />}
                                >
                                    Selecionar Arquivo
                                </Button>
                            </label>
                            {file && (
                                <Typography variant="body2" className={classes.fileName}>
                                    {file.name}
                                </Typography>
                            )}
                            <Typography variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
                                O arquivo deve conter colunas como 'name' e 'phone'.
                            </Typography>
                        </div>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    label="Atribuir a"
                                    name="ownerUserId"
                                    value={form.ownerUserId}
                                    onChange={handleChange}
                                    variant="outlined"
                                    fullWidth
                                    className={classes.formField}
                                >
                                    <MenuItem value="">Sem responsável</MenuItem>
                                    {users.map((user) => (
                                        <MenuItem key={user.id} value={user.id}>
                                            {user.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Origem (Source)"
                                    name="source"
                                    value={form.source}
                                    onChange={handleChange}
                                    variant="outlined"
                                    fullWidth
                                    placeholder="Ex: Facebook Ads, Indicações..."
                                    className={classes.formField}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    label="Funil de Vendas"
                                    name="pipelineId"
                                    value={form.pipelineId}
                                    onChange={handleChange}
                                    variant="outlined"
                                    fullWidth
                                    className={classes.formField}
                                >
                                    <MenuItem value="">Não vincular ao Funil</MenuItem>
                                    {pipelines.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    label="Estágio Inicial"
                                    name="stageId"
                                    value={form.stageId}
                                    onChange={handleChange}
                                    variant="outlined"
                                    fullWidth
                                    className={classes.formField}
                                    disabled={!form.pipelineId}
                                >
                                    <MenuItem value="">Selecione...</MenuItem>
                                    {stages.map((st) => (
                                        <MenuItem key={st.id} value={st.id}>
                                            {st.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Tag Automática"
                                    name="autoTag"
                                    value={form.autoTag}
                                    onChange={handleChange}
                                    variant="outlined"
                                    fullWidth
                                    placeholder="Ex: BLACK_FRIDAY_2024"
                                    className={classes.formField}
                                />
                            </Grid>
                        </Grid>
                    </form>
                )}
            </DialogContent>
            <DialogActions className={classes.dialogActions}>
                <Button onClick={onClose} disabled={submitting}>
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    color="primary"
                    variant="contained"
                    form="import-leads-form"
                    disabled={submitting || loading || !file}
                >
                    {submitting ? <CircularProgress size={20} color="inherit" /> : "Iniciar Importação"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ImportLeadsModal;
