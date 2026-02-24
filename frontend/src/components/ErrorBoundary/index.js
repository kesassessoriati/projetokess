import React from "react";
import axios from "axios";
import {
    Box,
    Button,
    Container,
    Paper,
    Typography,
    makeStyles,
} from "@material-ui/core";
import RefreshIcon from "@material-ui/icons/Refresh";
import HomeIcon from "@material-ui/icons/Home";
import { getBackendUrl } from "../../config";

const useStyles = makeStyles((theme) => ({
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
    },
    paper: {
        padding: theme.spacing(6),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: 600,
        textAlign: "center",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
    },
    title: {
        marginBottom: theme.spacing(2),
        color: theme.palette.error.main,
        fontWeight: 700,
    },
    message: {
        marginBottom: theme.spacing(4),
        color: theme.palette.text.secondary,
    },
    actions: {
        display: "flex",
        gap: theme.spacing(2),
    },
    button: {
        borderRadius: 8,
        textTransform: "none",
        padding: "8px 24px",
    },
}));

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("[ErrorBoundary] Erro capturado:", error, errorInfo);
        this.reportError(error, errorInfo);
    }

    reportError = async (error, errorInfo) => {
        try {
            const userId = localStorage.getItem("userId");
            const companyId = localStorage.getItem("companyId");

            const payload = {
                message: error.message || "Unknown error",
                stack: error.stack,
                componentStack: errorInfo ? errorInfo.componentStack : null,
                url: window.location.href,
                userId: userId ? parseInt(userId) : null,
                companyId: companyId ? parseInt(companyId) : null,
                userAgent: navigator.userAgent
            };

            const backendUrl = getBackendUrl();
            if (backendUrl) {
                await axios.post(`${backendUrl}/frontend-errors`, payload).catch(() => {
                    // Silencie erros no envio para evitar loops
                });
            }
        } catch (e) {
            console.error("[ErrorBoundary] Falha ao reportar erro:", e);
        }
    }

    handleReset = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            return <ErrorFallback onReset={this.handleReset} onGoHome={this.handleGoHome} />;
        }

        return this.props.children;
    }
}

const ErrorFallback = ({ onReset, onGoHome }) => {
    const classes = useStyles();

    return (
        <Container className={classes.container}>
            <Paper className={classes.paper}>
                <Typography variant="h4" className={classes.title}>
                    Ops! Algo deu errado.
                </Typography>
                <Typography variant="body1" className={classes.message}>
                    Ocorreu um erro inesperado na aplicação. Você pode tentar recarregar a página ou voltar para o início.
                </Typography>
                <Box className={classes.actions}>
                    <Button
                        variant="contained"
                        color="primary"
                        className={classes.button}
                        startIcon={<RefreshIcon />}
                        onClick={onReset}
                    >
                        Recarregar Página
                    </Button>
                    <Button
                        variant="outlined"
                        className={classes.button}
                        startIcon={<HomeIcon />}
                        onClick={onGoHome}
                    >
                        Ir para o Início
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default ErrorBoundary;
