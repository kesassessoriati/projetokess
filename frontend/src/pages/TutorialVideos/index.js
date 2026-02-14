import React, { useState, useEffect, useContext } from "react";
import {
  Paper,
  IconButton,
  Button,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Grid,
  Tooltip
} from "@material-ui/core";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PlayArrow as PlayIcon,
  VideoLibrary as VideoIcon,
  Person as PersonIcon,
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TutorialVideoModal from "../../components/TutorialVideoModal";
import { AuthContext } from "../../context/Auth/AuthContext";
import {
  listTutorialVideos,
  deleteTutorialVideo,
  getVideoThumbnailFallback,
} from "../../services/tutorialVideoService";
import VideoModal from "../../components/VideoModal";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  searchField: {
    minWidth: 300,
  },
  cardsWrapper: {
    marginTop: theme.spacing(2),
  },
  cardsGrid: {
    marginTop: theme.spacing(1),
  },
  videoCard: {
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.1)",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  videoCardMedia: {
    height: 180,
  },
  cardContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
  },
  cardStatusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
  },
  cardTitle: {
    fontWeight: 600,
    fontSize: "1.1rem",
    display: "-webkit-box",
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardDescription: {
    color: theme.palette.text.secondary,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    minHeight: 40,
  },
  linkText: {
    fontSize: "0.8rem",
    color: theme.palette.primary.main,
    wordBreak: "break-all",
  },
  cardInfoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
  },
  authorInfo: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  cardActions: {
    padding: theme.spacing(1.5, 2),
    justifyContent: "flex-end",
  },
  skeletonCard: {
    height: 320,
    borderRadius: 16,
    backgroundColor: theme.palette.action.hover,
  },
  emptyState: {
    textAlign: "center",
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
}));

const TutorialVideos = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  // Verificar se é admin da empresa 1
  const isAuthorized = user && user.companyId === 1 && user.profile === "admin";

  const [tutorialVideos, setTutorialVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);

  useEffect(() => {
    if (isAuthorized) {
      fetchTutorialVideos();
    }
  }, [isAuthorized, searchParam]);

  const fetchTutorialVideos = async () => {
    setLoading(true);
    try {
      const { data } = await listTutorialVideos({
        searchParam,
        pageNumber: 1,
      });
      setTutorialVideos(data.tutorialVideos);
    } catch (error) {
      console.error("Erro ao carregar vídeos:", error);
      toast.error("Erro ao carregar vídeos tutoriais");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (video = null) => {
    setSelectedVideo(video);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
    setModalOpen(false);
  };

  const handleVideoSuccess = () => {
    fetchTutorialVideos();
  };

  const handleDeleteClick = (video) => {
    setVideoToDelete(video);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!videoToDelete) return;

    try {
      await deleteTutorialVideo(videoToDelete.id, false); // Soft delete
      toast.success("Vídeo removido com sucesso!");
      fetchTutorialVideos();
    } catch (error) {
      console.error("Erro ao remover vídeo:", error);
      toast.error("Erro ao remover vídeo");
    } finally {
      setDeleteDialogOpen(false);
      setVideoToDelete(null);
    }
  };

  const handlePreviewVideo = (video) => {
    setPreviewVideo({
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl || getVideoThumbnailFallback(video.videoUrl) || undefined,
      isYoutube: true,
    });
  };

  const formatDate = (value) => {
    if (!value) return "Data indisponível";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Data indisponível";
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Verificação de autorização
  if (!isAuthorized) {
    return (
      <MainContainer>
        <Box className={classes.emptyState}>
          <Typography variant="h5" gutterBottom>
            Acesso Negado
          </Typography>
          <Typography variant="body1">
            Esta página é restrita apenas ao administrador da empresa principal.
          </Typography>
        </Box>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <MainHeader>
        <Title>Vídeos Tutoriais</Title>
        <MainHeaderButtonsWrapper>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenModal()}
          >
            Novo Vídeo
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
        <Box className={classes.searchContainer}>
          <TextField
            className={classes.searchField}
            placeholder="Buscar por título ou descrição..."
            variant="outlined"
            size="small"
            value={searchParam}
            onChange={(e) => setSearchParam(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Chip
            label={`${tutorialVideos.length} vídeo${tutorialVideos.length === 1 ? "" : "s"}`}
            color="default"
          />
        </Box>

        <Box className={classes.cardsWrapper}>
          {loading ? (
            <Grid container spacing={3} className={classes.cardsGrid}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
                  <div className={classes.skeletonCard} />
                </Grid>
              ))}
            </Grid>
          ) : tutorialVideos.length === 0 ? (
            <Box className={classes.emptyState}>
              <VideoIcon style={{ fontSize: 48, marginBottom: 16 }} />
              <Typography variant="h6">Nenhum vídeo tutorial encontrado</Typography>
              <Typography variant="body2">
                Clique em "Novo Vídeo" para adicionar o primeiro tutorial
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3} className={classes.cardsGrid}>
              {tutorialVideos.map((video) => {
                const thumbnail =
                  video.thumbnailUrl ||
                  getVideoThumbnailFallback(video.videoUrl) ||
                  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=60";

                return (
                  <Grid item xs={12} sm={6} md={4} key={video.id}>
                    <Card className={classes.videoCard}>
                      <CardMedia
                        className={classes.videoCardMedia}
                        image={thumbnail}
                        title={video.title}
                      />
                      <CardContent className={classes.cardContent}>
                        <Box className={classes.cardStatusRow}>
                          <Chip
                            label={video.isActive ? "Ativo" : "Inativo"}
                            color={video.isActive ? "primary" : "default"}
                            size="small"
                          />
                          <Chip
                            icon={<ViewIcon style={{ fontSize: 16 }} />}
                            label={`${video.viewsCount || 0} views`}
                            size="small"
                          />
                        </Box>
                        <Typography className={classes.cardTitle} title={video.title}>
                          {video.title}
                        </Typography>
                        <Typography className={classes.cardDescription}>
                          {video.description || "Sem descrição"}
                        </Typography>
                        <Typography className={classes.linkText} title={video.videoUrl}>
                          {video.videoUrl}
                        </Typography>
                        <Box className={classes.cardInfoRow}>
                          <Box className={classes.authorInfo}>
                            <Avatar style={{ width: 32, height: 32 }}>
                              {video.user?.name ? video.user.name[0].toUpperCase() : <PersonIcon fontSize="small" />}
                            </Avatar>
                            <Box>
                              <Typography variant="body2">
                                {video.user?.name || "Autor não informado"}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {formatDate(video.createdAt)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                      <CardActions className={classes.cardActions}>
                        <Tooltip title="Assistir">
                          <IconButton color="primary" onClick={() => handlePreviewVideo(video)}>
                            <PlayIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton onClick={() => handleOpenModal(video)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remover">
                          <IconButton onClick={() => handleDeleteClick(video)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Paper>

      {/* Modal de Criação/Edição */}
      <TutorialVideoModal
        open={modalOpen}
        onClose={handleCloseModal}
        tutorialVideo={selectedVideo}
        onSuccess={handleVideoSuccess}
      />

      {/* Preview usando VideoModal */}
      <VideoModal
        open={!!previewVideo}
        onClose={() => setPreviewVideo(null)}
        title={previewVideo?.title}
        description={previewVideo?.description}
        videoUrl={previewVideo?.videoUrl}
        thumbnailUrl={previewVideo?.thumbnailUrl}
        isYoutube={previewVideo?.isYoutube}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover o vídeo "{videoToDelete?.title}"?
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
            Esta ação pode ser desfeita reativando o vídeo posteriormente.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="secondary"
            variant="contained"
          >
            Remover
          </Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default TutorialVideos;
