import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
  makeStyles
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import AddIcon from "@material-ui/icons/Add";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import FolderIcon from "@material-ui/icons/Folder";
import CreateNewFolderIcon from "@material-ui/icons/CreateNewFolder";
import ViewModuleIcon from "@material-ui/icons/ViewModule";
import ViewListIcon from "@material-ui/icons/ViewList";
import LinkIcon from "@material-ui/icons/Link";
import ImageIcon from "@material-ui/icons/Image";
import VideoLibraryIcon from "@material-ui/icons/VideoLibrary";
import AudiotrackIcon from "@material-ui/icons/Audiotrack";
import DescriptionIcon from "@material-ui/icons/Description";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import MediaFolderModal from "../../components/MediaFolderModal";
import toastError from "../../errors/toastError";
import {
  deleteMediaFile,
  deleteMediaFolder,
  getMediaFiles,
  getMediaFolders,
  uploadMediaFiles
} from "../../services/mediaLibraryService";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    minHeight: "100%"
  },
  hero: {
    padding: theme.spacing(3),
    borderRadius: 24,
    background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 48%, #ecfeff 100%)",
    border: "1px solid rgba(148,163,184,0.2)"
  },
  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(2),
    flexWrap: "wrap"
  },
  heroActions: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  primaryButton: {
    borderRadius: 10,
    textTransform: "none",
    boxShadow: "none"
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
    gap: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr"
    }
  },
  sidebar: {
    borderRadius: 18,
    border: `1px solid ${theme.palette.divider}`,
    overflow: "hidden"
  },
  sidebarHeader: {
    padding: theme.spacing(2),
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  content: {
    borderRadius: 18,
    border: `1px solid ${theme.palette.divider}`,
    overflow: "hidden"
  },
  toolbar: {
    padding: theme.spacing(2),
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    alignItems: "center"
  },
  fileGrid: {
    padding: theme.spacing(2)
  },
  fileCard: {
    borderRadius: 16,
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1.5),
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
    boxShadow: "0 6px 16px rgba(15,23,42,0.05)"
  },
  fileListRow: {
    padding: theme.spacing(1.5, 2),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`
  },
  previewBox: {
    height: 140,
    borderRadius: 14,
    background: "linear-gradient(135deg, #f8fafc, #e0f2fe)",
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
  emptyState: {
    padding: theme.spacing(8, 2),
    textAlign: "center"
  },
  folderItemText: {
    "& span": {
      fontWeight: 500
    }
  }
}));

const getMediaIcon = (mediaType) => {
  switch (mediaType) {
    case "image":
      return <ImageIcon color="primary" />;
    case "video":
      return <VideoLibraryIcon color="primary" />;
    case "audio":
      return <AudiotrackIcon color="primary" />;
    default:
      return <DescriptionIcon color="primary" />;
  }
};

const flattenFolders = (folders = [], level = 0) =>
  folders.reduce((acc, folder) => {
    acc.push({ ...folder, level });
    if (folder.children?.length) {
      acc.push(...flattenFolders(folder.children, level + 1));
    }
    return acc;
  }, []);

const formatBytes = (bytes = 0) => {
  const size = Number(bytes || 0);
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

const MediaLibrary = () => {
  const classes = useStyles();
  const uploadInputRef = useRef(null);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [parentFolderId, setParentFolderId] = useState("");
  const [confirmState, setConfirmState] = useState({ open: false, type: "", item: null });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: foldersData }, { data: filesData }] = await Promise.all([
        getMediaFolders({ search }),
        getMediaFiles()
      ]);
      setFolders(foldersData?.folders || []);
      setFiles(Array.isArray(filesData) ? filesData : []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timeout);
  }, [loadData]);

  const folderOptions = useMemo(() => flattenFolders(folders), [folders]);

  const visibleFiles = useMemo(
    () =>
      files.filter((file) => {
        if (selectedFolderId && Number(file.folderId) !== Number(selectedFolderId)) return false;
        if (filterType !== "all" && file.mediaType !== filterType) return false;
        if (search && !String(file.displayName || "").toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [files, filterType, search, selectedFolderId]
  );

  const handleUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    if (!selectedFolderId) {
      toast.warn("Selecione uma pasta antes de carregar arquivos.");
      return;
    }

    const formData = new FormData();
    formData.append("typeArch", "media-drive");
    formData.append("fileId", String(selectedFolderId));
    selectedFiles.forEach((file) => formData.append("files", file));

    try {
      setUploading(true);
      await uploadMediaFiles(selectedFolderId, formData);
      toast.success("Arquivos enviados para o Mídia Drive.");
      await loadData();
    } catch (err) {
      toastError(err);
    } finally {
      setUploading(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  };

  const handleConfirmDelete = async () => {
    const { type, item } = confirmState;
    try {
      if (type === "folder") {
        await deleteMediaFolder(item.id);
        if (Number(selectedFolderId) === Number(item.id)) {
          setSelectedFolderId("");
        }
      }
      if (type === "file") {
        await deleteMediaFile(item.id);
      }
      toast.success("Removido com sucesso.");
      await loadData();
    } catch (err) {
      toastError(err);
    } finally {
      setConfirmState({ open: false, type: "", item: null });
    }
  };

  return (
    <Box className={classes.root}>
      <MediaFolderModal
        open={folderModalOpen}
        onClose={() => {
          setFolderModalOpen(false);
          setEditingFolder(null);
          setParentFolderId("");
        }}
        folder={editingFolder}
        folders={folderOptions}
        parentFolderId={parentFolderId}
        onSuccess={() => {
          setFolderModalOpen(false);
          setEditingFolder(null);
          setParentFolderId("");
          loadData();
        }}
      />

      <ConfirmationModal
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, type: "", item: null })}
        title={confirmState.type === "folder" ? "Excluir pasta" : "Excluir arquivo"}
        onConfirm={handleConfirmDelete}
      >
        Tem certeza que deseja excluir <strong>{confirmState.item?.name || confirmState.item?.displayName}</strong>?
      </ConfirmationModal>

      <Paper className={classes.hero}>
        <Box className={classes.heroTop}>
          <Box>
            <Typography variant="h4" style={{ fontWeight: 700 }}>
              Armazenamento de mídia
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Biblioteca central para imagens, vídeos, áudios e documentos reutilizáveis em chats, respostas rápidas, campanhas e follow-ups.
            </Typography>
          </Box>

          <Box className={classes.heroActions}>
            <input
              ref={uploadInputRef}
              hidden
              multiple
              type="file"
              onChange={handleUpload}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Button
              variant="outlined"
              startIcon={<LinkIcon />}
              className={classes.primaryButton}
              onClick={() => toast.info("Integração com Google Drive preparada na interface. A autenticação OAuth será a próxima etapa.")}
            >
              Conectar Drive
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
              className={classes.primaryButton}
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploading}
            >
              Carregar
            </Button>
          </Box>
        </Box>
      </Paper>

      <Box className={classes.layout}>
        <Paper className={classes.sidebar}>
          <Box className={classes.sidebarHeader}>
            <Typography variant="subtitle1" style={{ fontWeight: 700 }}>Pastas</Typography>
            <Box display="flex">
              <Tooltip title="Nova pasta">
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingFolder(null);
                    setParentFolderId("");
                    setFolderModalOpen(true);
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Nova subpasta">
                <span>
                  <IconButton
                    size="small"
                    disabled={!selectedFolderId}
                    onClick={() => {
                      setEditingFolder(null);
                      setParentFolderId(selectedFolderId);
                      setFolderModalOpen(true);
                    }}
                  >
                    <CreateNewFolderIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
          <Divider />
          <List dense>
            <ListItem button selected={!selectedFolderId} onClick={() => setSelectedFolderId("")}>
              <Avatar style={{ width: 32, height: 32, marginRight: 10 }}>
                <FolderIcon fontSize="small" />
              </Avatar>
              <ListItemText primary="Todas as mídias" secondary={`${files.length} arquivo(s)`} />
            </ListItem>
            {folderOptions.map((folder) => (
              <ListItem
                key={folder.id}
                button
                selected={Number(selectedFolderId) === Number(folder.id)}
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <Avatar style={{ width: 32, height: 32, marginRight: 10 }}>
                  <FolderIcon fontSize="small" />
                </Avatar>
                <ListItemText
                  className={classes.folderItemText}
                  primary={`${"— ".repeat(folder.level || 0)}${folder.name}`}
                  secondary={`${folder.fileCount || 0} arquivo(s)`}
                />
                <Tooltip title="Editar pasta">
                  <IconButton
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingFolder(folder);
                      setFolderModalOpen(true);
                    }}
                  >
                    <CreateNewFolderIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir pasta">
                  <IconButton
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      setConfirmState({ open: true, type: "folder", item: folder });
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Paper>

        <Paper className={classes.content}>
          <Box className={classes.toolbar}>
            <TextField
              size="small"
              variant="outlined"
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

            <Select value={filterType} onChange={(event) => setFilterType(event.target.value)} size="small" variant="outlined">
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="image">Imagens</MenuItem>
              <MenuItem value="video">Vídeos</MenuItem>
              <MenuItem value="audio">Áudios</MenuItem>
              <MenuItem value="document">Documentos</MenuItem>
            </Select>

            <Box display="flex" style={{ marginLeft: "auto" }}>
              <Tooltip title="Visualização em grade">
                <IconButton size="small" color={viewMode === "grid" ? "primary" : "default"} onClick={() => setViewMode("grid")}>
                  <ViewModuleIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Visualização em lista">
                <IconButton size="small" color={viewMode === "list" ? "primary" : "default"} onClick={() => setViewMode("list")}>
                  <ViewListIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={8}>
              <CircularProgress />
            </Box>
          ) : visibleFiles.length === 0 ? (
            <Box className={classes.emptyState}>
              <FolderIcon style={{ fontSize: 52, opacity: 0.35 }} />
              <Typography variant="h6" style={{ marginTop: 12 }}>
                Nenhum arquivo de mídia foi encontrado
              </Typography>
              <Typography color="textSecondary">
                Selecione uma pasta e use o botão Carregar para começar sua biblioteca central de mídia.
              </Typography>
            </Box>
          ) : viewMode === "grid" ? (
            <Grid container spacing={2} className={classes.fileGrid}>
              {visibleFiles.map((file) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                  <Box className={classes.fileCard}>
                    <Box className={classes.previewBox}>
                      {file.mediaType === "image" ? (
                        <img src={file.url} alt={file.displayName} className={classes.previewImage} />
                      ) : (
                        getMediaIcon(file.mediaType)
                      )}
                    </Box>
                    <Typography variant="subtitle2" noWrap>{file.displayName}</Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Chip size="small" label={file.mediaType} />
                      <Typography variant="caption" color="textSecondary">
                        {formatBytes(file.size)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="textSecondary" noWrap>
                        Pasta #{file.folderId}
                      </Typography>
                      <IconButton size="small" onClick={() => setConfirmState({ open: true, type: "file", item: file })}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box>
              {visibleFiles.map((file) => (
                <Box key={file.id} className={classes.fileListRow}>
                  {getMediaIcon(file.mediaType)}
                  <Box flex={1} minWidth={0}>
                    <Typography variant="subtitle2" noWrap>{file.displayName}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {file.mimeType} • {formatBytes(file.size)}
                    </Typography>
                  </Box>
                  <Chip size="small" label={file.mediaType} />
                  <IconButton size="small" onClick={() => setConfirmState({ open: true, type: "file", item: file })}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default MediaLibrary;
