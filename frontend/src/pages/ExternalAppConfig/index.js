import React, { useState, useEffect, useReducer } from "react";
import { toast } from "react-toastify";
import {
    makeStyles,
    Paper,
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    IconButton,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from "@material-ui/core";
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
} from "@material-ui/icons";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import ConfirmationModal from "../../components/ConfirmationModal";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        padding: theme.spacing(2),
    },
    paper: {
        padding: theme.spacing(2),
        display: "flex",
        alignItems: "center",
        marginBottom: 12,
    },
}));

const ExternalAppConfig = () => {
    const classes = useStyles();
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [appToDelete, setAppToDelete] = useState(null);

    // Form State
    const [formData, setFormData] = useState({ name: "", url: "" });

    const fetchApps = async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/external-apps");
            setApps(data);
        } catch (err) {
            toastError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApps();
    }, []);

    const handleOpenModal = (app = null) => {
        if (app) {
            setSelectedApp(app);
            setFormData({ name: app.name, url: app.url });
        } else {
            setSelectedApp(null);
            setFormData({ name: "", url: "" });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedApp(null);
    };

    const handlSaveApp = async () => {
        try {
            if (selectedApp) {
                await api.put(`/external-apps/${selectedApp.id}`, formData);
                toast.success("App atualizado com sucesso!");
            } else {
                await api.post("/external-apps", formData);
                toast.success("App criado com sucesso!");
            }
            fetchApps();
            handleCloseModal();
        } catch (err) {
            toastError(err);
        }
    };

    const handleDeleteApp = async () => {
        try {
            await api.delete(`/external-apps/${appToDelete.id}`);
            toast.success("App removido com sucesso!");
            fetchApps();
        } catch (err) {
            toastError(err);
        } finally {
            setConfirmModalOpen(false);
            setAppToDelete(null);
        }
    };

    return (
        <MainContainer>
            <ConfirmationModal
                title={"Excluir App?"}
                open={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={handleDeleteApp}
            >
                Tem certeza que deseja excluir este aplicativo?
            </ConfirmationModal>

            <Dialog open={modalOpen} onClose={handleCloseModal}>
                <DialogTitle>{selectedApp ? "Editar App" : "Novo App"}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nome do App"
                        fullWidth
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="URL (Link)"
                        fullWidth
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal} color="secondary">
                        Cancelar
                    </Button>
                    <Button onClick={handlSaveApp} color="primary">
                        Salvar
                    </Button>
                </DialogActions>
            </Dialog>

            <MainHeader>
                <Title>Aplicativos Externos</Title>
                <MainHeaderButtonsWrapper>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleOpenModal()}
                    >
                        <AddIcon /> Adicionar App
                    </Button>
                </MainHeaderButtonsWrapper>
            </MainHeader>

            <Paper className={classes.root}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome</TableCell>
                            <TableCell>URL</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {apps.map((app) => (
                            <TableRow key={app.id}>
                                <TableCell>{app.name}</TableCell>
                                <TableCell>{app.url}</TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleOpenModal(app)}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            setAppToDelete(app);
                                            setConfirmModalOpen(true);
                                        }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </MainContainer>
    );
};

export default ExternalAppConfig;
