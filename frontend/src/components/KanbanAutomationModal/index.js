import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexWrap: "wrap",
    },
    textField: {
        marginRight: theme.spacing(1),
        flex: 1,
    },
    btnWrapper: {
        position: "relative",
    },
    buttonProgress: {
        color: green[500],
        position: "absolute",
        top: "50%",
        left: "50%",
        marginTop: -12,
        marginLeft: -12,
    },
}));

const AutomationSchema = Yup.object().shape({
    nome_automacao: Yup.string()
        .min(2, "Muito curto!")
        .max(50, "Muito longo!")
        .required("Obrigatório"),
});

const KanbanAutomationModal = ({ open, onClose, automationId, automationName, onSave }) => {
    const classes = useStyles();

    const initialState = {
        nome_automacao: "",
    };

    const [automation, setAutomation] = useState(initialState);

    useEffect(() => {
        if (automationId) {
            setAutomation(prevState => {
                return { ...prevState, nome_automacao: automationName || "" };
            });
        } else {
            setAutomation(initialState);
        }
    }, [automationId, open]);

    const handleClose = () => {
        onClose();
        setAutomation(initialState);
    };

    const handleSaveAutomation = async (values) => {
        try {
            if (automationId) {
                await api.put(`/kanban-automations/${automationId}`, values);
                toast.success("Automação atualizada com sucesso");
            } else {
                await api.post("/kanban-automations", values);
                toast.success("Automação criada com sucesso");
            }
            onSave();
            handleClose();
        } catch (err) {
            toastError(err);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle id="form-dialog-title">
                {automationId ? "Editar Automação" : "Nova Automação do Kanban"}
            </DialogTitle>
            <Formik
                initialValues={automation}
                enableReinitialize={true}
                validationSchema={AutomationSchema}
                onSubmit={(values, actions) => {
                    setTimeout(() => {
                        handleSaveAutomation(values);
                        actions.setSubmitting(false);
                    }, 400);
                }}
            >
                {({ touched, errors, isSubmitting }) => (
                    <Form>
                        <DialogContent dividers>
                            <div className={classes.root}>
                                <Field
                                    as={TextField}
                                    label="Nome da Automação"
                                    autoFocus
                                    name="nome_automacao"
                                    error={touched.nome_automacao && Boolean(errors.nome_automacao)}
                                    helperText={touched.nome_automacao && errors.nome_automacao}
                                    variant="outlined"
                                    margin="dense"
                                    fullWidth
                                />
                            </div>
                        </DialogContent>
                        <DialogActions>
                            <Button
                                onClick={handleClose}
                                color="secondary"
                                disabled={isSubmitting}
                                variant="outlined"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                color="primary"
                                disabled={isSubmitting}
                                variant="contained"
                                className={classes.btnWrapper}
                            >
                                {automationId ? "Editar" : "Adicionar"}
                                {isSubmitting && (
                                    <CircularProgress
                                        size={24}
                                        className={classes.buttonProgress}
                                    />
                                )}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
};

export default KanbanAutomationModal;
