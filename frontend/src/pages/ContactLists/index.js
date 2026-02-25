import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  IconButton,
  TextField,
  InputAdornment,
  Typography,
  Tooltip,
  CircularProgress,
} from "@material-ui/core";

import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import AddIcon from "@material-ui/icons/Add";
import ListAltIcon from "@material-ui/icons/ListAlt";
import PeopleIcon from "@material-ui/icons/People";
import DownloadIcon from "@material-ui/icons/GetApp";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import ContactListDialog from "../../components/ContactListDialog";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import planilhaExemplo from "../../assets/planilha.xlsx";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useSocket } from "../../context/SocketContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_CONTACTLISTS") {
    const contactLists = action.payload;
    const newContactLists = [];

    contactLists.forEach((contactList) => {
      const contactListIndex = state.findIndex((u) => u.id === contactList.id);
      if (contactListIndex !== -1) {
        state[contactListIndex] = contactList;
      } else {
        newContactLists.push(contactList);
      }
    });

    return [...state, ...newContactLists];
  }

  if (action.type === "UPDATE_CONTACTLIST") {
    const contactList = action.payload;
    const contactListIndex = state.findIndex((u) => u.id === contactList.id);

    if (contactListIndex !== -1) {
      state[contactListIndex] = contactList;
      return [...state];
    } else {
      return [contactList, ...state];
    }
  }

  if (action.type === "DELETE_CONTACTLIST") {
    const contactListId = action.payload;

    const contactListIndex = state.findIndex((u) => u.id === contactListId);
    if (contactListIndex !== -1) {
      state.splice(contactListIndex, 1);
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
    backgroundColor: "#e3f2fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#1976d2",
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
  downloadButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 8,
    backgroundColor: "#e8f5e9",
    color: "#4caf50",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 500,
    textDecoration: "none",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#c8e6c9",
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
    backgroundColor: "#e3f2fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#1976d2",
    },
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
  contactCount: {
    display: "flex",
    alignItems: "center",
    gap: 4,
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
}));

const ContactLists = () => {
  const classes = useStyles();
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedContactList, setSelectedContactList] = useState(null);
  const [deletingContactList, setDeletingContactList] = useState(null);
  const [contactListModalOpen, setContactListModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [contactLists, dispatch] = useReducer(reducer, []);
  const { user } = useContext(AuthContext);
  const { isConnected, on } = useSocket();


  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContactLists = async () => {
        try {
          const { data } = await api.get("/contact-lists/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_CONTACTLISTS", payload: data.records });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchContactLists();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    if (!isConnected || !user?.companyId) return;
    const companyId = user.companyId;

    const onContactListEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTLIST", payload: data.record });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACTLIST", payload: +data.id });
      }
    };

    const cleanup = on(`company-${companyId}-ContactList`, onContactListEvent);

    return () => {
      cleanup();
    };
  }, [isConnected, on, user?.companyId]);

  const handleOpenContactListModal = () => {
    setSelectedContactList(null);
    setContactListModalOpen(true);
  };

  const handleCloseContactListModal = () => {
    setSelectedContactList(null);
    setContactListModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditContactList = (contactList) => {
    setSelectedContactList(contactList);
    setContactListModalOpen(true);
  };

  const handleDeleteContactList = async (contactListId) => {
    try {
      await api.delete(`/contact-lists/${contactListId}`);
      toast.success(i18n.t("contactLists.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingContactList(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const goToContacts = (id) => {
    history.push(`/contact-lists/${id}/contacts`);
  };

  return (
    <Box className={classes.root} onScroll={handleScroll}>
      {/* Modais */}
      <ConfirmationModal
        title={
          deletingContactList &&
          `${i18n.t("contactLists.confirmationModal.deleteTitle")} ${deletingContactList.name}?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteContactList(deletingContactList.id)}
      >
        {i18n.t("contactLists.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <ContactListDialog
        open={contactListModalOpen}
        onClose={handleCloseContactListModal}
        aria-labelledby="form-dialog-title"
        contactListId={selectedContactList && selectedContactList.id}
      />

      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <Box className={classes.headerIcon}>
            <ListAltIcon />
          </Box>
          <Box>
            <Typography className={classes.headerTitle}>
              {i18n.t("contactLists.title")}
            </Typography>
            <Typography className={classes.headerSubtitle}>
              {contactLists.length} {contactLists.length === 1 ? "lista cadastrada" : "listas cadastradas"}
            </Typography>
          </Box>
        </Box>

        <Box className={classes.headerRight}>
          <a href={planilhaExemplo} download="planilha.xlsx" className={classes.downloadButton}>
            <DownloadIcon style={{ fontSize: 18 }} />
            Planilha Exemplo
          </a>
          <TextField
            placeholder={i18n.t("contacts.searchPlaceholder")}
            variant="outlined"
            size="small"
            value={searchParam}
            onChange={handleSearch}
            className={classes.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "#999" }} />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title={i18n.t("contactLists.buttons.add")}>
            <button className={classes.addButton} onClick={handleOpenContactListModal}>
              <AddIcon style={{ fontSize: 24 }} />
            </button>
          </Tooltip>
        </Box>
      </Box>

      {/* Content */}
      <Box className={classes.content}>
        {contactLists.length === 0 && !loading ? (
          <Box className={classes.emptyState}>
            <ListAltIcon />
            <Typography>Nenhuma lista encontrada</Typography>
          </Box>
        ) : (
          contactLists.map((contactList) => (
            <Box key={contactList.id} className={classes.listItem}>
              {/* Icon */}
              <Box className={classes.itemIcon}>
                <ListAltIcon />
              </Box>

              {/* Info */}
              <Box className={classes.itemInfo}>
                <Typography className={classes.itemName}>
                  {contactList.name}
                </Typography>
                <Box className={classes.itemDetails}>
                  <span>ID: {contactList.id}</span>
                  <span>•</span>
                  <Box className={classes.contactCount}>
                    <PeopleIcon style={{ fontSize: 14 }} />
                    <span>
                      {contactList.contactsCount || 0}{" "}
                      {contactList.contactsCount === 1 ? "contato" : "contatos"}
                    </span>
                  </Box>
                </Box>
              </Box>

              {/* Actions */}
              <Box className={classes.itemActions}>
                <Tooltip title="Ver Contatos">
                  <IconButton
                    size="small"
                    className={`${classes.actionButton} ${classes.viewButton}`}
                    onClick={() => goToContacts(contactList.id)}
                  >
                    <PeopleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar">
                  <IconButton
                    size="small"
                    className={`${classes.actionButton} ${classes.editButton}`}
                    onClick={() => handleEditContactList(contactList)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir">
                  <IconButton
                    size="small"
                    className={`${classes.actionButton} ${classes.deleteButton}`}
                    onClick={() => {
                      setConfirmModalOpen(true);
                      setDeletingContactList(contactList);
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))
        )}

        {loading && (
          <Box className={classes.loadingContainer}>
            <CircularProgress size={32} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ContactLists;
