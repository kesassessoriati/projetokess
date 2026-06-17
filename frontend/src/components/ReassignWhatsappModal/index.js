import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  CircularProgress,
  Divider,
} from "@material-ui/core";
import WarningIcon from "@material-ui/icons/Warning";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const NULL_SOURCE = "__null__";

/**
 * Modal de migracao em massa de tickets presos em conexao desconectada/NULL
 * para uma conexao CONECTADA da mesma empresa.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - whatsApps: lista de conexoes (com id, name, status)
 *  - onReassigned: callback opcional apos execucao bem-sucedida
 */
const ReassignWhatsappModal = ({ open, onClose, whatsApps = [], onReassigned }) => {
  const [sourceWhatsappId, setSourceWhatsappId] = useState("");
  const [targetWhatsappId, setTargetWhatsappId] = useState("");
  const [includeOpen, setIncludeOpen] = useState(true);
  const [includePending, setIncludePending] = useState(true);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const connectedConnections = useMemo(
    () => whatsApps.filter((w) => w.status === "CONNECTED"),
    [whatsApps]
  );
  const disconnectedConnections = useMemo(
    () => whatsApps.filter((w) => w.status !== "CONNECTED"),
    [whatsApps]
  );

  const statusFilter = useMemo(() => {
    const arr = [];
    if (includeOpen) arr.push("open");
    if (includePending) arr.push("pending");
    return arr;
  }, [includeOpen, includePending]);

  const resetState = () => {
    setSourceWhatsappId("");
    setTargetWhatsappId("");
    setIncludeOpen(true);
    setIncludePending(true);
    setPreview(null);
    setConfirmChecked(false);
  };

  const handleClose = () => {
    if (executing) return;
    resetState();
    onClose();
  };

  const buildPayload = () => ({
    targetWhatsappId: Number(targetWhatsappId),
    sourceWhatsappId: sourceWhatsappId === NULL_SOURCE ? null : Number(sourceWhatsappId),
    status: statusFilter,
  });

  const validate = () => {
    if (!targetWhatsappId) {
      toast.warn("Selecione a conexão de destino (conectada).");
      return false;
    }
    if (!sourceWhatsappId) {
      toast.warn("Selecione a origem dos tickets.");
      return false;
    }
    if (!statusFilter.length) {
      toast.warn("Selecione ao menos um status (abertos ou aguardando).");
      return false;
    }
    return true;
  };

  const handlePreview = async () => {
    if (!validate()) return;
    setLoadingPreview(true);
    setPreview(null);
    setConfirmChecked(false);
    try {
      const { data } = await api.post("/tickets/reassign-whatsapp/preview", buildPayload());
      setPreview(data);
      if (!data.total) {
        toast.info("Nenhum ticket encontrado para os filtros selecionados.");
      }
    } catch (err) {
      toastError(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExecute = async () => {
    if (!validate()) return;
    if (!preview || !preview.total) {
      toast.warn("Gere a pré-visualização antes de migrar.");
      return;
    }
    if (!confirmChecked) {
      toast.warn("Confirme que entende o impacto antes de migrar.");
      return;
    }
    setExecuting(true);
    try {
      const { data } = await api.post("/tickets/reassign-whatsapp", buildPayload());
      toast.success(`${data.updated || 0} ticket(s) migrado(s) para a conexão ativa.`);
      if (onReassigned) onReassigned(data);
      handleClose();
    } catch (err) {
      toastError(err);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Mover tickets para conexão ativa</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
          Migra tickets abertos/aguardando presos em uma conexão desconectada (ou sem
          conexão) para uma conexão conectada da sua empresa. Histórico, contato e fila
          são preservados.
        </Typography>

        <FormControl variant="outlined" size="small" fullWidth style={{ marginBottom: 16 }}>
          <InputLabel>Origem (tickets presos)</InputLabel>
          <Select
            value={sourceWhatsappId}
            onChange={(e) => {
              setSourceWhatsappId(e.target.value);
              setPreview(null);
              setConfirmChecked(false);
            }}
            label="Origem (tickets presos)"
          >
            <MenuItem value={NULL_SOURCE}>Sem conexão vinculada (whatsappId nulo)</MenuItem>
            {disconnectedConnections.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name} — {w.status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl variant="outlined" size="small" fullWidth style={{ marginBottom: 8 }}>
          <InputLabel>Destino (conexão conectada)</InputLabel>
          <Select
            value={targetWhatsappId}
            onChange={(e) => {
              setTargetWhatsappId(e.target.value);
              setPreview(null);
              setConfirmChecked(false);
            }}
            label="Destino (conexão conectada)"
          >
            {connectedConnections.length === 0 && (
              <MenuItem value="" disabled>
                Nenhuma conexão conectada disponível
              </MenuItem>
            )}
            {connectedConnections.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box display="flex" alignItems="center" style={{ gap: 8, marginBottom: 8 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeOpen}
                onChange={(e) => {
                  setIncludeOpen(e.target.checked);
                  setPreview(null);
                }}
                color="primary"
              />
            }
            label="Abertos"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includePending}
                onChange={(e) => {
                  setIncludePending(e.target.checked);
                  setPreview(null);
                }}
                color="primary"
              />
            }
            label="Aguardando"
          />
          <Box flexGrow={1} />
          <Button
            variant="outlined"
            color="primary"
            onClick={handlePreview}
            disabled={loadingPreview || executing}
          >
            {loadingPreview ? <CircularProgress size={18} /> : "Pré-visualizar"}
          </Button>
        </Box>

        {preview && (
          <>
            <Divider style={{ margin: "12px 0" }} />
            <Typography variant="subtitle2">
              {preview.total} ticket(s) serão migrados
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block">
              Abertos: {preview.breakdown?.open ?? 0} · Aguardando:{" "}
              {preview.breakdown?.pending ?? 0}
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block">
              Destino: {preview.target?.name} (#{preview.target?.whatsappId})
            </Typography>

            {preview.total > 0 && (
              <Box
                display="flex"
                alignItems="flex-start"
                style={{ gap: 8, marginTop: 12, color: "#b45309" }}
              >
                <WarningIcon style={{ fontSize: 18 }} />
                <Typography variant="caption">{preview.warning}</Typography>
              </Box>
            )}

            {preview.total > 0 && (
              <FormControlLabel
                style={{ marginTop: 8 }}
                control={
                  <Checkbox
                    checked={confirmChecked}
                    onChange={(e) => setConfirmChecked(e.target.checked)}
                    color="primary"
                  />
                }
                label="Entendo que as próximas mensagens sairão pela conexão de destino."
              />
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={executing}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleExecute}
          disabled={executing || !preview || !preview.total || !confirmChecked}
        >
          {executing ? <CircularProgress size={18} /> : "Migrar tickets"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReassignWhatsappModal;
