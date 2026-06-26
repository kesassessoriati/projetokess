import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Chip,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import DeleteIcon from "@material-ui/icons/Delete";
import LockIcon from "@material-ui/icons/Lock";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";

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
  panel: {
    borderRadius: 8,
    padding: theme.spacing(2),
    border: "1px solid #e5e7eb",
    boxShadow: "none",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "64px minmax(160px, 1fr) 132px 128px 40px",
    gap: theme.spacing(1),
    alignItems: "center",
    borderTop: "1px solid #eef2f7",
    padding: theme.spacing(1, 0),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  groupTitle: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    fontWeight: 800,
  },
  customForm: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  usageChip: {
    justifyContent: "flex-start",
    maxWidth: 128,
    fontWeight: 700,
  },
  usageBlocked: {
    borderColor: "#fecaca",
    color: "#991b1b",
    backgroundColor: "#fef2f2",
  },
  usageFree: {
    borderColor: "#bbf7d0",
    color: "#166534",
    backgroundColor: "#f0fdf4",
  },
  usageRequired: {
    borderColor: "#bfdbfe",
    color: "#1d4ed8",
    backgroundColor: "#eff6ff",
  },
}));

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Numero" },
  { value: "date", label: "Data" },
  { value: "email", label: "E-mail" },
  { value: "boolean", label: "Sim/Nao" },
];

const LeadFieldSettings = () => {
  const classes = useStyles();
  const [fields, setFields] = useState([]);
  const [fieldUsage, setFieldUsage] = useState({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState("text");
  const [fieldToDelete, setFieldToDelete] = useState(null);

  const loadFields = async () => {
    try {
      setLoading(true);
      const [{ data: fieldsData }, { data: usageData }] = await Promise.all([
        api.get("/crm/lead-field-settings"),
        api.get("/crm/lead-field-settings/usage"),
      ]);
      setFields(fieldsData?.fields || []);
      setFieldUsage(
        (usageData?.fields || []).reduce((acc, field) => {
          acc[field.fieldKey || field.key] = field;
          return acc;
        }, {})
      );
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  const groupedFields = useMemo(
    () =>
      fields.reduce((acc, field) => {
        const group = field.group || (field.isCustom ? "Campos personalizados" : "CRM");
        acc[group] = acc[group] || [];
        acc[group].push(field);
        return acc;
      }, {}),
    [fields]
  );

  const updateField = (fieldKey, updates) => {
    const usage = fieldUsage[fieldKey];
    if (updates.visible === false && usage && usage.canDisable === false) {
      const message = usage.required
        ? "Campo obrigatorio do sistema."
        : `Este campo possui dados preenchidos em ${usage.usageCount} lead(s) e nao pode ser desativado.`;
      toast.warn(message);
      return;
    }

    setFields((prev) =>
      prev.map((field) => (field.fieldKey === fieldKey ? { ...field, ...updates } : field))
    );
  };

  const handleSave = async () => {
    try {
      const normalizedFields = fields.map((field) => {
        const usage = fieldUsage[field.fieldKey];
        if (field.required || usage?.canDisable === false) {
          return { ...field, visible: true };
        }
        return field;
      });

      await api.put("/crm/lead-field-settings", { fields: normalizedFields });
      toast.success("Configuracao dos campos salva.");
      loadFields();
    } catch (err) {
      if (err.response?.data?.error === "ERR_LEAD_FIELD_IN_USE") {
        const blockedFields = err.response?.data?.fields || [];
        const labels = blockedFields.map((field) => `${field.label} (${field.usageCount})`).join(", ");
        toast.error(
          labels
            ? `Alguns campos possuem dados preenchidos e nao podem ser desativados: ${labels}.`
            : "Alguns campos possuem dados preenchidos e nao podem ser desativados."
        );
        return;
      }
      toastError(err);
    }
  };

  const handleCreateCustom = async () => {
    try {
      await api.post("/crm/lead-field-settings/custom-fields", {
        label: customLabel,
        fieldType: customType,
      });
      setCustomLabel("");
      setCustomType("text");
      toast.success("Campo personalizado criado.");
      loadFields();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDeleteCustom = async () => {
    if (!fieldToDelete?.id) return;

    try {
      setDeleting(true);
      await api.delete(`/crm/lead-field-settings/custom-fields/${fieldToDelete.id}`);
      toast.success("Campo personalizado excluido.");
      setFieldToDelete(null);
      loadFields();
    } catch (err) {
      toastError(err);
    } finally {
      setDeleting(false);
    }
  };

  const getUsageMeta = (field) => fieldUsage[field.fieldKey] || {
    fieldKey: field.fieldKey,
    usageCount: 0,
    inUse: false,
    canDisable: !field.required,
    required: Boolean(field.required),
  };

  const getUsageChip = (field) => {
    const usage = getUsageMeta(field);

    if (field.required || usage.required) {
      return {
        label: "Obrigatorio",
        title: "Campo obrigatorio do sistema e nao pode ser desativado.",
        icon: <LockIcon fontSize="small" />,
        className: classes.usageRequired,
      };
    }

    if (usage.inUse) {
      return {
        label: `Em uso (${usage.usageCount})`,
        title: `Este campo possui dados preenchidos em ${usage.usageCount} lead(s) e nao pode ser desativado.`,
        icon: <LockIcon fontSize="small" />,
        className: classes.usageBlocked,
      };
    }

    return {
      label: "Livre",
      title: "Este campo nao possui dados preenchidos e pode ser desativado.",
      icon: <CheckCircleIcon fontSize="small" />,
      className: classes.usageFree,
    };
  };

  return (
    <Container maxWidth="lg" className={classes.root}>
      <Box className={classes.header}>
        <Typography className={classes.title}>Campos do card do lead</Typography>
        <Typography className={classes.subtitle}>
          Defina quais campos aparecem no card do lead e crie campos personalizados por empresa.
        </Typography>
      </Box>

      <Paper className={classes.panel}>
        <Box className={classes.customForm}>
          <TextField
            label="Novo campo personalizado"
            variant="outlined"
            size="small"
            value={customLabel}
            onChange={(event) => setCustomLabel(event.target.value)}
          />
          <FormControl variant="outlined" size="small" style={{ minWidth: 160 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={customType} onChange={(event) => setCustomType(event.target.value)} label="Tipo">
              {FIELD_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" color="primary" onClick={handleCreateCustom} disabled={!customLabel.trim()}>
            Criar campo
          </Button>
          <Box flexGrow={1} />
          <Button variant="contained" color="primary" onClick={handleSave} disabled={loading}>
            Salvar
          </Button>
        </Box>

        <Grid container spacing={2}>
          {Object.entries(groupedFields).map(([group, groupFields]) => (
            <Grid item xs={12} md={6} key={group}>
              <Typography className={classes.groupTitle}>{group}</Typography>
              {groupFields.map((field) => {
                const usage = getUsageMeta(field);
                const usageChip = getUsageChip(field);
                const protectedField = field.required || usage.canDisable === false;

                return (
                  <div className={classes.row} key={field.fieldKey}>
                    <Switch
                      color="primary"
                      checked={protectedField || field.visible !== false}
                      onChange={(event) => updateField(field.fieldKey, { visible: event.target.checked })}
                      disabled={protectedField}
                    />
                    <TextField
                      label="Nome exibido"
                      variant="outlined"
                      size="small"
                      value={field.label}
                      onChange={(event) => updateField(field.fieldKey, { label: event.target.value })}
                    />
                    <TextField
                      select
                      label="Tipo"
                      variant="outlined"
                      size="small"
                      value={field.fieldType}
                      onChange={(event) => updateField(field.fieldKey, { fieldType: event.target.value })}
                      disabled={!field.isCustom}
                    >
                      {[...FIELD_TYPES, { value: "select", label: "Selecao" }, { value: "tags", label: "Tags" }].map((type) => (
                        <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                      ))}
                    </TextField>
                    <Tooltip title={usageChip.title}>
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={usageChip.icon}
                        label={usageChip.label}
                        className={`${classes.usageChip} ${usageChip.className}`}
                      />
                    </Tooltip>
                    {field.isCustom ? (
                      <Tooltip title={usage.inUse ? "Campo personalizado em uso nao pode ser excluido" : "Excluir campo personalizado"}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => setFieldToDelete(field)}
                            disabled={deleting || usage.inUse}
                            style={{ color: "#b91c1c" }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : (
                      <Box />
                    )}
                  </div>
                );
              })}
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Dialog open={Boolean(fieldToDelete)} onClose={() => setFieldToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir campo personalizado</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este campo personalizado? Ele deixara de aparecer no card do lead e na importacao.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldToDelete(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteCustom} color="secondary" variant="contained" disabled={deleting}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LeadFieldSettings;
