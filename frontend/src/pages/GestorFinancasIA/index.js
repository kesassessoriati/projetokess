import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { usePlanPermissions } from "../../context/PlanPermissionsContext";
import ForbiddenPage from "../../components/ForbiddenPage";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: theme.spacing(1),
        [theme.breakpoints.down("sm")]: {
            padding: theme.spacing(0.5),
        },
    },
    iframeContainer: {
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: theme.shape.borderRadius,
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[1],
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
    },
    iframe: {
        border: "none",
        width: "100%",
        height: "100%",
        flexGrow: 1,
        display: "block",
    },
}));

const GestorFinancasIA = () => {
    const classes = useStyles();
    const { loading, gestor_financeiro_ia } = usePlanPermissions();

    if (loading) {
        return null;
    }

    if (!loading && !gestor_financeiro_ia) {
        return <ForbiddenPage />;
    }

    return (
        <div className={classes.root}>
            <div className={classes.iframeContainer}>
                <iframe
                    src="/modules/gestor-financas-ia/index.html?v=20260507-ai-global"
                    className={classes.iframe}
                    title="Gestor Financeiro IA"
                    allow="camera; microphone; fullscreen; display-capture; autoplay; encrypted-media; geolocation"
                    sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-downloads"
                />
            </div>
        </div>
    );
};

export default GestorFinancasIA;
