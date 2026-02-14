import React, { useEffect, useMemo, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  InputAdornment,
  CircularProgress,
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import PowerSettingsNewIcon from "@material-ui/icons/PowerSettingsNew";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import SearchIcon from "@material-ui/icons/Search";
import BuildIcon from "@material-ui/icons/Build";
import api, { openApi } from "../../services/api";
import { useSystemAlert } from "../../components/SystemAlert";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f5f5f5",
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    backgroundColor: "#f5f5f5",
    borderBottom: "1px solid #e0e0e0",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#e8eaf6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#3f51b5",
    },
  },
  headerTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  headerSubtitle: {
    fontSize: "0.875rem",
    color: "#666",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  searchField: {
    backgroundColor: "#fff",
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      "& fieldset": {
        borderColor: "#e0e0e0",
      },
      "&:hover fieldset": {
        borderColor: "#1976d2",
      },
    },
  },
  filterSelect: {
    minWidth: 150,
    backgroundColor: "#fff",
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
    },
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#333",
      transform: "scale(1.05)",
    },
  },
  content: {
    flex: 1,
    padding: "16px 24px",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    transition: "all 0.2s ease",
    "&:hover": {
      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    },
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#e8eaf6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#3f51b5",
    },
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  itemName: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  itemDetails: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: "0.8rem",
    color: "#666",
  },
  methodChip: {
    fontWeight: 600,
    fontSize: "0.7rem",
  },
  statusChip: {
    fontWeight: 500,
    fontSize: "0.75rem",
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    "&:hover": {
      backgroundColor: "#bbdefb",
    },
  },
  toggleButton: {
    backgroundColor: "#e8f5e9",
    color: "#4caf50",
    "&:hover": {
      backgroundColor: "#c8e6c9",
    },
  },
  toggleButtonOff: {
    backgroundColor: "#f5f5f5",
    color: "#9e9e9e",
    "&:hover": {
      backgroundColor: "#eeeeee",
    },
  },
  deleteButton: {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    "&:hover": {
      backgroundColor: "#ffcdd2",
    },
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    color: "#999",
    "& svg": {
      fontSize: 64,
      marginBottom: 16,
      opacity: 0.5,
    },
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "24px",
  },
  jsonField: {
    marginTop: theme.spacing(2),
  },
  testResult: {
    marginTop: theme.spacing(2),
    backgroundColor: "#f5f5f5",
    padding: theme.spacing(2),
    borderRadius: 8,
    maxHeight: 200,
    overflow: "auto",
    fontFamily: "monospace",
    fontSize: "0.75rem",
  },
}));

const METODOS = ["GET", "POST", "PUT", "DELETE"];

const normalizePlaceholderEntries = placeholders => {
  if (!placeholders) return [];

  const ensureKey = (key, fallback) => {
    if (typeof key === "string" && key.trim()) return key.trim();
    if (typeof key === "number" && !Number.isNaN(key)) return String(key);
    return fallback;
  };

  if (Array.isArray(placeholders)) {
    return placeholders
      .map((item, index) => {
        if (typeof item === "string") {
          const key = item.trim();
          return key ? { key, label: key } : null;
        }

        if (item && typeof item === "object") {
          const key = ensureKey(item.key || item.name || item.id, `placeholder_${index}`);
          if (!key) return null;
          const label =
            typeof item.label === "string" && item.label.trim()
              ? item.label.trim()
              : typeof item.description === "string" && item.description.trim()
              ? item.description.trim()
              : key;

          return { key, label };
        }

        return null;
      })
      .filter(Boolean);
  }

  if (typeof placeholders === "string") {
    const key = placeholders.trim();
    return key ? [{ key, label: key }] : [];
  }

  if (typeof placeholders === "object") {
    return Object.entries(placeholders)
      .map(([rawKey, value]) => {
        const key = ensureKey(rawKey, "");
        if (!key) return null;

        let label = key;
        if (typeof value === "string" && value.trim()) {
          label = value.trim();
        } else if (value && typeof value === "object") {
          label = value.label || value.description || key;
          if (typeof label === "string") {
            label = label.trim() || key;
          }
        }

        return { key, label };
      })
      .filter(Boolean);
  }

  return [];
};

const FerramentasPage = () => {
  const classes = useStyles();
  const { showConfirm } = useSystemAlert();

  const [ferramentas, setFerramentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [url, setUrl] = useState("");
  const [metodo, setMetodo] = useState("GET");
  const [headersText, setHeadersText] = useState("{}");
  const [bodyText, setBodyText] = useState("{}");
  const [queryParamsText, setQueryParamsText] = useState("{}");
  const [placeholdersText, setPlaceholdersText] = useState("{}");
  const [status, setStatus] = useState("ativo");
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [jsonErrors, setJsonErrors] = useState({ placeholders: "" });

  const resetForm = () => {
    setEditingId(null);
    setNome("");
    setDescricao("");
    setUrl("");
    setMetodo("GET");
    setHeadersText("{}");
    setBodyText("{}");
    setQueryParamsText("{}");
    setPlaceholdersText("{}");
    setStatus("ativo");
    setPlaceholderValues({});
    setJsonErrors({ placeholders: "" });
    setTestResult(null);
  };

  const loadFerramentas = async (statusValue = statusFilter) => {
    setLoading(true);
    try {
      const params = {};
      if (statusValue) params.status = statusValue;
      const { data } = await api.get("/ferramentas", { params });
      setFerramentas(data || []);
    } catch (err) {
      console.error("Erro ao carregar ferramentas", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFerramentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = ferramenta => {
    setEditingId(ferramenta.id);
    setNome(ferramenta.nome || "");
    setDescricao(ferramenta.descricao || "");
    setUrl(ferramenta.url || "");
    setMetodo(ferramenta.metodo || "GET");
    setHeadersText(JSON.stringify(ferramenta.headers || {}, null, 2));
    setBodyText(JSON.stringify(ferramenta.body || {}, null, 2));
    setQueryParamsText(JSON.stringify(ferramenta.query_params || {}, null, 2));
    setPlaceholdersText(JSON.stringify(ferramenta.placeholders || {}, null, 2));
    setStatus(ferramenta.status || "ativo");
    setPlaceholderValues({});
    setTestResult(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const parseJsonSafe = (text, fallback) => {
    if (!text || !text.trim()) return fallback;
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("JSON inválido:", err);
      return fallback;
    }
  };

  const handleSave = async event => {
    event.preventDefault();
    if (!nome || !url || !metodo) return;

    const payload = {
      nome,
      descricao,
      url,
      metodo,
      headers: parseJsonSafe(headersText, {}),
      body: parseJsonSafe(bodyText, {}),
      query_params: parseJsonSafe(queryParamsText, {}),
      placeholders: parseJsonSafe(placeholdersText, {}),
      status
    };

    try {
      if (editingId) {
        await api.put(`/ferramentas/${editingId}`, payload);
      } else {
        await api.post("/ferramentas", payload);
      }

      await loadFerramentas();
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Erro ao salvar ferramenta", err);
    }
  };

  const handleDelete = async id => {
    const confirmed = await showConfirm({
      type: "error",
      title: "Excluir Ferramenta",
      message: "Deseja realmente excluir esta ferramenta?",
      confirmText: "Sim, excluir",
      cancelText: "Cancelar",
    });
    if (!confirmed) return;

    try {
      await api.delete(`/ferramentas/${id}`);
      await loadFerramentas();
    } catch (err) {
      console.error("Erro ao excluir ferramenta", err);
    }
  };

  const handleToggleStatus = async ferramenta => {
    const novoStatus = ferramenta.status === "ativo" ? "inativo" : "ativo";
    try {
      await api.put(`/ferramentas/${ferramenta.id}`, { status: novoStatus });
      await loadFerramentas();
    } catch (err) {
      console.error("Erro ao alterar status da ferramenta", err);
    }
  };

  const currentPlaceholders = parseJsonSafe(placeholdersText, {});
  const placeholderEntries = useMemo(
    () => normalizePlaceholderEntries(currentPlaceholders),
    [currentPlaceholders]
  );

  const formatJsonText = text => {
    const trimmed = (text || "").trim();
    if (!trimmed) return "";
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  };

  const updateJsonError = (key, message) => {
    setJsonErrors(prev => ({ ...prev, [key]: message }));
  };

  const handlePlaceholdersChange = event => {
    const value = event.target.value;
    setPlaceholdersText(value);
    if (!value.trim()) {
      updateJsonError("placeholders", "");
      return;
    }
    try {
      JSON.parse(value);
      updateJsonError("placeholders", "");
    } catch (err) {
      updateJsonError("placeholders", "JSON inválido: verifique as chaves e aspas.");
    }
  };

  const handlePlaceholdersBlur = () => {
    if (!placeholdersText.trim()) return;
    try {
      setPlaceholdersText(formatJsonText(placeholdersText));
      updateJsonError("placeholders", "");
    } catch (err) {
      updateJsonError("placeholders", "JSON inválido: não foi possível formatar.");
    }
  };

  const handlePlaceholdersPaste = event => {
    const pasted = event.clipboardData?.getData("text");
    if (!pasted) return;
    event.preventDefault();
    try {
      const formatted = formatJsonText(pasted);
      setPlaceholdersText(formatted);
      updateJsonError("placeholders", "");
    } catch (err) {
      setPlaceholdersText(pasted);
      updateJsonError("placeholders", "Conteúdo colado não é um JSON válido.");
    }
  };

  const handlePlaceholderChange = (key, value) => {
    setPlaceholderValues(prev => ({ ...prev, [key]: value }));
  };

  const applyPlaceholders = (text, values) => {
    if (!text) return text;
    return Object.keys(values || {}).reduce((acc, key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      return acc.replace(regex, values[key] ?? "");
    }, text);
  };

  const handleTest = async () => {
    if (!url || !metodo) return;

    setTesting(true);
    setTestResult(null);

    try {
      const headers = parseJsonSafe(headersText, {});
      const body = parseJsonSafe(bodyText, {});
      const queryParams = parseJsonSafe(queryParamsText, {});

      const resolvedUrl = applyPlaceholders(url, placeholderValues);

      const config = {
        method: metodo,
        url: resolvedUrl,
        headers,
        params: queryParams,
        data: metodo === "GET" || metodo === "DELETE" ? undefined : body
      };

      // usando openApi (axios simples) para evitar interferir com o backend
      const response = await openApi(config);
      setTestResult({
        ok: true,
        status: response.status,
        data: response.data
      });
    } catch (err) {
      console.error("Erro ao testar API", err);
      const status = err.response?.status;
      const data = err.response?.data;
      setTestResult({ ok: false, status, data: data || String(err) });
    } finally {
      setTesting(false);
    }
  };

  const renderTestResult = () => {
    if (!testResult) return null;
    return (
      <div className={classes.testResult}>
        <Typography variant="subtitle2">
          Resultado do teste ({testResult.ok ? "sucesso" : "erro"}
          {testResult.status ? ` - HTTP ${testResult.status}` : ""})
        </Typography>
        <pre>{JSON.stringify(testResult.data, null, 2)}</pre>
      </div>
    );
  };

  const filteredFerramentas = ferramentas.filter((f) =>
    f.nome?.toLowerCase().includes(searchParam.toLowerCase())
  );

  const getMethodColor = (method) => {
    switch (method) {
      case "GET": return { bg: "#e3f2fd", color: "#1976d2" };
      case "POST": return { bg: "#e8f5e9", color: "#4caf50" };
      case "PUT": return { bg: "#fff3e0", color: "#ff9800" };
      case "DELETE": return { bg: "#ffebee", color: "#d32f2f" };
      default: return { bg: "#f5f5f5", color: "#666" };
    }
  };

  const getStatusChip = (status) => {
    if (status === "ativo") {
      return (
        <Chip
          label="Ativo"
          size="small"
          className={classes.statusChip}
          style={{ backgroundColor: "#e8f5e9", color: "#4caf50" }}
        />
      );
    }
    return (
      <Chip
        label="Inativo"
        size="small"
        className={classes.statusChip}
        style={{ backgroundColor: "#f5f5f5", color: "#9e9e9e" }}
      />
    );
  };

  return (
    <Box className={classes.root}>
      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <Box className={classes.headerIcon}>
            <BuildIcon />
          </Box>
          <Box>
            <Typography className={classes.headerTitle}>Ferramentas</Typography>
            <Typography className={classes.headerSubtitle}>
              {ferramentas.length} {ferramentas.length === 1 ? "API configurada" : "APIs configuradas"}
            </Typography>
          </Box>
        </Box>

        <Box className={classes.headerRight}>
          <FormControl variant="outlined" size="small" className={classes.filterSelect}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              onChange={async (e) => {
                const value = e.target.value;
                setStatusFilter(value);
                await loadFerramentas(value);
              }}
              label="Status"
            >
              <MenuItem value="">
                <em>Todos</em>
              </MenuItem>
              <MenuItem value="ativo">Ativo</MenuItem>
              <MenuItem value="inativo">Inativo</MenuItem>
            </Select>
          </FormControl>
          <TextField
            placeholder="Buscar ferramenta..."
            variant="outlined"
            size="small"
            value={searchParam}
            onChange={(e) => setSearchParam(e.target.value)}
            className={classes.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "#999" }} />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Nova API">
            <button className={classes.addButton} onClick={handleOpenCreate}>
              <AddIcon style={{ fontSize: 24 }} />
            </button>
          </Tooltip>
        </Box>
      </Box>

      {/* Content */}
      <Box className={classes.content}>
        {loading ? (
          <Box className={classes.loadingContainer}>
            <CircularProgress size={32} />
          </Box>
        ) : filteredFerramentas.length === 0 ? (
          <Box className={classes.emptyState}>
            <BuildIcon />
            <Typography>Nenhuma ferramenta encontrada</Typography>
          </Box>
        ) : (
          filteredFerramentas.map((f) => {
            const methodStyle = getMethodColor(f.metodo);
            return (
              <Box key={f.id} className={classes.listItem}>
                {/* Icon */}
                <Box className={classes.itemIcon}>
                  <BuildIcon />
                </Box>

                {/* Info */}
                <Box className={classes.itemInfo}>
                  <Typography className={classes.itemName}>{f.nome}</Typography>
                  <Box className={classes.itemDetails}>
                    <span>ID: {f.id}</span>
                    <span>•</span>
                    <Chip
                      label={f.metodo}
                      size="small"
                      className={classes.methodChip}
                      style={{ backgroundColor: methodStyle.bg, color: methodStyle.color }}
                    />
                    <span>•</span>
                    {getStatusChip(f.status)}
                  </Box>
                </Box>

                {/* Actions */}
                <Box className={classes.itemActions}>
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.editButton}`}
                      onClick={() => handleOpenEdit(f)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={f.status === "ativo" ? "Desativar" : "Ativar"}>
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${f.status === "ativo" ? classes.toggleButton : classes.toggleButtonOff}`}
                      onClick={() => handleToggleStatus(f)}
                    >
                      <PowerSettingsNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.deleteButton}`}
                      onClick={() => handleDelete(f.id)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingId ? "Editar ferramenta" : "Nova ferramenta"}
        </DialogTitle>
        <DialogContent>
          <form id="ferramenta-form" onSubmit={handleSave}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nome da ferramenta"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  variant="outlined"
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl variant="outlined" fullWidth>
                  <InputLabel id="metodo-label">Método</InputLabel>
                  <Select
                    labelId="metodo-label"
                    value={metodo}
                    onChange={e => setMetodo(e.target.value)}
                    label="Método"
                    required
                  >
                    {METODOS.map(m => (
                      <MenuItem key={m} value={m}>
                        {m}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Descrição"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={6}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="URL da API (pode conter {{placeholders}})"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  variant="outlined"
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Headers (JSON)"
                  value={headersText}
                  onChange={e => setHeadersText(e.target.value)}
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={4}
                  className={classes.jsonField}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Query Params (JSON)"
                  value={queryParamsText}
                  onChange={e => setQueryParamsText(e.target.value)}
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={4}
                  className={classes.jsonField}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Body (JSON)"
                  value={bodyText}
                  onChange={e => setBodyText(e.target.value)}
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={4}
                  className={classes.jsonField}
                  helperText="Usado para métodos POST e PUT"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Placeholders (JSON)"
                  value={placeholdersText}
                  onChange={handlePlaceholdersChange}
                  onBlur={handlePlaceholdersBlur}
                  onPaste={handlePlaceholdersPaste}
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={4}
                  className={classes.jsonField}
                  error={Boolean(jsonErrors.placeholders)}
                  helperText={
                    jsonErrors.placeholders || 'Ex.: { "cep": "Digite o CEP" }'
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl variant="outlined" fullWidth>
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select
                    labelId="status-label"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="ativo">Ativo</MenuItem>
                    <MenuItem value="inativo">Inativo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                {placeholderEntries.length > 0 && (
                  <>
                    <Typography variant="subtitle2">Valores para teste</Typography>
                    <Grid container spacing={1}>
                      {placeholderEntries.map(({ key, label }) => (
                        <Grid item xs={12} sm={6} key={key}>
                          <TextField
                            label={label || key}
                            value={placeholderValues[key] || ""}
                            onChange={e =>
                              handlePlaceholderChange(key, e.target.value)
                            }
                            variant="outlined"
                            fullWidth
                            size="small"
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </>
                )}
              </Grid>
            </Grid>
          </form>

          {renderTestResult()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Fechar</Button>
          <Button
            startIcon={<PlayArrowIcon />}
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? "Testando..." : "Testar API"}
          </Button>
          <Button
            color="primary"
            variant="contained"
            type="submit"
            form="ferramenta-form"
          >
            {editingId ? "Salvar alterações" : "Criar ferramenta"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FerramentasPage;