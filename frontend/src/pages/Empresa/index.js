import React, { useState } from "react";
import * as Yup from "yup";
import { useHistory } from "react-router-dom";
import { Formik, Form, Field } from "formik";
import {
    IconButton,
    InputAdornment,
    TextField,
    Button,
    Typography,
    Container,
    CssBaseline,
    Grid,
    Paper,
    Box,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@material-ui/core";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import SaveIcon from '@mui/icons-material/Save';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import moment from "moment";

const customStyle2 = {
    borderRadius: "5px",
    margin: 1,
    boxShadow: "none",
    backgroundColor: "#0f65ab",
    color: "white",
    fontSize: "12px",
};

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        padding: theme.spacing(3),
    },
    paperContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        maxWidth: "1200px",
    },
    paper: {
        padding: theme.spacing(4),
        borderRadius: theme.shape.borderRadius * 2,
        width: "100%",
        maxWidth: "500px",
    },
    formContainer: {
        width: "100%",
        padding: theme.spacing(2),
        backgroundColor: "#ffffff",
        borderRadius: theme.shape.borderRadius,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    form: {
        width: "100%",
    },
    textField: {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1),
        "& .MuiOutlinedInput-root": {
            height: "48px",
            backgroundColor: "#ffffff",
        },
    },
    submitButton: {
        width: "100%",
        marginTop: theme.spacing(2),
        backgroundColor: "#0f65ab",
        color: "#ffffff",
        "&:hover": {
            backgroundColor: "#0d47a1",
        },
        height: "48px",
        fontSize: "0.875rem",
    },
    modal: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        color: "#0f65ab",
    },
    title: {
        marginBottom: theme.spacing(3),
        color: "#0f65ab",
        fontWeight: "bold",
    },
    progressContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing(4),
        backgroundColor: '#ffffff',
        borderRadius: theme.shape.borderRadius,
    },
    progressText: {
        marginTop: theme.spacing(2),
        color: '#0f65ab',
        fontWeight: 'bold',
    },
}));

const UserSchema = Yup.object().shape({
    companyName: Yup.string()
        .min(2, "Nome muito curto!")
        .required("Nome da empresa é obrigatório"),
    email: Yup.string()
        .email("Email inválido")
        .required("Email é obrigatório"),
    password: Yup.string()
        .min(6, "Senha deve ter no mínimo 6 caracteres")
        .required("Senha é obrigatória"),
});

const SignUp = () => {
    const [showPassword, setShowPassword] = useState(false);
    const classes = useStyles();
    const history = useHistory();
    const [showProgress, setShowProgress] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    const dueDate = moment().add(7, "day").format();

    const initialState = {
        companyName: "",
        email: "",
        password: "",
    };

    const handleSignUp = async (values) => {
        setShowProgress(true);
        const payload = {
            name: values.companyName,
            email: values.email,
            password: values.password,
            recurrence: "MENSAL",
            dueDate,
            status: true,
            campaignsEnabled: true,
        };
        try {
            await api.post("/companies", payload);
            setShowProgress(false);
            setOpenModal(true);
        } catch (err) {
            setShowProgress(false);
            toastError(err);
        }
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        history.push("/login");
    };

    return (
        <div className={classes.root}>
            <Grid container className={classes.paperContainer}>
                <Paper className={classes.paper} elevation={3}>
                    <Container component="main" className={classes.formContainer}>
                        <CssBaseline />
                        <Typography component="h1" variant="h4" align="center" className={classes.title}>
                            Cadastro de Empresa
                        </Typography>

                        <Formik
                            initialValues={initialState}
                            enableReinitialize={true}
                            validationSchema={UserSchema}
                            onSubmit={(values, actions) => {
                                setTimeout(() => {
                                    handleSignUp(values);
                                    actions.setSubmitting(false);
                                }, 400);
                            }}
                        >
                            {({ touched, errors, isSubmitting }) => (
                                <Form className={classes.form}>
                                    <Field
                                        as={TextField}
                                        variant="outlined"
                                        fullWidth
                                        id="companyName"
                                        name="companyName"
                                        placeholder="Nome da Empresa"
                                        error={touched.companyName && Boolean(errors.companyName)}
                                        helperText={touched.companyName && errors.companyName}
                                        autoFocus
                                        className={classes.textField}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <BusinessIcon className={classes.icon} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    <Field
                                        as={TextField}
                                        variant="outlined"
                                        fullWidth
                                        id="email"
                                        name="email"
                                        placeholder="Email"
                                        error={touched.email && Boolean(errors.email)}
                                        helperText={touched.email && errors.email}
                                        autoComplete="email"
                                        className={classes.textField}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <EmailIcon className={classes.icon} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    <Field
                                        as={TextField}
                                        variant="outlined"
                                        fullWidth
                                        name="password"
                                        placeholder="Senha (mínimo 6 caracteres)"
                                        error={touched.password && Boolean(errors.password)}
                                        helperText={touched.password && errors.password}
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        autoComplete="current-password"
                                        className={classes.textField}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LockIcon className={classes.icon} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                                                        {showPassword ? <Visibility /> : <VisibilityOff />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    <Box mt={2}>
                                        <Button
                                            type="submit"
                                            fullWidth
                                            variant="contained"
                                            startIcon={<SaveIcon />}
                                            className={classes.submitButton}
                                            disabled={isSubmitting}
                                            style={customStyle2}
                                        >
                                            Cadastrar Empresa
                                        </Button>
                                    </Box>

                                    <Box mt={1} textAlign="center">
                                        <Button
                                            variant="text"
                                            size="small"
                                            style={{ color: "#0f65ab" }}
                                            onClick={() => history.push("/login")}
                                        >
                                            Já possui conta? Faça login
                                        </Button>
                                    </Box>
                                </Form>
                            )}
                        </Formik>
                    </Container>
                </Paper>
            </Grid>

            {/* Progress Modal */}
            <Dialog
                open={showProgress}
                aria-labelledby="progress-dialog-title"
                className={classes.modal}
            >
                <div className={classes.progressContainer}>
                    <CircularProgress size={60} thickness={5} style={{ color: '#0f65ab' }} />
                    <Typography variant="h6" className={classes.progressText}>
                        Realizando Cadastro...
                    </Typography>
                    <Typography variant="body1" style={{ color: '#0f65ab', marginTop: '10px' }}>
                        Por favor, aguarde.
                    </Typography>
                </div>
            </Dialog>

            {/* Success Modal */}
            <Dialog
                open={openModal}
                onClose={handleCloseModal}
                aria-labelledby="modal-title"
                className={classes.modal}
            >
                <DialogTitle id="modal-title" style={{ backgroundColor: "#0f65ab", color: "#ffffff" }}>
                    Cadastro Realizado com Sucesso!
                </DialogTitle>
                <DialogContent style={{ backgroundColor: "#ffffff" }}>
                    <Typography variant="h6" style={{ color: "#0f65ab" }}>
                        Parabéns! Sua empresa foi cadastrada.
                    </Typography>
                    <Typography variant="body1" style={{ color: "#0f65ab" }}>
                        Faça login para acessar a plataforma.
                    </Typography>
                </DialogContent>
                <DialogActions style={{ backgroundColor: "#ffffff" }}>
                    <Button onClick={handleCloseModal} style={{ color: "#0f65ab" }}>
                        Ir para Login
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default SignUp;
