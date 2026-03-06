import React, { useContext, useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  makeStyles,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Avatar,
  Box,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Badge,
  Tooltip,
  Collapse,
} from "@material-ui/core";
import InputBase from "@material-ui/core/InputBase";

// Ícones
import DashboardIcon from "@material-ui/icons/Dashboard";
import PeopleIcon from "@material-ui/icons/People";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SettingsIcon from "@material-ui/icons/Settings";
import ContactsIcon from "@material-ui/icons/Contacts";
import DeviceHubIcon from "@material-ui/icons/DeviceHub";
import GroupIcon from "@material-ui/icons/Group";
import GroupWorkIcon from "@material-ui/icons/GroupWork";
import SmartToyIcon from "@material-ui/icons/Android";
import ViewListIcon from "@material-ui/icons/ViewList";
import BarChartIcon from "@material-ui/icons/BarChart";
import AnnouncementIcon from "@material-ui/icons/Announcement";
import BuildIcon from "@material-ui/icons/Build";
import BusinessIcon from "@material-ui/icons/Business";
import BusinessCenterIcon from "@material-ui/icons/BusinessCenter";
import PersonAddIcon from "@material-ui/icons/PersonAdd";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import NotificationsIcon from "@material-ui/icons/Notifications";
import VolumeUpIcon from "@material-ui/icons/VolumeUp";
import RefreshIcon from "@material-ui/icons/Refresh";
import SyncIcon from "@material-ui/icons/Sync";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import CachedIcon from "@material-ui/icons/Cached";
import NotificationsActiveIcon from "@material-ui/icons/NotificationsActive";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import AccountCircleIcon from "@material-ui/icons/AccountCircle";
import PersonIcon from "@material-ui/icons/Person";
import PsychologyIcon from "@mui/icons-material/Psychology";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import FolderSpecialIcon from "@mui/icons-material/FolderSpecial";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import ListAltIcon from "@material-ui/icons/ListAlt";
import ScheduleIcon from "@material-ui/icons/Schedule";
import TuneIcon from "@material-ui/icons/Tune";
import MenuIcon from "@material-ui/icons/Menu";
import CloseIcon from "@material-ui/icons/Close";
import AttachMoneyIcon from "@material-ui/icons/AttachMoney";
import FolderIcon from "@material-ui/icons/Folder";
import ShareIcon from "@material-ui/icons/Share";
import ChatIcon from "@material-ui/icons/Chat";
import ExtensionIcon from "@material-ui/icons/Extension";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import QuestionAnswerIcon from "@material-ui/icons/QuestionAnswer";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import VideoLibraryIcon from "@material-ui/icons/VideoLibrary";
import PhotoIcon from "@material-ui/icons/Photo";
import PlayCircleFilledIcon from "@material-ui/icons/PlayCircleFilled";
import QueueIcon from "@material-ui/icons/Queue";
import PhoneIcon from "@material-ui/icons/Phone";
import LabelIcon from "@material-ui/icons/Label";
import SearchIcon from "@material-ui/icons/Search";
import TrendingUpIcon from "@material-ui/icons/TrendingUp";

import { AuthContext } from "../context/Auth/AuthContext";
import { usePlanPermissions } from "../context/PlanPermissionsContext";
import NotificationsVolume from "../components/NotificationsVolume";
import UserModal from "../components/UserModal";
import ProductivityTimer from "./ProductivityTimer";
import SearchTicketModal from "../components/SearchTicketModal";
import { getBackendUrl } from "../config";
import { i18n } from "../translate/i18n";
import f002Image from "../assets/f002.png";
import logo from "../assets/logo.png";
import ColorModeContext from "./themeContext";
import { useSystemAlert } from "../components/SystemAlert";
import SendIcon from "@material-ui/icons/Send";
import QuickSendModal from "../components/QuickSendModal";
import WhatsAppWarmupModal from "../components/WhatsAppWarmupModal";
import ChatPopover from "../pages/Chat/ChatPopover";

const backendUrl = getBackendUrl();

const collapsedDrawerWidth = 72;
const expandedDrawerWidth = 220;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#f8f9fa",
  },
  // Header Styles - Fundo transparente
  appBar: (props) => ({
    backgroundColor: "transparent !important",
    background: "transparent !important",
    color: "#3b82f6",
    boxShadow: "none !important",
    borderBottom: "none",
    zIndex: theme.zIndex.drawer + 1,
    marginLeft: props.drawerWidth,
    width: `calc(100% - ${props.drawerWidth}px)`,
    transition: "margin-left 0.2s ease, width 0.2s ease",
    [theme.breakpoints.down("md")]: {
      marginLeft: 0,
      width: "100%",
    },
  }),
  toolbar: {
    minHeight: "64px",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flex: 1,
  },
  menuButton: {
    display: "none",
    color: "#3b82f6",
  },
  hamburgerButton: (props) => ({
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    color: "#ffffff",
    backgroundColor: props.primaryColor || "#3b82f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "& .MuiSvgIcon-root": {
      fontSize: "20px",
      color: "#ffffff",
    },
    "&:hover": {
      backgroundColor: props.primaryColor || "#2563eb",
      filter: "brightness(0.9)",
      transform: "scale(1.05)",
    },
    [theme.breakpoints.down("md")]: {
      display: "none",
    },
  }),
  searchContainer: {
    position: "relative",
    backgroundColor: "#f3f4f6",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    width: "100%",
    maxWidth: "240px",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: "#3b82f6",
    },
    "&:focus-within": {
      borderColor: "#3b82f6",
      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
    },
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  quickNavRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexShrink: 0,
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  quickNavBtn: {
    backgroundColor: "#111111",
    color: "#ffffff",
    borderRadius: "10px",
    padding: "0 12px",
    minWidth: "auto",
    height: "40px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "none",
    letterSpacing: "0.2px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s ease",
    border: "1px solid rgba(255,255,255,0.08)",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#1a1a1a",
      transform: "translateY(-1px)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
    },
    "&.quickNavActive": {
      backgroundColor: "#000000",
      border: "1px solid rgba(255,255,255,0.18)",
      boxShadow: "0 0 0 2px rgba(255,255,255,0.08)",
    },
  },
  mobileLogo: {
    display: "none",
    [theme.breakpoints.down("sm")]: {
      display: "flex",
      alignItems: "center",
      height: "40px",
      "& img": {
        height: "36px",
        width: "auto",
      },
    },
  },
  searchIcon: {
    padding: theme.spacing(0, 2),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#000000",
  },
  searchButton: (props) => ({
    position: "absolute",
    right: "4px",
    top: "50%",
    transform: "translateY(-50%)",
    backgroundColor: props.primaryColor || "#3b82f6",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "8px",
    minWidth: "36px",
    height: "36px",
    "&:hover": {
      backgroundColor: props.primaryColor || "#2563eb",
      filter: "brightness(0.9)",
    },
  }),
  inputRoot: {
    color: "#3b82f6",
    width: "100%",
  },
  inputInput: {
    padding: theme.spacing(1, 5, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
    transition: theme.transitions.create("width"),
    width: "100%",
    fontSize: "14px",
    color: "#3b82f6",
    "&::placeholder": {
      color: "#000000",
      opacity: 1,
    },
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px",
    height: "100%",
  },
  iconButton: (props) => ({
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    color: "#ffffff",
    backgroundColor: props.primaryColor || "#3b82f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "& .MuiSvgIcon-root": {
      fontSize: "20px",
      color: "#ffffff",
    },
    "&:hover": {
      backgroundColor: props.primaryColor || "#2563eb",
      filter: "brightness(0.9)",
      transform: "scale(1.05)",
    },
  }),
  avatar: (props) => ({
    width: "40px",
    height: "40px",
    cursor: "pointer",
    border: "2px solid #e5e7eb",
    backgroundColor: props.primaryColor || "#3b82f6",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: props.primaryColor || "#3b82f6",
      transform: "scale(1.05)",
    },
  }),
  // Sidebar Styles - Escuro com ícones
  drawer: (props) => ({
    width: props.drawerWidth,
    flexShrink: 0,
    [theme.breakpoints.down("md")]: {
      display: "none",
    },
  }),
  drawerPaper: (props) => ({
    width: props.drawerWidth,
    backgroundColor: props.primaryColor || "#3b82f6",
    borderRight: "none",
    borderTopRightRadius: 18,
    borderBottomRightRadius: 0,
    overflowX: "hidden",
    overflowY: "auto",
    scrollbarWidth: "none",
    transition: "width 0.2s ease, background-color 0.3s ease",
    [theme.breakpoints.down("md")]: {
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    },
    "&::-webkit-scrollbar": {
      display: "none",
    },
  }),
  mobileDrawer: {
    [theme.breakpoints.up("lg")]: {
      display: "none",
    },
  },
  drawerHeader: (props) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: props.drawerWidth > collapsedDrawerWidth ? "flex-start" : "center",
    padding: props.drawerWidth > collapsedDrawerWidth ? "16px 12px" : "16px 0",
    minHeight: "64px",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: props.primaryColor || "#3b82f6",
  }),
  logo: (props) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: props.drawerWidth > collapsedDrawerWidth ? "flex-start" : "center",
    cursor: "pointer",
    width: "100%",
  }),
  logoIcon: (props) => ({
    fontSize: props.drawerWidth > collapsedDrawerWidth ? "36px" : "32px",
    color: "#3b82f6",
    transition: "font-size 0.2s ease",
  }),
  logoText: {
    display: "none",
  },
  companyLogo: (props) => ({
    height: "36px",
    width: props.drawerWidth > collapsedDrawerWidth ? "160px" : "36px",
    objectFit: "contain",
    borderRadius: "8px",
    transition: "width 0.2s ease",
  }),
  faviconLogo: {
    height: "32px",
    width: "32px",
    objectFit: "contain",
    borderRadius: "6px",
  },
  sidebarContent: (props) => ({
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: props.drawerWidth > collapsedDrawerWidth ? "12px 8px" : "8px 0",
    width: "100%",
    boxSizing: "border-box",
    scrollbarWidth: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  }),
  menuSectionLabel: (props) => ({
    display: props.drawerWidth > collapsedDrawerWidth ? "block" : "none",
    fontSize: "0.68rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(255, 255, 255, 0.7)",
    margin: "12px 16px 4px",
  }),
  menuList: (props) => ({
    padding: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: props.drawerWidth > collapsedDrawerWidth ? "stretch" : "center",
    gap: "4px",
  }),
  menuItem: (props) => ({
    padding: props.drawerWidth > collapsedDrawerWidth ? "10px 14px" : "12px",
    margin: "0",
    borderRadius: "12px",
    transition: "all 0.2s ease",
    minHeight: "auto",
    width: props.drawerWidth > collapsedDrawerWidth ? "100%" : "48px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: props.drawerWidth > collapsedDrawerWidth ? "flex-start" : "center",
    gap: props.drawerWidth > collapsedDrawerWidth ? "12px" : 0,
    "&:hover": {
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      "& .MuiListItemIcon-root": {
        color: "#000000",
      },
    },
    "&.active": {
      backgroundColor: "rgba(59, 130, 246, 0.15)",
      "& .MuiListItemIcon-root": {
        color: "#000000",
      },
    },
  }),
  menuIcon: (props) => ({
    minWidth: props.drawerWidth > collapsedDrawerWidth ? "auto" : "initial",
    color: "#ffffff",
    margin: props.drawerWidth > collapsedDrawerWidth ? "0 0 0 4px" : 0,
    "& .MuiSvgIcon-root": {
      fontSize: "22px",
    },
  }),
  menuText: (props) => ({
    display: props.drawerWidth > collapsedDrawerWidth ? "block" : "none",
    color: "#f1f5f9",
    fontSize: "14px",
    fontWeight: 500,
    letterSpacing: "0.2px",
  }),
  badge: {
    "& .MuiBadge-badge": {
      backgroundColor: "#ef4444",
      color: "#ffffff",
      fontSize: "10px",
      minWidth: "16px",
      height: "16px",
      top: "4px",
      right: "4px",
    },
  },
  menuDivider: (props) => ({
    width: props.drawerWidth > collapsedDrawerWidth ? "80%" : "32px",
    height: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    margin: props.drawerWidth > collapsedDrawerWidth ? "12px auto" : "8px auto",
  }),
  submenuParent: (props) => ({
    padding: props.drawerWidth > collapsedDrawerWidth ? "10px 14px" : "12px",
    margin: "0",
    borderRadius: "12px",
    transition: "all 0.2s ease",
    minHeight: "auto",
    width: props.drawerWidth > collapsedDrawerWidth ? "100%" : "48px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: props.drawerWidth > collapsedDrawerWidth ? "flex-start" : "center",
    gap: props.drawerWidth > collapsedDrawerWidth ? "12px" : 0,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      "& .MuiListItemIcon-root": {
        color: "#000000",
      },
    },
    "&.active": {
      backgroundColor: "rgba(59, 130, 246, 0.08)",
    },
  }),
  submenuExpandIcon: (props) => ({
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "18px",
    marginLeft: "auto",
    display: props.drawerWidth > collapsedDrawerWidth ? "block" : "none",
    transition: "transform 0.2s ease",
  }),
  submenuList: (props) => ({
    paddingLeft: props.drawerWidth > collapsedDrawerWidth ? "20px" : 0,
    paddingTop: 0,
    paddingBottom: 0,
  }),
  submenuItem: (props) => ({
    padding: props.drawerWidth > collapsedDrawerWidth ? "6px 14px 6px 16px" : "8px",
    margin: "0",
    borderRadius: "8px",
    transition: "all 0.2s ease",
    minHeight: "auto",
    width: props.drawerWidth > collapsedDrawerWidth ? "100%" : "40px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: props.drawerWidth > collapsedDrawerWidth ? "flex-start" : "center",
    "&:hover": {
      backgroundColor: "rgba(59, 130, 246, 0.1)",
    },
    "&.active": {
      backgroundColor: "transparent",
    },
  }),
  submenuText: (props) => ({
    display: props.drawerWidth > collapsedDrawerWidth ? "block" : "none",
    color: "rgba(241, 245, 249, 0.85)",
    fontSize: "13px",
    fontWeight: 400,
    letterSpacing: "0.2px",
  }),
  submenuTextActive: {
    position: "relative",
    "&::after": {
      content: '""',
      position: "absolute",
      bottom: -2,
      left: 0,
      width: "20px",
      height: "2px",
      backgroundColor: "#ffffff",
      borderRadius: "1px",
    },
  },
  // Content Styles
  content: (props) => ({
    flex: 1,
    overflow: "auto",
    marginTop: props.shouldHideLayout ? 0 : "64px",
    backgroundColor: "#f8f9fa",
    height: props.shouldHideLayout ? "100vh" : "calc(100vh - 64px)",
    transition: "width 0.2s ease",
    [theme.breakpoints.down("md")]: {
      marginTop: props.shouldHideLayout ? 0 : "64px",
      height: props.shouldHideLayout ? "100vh" : "calc(100vh - 64px)",
    },
  }),
  // Mobile Bottom Navigation
  mobileBottomNav: {
    display: "none",
    [theme.breakpoints.down("sm")]: {
      display: "flex",
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: "70px",
      backgroundColor: "#ffffff",
      borderTop: "1px solid #e5e7eb",
      justifyContent: "space-around",
      alignItems: "center",
      zIndex: theme.zIndex.drawer + 2,
      padding: "0 8px",
      paddingBottom: "env(safe-area-inset-bottom)",
      boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.08)",
    },
  },
  mobileNavItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    color: "#000000",
    minWidth: "56px",
    "&:hover": {
      backgroundColor: "rgba(59, 130, 246, 0.08)",
    },
    "&.active": {
      color: "#3b82f6",
      backgroundColor: "rgba(59, 130, 246, 0.12)",
      "& $mobileNavIcon": {
        color: "#3b82f6",
      },
      "& $mobileNavLabel": {
        color: "#3b82f6",
        fontWeight: 600,
      },
    },
  },
  mobileNavIcon: {
    fontSize: "24px",
    marginBottom: "2px",
  },
  mobileNavLabel: {
    fontSize: "10px",
    fontWeight: 500,
    textAlign: "center",
    lineHeight: 1.2,
  },
  mobileNavHomeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    color: "#ffffff",
    boxShadow: "0 4px 15px rgba(59, 130, 246, 0.4)",
    marginTop: "-20px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "scale(1.05)",
      boxShadow: "0 6px 20px rgba(59, 130, 246, 0.5)",
    },
    "&:active": {
      transform: "scale(0.95)",
    },
  },
  mobileNavHomeIcon: {
    fontSize: "28px",
  },
  contentWithMobileNav: {
    [theme.breakpoints.down("sm")]: {
      paddingBottom: "-80px",
    },
  },
  hideOnMobile: {
    [theme.breakpoints.down("sm")]: {
      display: "none !important",
    },
  },
  // Menu Dropdown
  dropdownMenu: {
    marginTop: "8px",
    "& .MuiPaper-root": {
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
      border: "1px solid #e5e7eb",
    },
  },
  dropdownItem: {
    padding: "12px 16px",
    fontSize: "14px",
    "&:hover": {
      backgroundColor: "#f3f4f6",
    },
  },
  dropdownIcon: {
    minWidth: "36px",
    color: "#6b7280",
  },
  divider: {
    margin: "8px 0",
    backgroundColor: "#e5e7eb",
  },
  // Estilos do Banner IA SDR
  aiSdrBanner: {
    margin: "16px 12px 20px 12px",
    padding: "0",
    background: "#2a2a2a",
    borderRadius: "12px",
    color: "white",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
    position: "relative",
    overflow: "hidden",
  },
  bannerContent: {
    padding: "16px",
    position: "relative",
    zIndex: 2,
  },
  bannerTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "white !important",
    marginBottom: "4px",
    lineHeight: "1.3",
  },
  bannerSubtitle: {
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.7) !important",
    lineHeight: "1.4",
    fontWeight: "400",
    marginBottom: "12px",
  },
  bannerImage: {
    width: "100%",
    height: "120px",
    backgroundImage: `url(${f002Image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    borderRadius: "8px",
    marginBottom: "12px",
    position: "relative",
    "&::after": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(to top, rgba(0,0,0,0.3), transparent)",
      borderRadius: "8px",
    },
  },
  bannerButton: {
    width: "100%",
    padding: "10px 16px",
    background: "#ffffff",
    border: "none",
    borderRadius: "8px",
    color: "#2a2a2a",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    "&:hover": {
      background: "#f0f0f0",
      transform: "translateY(-1px)",
    },
  },
}));

const LoggedInLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    return localStorage.getItem("sidebarPinned") === "true";
  });
  const [drawerExpanded, setDrawerExpanded] = useState(() => !isMobile || sidebarPinned);
  const drawerWidth = isMobile
    ? expandedDrawerWidth
    : drawerExpanded
      ? expandedDrawerWidth
      : collapsedDrawerWidth;
  const showMenuLabels = drawerWidth > collapsedDrawerWidth || isMobile;
  const primaryColor = theme.palette.primary.main || "#3b82f6";
  const history = useHistory();
  const location = useLocation();

  const { user, handleLogout, loading, isMobileSession } = useContext(AuthContext);
  const { planActive, loading: planLoading } = usePlanPermissions();
  const { showAlert } = useSystemAlert();

  // Verificar se está no modo mobile app (via URL params)
  const urlParams = new URLSearchParams(location.search);
  const mobileApp = urlParams.get('mobileApp') === 'true';
  const hideHeader = urlParams.get('hideHeader') === 'true';
  const hideMenu = urlParams.get('hideMenu') === 'true';

  // Detectar se está na página atendimentomobile
  const isAtendimentosMobilePage = location.pathname.startsWith("/atendimentomobile");

  // Ocultar layout completamente se estiver na página atendimentomobile
  const shouldHideLayout = isAtendimentosMobilePage;

  const classes = useStyles({
    theme,
    drawerWidth,
    drawerExpanded,
    isMobileSession,
    primaryColor: theme?.palette?.primary?.main || "#3b82f6",
    shouldHideLayout
  });

  const [anchorEl, setAnchorEl] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [profileUrl, setProfileUrl] = useState(null);
  const [volume, setVolume] = useState(localStorage.getItem("volume") || 1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [quickSendOpen, setQuickSendOpen] = useState(false);
  const [warmupModalOpen, setWarmupModalOpen] = useState(false);

  useEffect(() => {
    if (sidebarPinned) {
      setDrawerExpanded(true);
    } else {
      setDrawerExpanded(!isMobile);
    }
  }, [isMobile, sidebarPinned]);

  const handleToggleSidebarPin = () => {
    const newValue = !sidebarPinned;
    setSidebarPinned(newValue);
    localStorage.setItem("sidebarPinned", String(newValue));
    setDrawerExpanded(newValue || !isMobile);
  };

  useEffect(() => {
    if (user?.profileImage) {
      const nextUrl = `${backendUrl}/public/company${user.companyId}/user/${user.profileImage}`;
      setProfileUrl((current) => (current !== nextUrl ? nextUrl : current));
    } else {
      setProfileUrl((current) => (current !== null ? null : current));
    }
  }, [user?.profileImage, user?.companyId]);

  // BLOQUEIO PARA PLANOS VENCIDOS
  useEffect(() => {
    // Se ainda está carregando informações do plano, não faz nada
    if (planLoading || loading) return;

    // Se o plano não está ativo (vencido) e a empresa não está ativa, e não está na página financeiro
    if (!planActive && !user?.company?.status && location.pathname !== "/financeiro") {
      // Redireciona para a página financeiro
      history.push("/financeiro");

      // Mostra alerta sobre o bloqueio
      showAlert({
        type: "warning",
        title: "Plano Vencido",
        message: "Para continuar usando o sistema, por favor, regularize seu pagamento na página Financeiro.",
        confirmText: "Entendi",
      });
    }
  }, [planActive, planLoading, loading, location.pathname, history, user?.company?.status]);

  const handleUserMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
    setUserMenuOpen(true);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
    setUserMenuOpen(false);
  };

  const handleOpenUserModal = () => {
    setUserModalOpen(true);
    setUserMenuOpen(false);
  };

  const handleLogoutClick = () => {
    handleLogout();
  };

  const handleRefreshPage = () => {
    window.location.reload();
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  // Detectar se está dentro de uma conversa de ticket (para ocultar menu mobile e header)
  const isInsideTicketConversation =
    /\/tickets\/[a-zA-Z0-9-]+$/i.test(location.pathname) ||
    /\/atendimentos\/[a-zA-Z0-9-]+$/i.test(location.pathname);

  // Detectar se está no Flow Builder (para ocultar menu lateral)
  const isFlowBuilderPage =
    location.pathname.startsWith("/flowbuilder/") &&
    location.pathname !== "/flowbuilder" &&
    location.pathname !== "/flowbuilder/";

  const menuGroups = useMemo(
    () => [
      // ── Conversas (grupo compacto: Conversas + Chamadas) ─────────────
      {
        title: "Conversas",
        icon: <ChatIcon />,
        disabled: !planActive && location.pathname !== "/financeiro",
        children: [
          { title: "Conversas", path: "/atendimentos" },
          { title: "Chamadas", path: "/chamadas" },
        ],
      },
      // ── Itens absolutos ──────────────────────────────────────────────
      { title: "CRM Kanban", path: "/kanban", icon: <ViewKanbanIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Etiquetas", path: "/etiquetas", icon: <LabelIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Contatos", path: "/contatos", icon: <ContactsIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Leads", path: "/leads", icon: <PeopleOutlineIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Clientes", path: "/clientes", icon: <BusinessCenterIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Usuários", path: "/users", icon: <GroupIcon />, disabled: !planActive && location.pathname !== "/financeiro", adminOnly: true },
      { title: "Gestão de Grupos", path: "/group-management", icon: <GroupWorkIcon />, disabled: !planActive && location.pathname !== "/financeiro", adminOnly: true },
      { title: "Follow-ups", path: "/follow-ups", icon: <ScheduleIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Canais", path: "/canais", icon: <DeviceHubIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Respostas rápidas", path: "/quick-messages", icon: <QuestionAnswerIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Produtos", path: "/produtos", icon: <ExtensionIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Serviços", path: "/servicos", icon: <BuildOutlinedIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Agenda", path: "/user-schedules", icon: <CalendarMonthIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Projetos", path: "/projects", icon: <FolderIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Departamentos", path: "/departamentos", icon: <BusinessIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Faturas", path: "/faturas", icon: <LocalAtmIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      // ── Grupos mantidos ──────────────────────────────────────────────
      {
        title: "Automação",
        icon: <SmartToyIcon />,
        disabled: !planActive && location.pathname !== "/financeiro",
        children: [
          { title: "Agente de IA", path: "/agentes" },
          { title: "Construtor de Fluxo", path: "/flowbuilders" },
          { title: "Integrações", path: "/integracao" },
          { title: "Ferramentas", path: "/ferramentas" },
          { title: "Automações", path: "/automations" },
          { title: "Lembretes", path: "/lembretes" },
        ],
      },
      {
        title: "Ajuda",
        icon: <HelpOutlineIcon />,
        disabled: !planActive && location.pathname !== "/financeiro",
        children: [
          { title: "Ajuda", path: "/helps" },
          { title: "Documentação", path: "/messages-api" },
        ],
      },
      {
        title: "Sistema",
        icon: <BuildIcon />,
        disabled: !planActive && location.pathname !== "/financeiro",
        children: [
          { title: "Financeiro", path: "/financeiro" },
          { title: "Configurações", path: "/settings" },
          { title: "Gateways de Pagamento", path: "/payment-settings", adminOnly: true },
          { title: "SMTP (E-mail)", path: "/smtp" },
          { title: "Banners", path: "/slider-banners", superAdmin: true },
          { title: "Vídeo Tutorial", path: "/tutorial-videos", superAdmin: true },
        ],
      },
    ],
    [planActive, location.pathname]
  );

  const isAdmin = user?.profile === "admin";
  const isSuperAdmin = isAdmin && user?.companyId === 1;

  const filteredMenuGroups = useMemo(() => {
    if (isAdmin) {
      if (isSuperAdmin) return menuGroups;
      // Admin normal: ocultar itens superAdmin
      return menuGroups
        .filter(Boolean)
        .map((group) => {
          if (!group.children) return group;
          const filtered = group.children.filter((child) => !child.superAdmin);
          return { ...group, children: filtered };
        });
    }

    // Para usuários comuns: Mostrar tudo, exceto grupo "Sistema" e itens adminOnly
    return menuGroups
      .filter((group) => group && group.title !== "Sistema" && !group.adminOnly)
      .map((group) => {
        if (!group.children) return group;
        const filtered = group.children.filter((child) => child && child.path !== "/users");
        return { ...group, children: filtered };
      });
  }, [isAdmin, isSuperAdmin, menuGroups]);

  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (title) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Auto-expand the menu group that contains the current path
  useEffect(() => {
    filteredMenuGroups.forEach((group) => {
      if (group.children) {
        const hasActivePath = group.children.some(
          (child) => location.pathname === child.path || location.pathname.startsWith(child.path + "/")
        );
        if (hasActivePath) {
          setOpenMenus((prev) => ({ ...prev, [group.title]: true }));
        }
      }
    });
  }, [location.pathname]);

  const MenuItemWithTooltip = ({ path, icon, title, exact = false, disabled = false }) => {
    const isActive = exact
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(path + "/");

    const handleClick = (event) => {
      if (disabled) {
        event.preventDefault();
        // Mostra alerta ao tentar acessar com plano vencido
        showAlert({
          type: "warning",
          title: "Acesso Bloqueado",
          message: "Seu plano está vencido. Para acessar esta funcionalidade, por favor, regularize seu pagamento na página Financeiro.",
          confirmText: "Entendi",
        });
        return;
      }
      if (!isActive) {
        history.push(path);
      }
    };

    const item = (
      <ListItem
        button
        disabled={disabled}
        onClick={handleClick}
        className={`${classes.menuItem} ${isActive ? "active" : ""}`}
      >
        <ListItemIcon className={classes.menuIcon}>{icon}</ListItemIcon>
        {showMenuLabels && (
          <ListItemText
            primary={title}
            classes={{ primary: classes.menuText }}
          />
        )}
      </ListItem>
    );

    if (showMenuLabels) {
      return item;
    }

    return (
      <Tooltip title={title} placement="right" arrow>
        {item}
      </Tooltip>
    );
  };

  const DrawerContent = () => (
    <div>
      <div className={classes.drawerHeader}>
        <Tooltip title="Painel" placement="right">
          <div className={classes.logo} onClick={() => history.push("/painel")}>
            {showMenuLabels ? (
              (theme.appLogoLight || theme.calculatedLogoLight?.()) ? (
                <img
                  src={theme.calculatedLogoLight ? theme.calculatedLogoLight() : theme.appLogoLight}
                  alt="Logo"
                  className={classes.companyLogo}
                />
              ) : (
                <DashboardIcon className={classes.logoIcon} />
              )
            ) : (
              theme.appLogoFavicon ? (
                <img
                  src={theme.appLogoFavicon}
                  alt="Favicon"
                  className={classes.faviconLogo}
                />
              ) : (
                <DashboardIcon className={classes.logoIcon} />
              )
            )}
          </div>
        </Tooltip>
      </div>

      {showMenuLabels && <ProductivityTimer userId={user?.id} />}

      <div className={classes.sidebarContent}>
        <List className={classes.menuList}>
          <div className={classes.menuSectionLabel}>Menu</div>
          {filteredMenuGroups.map((group) => {
            // Item sem submenu (ex: Kanban)
            if (!group.children) {
              return (
                <MenuItemWithTooltip
                  key={group.path}
                  path={group.path}
                  icon={group.icon}
                  title={group.title}
                  disabled={group.disabled}
                />
              );
            }

            // Item com submenu
            const isOpen = openMenus[group.title] || false;
            const hasActivePath = group.children.some(
              (child) => location.pathname === child.path || location.pathname.startsWith(child.path + "/")
            );

            const parentItem = (
              <ListItem
                button
                onClick={() => {
                  if (group.disabled) {
                    showAlert({
                      type: "warning",
                      title: "Acesso Bloqueado",
                      message: "Seu plano está vencido. Para acessar esta funcionalidade, por favor, regularize seu pagamento na página Financeiro.",
                      confirmText: "Entendi",
                    });
                    return;
                  }
                  toggleMenu(group.title);
                }}
                className={`${classes.submenuParent} ${hasActivePath ? "active" : ""}`}
                disabled={group.disabled}
              >
                <ListItemIcon className={classes.menuIcon}>{group.icon}</ListItemIcon>
                {showMenuLabels && (
                  <>
                    <ListItemText
                      primary={group.title}
                      classes={{ primary: classes.menuText }}
                    />
                    {isOpen ? (
                      <ExpandLessIcon className={classes.submenuExpandIcon} />
                    ) : (
                      <ExpandMoreIcon className={classes.submenuExpandIcon} />
                    )}
                  </>
                )}
              </ListItem>
            );

            return (
              <div key={group.title}>
                {showMenuLabels ? (
                  parentItem
                ) : (
                  <Tooltip title={group.title} placement="right" arrow>
                    {parentItem}
                  </Tooltip>
                )}
                <Collapse in={isOpen && showMenuLabels} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding className={classes.submenuList}>
                    {group.children.map((child) => {
                      const isChildActive = child.exact
                        ? location.pathname === child.path
                        : location.pathname === child.path || location.pathname.startsWith(child.path + "/");

                      return (
                        <ListItem
                          button
                          key={child.path}
                          onClick={() => {
                            if (!isChildActive) history.push(child.path);
                          }}
                          className={`${classes.submenuItem} ${isChildActive ? "active" : ""}`}
                        >
                          <ListItemText
                            primary={child.title}
                            classes={{ primary: `${classes.submenuText} ${isChildActive ? classes.submenuTextActive : ""}` }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
              </div>
            );
          })}
          <div className={classes.menuSectionLabel}>Version 2.0</div>
        </List>
      </div>
    </div>
  );

  return (
    <div className={classes.root}>
      {/* Sidebar Desktop - Ocultar se estiver no modo mobile app */}
      {!shouldHideLayout && (
        <Drawer
          className={classes.drawer}
          variant="permanent"
          onMouseEnter={() => {
            if (!isMobile && !sidebarPinned) setDrawerExpanded(true);
          }}
          onMouseLeave={() => {
            if (!isMobile && !sidebarPinned) setDrawerExpanded(false);
          }}
          classes={{
            paper: classes.drawerPaper,
          }}
        >
          <DrawerContent />
        </Drawer>
      )}

      {/* Sidebar Mobile - Ocultar se estiver no modo mobile app */}
      {!shouldHideLayout && (
        <Drawer
          className={classes.mobileDrawer}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          classes={{
            paper: classes.drawerPaper,
          }}
        >
          <DrawerContent />
        </Drawer>
      )}

      {/* Header - Ocultar se estiver no modo mobile app */}
      {!shouldHideLayout && (
        <AppBar position="fixed" color="transparent" elevation={0} className={classes.appBar}>
          <Toolbar className={classes.toolbar}>
            {/* Seção Esquerda */}
            <div className={classes.headerLeft}>
              {/* Back Button - Visível apenas no Flow Builder */}
              {isFlowBuilderPage && (
                <IconButton
                  className={classes.menuButton}
                  onClick={() => history.push("/flowbuilders")}
                  edge="start"
                  title="Voltar para lista de fluxos"
                >
                  <ArrowBackIcon />
                </IconButton>
              )}

              {/* Menu Button Mobile - Oculto no Flow Builder */}
              {!isFlowBuilderPage && (
                <IconButton
                  className={classes.menuButton}
                  onClick={handleDrawerToggle}
                  edge="start"
                >
                  <MenuIcon />
                </IconButton>
              )}

              {/* Hamburger Button - Desktop */}
              {!isFlowBuilderPage && !isMobile && (
                <IconButton
                  className={classes.hamburgerButton}
                  onClick={handleToggleSidebarPin}
                  title={sidebarPinned ? "Recolher menu" : "Fixar menu aberto"}
                >
                  {sidebarPinned ? <CloseIcon style={{ fontSize: 22 }} /> : <MenuIcon style={{ fontSize: 22 }} />}
                </IconButton>
              )}

              {/* Busca - Oculto no mobile */}
              <div
                className={classes.searchContainer}
                onClick={() => setSearchModalOpen(true)}
                style={{ cursor: "pointer" }}
              >
                <div className={classes.searchIcon}>
                  <SearchIcon />
                </div>
                <InputBase
                  placeholder="Buscar conversas..."
                  classes={{
                    root: classes.inputRoot,
                    input: classes.inputInput,
                  }}
                  readOnly
                  style={{ cursor: "pointer" }}
                />
                <Button className={classes.searchButton}>
                  <SearchIcon style={{ fontSize: 18 }} />
                </Button>
              </div>

              {/* Dashboard e Relatórios — botões pretos compactos ao lado da busca */}
              {!isMobile && (
                <div className={classes.quickNavRow}>
                  <Tooltip title="Dashboard">
                    <button
                      className={`${classes.quickNavBtn} ${isActivePath("/painel") ? "quickNavActive" : ""}`}
                      onClick={() => history.push("/painel")}
                    >
                      <DashboardIcon style={{ fontSize: 17 }} />
                      <span>Dashboard</span>
                    </button>
                  </Tooltip>
                  <Tooltip title="Relatórios">
                    <button
                      className={`${classes.quickNavBtn} ${isActivePath("/relatorios") ? "quickNavActive" : ""}`}
                      onClick={() => history.push("/relatorios")}
                    >
                      <BarChartIcon style={{ fontSize: 17 }} />
                      <span>Relatórios</span>
                    </button>
                  </Tooltip>
                  <Tooltip title="Disparos">
                    <button
                      className={`${classes.quickNavBtn} ${isActivePath("/campanhas") ? "quickNavActive" : ""}`}
                      onClick={() => history.push("/campanhas")}
                    >
                      <SendIcon style={{ fontSize: 17 }} />
                      <span>Disparos</span>
                    </button>
                  </Tooltip>
                  <Tooltip title="Campanhas">
                    <button
                      className={`${classes.quickNavBtn} ${isActivePath("/phrase-lists") ? "quickNavActive" : ""}`}
                      onClick={() => history.push("/phrase-lists")}
                    >
                      <CampaignOutlinedIcon style={{ fontSize: 17 }} />
                      <span>Campanhas</span>
                    </button>
                  </Tooltip>
                  <Tooltip title="Chat Interno">
                    <button
                      className={`${classes.quickNavBtn} ${isActivePath("/chats") ? "quickNavActive" : ""}`}
                      onClick={() => history.push("/chats")}
                    >
                      <ChatBubbleOutlineIcon style={{ fontSize: 17 }} />
                      <span>Chat Interno</span>
                    </button>
                  </Tooltip>
                  <Tooltip title="Aquecimento WhatsApp">
                    <button
                      className={classes.quickNavBtn}
                      onClick={() => setWarmupModalOpen(true)}
                    >
                      <span style={{ fontSize: 15 }}>🔥</span>
                      <span>Aquecimento</span>
                    </button>
                  </Tooltip>
                </div>
              )}

              {/* Logo - Visível apenas no mobile */}
              <div className={classes.mobileLogo}>
                {(theme.appLogoLight || theme.calculatedLogoLight?.()) ? (
                  <img
                    src={theme.calculatedLogoLight ? theme.calculatedLogoLight() : theme.appLogoLight}
                    alt="Logo"
                  />
                ) : (
                  <img src={logo} alt="Logo" />
                )}
              </div>
            </div>

            {/* Seção Direita */}
            <div className={classes.headerRight}>
              {/* Botão Refresh */}
              <IconButton
                className={classes.iconButton}
                onClick={handleRefreshPage}
                title="Atualizar"
              >
                <CachedIcon />
              </IconButton>

              {/* ── Botão Quick Send (Mensagem Rápida) ─────────────────── */}
              <Tooltip title="Mensagem Rápida">
                <IconButton
                  id="quick-send-header-btn"
                  className={classes.iconButton}
                  onClick={() => setQuickSendOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, #075E54, #25D366)',
                    position: 'relative',
                  }}
                >
                  <SendIcon style={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>

              {/* Chat Interno Popover */}
              <div className={classes.iconButton}>
                <ChatPopover />
              </div>

              {/* Volume */}
              <div className={classes.iconButton}>
                <NotificationsVolume setVolume={setVolume} volume={volume} />
              </div>

              {/* Avatar do Usuário */}
              <Avatar
                className={classes.avatar}
                src={profileUrl}
                onClick={handleUserMenuClick}
              >
                {!profileUrl && <PersonIcon />}
              </Avatar>
            </div>
          </Toolbar>
        </AppBar>
      )}

      {/* Menu do Usuário - Ocultar se estiver no modo mobile app */}
      {!shouldHideLayout && (
        <Menu
          anchorEl={anchorEl}
          open={userMenuOpen}
          onClose={handleUserMenuClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          className={classes.dropdownMenu}
        >
          <MenuItem onClick={handleOpenUserModal} className={classes.dropdownItem}>
            <ListItemIcon className={classes.dropdownIcon}>
              <AccountCircleIcon />
            </ListItemIcon>
            <ListItemText primary="Meu Perfil" />
          </MenuItem>

          <Divider className={classes.divider} />

          <MenuItem onClick={handleLogoutClick} className={classes.dropdownItem}>
            <ListItemIcon className={classes.dropdownIcon}>
              <ExitToAppIcon />
            </ListItemIcon>
            <ListItemText primary={isMobileSession ? "Sair do app" : "Sair"} />
          </MenuItem>
        </Menu>
      )}

      {/* Modal do Usuário - Ocultar se estiver no modo mobile app */}
      {!shouldHideLayout && userModalOpen && (
        <UserModal
          open={userModalOpen}
          onClose={() => setUserModalOpen(false)}
          onImageUpdate={(newProfileUrl) => setProfileUrl(newProfileUrl)}
          userId={user?.id}
        />
      )}

      {/* Modal de Busca de Conversas */}
      <SearchTicketModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* ── Modal de Mensagem Rápida ─────────────────────────────── */}
      <QuickSendModal
        open={quickSendOpen}
        onClose={() => setQuickSendOpen(false)}
      />

      {/* ── Modal de Aquecimento do WhatsApp ──────────────────────── */}
      <WhatsAppWarmupModal
        open={warmupModalOpen}
        onClose={() => setWarmupModalOpen(false)}
      />

      {/* Conteúdo Principal */}
      <main className={`${classes.content} ${!isInsideTicketConversation && !isFlowBuilderPage && !isAtendimentosMobilePage ? classes.contentWithMobileNav : ""}`}>
        {children}
      </main>

      {/* Menu Mobile Fixo - Oculto no desktop, dentro de conversa de ticket, no Flow Builder e na página atendimentomobile */}
      {!isInsideTicketConversation && !isFlowBuilderPage && !isAtendimentosMobilePage && (
        <div className={classes.mobileBottomNav}>
          {/* Botão 1 - Painel */}
          <div
            className={`${classes.mobileNavItem} ${isActivePath("/painel") ? "active" : ""}`}
            onClick={() => history.push("/painel")}
          >
            <DashboardIcon className={classes.mobileNavIcon} />
            <span className={classes.mobileNavLabel}>Painel</span>
          </div>

          {/* Botão 2 - Contatos */}
          <div
            className={`${classes.mobileNavItem} ${isActivePath("/contatos") ? "active" : ""}`}
            onClick={() => history.push("/contatos")}
          >
            <ContactsIcon className={classes.mobileNavIcon} />
            <span className={classes.mobileNavLabel}>Contatos</span>
          </div>

          {/* Botão Home (Centro) - Tickets */}
          <div
            className={classes.mobileNavHomeBtn}
            onClick={() => history.push("/atendimentos")}
          >
            <ChatIcon className={classes.mobileNavHomeIcon} />
          </div>

          {/* Botão 4 - Canais */}
          <div
            className={`${classes.mobileNavItem} ${isActivePath("/canais") ? "active" : ""}`}
            onClick={() => history.push("/canais")}
          >
            <DeviceHubIcon className={classes.mobileNavIcon} />
            <span className={classes.mobileNavLabel}>Canais</span>
          </div>

          {/* Botão 5 - Relatórios */}
          <div
            className={`${classes.mobileNavItem} ${isActivePath("/relatorios") ? "active" : ""}`}
            onClick={() => history.push("/relatorios")}
          >
            <BarChartIcon className={classes.mobileNavIcon} />
            <span className={classes.mobileNavLabel}>Relatórios</span>
          </div>
          {/* Botão 6 - Disparos */}
          <div
            className={`${classes.mobileNavItem} ${isActivePath("/campanhas") ? "active" : ""}`}
            onClick={() => history.push("/campanhas")}
          >
            <SendIcon className={classes.mobileNavIcon} />
            <span className={classes.mobileNavLabel}>Disparos</span>
          </div>
          {/* Botão 7 - Campanhas */}
          <div
            className={`${classes.mobileNavItem} ${isActivePath("/phrase-lists") ? "active" : ""}`}
            onClick={() => history.push("/phrase-lists")}
          >
            <CampaignOutlinedIcon className={classes.mobileNavIcon} />
            <span className={classes.mobileNavLabel}>Campanhas</span>
          </div>
          {/* Botão 8 - Chat Interno */}
          <div
            className={`${classes.mobileNavItem} ${isActivePath("/chats") ? "active" : ""}`}
            onClick={() => history.push("/chats")}
          >
            <ChatBubbleOutlineIcon className={classes.mobileNavIcon} />
            <span className={classes.mobileNavLabel}>Chat</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoggedInLayout;