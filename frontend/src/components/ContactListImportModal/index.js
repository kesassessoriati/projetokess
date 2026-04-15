import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { read, utils } from "xlsx";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Typography,
} from "@material-ui/core";
import { toast } from "react-toastify";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import CloseIcon from "@material-ui/icons/Close";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const FIELDS = [
  { id: "name", label: "Nome *" },
  { id: "number", label: "Número *" },
  { id: "email", label: "E-mail" },
];

const ContactListImportModal = ({ open, onClose, contactListId, onImportComplete }) => {
  const [rows, setRows] = useState(null);
  const [columns, setColumns] = useState(null);
  const [columnValue, setColumnValue] = useState({});
  const [selectedFields, setSelectedFields] = useState({});
  const [selectedRows, setSelectedRows] = useState({});
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);

  const reset = () => {
    setRows(null);
    setColumns(null);
    setColumnValue({});
    setSelectedFields({});
    setSelectedRows({});
    setSummary(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onDrop = (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = read(e.target.result);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = utils.sheet_to_json(ws, { header: 1, defval: "" });
        const range = utils.decode_range(ws["!ref"] || "A1");
        const cols = Array.from({ length: range.e.c + 1 }, (_, i) => ({
          key: String(i),
          name: utils.encode_col(i),
        }));
        setRows(rawRows);
        setColumns(cols);
        // Select all data rows by default (skip header row 0)
        const sel = {};
        for (let i = 1; i < rawRows.length; i++) sel[i] = true;
        setSelectedRows(sel);
      } catch (err) {
        toastError("Arquivo inválido ou corrompido");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt']
    },
  });

  const handleSelectChange = (e) => {
    const newVal = e.target.value;
    const colKey = e.target.name;

    // Remove old mapping for this column
    if (columnValue[colKey]) {
      const old = columnValue[colKey];
      setSelectedFields((prev) => {
        const n = { ...prev };
        delete n[old];
        return n;
      });
    }

    if (!newVal) {
      setColumnValue((prev) => {
        const n = { ...prev };
        delete n[colKey];
        return n;
      });
      return;
    }

    // Prevent duplicate field selection
    if (selectedFields[newVal]) {
      toastError(`O campo "${newVal}" já foi mapeado para outra coluna`);
      return;
    }

    setSelectedFields((prev) => ({ ...prev, [newVal]: colKey }));
    setColumnValue((prev) => ({ ...prev, [colKey]: newVal }));
  };

  const allDataSelected = rows ? Object.keys(selectedRows).filter((k) => selectedRows[k]).length === rows.length - 1 : false;

  const toggleAllRows = (e) => {
    if (e.target.checked) {
      const sel = {};
      for (let i = 1; i < rows.length; i++) sel[i] = true;
      setSelectedRows(sel);
    } else {
      setSelectedRows({});
    }
  };

  const processImport = async () => {
    const mappedFields = Object.values(columnValue);
    if (!mappedFields.includes("name")) {
      toastError("Mapeie ao menos o campo Nome"); return;
    }
    if (!mappedFields.includes("number")) {
      toastError("Mapeie ao menos o campo Número"); return;
    }

    const toImport = Object.keys(selectedRows).filter((k) => selectedRows[k]);
    if (!toImport.length) {
      toastError("Selecione ao menos um contato para importar"); return;
    }

    setUploading(true);
    let created = 0;
    let ignored = 0;

    for (const idxStr of toImport) {
      const idx = Number(idxStr);
      const row = rows[idx];
      const contact = {};
      columns.forEach((col) => {
        if (columnValue[col.key]) {
          contact[columnValue[col.key]] = String(row[Number(col.key)] || "").trim();
        }
      });

      if (!contact.name || !contact.number) { ignored++; continue; }

      try {
        await api.post("/contact-list-items", { ...contact, contactListId });
        created++;
      } catch {
        ignored++;
      }
    }

    setUploading(false);
    setSummary({ created, ignored });
    if (onImportComplete) onImportComplete();
    toast.success(`${created} contato(s) importado(s)${ignored > 0 ? `, ${ignored} ignorado(s)` : ""}`);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle
        disableTypography
        style={{
          backgroundColor: "#1e1e1e",
          borderBottom: "2px solid #00d4ff",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
        }}
      >
        <Typography variant="h6" style={{ fontWeight: 700, fontSize: "1rem" }}>
          Importar Contatos para a Lista
        </Typography>
        <IconButton onClick={handleClose} size="small" style={{ color: "#fff" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent style={{ padding: 16, minHeight: 260 }}>
        {/* Drop zone */}
        {!rows && (
          <Box
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? "#00d4ff" : "#ccc"}`,
              borderRadius: 10,
              padding: "40px 24px",
              textAlign: "center",
              backgroundColor: isDragActive ? "#f0f9ff" : "#fafafa",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon style={{ fontSize: 52, color: isDragActive ? "#00d4ff" : "#bbb", marginBottom: 8 }} />
            <Typography style={{ fontWeight: 600, color: "#555" }}>
              {isDragActive ? "Solte o arquivo aqui" : "Arraste ou clique para selecionar"}
            </Typography>
            <Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
              Formatos aceitos: XLS, XLSX, CSV, TXT
            </Typography>
          </Box>
        )}

        {/* Summary after import */}
        {rows && summary && (
          <Box style={{ textAlign: "center", padding: 32 }}>
            <CheckCircleIcon style={{ fontSize: 56, color: "#4caf50", marginBottom: 10 }} />
            <Typography variant="h6" gutterBottom>Importação concluída!</Typography>
            <Typography style={{ fontSize: "1.1rem", fontWeight: 700, color: "#4caf50" }}>
              {summary.created} contato(s) importado(s)
            </Typography>
            {summary.ignored > 0 && (
              <Typography color="textSecondary">{summary.ignored} ignorado(s) (campos obrigatórios faltando)</Typography>
            )}
          </Box>
        )}

        {/* Mapping table */}
        {rows && !summary && (
          <>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }}>
              Mapeie cada coluna para o campo correspondente. <strong>Nome</strong> e <strong>Número</strong> são obrigatórios.
            </Typography>
            <TableContainer style={{ maxHeight: 380, overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: 6 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell style={{ backgroundColor: "#f5f5f5", width: 40 }}>
                      <input
                        type="checkbox"
                        checked={allDataSelected}
                        onChange={toggleAllRows}
                        title="Selecionar todos"
                      />
                    </TableCell>
                    {columns.map((c) => (
                      <TableCell key={c.key} style={{ backgroundColor: "#f5f5f5", fontWeight: 700 }}>
                        {c.name}
                      </TableCell>
                    ))}
                  </TableRow>
                  {/* Field mapping row */}
                  <TableRow>
                    <TableCell style={{ backgroundColor: "#fafafa" }} />
                    {columns.map((c) => (
                      <TableCell key={c.key} style={{ backgroundColor: "#fafafa" }}>
                        <Select
                          value={columnValue[c.key] || ""}
                          name={c.key}
                          onChange={handleSelectChange}
                          displayEmpty
                          style={{ minWidth: 110, fontSize: 12 }}
                        >
                          <MenuItem value="">— ignorar —</MenuItem>
                          {FIELDS.map((f) => (
                            <MenuItem key={f.id} value={f.id}>
                              {f.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.slice(1).map((row, i) => (
                    <TableRow key={i + 1} hover selected={!!selectedRows[i + 1]}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={!!selectedRows[i + 1]}
                          onChange={() =>
                            setSelectedRows((prev) => ({ ...prev, [i + 1]: !prev[i + 1] }))
                          }
                        />
                      </TableCell>
                      {row.map((cell, ci) => (
                        <TableCell key={ci} style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="textSecondary" style={{ marginTop: 6, display: "block" }}>
              {Object.keys(selectedRows).filter((k) => selectedRows[k]).length} de {rows.length - 1} contatos selecionados
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions style={{ padding: "12px 16px", borderTop: "1px solid #eee" }}>
        {rows && !summary && (
          <>
            <Button
              onClick={() => { setRows(null); setColumns(null); setColumnValue({}); setSelectedFields({}); setSelectedRows({}); }}
              disabled={uploading}
              style={{ marginRight: "auto" }}
            >
              Trocar arquivo
            </Button>
            <Button onClick={handleClose} disabled={uploading}>
              Cancelar
            </Button>
            <Button
              onClick={processImport}
              variant="contained"
              color="primary"
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={16} /> : null}
            >
              {uploading ? "Importando..." : "Importar"}
            </Button>
          </>
        )}
        {(!rows || summary) && (
          <Button onClick={handleClose} variant={summary ? "contained" : "text"} color={summary ? "primary" : "default"}>
            {summary ? "Fechar" : "Cancelar"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ContactListImportModal;
