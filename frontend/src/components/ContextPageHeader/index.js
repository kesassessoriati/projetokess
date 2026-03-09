import React, { useMemo } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { Box, Button, Typography } from "@material-ui/core";
import { ArrowBack as ArrowBackIcon } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
    flexWrap: "wrap"
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    minWidth: 0
  },
  backButton: {
    textTransform: "none",
    fontWeight: 700,
    borderRadius: 10,
    borderColor: "#cbd5e1",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    "&:hover": {
      borderColor: "#94a3b8",
      backgroundColor: "#f8fafc"
    }
  },
  titleWrap: {
    minWidth: 0
  },
  title: {
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.2
  },
  subtitle: {
    color: "#64748b"
  },
  actions: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  }
}));

const ContextPageHeader = ({
  title,
  subtitle,
  fallbackTo = "/kanban",
  backLabel = "Voltar",
  actions,
  onBack
}) => {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();

  const fromRoute = useMemo(() => {
    if (location?.state?.from && typeof location.state.from === "string") {
      return location.state.from;
    }
    return null;
  }, [location]);

  const hasSameOriginReferrer = useMemo(() => {
    try {
      if (!document?.referrer) return false;
      return new URL(document.referrer).origin === window.location.origin;
    } catch (error) {
      return false;
    }
  }, []);

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    if (fromRoute && fromRoute !== location.pathname) {
      history.push(fromRoute);
      return;
    }

    if (history.length > 2 || hasSameOriginReferrer) {
      history.goBack();
      return;
    }

    history.push(fallbackTo);
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.left}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          className={classes.backButton}
          aria-label={backLabel}
        >
          {backLabel}
        </Button>

        <Box className={classes.titleWrap}>
          <Typography variant="h4" className={classes.title}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" className={classes.subtitle}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Box>

      {actions ? <Box className={classes.actions}>{actions}</Box> : null}
    </Box>
  );
};

export default ContextPageHeader;
