import React, { useState, useEffect, useMemo, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import ListSubheader from "@material-ui/core/ListSubheader";
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from "@material-ui/core/TextField";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import { Stack, Chip } from "@mui/material";
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap"
  },
  btnWrapper: {
    position: "relative"
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12
  }
}));

const normalizeTagText = value =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const FlowBuilderAddTagModal = ({
  open,
  onSave,
  data,
  onUpdate,
  close
}) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const [activeModal, setActiveModal] = useState(false);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [tagSearch, setTagSearch] = useState("");

  const filteredTags = useMemo(() => {
    const search = normalizeTagText(tagSearch.trim());
    if (!search) return tags;

    return tags.filter(tag =>
      normalizeTagText(tag?.name).includes(search)
    );
  }, [tags, tagSearch]);

  useEffect(() => {
    if (open === 'edit') {
      (async () => {
        try {
          const { data: tagsData } = await api.get("/tags");
          setTags(tagsData.tags || tagsData || []);
          if (data?.data?.id) {
            setSelectedTag(data.data.id);
          }
          setTagSearch("");
          setActiveModal(true);
        } catch (error) {
          console.log(error);
        }
      })();
    } else if (open === 'create') {
      (async () => {
        try {
          const { data: tagsData } = await api.get("/tags");
          setTags(tagsData.tags || tagsData || []);
          setSelectedTag("");
          setTagSearch("");
          setActiveModal(true);
        } catch (error) {
          console.log(error);
        }
      })();
    }
    return () => {
      isMounted.current = false;
    };
  }, [open]);

  const handleClose = () => {
    close(null);
    setActiveModal(false);
    setTagSearch("");
  };

  const handleSave = () => {
    if (!selectedTag) {
      return toast.error('Selecione uma tag');
    }
    const tag = tags.find(item => item.id === selectedTag);
    if (open === 'edit') {
      onUpdate({
        ...data,
        data: { id: tag.id, name: tag.name, color: tag.color }
      });
    } else if (open === 'create') {
      onSave({
        data: { id: tag.id, name: tag.name, color: tag.color }
      });
    }
    handleClose();
  };

  return (
    <div className={classes.root}>
      <Dialog open={activeModal} onClose={handleClose} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle id="form-dialog-title">
          {open === 'create' ? `Adicionar tag ao contato` : `Editar tag`}
        </DialogTitle>
        <Stack>
          <DialogContent dividers>
            <Select
              labelId="tag-select-label"
              id="tag-select"
              value={selectedTag}
              style={{ width: "100%" }}
              onChange={(e) => setSelectedTag(e.target.value)}
              displayEmpty
              MenuProps={{
                anchorOrigin: {
                  vertical: "bottom",
                  horizontal: "left",
                },
                transformOrigin: {
                  vertical: "top",
                  horizontal: "left",
                },
                getContentAnchorEl: null,
                PaperProps: {
                  style: {
                    maxHeight: 360,
                  },
                },
              }}
              renderValue={(selected) => {
                if (!selected) {
                  return <span style={{ color: "#999" }}>Selecione uma tag</span>;
                }
                const tag = tags.find(t => t.id === selected);
                return tag ? (
                  <Chip
                    label={tag.name}
                    size="small"
                    style={{ backgroundColor: tag.color, color: "#fff" }}
                  />
                ) : "";
              }}
            >
              <ListSubheader disableSticky>
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  placeholder="Buscar tag pelo nome"
                  value={tagSearch}
                  onChange={(event) => setTagSearch(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  variant="outlined"
                />
              </ListSubheader>
              <MenuItem value="" disabled>
                Selecione uma tag
              </MenuItem>
              {filteredTags.length > 0 ? (
                filteredTags.map((tag) => (
                  <MenuItem dense key={tag.id} value={tag.id}>
                    <Chip
                      label={tag.name}
                      size="small"
                      style={{ backgroundColor: tag.color, color: "#fff", marginRight: 8 }}
                    />
                    {tag.name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>Nenhuma tag encontrada</MenuItem>
              )}
            </Select>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleClose}
              startIcon={<CancelIcon />}
              style={{
                color: "white",
                backgroundColor: "#db6565",
                boxShadow: "none",
                borderRadius: 0,
                fontSize: "12px",
              }}
              variant="outlined"
            >
              {i18n.t("contactModal.buttons.cancel")}
            </Button>
            <Button
              startIcon={<SaveIcon />}
              type="submit"
              style={{
                color: "white",
                backgroundColor: "#437db5",
                boxShadow: "none",
                borderRadius: 0,
                fontSize: "12px",
              }}
              variant="contained"
              className={classes.btnWrapper}
              onClick={handleSave}
            >
              {open === 'create' ? `Adicionar` : 'Salvar'}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </div>
  );
};

export default FlowBuilderAddTagModal;
