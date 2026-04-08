import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
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
import EditIcon from "@material-ui/icons/Edit";
import GetAppIcon from "@material-ui/icons/GetApp";
import CollectionsIcon from "@material-ui/icons/Collections";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import CategoryIcon from "@material-ui/icons/Category";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import MediaFolderModal from "../../components/MediaFolderModal";
import MediaFileModal from "../../components/MediaFileModal";
import toastError from "../../errors/toastError";
import {
  deleteMediaFile,
  deleteMediaFolder,
  downloadMediaFile,
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
    borderRadius: 24,
    padding: theme.spacing(3),
    background: "linear-gradient(135deg, #f8fafc 0%, #ecfeff 40%, #eef2ff 100%)",
    border: "1px solid rgba(148,163,184,0.22)",
    boxShadow: "0 18px 36px rgba(15,23,42,0.06)"
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
    flexWrap: "wrap",
    justifyContent: "flex-end"
  },
  statGrid: {
    marginTop: theme.spacing(2)
  },
  statCard: {
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.18)",
    boxShadow: "none",
    background: "rgba(255,255,255,0.82)"
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.1
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr)",
    gap: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr"
    }
  },
  sidebar: {
    borderRadius: 20,
    overflow: "hidden",
    border: `1px solid ${theme.palette.divider}`
  },
  sidebarHeader: {
    padding: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1)
  },
  sidebarSummary: {
    padding: theme.spacing(0, 2, 2)
  },
  content: {
    borderRadius: 20,
    overflow: "hidden",
    border: `1px solid ${theme.palette.divider}`
  },
  toolbar: {
    padding: theme.spacing(2),
    display: "flex",
    gap: theme.spacing(1.5),
    flexWrap: "wrap",
    alignItems: "center"
  },
  folderItem: {
    borderRadius: 12,
    margin: theme.spacing(0.5, 1)
  },
  folderAvatar: {
    width: 36,
    height: 36,
    marginRight: theme.spacing(1.25),
    backgroundColor: "rgba(15,23,42,0.08)",
    color: theme.palette.primary.main
  },
  folderItemText: {
    "& .MuiListItemText-primary": {
      fontWeight: 600
    }
  },
  folderPathText: {
    display: "block",
    maxWidth: 220,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  activeFolderBanner: {
    margin: theme.spacing(0, 2, 2),
    padding: theme.spacing(1.5, 2),
    borderRadius: 16,
    background: "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(37,99,235,0.08))",
    border: "1px solid rgba(59,130,246,0.12)"
  },
  fileGrid: {
    padding: theme.spacing(0, 2, 2)
  },
  fileCard: {
    borderRadius: 18,
    border: `1px solid ${theme.palette.divider}`,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.25),
    padding: theme.spacing(1.5),
    boxShadow: "0 12px 24px rgba(15,23,42,0.05)"
  },
  fileListRow: {
    padding: theme.spacing(1.5, 2),
    display: "grid",
    gridTemplateColumns: "56px minmax(0, 1fr) auto",
    gap: theme.spacing(2),
    alignItems: "center",
    borderTop: `1px solid ${theme.palette.divider}`
  },
  previewBox: {
    height: 156,
    borderRadius: 16,
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
  fileTitle: {
    fontWeight: 700
  },
  fileMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  filePath: {
    display: "block",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  fileActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  actionGroup: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5)
  },
  emptyState: {
    padding: theme.spacing(8, 2),
    textAlign: "center"
  },
  helperText: {
    color: theme.palette.text.secondary
  }
}));

const getMediaIcon = (mediaType, size = "default") => {
  switch (mediaType) {
    case "image":
      return <ImageIcon color="primary" fontSize={size} />;
    case "video":
      return <VideoLibraryIcon color="primary" fontSize={size} />;
    case "audio":
      return <AudiotrackIcon color="primary" fontSize={size} />;
    default:
      return <DescriptionIcon color="primary" fontSize={size} />;
  }
};

const formatBytes = (bytes = 0) => {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
};

const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

const MediaLibrary = () => {
  const classes = useStyles();
  const uploadInputRef = useRef(null);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [parentFolderId, setParentFolderId] = useState("");
  const [confirmState, setConfirmState] = useState({ open: false, type: "", item: null });
  const [folderReloadKey, setFolderReloadKey] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const loadFolders = useCallback(async () => {
    const { data } = await getMediaFolders();
    setFolders(data?.flatFolders || []);
  }, []);

  const loadFiles = useCallback(async () => {
    const params = {
      search: debouncedSearch || undefined,
      mediaType: filterType,
      folderId: selectedFolderId || undefined,
      includeDescendants: selectedFolderId ? includeDescendants : undefined
    };
    const { data } = await getMediaFiles(params);
    setFiles(Array.isArray(data) ? data : []);
  }, [debouncedSearch, filterType, includeDescendants, selectedFolderId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadFolders(), loadFiles()]);
    } finally {
      setLoading(false);
    }
  }, [loadFiles, loadFolders]);

  useEffect(() => {
    loadData().catch(toastError);
  }, [loadData, folderReloadKey]);

  const totalFiles = useMemo(
    () => folders.reduce((sum, folder) => sum + Number(folder.directFileCount || 0), 0),
    [folders]
  );

  const selectedFolder = useMemo(
    () => folders.find((folder) => Number(folder.id) === Number(selectedFolderId)) || null,
    [folders, selectedFolderId]
  );

  const handleUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    if (!selectedFolderId) {
      toast.warn("Selecione um grupo ou pasta antes de enviar a mídia.");
      return;
    }

    const formData = new FormData();
    formData.append("typeArch", "media-drive");
    formData.append("fileId", String(selectedFolderId));
    selectedFiles.forEach((file) => formData.append("files", file));

    try {
      setUploading(true);
      await uploadMediaFiles(selectedFolderId, formData);
      toast.success("Arquivos enviados para a biblioteca de mídia.");
      await Promise.all([loadFolders(), loadFiles()]);
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
        setFolderReloadKey((value) => value + 1);
      }

      if (type === "file") {
        await deleteMediaFile(item.id);
        await loadFiles();
        await loadFolders();
      }

      toast.success("Removido com sucesso.");
    } catch (err) {
      toastError(err);
    } finally {
      setConfirmState({ open: false, type: "", item: null });
    }
  };

  const handleDownload = async (file) => {
    try {
      const { data } = await downloadMediaFile(file.id);
      downloadBlob(data, file.displayName || file.originalName);
    } catch (err) {
      toastError(err);
    }
  };

  const handleCopyLink = async (file) => {
    if (!navigator?.clipboard?.writeText) {
      toast.info("Seu navegador não permite copiar automaticamente.");
      return;
    }

    try {
      await navigator.clipboard.writeText(file.url);
      toast.success("Link da mídia copiado.");
    } catch (err) {
      toastError(err);
    }
  };

  const handleFileSaved = async () => {
    setFileModalOpen(false);
    setEditingFile(null);
    await Promise.all([loadFolders(), loadFiles()]);
  };

  const handleFolderSaved = async () => {
    setFolderModalOpen(false);
    setEditingFolder(null);
    setParentFolderId("");
    await Promise.all([loadFolders(), loadFiles()]);
  };

  const statCards = [
    {
      label: "Midias cadastradas",
      value: totalFiles,
      helper: "Biblioteca pronta para chats, campanhas e follow-ups",
      icon: <CollectionsIcon color="primary" />
    },
    {
      label: "Grupos e pastas",
      value: folders.length,
      helper: "Organize por produto, campanha, time ou etapa",
      icon: <FolderOpenIcon color="primary" />
    },
    {
      label: "Filtro atual",
      value: selectedFolder ? selectedFolder.fileCount || 0 : files.length,
      helper: selectedFolder ? selectedFolder.path : "Toda a biblioteca",
      icon: <CategoryIcon color="primary" />
    }
  ];

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
        folders={folders}
        parentFolderId={parentFolderId}
        onSuccess={handleFolderSaved}
      />

      <MediaFileModal
        open={fileModalOpen}
        onClose={() => {
          setFileModalOpen(false);
          setEditingFile(null);
        }}
        file={editingFile}
        folders={folders}
        onSuccess={handleFileSaved}
      />

      <ConfirmationModal
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, type: "", item: null })}
        title={confirmState.type === "folder" ? "Excluir pasta de mídia" : "Excluir arquivo de mídia"}
        onConfirm={handleConfirmDelete}
      >
        Tem certeza que deseja excluir <strong>{confirmState.item?.name || confirmState.item?.displayName}</strong>?
      </ConfirmationModal>

      <Paper className={classes.hero}>
        <Box className={classes.heroTop}>
          <Box>
            <Typography variant="h4" style={{ fontWeight: 700 }}>
              Biblioteca de midia
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Centralize imagens, videos, audios e documentos em grupos reutilizaveis para atendimento, marketing e automacoes.
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
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingFolder(null);
                setParentFolderId("");
                setFolderModalOpen(true);
              }}
            >
              Novo grupo
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploading}
            >
              Enviar midia
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2} className={classes.statGrid}>
          {statCards.map((card) => (
            <Grid item xs={12} md={4} key={card.label}>
              <Card className={classes.statCard}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        {card.label}
                      </Typography>
                      <Typography className={classes.statValue}>{card.value}</Typography>
                    </Box>
                    {card.icon}
                  </Box>
                  <Typography variant="body2" className={classes.helperText}>
                    {card.helper}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Box className={classes.layout}>
        <Paper className={classes.sidebar}>
          <Box className={classes.sidebarHeader}>
            <Box>
              <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
                Grupos de midia
              </Typography>
              <Typography variant="body2" className={classes.helperText}>
                Selecione a pasta de trabalho
              </Typography>
            </Box>
            <Box display="flex">
              <Tooltip title="Nova pasta raiz">
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

          <Box className={classes.sidebarSummary}>
            <Chip
              size="small"
              color={selectedFolder ? "primary" : "default"}
              label={selectedFolder ? `Filtro: ${selectedFolder.name}` : "Exibindo toda a biblioteca"}
            />
          </Box>

          <Divider />

          <List dense>
            <ListItem
              button
              className={classes.folderItem}
              selected={!selectedFolderId}
              onClick={() => setSelectedFolderId("")}
            >
              <Avatar className={classes.folderAvatar}>
                <FolderIcon fontSize="small" />
              </Avatar>
              <ListItemText
                className={classes.folderItemText}
                primary="Toda a biblioteca"
                secondary={`${totalFiles} arquivo(s) em todos os grupos`}
              />
            </ListItem>

            {folders.map((folder) => (
              <ListItem
                key={folder.id}
                button
                className={classes.folderItem}
                selected={Number(selectedFolderId) === Number(folder.id)}
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <Avatar className={classes.folderAvatar}>
                  <FolderIcon fontSize="small" />
                </Avatar>
                <ListItemText
                  className={classes.folderItemText}
                  primary={`${"— ".repeat(folder.level || 0)}${folder.name}`}
                  secondary={
                    <>
                      <span className={classes.folderPathText}>{folder.path}</span>
                      {`${folder.fileCount || 0} arquivo(s)`}
                    </>
                  }
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
                    <EditIcon fontSize="small" />
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
              placeholder="Buscar midia por nome"
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
              <MenuItem value="all">Todos os tipos</MenuItem>
              <MenuItem value="image">Imagens</MenuItem>
              <MenuItem value="video">Videos</MenuItem>
              <MenuItem value="audio">Audios</MenuItem>
              <MenuItem value="document">Documentos</MenuItem>
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

          {selectedFolder && (
            <Box className={classes.activeFolderBanner}>
              <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
                Grupo selecionado
              </Typography>
              <Typography variant="body2">{selectedFolder.path}</Typography>
              <Typography variant="caption" color="textSecondary">
                {selectedFolder.description || "Sem descrição cadastrada."}
              </Typography>
            </Box>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={8}>
              <CircularProgress />
            </Box>
          ) : files.length === 0 ? (
            <Box className={classes.emptyState}>
              <FolderIcon style={{ fontSize: 52, opacity: 0.35 }} />
              <Typography variant="h6" style={{ marginTop: 12 }}>
                Nenhuma mídia encontrada
              </Typography>
              <Typography color="textSecondary">
                Ajuste os filtros ou selecione uma pasta para começar a sua biblioteca.
              </Typography>
            </Box>
          ) : viewMode === "grid" ? (
            <Grid container spacing={2} className={classes.fileGrid}>
              {files.map((file) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                  <Box className={classes.fileCard}>
                    <Box className={classes.previewBox}>
                      {file.mediaType === "image" ? (
                        <img src={file.url} alt={file.displayName} className={classes.previewImage} />
                      ) : (
                        getMediaIcon(file.mediaType, "large")
                      )}
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" className={classes.fileTitle} noWrap>
                        {file.displayName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" className={classes.filePath}>
                        {file.folderPath || `Pasta ${file.folderId}`}
                      </Typography>
                    </Box>

                    <Box className={classes.fileMetaRow}>
                      <Chip size="small" label={file.mediaType} />
                      <Typography variant="caption" color="textSecondary">
                        {formatBytes(file.size)}
                      </Typography>
                    </Box>

                    <Typography variant="caption" color="textSecondary">
                      Atualizado em {formatDate(file.updatedAt)}
                    </Typography>

                    <Box className={classes.fileActions}>
                      <Box className={classes.actionGroup}>
                        <Tooltip title="Editar mídia">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingFile(file);
                              setFileModalOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Baixar mídia">
                          <IconButton size="small" onClick={() => handleDownload(file)}>
                            <GetAppIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copiar link">
                          <IconButton size="small" onClick={() => handleCopyLink(file)}>
                            <LinkIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Tooltip title="Excluir mídia">
                        <IconButton size="small" onClick={() => setConfirmState({ open: true, type: "file", item: file })}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box>
              {files.map((file) => (
                <Box key={file.id} className={classes.fileListRow}>
                  <Box display="flex" justifyContent="center">
                    {file.mediaType === "image" ? (
                      <Avatar variant="rounded" src={file.url} alt={file.displayName} style={{ width: 48, height: 48 }} />
                    ) : (
                      getMediaIcon(file.mediaType, "large")
                    )}
                  </Box>

                  <Box minWidth={0}>
                    <Typography variant="subtitle2" noWrap className={classes.fileTitle}>
                      {file.displayName}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" className={classes.filePath}>
                      {file.folderPath || `Pasta ${file.folderId}`}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" display="block">
                      {file.mimeType} · {formatBytes(file.size)} · {formatDate(file.updatedAt)}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                    <Chip size="small" label={file.mediaType} />
                    <Tooltip title="Editar mídia">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingFile(file);
                          setFileModalOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Baixar mídia">
                      <IconButton size="small" onClick={() => handleDownload(file)}>
                        <GetAppIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Copiar link">
                      <IconButton size="small" onClick={() => handleCopyLink(file)}>
                        <LinkIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir mídia">
                      <IconButton size="small" onClick={() => setConfirmState({ open: true, type: "file", item: file })}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
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
