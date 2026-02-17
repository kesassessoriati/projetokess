import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import toastError from "../../errors/toastError";
import api from "../../services/api";

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
    loadingContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        width: "100%",
    },
}));

const EmbeddedLink = () => {
    const classes = useStyles();
    const { appId } = useParams();
    const [url, setUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApp = async () => {
            try {
                setLoading(true);
                // Assumindo que o ID na rota é o ID do banco de dados
                const { data } = await api.get(`/external-apps/${appId}`);
                setUrl(data.url);
            } catch (err) {
                toastError(err);
            } finally {
                setLoading(false);
            }
        };

        if (appId) {
            fetchApp();
        }
    }, [appId]);

    if (loading) {
        return (
            <div className={classes.root}>
                <div className={classes.loadingContainer}>Carregando...</div>
            </div>
        );
    }

    if (!url) {
        return (
            <div className={classes.root}>
                <div className={classes.iframeContainer} style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <h3>Aplicativo não encontrado ou URL inválida.</h3>
                </div>
            </div>
        );
    }

    return (
        <div className={classes.root}>
            <div className={classes.iframeContainer}>
                <iframe
                    src={url}
                    className={classes.iframe}
                    title="Embedded Link"
                    allow="camera; microphone; fullscreen; display-capture; autoplay; encrypted-media; geolocation"
                    sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-downloads"
                />
            </div>
        </div>
    );
};

export default EmbeddedLink;
