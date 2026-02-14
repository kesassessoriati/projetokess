import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Photo as PhotoIcon
} from "@material-ui/icons";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import SliderBannerModal from "../../components/SliderBannerModal";
import { AuthContext } from "../../context/Auth/AuthContext";
import { getBackendUrl } from "../../config";
import {
  listSliderBanners,
  deleteSliderBanner
} from "../../services/sliderHomeService";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  cardsGrid: {
    marginTop: theme.spacing(1),
  },
  bannerCard: {
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
    height: "100%",
    display: "flex",
    flexDirection: "column"
  },
  cardMedia: {
    height: 200,
    backgroundColor: theme.palette.action.hover,
  },
  cardContent: {
    flex: 1,
  },
  emptyState: {
    textAlign: "center",
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
  searchWrapper: {
    marginBottom: theme.spacing(2),
    display: "flex",
    gap: theme.spacing(2),
    alignItems: "center"
  }
}));

const SliderBannersPage = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const isAuthorized = user && user.companyId === 1 && user.profile === "admin";

  const [banners, setBanners] = useState([]);
  const [filteredBanners, setFilteredBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState(null);

  useEffect(() => {
    if (isAuthorized) {
      fetchBanners();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredBanners(banners);
    } else {
      const term = search.toLowerCase();
      setFilteredBanners(banners.filter((b) => b.name.toLowerCase().includes(term)));
    }
  }, [search, banners]);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const { data } = await listSliderBanners();
      setBanners(Array.isArray(data) ? data : data?.sliderBanners || []);
    } catch (error) {
      console.error("Erro ao carregar banners:", error);
      toast.error("Não foi possível carregar os banners");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (banner = null) => {
    setSelectedBanner(banner);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedBanner(null);
    setModalOpen(false);
  };

  const handleModalSuccess = () => {
    fetchBanners();
  };

  const handleDelete = (banner) => {
    setBannerToDelete(banner);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!bannerToDelete) return;
    try {
      await deleteSliderBanner(bannerToDelete.id);
      toast.success("Banner removido com sucesso!");
      fetchBanners();
    } catch (error) {
      console.error("Erro ao remover banner:", error);
      toast.error("Não foi possível remover o banner");
    } finally {
      setDeleteDialogOpen(false);
      setBannerToDelete(null);
    }
  };

  const backendBaseUrl = getBackendUrl()?.replace(/\/$/, "");

  const getImageUrl = (path) => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;

    const normalized = path.replace(/\\/g, "/");
    const publicIndex = normalized.indexOf("/public/");
    let relativePath = normalized;

    if (publicIndex >= 0) {
      relativePath = normalized.slice(publicIndex + 1); // remove leading slash before "public"
    } else {
      relativePath = normalized.replace(/^\/+/, "");
      if (!relativePath.startsWith("public/")) {
        relativePath = `public/${relativePath}`;
      }
    }

    if (backendBaseUrl) {
      return `${backendBaseUrl}/${relativePath}`;
    }

    return `/${relativePath}`;
  };

  if (!isAuthorized) {
    return (
      <MainContainer>
        <Paper className={classes.mainPaper}>
          <Box className={classes.emptyState}>
            <Typography variant="h5" gutterBottom>
              Acesso negado
            </Typography>
            <Typography variant="body1">
              Esta página é restrita ao administrador da empresa principal.
            </Typography>
          </Box>
        </Paper>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <MainHeader>
        <Title>Banners do Slider</Title>
        <MainHeaderButtonsWrapper>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            color="primary"
            onClick={() => handleOpenModal()}
          >
            Novo Banner
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
        <Box className={classes.searchWrapper}>
          <TextField
            label="Buscar por nome"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Typography variant="body2" color="textSecondary">
            {filteredBanners.length} banner{filteredBanners.length === 1 ? "" : "s"}
          </Typography>
        </Box>

        {loading ? (
          <Box className={classes.emptyState}>
            <Typography>Carregando banners...</Typography>
          </Box>
        ) : filteredBanners.length === 0 ? (
          <Box className={classes.emptyState}>
            <PhotoIcon style={{ fontSize: 48, marginBottom: 16 }} />
            <Typography variant="h6">Nenhum banner cadastrado</Typography>
            <Typography variant="body2">
              Clique em "Novo Banner" para adicionar a primeira imagem.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3} className={classes.cardsGrid}>
            {filteredBanners.map((banner) => (
              <Grid item xs={12} sm={6} md={4} key={banner.id}>
                <Card className={classes.bannerCard}>
                  <CardMedia
                    className={classes.cardMedia}
                    image={getImageUrl(banner.image)}
                    title={banner.name}
                  />
                  <CardContent className={classes.cardContent}>
                    <Typography variant="h6">{banner.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      ID #{banner.id}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <IconButton onClick={() => handleOpenModal(banner)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(banner)}>
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      <SliderBannerModal
        open={modalOpen}
        onClose={handleCloseModal}
        banner={selectedBanner}
        onSuccess={handleModalSuccess}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Remover Banner</DialogTitle>
        <DialogContent>
          <Typography>
            Deseja remover definitivamente o banner "{bannerToDelete?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button color="secondary" variant="contained" onClick={confirmDelete}>
            Remover
          </Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default SliderBannersPage;
