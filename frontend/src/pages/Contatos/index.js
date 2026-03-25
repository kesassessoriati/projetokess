import React, { useState, useEffect, useReducer, useContext, useRef } from "react";
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
  Avatar,
  Checkbox,
  Menu,
  MenuItem,
  Button,
  Dialog,
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import AddIcon from "@material-ui/icons/Add";
import PersonIcon from "@material-ui/icons/Person";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import BlockIcon from "@material-ui/icons/Block";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import FileUploadIcon from "@material-ui/icons/CloudUpload";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ContactPhoneIcon from "@material-ui/icons/ContactPhone";
import BackupIcon from "@material-ui/icons/Backup";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import NewTicketModal from "../../components/NewTicketModal";
import { TagsFilter } from "../../components/TagsFilter";
import { v4 as uuidv4 } from "uuid";
import ContactImportWpModal from "../../components/ContactImportWpModal";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import useSafeApi from "../../hooks/useSafeApi";
import { useSocket } from "../../context/SocketContext";
import SafeComponent from "../../components/SafeComponent";
import {
  List,
  CircularProgress,
} from "@material-ui/core";

const reducer = (state, action) => {
  if (action.type === "LOAD_CONTACTS") {
    const contacts = action.payload;
    const newContacts = [];

    contacts.forEach((contact) => {
      const contactIndex = state.findIndex((c) => c.id === contact.id);
      if (contactIndex !== -1) {
        state[contactIndex] = contact;
      } else {
        newContacts.push(contact);
      }
    });

    return [...state, ...newContacts];
  }

  if (action.type === "UPDATE_CONTACTS") {
    const contact = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contact.id);

    if (contactIndex !== -1) {
      state[contactIndex] = contact;
      return [...state];
    } else {
      return [contact, ...state];
    }
  }

  if (action.type === "DELETE_CONTACT") {
    const contactId = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contactId);
    if (contactIndex !== -1) {
      state.splice(contactIndex, 1);
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
    overflowY: "auto",
    overflowX: "hidden",
    ...theme.scrollbarStyles,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
      gap: theme.spacing(1),
      paddingBottom: "100px",
    },
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
      alignItems: "stretch",
      gap: theme.spacing(1),
    },
  },
  titleContainer: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
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
    flexWrap: "wrap",
    [theme.breakpoints.down("sm")]: {
      width: "100%",
      justifyContent: "space-between",
    },
  },
  searchField: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: 8,
    minWidth: 200,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
    },
    [theme.breakpoints.down("sm")]: {
      minWidth: "100%",
      flex: 1,
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
  importButton: {
    backgroundColor: "#4caf50",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#388e3c",
    },
  },
  content: {
    flex: 1,
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
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
      gap: theme.spacing(1),
      flexWrap: "wrap",
    },
  },
  itemAvatar: {
    width: 48,
    height: 48,
    cursor: "pointer",
    border: `2px solid ${theme.palette.primary.main}`,
    [theme.breakpoints.down("sm")]: {
      width: 40,
      height: 40,
    },
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    [theme.breakpoints.down("sm")]: {
      flex: "1 1 calc(100% - 100px)",
    },
  },
  itemName: {
    fontSize: 15,
    fontWeight: 600,
    color: theme.palette.text.primary,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  itemDetails: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    [theme.breakpoints.down("sm")]: {
      fontSize: 10,
      gap: theme.spacing(0.5),
    },
  },
  itemStatus: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  statusActive: {
    color: "#4caf50",
    fontSize: 14,
  },
  statusBlocked: {
    color: "#f44336",
    fontSize: 14,
  },
  itemActions: {
    display: "flex",
    gap: theme.spacing(1),
    [theme.breakpoints.down("sm")]: {
      gap: theme.spacing(0.5),
      marginLeft: "auto",
    },
  },
  actionButton: {
    width: 36,
    height: 36,
    [theme.breakpoints.down("sm")]: {
      width: 28,
      height: 28,
    },
  },
  whatsappButton: {
    backgroundColor: "rgba(37, 211, 102, 0.1)",
    color: "#25D366",
    "&:hover": {
      backgroundColor: "rgba(37, 211, 102, 0.2)",
    },
  },
  editButton: {
    backgroundColor: "rgba(63, 81, 181, 0.1)",
    color: theme.palette.primary.main,
    "&:hover": {
      backgroundColor: "rgba(63, 81, 181, 0.2)",
    },
  },
  blockButton: {
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    color: "#ff9800",
    "&:hover": {
      backgroundColor: "rgba(255, 152, 0, 0.2)",
    },
  },
  unblockButton: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    color: "#4caf50",
    "&:hover": {
      backgroundColor: "rgba(76, 175, 80, 0.2)",
    },
  },
  deleteButton: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    color: "#f44336",
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
  bulkActions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.action.selected,
    borderRadius: 8,
    marginBottom: theme.spacing(2),
  },
  hideOnMobile: {
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
}));

const ExpandableAvatar = ({ contact, classes }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Avatar
        src={contact?.urlPicture}
        className={classes.itemAvatar}
        onClick={() => setOpen(true)}
      >
        {!contact?.urlPicture && <PersonIcon />}
      </Avatar>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <img
          src={contact?.urlPicture}
          alt="Contact"
          style={{ maxWidth: "90vw", maxHeight: "90vh" }}
        />
      </Dialog>
    </>
  );
};




const Contatos = () => {
  const classes = useStyles();
  const history = useHistory();

  const { user } = useContext(AuthContext);
  const { setCurrentTicket } = useContext(TicketsContext);

  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [contacts, dispatch] = useReducer(reducer, []);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [importContactModalOpen, setImportContactModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(null);
  const [blockingContact, setBlockingContact] = useState(null);
  const [unBlockingContact, setUnBlockingContact] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [contactTicket, setContactTicket] = useState({});
  const fileUploadRef = useRef(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [importWhatsappId, setImportWhatsappId] = useState();
  const [ImportContacts, setImportContacts] = useState(null);
  const isMounted = useRef(true);

  const { getAll: getAllSettings } = useCompanySettings();
  const [hideNum, setHideNum] = useState(false);

  // Menu de importação
  const [anchorEl, setAnchorEl] = useState(null);

  const getDisplayName = (c) => {
    if (!c || !c.name) return "Contato sem nome";
    const onlyDigits = /^\+?\d+$/.test(c.name.replace(/\s+/g, ""));
    return onlyDigits ? "Contato sem nome" : c.name;
  };

  useEffect(() => {
    async function fetchData() {
      const settingList = await getAllSettings(user.companyId);
      for (const [key, value] of Object.entries(settingList)) {
        if (key === "lgpdHideNumber") setHideNum(value === "enabled");
      }
    }
    fetchData();
  }, []);

  const {
    loading: loadingContacts,
    error: errorContacts,
    request: fetchContacts,
  } = useSafeApi("/contacts/", {
    manual: true
  });

  const { isReady, on } = useSocket();

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam, selectedTags]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!isMounted.current) return;
      const data = await fetchContacts({
        params: { searchParam, pageNumber, limit: 20, contactTag: JSON.stringify(selectedTags) }
      });
      if (data && isMounted.current) {
        dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
        setHasMore(data.hasMore);
        if (pageNumber === 1) setTotalCount(data.count ?? 0);
      }
    }, searchParam ? 500 : 0);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, selectedTags]);

  useEffect(() => {
    if (!isReady) return;

    const companyId = user.companyId;
    const cleanup = on(`company-${companyId}-contact`, (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
      }
    });

    return cleanup;
  }, [isReady, user.companyId]);

  const handleSelectTicket = (ticket) => {
    const code = uuidv4();
    const { id, uuid } = ticket;
    setCurrentTicket({ id, uuid, code });
  };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      handleSelectTicket(ticket);
      history.push(`/atendimentos/${ticket.uuid}`);
    }
  };

  const handleSelectedTags = (selecteds) => {
    const tags = selecteds.map((t) => t.id);
    setSelectedTags(tags);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  const handleEditContact = (contactId) => {
    setSelectedContactId(contactId);
    setContactModalOpen(true);
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await api.delete(`/contacts/${contactId}`);
      toast.success(i18n.t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleToggleSelectContact = (contactId) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleClearSelection = () => {
    setSelectedContacts([]);
  };

  const handleSelectAll = () => {
    setSelectedContacts(contacts.map((c) => c.id));
  };

  const handleDeleteSelectedContacts = async () => {
    try {
      for (const id of selectedContacts) {
        await api.delete(`/contacts/${id}`);
      }
      toast.success(i18n.t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setConfirmBulkDeleteOpen(false);
    setSelectedContacts([]);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleBlockContact = async (contactId) => {
    try {
      await api.put(`/contacts/block/${contactId}`, { active: false });
      toast.success("Contato bloqueado");
    } catch (err) {
      toastError(err);
    }
    setBlockingContact(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleUnBlockContact = async (contactId) => {
    try {
      await api.put(`/contacts/block/${contactId}`, { active: true });
      toast.success("Contato desbloqueado");
    } catch (err) {
      toastError(err);
    }
    setUnBlockingContact(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const onSave = (whatsappId) => {
    setImportWhatsappId(whatsappId);
  };

  const handleImportContact = async () => {
    setImportContactModalOpen(false);
    try {
      await api.post("/contacts/import", { whatsappId: importWhatsappId });
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  const handleImportExcel = async () => {
    try {
      const formData = new FormData();
      formData.append("file", fileUploadRef.current.files[0]);
      await api.request({
        url: `/contacts/upload`,
        method: "POST",
        data: formData,
      });
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loadingContacts) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  return (
    <Box className={classes.root} onScroll={handleScroll}>
      {/* Modais */}
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        initialContact={contactTicket}
        onClose={(ticket) => handleCloseOrOpenTicket(ticket)}
      />
      <ContactModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        contactId={selectedContactId}
      />
      <ConfirmationModal
        title={
          deletingContact
            ? `${i18n.t("contacts.confirmationModal.deleteTitle")} ${getDisplayName(deletingContact)}?`
            : blockingContact
              ? `Bloquear Contato ${getDisplayName(blockingContact)}?`
              : unBlockingContact
                ? `Desbloquear Contato ${getDisplayName(unBlockingContact)}?`
                : ImportContacts
                  ? `${i18n.t("contacts.confirmationModal.importTitlte")}`
                  : `${i18n.t("contactListItems.confirmationModal.importTitlte")}`
        }
        onSave={onSave}
        isCellPhone={ImportContacts}
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={() =>
          deletingContact
            ? handleDeleteContact(deletingContact.id)
            : blockingContact
              ? handleBlockContact(blockingContact.id)
              : unBlockingContact
                ? handleUnBlockContact(unBlockingContact.id)
                : ImportContacts
                  ? handleImportContact()
                  : handleImportExcel()
        }
      >
        {deletingContact
          ? `${i18n.t("contacts.confirmationModal.deleteMessage")}`
          : blockingContact
            ? `${i18n.t("contacts.confirmationModal.blockContact")}`
            : unBlockingContact
              ? `${i18n.t("contacts.confirmationModal.unblockContact")}`
              : ImportContacts
                ? `Escolha de qual conexão deseja importar`
                : `${i18n.t("contactListItems.confirmationModal.importMessage")}`}
      </ConfirmationModal>
      <ConfirmationModal
        title="Excluir contatos selecionados"
        open={confirmBulkDeleteOpen}
        onClose={setConfirmBulkDeleteOpen}
        onConfirm={handleDeleteSelectedContacts}
      >
        {`Você tem ${selectedContacts.length} contato(s) selecionado(s). Deseja realmente excluir todos?`}
      </ConfirmationModal>

      {importContactModalOpen && (
        <ContactImportWpModal
          isOpen={importContactModalOpen}
          handleClose={() => setImportContactModalOpen(false)}
          selectedTags={selectedTags}
          hideNum={hideNum}
          userProfile={user.profile}
        />
      )}

      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.titleContainer}>
          <PersonIcon className={classes.titleIcon} />
          <Box>
            <Typography className={classes.title}>
              {i18n.t("contacts.title")}
            </Typography>
            <Typography className={classes.subtitle}>
              Gerencie seus contatos • {totalCount} contato(s)
            </Typography>
          </Box>
        </Box>

        <Box className={classes.actions}>
          <TagsFilter onFiltered={handleSelectedTags} />
          <TextField
            size="small"
            variant="outlined"
            placeholder={i18n.t("contacts.searchPlaceholder")}
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
          <Button
            variant="contained"
            className={classes.importButton}
            startIcon={<FileUploadIcon />}
            endIcon={<ArrowDropDownIcon />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            Importar
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem
              onClick={() => {
                setConfirmOpen(true);
                setImportContacts(true);
                setAnchorEl(null);
              }}
            >
              <ContactPhoneIcon fontSize="small" style={{ marginRight: 10 }} />
              {i18n.t("contacts.menu.importYourPhone")}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setImportContactModalOpen(true);
                setAnchorEl(null);
              }}
            >
              <BackupIcon fontSize="small" style={{ marginRight: 10 }} />
              {i18n.t("contacts.menu.importToExcel")}
            </MenuItem>
          </Menu>
          <Tooltip title="Adicionar contato">
            <IconButton
              className={classes.addButton}
              onClick={handleOpenContactModal}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Ações em massa */}
      {contacts.length > 0 && (
        <Box className={classes.bulkActions}>
          {/* Checkbox master: indeterminate quando seleção parcial, checked quando todos selecionados */}
          <Checkbox
            className={classes.hideOnMobile}
            color="primary"
            indeterminate={selectedContacts.length > 0 && selectedContacts.length < contacts.length}
            checked={contacts.length > 0 && selectedContacts.length === contacts.length}
            onChange={() =>
              selectedContacts.length === contacts.length
                ? handleClearSelection()
                : handleSelectAll()
            }
            title={selectedContacts.length === contacts.length ? "Desmarcar todos" : "Selecionar todos"}
          />
          <Typography variant="body2">
            {selectedContacts.length > 0
              ? `${selectedContacts.length} selecionado(s)`
              : `${contacts.length} contato(s)`}
          </Typography>
          {/* Botão "Selecionar todos os N" quando alguns mas não todos estão selecionados */}
          {selectedContacts.length > 0 && selectedContacts.length < contacts.length && (
            <Button size="small" onClick={handleSelectAll} style={{ textTransform: "none" }}>
              Selecionar todos os {contacts.length}
            </Button>
          )}
          {/* Aviso quando todos carregados estão selecionados mas ainda há mais no servidor */}
          {hasMore && selectedContacts.length === contacts.length && selectedContacts.length > 0 && (
            <Typography variant="caption" style={{ color: "#f57c00" }}>
              (apenas os carregados — role para baixo para carregar mais)
            </Typography>
          )}
          {selectedContacts.length > 0 && (
            <>
              <Button
                size="small"
                color="secondary"
                onClick={() => setConfirmBulkDeleteOpen(true)}
              >
                Excluir selecionados
              </Button>
              <Button size="small" onClick={handleClearSelection}>
                Limpar seleção
              </Button>
            </>
          )}
        </Box>
      )}

      {/* Input oculto para upload */}
      <input
        style={{ display: "none" }}
        id="upload"
        name="file"
        type="file"
        accept=".xls,.xlsx"
        onChange={() => setConfirmOpen(true)}
        ref={fileUploadRef}
      />

      {/* Content - Lista */}
      <Box className={classes.content}>
        <SafeComponent
          loading={loadingContacts && contacts.length === 0}
          error={errorContacts}
          data={contacts}
          renderData={(records) => (
            <>
              {records.map((contact) => (
                <Box key={contact.id} className={classes.listItem}>
                  {/* Checkbox - Oculto no mobile */}
                  <Checkbox
                    color="primary"
                    checked={selectedContacts.includes(contact.id)}
                    onChange={() => handleToggleSelectContact(contact.id)}
                    className={classes.hideOnMobile}
                  />

                  {/* Avatar */}
                  <ExpandableAvatar contact={contact} classes={classes} />

                  {/* Info */}
                  <Box className={classes.itemInfo}>
                    <Typography className={classes.itemName}>
                      {getDisplayName(contact)}
                    </Typography>
                    <Box className={classes.itemDetails}>
                      <span className={classes.hideOnMobile}>ID: {contact.id}</span>
                      <span className={classes.hideOnMobile}>•</span>
                      <span>{contact.number}</span>
                      <span className={classes.hideOnMobile}>•</span>
                      <Box className={classes.itemStatus}>
                        {contact.active ? (
                          <CheckCircleIcon className={classes.statusActive} />
                        ) : (
                          <BlockIcon className={classes.statusBlocked} />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Ações */}
                  <Box className={classes.itemActions}>
                    <Tooltip title="WhatsApp">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setContactTicket(contact);
                          setNewTicketModalOpen(true);
                        }}
                        className={`${classes.actionButton} ${classes.whatsappButton}`}
                      >
                        <WhatsAppIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title={i18n.t("contacts.buttons.edit")}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditContact(contact.id)}
                        className={`${classes.actionButton} ${classes.editButton}`}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>

                    {contact.active ? (
                      <Tooltip title="Bloquear">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setBlockingContact(contact);
                            setConfirmOpen(true);
                          }}
                          className={`${classes.actionButton} ${classes.blockButton}`}
                        >
                          <BlockIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Desbloquear">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setUnBlockingContact(contact);
                            setConfirmOpen(true);
                          }}
                          className={`${classes.actionButton} ${classes.unblockButton}`}
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Can
                      role={user.profile}
                      perform="contacts-page:deleteContact"
                      yes={() => (
                        <Tooltip title={i18n.t("contacts.buttons.delete")}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setConfirmOpen(true);
                              setDeletingContact(contact);
                            }}
                            className={`${classes.actionButton} ${classes.deleteButton}`}
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    />
                  </Box>
                </Box>
              ))}
              {loadingContacts && (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </>
          )}
        />
      </Box>
    </Box>
  );
};
export default Contatos;
