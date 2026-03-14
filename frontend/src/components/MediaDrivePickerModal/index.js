import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  makeStyles
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import FolderIcon from "@material-ui/icons/Folder";
import SearchIcon from "@material-ui/icons/Search";
import ImageIcon from "@material-ui/icons/Image";
import AudiotrackIcon from "@material-ui/icons/Audiotrack";
import VideoLibraryIcon from "@material-ui/icons/VideoLibrary";
import DescriptionIcon from "@material-ui/icons/Description";
import { toast } from "react-toastify";
import { downloadMediaFile, getMediaFiles, getMediaFolders } from "../../services/mediaLibraryService";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  paper: {
    minHeight: 520
  },
  sidebar: {
    borderRight: `1px solid ${theme.palette.divider}`,
    height: "100%",
    overflowY: "auto"
  },
  fileCard: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    padding: theme.spacing(1.5),
    cursor: "pointer",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: theme.palette.primary.main,
      boxShadow: "0 8px 20px rgba(15,23,42,0.08)"
    }
  },
  activeFileCard: {
    borderColor: theme.palette.primary.main,
    backgroundColor: "rgba(25,118,210,0.06)"
  },
  previewBox: {
    height: 120,
    borderRadius: 10,
    background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  toolbar: {
    display: "flex",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
    flexWrap: "wrap"
  }
}));

const getFileIcon = (mediaType) => {
  switch (mediaType) {
    case "image":
      return <ImageIcon fontSize="large" color="primary" />;
    case "video":
      return <VideoLibraryIcon fontSize="large" color="primary" />;
    case "audio":
      return <AudiotrackIcon fontSize="large" color="primary" />;
    default:
      return <DescriptionIcon fontSize="large" color="primary" />;
  }
};

const MediaDrivePickerModal = ({
  open,
  onClose,
  allowedTypes = ["image", "video", "audio", "document"],
  title = "Selecionar do Mídia Drive",
  onSelect
}) => {
  const classes = useStyles();
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [mediaType, setMediaType] = useState("all");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingSelect, setLoadingSelect] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        const [{ data: folderData }, { data: fileData }] = await Promise.all([
          getMediaFolders(),
          getMediaFiles()
        ]);
        const flatFolders = folderData?.flatFolders || [];
        setFolders(flatFolders);
        setSelectedFolderId("");
        setFiles(Array.isArray(fileData) ? fileData : []);
        setSelectedFile(null);
        setSearch("");
        setMediaType("all");
      } catch (err) {
        toastError(err);
      }
    };

    loadData();
  }, [open]);

  const visibleFiles = useMemo(
    () =>
      files.filter((file) => {
        if (selectedFolderId && Number(file.folderId) !== Number(selectedFolderId)) return false;
        if (mediaType !== "all" && file.mediaType !== mediaType) return false;
        if (!allowedTypes.includes(file.mediaType)) return false;
        if (search && !String(file.displayName || "").toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [allowedTypes, files, mediaType, search, selectedFolderId]
  );

  const handleConfirm = async () => {
    if (!selectedFile) {
      toast.warn("Selecione uma mídia primeiro.");
      return;
    }

    try {
      setLoadingSelect(true);
      const { data } = await downloadMediaFile(selectedFile.id);
      const file = new File([data], selectedFile.displayName, { type: selectedFile.mimeType });
      if (onSelect) {
        onSelect({
          id: selectedFile.id,
          file,
          mediaType: selectedFile.mediaType,
          mimeType: selectedFile.mimeType,
          name: selectedFile.displayName,
          storagePath: selectedFile.storagePath,
          url: selectedFile.url
        });
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      toastError(err);
    } finally {
      setLoadingSelect(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth classes={{ paper: classes.paper }}>
      <DialogTitle disableTypography>
        <Box display="flex" alignItems="center">
          <Typography variant="h6" style={{ fontWeight: 600 }}>{title}</Typography>
          <IconButton onClick={onClose} style={{ marginLeft: "auto" }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box className={classes.toolbar}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Buscar mídia"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />
          <Select value={mediaType} onChange={(event) => setMediaType(event.target.value)} variant="outlined" size="small">
            <MenuItem value="all">Todos</MenuItem>
            {allowedTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type === "document" ? "Documentos" : `${type.charAt(0).toUpperCase()}${type.slice(1)}s`}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Box className={classes.sidebar}>
              <List dense>
                <ListItem button selected={!selectedFolderId} onClick={() => setSelectedFolderId("")}>
                  <FolderIcon style={{ marginRight: 8 }} />
                  <ListItemText primary="Todas as pastas" />
                </ListItem>
                {folders.map((folder) => (
                  <ListItem
                    key={folder.id}
                    button
                    selected={Number(selectedFolderId) === Number(folder.id)}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <FolderIcon style={{ marginRight: 8 }} />
                    <ListItemText primary={folder.name} secondary={folder.fileCount ? `${folder.fileCount} arquivo(s)` : ""} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Grid>

          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              {visibleFiles.length === 0 && (
                <Grid item xs={12}>
                  <Box py={6} textAlign="center">
                    <Typography color="textSecondary">Nenhuma mídia encontrada com os filtros atuais.</Typography>
                  </Box>
                </Grid>
              )}
              {visibleFiles.map((file) => (
                <Grid item xs={12} sm={6} md={4} key={file.id}>
                  <Box
                    className={`${classes.fileCard} ${selectedFile?.id === file.id ? classes.activeFileCard : ""}`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <Box className={classes.previewBox}>
                      {file.mediaType === "image" ? (
                        <img src={file.url} alt={file.displayName} className={classes.previewImage} />
                      ) : (
                        getFileIcon(file.mediaType)
                      )}
                    </Box>
                    <Typography variant="subtitle2" noWrap>{file.displayName}</Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Chip size="small" label={file.mediaType} />
                      <Tooltip title={file.mimeType}>
                        <Typography variant="caption" color="textSecondary">
                          {(file.size / 1024 / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 2)} MB
                        </Typography>
                      </Tooltip>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button color="primary" variant="contained" onClick={handleConfirm} disabled={!selectedFile || loadingSelect}>
          Usar mídia
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MediaDrivePickerModal;
