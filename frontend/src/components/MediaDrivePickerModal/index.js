import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
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
    minHeight: 560
  },
  sidebar: {
    borderRight: `1px solid ${theme.palette.divider}`,
    height: "100%",
    overflowY: "auto"
  },
  toolbar: {
    display: "flex",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
    flexWrap: "wrap",
    alignItems: "center"
  },
  folderItem: {
    borderRadius: 12,
    margin: theme.spacing(0.5, 1)
  },
  folderPath: {
    display: "block",
    maxWidth: 180,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  fileCard: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 14,
    padding: theme.spacing(1.5),
    cursor: "pointer",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: theme.palette.primary.main,
      boxShadow: "0 10px 24px rgba(15,23,42,0.08)"
    }
  },
  activeFileCard: {
    borderColor: theme.palette.primary.main,
    backgroundColor: "rgba(25,118,210,0.06)"
  },
  previewBox: {
    height: 132,
    borderRadius: 12,
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
  selectedSummary: {
    padding: theme.spacing(1.5),
    borderRadius: 14,
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(2),
    background: "rgba(248,250,252,0.8)"
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

const formatBytes = (bytes = 0) => {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mediaType, setMediaType] = useState("all");
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSelect, setLoadingSelect] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    setSelectedFolderId("");
    setSearch("");
    setDebouncedSearch("");
    setMediaType("all");
    setIncludeDescendants(true);
    setSelectedFile(null);
  }, [open]);

  const loadFolders = useCallback(async () => {
    const { data } = await getMediaFolders();
    setFolders(data?.flatFolders || []);
  }, []);

  const loadFiles = useCallback(async () => {
    const params = {
      search: debouncedSearch || undefined,
      mediaType,
      folderId: selectedFolderId || undefined,
      includeDescendants: selectedFolderId ? includeDescendants : undefined
    };

    const { data } = await getMediaFiles(params);
    const normalizedFiles = Array.isArray(data) ? data : [];
    setFiles(normalizedFiles.filter((file) => allowedTypes.includes(file.mediaType)));
  }, [allowedTypes, debouncedSearch, includeDescendants, mediaType, selectedFolderId]);

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([loadFolders(), loadFiles()]);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [loadFiles, loadFolders, open]);

  useEffect(() => {
    if (!open) return;
    setSelectedFile(null);
  }, [files, open]);

  const selectedFolder = useMemo(
    () => folders.find((folder) => Number(folder.id) === Number(selectedFolderId)) || null,
    [folders, selectedFolderId]
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
          url: selectedFile.url,
          folderPath: selectedFile.folderPath
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
          <Box>
            <Typography variant="h6" style={{ fontWeight: 700 }}>{title}</Typography>
            <Typography variant="body2" color="textSecondary">
              Escolha uma mídia organizada por grupo, campanha ou pasta.
            </Typography>
          </Box>
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
            <MenuItem value="all">Todos os tipos</MenuItem>
            {allowedTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type === "document" ? "Documentos" : `${type.charAt(0).toUpperCase()}${type.slice(1)}s`}
              </MenuItem>
            ))}
          </Select>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeDescendants}
                onChange={(event) => setIncludeDescendants(event.target.checked)}
                color="primary"
                disabled={!selectedFolderId}
              />
            }
            label="Incluir subpastas"
          />
          <Chip
            size="small"
            color={selectedFolder ? "primary" : "default"}
            label={selectedFolder ? selectedFolder.path : "Todas as pastas"}
          />
        </Box>

        {selectedFile && (
          <Box className={classes.selectedSummary}>
            <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
              Mídia selecionada
            </Typography>
            <Typography variant="body2">{selectedFile.displayName}</Typography>
            <Typography variant="caption" color="textSecondary">
              {selectedFile.folderPath || `Pasta ${selectedFile.folderId}`} · {formatBytes(selectedFile.size)}
            </Typography>
          </Box>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Box className={classes.sidebar}>
              <List dense>
                <ListItem
                  button
                  className={classes.folderItem}
                  selected={!selectedFolderId}
                  onClick={() => setSelectedFolderId("")}
                >
                  <FolderIcon style={{ marginRight: 8 }} />
                  <ListItemText primary="Todas as pastas" secondary="Buscar em toda a biblioteca" />
                </ListItem>
                {folders.map((folder) => (
                  <ListItem
                    key={folder.id}
                    button
                    className={classes.folderItem}
                    selected={Number(selectedFolderId) === Number(folder.id)}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <FolderIcon style={{ marginRight: 8 }} />
                    <ListItemText
                      primary={`${"— ".repeat(folder.level || 0)}${folder.name}`}
                      secondary={
                        <>
                          <span className={classes.folderPath}>{folder.path}</span>
                          {`${folder.fileCount || 0} arquivo(s)`}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Grid>

          <Grid item xs={12} md={9}>
            {loading ? (
              <Box py={8} textAlign="center">
                <Typography color="textSecondary">Carregando biblioteca...</Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {files.length === 0 && (
                  <Grid item xs={12}>
                    <Box py={6} textAlign="center">
                      <Typography color="textSecondary">
                        Nenhuma mídia encontrada com os filtros atuais.
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {files.map((file) => (
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
                      <Typography variant="caption" color="textSecondary">
                        {file.folderPath || `Pasta ${file.folderId}`}
                      </Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Chip size="small" label={file.mediaType} />
                        <Tooltip title={file.mimeType}>
                          <Typography variant="caption" color="textSecondary">
                            {formatBytes(file.size)}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
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
