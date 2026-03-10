import React from "react";
import { makeStyles } from "@material-ui/core/styles";

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

    return (
        <div className={classes.root}>
            <div className={classes.iframeContainer}>
                <iframe
                    src="/modules/gestor-financas-ia/index.html"
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
