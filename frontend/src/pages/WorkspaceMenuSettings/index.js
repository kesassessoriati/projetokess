import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  FormControlLabel,
  Grid,
  Paper,
  Switch,
  Tooltip,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import LockIcon from "@material-ui/icons/Lock";
import { toast } from "react-toastify";
import { WORKSPACE_MENU_OPTIONS, PROTECTED_MENU_KEYS } from "../../constants/workspaceMenuOptions";
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
    alignItems: "center",
    borderTop: "1px solid #eef2f7",
    padding: theme.spacing(0.75, 0),
  },
  actions: {
    display: "flex",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  protectedChip: {
    height: 20,
    fontSize: 10,
    fontWeight: 700,
    marginLeft: theme.spacing(0.5),
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    border: "1px solid #d1d5db",
  },
  protectedRow: {
    opacity: 0.75,
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
    // Menus obrigatorios nao podem ser desativados
    if (PROTECTED_MENU_KEYS.includes(key)) return;
    setDraft((prev) => ({
      ...prev,
      [key]: prev[key] === false,
    }));
  };

  const setAll = (visible) => {
    const next = {};
    WORKSPACE_MENU_OPTIONS.forEach((option) => {
      // Menus protegidos sempre permanecem ativos
      next[option.key] = PROTECTED_MENU_KEYS.includes(option.key) ? true : visible;
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
              {options.map((option) => {
                const isProtected = PROTECTED_MENU_KEYS.includes(option.key);
                return (
                  <div
                    className={`${classes.item} ${isProtected ? classes.protectedRow : ""}`}
                    key={option.key}
                  >
                    <Tooltip
                      title={
                        isProtected
                          ? "Este menu e obrigatorio para que administradores consigam gerenciar os menus da empresa."
                          : ""
                      }
                      placement="top"
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            color="primary"
                            checked={isProtected ? true : draft[option.key] !== false}
                            onChange={() => handleToggle(option.key)}
                            disabled={isProtected}
                          />
                        }
                        label={
                          <Box display="flex" alignItems="center">
                            {option.label}
                            {isProtected && (
                              <Chip
                                icon={<LockIcon style={{ fontSize: 10 }} />}
                                label="Obrigatorio"
                                size="small"
                                className={classes.protectedChip}
                              />
                            )}
                          </Box>
                        }
                      />
                    </Tooltip>
                  </div>
                );
              })}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default WorkspaceMenuSettings;
