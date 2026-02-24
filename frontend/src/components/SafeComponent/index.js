import React from "react";
import {
    Box,
    CircularProgress,
    Typography,
    Button,
    makeStyles
} from "@material-ui/core";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import SearchIcon from "@material-ui/icons/Search";

const useStyles = makeStyles((theme) => ({
    center: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing(4),
        minHeight: 200,
        width: "100%",
        textAlign: "center",
    },
    icon: {
        fontSize: 48,
        marginBottom: theme.spacing(2),
        opacity: 0.5,
    },
    title: {
        fontWeight: 600,
        marginBottom: theme.spacing(1),
    },
}));

/**
 * SafeComponent - Wrapper para garantir consistência visual em estados de carregamento, erro ou ausência de dados.
 */
const SafeComponent = ({
    loading,
    error,
    data,
    renderData,
    onRetry,
    loadingComponent,
    emptyMessage = "Nenhum registro encontrado.",
    errorMessage = "Ocorreu um erro ao carregar os dados."
}) => {
    const classes = useStyles();

    if (loading) {
        return loadingComponent || (
            <Box className={classes.center}>
                <CircularProgress size={40} />
                <Box mt={2}>
                    <Typography variant="body2" color="textSecondary">
                        Carregando informações...
                    </Typography>
                </Box>
            </Box>
        );
    }

    if (error) {
        return (
            <Box className={classes.center}>
                <ErrorOutlineIcon className={classes.icon} color="error" />
                <Typography className={classes.title} variant="h6">
                    Ops!
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                    {errorMessage}
                </Typography>
                {onRetry && (
                    <Box mt={2}>
                        <Button variant="outlined" color="primary" onClick={onRetry}>
                            Tentar Novamente
                        </Button>
                    </Box>
                )}
            </Box>
        );
    }

    const isEmpty = !data || (Array.isArray(data) && data.length === 0);

    if (isEmpty) {
        return (
            <Box className={classes.center}>
                <SearchIcon className={classes.icon} />
                <Typography variant="body1" color="textSecondary">
                    {emptyMessage}
                </Typography>
            </Box>
        );
    }

    return <>{renderData(data)}</>;
};

export default SafeComponent;
