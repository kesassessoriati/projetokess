import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    MenuItem,
    makeStyles,
    CircularProgress,
    TextField,
    Typography,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Select,
} from "@material-ui/core";
import { toast } from "react-toastify";
import { read, utils, writeFile } from "xlsx";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import AttachFileIcon from '@material-ui/icons/AttachFile';
import GetAppIcon from '@material-ui/icons/GetApp';
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { useDropzone } from "react-dropzone";
import uploadGif from "../../assets/upload.gif";

const useStyles = makeStyles((theme) => ({
    dialogTitle: {
        fontWeight: 600,
    },
    formField: {
        marginBottom: theme.spacing(2),
    },
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
        "&:hover": {
            backgroundColor: "#f0f0f0"
        }
    },
    fileName: {
        marginTop: theme.spacing(1),
        fontWeight: 600,
        color: theme.palette.primary.main,
    },
    tableContainer: {
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(2),
        maxHeight: 400,
        overflowX: "auto",
        overflowY: "scroll",
        ...theme.scrollbarStyles,
        border: "1px solid #ccc",
        borderRadius: 4
    }
}));

const LEAD_FIELDS = [
    { id: "name", label: "Nome Contato", required: true },
    { id: "companyName", label: "Empresa", required: false },
    { id: "decisionMakerName", label: "Nome decisor", required: false },
    { id: "email", label: "E-mail", required: false },
    { id: "phone", label: "Telefone", required: false },
    { id: "decisionMakerPhone", label: "Telefone decisor", required: false },
    { id: "cnpj", label: "CNPJ", required: false },
    { id: "gmn", label: "GMN", required: false },
    { id: "website", label: "Site", required: false },
    { id: "instagram", label: "Instagram", required: false },
    { id: "linkedin", label: "Linkedin", required: false },
    { id: "position", label: "Cargo", required: false },
    { id: "source", label: "Origem", required: false },
    { id: "campaign", label: "Campanha/Tag", required: false },
    { id: "product", label: "Produto", required: false },
    { id: "paymentType", label: "Tipo de pagamento", required: false },
    { id: "purchaseType", label: "Tipo de compra", required: false },
    { id: "purchaseValue", label: "Valor da compra", required: false },
    { id: "acquisitionDate", label: "Data de aquisição", required: false },
    { id: "status", label: "Status", required: false },
    { id: "temperature", label: "Temperatura", required: false },
    { id: "birthDate", label: "Data de Nascimento", required: false },
    { id: "clientSince", label: "Cliente Desde", required: false },
    { id: "expirationDate", label: "Data de Vencimento", required: false },
    { id: "score", label: "Score", required: false },
    { id: "address", label: "Endereço", required: false },
    { id: "notes", label: "Observações", required: false },
    { id: "tags", label: "Tags", required: false }
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

const ImportLeadsModal = ({ open, onClose, defaultPipelineId, defaultStageId, onSuccess }) => {
    const classes = useStyles();
    const size = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [file, setFile] = useState(null);

    const [users, setUsers] = useState([]);
    const [pipelines, setPipelines] = useState([]);
    const [stages, setStages] = useState([]);

    const [form, setForm] = useState({
        ownerUserId: "",
        pipelineId: defaultPipelineId || "",
        stageId: defaultStageId || "",
        source: "",
        autoTag: "",
    });

    const [rows, setRows] = useState(null);
    const [columns, setColumns] = useState(null);
    const [columnValue, setColumnValue] = useState({});
    const [selectedFields, setSelectedFields] = useState({});
    const [selectedRows, setSelectedRows] = useState({});

    useEffect(() => {
        if (!open) return;

        setForm({
            ownerUserId: "",
            pipelineId: defaultPipelineId || "",
            stageId: defaultStageId || "",
            source: "",
            autoTag: "",
        });
        setFile(null);
        setRows(null);
        setColumns(null);
        setColumnValue({});
        setSelectedFields({});
        setSelectedRows({});

        const fetchData = async () => {
            setLoading(true);
            try {
                const [{ data: usersData }, { data: pipelinesData }] = await Promise.all([
                    api.get("/users/"),
                    api.get("/pipelines"),
                ]);
                setUsers(usersData.users || []);
                setPipelines(pipelinesData || []);
            } catch (err) {
                toastError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [open, defaultPipelineId, defaultStageId]);

    useEffect(() => {
        if (form.pipelineId && pipelines.length > 0) {
            const selectedPipeline = pipelines.find((p) => p.id === form.pipelineId);
            if (selectedPipeline && selectedPipeline.stages) {
                setStages(selectedPipeline.stages);
            } else {
                setStages([]);
            }
        } else {
            setStages([]);
        }
    }, [form.pipelineId, pipelines]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = (event) => {
        const newValue = event.target.value;
        const columnKey = event.target.name;

        if (columnValue[columnKey]) {
            const oldValue = columnValue[columnKey];
            setSelectedFields((prevSelectedFields) => {
                const newSelectedFields = { ...prevSelectedFields };
                delete newSelectedFields[oldValue];
                return newSelectedFields;
            });
        }

        if (newValue === "") {
            setColumnValue((prevColumnValue) => {
                const newColumnValue = { ...prevColumnValue };
                delete newColumnValue[columnKey];
                return newColumnValue;
            });
            return;
        }

        if (selectedFields[newValue]) {
            const matchedField = LEAD_FIELDS.find(f => f.id === newValue);
            toast.error(`O campo ${matchedField ? matchedField.label : ""} já foi mapeado para outra coluna.`);
            return;
        }

        setSelectedFields((prevSelectedFields) => ({ ...prevSelectedFields, [newValue]: columnKey }));
        setColumnValue((columnValue) => ({ ...columnValue, [columnKey]: newValue }));
    };

    const excelSerialToDate = (serial) => {
        const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
        if (isNaN(date.getTime())) return null;
        const d = String(date.getUTCDate()).padStart(2, "0");
        const m = String(date.getUTCMonth() + 1).padStart(2, "0");
        const y = date.getUTCFullYear();
        return `${d}/${m}/${y}`;
    };

    const formatCellValue = (value) => {
        if (value instanceof Date) {
            const d = String(value.getUTCDate()).padStart(2, "0");
            const m = String(value.getUTCMonth() + 1).padStart(2, "0");
            const y = value.getUTCFullYear();
            return `${d}/${m}/${y}`;
        }
        // Serial numérico do Excel como número (XLSX)
        if (typeof value === "number" && value > 25569 && value < 2958465) {
            return excelSerialToDate(value) ?? value;
        }
        // Serial numérico como string (CSV com célula numérica de data)
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed && !/[/\-a-zA-Z]/.test(trimmed)) {
                const num = Number(trimmed);
                if (!isNaN(num) && num > 25569 && num < 2958465) {
                    return excelSerialToDate(num) ?? value;
                }
            }
        }
        return value;
    };

    const applyWorksheetData = (ws) => {
        const { rows, columns } = WorksheetToDatagrid(ws);
        setRows(rows);
        setColumns(columns);

        const newColumnValue = {};
        const newSelectedFields = {};

        if (rows.length > 0) {
            const headers = rows[0];
            columns.forEach((col, idx) => {
                const headerStr = String(headers[idx] || "").toLowerCase().trim();
                const fieldMatch = LEAD_FIELDS.find(f =>
                    headerStr === f.id.toLowerCase() ||
                    headerStr === f.label.toLowerCase() ||
                    (f.id === "name" && headerStr === "nome") ||
                    (f.id === "phone" && (headerStr === "numero" || headerStr === "telefone" || headerStr === "número"))
                );
                if (fieldMatch && !newSelectedFields[fieldMatch.id]) {
                    newColumnValue[col.key] = fieldMatch.id;
                    newSelectedFields[fieldMatch.id] = col.key;
                }
            });
        }

        setColumnValue(newColumnValue);
        setSelectedFields(newSelectedFields);

        const newSelectedRows = {};
        for (let i = 1; i < rows.length; i++) {
            newSelectedRows[i] = true;
        }
        setSelectedRows(newSelectedRows);
    };

    const processFile = (fileObj) => {
        setFile(fileObj);
        const isCSV = fileObj.name.toLowerCase().endsWith(".csv");

        if (isCSV) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const wb = read(e.target.result, { type: "string", raw: true });
                    applyWorksheetData(wb.Sheets[wb.SheetNames[0]]);
                } catch (err) {
                    console.error(err);
                    toast.error("Erro ao ler o arquivo. Verifique se é um arquivo Excel/CSV válido.");
                }
            };
            reader.readAsText(fileObj, "UTF-8");
        } else {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const wb = read(e.target.result, { cellDates: true });
                    applyWorksheetData(wb.Sheets[wb.SheetNames[0]]);
                } catch (err) {
                    console.error(err);
                    toast.error("Erro ao ler o arquivo. Verifique se é um arquivo Excel/CSV válido.");
                }
            };
            reader.readAsArrayBuffer(fileObj);
        }
    };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                processFile(acceptedFiles[0]);
            }
        },
        maxFiles: 1,
        accept: {
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/csv': ['.csv'],
            'text/plain': ['.txt']
        },
    });

    const downloadTemplate = () => {
        const headers = LEAD_FIELDS.map(f => f.label);
        const ws = utils.aoa_to_sheet([headers]);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Modelo Leads");
        writeFile(wb, "modelo_importacao_leads.xlsx");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error("Por favor, selecione um arquivo.");
            return;
        }

        // Validate mapped fields
        let hasName = false;
        let hasPhone = false;
        Object.values(columnValue).forEach(val => {
            if (val === "name") hasName = true;
            if (val === "phone" || val === "email") hasPhone = true;
        });

        if (!hasName || !hasPhone) {
            toast.error("Você deve mapear as colunas de 'Nome Contato' e ('Telefone' ou 'E-mail') para realizar a importação.");
            return;
        }

        const selectedRowIndexes = Object.keys(selectedRows).filter(k => selectedRows[k] === true);
        if (selectedRowIndexes.length === 0) {
            toast.error("Nenhuma linha selecionada para importação.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            // Adiciona valores fixos
            if (form.ownerUserId) formData.append("ownerUserId", form.ownerUserId);
            if (form.pipelineId) formData.append("pipelineId", form.pipelineId);
            if (form.stageId) formData.append("stageId", form.stageId);
            if (form.source) formData.append("source", form.source);
            if (form.autoTag) formData.append("autoTag", form.autoTag);

            // Adiciona mapeamento (apenas usando isso enviaremos o mapping para o backend e a validação flexível fará efeito)
            formData.append("mapping", JSON.stringify(columnValue));
            formData.append("selectedRows", JSON.stringify(selectedRowIndexes));

            const { data } = await api.post("/crm/leads/import", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            toast.success(`${data.imported} leads importados com sucesso!`);

            if (data.errors && data.errors.length > 0) {
                toast.warn(`${data.errors.length} erros encontrados. Consulte o log.`);
                console.warn("Erros na importação:", data.errors);
            }

            onClose();
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            toastError(err);
        } finally {
            setSubmitting(false);
        }
    };

    const renderXls = () => {
        return (
            <TableContainer className={classes.tableContainer}>
                <Table stickyHeader size="small">
                    <TableHead key={columns.length}>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <input
                                    type="checkbox"
                                    checked={Object.keys(selectedRows).length > 0 && Object.keys(selectedRows).length === rows.length - 1}
                                    onChange={(event) => {
                                        const isChecked = event.target.checked;
                                        const newSelectedRows = {};
                                        if (isChecked) {
                                            for (let i = 1; i < rows.length; i++) {
                                                newSelectedRows[i] = true;
                                            }
                                        }
                                        setSelectedRows(newSelectedRows);
                                    }}
                                />
                            </TableCell>
                            {columns.map((column) => (
                                <TableCell key={column.key}>{column.name}</TableCell>
                            ))}
                        </TableRow>
                        <TableRow>
                            <TableCell></TableCell>
                            {columns.map((column) => (
                                <TableCell key={column.key}>
                                    <Select
                                        value={columnValue[column.key] || ""}
                                        name={column.key}
                                        onChange={handleSelectChange}
                                        displayEmpty
                                        inputProps={{ 'aria-label': 'Without label' }}
                                        style={{ minWidth: 120 }}
                                    >
                                        <MenuItem value="">Não importar</MenuItem>
                                        {LEAD_FIELDS.map((field) => (
                                            <MenuItem key={field.id} value={field.id}>{field.label}</MenuItem>
                                        ))}
                                    </Select>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, rowIndex) => {
                            if (rowIndex === 0) return null; // Pular cabeçalho
                            return (
                                <TableRow key={rowIndex}>
                                    <TableCell padding="checkbox">
                                        <input
                                            type="checkbox"
                                            checked={!!selectedRows[rowIndex]}
                                            onChange={() => {
                                                setSelectedRows((prevSelectedRows) => ({
                                                    ...prevSelectedRows,
                                                    [rowIndex]: !prevSelectedRows[rowIndex],
                                                }));
                                            }}
                                        />
                                    </TableCell>
                                    {columns.map((column, columnIndex) => (
                                        <TableCell key={columnIndex}>{formatCellValue(row[columnIndex])}</TableCell>
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
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle className={classes.dialogTitle}>Importar Leads (CSV/XLSX)</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Grid container justifyContent="center">
                        <CircularProgress size={24} />
                    </Grid>
                ) : (
                    <form onSubmit={handleSubmit} id="import-leads-form">

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
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
                                <Typography variant="h6">Clique ou arraste um arquivo para importar (.csv, .xlsx)</Typography>
                                <Typography variant="caption" color="error" style={{ fontWeight: 'bold' }}>
                                    O arquivo deve conter colunas de Nome e Telefone ou Email.
                                </Typography>
                            </div>
                        ) : (
                            <>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold' }}>
                                    Mapeamento de Colunas ({(file && file.name) || ""})
                                </Typography>
                                <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }}>
                                    Atribua o campo correto para cada coluna da planilha abaixo.
                                </Typography>

                                {renderXls()}

                                <Button
                                    variant="text"
                                    color="secondary"
                                    onClick={() => { setRows(null); setColumns(null); setFile(null); setColumnValue({}); setSelectedFields({}); setSelectedRows({}); }}
                                    style={{ marginBottom: 16 }}
                                >
                                    Trocar Arquivo
                                </Button>
                            </>
                        )}

                        <Typography variant="subtitle1" style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>
                            Opções Globais de Importação
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    select
                                    label="Atribuir todos a"
                                    name="ownerUserId"
                                    value={form.ownerUserId}
                                    onChange={handleChange}
                                    variant="outlined"
                                    fullWidth
                                    className={classes.formField}
                                >
                                    <MenuItem value="">Sem responsável</MenuItem>
                                    {users.map((user) => (
                                        <MenuItem key={user.id} value={user.id}>
                                            {user.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12} sm={3}>
                                <TextField
                                    label="Origem Padrão (Source)"
                                    name="source"
                                    value={form.source}
                                    onChange={handleChange}
                                    variant="outlined"
                                    fullWidth
                                    placeholder="Ex: Facebook Ads"
                                    className={classes.formField}
                                />
                            </Grid>

                            <Grid item xs={12} sm={3}>
                                <TextField
                                    select
                                    label="Funil de Vendas"
                                    name="pipelineId"
                                    value={form.pipelineId}
                                    onChange={handleChange}
                                    variant="outlined"
                                    fullWidth
                                    className={classes.formField}
                                >
                                    <MenuItem value="">Não vincular</MenuItem>
                                    {pipelines.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12} sm={3}>
                                <TextField
                                    select
                                    label="Estágio Inicial"
                                    name="stageId"
                                    value={form.stageId}
                                    onChange={handleChange}
                                    variant="outlined"
                                    fullWidth
                                    className={classes.formField}
                                    disabled={!form.pipelineId}
                                >
                                    <MenuItem value="">Selecione...</MenuItem>
                                    {stages.map((st) => (
                                        <MenuItem key={st.id} value={st.id}>
                                            {st.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Tag Automática (Apenas texto em Notes)"
                                    name="autoTag"
                                    value={form.autoTag}
                                    onChange={handleChange}
                                    variant="outlined"
                                    fullWidth
                                    placeholder="Ex: LOTE_FEVEREIRO_2024"
                                    className={classes.formField}
                                    helperText="Será adicionado como anotação no lead."
                                />
                            </Grid>
                        </Grid>
                    </form>
                )}
            </DialogContent>
            <DialogActions className={classes.dialogActions}>
                <Button onClick={onClose} disabled={submitting}>
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    color="primary"
                    variant="contained"
                    form="import-leads-form"
                    disabled={submitting || loading || !file}
                >
                    {submitting ? <CircularProgress size={20} color="inherit" /> : "Iniciar Importação"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ImportLeadsModal;
