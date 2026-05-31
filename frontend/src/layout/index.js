import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import Brightness4Icon from "@material-ui/icons/Brightness4";
import Brightness7Icon from "@material-ui/icons/Brightness7";
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
import SimCardIcon from "@mui/icons-material/SimCard";
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
import AssignmentIcon from "@material-ui/icons/Assignment";
import DescriptionIcon from "@material-ui/icons/Description";

import { AuthContext } from "../context/Auth/AuthContext";
import { usePlanPermissions } from "../context/PlanPermissionsContext";
import { useWorkspacePreferences } from "../context/WorkspacePreferencesContext";
import NotificationsVolume from "../components/NotificationsVolume";
import NotificationCenter from "../components/NotificationCenter";
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
import WebphoneSidePanel from "../components/WebphoneSidePanel";

const backendUrl = getBackendUrl();

const collapsedDrawerWidth = 72;
const expandedDrawerWidth = 220;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "100vh",
    backgroundColor: theme.palette.bgDefault || theme.palette.background.default,
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
  secondaryBar: {
    minHeight: "48px",
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    backgroundColor: theme.palette.secondaryBarBg || "rgba(255, 255, 255, 0.5)",
    backdropFilter: "blur(4px)",
    borderBottom: `1px solid ${theme.palette.secondaryBarBorder || "rgba(0, 0, 0, 0.05)"}`,
    borderTop: `1px solid ${theme.palette.secondaryBarBorder || "rgba(0, 0, 0, 0.04)"}`,
    overflowX: "auto",
    overflowY: "hidden",
    scrollbarWidth: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
    [theme.breakpoints.down("md")]: {
      display: "none",
    },
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flex: 1,
  },
  menuButton: (props) => ({
    display: "none",
    color: "#3b82f6",
    [theme.breakpoints.down("md")]: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      backgroundColor: props.primaryColor || "#3b82f6",
      "& .MuiSvgIcon-root": {
        fontSize: "20px",
        color: "#ffffff",
      },
    },
  }),
  hamburgerButton: (props) => ({
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    color: "#ffffff",
    backgroundColor: props.buttonColor || props.primaryColor || "#3b82f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "& .MuiSvgIcon-root": {
      fontSize: "20px",
      color: "#ffffff",
    },
    "&:hover": {
      backgroundColor: props.buttonColor || props.primaryColor || "#2563eb",
      filter: "brightness(0.9)",
      transform: "scale(1.05)",
    },
    [theme.breakpoints.down("md")]: {
      display: "none",
    },
  }),
  topMenuToggleBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.bgHover,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "& .MuiSvgIcon-root": {
      fontSize: "20px",
      color: theme.palette.text.primary,
    },
    "&:hover": {
      backgroundColor: theme.palette.bgActive,
      transform: "scale(1.05)",
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: "2px",
    },
    [theme.breakpoints.down("md")]: {
      display: "none",
    },
  },
  searchContainer: {
    position: "relative",
    backgroundColor: theme.palette.searchBg || theme.palette.bgSurface,
    borderRadius: "12px",
    border: `1px solid ${theme.palette.searchBorder || theme.palette.borderDefault}`,
    width: "100%",
    maxWidth: "240px",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: theme.palette.borderFocus,
    },
    "&:focus-within": {
      borderColor: theme.palette.borderFocus,
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
  secondaryQuickNavRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: "max-content",
  },
  quickNavBtn: (props) => ({
    backgroundColor: props.buttonColor || theme.palette.quickNavBg,
    color: theme.palette.quickNavText,
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
    border: `1px solid ${theme.palette.type === "dark" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.08)"}`,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: props.buttonColor || theme.palette.quickNavHover,
      filter: props.buttonColor ? "brightness(0.85)" : undefined,
      transform: "translateY(-1px)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
    },
    "&.quickNavActive": {
      backgroundColor: props.buttonColor || (theme.palette.type === "dark" ? "#0f172a" : "#000000"),
      filter: props.buttonColor ? "brightness(0.7)" : undefined,
      border: "1px solid rgba(255,255,255,0.18)",
      boxShadow: "0 0 0 2px rgba(255,255,255,0.08)",
    },
  }),
  secondaryQuickNavBtn: (props) => ({
    backgroundColor: props.buttonColor || theme.palette.quickNavBg,
    "&:hover": {
      backgroundColor: props.buttonColor || theme.palette.quickNavHover,
      filter: props.buttonColor ? "brightness(0.85)" : undefined,
    },
  }),
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
    color: theme.palette.text.secondary,
  },
  searchButton: (props) => ({
    position: "absolute",
    right: "4px",
    top: "50%",
    transform: "translateY(-50%)",
    backgroundColor: props.buttonColor || props.primaryColor || "#3b82f6",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "8px",
    minWidth: "36px",
    height: "36px",
    "&:hover": {
      backgroundColor: props.buttonColor || props.primaryColor || "#2563eb",
      filter: "brightness(0.9)",
    },
  }),
  inputRoot: {
    color: theme.palette.searchText || theme.palette.text.primary,
    width: "100%",
  },
  inputInput: {
    padding: theme.spacing(1, 5, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
    transition: theme.transitions.create("width"),
    width: "100%",
    fontSize: "14px",
    color: theme.palette.searchText || theme.palette.text.primary,
    "&::placeholder": {
      color: theme.palette.text.secondary,
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
    backgroundColor: props.buttonColor || props.primaryColor || "#3b82f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "& .MuiSvgIcon-root": {
      fontSize: "20px",
      color: "#ffffff",
    },
    "&:hover": {
      backgroundColor: props.buttonColor || props.primaryColor || "#2563eb",
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
  kanbanMenuItem: {
    "&:hover": {
      backgroundColor: "rgba(31, 157, 85, 0.14)",
      "& .MuiListItemIcon-root": {
        color: "#ffffff",
      },
    },
    "&.Mui-focusVisible": {
      backgroundColor: "rgba(31, 157, 85, 0.2)",
      boxShadow: "0 0 0 2px rgba(31, 157, 85, 0.35)",
    },
  },
  kanbanMenuItemActive: {
    background: "linear-gradient(135deg, rgba(31, 157, 85, 0.4) 0%, rgba(21, 128, 61, 0.5) 100%)",
    border: "1px solid rgba(34, 197, 94, 0.55)",
    "& .MuiListItemIcon-root": {
      color: "#ffffff",
    },
  },
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
    marginTop: props.shouldHideLayout ? 0 : (props.topMenuVisible ? "112px" : "64px"),
    backgroundColor: theme.palette.bgDefault || theme.palette.background.default,
    height: props.shouldHideLayout ? "100vh" : (props.topMenuVisible ? "calc(100vh - 112px)" : "calc(100vh - 64px)"),
    transition: "margin-top 0.25s ease, height 0.25s ease",
    [theme.breakpoints.down("md")]: {
      marginTop: props.shouldHideLayout ? 0 : "64px",
      height: props.shouldHideLayout ? "100vh" : "calc(100vh - 64px)",
    },
    [theme.breakpoints.down("sm")]: {
      marginTop: props.shouldHideLayout ? 0 : "64px",
      height: props.shouldHideLayout ? "100vh" : "calc(100vh - 64px - 70px)",
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
      backgroundColor: theme.palette.background.paper,
      borderTop: `1px solid ${theme.palette.borderDefault}`,
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
    color: theme.palette.text.primary,
    minWidth: "56px",
    "&:hover": {
      backgroundColor: theme.palette.bgHover,
    },
    "&.active": {
      color: theme.palette.primary.main,
      backgroundColor: theme.palette.bgActive,
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
  mobileNavHamburgerBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    color: theme.palette.text.primary,
    minWidth: "56px",
    "&:hover": {
      backgroundColor: theme.palette.bgHover,
    },
    "&.active": {
      color: theme.palette.primary.main,
      backgroundColor: theme.palette.bgActive,
    },
  },
  mobileNavHamburgerIcon: {
    fontSize: "24px",
    marginBottom: "2px",
  },
  mobileNavDrawer: {
    "& .MuiDrawer-paper": {
      borderTopLeftRadius: "16px",
      borderTopRightRadius: "16px",
      maxHeight: "70vh",
      padding: "0 0 env(safe-area-inset-bottom)",
    },
  },
  mobileNavDrawerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 8px",
    borderBottom: `1px solid ${theme.palette.borderDefault}`,
  },
  mobileNavDrawerTitle: {
    fontWeight: 600,
    fontSize: "15px",
    color: theme.palette.text.primary,
  },
  mobileNavDrawerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    padding: "12px",
    overflowY: "auto",
  },
  mobileNavDrawerItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 8px",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    color: theme.palette.text.secondary,
    gap: "6px",
    "&:hover": {
      backgroundColor: theme.palette.bgHover,
      color: theme.palette.primary.main,
    },
    "&.active": {
      backgroundColor: theme.palette.bgActive,
      color: theme.palette.primary.main,
    },
  },
  mobileNavDrawerItemLabel: {
    fontSize: "11px",
    fontWeight: 500,
    textAlign: "center",
    lineHeight: 1.2,
  },
  contentWithMobileNav: {
    [theme.breakpoints.down("sm")]: {
      paddingBottom: "80px",
    },
  },
  hideOnMobile: {
    [theme.breakpoints.down("sm")]: {
      display: "none !important",
    },
  },
  mobileSearchBtn: (props) => ({
    display: "none",
    [theme.breakpoints.down("sm")]: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      backgroundColor: props.primaryColor || "#3b82f6",
      "& .MuiSvgIcon-root": {
        fontSize: "20px",
        color: "#ffffff",
      },
    },
  }),
  hideOnSmMobile: {
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
      border: `1px solid ${theme.palette.dropdownBorder || theme.palette.borderDefault}`,
      backgroundColor: theme.palette.dropdownBg || theme.palette.background.paper,
    },
  },
  dropdownItem: {
    padding: "12px 16px",
    fontSize: "14px",
    color: theme.palette.dropdownText || theme.palette.text.primary,
    "&:hover": {
      backgroundColor: theme.palette.dropdownHover || theme.palette.bgHover,
    },
  },
  dropdownIcon: {
    minWidth: "36px",
    color: theme.palette.dropdownMuted || theme.palette.text.secondary,
  },
  divider: {
    margin: "8px 0",
    backgroundColor: theme.palette.dropdownBorder || theme.palette.divider,
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
  const { isMenuVisible } = useWorkspacePreferences();
  const isAdmin = user?.profile === "admin";
  const isSuperAdmin = Boolean(user?.super) || (isAdmin && user?.companyId === 1);
  const { toggleColorMode, mode: colorMode, buttonColorLight, buttonColorDark } = useContext(ColorModeContext);
  const resolvedButtonColor = colorMode === "dark"
    ? (buttonColorDark || buttonColorLight || null)
    : (buttonColorLight || null);
  const {
    planActive,
    loading: planLoading,
    gestor_financeiro_ia,
    propostas,
    followUps,
    webphone,
  } = usePlanPermissions();
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

  const [topMenuVisible, setTopMenuVisible] = useState(() => {
    return localStorage.getItem("topMenuVisible") !== "false";
  });
  const showTopNavigation = !isSuperAdmin;
  const effectiveTopMenuVisible = showTopNavigation && topMenuVisible;

  const classes = useStyles({
    theme,
    drawerWidth,
    drawerExpanded,
    isMobileSession,
    primaryColor: theme?.palette?.primary?.main || "#3b82f6",
    buttonColor: resolvedButtonColor,
    shouldHideLayout,
    topMenuVisible: effectiveTopMenuVisible,
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
  const [mobileNavMenuOpen, setMobileNavMenuOpen] = useState(false);

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

  const handleToggleTopMenu = () => {
    const newValue = !topMenuVisible;
    setTopMenuVisible(newValue);
    localStorage.setItem("topMenuVisible", String(newValue));
  };

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const isQuickNavItemActive = (item) => {
    if (Array.isArray(item.activePaths) && item.activePaths.length > 0) {
      return item.activePaths.some((path) => isActivePath(path));
    }

    return isActivePath(item.path);
  };

  const menuTitleKeyMap = {
    Dashboard: "dashboard",
    Disparos: "disparos",
    Campanhas: "campanhas",
    "Chat Interno": "chat-interno",
    "Chat Agendamento": "chat-agendamento",
    Compromissos: "compromissos",
    Tutoriais: "tutoriais",
    Conversas: "conversas",
    Chamadas: "chamadas",
    "CRM Kanban": "crm-kanban",
    Etiquetas: "etiquetas",
    Contatos: "contatos",
    Leads: "leads",
    Clientes: "clientes",
    "Follow-ups": "follow-ups",
    Canais: "canais",
    Produtos: "produtos",
    Propostas: "propostas",
    Agenda: "agenda",
    Projetos: "projetos",
    Tarefas: "tarefas",
    Departamentos: "departamentos",
    "Gestor Financeiro IA": "gestor-financeiro-ia",
    Faturas: "faturas",
    Financeiro: "financeiro",
    "SMTP (E-mail)": "smtp",
    Banners: "banners",
  };

  const isNavigationItemVisible = useCallback(
    (item) => {
      const key = item?.menuKey || menuTitleKeyMap[item?.title];
      return isMenuVisible(key);
    },
    [isMenuVisible]
  );

  // Detectar se está dentro de uma conversa de ticket (para ocultar menu mobile e header)
  const isInsideTicketConversation =
    /\/tickets\/[a-zA-Z0-9-]+$/i.test(location.pathname) ||
    /\/atendimentos\/[a-zA-Z0-9-]+$/i.test(location.pathname);

  // Detectar se está no Flow Builder (para ocultar menu lateral)
  const isFlowBuilderPage =
    location.pathname.startsWith("/flowbuilder/") &&
    location.pathname !== "/flowbuilder" &&
    location.pathname !== "/flowbuilder/";

  const primaryQuickNavItems = useMemo(
    () => [
      {
        key: "dashboard",
        title: "Dashboard",
        label: "Dashboard",
        path: "/painel",
        icon: <DashboardIcon style={{ fontSize: 17 }} />,
      },
      {
        key: "relatorios",
        title: "Relatórios",
        label: "Relatórios",
        path: "/relatorios",
        icon: <BarChartIcon style={{ fontSize: 17 }} />,
      },
      {
        key: "disparos",
        title: "Disparos",
        label: "Disparos",
        path: "/campanhas",
        icon: <SendIcon style={{ fontSize: 17 }} />,
      },
      {
        key: "campanhas",
        title: "Campanhas",
        label: "Campanhas",
        path: "/phrase-lists",
        icon: <CampaignOutlinedIcon style={{ fontSize: 17 }} />,
      },
      {
        key: "chat-interno",
        title: "Chat Interno",
        label: "Chat Interno",
        path: "/chats",
        icon: <ChatBubbleOutlineIcon style={{ fontSize: 17 }} />,
      },
    ],
    []
  );

  const secondaryQuickNavItems = useMemo(
    () => [
      {
        key: "aquecimento",
        title: "Aquecimento WhatsApp",
        label: "Aquecimento",
        path: "/aquecimento-whatsapp",
        icon: (
          <span style={{ fontSize: 15 }} role="img" aria-label="Aquecimento">
            {String.fromCodePoint(0x1f525)}
          </span>
        ),
      },
      {
        key: "chips",
        title: "Gerenciar Chips (SIM Cards)",
        label: "Chips",
        path: "/chips",
        icon: <SimCardIcon style={{ fontSize: 15 }} />,
      },
      {
        key: "agente-ia",
        title: "Agente de IA",
        label: "Agente de IA",
        path: "/agentes",
        activePaths: ["/agentes", "/prompts"],
        icon: <PsychologyIcon style={{ fontSize: 15 }} />,
      },
      {
        key: "construtor-fluxo",
        title: "Construtor de Fluxo",
        label: "Construtor de Fluxo",
        path: "/flowbuilders",
        activePaths: ["/flowbuilders", "/flowbuilder"],
        icon: <AccountTreeIcon style={{ fontSize: 15 }} />,
      },
      {
        key: "automacoes",
        title: "Automações",
        label: "Automações",
        path: "/automations",
        activePaths: ["/automations"],
        icon: <FlashOnIcon style={{ fontSize: 15 }} />,
      },
      {
        key: "chat-agendamento",
        title: "Chat Agendamento",
        label: "Chat Agendamento",
        path: "/lembretes",
        icon: <ScheduleIcon style={{ fontSize: 15 }} />,
      },
      {
        key: "compromissos",
        title: "Compromissos",
        label: "Compromissos",
        path: "/appointments",
        icon: <CalendarMonthIcon style={{ fontSize: 15 }} />,
      },
      {
        key: "tutoriais",
        title: "Tutoriais",
        label: "Tutoriais",
        path: "/helps",
        icon: <PlayCircleOutlineIcon style={{ fontSize: 15 }} />,
      },
    ],
    []
  );

  const renderQuickNavItems = (items, buttonClassName = classes.quickNavBtn) =>
    items.filter((item) => isMenuVisible(item.key)).map((item) => (
      <Tooltip key={item.key} title={item.title}>
        <button
          type="button"
          className={`${buttonClassName} ${isQuickNavItemActive(item) ? "quickNavActive" : ""}`}
          onClick={() => history.push(item.path)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      </Tooltip>
    ));

  const menuGroups = useMemo(
    () => [
      // ── Conversas (grupo compacto: Conversas + Chamadas) ─────────────
      {
        title: "Conversas",
        icon: <ChatIcon />,
        disabled: !planActive && location.pathname !== "/financeiro",
        children: [
          { title: "Conversas", path: "/atendimentos" },
          ...(webphone ? [{ title: "Chamadas", path: "/chamadas", featureKey: "webphone" }] : []),
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
      ...(followUps ? [{ title: "Follow-ups", path: "/follow-ups", icon: <ScheduleIcon />, disabled: !planActive && location.pathname !== "/financeiro" }] : []),
      { title: "Canais", path: "/canais", icon: <DeviceHubIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Respostas rápidas", path: "/quick-messages", icon: <QuestionAnswerIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Biblioteca de Mídia", path: "/media-drive", icon: <VideoLibraryIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Produtos", path: "/produtos", icon: <ExtensionIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Serviços", path: "/servicos", icon: <BuildOutlinedIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      ...(propostas ? [{ title: "Propostas", path: "/propostas", icon: <DescriptionIcon />, disabled: !planActive && location.pathname !== "/financeiro" }] : []),
      { title: "Agenda", path: "/user-schedules", icon: <CalendarMonthIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Projetos", path: "/projects", icon: <FolderIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Tarefas", path: "/crm/tasks", icon: <AssignmentIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Departamentos", path: "/departamentos", icon: <BusinessIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      ...(gestor_financeiro_ia ? [{
        title: "Gestor Financeiro IA",
        path: "/gestor-financas/gestor-financeiro-ia",
        icon: <LocalAtmIcon />,
        disabled: !planActive && location.pathname !== "/financeiro",
      }] : []),
      { title: "Faturas", path: "/faturas", icon: <LocalAtmIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      { title: "Financeiro", path: "/financeiro", icon: <AttachMoneyIcon />, disabled: !planActive && location.pathname !== "/financeiro", adminOnly: true },
      { title: "Gateways de Pagamento", path: "/payment-settings", icon: <TuneIcon />, disabled: !planActive && location.pathname !== "/financeiro", adminOnly: true },
      { title: "Documentação", path: "/messages-api", icon: <HelpOutlineIcon />, disabled: !planActive && location.pathname !== "/financeiro" },
      {
        title: "Gestor Finanças",
        icon: <LocalAtmIcon />,
        disabled: !planActive && location.pathname !== "/financeiro",
        children: [
          { title: "Gestor Financeiro IA", path: "/gestor-financas/gestor-financeiro-ia" },
        ],
      },
      // ── Grupos mantidos ──────────────────────────────────────────────
      {
        title: "Automação",
        icon: <SmartToyIcon />,
        disabled: !planActive && location.pathname !== "/financeiro",
        children: [
          { title: "Integrações", path: "/integracao" },
          { title: "Ferramentas", path: "/ferramentas" },
        ],
      },
      {
        title: "Sistema",
        icon: <BuildIcon />,
        disabled: !planActive && location.pathname !== "/financeiro",
        children: [
          { title: "Configurações", path: "/settings" },
          { title: "SMTP (E-mail)", path: "/smtp" },
          { title: "Personalizacao de menus", path: "/workspace/menu-settings", menuKey: "personalizacao-menus" },
          { title: "Campos do card do lead", path: "/crm/lead-field-settings", menuKey: "personalizacao-lead" },
          { title: "SIP / Webphone", path: "/sip-settings", featureKey: "webphone" },
          { title: "Banners", path: "/slider-banners", superAdmin: true },
          { title: "Vídeo Tutorial", path: "/tutorial-videos", superAdmin: true },
        ],
      },
    ],
    [planActive, location.pathname, gestor_financeiro_ia, propostas, followUps, webphone]
  );

  const superAdminMenuGroups = useMemo(
    () => [
      {
        title: "AdministraÃ§Ã£o",
        icon: <BusinessIcon />,
        children: [
          { title: "Empresas", path: "/settings?tab=companies", activePath: "/settings", activeSearch: "tab=companies" },
          { title: "Planos", path: "/settings?tab=plans", activePath: "/settings", activeSearch: "tab=plans" },
          { title: "IA e APIs", path: "/admin/ai-settings" },
          { title: "Whitelabel", path: "/settings?tab=whitelabel", activePath: "/settings", activeSearch: "tab=whitelabel" },
          { title: "Cadastro", path: "/settings?tab=cadastro", activePath: "/settings", activeSearch: "tab=cadastro" },
        ],
      },
      {
        title: "Sistema",
        icon: <BuildIcon />,
        children: [
          { title: "ConfiguraÃ§Ãµes", path: "/settings?tab=options", activePath: "/settings", activeSearch: "tab=options" },
          { title: "Personalizacao de menus", path: "/workspace/menu-settings", menuKey: "personalizacao-menus" },
          { title: "Campos do card do lead", path: "/crm/lead-field-settings", menuKey: "personalizacao-lead" },
          { title: "SMTP (E-mail)", path: "/smtp" },
          { title: "SIP / Webphone", path: "/sip-settings", featureKey: "webphone" },
          { title: "Banners", path: "/slider-banners" },
          { title: "VÃ­deo Tutorial", path: "/tutorial-videos" },
        ],
      },
      {
        title: "Ferramentas",
        icon: <SmartToyIcon />,
        children: [
          { title: "AutomaÃ§Ãµes", path: "/automations" },
          { title: "DocumentaÃ§Ã£o", path: "/messages-api" },
        ],
      },
    ],
    []
  );

  const filteredMenuGroups = useMemo(() => {
    const applyPlanVisibility = (group) => {
      if (!group) return null;

      if (group.title === "Gestor Finanças") {
        return null;
      }

      if (group.featureKey === "webphone" && !webphone) {
        return null;
      }

      if (group.children) {
        const children = group.children.filter((child) => child && !(child.featureKey === "webphone" && !webphone) && isNavigationItemVisible(child));
        if (!children.length) return null;
        return { ...group, children };
      }

      return isNavigationItemVisible(group) ? group : null;
    };

    if (isSuperAdmin) {
      return superAdminMenuGroups
        .map(applyPlanVisibility)
        .filter(Boolean);
    }

    if (isAdmin) {
      // Admin normal: ocultar itens superAdmin
      return menuGroups
        .filter(Boolean)
        .map((group) => {
          const visibleGroup = applyPlanVisibility(group);
          if (!visibleGroup) return null;
          if (!visibleGroup.children) return visibleGroup;
          const filtered = visibleGroup.children.filter((child) => !child.superAdmin);
          return filtered.length ? { ...visibleGroup, children: filtered } : null;
        })
        .filter(Boolean);
    }

    // Para usuários comuns: Mostrar tudo, exceto grupo "Sistema" e itens adminOnly
    return menuGroups
      .filter((group) => group && !group.adminOnly)
      .map((group) => {
        const visibleGroup = applyPlanVisibility(group);
        if (!visibleGroup) return null;
        if (!visibleGroup.children) return visibleGroup;
        const filtered = visibleGroup.children.filter((child) => {
          if (!child || child.path === "/users" || child.adminOnly) return false;
          if (visibleGroup.title === "Sistema") {
            return child.path === "/workspace/menu-settings" || child.path === "/crm/lead-field-settings";
          }
          return true;
        });
        return filtered.length ? { ...visibleGroup, children: filtered } : null;
      })
      .filter(Boolean);
  }, [isAdmin, isSuperAdmin, menuGroups, superAdminMenuGroups, webphone, isNavigationItemVisible]);

  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (title) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const getMenuTarget = useCallback((item) => {
    const [pathOnly, searchOnly = ""] = item.path.split("?");
    return {
      path: item.activePath || pathOnly,
      search: item.activeSearch || searchOnly,
    };
  }, []);

  const isMenuTargetActive = useCallback((item, exact = false) => {
    const target = getMenuTarget(item);
    const pathMatches = exact
      ? location.pathname === target.path
      : location.pathname === target.path || location.pathname.startsWith(target.path + "/");
    const searchMatches = target.search
      ? location.search.replace(/^\?/, "") === target.search
      : true;
    return pathMatches && searchMatches;
  }, [getMenuTarget, location.pathname, location.search]);

  // Auto-expand the menu group that contains the current path
  useEffect(() => {
    filteredMenuGroups.forEach((group) => {
      if (group.children) {
        const hasActivePath = group.children.some((child) => isMenuTargetActive(child, child.exact));
        if (hasActivePath) {
          setOpenMenus((prev) => ({ ...prev, [group.title]: true }));
        }
      }
    });
  }, [filteredMenuGroups, isMenuTargetActive]);

  const MenuItemWithTooltip = ({ path, icon, title, exact = false, disabled = false }) => {
    const menuItem = { path };
    const target = getMenuTarget(menuItem);
    const isActive = isMenuTargetActive(menuItem, exact);

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
      // Auto-close mobile sidebar after navigation
      if (isMobile) setMobileOpen(false);
    };

    const item = (
      <ListItem
        button
        disabled={disabled}
        onClick={handleClick}
        className={`${classes.menuItem} ${target.path === "/kanban" ? classes.kanbanMenuItem : ""} ${isActive ? "active" : ""} ${target.path === "/kanban" && isActive ? classes.kanbanMenuItemActive : ""}`}
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

      <ProductivityTimer userId={user?.id} collapsed={!showMenuLabels} />

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
            const hasActivePath = group.children.some((child) => isMenuTargetActive(child, child.exact));

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
                      const isChildActive = isMenuTargetActive(child, child.exact);

                      return (
                        <ListItem
                          button
                          key={child.path}
                          onClick={() => {
                            if (!isChildActive) history.push(child.path);
                            if (isMobile) setMobileOpen(false);
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
      <WebphoneSidePanel />
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

              {/* Menu Button Mobile - renderizado condicionalmente via isMobile */}
              {!isFlowBuilderPage && isMobile && (
                <IconButton
                  onClick={handleDrawerToggle}
                  edge="start"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: resolvedButtonColor || primaryColor,
                    color: "#ffffff",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <MenuIcon style={{ fontSize: "22px", color: "#ffffff" }} />
                </IconButton>
              )}

              {/* Hamburger Button - Desktop (sidebar toggle) */}
              {!isFlowBuilderPage && !isMobile && (
                <IconButton
                  className={classes.hamburgerButton}
                  onClick={handleToggleSidebarPin}
                  title={sidebarPinned ? "Recolher menu" : "Fixar menu aberto"}
                >
                  {sidebarPinned ? <CloseIcon style={{ fontSize: 22 }} /> : <MenuIcon style={{ fontSize: 22 }} />}
                </IconButton>
              )}

              {/* Top Menu Toggle Button - Desktop (mostra/oculta barra de navegação superior) */}
              {!isFlowBuilderPage && !isMobile && showTopNavigation && (
                <Tooltip title={topMenuVisible ? "Ocultar menu superior" : "Exibir menu superior"}>
                  <IconButton
                    className={classes.topMenuToggleBtn}
                    onClick={handleToggleTopMenu}
                    aria-label={topMenuVisible ? "Ocultar menu superior" : "Exibir menu superior"}
                    aria-expanded={topMenuVisible}
                  >
                    {topMenuVisible
                      ? <ExpandLessIcon style={{ fontSize: 20 }} />
                      : <ExpandMoreIcon style={{ fontSize: 20 }} />}
                  </IconButton>
                </Tooltip>
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
              {!isMobile && effectiveTopMenuVisible && (
                <div className={classes.quickNavRow}>
                  {renderQuickNavItems(primaryQuickNavItems)}
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
              {/* Busca - Ícone Mobile (renderizado condicionalmente via isMobile) */}
              {isMobile && (
                <IconButton
                  onClick={() => setSearchModalOpen(true)}
                  title="Buscar"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: resolvedButtonColor || primaryColor,
                    color: "#ffffff",
                    padding: 0,
                  }}
                >
                  <SearchIcon style={{ fontSize: "20px", color: "#ffffff" }} />
                </IconButton>
              )}

              {/* Botão Refresh - Oculto no mobile */}
              {!isMobile && (
                <IconButton
                  className={classes.iconButton}
                  onClick={handleRefreshPage}
                  title="Atualizar"
                >
                  <CachedIcon />
                </IconButton>
              )}

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

              {/* Chat Interno Popover - Oculto no mobile para não lotar o header */}
              {!isMobile && (
                <div className={classes.iconButton}>
                  <ChatPopover />
                </div>
              )}

              {/* Central de Notificações */}
              {!isMobile && (
                <div className={classes.iconButton}>
                  <NotificationCenter />
                </div>
              )}

              {/* Volume - Oculto no mobile */}
              {!isMobile && (
                <div className={classes.iconButton}>
                  <NotificationsVolume setVolume={setVolume} volume={volume} />
                </div>
              )}

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
          <div
            style={{
              overflow: "hidden",
              maxHeight: effectiveTopMenuVisible ? "56px" : "0",
              opacity: effectiveTopMenuVisible ? 1 : 0,
              transition: "max-height 0.25s ease, opacity 0.2s ease",
            }}
          >
            <div className={classes.secondaryBar}>
              <div className={classes.secondaryQuickNavRow}>
                {renderQuickNavItems(
                  secondaryQuickNavItems,
                  `${classes.quickNavBtn} ${classes.secondaryQuickNavBtn}`
                )}
              </div>
            </div>
          </div>
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

          <MenuItem
            onClick={() => { toggleColorMode(); handleUserMenuClose(); }}
            className={classes.dropdownItem}
          >
            <ListItemIcon className={classes.dropdownIcon}>
              {colorMode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            </ListItemIcon>
            <ListItemText primary={colorMode === "dark" ? "Modo Claro" : "Modo Escuro"} />
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

          {/* Botão Centro - Menu de Navegação (Hambúrguer) */}
          <div
            className={`${classes.mobileNavHamburgerBtn} ${mobileNavMenuOpen ? "active" : ""}`}
            onClick={() => setMobileNavMenuOpen(true)}
          >
            <MenuIcon className={classes.mobileNavHamburgerIcon} />
            <span className={classes.mobileNavLabel}>Menu</span>
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

      {/* Drawer do Menu de Navegação Mobile */}
      <Drawer
        anchor="bottom"
        open={mobileNavMenuOpen}
        onClose={() => setMobileNavMenuOpen(false)}
        className={classes.mobileNavDrawer}
      >
        <div className={classes.mobileNavDrawerHeader}>
          <span className={classes.mobileNavDrawerTitle}>Navegação</span>
          <IconButton size="small" onClick={() => setMobileNavMenuOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
        <div className={classes.mobileNavDrawerGrid}>
          {[
            { path: "/atendimentos", label: "Conversas", icon: <ChatIcon style={{ fontSize: 22 }} /> },
            { path: "/kanban", label: "CRM Kanban", icon: <ViewKanbanIcon style={{ fontSize: 22 }} /> },
            { path: "/leads", label: "Leads", icon: <PeopleOutlineIcon style={{ fontSize: 22 }} /> },
            { path: "/contatos", label: "Contatos", icon: <ContactsIcon style={{ fontSize: 22 }} /> },
            { path: "/canais", label: "Canais", icon: <DeviceHubIcon style={{ fontSize: 22 }} /> },
            { path: "/quick-messages", label: "Respostas Rápidas", icon: <QuestionAnswerIcon style={{ fontSize: 22 }} /> },
            { path: "/campanhas", label: "Disparos", icon: <SendIcon style={{ fontSize: 22 }} /> },
            { path: "/phrase-lists", label: "Campanhas", icon: <CampaignOutlinedIcon style={{ fontSize: 22 }} /> },
            { path: "/relatorios", label: "Relatórios", icon: <BarChartIcon style={{ fontSize: 22 }} /> },
            { path: "/painel", label: "Dashboard", icon: <DashboardIcon style={{ fontSize: 22 }} /> },
            { path: "/produtos", label: "Produtos", icon: <ExtensionIcon style={{ fontSize: 22 }} /> },
            { path: "/crm/tasks", label: "Tarefas", icon: <AssignmentIcon style={{ fontSize: 22 }} /> },
            { path: "/settings", label: "Configurações", icon: <SettingsIcon style={{ fontSize: 22 }} /> },
            { path: "/chats", label: "Chat Interno", icon: <ChatBubbleOutlineIcon style={{ fontSize: 22 }} /> },
            { path: "/clientes", label: "Clientes", icon: <BusinessCenterIcon style={{ fontSize: 22 }} /> },
            { path: "/users", label: "Usuários", icon: <GroupIcon style={{ fontSize: 22 }} /> },
          ].map(item => (
            <div
              key={item.path}
              className={`${classes.mobileNavDrawerItem} ${isActivePath(item.path) ? "active" : ""}`}
              onClick={() => { history.push(item.path); setMobileNavMenuOpen(false); }}
            >
              {item.icon}
              <span className={classes.mobileNavDrawerItemLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
};

export default LoggedInLayout;
