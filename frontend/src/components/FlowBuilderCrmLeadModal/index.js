import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@material-ui/core";
import CancelIcon from "@mui/icons-material/Cancel";
import SaveIcon from "@mui/icons-material/Save";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { flowBuilderSelectMenuProps } from "../../utils/flowBuilderMenuProps";

const BASE_FIELDS = [
  { key: "name", label: "Nome do Contato", required: true },
  { key: "companyName", label: "Empresa" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone Celular" },
  { key: "document", label: "CPF / CNPJ" },
  { key: "source", label: "Origem" },
  { key: "campaign", label: "Campanha / Tag" },
  { key: "score", label: "Score", type: "number" },
  { key: "notes", label: "Observacoes", multiline: true },
];

const GLOBAL_VARIABLES = [
  "{{firstName}}",
  "{{name}}",
  "{{userName}}",
  "{{ms}}",
  "{{protocol}}",
  "{{date}}",
  "{{hour}}",
  "{{ticket_id}}",
  "{{contact_id}}",
  "{{lead_id}}",
  "{{status}}",
  "{{queue}}",
  "{{connection}}",
  "{{contact_phone}}",
  "{{contact_email}}",
  "{{lead_status}}",
  "{{lead_score}}",
  "{{lead_temperature}}",
  "{{lead_source}}",
  "{{lead_campaign}}",
  "{{responsavel}}",
  "{{funil_de_vendas}}",
  "{{estagio_funil}}",
  "{{tag}}",
  "{{kanban_stage}}",
  "{{produto}}",
];

const getStoredVariables = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem("variables") || "[]");
    return Array.isArray(parsed) ? parsed.map((item) => `{{${item}}}`) : [];
  } catch {
    return [];
  }
};

const FlowBuilderCrmLeadModal = ({ open, onSave, data, onUpdate, close }) => {
  const [activeModal, setActiveModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [fields, setFields] = useState({});
  const [customFields, setCustomFields] = useState({});
  const [users, setUsers] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [leadFields, setLeadFields] = useState([]);

  const variables = useMemo(
    () => [...new Set([...GLOBAL_VARIABLES, ...getStoredVariables()])],
    [open]
  );

  const selectedPipeline = fields.pipelineId || "";
  const stages = useMemo(() => {
    const pipeline = pipelines.find((item) => Number(item.id) === Number(selectedPipeline));
    return pipeline?.stages || [];
  }, [pipelines, selectedPipeline]);

  useEffect(() => {
    if (!open) {
      setActiveModal(false);
      return;
    }

    const load = async () => {
      try {
        const [usersResponse, pipelinesResponse, fieldsResponse] = await Promise.all([
          api.get("/users"),
          api.get("/pipelines"),
          api.get("/crm/lead-field-settings"),
        ]);

        setUsers(usersResponse.data?.users || usersResponse.data || []);
        setPipelines(pipelinesResponse.data || []);
        setLeadFields(fieldsResponse.data?.fields || []);

        const current = data?.data?.data || data?.data || {};
        setMode(current.mode || "create");
        setFields(current.fields || {});
        setCustomFields(current.customFields || {});
        setActiveModal(true);
      } catch (error) {
        toastError(error);
      }
    };

    load();
  }, [open, data]);

  const handleClose = () => {
    setActiveModal(false);
    close(null);
  };

  const setFieldValue = (key, value) => {
    setFields((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "pipelineId" ? { stageId: "" } : {}),
    }));
  };

  const handleSave = () => {
    if (!String(fields.name || "").trim() && mode === "create") {
      toast.error("Informe o nome do contato ou uma variavel para criar o lead.");
      return;
    }

    const payload = {
      data: {
        mode,
        fields,
        customFields,
      },
    };

    if (open === "edit") {
      onUpdate({ ...data, data: payload.data });
    } else {
      onSave(payload);
    }

    handleClose();
  };

  const customFieldSettings = leadFields.filter((field) => field.isCustom && field.active !== false);

  const renderVariableSelect = (onChange) => (
    <Select
      value=""
      displayEmpty
      onChange={(event) => onChange(event.target.value)}
      MenuProps={flowBuilderSelectMenuProps}
    >
      <MenuItem value="" disabled>Inserir variavel</MenuItem>
      {variables.map((variable) => (
        <MenuItem key={variable} value={variable}>{variable}</MenuItem>
      ))}
    </Select>
  );

  return (
    <Dialog open={activeModal} onClose={handleClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle>{open === "edit" ? "Editar Criar / Atualizar Lead" : "Criar / Atualizar Lead"}</DialogTitle>
      <DialogContent dividers>
        <Box mb={2}>
          <FormControl variant="outlined" fullWidth size="small">
            <InputLabel>Modo</InputLabel>
            <Select value={mode} onChange={(event) => setMode(event.target.value)} label="Modo">
              <MenuItem value="create">Criar novo Lead</MenuItem>
              <MenuItem value="update">Atualizar Lead existente</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={2}>
          {BASE_FIELDS.map((field) => (
            <Grid item xs={12} md={field.multiline ? 12 : 6} key={field.key}>
              <TextField
                label={`${field.label}${field.required ? " *" : ""}`}
                variant="outlined"
                size="small"
                fullWidth
                multiline={field.multiline}
                minRows={field.multiline ? 3 : undefined}
                type={field.type || "text"}
                value={fields[field.key] || ""}
                onChange={(event) => setFieldValue(field.key, event.target.value)}
              />
              <Box mt={0.5}>{renderVariableSelect((value) => setFieldValue(field.key, value))}</Box>
            </Grid>
          ))}

          <Grid item xs={12} md={6}>
            <FormControl variant="outlined" fullWidth size="small">
              <InputLabel>Temperatura</InputLabel>
              <Select value={fields.temperature || ""} onChange={(event) => setFieldValue("temperature", event.target.value)} label="Temperatura">
                <MenuItem value="">Nao alterar</MenuItem>
                <MenuItem value="frio">Frio</MenuItem>
                <MenuItem value="morno">Morno</MenuItem>
                <MenuItem value="quente">Quente</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl variant="outlined" fullWidth size="small">
              <InputLabel>Responsavel</InputLabel>
              <Select value={fields.ownerUserId || ""} onChange={(event) => setFieldValue("ownerUserId", event.target.value)} label="Responsavel" MenuProps={flowBuilderSelectMenuProps}>
                <MenuItem value="">Nao atribuir</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl variant="outlined" fullWidth size="small">
              <InputLabel>Funil de Vendas</InputLabel>
              <Select value={fields.pipelineId || ""} onChange={(event) => setFieldValue("pipelineId", event.target.value)} label="Funil de Vendas" MenuProps={flowBuilderSelectMenuProps}>
                <MenuItem value="">Usar padrao</MenuItem>
                {pipelines.map((pipeline) => (
                  <MenuItem key={pipeline.id} value={pipeline.id}>{pipeline.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl variant="outlined" fullWidth size="small" disabled={!selectedPipeline}>
              <InputLabel>Estagio do Funil</InputLabel>
              <Select value={fields.stageId || ""} onChange={(event) => setFieldValue("stageId", event.target.value)} label="Estagio do Funil" MenuProps={flowBuilderSelectMenuProps}>
                <MenuItem value="">Usar padrao</MenuItem>
                {stages.map((stage) => (
                  <MenuItem key={stage.id} value={stage.id}>{stage.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {customFieldSettings.length > 0 && (
          <Box mt={3}>
            <Typography variant="subtitle2">Campos personalizados</Typography>
            <Grid container spacing={2}>
              {customFieldSettings.map((field) => (
                <Grid item xs={12} md={6} key={field.fieldKey}>
                  <TextField
                    label={field.label}
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={customFields[field.fieldKey] || ""}
                    onChange={(event) => setCustomFields((prev) => ({ ...prev, [field.fieldKey]: event.target.value }))}
                  />
                  <Box mt={0.5}>
                    {renderVariableSelect((value) => setCustomFields((prev) => ({ ...prev, [field.fieldKey]: value })))}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} startIcon={<CancelIcon />} style={{ color: "white", backgroundColor: "#db6565" }}>
          Cancelar
        </Button>
        <Button onClick={handleSave} startIcon={<SaveIcon />} variant="contained" style={{ color: "white", backgroundColor: "#10b981" }}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlowBuilderCrmLeadModal;
