import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  FormControlLabel,
  Grid,
  Paper,
  Switch,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import { WORKSPACE_MENU_OPTIONS } from "../../constants/workspaceMenuOptions";
import { useWorkspacePreferences } from "../../context/WorkspacePreferencesContext";

const useStyles = makeStyles((theme) => ({
  root: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(6),
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
  },
  subtitle: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
  },
  group: {
    borderRadius: 8,
    padding: theme.spacing(2),
    border: "1px solid #e5e7eb",
    boxShadow: "none",
    height: "100%",
  },
  groupTitle: {
    fontWeight: 800,
    marginBottom: theme.spacing(1),
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid #eef2f7",
    padding: theme.spacing(0.75, 0),
  },
  actions: {
    display: "flex",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
}));

const WorkspaceMenuSettings = () => {
  const classes = useStyles();
  const { preferences, savePreferences } = useWorkspacePreferences();
  const [draft, setDraft] = useState(preferences);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  const groupedOptions = useMemo(
    () =>
      WORKSPACE_MENU_OPTIONS.reduce((acc, option) => {
        acc[option.group] = acc[option.group] || [];
        acc[option.group].push(option);
        return acc;
      }, {}),
    []
  );

  const handleToggle = (key) => {
    setDraft((prev) => ({
      ...prev,
      [key]: prev[key] === false,
    }));
  };

  const setAll = (visible) => {
    const next = {};
    WORKSPACE_MENU_OPTIONS.forEach((option) => {
      next[option.key] = visible;
    });
    setDraft(next);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await savePreferences(draft);
      toast.success("Preferencias de menu salvas.");
    } catch (err) {
      toast.error("Erro ao salvar preferencias de menu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="lg" className={classes.root}>
      <Box className={classes.header}>
        <Typography className={classes.title}>Personalizacao de menus</Typography>
        <Typography className={classes.subtitle}>
          Escolha quais menus e atalhos aparecem no seu ambiente de trabalho.
        </Typography>
      </Box>

      <Box className={classes.actions}>
        <Button variant="outlined" onClick={() => setAll(true)}>Ativar todos</Button>
        <Button variant="outlined" onClick={() => setAll(false)}>Desativar todos</Button>
        <Button color="primary" variant="contained" onClick={handleSave} disabled={saving}>
          Salvar
        </Button>
      </Box>

      <Grid container spacing={2}>
        {Object.entries(groupedOptions).map(([group, options]) => (
          <Grid item xs={12} md={4} key={group}>
            <Paper className={classes.group}>
              <Typography className={classes.groupTitle}>{group}</Typography>
              {options.map((option) => (
                <div className={classes.item} key={option.key}>
                  <FormControlLabel
                    control={
                      <Switch
                        color="primary"
                        checked={draft[option.key] !== false}
                        onChange={() => handleToggle(option.key)}
                      />
                    }
                    label={option.label}
                  />
                </div>
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default WorkspaceMenuSettings;
