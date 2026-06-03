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
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@material-ui/core";
import AddIcon from "@mui/icons-material/Add";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/Save";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { flowBuilderSelectMenuProps } from "../../utils/flowBuilderMenuProps";

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

const CONTACT_FIELDS = [
  { fieldKey: "name", label: "Nome do contato" },
  { fieldKey: "email", label: "E-mail do contato" },
  { fieldKey: "number", label: "Telefone do contato" },
  { fieldKey: "cpfCnpj", label: "CPF / CNPJ do contato" },
  { fieldKey: "address", label: "Endereco do contato" },
  { fieldKey: "info", label: "Observacoes do contato" },
];

const getStoredVariables = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem("variables") || "[]");
    return Array.isArray(parsed) ? parsed.map((item) => `{{${item}}}`) : [];
  } catch {
    return [];
  }
};

const FlowBuilderContactFieldsModal = ({ open, onSave, data, onUpdate, close }) => {
  const [activeModal, setActiveModal] = useState(false);
  const [rows, setRows] = useState([{ fieldKey: "", value: "" }]);
  const [leadFields, setLeadFields] = useState([]);

  const variables = useMemo(
    () => [...new Set([...GLOBAL_VARIABLES, ...getStoredVariables()])],
    [open]
  );

  const availableFields = useMemo(() => {
    const leadFieldOptions = leadFields
      .filter((field) => field.active !== false)
      .map((field) => ({
        fieldKey: field.isCustom ? `customFields.${field.fieldKey}` : field.fieldKey,
        label: field.isCustom ? `Lead personalizado: ${field.label}` : `Lead: ${field.label}`,
      }));

    return [...CONTACT_FIELDS, ...leadFieldOptions];
  }, [leadFields]);

  useEffect(() => {
    if (!open) {
      setActiveModal(false);
      return;
    }

    const load = async () => {
      try {
        const { data: fieldsData } = await api.get("/crm/lead-field-settings");
        setLeadFields(fieldsData?.fields || []);
        const current = data?.data?.data || data?.data || {};
        setRows(Array.isArray(current.fields) && current.fields.length ? current.fields : [{ fieldKey: "", value: "" }]);
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

  const updateRow = (index, key, value) => {
    setRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  };

  const handleSave = () => {
    const validRows = rows.filter((row) => row.fieldKey && String(row.value || "").trim());
    if (!validRows.length) {
      toast.error("Adicione pelo menos um campo com valor.");
      return;
    }

    const payload = { data: { fields: validRows } };

    if (open === "edit") {
      onUpdate({ ...data, data: payload.data });
    } else {
      onSave(payload);
    }

    handleClose();
  };

  return (
    <Dialog open={activeModal} onClose={handleClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle>{open === "edit" ? "Editar Atualizar Campo do Contato" : "Atualizar Campo do Contato"}</DialogTitle>
      <DialogContent dividers>
        {rows.map((row, index) => (
          <Grid container spacing={2} alignItems="center" key={`${index}-${row.fieldKey}`}>
            <Grid item xs={12} md={5}>
              <FormControl variant="outlined" size="small" fullWidth>
                <InputLabel>Campo</InputLabel>
                <Select
                  value={row.fieldKey}
                  onChange={(event) => updateRow(index, "fieldKey", event.target.value)}
                  label="Campo"
                  MenuProps={flowBuilderSelectMenuProps}
                >
                  <MenuItem value="" disabled>Selecione o campo</MenuItem>
                  {availableFields.map((field) => (
                    <MenuItem key={field.fieldKey} value={field.fieldKey}>{field.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField
                label="Valor"
                variant="outlined"
                size="small"
                fullWidth
                value={row.value}
                onChange={(event) => updateRow(index, "value", event.target.value)}
              />
              <Box mt={0.5}>
                <Select
                  value=""
                  displayEmpty
                  onChange={(event) => updateRow(index, "value", event.target.value)}
                  MenuProps={flowBuilderSelectMenuProps}
                >
                  <MenuItem value="" disabled>Inserir variavel</MenuItem>
                  {variables.map((variable) => (
                    <MenuItem key={variable} value={variable}>{variable}</MenuItem>
                  ))}
                </Select>
              </Box>
            </Grid>
            <Grid item xs={12} md={2}>
              <IconButton
                onClick={() => setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                disabled={rows.length === 1}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Grid>
          </Grid>
        ))}

        <Box mt={2}>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            color="primary"
            onClick={() => setRows((prev) => [...prev, { fieldKey: "", value: "" }])}
          >
            Adicionar campo
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} startIcon={<CancelIcon />} style={{ color: "white", backgroundColor: "#db6565" }}>
          Cancelar
        </Button>
        <Button onClick={handleSave} startIcon={<SaveIcon />} variant="contained" style={{ color: "white", backgroundColor: "#3b82f6" }}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlowBuilderContactFieldsModal;
