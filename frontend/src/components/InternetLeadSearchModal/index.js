import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import SearchIcon from "@material-ui/icons/Search";
import CloudDownloadIcon from "@material-ui/icons/CloudDownload";
import BusinessIcon from "@material-ui/icons/Business";
import PhoneIcon from "@material-ui/icons/Phone";
import LanguageIcon from "@material-ui/icons/Language";
import CheckBoxOutlineBlankIcon from "@material-ui/icons/CheckBoxOutlineBlank";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    minWidth: 640,
    maxWidth: 800,
  },
  searchForm: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  resultsArea: {
    maxHeight: 360,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
  },
  leadCard: {
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: theme.spacing(1.5),
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing(1.5),
    cursor: "pointer",
    transition: "background 0.15s",
    "&:hover": { backgroundColor: "#f5f5f5" },
  },
  leadCardSelected: {
    borderColor: theme.palette.primary.main,
    backgroundColor: "#e8f4fd",
  },
  leadInfo: { flex: 1 },
  leadName: { fontWeight: 600, fontSize: "0.9rem" },
  leadDetail: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: "0.78rem",
    color: theme.palette.text.secondary,
    marginTop: 2,
  },
  chip: { margin: "2px" },
  importForm: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: "0.8rem",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  emptyState: {
    textAlign: "center",
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
}));

export default function InternetLeadSearchModal({
  open,
  onClose,
  pipelines = [],
  defaultPipelineId,
  onImported,
}) {
  const classes = useStyles();

  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Brasil");
  const [maxResults, setMaxResults] = useState(5);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [pipelineId, setPipelineId] = useState(defaultPipelineId || "");
  const [stageId, setStageId] = useState("");
  const [importing, setImporting] = useState(false);

  const stages =
    pipelines.find((p) => p.id === pipelineId)?.stages || [];

  useEffect(() => {
    if (defaultPipelineId) setPipelineId(defaultPipelineId);
  }, [defaultPipelineId]);

  useEffect(() => {
    setStageId("");
  }, [pipelineId]);

  const handleSearch = async () => {
    if (!niche.trim()) {
      toast.warning("Informe o nicho/segmento para buscar.");
      return;
    }
    setSearching(true);
    setResults([]);
    setSelected([]);
    try {
      const { data } = await api.post("/firecrawl/search", {
        niche,
        city,
        state,
        country,
        maxResults,
      });
      setResults(data.items || []);
      if (!data.items?.length) {
        toast.info("Nenhum resultado encontrado. Tente outro nicho ou cidade.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Erro ao buscar leads na internet."
      );
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (item) => {
    setSelected((prev) =>
      prev.find((s) => s.name === item.name)
        ? prev.filter((s) => s.name !== item.name)
        : [...prev, item]
    );
  };

  const selectAll = () =>
    setSelected(selected.length === results.length ? [] : [...results]);

  const handleImport = async () => {
    if (!selected.length) {
      toast.warning("Selecione ao menos um lead para importar.");
      return;
    }
    if (!pipelineId || !stageId) {
      toast.warning("Selecione o pipeline e o estágio de destino.");
      return;
    }
    setImporting(true);
    try {
      const { data } = await api.post("/firecrawl/import", {
        items: selected,
        pipelineId,
        stageId,
        niche,
      });
      toast.success(`${data.created} lead(s) importado(s) com sucesso!`);
      if (onImported) onImported();
      onClose();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Erro ao importar leads."
      );
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setResults([]);
    setSelected([]);
    setNiche("");
    setCity("");
    setState("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      classes={{ paper: classes.dialogPaper }}
      maxWidth="md"
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LanguageIcon color="primary" />
          <span>Buscar Leads na Internet</span>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Formulário de busca */}
        <Typography className={classes.sectionTitle}>Parâmetros de busca</Typography>
        <Box className={classes.searchForm}>
          <TextField
            className={classes.fullWidth}
            label="Nicho / Segmento *"
            placeholder="Ex: dentista, advocacia, academia, restaurante..."
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            variant="outlined"
            size="small"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <TextField
            label="Cidade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            variant="outlined"
            size="small"
          />
          <TextField
            label="Estado"
            value={state}
            onChange={(e) => setState(e.target.value)}
            variant="outlined"
            size="small"
          />
          <TextField
            label="País"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            variant="outlined"
            size="small"
          />
          <FormControl variant="outlined" size="small">
            <InputLabel>Máx. resultados</InputLabel>
            <Select
              value={maxResults}
              onChange={(e) => setMaxResults(e.target.value)}
              label="Máx. resultados"
            >
              {[3, 5, 10, 20].map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            startIcon={searching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? "Buscando..." : "Buscar"}
          </Button>
        </Box>

        {/* Resultados */}
        {results.length > 0 && (
          <>
            <Divider style={{ margin: "12px 0" }} />
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography className={classes.sectionTitle}>
                {results.length} resultado(s) encontrado(s)
              </Typography>
              <Button size="small" onClick={selectAll}>
                {selected.length === results.length ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
            </Box>

            <Box className={classes.resultsArea}>
              {results.map((item, idx) => {
                const isSelected = !!selected.find((s) => s.name === item.name);
                return (
                  <Box
                    key={idx}
                    className={`${classes.leadCard} ${isSelected ? classes.leadCardSelected : ""}`}
                    onClick={() => toggleSelect(item)}
                  >
                    <Checkbox
                      checked={isSelected}
                      color="primary"
                      size="small"
                      style={{ padding: 0, marginTop: 2 }}
                    />
                    <Box className={classes.leadInfo}>
                      <Typography className={classes.leadName}>{item.name}</Typography>
                      {item.phone && (
                        <Box className={classes.leadDetail}>
                          <PhoneIcon style={{ fontSize: 12 }} />
                          {item.phone}
                        </Box>
                      )}
                      {item.website && (
                        <Box className={classes.leadDetail}>
                          <LanguageIcon style={{ fontSize: 12 }} />
                          {item.website}
                        </Box>
                      )}
                      {item.address && (
                        <Box className={classes.leadDetail}>
                          <BusinessIcon style={{ fontSize: 12 }} />
                          {item.address}
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Destino de importação */}
            {selected.length > 0 && (
              <>
                <Divider style={{ margin: "16px 0 12px" }} />
                <Typography className={classes.sectionTitle}>
                  Destino — {selected.length} lead(s) selecionado(s)
                </Typography>
                <Box className={classes.importForm}>
                  <FormControl variant="outlined" size="small" required>
                    <InputLabel>Pipeline</InputLabel>
                    <Select
                      value={pipelineId}
                      onChange={(e) => setPipelineId(e.target.value)}
                      label="Pipeline"
                    >
                      {pipelines.map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl variant="outlined" size="small" required disabled={!pipelineId}>
                    <InputLabel>Estágio</InputLabel>
                    <Select
                      value={stageId}
                      onChange={(e) => setStageId(e.target.value)}
                      label="Estágio"
                    >
                      {stages.map((s) => (
                        <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </>
            )}
          </>
        )}

        {!searching && results.length === 0 && niche && (
          <Box className={classes.emptyState}>
            <LanguageIcon style={{ fontSize: 48, opacity: 0.3 }} />
            <Typography variant="body2">
              Clique em "Buscar" para encontrar leads na internet.
            </Typography>
          </Box>
        )}

        {!niche && results.length === 0 && (
          <Box className={classes.emptyState}>
            <SearchIcon style={{ fontSize: 48, opacity: 0.3 }} />
            <Typography variant="body2">
              Informe o nicho e clique em Buscar para encontrar empresas/contatos na internet.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />}
          onClick={handleImport}
          disabled={importing || !selected.length || !pipelineId || !stageId}
        >
          {importing ? "Importando..." : `Importar ${selected.length || ""} lead(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
