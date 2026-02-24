import React, { useState, useEffect, useReducer, useContext, useCallback } from "react";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  IconButton,
  TextField,
  InputAdornment,
  Typography,
  Tooltip,
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import AddIcon from "@material-ui/icons/Add";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import ImageIcon from "@material-ui/icons/Image";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import QuickMessageDialog from "../../components/QuickMessageDialog";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { useSocket } from "../../context/SocketContext";
import useSafeApi from "../../hooks/useSafeApi";
import SafeComponent from "../../components/SafeComponent";
import { isArray } from "lodash";
import { AuthContext } from "../../context/Auth/AuthContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_QUICKMESSAGES") {
    const quickmessages = action.payload;
    const newQuickmessages = [];

    if (isArray(quickmessages)) {
      quickmessages.forEach((quickemessage) => {
        const quickemessageIndex = state.findIndex(
          (u) => u.id === quickemessage.id
        );
        if (quickemessageIndex !== -1) {
          state[quickemessageIndex] = quickemessage;
        } else {
          newQuickmessages.push(quickemessage);
        }
      });
    }

    return [...state, ...newQuickmessages];
  }

  if (action.type === "UPDATE_QUICKMESSAGES") {
    const quickemessage = action.payload;
    const quickemessageIndex = state.findIndex((u) => u.id === quickemessage.id);

    if (quickemessageIndex !== -1) {
      state[quickemessageIndex] = quickemessage;
      return [...state];
    } else {
      return [quickemessage, ...state];
    }
  }

  if (action.type === "DELETE_QUICKMESSAGE") {
    const quickemessageId = action.payload;

    const quickemessageIndex = state.findIndex((u) => u.id === quickemessageId);
    if (quickemessageIndex !== -1) {
      state.splice(quickemessageIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(3),
    gap: theme.spacing(3),
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  titleContainer: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  titleIcon: {
    color: theme.palette.primary.main,
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.palette.text.secondary,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  searchField: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
    },
  },
  addButton: {
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    width: 40,
    height: 40,
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
  },
  content: {
    flex: 1,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1.5, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    gap: theme.spacing(2),
    "&:last-child": {
      borderBottom: "none",
    },
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    flexShrink: 0,
  },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    objectFit: "cover",
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: 600,
    color: theme.palette.text.primary,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  itemId: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  itemActions: {
    display: "flex",
    gap: theme.spacing(1),
  },
  editButton: {
    backgroundColor: "rgba(63, 81, 181, 0.1)",
    color: theme.palette.primary.main,
    width: 36,
    height: 36,
    "&:hover": {
      backgroundColor: "rgba(63, 81, 181, 0.2)",
    },
  },
  deleteButton: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    color: "#f44336",
    width: 36,
    height: 36,
    "&:hover": {
      backgroundColor: "rgba(244, 67, 54, 0.2)",
    },
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(6),
    color: theme.palette.text.secondary,
  },
}));

const QuickMessages = () => {
  const classes = useStyles();

  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedQuickemessage, setSelectedQuickemessage] = useState(null);
  const [deletingQuickemessage, setDeletingQuickemessage] = useState(null);
  const [quickemessageModalOpen, setQuickMessageDialogOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");

  const { data: quickemessages, loading: loadingQuickMessages, error: errorQuickMessages, setData: setQuickemessages, request: fetchQuickemessagesApi } = useSafeApi("/quick-messages", { manual: true });

  const { user } = useContext(AuthContext);
  const { isReady, on } = useSocket();

  useEffect(() => {
    setQuickemessages([]);
    setPageNumber(1);
  }, [searchParam, setQuickemessages]);

  const fetchQuickemessages = useCallback(async () => {
    try {
      const data = await fetchQuickemessagesApi({
        params: { searchParam, pageNumber },
      });

      if (data) {
        setQuickemessages((prev) => {
          if (pageNumber === 1) return data.records || [];
          return [...prev, ...(data.records || [])];
        });
        setHasMore(data.hasMore);
      }
    } catch (err) {
      toastError(err);
    }
  }, [searchParam, pageNumber, fetchQuickemessagesApi, setQuickemessages]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchQuickemessages();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchQuickemessages]);

  useEffect(() => {
    if (!isReady || !user.companyId) return;

    const cleanup = on(`company-${user.companyId}-quickemessage`, (data) => {
      if (data.action === "update" || data.action === "create") {
        setQuickemessages((prev) => {
          const aux = [...prev];
          const index = aux.findIndex((u) => u.id === data.record.id);
          if (index !== -1) {
            aux[index] = data.record;
            return aux;
          } else {
            return [data.record, ...aux];
          }
        });
      }
      if (data.action === "delete") {
        setQuickemessages((prev) => {
          const aux = [...prev];
          const index = aux.findIndex((u) => u.id === +data.id);
          if (index !== -1) {
            aux.splice(index, 1);
          }
          return aux;
        });
      }
    });

    return cleanup;
  }, [isReady, user.companyId, on, setQuickemessages]);

  const handleOpenQuickMessageDialog = () => {
    setSelectedQuickemessage(null);
    setQuickMessageDialogOpen(true);
  };

  const handleCloseQuickMessageDialog = () => {
    setSelectedQuickemessage(null);
    setQuickMessageDialogOpen(false);
    fetchQuickemessages();
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditQuickemessage = (quickemessage) => {
    setSelectedQuickemessage(quickemessage);
    setQuickMessageDialogOpen(true);
  };

  const handleDeleteQuickemessage = async (quickemessageId) => {
    try {
      await api.delete(`/quick-messages/${quickemessageId}`);
      toast.success("Resposta rápida excluída com sucesso");
    } catch (err) {
      toastError(err);
    }
    setDeletingQuickemessage(null);
    setSearchParam("");
    setPageNumber(1);
    fetchQuickemessages();
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loadingQuickMessages) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  return (
    <Box className={classes.root}>
      <ConfirmationModal
        title={
          deletingQuickemessage &&
          `${i18n.t("quickMessages.confirmationModal.deleteTitle")} ${deletingQuickemessage.shortcode}?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteQuickemessage(deletingQuickemessage.id)}
      >
        {i18n.t("quickMessages.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <QuickMessageDialog
        resetPagination={() => {
          setPageNumber(1);
          fetchQuickemessages();
        }}
        open={quickemessageModalOpen}
        onClose={handleCloseQuickMessageDialog}
        aria-labelledby="form-dialog-title"
        quickemessageId={selectedQuickemessage && selectedQuickemessage.id}
      />

      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.titleContainer}>
          <FlashOnIcon className={classes.titleIcon} />
          <Box>
            <Typography className={classes.title}>
              {i18n.t("quickMessages.title")}
            </Typography>
            <Typography className={classes.subtitle}>
              Gerencie suas respostas rápidas
            </Typography>
          </Box>
        </Box>

        <Box className={classes.actions}>
          <TextField
            size="small"
            variant="outlined"
            placeholder={i18n.t("quickMessages.searchPlaceholder")}
            value={searchParam}
            onChange={handleSearch}
            className={classes.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="disabled" />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Adicionar resposta rápida">
            <IconButton
              className={classes.addButton}
              onClick={handleOpenQuickMessageDialog}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Content - Lista */}
      <Box className={classes.content} onScroll={handleScroll}>
        <SafeComponent
          loading={loadingQuickMessages && quickemessages.length === 0}
          error={errorQuickMessages}
          data={quickemessages}
          renderData={(records) => {
            if (records.length === 0) {
              return (
                <Box className={classes.emptyState}>
                  <FlashOnIcon style={{ fontSize: 48, marginBottom: 8 }} />
                  <Typography>Nenhuma resposta rápida encontrada</Typography>
                </Box>
              );
            }

            return records.map((quickemessage) => (
              <Box key={quickemessage.id} className={classes.listItem}>
                {/* Ícone ou Imagem */}
                {quickemessage.mediaPath ? (
                  <img
                    src={quickemessage.mediaPath}
                    alt={quickemessage.shortcode}
                    className={classes.itemImage}
                  />
                ) : (
                  <Box className={classes.itemIcon}>
                    <FlashOnIcon />
                  </Box>
                )}

                {/* Info */}
                <Box className={classes.itemInfo}>
                  <Typography className={classes.itemName}>
                    {quickemessage.shortcode}
                  </Typography>
                  <Typography className={classes.itemId}>
                    ID: {quickemessage.id}
                  </Typography>
                </Box>

                {/* Ações */}
                <Box className={classes.itemActions}>
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      className={classes.editButton}
                      onClick={() => handleEditQuickemessage(quickemessage)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton
                      size="small"
                      className={classes.deleteButton}
                      onClick={() => {
                        setConfirmModalOpen(true);
                        setDeletingQuickemessage(quickemessage);
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ));
          }}
        />
      </Box>
    </Box>
  );
};

export default QuickMessages;