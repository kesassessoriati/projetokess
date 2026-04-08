import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  makeStyles,
  MenuItem,
  Select,
  TextField
} from "@material-ui/core";
import { toast } from "react-toastify";
import { createMediaFolder, updateMediaFolder } from "../../services/mediaLibraryService";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  dialogTitle: {
    fontWeight: 600
  },
  dialogContent: {
    paddingTop: theme.spacing(3)
  },
  formField: {
    marginBottom: theme.spacing(2)
  },
  dialogActions: {
    padding: theme.spacing(2, 3)
  }
}));

const MediaFolderModal = ({ open, onClose, folder, folders = [], parentFolderId = "", onSuccess }) => {
  const classes = useStyles();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(folder?.name || "");
    setDescription(folder?.description || "");
    setSelectedParentId(folder?.parentId || parentFolderId || "");
  }, [folder, open, parentFolderId]);

  const invalidParentIds = React.useMemo(() => {
    if (!folder?.id) return new Set();

    const descendants = new Set([Number(folder.id)]);
    const stack = [Number(folder.id)];

    while (stack.length) {
      const currentId = stack.pop();
      folders.forEach((item) => {
        if (Number(item.parentId) === Number(currentId) && !descendants.has(Number(item.id))) {
          descendants.add(Number(item.id));
          stack.push(Number(item.id));
        }
      });
    }

    return descendants;
  }, [folder, folders]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("O nome da pasta é obrigatório.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        parentId: selectedParentId || null
      };

      if (folder?.id) {
        await updateMediaFolder(folder.id, payload);
        toast.success("Pasta atualizada com sucesso!");
      } else {
        await createMediaFolder(payload);
        toast.success("Pasta criada com sucesso!");
      }

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
      <DialogTitle className={classes.dialogTitle}>
        {folder ? "Editar pasta" : "Nova pasta"}
      </DialogTitle>
      <DialogContent dividers className={classes.dialogContent}>
        <form id="media-folder-form" onSubmit={handleSubmit}>
          <TextField
            label="Nome"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={classes.formField}
            required
          />

          <TextField
            label="Descrição"
            fullWidth
            variant="outlined"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={classes.formField}
            multiline
            rows={3}
          />

          <FormControl fullWidth variant="outlined" className={classes.formField}>
            <InputLabel>Pasta pai</InputLabel>
            <Select
              value={selectedParentId}
              onChange={(event) => setSelectedParentId(event.target.value)}
              label="Pasta pai"
            >
              <MenuItem value="">Raiz</MenuItem>
              {folders
                .filter((item) => !invalidParentIds.has(Number(item.id)))
                .map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.path || item.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </form>
      </DialogContent>
      <DialogActions className={classes.dialogActions}>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button color="primary" variant="contained" type="submit" form="media-folder-form" disabled={submitting}>
          {folder ? "Salvar alterações" : "Criar pasta"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MediaFolderModal;
