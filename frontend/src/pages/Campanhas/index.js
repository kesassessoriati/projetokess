import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Button,
  Paper,
  Drawer,
  Grid,
  IconButton,
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
import EmailCampaignModal from "../../components/EmailCampaignModal";
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
    background: "radial-gradient(circle at top left, #f4fbf6 0%, #edf4ef 45%, #e6efe9 100%)",
    overflow: "hidden",
  },
  tabsShell: {
    margin: "14px 14px 10px",
    padding: 6,
    borderRadius: 16,
    border: "1px solid #d4e3d8",
    backgroundColor: "#ffffffd9",
    boxShadow: "0 8px 24px rgba(16,24,40,0.06)",
    backdropFilter: "blur(2px)",
  },
  tabsBar: {
    backgroundColor: "transparent",
    flexShrink: 0,
    minHeight: 54,
    "& .MuiTabs-indicator": {
      display: "none",
    },
  },
  tab: {
    color: "#3c4b42",
    fontWeight: 600,
    fontSize: "0.84rem",
    minWidth: 196,
    minHeight: 54,
    borderRadius: 12,
    marginRight: 8,
    border: "1px solid #d3e1d7",
    backgroundColor: "#f7fbf8",
    textTransform: "none",
    transition: "all .2s ease",
    "&:hover": {
      backgroundColor: "#edf7f1",
      borderColor: "#8fc9a1",
    },
    "&.Mui-selected": {
      color: "#ffffff",
      background: "linear-gradient(135deg, #21a65b 0%, #168747 100%)",
      borderColor: "#11753f",
      boxShadow: "0 10px 24px rgba(24,135,71,.34)",
    },
    "&.Mui-focusVisible": {
      boxShadow: "0 0 0 3px rgba(31,157,85,.3)",
    },
    [theme.breakpoints.down("sm")]: {
      minWidth: 162,
      minHeight: 50,
    },
  },
  tabLabelWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(12,78,36,0.08)",
    "& svg": { fontSize: 16 },
    ".Mui-selected &": {
      backgroundColor: "rgba(255,255,255,0.2)",
    },
  },
  tabTextWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    lineHeight: 1.05,
  },
  tabLabel: {
    fontSize: "0.82rem",
    fontWeight: 700,
  },
  tabHelper: {
    fontSize: "0.67rem",
    opacity: 0.82,
    marginTop: 2,
    whiteSpace: "nowrap",
  },
  tabCount: {
    marginLeft: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 7,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.72rem",
    fontWeight: 700,
    padding: "0 6px",
    backgroundColor: "rgba(12,78,36,0.10)",
    ".Mui-selected &": {
      color: "#0b4d2b",
      backgroundColor: "#ffffff",
    },
  },
  tabContent: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    padding: "0 14px 16px",
    ...theme.scrollbarStyles,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 18px",
    backgroundColor: "#ffffff",
    border: "1px solid #d6e3da",
    borderRadius: 16,
    boxShadow: "0 10px 26px rgba(16,24,40,0.08)",
    flexWrap: "wrap",
    gap: 14,
    flexShrink: 0,
    marginBottom: 12,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#e7f6ec",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": { fontSize: 20, color: "#1f9d55" },
  },
  headerTitle: { fontSize: "1.04rem", fontWeight: 700, color: "#122118" },
  headerSubtitle: { fontSize: "0.79rem", color: "#587064" },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    [theme.breakpoints.down("sm")]: {
      width: "100%",
      justifyContent: "space-between",
    },
  },
  searchField: {
    backgroundColor: "#fff",
    borderRadius: 10,
    minWidth: 250,
    "& .MuiOutlinedInput-root": {
      minHeight: 40,
      borderRadius: 10,
      "& fieldset": { borderColor: "#cfddd4" },
      "&:hover fieldset": { borderColor: "#71b489" },
      "&.Mui-focused fieldset": { borderColor: "#1f9d55", borderWidth: 2 },
    },
    [theme.breakpoints.down("sm")]: {
      minWidth: 0,
      flex: 1,
    },
  },
  addButton: {
    height: 40,
    borderRadius: 10,
    background: "linear-gradient(135deg, #1f9d55 0%, #168747 100%)",
    color: "#fff",
    border: "1px solid #1a8045",
    textTransform: "none",
    fontWeight: 700,
    padding: "0 14px",
    transition: "all 0.2s ease",
    "&:hover": { background: "linear-gradient(135deg, #19884a 0%, #11753f 100%)", boxShadow: "0 10px 20px rgba(31,157,85,.24)" },
    "&:focus": { boxShadow: "0 0 0 3px rgba(31,157,85,.25)" },
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
    padding: "14px 16px",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    border: "1px solid #dbe6dd",
    boxShadow: "0 3px 10px rgba(16,24,40,0.05)",
    transition: "all 0.2s ease",
    "&:hover": { boxShadow: "0 14px 28px rgba(16,24,40,0.12)", borderColor: "#b8d0c1", transform: "translateY(-1px)" },
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 10,
    },
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
  itemActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
    flexShrink: 0,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    [theme.breakpoints.down("sm")]: {
      marginLeft: 0,
      width: "100%",
      justifyContent: "flex-start",
    },
  },
  actionButton: { width: 32, height: 32, borderRadius: 7 },
  actionTextButton: {
    minHeight: 34,
    borderRadius: 9,
    textTransform: "none",
    fontSize: "0.76rem",
    fontWeight: 700,
    lineHeight: 1.2,
    padding: "6px 10px",
    borderWidth: 1,
    borderStyle: "solid",
    "& .MuiButton-startIcon": { marginRight: 6 },
    "&:focus": { boxShadow: "0 0 0 3px rgba(31,157,85,.20)" },
    "&:focus-visible": { boxShadow: "0 0 0 3px rgba(31,157,85,.26)" },
  },
  reportAction: {
    color: "#166534",
    backgroundColor: "#e9f9ef",
    borderColor: "#b6e3c4",
    "&:hover": { backgroundColor: "#d8f2e2", borderColor: "#8ec79f" },
  },
  editAction: {
    color: "#155a9b",
    backgroundColor: "#eaf3ff",
    borderColor: "#bdd7fb",
    "&:hover": { backgroundColor: "#daeafd", borderColor: "#9ec3fa" },
  },
  deleteAction: {
    color: "#b3261e",
    backgroundColor: "#fdeeee",
    borderColor: "#f6c2c0",
    "&:hover": { backgroundColor: "#fbdede", borderColor: "#ee9f9b" },
  },
  viewAction: {
    color: "#155a9b",
    backgroundColor: "#eaf3ff",
    borderColor: "#bdd7fb",
    "&:hover": { backgroundColor: "#daeafd", borderColor: "#9ec3fa" },
  },
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
  sectionTitle: { fontSize: "0.95rem", fontWeight: 800, color: "#132218" },
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
    borderRadius: 12,
    padding: "16px 18px",
    boxShadow: "0 4px 14px rgba(16,24,40,0.07)",
    border: "1px solid #e4ece7",
  },
  progressRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  progressLabel: { fontSize: "0.8rem", fontWeight: 600, color: "#333" },
  progressCount: { fontSize: "0.78rem", color: "#888" },
  progressBarTrack: {
    height: 8,
    borderRadius: 6,
    marginBottom: 12,
    backgroundColor: "#e9efeb",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
    transition: "width .25s ease",
  },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0,1fr))",
    gap: 10,
    margin: "0 14px 12px",
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #dbe6dd",
    borderRadius: 12,
    boxShadow: "0 5px 14px rgba(16,24,40,0.05)",
    padding: "11px 12px",
    transition: "all .2s ease",
  },
  summaryCardActive: {
    borderColor: "#86c39f",
    boxShadow: "0 10px 24px rgba(24,135,71,.18)",
    background: "linear-gradient(180deg, #ffffff 0%, #f2fbf5 100%)",
  },
  summaryLabel: { fontSize: "0.75rem", color: "#5b7165", fontWeight: 600 },
  summaryValue: { fontSize: "1.06rem", color: "#11221a", fontWeight: 800, marginTop: 2 },
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
  const [emailCampaignModalOpen, setEmailCampaignModalOpen] = useState(false);
  const [selectedEmailCampaign, setSelectedEmailCampaign] = useState(null);

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
  const emailCampaigns = campaigns.filter((c) => c.campaignType === "email");
  const whatsappCampaigns = campaigns.filter((c) => !c.campaignType || c.campaignType === "whatsapp");
  const tabItems = [
    { label: "Disparos WhatsApp", helper: "Envios", count: whatsappCampaigns.length, Icon: CampaignIcon },
    { label: "Disparos E-mail", helper: "E-mail em massa", count: emailCampaigns.length, Icon: EmailIcon },
    { label: "Lista de contatos", helper: "Base", count: contactLists.length, Icon: ListAltIcon },
    { label: "Métricas", helper: "Análise", count: totalCampaigns, Icon: CheckCircleIcon },
  ];

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

      {emailCampaignModalOpen && (
        <EmailCampaignModal
          open={emailCampaignModalOpen}
          onClose={() => { setSelectedEmailCampaign(null); setEmailCampaignModalOpen(false); }}
          campaignId={selectedEmailCampaign?.id}
          onSave={() => { setPageNumber(1); }}
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
      <Box className={classes.tabsShell}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          className={classes.tabsBar}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Navegacao de campanhas"
        >
          {tabItems.map(({ label, helper, count, Icon }) => (
            <Tab
              key={label}
              className={classes.tab}
              label={(
                <span className={classes.tabLabelWrap}>
                  <span className={classes.tabIcon}><Icon /></span>
                  <span className={classes.tabTextWrap}>
                    <span className={classes.tabLabel}>{label}</span>
                    <span className={classes.tabHelper}>{helper}</span>
                  </span>
                  <span className={classes.tabCount}>{count}</span>
                </span>
              )}
            />
          ))}
        </Tabs>
      </Box>
      <Box className={classes.summaryRow}>
        <Paper className={`${classes.summaryCard} ${activeTab === 0 ? classes.summaryCardActive : ""}`} elevation={0}>
          <Typography className={classes.summaryLabel}>Disparos WhatsApp</Typography>
          <Typography className={classes.summaryValue}>{whatsappCampaigns.length}</Typography>
        </Paper>
        <Paper className={`${classes.summaryCard} ${activeTab === 1 ? classes.summaryCardActive : ""}`} elevation={0}>
          <Typography className={classes.summaryLabel}>Disparos E-mail</Typography>
          <Typography className={classes.summaryValue}>{emailCampaigns.length}</Typography>
        </Paper>
        <Paper className={`${classes.summaryCard} ${activeTab === 2 ? classes.summaryCardActive : ""}`} elevation={0}>
          <Typography className={classes.summaryLabel}>Listas de contatos</Typography>
          <Typography className={classes.summaryValue}>{contactLists.length}</Typography>
        </Paper>
      </Box>

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
              <Button
                className={classes.addButton}
                startIcon={<AddIcon style={{ fontSize: 18 }} />}
                onClick={() => { setSelectedCampaign(null); setCampaignModalOpen(true); }}
              >
                Nova Campanha
              </Button>
            </Box>
          </Box>

          <Box className={classes.content}>
            {whatsappCampaigns.length === 0 && !loading ? (
              <Box className={classes.emptyState}>
                <CampaignIcon />
                <Typography>Nenhuma campanha WhatsApp encontrada</Typography>
              </Box>
            ) : (
              whatsappCampaigns.map((campaign) => (
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
                    <Button
                      size="small"
                      className={`${classes.actionTextButton} ${classes.reportAction}`}
                      startIcon={<DescriptionIcon style={{ fontSize: 15 }} />}
                      onClick={() => history.push(`/campaign/${campaign.id}/report`)}
                    >
                      Relatório
                    </Button>
                    <Button
                      size="small"
                      className={`${classes.actionTextButton} ${classes.editAction}`}
                      startIcon={<EditIcon style={{ fontSize: 15 }} />}
                      onClick={() => { setSelectedCampaign(campaign); setCampaignModalOpen(true); }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="small"
                      className={`${classes.actionTextButton} ${classes.deleteAction}`}
                      startIcon={<DeleteOutlineIcon style={{ fontSize: 15 }} />}
                      onClick={() => { setConfirmCampaignOpen(true); setDeletingCampaign(campaign); }}
                    >
                      Excluir
                    </Button>
                  </Box>
                </Box>
              ))
            )}
            {loading && <Box className={classes.loadingContainer}><CircularProgress size={26} /></Box>}
          </Box>
        </Box>
      )}

      {/* ── TAB 1: Disparos de E-mail ── */}
      {activeTab === 1 && (
        <Box className={classes.tabContent} onScroll={handleCampaignScroll}>
          <Box className={classes.header}>
            <Box className={classes.headerLeft}>
              <Box className={classes.headerIcon}><EmailIcon style={{ color: "#00d4ff" }} /></Box>
              <Box>
                <Typography className={classes.headerTitle}>Disparos de E-mail</Typography>
                <Typography className={classes.headerSubtitle}>
                  {emailCampaigns.length} {emailCampaigns.length === 1 ? "disparo" : "disparos"}
                </Typography>
              </Box>
            </Box>
            <Box className={classes.headerRight}>
              <Button
                className={classes.addButton}
                startIcon={<AddIcon style={{ fontSize: 18 }} />}
                onClick={() => { setSelectedEmailCampaign(null); setEmailCampaignModalOpen(true); }}
              >
                Novo Disparo de E-mail
              </Button>
            </Box>
          </Box>
          <Box className={classes.content}>
            {emailCampaigns.length === 0 && !loading ? (
              <Box className={classes.emptyState}>
                <EmailIcon />
                <Typography>Nenhum disparo de e-mail encontrado</Typography>
              </Box>
            ) : (
              emailCampaigns.map((campaign) => (
                <Box key={campaign.id} className={classes.listItem}>
                  <Box className={classes.itemIcon} style={{ backgroundColor: "#e3f2fd" }}>
                    <EmailIcon style={{ color: "#1976d2" }} />
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
                      {campaign.emailSubject && (
                        <>
                          <span>•</span>
                          <Box className={classes.itemDetail}>
                            <EmailIcon style={{ fontSize: 12 }} />
                            <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {campaign.emailSubject}
                            </span>
                          </Box>
                        </>
                      )}
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
                    <Button
                      size="small"
                      className={`${classes.actionTextButton} ${classes.reportAction}`}
                      startIcon={<DescriptionIcon style={{ fontSize: 15 }} />}
                      onClick={() => history.push(`/campaign/${campaign.id}/report`)}
                    >
                      Relatório
                    </Button>
                    <Button
                      size="small"
                      className={`${classes.actionTextButton} ${classes.editAction}`}
                      startIcon={<EditIcon style={{ fontSize: 15 }} />}
                      onClick={() => { setSelectedEmailCampaign(campaign); setEmailCampaignModalOpen(true); }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="small"
                      className={`${classes.actionTextButton} ${classes.deleteAction}`}
                      startIcon={<DeleteOutlineIcon style={{ fontSize: 15 }} />}
                      onClick={() => { setConfirmCampaignOpen(true); setDeletingCampaign(campaign); }}
                    >
                      Excluir
                    </Button>
                  </Box>
                </Box>
              ))
            )}
            {loading && <Box className={classes.loadingContainer}><CircularProgress size={26} /></Box>}
          </Box>
        </Box>
      )}

      {/* ── TAB 2: Listas de Contatos ── */}
      {activeTab === 2 && (
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
              <Button
                className={classes.addButton}
                startIcon={<AddIcon style={{ fontSize: 18 }} />}
                onClick={() => { setSelectedList(null); setListModalOpen(true); }}
              >
                Nova Lista
              </Button>
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
                    <Button
                      size="small"
                      className={`${classes.actionTextButton} ${classes.viewAction}`}
                      startIcon={<PeopleIcon style={{ fontSize: 15 }} />}
                      onClick={() => handleViewContacts(list)}
                    >
                      Ver contatos
                    </Button>
                    <Button
                      size="small"
                      className={`${classes.actionTextButton} ${classes.editAction}`}
                      startIcon={<EditIcon style={{ fontSize: 15 }} />}
                      onClick={() => { setSelectedList(list); setListModalOpen(true); }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="small"
                      className={`${classes.actionTextButton} ${classes.deleteAction}`}
                      startIcon={<DeleteOutlineIcon style={{ fontSize: 15 }} />}
                      onClick={() => { setConfirmListOpen(true); setDeletingList(list); }}
                    >
                      Excluir
                    </Button>
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
            <Button
              size="small"
              className={`${classes.actionTextButton} ${classes.reportAction}`}
              startIcon={<PublishIcon style={{ fontSize: 15 }} />}
              onClick={() => setListImportOpen(true)}
            >
              Importar
            </Button>
            <Button
              size="small"
              className={classes.addButton}
              startIcon={<AddIcon style={{ fontSize: 15 }} />}
              onClick={() => { setEditingContactId(null); setContactItemModalOpen(true); }}
            >
              Contato
            </Button>
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
                  <Box style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Button
                      size="small"
                      className={`${classes.actionTextButton} ${classes.editAction}`}
                      startIcon={<EditIcon style={{ fontSize: 13 }} />}
                      onClick={() => { setEditingContactId(contact.id); setContactItemModalOpen(true); }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="small"
                      className={`${classes.actionTextButton} ${classes.deleteAction}`}
                      startIcon={<DeleteOutlineIcon style={{ fontSize: 13 }} />}
                      onClick={() => { setDeletingItem(contact); setConfirmDeleteItemOpen(true); }}
                    >
                      Excluir
                    </Button>
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

      {/* ── TAB 3: Métricas ── */}
      {activeTab === 3 && (
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
                    <Box className={classes.progressBarTrack}>
                      <Box
                        className={classes.progressBarFill}
                        style={{
                          width: `${totalCampaigns > 0 ? (count / totalCampaigns) * 100 : 0}%`,
                          backgroundColor: color,
                        }}
                      />
                    </Box>
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
