import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  InputAdornment,
  CircularProgress,
  Grid,
} from "@material-ui/core";
import EditIcon from "@material-ui/icons/Edit";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import VisibilityIcon from "@material-ui/icons/Visibility";
import CloseIcon from "@material-ui/icons/Close";
import AddIcon from "@material-ui/icons/Add";
import SearchIcon from "@material-ui/icons/Search";
import ShoppingBasketIcon from "@material-ui/icons/ShoppingBasket";
import api from "../../services/api";
import { useSystemAlert } from "../../components/SystemAlert";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f5f5f5",
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    backgroundColor: "#f5f5f5",
    borderBottom: "1px solid #e0e0e0",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#fff3e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#ff9800",
    },
  },
  headerTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  headerSubtitle: {
    fontSize: "0.875rem",
    color: "#666",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  searchField: {
    backgroundColor: "#fff",
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      "& fieldset": {
        borderColor: "#e0e0e0",
      },
      "&:hover fieldset": {
        borderColor: "#1976d2",
      },
    },
  },
  filterSelect: {
    minWidth: 180,
    backgroundColor: "#fff",
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
    },
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#333",
      transform: "scale(1.05)",
    },
  },
  content: {
    flex: 1,
    padding: "16px 24px",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    transition: "all 0.2s ease",
    "&:hover": {
      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    },
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#fff3e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#ff9800",
    },
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    objectFit: "cover",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  itemName: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  itemDetails: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: "0.8rem",
    color: "#666",
  },
  itemValue: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#4caf50",
  },
  statusChip: {
    fontWeight: 500,
    fontSize: "0.75rem",
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  viewButton: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    "&:hover": {
      backgroundColor: "#bbdefb",
    },
  },
  editButton: {
    backgroundColor: "#fff3e0",
    color: "#ff9800",
    "&:hover": {
      backgroundColor: "#ffe0b2",
    },
  },
  deleteButton: {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    "&:hover": {
      backgroundColor: "#ffcdd2",
    },
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    color: "#999",
    "& svg": {
      fontSize: 64,
      marginBottom: 16,
      opacity: 0.5,
    },
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "24px",
  },
  field: {
    marginBottom: theme.spacing(2),
  },
}));

const TIPOS = [
  { value: "imovel", label: "Imóvel" },
  { value: "fisico", label: "Físico" },
  { value: "servico", label: "Serviço" },
  { value: "veiculo", label: "Veículo" }
];

const STATUS_LIST = [
  { value: "disponivel", label: "Disponível" },
  { value: "indisponivel", label: "Indisponível" }
];

const ProdutosPage = () => {
  const classes = useStyles();
  const { showConfirm } = useSystemAlert();

  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");

  const [filterTipo, setFilterTipo] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState(1); // 1 = escolher tipo, 2 = demais campos
  const [editingId, setEditingId] = useState(null);

  const [tipo, setTipo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState("disponivel");
  const [imagemPrincipal, setImagemPrincipal] = useState(""); // caminho/identificador futuro
  const [imagemPrincipalFile, setImagemPrincipalFile] = useState(null); // File selecionado
  const [galeriaFiles, setGaleriaFiles] = useState([]); // Novos Files da galeria (ainda não enviados)
  const [galeriaAtual, setGaleriaAtual] = useState([]); // Galeria já salva no banco
  const [saving, setSaving] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewProduto, setViewProduto] = useState(null);

  const resetForm = () => {
    setEditingId(null);
    setDialogStep(1);
    setTipo("");
    setNome("");
    setDescricao("");
    setValor("");
    setStatus("disponivel");
    setImagemPrincipal("");
    setImagemPrincipalFile(null);
    setGaleriaFiles([]);
    setGaleriaAtual([]);
  };

  const loadProdutos = async (tipoFiltro = filterTipo) => {
    setLoading(true);
    try {
      const params = {};
      if (tipoFiltro) {
        params.tipo = tipoFiltro;
      }

      const { data } = await api.get("/produtos", { params });
      setProdutos(data || []);
    } catch (err) {
      console.error("Erro ao carregar produtos", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProdutos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = async event => {
    const value = event.target.value;
    setFilterTipo(value);
    await loadProdutos(value);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = produto => {
    setEditingId(produto.id);
    setTipo(produto.tipo || "");
    setNome(produto.nome || "");
    setDescricao(produto.descricao || "");
    setValor(produto.valor != null ? String(produto.valor) : "");
    setStatus(produto.status || "disponivel");
    setImagemPrincipal(produto.imagem_principal || "");
    setImagemPrincipalFile(null);
    setGaleriaFiles([]);
    setGaleriaAtual(Array.isArray(produto.galeria) ? produto.galeria : []);
    setDialogStep(2);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleNextStep = () => {
    if (!tipo) return;
    setDialogStep(2);
  };

  const handleSave = async event => {
    event.preventDefault();
    if (!tipo || !nome || !valor) return;

    setSaving(true);

    try {
      // 1) Upload da imagem principal, se um novo arquivo foi selecionado
      let mainImage = imagemPrincipal || null;
      if (imagemPrincipalFile) {
        const formData = new FormData();
        formData.append("typeArch", "produtos");
        formData.append("file", imagemPrincipalFile);

        const { data } = await api.post("/produtos/upload-imagem", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        mainImage = data.filename || null;
      }

      // 2) Upload da galeria, se houver novos arquivos selecionados
      let galeriaNovas = [];
      if (galeriaFiles.length > 0) {
        const filenames = [];
        for (const file of galeriaFiles) {
          const formData = new FormData();
          formData.append("typeArch", "produtos");
          formData.append("file", file);

          const { data } = await api.post("/produtos/upload-imagem", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });

          if (data.filename) {
            filenames.push(data.filename);
          }
        }

        if (filenames.length > 0) {
          galeriaNovas = filenames;
        }
      }

      const galeriaFinal = [...(Array.isArray(galeriaAtual) ? galeriaAtual : []), ...galeriaNovas];

      const payload = {
        tipo,
        nome,
        descricao,
        valor: Number(valor),
        status,
        imagem_principal: mainImage,
        ...(galeriaFinal.length ? { galeria: galeriaFinal } : {})
      };

      try {
        if (editingId) {
          await api.put(`/produtos/${editingId}`, payload);
        } else {
          await api.post("/produtos", payload);
        }

        await loadProdutos();
        setDialogOpen(false);
        resetForm();
      } catch (err) {
        console.error("Erro ao salvar produto", err);
      } finally {
        setSaving(false);
      }
    } catch (err) {
      console.error("Erro ao salvar produto", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    const confirmed = await showConfirm({
      type: "error",
      title: "Excluir Produto",
      message: "Deseja realmente excluir este produto?",
      confirmText: "Sim, excluir",
      cancelText: "Cancelar",
    });
    if (!confirmed) return;

    try {
      await api.delete(`/produtos/${id}`);
      await loadProdutos();
    } catch (err) {
      console.error("Erro ao excluir produto", err);
    }
  };

  const renderTipoLabel = value => {
    const item = TIPOS.find(t => t.value === value);
    return item ? item.label : value;
  };

  const renderStatusLabel = value => {
    const item = STATUS_LIST.find(s => s.value === value);
    return item ? item.label : value;
  };

  const getImageUrl = (companyId, filename) => {
    if (!filename) return null;
    const baseUrl = (window._env_?.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL) || "";


    // Novo formato: já vem com caminho completo relativo (ex.: company1/produtos/arquivo.png)
    if (filename.includes("company")) {
      return `${baseUrl}/public/${filename}`;
    }

    // Formato legado: apenas o nome do arquivo salvo na raiz da pasta da company
    if (companyId) {
      return `${baseUrl}/public/company${companyId}/${filename}`;
    }

    // Fallback genérico
    return `${baseUrl}/public/${filename}`;
  };

  const handleRemoveGaleriaImage = async (produto, index) => {
    if (!Array.isArray(produto.galeria)) return;

    const novaGaleria = produto.galeria.filter((_, i) => i !== index);

    try {
      await api.put(`/produtos/${produto.id}`, { galeria: novaGaleria });

      // atualiza lista completa
      await loadProdutos(filterTipo);

      // atualiza produto em visualização, se for o mesmo
      if (viewProduto && viewProduto.id === produto.id) {
        setViewProduto({ ...viewProduto, galeria: novaGaleria });
      }
    } catch (err) {
      console.error("Erro ao remover imagem da galeria", err);
    }
  };

  const filteredProdutos = produtos.filter((produto) =>
    produto.nome?.toLowerCase().includes(searchParam.toLowerCase())
  );

  const getStatusChip = (status) => {
    if (status === "disponivel") {
      return (
        <Chip
          label="Disponível"
          size="small"
          className={classes.statusChip}
          style={{ backgroundColor: "#e8f5e9", color: "#4caf50" }}
        />
      );
    }
    return (
      <Chip
        label="Indisponível"
        size="small"
        className={classes.statusChip}
        style={{ backgroundColor: "#ffebee", color: "#d32f2f" }}
      />
    );
  };

  return (
    <Box className={classes.root}>
      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <Box className={classes.headerIcon}>
            <ShoppingBasketIcon />
          </Box>
          <Box>
            <Typography className={classes.headerTitle}>Produtos</Typography>
            <Typography className={classes.headerSubtitle}>
              {produtos.length} {produtos.length === 1 ? "produto cadastrado" : "produtos cadastrados"}
            </Typography>
          </Box>
        </Box>

        <Box className={classes.headerRight}>
          <FormControl variant="outlined" size="small" className={classes.filterSelect}>
            <InputLabel id="filter-tipo-label">Tipo</InputLabel>
            <Select
              labelId="filter-tipo-label"
              value={filterTipo}
              onChange={handleFilterChange}
              label="Tipo"
            >
              <MenuItem value="">
                <em>Todos</em>
              </MenuItem>
              {TIPOS.map(t => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            placeholder="Buscar produto..."
            variant="outlined"
            size="small"
            value={searchParam}
            onChange={(e) => setSearchParam(e.target.value)}
            className={classes.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "#999" }} />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Adicionar Produto">
            <button className={classes.addButton} onClick={handleOpenCreate}>
              <AddIcon style={{ fontSize: 24 }} />
            </button>
          </Tooltip>
        </Box>
      </Box>

      {/* Content */}
      <Box className={classes.content}>
        {loading ? (
          <Box className={classes.loadingContainer}>
            <CircularProgress size={32} />
          </Box>
        ) : filteredProdutos.length === 0 ? (
          <Box className={classes.emptyState}>
            <ShoppingBasketIcon />
            <Typography>Nenhum produto encontrado</Typography>
          </Box>
        ) : (
          filteredProdutos.map((produto) => (
            <Box key={produto.id} className={classes.listItem}>
              {/* Icon ou Imagem */}
              {produto.imagem_principal ? (
                <img
                  src={getImageUrl(produto.companyId, produto.imagem_principal)}
                  alt={produto.nome}
                  className={classes.itemImage}
                />
              ) : (
                <Box className={classes.itemIcon}>
                  <ShoppingBasketIcon />
                </Box>
              )}

              {/* Info */}
              <Box className={classes.itemInfo}>
                <Typography className={classes.itemName}>{produto.nome}</Typography>
                <Box className={classes.itemDetails}>
                  <span>ID: {produto.id}</span>
                  <span>•</span>
                  <span>{renderTipoLabel(produto.tipo)}</span>
                  <span>•</span>
                  {getStatusChip(produto.status)}
                </Box>
              </Box>

              {/* Valor */}
              <Typography className={classes.itemValue}>
                R$ {Number(produto.valor || 0).toFixed(2)}
              </Typography>

              {/* Actions */}
              <Box className={classes.itemActions} style={{ marginLeft: 16 }}>
                <Tooltip title="Visualizar Imagens">
                  <IconButton
                    size="small"
                    className={`${classes.actionButton} ${classes.viewButton}`}
                    onClick={() => {
                      setViewProduto(produto);
                      setViewDialogOpen(true);
                    }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar">
                  <IconButton
                    size="small"
                    className={`${classes.actionButton} ${classes.editButton}`}
                    onClick={() => handleOpenEdit(produto)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir">
                  <IconButton
                    size="small"
                    className={`${classes.actionButton} ${classes.deleteButton}`}
                    onClick={() => handleDelete(produto.id)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? "Editar produto" : "Adicionar produto"}
        </DialogTitle>
        <DialogContent>
          {dialogStep === 1 && (
            <FormControl variant="outlined" fullWidth className={classes.field}>
              <InputLabel id="tipo-label">Tipo do produto</InputLabel>
              <Select
                labelId="tipo-label"
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                label="Tipo do produto"
              >
                {TIPOS.map(t => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {dialogStep === 2 && (
            <form id="produto-form" onSubmit={handleSave}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl variant="outlined" fullWidth className={classes.field}>
                    <InputLabel id="tipo-edit-label">Tipo do produto</InputLabel>
                    <Select
                      labelId="tipo-edit-label"
                      value={tipo}
                      onChange={e => setTipo(e.target.value)}
                      label="Tipo do produto"
                      required
                    >
                      {TIPOS.map(t => (
                        <MenuItem key={t.value} value={t.value}>
                          {t.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl variant="outlined" fullWidth className={classes.field}>
                    <InputLabel id="status-label">Status</InputLabel>
                    <Select
                      labelId="status-label"
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      label="Status"
                      required
                    >
                      {STATUS_LIST.map(s => (
                        <MenuItem key={s.value} value={s.value}>
                          {s.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Nome do produto"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    variant="outlined"
                    fullWidth
                    className={classes.field}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Descrição"
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={3}
                    className={classes.field}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Valor"
                    type="number"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    variant="outlined"
                    fullWidth
                    className={classes.field}
                    required
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <div className={classes.field}>
                    <Typography variant="subtitle2" gutterBottom>
                      Imagem principal
                    </Typography>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files && e.target.files[0];
                        setImagemPrincipalFile(file || null);
                        // quando o backend de upload estiver pronto, vamos enviar este file
                      }}
                    />
                    {imagemPrincipal && (
                      <Typography variant="caption" display="block">
                        Arquivo atual: {imagemPrincipal}
                      </Typography>
                    )}
                  </div>
                </Grid>

                <Grid item xs={12}>
                  <div className={classes.field}>
                    <Typography variant="subtitle2" gutterBottom>
                      Galeria de imagens
                    </Typography>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={e => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        setGaleriaFiles(files);
                        // futuramente: enviar files para endpoint de upload e salvar paths em galeria
                      }}
                    />
                    {galeriaFiles.length > 0 && (
                      <Typography variant="caption" display="block">
                        {galeriaFiles.length} arquivo(s) selecionado(s) para galeria
                      </Typography>
                    )}
                  </div>
                </Grid>
              </Grid>
            </form>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          {dialogStep === 1 && (
            <Button
              color="primary"
              variant="contained"
              onClick={handleNextStep}
              disabled={!tipo}
            >
              Próximo
            </Button>
          )}
          {dialogStep === 2 && (
            <Button
              color="primary"
              variant="contained"
              type="submit"
              form="produto-form"
              disabled={saving}
            >
              {editingId ? "Salvar alterações" : "Criar produto"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setViewProduto(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Imagens do produto</DialogTitle>
        <DialogContent>
          {viewProduto && (
            <Grid container spacing={2}>
              {viewProduto.imagem_principal && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Imagem principal
                  </Typography>
                  <img
                    src={getImageUrl(viewProduto.companyId, viewProduto.imagem_principal)}
                    alt={viewProduto.nome}
                    style={{ maxWidth: "100%", borderRadius: 8 }}
                  />
                </Grid>
              )}

              {Array.isArray(viewProduto.galeria) && viewProduto.galeria.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Galeria
                  </Typography>
                  <Grid container spacing={2}>
                    {viewProduto.galeria.map((img, index) => (
                      <Grid item xs={6} sm={4} md={3} key={`${img}-${index}`}>
                        <div style={{ position: "relative" }}>
                          <img
                            src={getImageUrl(viewProduto.companyId, img)}
                            alt={`${viewProduto.nome} ${index + 1}`}
                            style={{ width: "100%", borderRadius: 8, objectFit: "cover" }}
                          />
                          <IconButton
                            size="small"
                            style={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              backgroundColor: "rgba(0,0,0,0.6)",
                              color: "#fff"
                            }}
                            onClick={() => handleRemoveGaleriaImage(viewProduto, index)}
                          >
                            <CloseIcon style={{ fontSize: 16 }} />
                          </IconButton>
                        </div>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}

              {!viewProduto.imagem_principal &&
                (!viewProduto.galeria || viewProduto.galeria.length === 0) && (
                  <Grid item xs={12}>
                    <Typography>Nenhuma imagem cadastrada para este produto.</Typography>
                  </Grid>
                )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setViewDialogOpen(false);
              setViewProduto(null);
            }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ProdutosPage;