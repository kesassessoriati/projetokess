import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Drawer,
  Grid,
  IconButton,
  LinearProgress,
  Tab,
  Tabs,
  TextField,
  InputAdornment,
  Typography,
  Tooltip,
  CircularProgress,
  Chip,
} from "@material-ui/core";

import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import AddIcon from "@material-ui/icons/Add";
import CampaignIcon from "@material-ui/icons/Send";
import DescriptionIcon from "@material-ui/icons/Description";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import ScheduleIcon from "@material-ui/icons/Schedule";
import PeopleIcon from "@material-ui/icons/People";
import ListAltIcon from "@material-ui/icons/ListAlt";
import DownloadIcon from "@material-ui/icons/GetApp";
import PublishIcon from "@material-ui/icons/Publish";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import CancelIcon from "@material-ui/icons/Cancel";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import PauseCircleOutlineIcon from "@material-ui/icons/PauseCircleOutline";
import CloseIcon from "@material-ui/icons/Close";
import EmailIcon from "@material-ui/icons/Email";
import PhoneIcon from "@material-ui/icons/Phone";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import CampaignModal from "../../components/CampaignModal";
import ContactListDialog from "../../components/ContactListDialog";
import ContactListItemModal from "../../components/ContactListItemModal";
import ContactListImportModal from "../../components/ContactListImportModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import planilhaExemplo from "../../assets/planilha.xlsx";
import { isArray } from "lodash";
import { useDate } from "../../hooks/useDate";
import ForbiddenPage from "../../components/ForbiddenPage";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useSocket } from "../../context/SocketContext";

// ── Reducers ──────────────────────────────────────────────────────────────────
const campaignReducer = (state, action) => {
  if (action.type === "LOAD_CAMPAIGNS") {
    const campaigns = action.payload;
    const newCampaigns = [];
    if (isArray(campaigns)) {
      campaigns.forEach((c) => {
        const idx = state.findIndex((u) => u.id === c.id);
        if (idx !== -1) state[idx] = c;
        else newCampaigns.push(c);
      });
    }
    return [...state, ...newCampaigns];
  }
  if (action.type === "UPDATE_CAMPAIGNS") {
    const c = action.payload;
    const idx = state.findIndex((u) => u.id === c.id);
    if (idx !== -1) { state[idx] = c; return [...state]; }
    return [c, ...state];
  }
  if (action.type === "DELETE_CAMPAIGN") {
    const idx = state.findIndex((u) => u.id === action.payload);
    if (idx !== -1) state.splice(idx, 1);
    return [...state];
  }
  if (action.type === "RESET") return [];
  return state;
};

const listReducer = (state, action) => {
  if (action.type === "LOAD_CONTACTLISTS") {
    const lists = action.payload;
    const newLists = [];
    lists.forEach((l) => {
      const idx = state.findIndex((u) => u.id === l.id);
      if (idx !== -1) state[idx] = l;
      else newLists.push(l);
    });
    return [...state, ...newLists];
  }
  if (action.type === "UPDATE_CONTACTLIST") {
    const l = action.payload;
    const idx = state.findIndex((u) => u.id === l.id);
    if (idx !== -1) { state[idx] = l; return [...state]; }
    return [l, ...state];
  }
  if (action.type === "DELETE_CONTACTLIST") {
    const idx = state.findIndex((u) => u.id === action.payload);
    if (idx !== -1) state.splice(idx, 1);
    return [...state];
  }
  if (action.type === "ADJUST_COUNT") {
    const idx = state.findIndex((u) => u.id === action.payload.id);
    if (idx !== -1) {
      state[idx] = { ...state[idx], contactsCount: (state[idx].contactsCount || 0) + action.payload.delta };
      return [...state];
    }
    return state;
  }
  if (action.type === "RESET") return [];
  return state;
};

// ── Styles ────────────────────────────────────────────────────────────────────
const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
  },
  tabsBar: {
    backgroundColor: "#0a0a0a",
    flexShrink: 0,
    "& .MuiTabs-indicator": {
      backgroundColor: "#00d4ff",
      height: 3,
    },
  },
  tab: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: 600,
    fontSize: "0.78rem",
    minWidth: 130,
    "&.Mui-selected": { color: "#00d4ff" },
  },
  tabContent: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    ...theme.scrollbarStyles,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 22px",
    backgroundColor: "#f5f5f5",
    borderBottom: "1px solid #e0e0e0",
    flexWrap: "wrap",
    gap: 14,
    flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    backgroundColor: "#e3f2fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": { fontSize: 20, color: "#1976d2" },
  },
  headerTitle: { fontSize: "1.2rem", fontWeight: 700, color: "#1a1a1a" },
  headerSubtitle: { fontSize: "0.78rem", color: "#666" },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  searchField: {
    backgroundColor: "#fff",
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      "& fieldset": { borderColor: "#e0e0e0" },
      "&:hover fieldset": { borderColor: "#1976d2" },
    },
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    backgroundColor: "#0a0a0a",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    "&:hover": { backgroundColor: "#222", transform: "scale(1.05)" },
  },
  downloadButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    borderRadius: 8,
    backgroundColor: "#e8f5e9",
    color: "#4caf50",
    border: "none",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 500,
    textDecoration: "none",
    transition: "all 0.2s",
    "&:hover": { backgroundColor: "#c8e6c9" },
  },
  content: { flex: 1, padding: "14px 22px" },
  listItem: {
    display: "flex",
    alignItems: "center",
    padding: "13px 15px",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    transition: "all 0.2s",
    "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.12)" },
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    "& svg": { fontSize: 20 },
  },
  itemInfo: { flex: 1, marginLeft: 13, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 },
  itemName: { fontSize: "0.92rem", fontWeight: 600, color: "#1a1a1a" },
  itemDetails: { display: "flex", alignItems: "center", gap: 9, fontSize: "0.76rem", color: "#666", flexWrap: "wrap" },
  itemDetail: { display: "flex", alignItems: "center", gap: 3 },
  itemActions: { display: "flex", alignItems: "center", gap: 5, marginLeft: 8, flexShrink: 0 },
  actionButton: { width: 32, height: 32, borderRadius: 7 },
  statusChip: { fontWeight: 500, fontSize: "0.72rem" },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    color: "#bbb",
    "& svg": { fontSize: 52, marginBottom: 10, opacity: 0.35 },
  },
  loadingContainer: { display: "flex", justifyContent: "center", padding: 20 },
  reportBtn: { backgroundColor: "#e8f5e9", color: "#4caf50", "&:hover": { backgroundColor: "#c8e6c9" } },
  editBtn: { backgroundColor: "#e3f2fd", color: "#1976d2", "&:hover": { backgroundColor: "#bbdefb" } },
  deleteBtn: { backgroundColor: "#ffebee", color: "#d32f2f", "&:hover": { backgroundColor: "#ffcdd2" } },
  viewBtn: { backgroundColor: "#e3f2fd", color: "#1976d2", "&:hover": { backgroundColor: "#bbdefb" } },
  // Drawer
  drawerPaper: { width: 480 },
  drawerHeader: {
    backgroundColor: "#1e1e1e",
    borderBottom: "2px solid #00d4ff",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  drawerToolbar: {
    padding: "10px 16px",
    backgroundColor: "#f8f8f8",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  drawerContent: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px",
    ...({} /* theme.scrollbarStyles injected via theme */),
  },
  drawerItem: {
    padding: "11px 14px",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 6,
    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    "&:hover": { boxShadow: "0 2px 7px rgba(0,0,0,0.12)" },
  },
  drawerItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    backgroundColor: "#e3f2fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    "& svg": { fontSize: 18, color: "#1976d2" },
  },
  drawerItemInfo: { flex: 1, minWidth: 0 },
  drawerItemName: { fontSize: "0.88rem", fontWeight: 600, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  drawerItemMeta: { fontSize: "0.74rem", color: "#888", display: "flex", alignItems: "center", gap: 6, marginTop: 2 },
  drawerEmptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    color: "#bbb",
    "& svg": { fontSize: 48, marginBottom: 10, opacity: 0.3 },
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
  },
  // Metrics
  metricsContainer: { padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 },
  sectionTitle: { fontSize: "0.95rem", fontWeight: 700, color: "#1a1a1a" },
  metricCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: "16px 18px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    gap: 13,
    "&:hover": { boxShadow: "0 3px 10px rgba(0,0,0,0.11)" },
  },
  metricIconBox: {
    width: 44,
    height: 44,
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    "& svg": { fontSize: 22 },
  },
  metricValue: { fontSize: "1.7rem", fontWeight: 800, lineHeight: 1.1 },
  metricLabel: { fontSize: "0.76rem", color: "#666", marginTop: 2 },
  progressSection: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: "16px 18px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  progressRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  progressLabel: { fontSize: "0.8rem", fontWeight: 600, color: "#333" },
  progressCount: { fontSize: "0.78rem", color: "#888" },
  progressBar: { height: 7, borderRadius: 4, marginBottom: 10, backgroundColor: "#f0f0f0" },
}));

// ── Component ─────────────────────────────────────────────────────────────────
const Campaigns = () => {
  const classes = useStyles();
  const history = useHistory();

  const [activeTab, setActiveTab] = useState(0);
  const { user } = useContext(AuthContext);
  const { isConnected, on } = useSocket();
  const { datetimeToClient } = useDate();
  const { getPlanCompany } = usePlans();

  // Campaigns state
  const [campaigns, dispatch] = useReducer(campaignReducer, []);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [deletingCampaign, setDeletingCampaign] = useState(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [confirmCampaignOpen, setConfirmCampaignOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");

  // Contact lists state
  const [contactLists, listDispatch] = useReducer(listReducer, []);
  const [listLoading, setListLoading] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listHasMore, setListHasMore] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [deletingList, setDeletingList] = useState(null);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [confirmListOpen, setConfirmListOpen] = useState(false);
  const [listSearch, setListSearch] = useState("");

  // Contacts Drawer state
  const [contactsDrawerOpen, setContactsDrawerOpen] = useState(false);
  const [viewingList, setViewingList] = useState(null);
  const [listItems, setListItems] = useState([]);
  const [listItemsLoading, setListItemsLoading] = useState(false);
  const [listItemSearch, setListItemSearch] = useState("");
  const [listItemPage, setListItemPage] = useState(1);
  const [listItemHasMore, setListItemHasMore] = useState(false);
  const [contactItemModalOpen, setContactItemModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [listImportOpen, setListImportOpen] = useState(false);
  const [confirmDeleteItemOpen, setConfirmDeleteItemOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);

  // Plan check
  useEffect(() => {
    (async () => {
      const planConfigs = await getPlanCompany(undefined, user.companyId);
      if (!planConfigs.plan.useCampaigns) {
        toast.error("Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando.");
        setTimeout(() => history.push("/"), 1000);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Campaigns fetch
  useEffect(() => { dispatch({ type: "RESET" }); setPageNumber(1); }, [searchParam]);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api.get("/campaigns/", { params: { searchParam, pageNumber } })
        .then(({ data }) => {
          dispatch({ type: "LOAD_CAMPAIGNS", payload: data.records });
          setHasMore(data.hasMore);
          setLoading(false);
        })
        .catch(toastError);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam, pageNumber]);

  // Contact lists fetch
  useEffect(() => { listDispatch({ type: "RESET" }); setListPage(1); }, [listSearch]);
  useEffect(() => {
    setListLoading(true);
    const t = setTimeout(() => {
      api.get("/contact-lists/", { params: { searchParam: listSearch, pageNumber: listPage } })
        .then(({ data }) => {
          listDispatch({ type: "LOAD_CONTACTLISTS", payload: data.records });
          setListHasMore(data.hasMore);
          setListLoading(false);
        })
        .catch(toastError);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listSearch, listPage]);

  // Sockets
  useEffect(() => {
    if (!isConnected || !user?.companyId) return;
    const cid = user.companyId;
    const c1 = on(`company-${cid}-campaign`, (data) => {
      if (data.action === "update" || data.action === "create")
        dispatch({ type: "UPDATE_CAMPAIGNS", payload: data.record });
      if (data.action === "delete")
        dispatch({ type: "DELETE_CAMPAIGN", payload: +data.id });
    });
    const c2 = on(`company-${cid}-ContactList`, (data) => {
      if (data.action === "update" || data.action === "create")
        listDispatch({ type: "UPDATE_CONTACTLIST", payload: data.record });
      if (data.action === "delete")
        listDispatch({ type: "DELETE_CONTACTLIST", payload: +data.id });
    });
    return () => { c1(); c2(); };
  }, [isConnected, on, user?.companyId]);

  // Reset list items page when search changes
  useEffect(() => {
    if (viewingList) { setListItems([]); setListItemPage(1); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listItemSearch]);

  // Fetch list items when drawer is open
  useEffect(() => {
    if (!viewingList) return;
    setListItemsLoading(true);
    const t = setTimeout(() => {
      api.get("/contact-list-items", {
        params: { contactListId: viewingList.id, searchParam: listItemSearch, pageNumber: listItemPage },
      })
        .then(({ data }) => {
          setListItems((prev) => listItemPage === 1 ? data.contacts : [...prev, ...data.contacts]);
          setListItemHasMore(data.hasMore);
          setListItemsLoading(false);
        })
        .catch(toastError);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingList, listItemSearch, listItemPage]);

  const handleCampaignScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) setPageNumber((p) => p + 1);
  };

  const handleListScroll = (e) => {
    if (!listHasMore || listLoading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) setListPage((p) => p + 1);
  };

  const handleDeleteCampaign = async (id) => {
    try { await api.delete(`/campaigns/${id}`); toast.success(i18n.t("campaigns.toasts.deleted")); }
    catch (err) { toastError(err); }
    setDeletingCampaign(null); setSearchParam(""); setPageNumber(1);
  };

  const handleDeleteList = async (id) => {
    try { await api.delete(`/contact-lists/${id}`); toast.success(i18n.t("contactLists.toasts.deleted")); }
    catch (err) { toastError(err); }
    setDeletingList(null); setListSearch(""); setListPage(1);
  };

  const handleViewContacts = (list) => {
    setViewingList(list);
    setListItems([]);
    setListItemSearch("");
    setListItemPage(1);
    setContactsDrawerOpen(true);
  };

  const handleDeleteListItem = async (id) => {
    try {
      await api.delete(`/contact-list-items/${id}`);
      setListItems((prev) => prev.filter((c) => c.id !== id));
      if (viewingList) listDispatch({ type: "ADJUST_COUNT", payload: { id: viewingList.id, delta: -1 } });
      toast.success("Contato removido");
    } catch (err) { toastError(err); }
    setDeletingItem(null);
  };

  const handleDrawerScroll = (e) => {
    if (!listItemHasMore || listItemsLoading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) setListItemPage((p) => p + 1);
  };

  const refreshListItems = () => {
    setListItems([]);
    setListItemPage(1);
    // Re-fetch this list from server to get updated contactsCount
    if (viewingList) {
      api.get(`/contact-lists/${viewingList.id}`)
        .then(({ data }) => listDispatch({ type: "UPDATE_CONTACTLIST", payload: data }))
        .catch(() => {});
    }
  };

  const getStatusChip = (status) => {
    const cfg = {
      INATIVA: { label: "Inativa", color: "#9e9e9e", bg: "#f5f5f5" },
      PROGRAMADA: { label: "Programada", color: "#1976d2", bg: "#e3f2fd" },
      EM_ANDAMENTO: { label: "Em Andamento", color: "#ff9800", bg: "#fff3e0" },
      CANCELADA: { label: "Cancelada", color: "#d32f2f", bg: "#ffebee" },
      FINALIZADA: { label: "Finalizada", color: "#4caf50", bg: "#e8f5e9" },
    };
    const c = cfg[status] || { label: status, color: "#666", bg: "#f5f5f5" };
    return <Chip label={c.label} size="small" className={classes.statusChip} style={{ backgroundColor: c.bg, color: c.color }} />;
  };

  const metricsByStatus = {
    FINALIZADA: campaigns.filter((c) => c.status === "FINALIZADA").length,
    EM_ANDAMENTO: campaigns.filter((c) => c.status === "EM_ANDAMENTO").length,
    PROGRAMADA: campaigns.filter((c) => c.status === "PROGRAMADA").length,
    CANCELADA: campaigns.filter((c) => c.status === "CANCELADA").length,
    INATIVA: campaigns.filter((c) => c.status === "INATIVA").length,
  };
  const totalCampaigns = campaigns.length;

  if (user.profile === "user") return <ForbiddenPage />;

  return (
    <Box className={classes.root}>
      {/* Modals */}
      <ConfirmationModal
        title={deletingCampaign && `${i18n.t("campaigns.confirmationModal.deleteTitle")} ${deletingCampaign.name}?`}
        open={confirmCampaignOpen}
        onClose={setConfirmCampaignOpen}
        onConfirm={() => handleDeleteCampaign(deletingCampaign.id)}
      >
        {i18n.t("campaigns.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      {campaignModalOpen && (
        <CampaignModal
          resetPagination={() => setPageNumber(1)}
          open={campaignModalOpen}
          onClose={() => { setSelectedCampaign(null); setCampaignModalOpen(false); }}
          campaignId={selectedCampaign?.id}
        />
      )}

      <ConfirmationModal
        title={deletingList && `${i18n.t("contactLists.confirmationModal.deleteTitle")} ${deletingList.name}?`}
        open={confirmListOpen}
        onClose={setConfirmListOpen}
        onConfirm={() => handleDeleteList(deletingList.id)}
      >
        {i18n.t("contactLists.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <ContactListDialog
        open={listModalOpen}
        onClose={() => { setSelectedList(null); setListModalOpen(false); }}
        contactListId={selectedList?.id}
      />

      {/* Tab bar */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        className={classes.tabsBar}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab className={classes.tab} label="Disparos" />
        <Tab className={classes.tab} label="Listas de Contatos" />
        <Tab className={classes.tab} label="Métricas" />
      </Tabs>

      {/* ── TAB 0: Disparos ── */}
      {activeTab === 0 && (
        <Box className={classes.tabContent} onScroll={handleCampaignScroll}>
          <Box className={classes.header}>
            <Box className={classes.headerLeft}>
              <Box className={classes.headerIcon}><CampaignIcon /></Box>
              <Box>
                <Typography className={classes.headerTitle}>{i18n.t("campaigns.title")}</Typography>
                <Typography className={classes.headerSubtitle}>
                  {campaigns.length} {campaigns.length === 1 ? "campanha" : "campanhas"}
                </Typography>
              </Box>
            </Box>
            <Box className={classes.headerRight}>
              <TextField
                placeholder={i18n.t("campaigns.searchPlaceholder")}
                variant="outlined"
                size="small"
                value={searchParam}
                onChange={(e) => setSearchParam(e.target.value.toLowerCase())}
                className={classes.searchField}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon style={{ color: "#999", fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Tooltip title={i18n.t("campaigns.buttons.add")}>
                <button className={classes.addButton}
                  onClick={() => { setSelectedCampaign(null); setCampaignModalOpen(true); }}>
                  <AddIcon style={{ fontSize: 20 }} />
                </button>
              </Tooltip>
            </Box>
          </Box>

          <Box className={classes.content}>
            {campaigns.length === 0 && !loading ? (
              <Box className={classes.emptyState}>
                <CampaignIcon />
                <Typography>Nenhuma campanha encontrada</Typography>
              </Box>
            ) : (
              campaigns.map((campaign) => (
                <Box key={campaign.id} className={classes.listItem}>
                  <Box className={classes.itemIcon} style={{ backgroundColor: "#e8f5e9" }}>
                    <CampaignIcon style={{ color: "#4caf50" }} />
                  </Box>
                  <Box className={classes.itemInfo}>
                    <Typography className={classes.itemName}>{campaign.name}</Typography>
                    <Box className={classes.itemDetails}>
                      <span>ID: {campaign.id}</span>
                      <span>•</span>
                      {getStatusChip(campaign.status)}
                      <span>•</span>
                      <Box className={classes.itemDetail}>
                        <PeopleIcon style={{ fontSize: 12 }} />
                        <span>{campaign.contactListId ? campaign.contactList?.name : "Sem lista"}</span>
                      </Box>
                      <span>•</span>
                      <Box className={classes.itemDetail}>
                        <WhatsAppIcon style={{ fontSize: 12, color: "#25D366" }} />
                        <span>{campaign.whatsappId ? campaign.whatsapp?.name : "Não definido"}</span>
                      </Box>
                      {campaign.scheduledAt && (
                        <>
                          <span>•</span>
                          <Box className={classes.itemDetail}>
                            <ScheduleIcon style={{ fontSize: 12 }} />
                            <span>{datetimeToClient(campaign.scheduledAt)}</span>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>
                  <Box className={classes.itemActions}>
                    <Tooltip title="Relatório">
                      <IconButton size="small" className={`${classes.actionButton} ${classes.reportBtn}`}
                        onClick={() => history.push(`/campaign/${campaign.id}/report`)}>
                        <DescriptionIcon style={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" className={`${classes.actionButton} ${classes.editBtn}`}
                        onClick={() => { setSelectedCampaign(campaign); setCampaignModalOpen(true); }}>
                        <EditIcon style={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton size="small" className={`${classes.actionButton} ${classes.deleteBtn}`}
                        onClick={() => { setConfirmCampaignOpen(true); setDeletingCampaign(campaign); }}>
                        <DeleteOutlineIcon style={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))
            )}
            {loading && <Box className={classes.loadingContainer}><CircularProgress size={26} /></Box>}
          </Box>
        </Box>
      )}

      {/* ── TAB 1: Listas de Contatos ── */}
      {activeTab === 1 && (
        <Box className={classes.tabContent} onScroll={handleListScroll}>
          <Box className={classes.header}>
            <Box className={classes.headerLeft}>
              <Box className={classes.headerIcon}><ListAltIcon /></Box>
              <Box>
                <Typography className={classes.headerTitle}>{i18n.t("contactLists.title")}</Typography>
                <Typography className={classes.headerSubtitle}>
                  {contactLists.length} {contactLists.length === 1 ? "lista" : "listas"}
                </Typography>
              </Box>
            </Box>
            <Box className={classes.headerRight}>
              <a href={planilhaExemplo} download="planilha.xlsx" className={classes.downloadButton}>
                <DownloadIcon style={{ fontSize: 15 }} />
                Planilha Exemplo
              </a>
              <TextField
                placeholder="Buscar lista..."
                variant="outlined"
                size="small"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value.toLowerCase())}
                className={classes.searchField}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon style={{ color: "#999", fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Tooltip title={i18n.t("contactLists.buttons.add")}>
                <button className={classes.addButton}
                  onClick={() => { setSelectedList(null); setListModalOpen(true); }}>
                  <AddIcon style={{ fontSize: 20 }} />
                </button>
              </Tooltip>
            </Box>
          </Box>

          <Box className={classes.content}>
            {contactLists.length === 0 && !listLoading ? (
              <Box className={classes.emptyState}>
                <ListAltIcon />
                <Typography>Nenhuma lista encontrada</Typography>
              </Box>
            ) : (
              contactLists.map((list) => (
                <Box key={list.id} className={classes.listItem}>
                  <Box className={classes.itemIcon} style={{ backgroundColor: "#e3f2fd" }}>
                    <ListAltIcon style={{ color: "#1976d2" }} />
                  </Box>
                  <Box className={classes.itemInfo}>
                    <Typography className={classes.itemName}>{list.name}</Typography>
                    <Box className={classes.itemDetails}>
                      <span>ID: {list.id}</span>
                      <span>•</span>
                      <Box className={classes.itemDetail}>
                        <PeopleIcon style={{ fontSize: 12 }} />
                        <span>{list.contactsCount || 0} {list.contactsCount === 1 ? "contato" : "contatos"}</span>
                      </Box>
                    </Box>
                  </Box>
                  <Box className={classes.itemActions}>
                    <Tooltip title="Ver Contatos">
                      <IconButton size="small" className={`${classes.actionButton} ${classes.viewBtn}`}
                        onClick={() => handleViewContacts(list)}>
                        <PeopleIcon style={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" className={`${classes.actionButton} ${classes.editBtn}`}
                        onClick={() => { setSelectedList(list); setListModalOpen(true); }}>
                        <EditIcon style={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton size="small" className={`${classes.actionButton} ${classes.deleteBtn}`}
                        onClick={() => { setConfirmListOpen(true); setDeletingList(list); }}>
                        <DeleteOutlineIcon style={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))
            )}
            {listLoading && <Box className={classes.loadingContainer}><CircularProgress size={26} /></Box>}
          </Box>
        </Box>
      )}

      {/* ── Contacts Drawer ── */}
      <ConfirmationModal
        title={deletingItem ? `Remover "${deletingItem.name || deletingItem.number}"?` : ""}
        open={confirmDeleteItemOpen}
        onClose={setConfirmDeleteItemOpen}
        onConfirm={() => handleDeleteListItem(deletingItem?.id)}
      >
        Essa ação não pode ser desfeita.
      </ConfirmationModal>

      {contactItemModalOpen && (
        <ContactListItemModal
          open={contactItemModalOpen}
          onClose={() => { setEditingContactId(null); setContactItemModalOpen(false); refreshListItems(); }}
          onSave={() => {
            if (!editingContactId && viewingList)
              listDispatch({ type: "ADJUST_COUNT", payload: { id: viewingList.id, delta: +1 } });
          }}
          contactId={editingContactId}
          contactListId={viewingList?.id}
        />
      )}

      <ContactListImportModal
        open={listImportOpen}
        onClose={() => setListImportOpen(false)}
        contactListId={viewingList?.id}
        onImportComplete={refreshListItems}
      />

      <Drawer
        anchor="right"
        open={contactsDrawerOpen}
        onClose={() => setContactsDrawerOpen(false)}
        classes={{ paper: classes.drawerPaper }}
      >
        <Box style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          {/* Header */}
          <Box className={classes.drawerHeader}>
            <ListAltIcon style={{ color: "#00d4ff", fontSize: 22 }} />
            <Box style={{ flex: 1 }}>
              <Typography style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
                {viewingList?.name}
              </Typography>
              <Typography style={{ color: "#888", fontSize: "0.73rem" }}>
                {listItems.length} contato{listItems.length !== 1 ? "s" : ""} carregado{listItems.length !== 1 ? "s" : ""}
              </Typography>
            </Box>
            <Tooltip title="Fechar">
              <IconButton size="small" onClick={() => setContactsDrawerOpen(false)} style={{ color: "#fff" }}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Toolbar */}
          <Box className={classes.drawerToolbar}>
            <TextField
              placeholder="Buscar contato..."
              variant="outlined"
              size="small"
              value={listItemSearch}
              onChange={(e) => setListItemSearch(e.target.value.toLowerCase())}
              style={{ flex: 1, backgroundColor: "#fff", borderRadius: 7 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon style={{ color: "#999", fontSize: 17 }} />
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title="Importar contatos (XLS/CSV)">
              <IconButton
                size="small"
                className={`${classes.iconBtn} ${classes.reportBtn}`}
                onClick={() => setListImportOpen(true)}
              >
                <PublishIcon style={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Adicionar contato">
              <IconButton
                size="small"
                className={classes.iconBtn}
                style={{ backgroundColor: "#0a0a0a", color: "#fff" }}
                onClick={() => { setEditingContactId(null); setContactItemModalOpen(true); }}
              >
                <AddIcon style={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Content */}
          <Box className={classes.drawerContent} onScroll={handleDrawerScroll}>
            {listItems.length === 0 && !listItemsLoading ? (
              <Box className={classes.drawerEmptyState}>
                <PeopleIcon />
                <Typography variant="body2">Nenhum contato encontrado</Typography>
              </Box>
            ) : (
              listItems.map((contact) => (
                <Box key={contact.id} className={classes.drawerItem}>
                  <Box className={classes.drawerItemAvatar}>
                    <PeopleIcon />
                  </Box>
                  <Box className={classes.drawerItemInfo}>
                    <Typography className={classes.drawerItemName}>
                      {contact.name || "Sem nome"}
                    </Typography>
                    <Box className={classes.drawerItemMeta}>
                      {contact.number && (
                        <Box style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <PhoneIcon style={{ fontSize: 11 }} />
                          <span>{contact.number}</span>
                        </Box>
                      )}
                      {contact.email && (
                        <>
                          <span>·</span>
                          <Box style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <EmailIcon style={{ fontSize: 11 }} />
                            <span>{contact.email}</span>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>
                  <Box style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        className={`${classes.iconBtn} ${classes.editBtn}`}
                        onClick={() => { setEditingContactId(contact.id); setContactItemModalOpen(true); }}
                      >
                        <EditIcon style={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        size="small"
                        className={`${classes.iconBtn} ${classes.deleteBtn}`}
                        onClick={() => { setDeletingItem(contact); setConfirmDeleteItemOpen(true); }}
                      >
                        <DeleteOutlineIcon style={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))
            )}
            {listItemsLoading && (
              <Box style={{ display: "flex", justifyContent: "center", padding: 16 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* ── TAB 2: Métricas ── */}
      {activeTab === 2 && (
        <Box className={classes.tabContent}>
          <Box className={classes.metricsContainer}>

            {/* Campaign status cards */}
            <Typography className={classes.sectionTitle}>Visão geral dos disparos</Typography>
            <Grid container spacing={2}>
              {[
                { label: "Total de Campanhas", value: totalCampaigns, color: "#0a0a0a", bg: "#f5f5f5", Icon: CampaignIcon },
                { label: "Finalizadas", value: metricsByStatus.FINALIZADA, color: "#4caf50", bg: "#e8f5e9", Icon: CheckCircleIcon },
                { label: "Em Andamento", value: metricsByStatus.EM_ANDAMENTO, color: "#ff9800", bg: "#fff3e0", Icon: HourglassEmptyIcon },
                { label: "Programadas", value: metricsByStatus.PROGRAMADA, color: "#1976d2", bg: "#e3f2fd", Icon: ScheduleIcon },
                { label: "Canceladas", value: metricsByStatus.CANCELADA, color: "#d32f2f", bg: "#ffebee", Icon: CancelIcon },
                { label: "Inativas", value: metricsByStatus.INATIVA, color: "#9e9e9e", bg: "#f5f5f5", Icon: PauseCircleOutlineIcon },
              ].map(({ label, value, color, bg, Icon }) => (
                <Grid item xs={12} sm={6} md={4} key={label}>
                  <Box className={classes.metricCard}>
                    <Box className={classes.metricIconBox} style={{ backgroundColor: bg }}>
                      <Icon style={{ color }} />
                    </Box>
                    <Box>
                      <Typography className={classes.metricValue} style={{ color }}>{value}</Typography>
                      <Typography className={classes.metricLabel}>{label}</Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Distribution bars */}
            {totalCampaigns > 0 && (
              <Box className={classes.progressSection}>
                <Typography className={classes.sectionTitle} style={{ marginBottom: 14 }}>
                  Distribuição por status
                </Typography>
                {[
                  { label: "Finalizadas", count: metricsByStatus.FINALIZADA, color: "#4caf50" },
                  { label: "Em Andamento", count: metricsByStatus.EM_ANDAMENTO, color: "#ff9800" },
                  { label: "Programadas", count: metricsByStatus.PROGRAMADA, color: "#1976d2" },
                  { label: "Canceladas", count: metricsByStatus.CANCELADA, color: "#d32f2f" },
                  { label: "Inativas", count: metricsByStatus.INATIVA, color: "#9e9e9e" },
                ].map(({ label, count, color }) => (
                  <Box key={label}>
                    <Box className={classes.progressRow}>
                      <Typography className={classes.progressLabel}>{label}</Typography>
                      <Typography className={classes.progressCount}>{count} / {totalCampaigns}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={totalCampaigns > 0 ? (count / totalCampaigns) * 100 : 0}
                      className={classes.progressBar}
                      style={{ backgroundColor: "#f0f0f0", "& .MuiLinearProgress-bar": { backgroundColor: color } }}
                    />
                  </Box>
                ))}
              </Box>
            )}

            {/* Contact lists summary */}
            <Box className={classes.progressSection}>
              <Typography className={classes.sectionTitle} style={{ marginBottom: 14 }}>
                Listas de Contatos
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box className={classes.metricCard} style={{ padding: "13px 15px" }}>
                    <Box className={classes.metricIconBox} style={{ backgroundColor: "#e3f2fd", width: 40, height: 40 }}>
                      <ListAltIcon style={{ color: "#1976d2", fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography className={classes.metricValue} style={{ color: "#1976d2", fontSize: "1.5rem" }}>
                        {contactLists.length}
                      </Typography>
                      <Typography className={classes.metricLabel}>Listas cadastradas</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box className={classes.metricCard} style={{ padding: "13px 15px" }}>
                    <Box className={classes.metricIconBox} style={{ backgroundColor: "#f3e5f5", width: 40, height: 40 }}>
                      <PeopleIcon style={{ color: "#7b1fa2", fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography className={classes.metricValue} style={{ color: "#7b1fa2", fontSize: "1.5rem" }}>
                        {contactLists.reduce((acc, l) => acc + (l.contactsCount || 0), 0)}
                      </Typography>
                      <Typography className={classes.metricLabel}>Total de contatos nas listas</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Campaigns;
