import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
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
  makeStyles
} from "@material-ui/core";
import { toast } from "react-toastify";
import { updateMediaFile } from "../../services/mediaLibraryService";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  dialogTitle: {
    fontWeight: 700
  },
  dialogContent: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    paddingTop: theme.spacing(3)
  },
  helperText: {
    color: theme.palette.text.secondary
  },
  dialogActions: {
    padding: theme.spacing(2, 3)
  }
}));

const MediaFileModal = ({ open, onClose, file, folders = [], onSuccess }) => {
  const classes = useStyles();
  const [customName, setCustomName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCustomName(file?.customName || "");
    setSelectedFolderId(file?.folderId || "");
  }, [file, open]);

  const selectedFolder = useMemo(
    () => folders.find((item) => Number(item.id) === Number(selectedFolderId)),
    [folders, selectedFolderId]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file?.id) {
      toast.error("Arquivo de mídia não encontrado.");
      return;
    }

    if (!selectedFolderId) {
      toast.error("Selecione uma pasta de destino.");
      return;
    }

    try {
      setSubmitting(true);
      await updateMediaFile(file.id, {
        customName: customName.trim() || null,
        folderId: Number(selectedFolderId)
      });
      toast.success("Mídia atualizada com sucesso.");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      toastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className={classes.dialogTitle}>Editar mídia</DialogTitle>
      <DialogContent dividers className={classes.dialogContent}>
        <Typography variant="body2" className={classes.helperText}>
          Arquivo original: <strong>{file?.originalName || file?.displayName}</strong>
        </Typography>

        <TextField
          label="Nome para exibição"
          variant="outlined"
          fullWidth
          value={customName}
          onChange={(event) => setCustomName(event.target.value)}
          helperText="Se vazio, o sistema continuará exibindo o nome original do arquivo."
        />

        <FormControl fullWidth variant="outlined">
          <InputLabel>Pasta</InputLabel>
          <Select
            value={selectedFolderId}
            onChange={(event) => setSelectedFolderId(event.target.value)}
            label="Pasta"
          >
            {folders.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.path || item.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="body2" className={classes.helperText}>
          Destino atual: <strong>{selectedFolder?.path || "Sem pasta"}</strong>
        </Typography>
      </DialogContent>
      <DialogActions className={classes.dialogActions}>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          color="primary"
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
        >
          Salvar mídia
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MediaFileModal;
