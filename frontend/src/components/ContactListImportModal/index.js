import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { read, utils, writeFile } from "xlsx";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Typography,
  CircularProgress,
  makeStyles,
  Box,
} from "@material-ui/core";
import { toast } from "react-toastify";
import GetAppIcon from "@material-ui/icons/GetApp";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import uploadGif from "../../assets/upload.gif";

const useStyles = makeStyles((theme) => ({
  dialogTitle: { fontWeight: 600 },
  dialogActions: {
    justifyContent: "space-between",
    padding: theme.spacing(2, 3),
  },
  uploadContainer: {
    border: "2px dashed #ccc",
    borderRadius: 8,
    padding: theme.spacing(3),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: theme.spacing(2),
    backgroundColor: "#fafafa",
    cursor: "pointer",
    transition: "all 0.3s ease",
    "&:hover": { backgroundColor: "#f0f0f0" },
  },
  tableContainer: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    maxHeight: 400,
    overflowX: "auto",
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    border: "1px solid #ccc",
    borderRadius: 4,
  },
}));

const FIELDS = [
  { id: "name", label: "Nome *" },
  { id: "number", label: "Número *" },
  { id: "email", label: "E-mail" },
];

function WorksheetToDatagrid(ws) {
  const rows = utils.sheet_to_json(ws, { header: 1, defval: "" });
  const range = utils.decode_range(ws["!ref"] || "A1");
  const columns = Array.from({ length: range.e.c + 1 }, (_, i) => ({
    key: String(i),
    name: utils.encode_col(i),
  }));
  return { rows, columns };
}

const ContactListImportModal = ({ open, onClose, contactListId, onImportComplete }) => {
  const classes = useStyles();

  // rows + columns em um único objeto para evitar renders intermediários inconsistentes
  const [tableData, setTableData] = useState({ rows: null, columns: null });
  const [columnValue, setColumnValue] = useState({});
  const [selectedFields, setSelectedFields] = useState({});
  const [selectedRows, setSelectedRows] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [file, setFile] = useState(null);

  const reset = () => {
    setTableData({ rows: null, columns: null });
    setColumnValue({});
    setSelectedFields({});
    setSelectedRows({});
    setSummary(null);
    setFile(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applyWorksheetData = (ws) => {
    const { rows, columns } = WorksheetToDatagrid(ws);

    const newColumnValue = {};
    const newSelectedFields = {};

    if (rows.length > 0) {
      const headers = rows[0];
      columns.forEach((col, idx) => {
        const headerStr = String(headers[idx] || "").toLowerCase().trim();
        const fieldMatch = FIELDS.find(
          (f) =>
            headerStr === f.id.toLowerCase() ||
            headerStr === f.label.replace(" *", "").toLowerCase() ||
            (f.id === "name" && headerStr === "nome") ||
            (f.id === "number" &&
              (headerStr === "numero" ||
                headerStr === "telefone" ||
                headerStr === "número" ||
                headerStr === "celular"))
        );
        if (fieldMatch && !newSelectedFields[fieldMatch.id]) {
          newColumnValue[col.key] = fieldMatch.id;
          newSelectedFields[fieldMatch.id] = col.key;
        }
      });
    }

    const sel = {};
    for (let i = 1; i < rows.length; i++) sel[i] = true;

    // Atualiza tudo de uma vez para evitar renders intermediários
    setTableData({ rows, columns });
    setColumnValue(newColumnValue);
    setSelectedFields(newSelectedFields);
    setSelectedRows(sel);
  };

  const processFile = (fileObj) => {
    setFile(fileObj);
    const isCSV =
      fileObj.name.toLowerCase().endsWith(".csv") ||
      fileObj.name.toLowerCase().endsWith(".txt");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let wb;
        if (isCSV) {
          wb = read(e.target.result, { type: "string", raw: true });
        } else {
          wb = read(e.target.result, { cellDates: true });
        }
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) throw new Error("Planilha não encontrada no arquivo.");
        applyWorksheetData(sheet);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao ler o arquivo. Verifique se é um arquivo Excel/CSV válido.");
      }
    };

    if (isCSV) {
      reader.readAsText(fileObj, "UTF-8");
    } else {
      reader.readAsArrayBuffer(fileObj);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) processFile(acceptedFiles[0]);
    },
    maxFiles: 1,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
      "text/plain": [".txt"],
    },
  });

  const downloadTemplate = () => {
    const headers = FIELDS.map((f) => f.label.replace(" *", ""));
    const ws = utils.aoa_to_sheet([headers]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Modelo Contatos");
    writeFile(wb, "modelo_importacao_contatos.xlsx");
  };

  const handleSelectChange = (event) => {
    const newValue = event.target.value;
    const columnKey = event.target.name;

    if (columnValue[columnKey]) {
      const oldValue = columnValue[columnKey];
      setSelectedFields((prev) => {
        const next = { ...prev };
        delete next[oldValue];
        return next;
      });
    }

    if (newValue === "") {
      setColumnValue((prev) => {
        const next = { ...prev };
        delete next[columnKey];
        return next;
      });
      return;
    }

    if (selectedFields[newValue]) {
      const matchedField = FIELDS.find((f) => f.id === newValue);
      toast.error(`O campo ${matchedField ? matchedField.label : ""} já foi mapeado para outra coluna.`);
      return;
    }

    setSelectedFields((prev) => ({ ...prev, [newValue]: columnKey }));
    setColumnValue((prev) => ({ ...prev, [columnKey]: newValue }));
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) {
      const d = String(value.getUTCDate()).padStart(2, "0");
      const m = String(value.getUTCMonth() + 1).padStart(2, "0");
      const y = value.getUTCFullYear();
      return `${d}/${m}/${y}`;
    }
    if (typeof value === "object") return String(value.v || value.f || JSON.stringify(value));
    return String(value);
  };

  const handleSubmit = async () => {
    const { rows, columns } = tableData;
    if (!rows || !columns) {
      toast.error("Selecione um arquivo primeiro.");
      return;
    }

    const mappedFields = Object.values(columnValue);
    if (!mappedFields.includes("name")) {
      toastError("Mapeie ao menos o campo Nome");
      return;
    }
    if (!mappedFields.includes("number") && !mappedFields.includes("email")) {
      toastError("Mapeie ao menos o campo Número ou E-mail");
      return;
    }

    const toImport = Object.keys(selectedRows).filter((k) => selectedRows[k]);
    if (!toImport.length) {
      toastError("Selecione ao menos um contato para importar");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contactListId", String(contactListId));
      formData.append("mapping", JSON.stringify(columnValue));
      formData.append("selectedRows", JSON.stringify(toImport));

      const { data } = await api.post("/contact-list-items/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSummary({ created: data.imported, ignored: data.total - data.imported, errors: data.errors });
      if (onImportComplete) onImportComplete();
      toast.success(`${data.imported} contato(s) importado(s)!`);
      if (data.errors && data.errors.length > 0) {
        toast.warn(`${data.errors.length} linha(s) ignorada(s).`);
      }
    } catch (err) {
      toastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const { rows, columns } = tableData;

  const renderXls = () => {
    if (!rows || !columns) return null;
    return (
      <TableContainer className={classes.tableContainer}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <input
                  type="checkbox"
                  checked={
                    Object.keys(selectedRows).length > 0 &&
                    Object.keys(selectedRows).filter((k) => selectedRows[k]).length === rows.length - 1
                  }
                  onChange={(e) => {
                    const newSel = {};
                    if (e.target.checked) {
                      for (let i = 1; i < rows.length; i++) newSel[i] = true;
                    }
                    setSelectedRows(newSel);
                  }}
                />
              </TableCell>
              {columns.map((col) => (
                <TableCell key={col.key}>{col.name}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell />
              {columns.map((col) => (
                <TableCell key={col.key}>
                  <Select
                    value={columnValue[col.key] || ""}
                    name={col.key}
                    onChange={handleSelectChange}
                    displayEmpty
                    inputProps={{ "aria-label": "Without label" }}
                    style={{ minWidth: 120 }}
                  >
                    <MenuItem value="">Não importar</MenuItem>
                    {FIELDS.map((field) => (
                      <MenuItem key={field.id} value={field.id}>
                        {field.label}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => {
              if (rowIndex === 0) return null;
              return (
                <TableRow key={rowIndex}>
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={!!selectedRows[rowIndex]}
                      onChange={() =>
                        setSelectedRows((prev) => ({ ...prev, [rowIndex]: !prev[rowIndex] }))
                      }
                    />
                  </TableCell>
                  {columns.map((col, colIndex) => (
                    <TableCell key={colIndex}>
                      {formatCellValue(row ? row[colIndex] : "")}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle className={classes.dialogTitle}>Importar Contatos para a Lista</DialogTitle>
      <DialogContent dividers>
        {submitting ? (
          <Grid container justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
            <Box textAlign="center">
              <CircularProgress size={48} style={{ marginBottom: 16 }} />
              <Typography variant="h6">Importando contatos, aguarde...</Typography>
            </Box>
          </Grid>
        ) : summary ? (
          <Box style={{ textAlign: "center", padding: 32 }}>
            <CheckCircleIcon style={{ fontSize: 56, color: "#4caf50", marginBottom: 10 }} />
            <Typography variant="h6" gutterBottom>
              Importação concluída!
            </Typography>
            <Typography style={{ fontSize: "1.1rem", fontWeight: 700, color: "#4caf50" }}>
              {summary.created} contato(s) importado(s)
            </Typography>
            {summary.ignored > 0 && (
              <Typography color="textSecondary">
                {summary.ignored} ignorado(s) (campos obrigatórios faltando ou duplicado)
              </Typography>
            )}
          </Box>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<GetAppIcon />}
                onClick={downloadTemplate}
              >
                Baixar Planilha Modelo
              </Button>
            </div>

            {!rows || !columns ? (
              <div {...getRootProps()} className={classes.uploadContainer}>
                <input {...getInputProps()} />
                <img src={uploadGif || ""} height={100} alt="Upload" style={{ marginBottom: 16 }} />
                <Typography variant="h6">
                  Clique ou arraste um arquivo para importar (.csv, .xlsx)
                </Typography>
                <Typography variant="caption" color="error" style={{ fontWeight: "bold" }}>
                  O arquivo deve conter colunas de Nome e Número.
                </Typography>
              </div>
            ) : (
              <>
                <Typography variant="subtitle1" style={{ fontWeight: "bold" }}>
                  Mapeamento de Colunas{file && file.name ? ` (${file.name})` : ""}
                </Typography>
                <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }}>
                  Atribua o campo correto para cada coluna da planilha abaixo.
                </Typography>

                {renderXls()}

                <Button
                  variant="text"
                  color="secondary"
                  onClick={() => {
                    setTableData({ rows: null, columns: null });
                    setColumnValue({});
                    setSelectedFields({});
                    setSelectedRows({});
                    setFile(null);
                  }}
                  style={{ marginBottom: 16 }}
                >
                  Trocar Arquivo
                </Button>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions className={classes.dialogActions}>
        {!summary ? (
          <>
            <Button onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>
            {rows && (
              <Button
                onClick={handleSubmit}
                color="primary"
                variant="contained"
                disabled={submitting}
              >
                {submitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Iniciar Importação"
                )}
              </Button>
            )}
          </>
        ) : (
          <Button onClick={handleClose} variant="contained" color="primary">
            Fechar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ContactListImportModal;
