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
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import DeleteIcon from "@material-ui/icons/Delete";
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
    gridTemplateColumns: "70px 1fr 150px 44px",
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
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState("text");
  const [fieldToDelete, setFieldToDelete] = useState(null);

  const loadFields = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/crm/lead-field-settings");
      setFields(data?.fields || []);
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
    setFields((prev) =>
      prev.map((field) => (field.fieldKey === fieldKey ? { ...field, ...updates } : field))
    );
  };

  const handleSave = async () => {
    try {
      await api.put("/crm/lead-field-settings", { fields });
      toast.success("Configuracao dos campos salva.");
      loadFields();
    } catch (err) {
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
              {groupFields.map((field) => (
                <div className={classes.row} key={field.fieldKey}>
                  <Switch
                    color="primary"
                    checked={field.visible !== false}
                    onChange={(event) => updateField(field.fieldKey, { visible: event.target.checked })}
                    disabled={field.required}
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
                  {field.isCustom ? (
                    <Tooltip title="Excluir campo personalizado">
                      <IconButton
                        size="small"
                        onClick={() => setFieldToDelete(field)}
                        disabled={deleting}
                        style={{ color: "#b91c1c" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Box />
                  )}
                </div>
              ))}
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
