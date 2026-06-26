import React, { useContext, useEffect, useReducer, useState, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  MenuItem,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import SearchIcon from "@material-ui/icons/Search";
import PsychologyIcon from "@material-ui/icons/EmojiObjects";
import SaveIcon from "@material-ui/icons/Save";
import RestoreIcon from "@material-ui/icons/Restore";
import HistoryIcon from "@material-ui/icons/History";
import DashboardIcon from "@material-ui/icons/Dashboard";
import EventNoteIcon from "@material-ui/icons/EventNote";
import NotificationsActiveIcon from "@material-ui/icons/NotificationsActive";
import StorageIcon from "@material-ui/icons/Storage";
import SettingsIcon from "@material-ui/icons/Settings";
import ListAltIcon from "@material-ui/icons/ListAlt";
import SendIcon from "@material-ui/icons/Send";
import GroupIcon from "@material-ui/icons/Group";
import LinkIcon from "@material-ui/icons/Link";
import MemoryIcon from "@material-ui/icons/Memory";
import VisibilityIcon from "@material-ui/icons/Visibility";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import DeleteSweepIcon from "@material-ui/icons/DeleteSweep";
import WarningIcon from "@material-ui/icons/Warning";
import BlockIcon from "@material-ui/icons/Block";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import TimerIcon from "@material-ui/icons/Timer";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import ChatBubbleOutlineIcon from "@material-ui/icons/ChatBubbleOutline";
import PromptModal from "../../components/PromptModal";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import { AuthContext } from "../../context/Auth/AuthContext";
import usePlans from "../../hooks/usePlans";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import ForbiddenPage from "../../components/ForbiddenPage";
import { TOOL_CATALOG, DEFAULT_SENSITIVE_TOOLS } from "../../constants/aiTools";
import { useSocket } from "../../context/SocketContext";

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
    flexWrap: "wrap",
  },
  toolsWrapper: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 8,
    maxWidth: 400,
  },
  toolChip: {
    fontWeight: 600,
    fontSize: "0.65rem",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  toolChipSensitive: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  },
  toolChipSafe: {
    backgroundColor: "#e0f2fe",
    color: "#075985",
  },
  toolsEmpty: {
    fontSize: "0.75rem",
    color: "#9ca3af",
    fontStyle: "italic",
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
  editButton: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    "&:hover": {
      backgroundColor: "#bbdefb",
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
  agentTabs: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 24px 0",
    backgroundColor: "#f5f5f5",
    flexWrap: "wrap",
  },
  agentTab: {
    border: "1px solid #e0e0e0",
    backgroundColor: "#fff",
    color: "#5f6b7a",
    borderRadius: 8,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: "#1976d2",
      color: "#1976d2",
    },
  },
  agentTabActive: {
    backgroundColor: "#1f5eea",
    borderColor: "#1f5eea",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#174fc7",
      color: "#fff",
    },
  },
  externalGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.8fr)",
    gap: 16,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  externalMenu: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  duplicateButton: {
    backgroundColor: "#f3e8ff",
    color: "#7e22ce",
    "&:hover": {
      backgroundColor: "#e9d5ff",
    },
  },
  metricsButton: {
    backgroundColor: "#ecfdf5",
    color: "#047857",
    "&:hover": {
      backgroundColor: "#d1fae5",
    },
  },
  statusChip: {
    fontWeight: 700,
    fontSize: "0.68rem",
    height: 22,
  },
  externalMenuSecondary: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  externalMenuButton: {
    minHeight: 40,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    backgroundColor: "#fff",
    color: "#526173",
    fontWeight: 700,
    padding: "8px 12px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "& svg": {
      fontSize: 18,
    },
    "&:hover": {
      borderColor: "#1f5eea",
      color: "#1f5eea",
    },
  },
  externalMenuButtonActive: {
    backgroundColor: "#1f5eea",
    borderColor: "#1f5eea",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#174fc7",
      color: "#fff",
    },
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 16,
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "repeat(2, minmax(160px, 1fr))",
    },
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  metricBox: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 14,
  },
  promptGalleryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    marginBottom: 8,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
  },
  promptTemplateCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "10px 12px",
    backgroundColor: "#fff",
    cursor: "pointer",
    transition: "all 0.15s ease",
    "&:hover": {
      borderColor: "#1f5eea",
      boxShadow: "0 2px 8px rgba(31,94,234,0.12)",
    },
  },
  templateCardIcon: {
    fontSize: "1.4rem",
    marginBottom: 4,
  },
  templateCardName: {
    fontWeight: 700,
    fontSize: "0.8rem",
    color: "#1e293b",
    lineHeight: 1.3,
    marginBottom: 2,
  },
  templateCardDesc: {
    fontSize: "0.7rem",
    color: "#64748b",
    lineHeight: 1.3,
    marginBottom: 6,
  },
  templateToolBadge: {
    display: "inline-block",
    fontSize: "0.62rem",
    fontWeight: 700,
    backgroundColor: "#eff6ff",
    color: "#1f5eea",
    borderRadius: 4,
    padding: "1px 5px",
    marginRight: 3,
    marginBottom: 3,
  },
  toolBlocksGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 8,
    marginTop: 8,
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  toolBlockCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
  },
  analysisPanel: {
    marginTop: 16,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    backgroundColor: "#1f5eea",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    fontWeight: 800,
    fontSize: "1.1rem",
    flexShrink: 0,
  },
  analysisBullet: {
    fontSize: "0.78rem",
    color: "#374151",
    marginBottom: 3,
    paddingLeft: 12,
    position: "relative",
    "&::before": {
      content: '"•"',
      position: "absolute",
      left: 0,
    },
  },
  examplesPanel: {
    marginTop: 12,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#f8fafc",
  },
  exampleCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "10px 12px",
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  compareGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  metricLabel: {
    color: "#64748b",
    fontSize: "0.72rem",
    fontWeight: 800,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  metricValue: {
    color: "#111827",
    fontSize: "1.7rem",
    fontWeight: 800,
  },
  externalPanel: {
    backgroundColor: "#fff",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  panelTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4,
  },
  panelSubtitle: {
    fontSize: "0.82rem",
    color: "#6b7280",
    marginBottom: 16,
  },
  fieldStack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  promptEditor: {
    "& .MuiOutlinedInput-root": {
      alignItems: "flex-start",
      fontFamily: "monospace",
      fontSize: "0.88rem",
      lineHeight: 1.55,
    },
  },
  actionRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  versionList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 420,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  versionItem: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  activeVersionItem: {
    borderColor: "#1f5eea",
    backgroundColor: "#eff6ff",
  },
  versionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  versionTitle: {
    fontWeight: 700,
    color: "#111827",
  },
  versionMeta: {
    color: "#6b7280",
    fontSize: "0.75rem",
  },
  versionPreview: {
    color: "#4b5563",
    fontSize: "0.8rem",
    lineHeight: 1.4,
    marginBottom: 8,
    whiteSpace: "pre-wrap",
  },
  eventsPanel: {
    marginTop: 16,
  },
  chatMemoryGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 0.35fr)",
    gap: 16,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  chatMemoryFilters: {
    display: "grid",
    gridTemplateColumns: "minmax(180px, 1fr) repeat(3, minmax(130px, 0.35fr))",
    gap: 12,
    marginBottom: 12,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  chatMemoryRow: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  chatMemoryHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  chatMemoryPreview: {
    color: "#4b5563",
    fontSize: "0.82rem",
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  dangerPanel: {
    border: "1px solid #fecaca",
    backgroundColor: "#fff7f7",
  },
  dangerTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#b91c1c",
    fontWeight: 800,
    marginBottom: 8,
  },
  rawJsonBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#0f172a",
    color: "#e5e7eb",
    fontSize: "0.78rem",
    lineHeight: 1.5,
    maxHeight: 320,
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    ...theme.scrollbarStyles,
  },
  placeholderGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.45fr)",
    gap: 16,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  placeholderList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  placeholderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    border: "1px solid #eef2f7",
    borderRadius: 8,
    padding: "12px 14px",
    backgroundColor: "#fbfdff",
  },
  mutedPill: {
    borderRadius: 999,
    padding: "5px 9px",
    backgroundColor: "#eef2ff",
    color: "#3730a3",
    fontWeight: 800,
    fontSize: "0.68rem",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  eventItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #f0f0f0",
  },
  eventStatus: {
    borderRadius: 999,
    padding: "4px 8px",
    fontWeight: 700,
    fontSize: "0.68rem",
    textTransform: "uppercase",
  },
  inlineActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  statusSent: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusFailed: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  statusSkipped: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  statusPending: {
    backgroundColor: "#e0f2fe",
    color: "#075985",
  },
  internalSubNav: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 24px",
    backgroundColor: "#f5f5f5",
    borderBottom: "1px solid #e0e0e0",
    flexWrap: "wrap",
  },
  internalSubNavBtn: {
    border: "1px solid #e0e0e0",
    backgroundColor: "#fff",
    color: "#5f6b7a",
    borderRadius: 8,
    padding: "8px 16px",
    fontWeight: 700,
    fontSize: "0.875rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: "#1976d2",
      color: "#1976d2",
    },
  },
  internalSubNavBtnActive: {
    backgroundColor: "#1f5eea",
    borderColor: "#1f5eea",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#174fc7",
      color: "#fff",
    },
  },
  createSection: {
    padding: "24px",
  },
  createHeader: {
    marginBottom: 24,
  },
  createTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4,
  },
  createSubtitle: {
    fontSize: "0.875rem",
    color: "#6b7280",
  },
  createSectionLabel: {
    fontSize: "0.875rem",
    fontWeight: 700,
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 4,
  },
  createSectionDesc: {
    fontSize: "0.82rem",
    color: "#6b7280",
    marginBottom: 16,
  },
  internalTemplateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 12,
    marginBottom: 24,
  },
  internalTemplateCard: {
    border: "2px solid #e5e7eb",
    borderRadius: 10,
    padding: "16px",
    backgroundColor: "#fff",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    "&:hover": {
      borderColor: "#1976d2",
      boxShadow: "0 4px 12px rgba(25,118,210,0.12)",
    },
  },
  internalTemplateCardActive: {
    borderColor: "#1f5eea",
    backgroundColor: "#eff6ff",
    boxShadow: "0 4px 12px rgba(31,94,234,0.15)",
  },
  internalTemplateCardTitle: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#111827",
  },
  internalTemplateCardNiche: {
    fontSize: "0.72rem",
    color: "#9ca3af",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  internalTemplateCardDesc: {
    fontSize: "0.8rem",
    color: "#4b5563",
    marginTop: 4,
    lineHeight: 1.4,
  },
  internalTemplateCardBlank: {
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    backgroundColor: "#f9fafb",
    "&:hover": {
      borderColor: "#374151",
      backgroundColor: "#f3f4f6",
    },
  },
  createCTARow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  galleryHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  galleryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 12,
    maxHeight: "60vh",
    overflowY: "auto",
    paddingRight: 4,
    ...{
      "&::-webkit-scrollbar": { width: 6 },
      "&::-webkit-scrollbar-thumb": { borderRadius: 3, backgroundColor: "#ccc" },
    },
  },
  galleryCard: {
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    padding: "14px 16px",
    backgroundColor: "#fff",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    position: "relative",
    "&:hover": {
      borderColor: "#1976d2",
      boxShadow: "0 4px 14px rgba(25,118,210,0.12)",
      transform: "translateY(-1px)",
    },
  },
  galleryCardActive: {
    borderColor: "#1f5eea",
    backgroundColor: "#eff6ff",
  },
  galleryCardNiche: {
    fontSize: "0.65rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "#9ca3af",
    marginBottom: 2,
  },
  galleryCardName: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#111827",
  },
  galleryCardDesc: {
    fontSize: "0.78rem",
    color: "#6b7280",
    lineHeight: 1.4,
    marginTop: 2,
  },
  galleryBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    fontSize: "0.6rem",
    backgroundColor: "#dcfce7",
    color: "#166534",
    borderRadius: 4,
    padding: "2px 6px",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  agentCard: {
    display: "flex",
    alignItems: "flex-start",
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    border: "1px solid #f0f0f0",
    transition: "all 0.2s ease",
    gap: 12,
    "&:hover": {
      boxShadow: "0 3px 12px rgba(0,0,0,0.1)",
    },
  },
  agentCardIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    "& svg": {
      fontSize: 24,
      color: "#1f5eea",
    },
  },
  agentCardBody: {
    flex: 1,
    minWidth: 0,
  },
  agentCardRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 2,
  },
  agentCardName: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#111827",
  },
  agentCardDesc: {
    fontSize: "0.8rem",
    color: "#6b7280",
    marginBottom: 6,
    lineHeight: 1.4,
  },
  agentCardMeta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: "0.75rem",
    color: "#9ca3af",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  agentCardActions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  automationBtn: {
    borderRadius: 8,
    padding: "4px 10px",
    fontSize: "0.78rem",
    fontWeight: 700,
    border: "1px solid #e0e0e0",
    backgroundColor: "#fff",
    color: "#526173",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
    transition: "all 0.15s",
    "&:hover": {
      borderColor: "#1f5eea",
      color: "#1f5eea",
    },
  },
  myAgentsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    gap: 12,
    flexWrap: "wrap",
  },
  memorySection: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  memorySearchBar: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  memoryCard: {
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  memoryCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memoryChip: {
    fontSize: "0.7rem",
    height: 20,
    borderRadius: 4,
  },
  memoryContent: {
    fontSize: "0.875rem",
    color: "#333",
    lineHeight: 1.5,
  },
  memoryMeta: {
    fontSize: "0.75rem",
    color: "#999",
  },
  memoryStateBox: {
    backgroundColor: "#f0f7ff",
    border: "1px solid #bbdefb",
    borderRadius: 8,
    padding: "12px 16px",
  },
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_PROMPTS") {
    const prompts = action.payload;
    const newPrompts = [];

    prompts.forEach((prompt) => {
      const promptIndex = state.findIndex((p) => p.id === prompt.id);
      if (promptIndex !== -1) {
        state[promptIndex] = prompt;
      } else {
        newPrompts.push(prompt);
      }
    });

    return [...state, ...newPrompts];
  }

  if (action.type === "UPDATE_PROMPTS") {
    const prompt = action.payload;
    const promptIndex = state.findIndex((p) => p.id === prompt.id);

    if (promptIndex !== -1) {
      state[promptIndex] = prompt;
      return [...state];
    } else {
      return [prompt, ...state];
    }
  }

  if (action.type === "DELETE_PROMPT") {
    const promptId = action.payload;
    const promptIndex = state.findIndex((p) => p.id === promptId);
    if (promptIndex !== -1) {
      state.splice(promptIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const DEFAULT_BUSINESS_HOURS = {
  timezone: "America/Sao_Paulo",
  days: {
    monday:    { enabled: true,  start: "08:00", end: "18:00" },
    tuesday:   { enabled: true,  start: "08:00", end: "18:00" },
    wednesday: { enabled: true,  start: "08:00", end: "18:00" },
    thursday:  { enabled: true,  start: "08:00", end: "18:00" },
    friday:    { enabled: true,  start: "08:00", end: "18:00" },
    saturday:  { enabled: false, start: "",      end: ""      },
    sunday:    { enabled: false, start: "",      end: ""      },
  },
  outOfHoursMessage: "No momento estamos fora do horário de atendimento. Nosso expediente é de segunda a sexta, das 08h às 18h. Assim que retornarmos, seguimos com seu atendimento.",
  inHoursMessage: "",
  lunchBreak: { enabled: false, start: "12:00", end: "14:00" },
  slotDurationMinutes: 60,
  minAdvanceHours: 0,
  futureDaysLimit: 7,
};

const DAYS_CONFIG = [
  { key: "monday",    label: "SEG" },
  { key: "tuesday",   label: "TER" },
  { key: "wednesday", label: "QUA" },
  { key: "thursday",  label: "QUI" },
  { key: "friday",    label: "SEX" },
  { key: "saturday",  label: "SÁB" },
  { key: "sunday",    label: "DOM" },
];

const Prompts = () => {
  const classes = useStyles();

  const [activeAgentTab, setActiveAgentTab] = useState("external");
  const [externalSection, setExternalSection] = useState("dashboard");
  const [prompts, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalSaving, setExternalSaving] = useState(false);
  const [externalConfig, setExternalConfig] = useState(null);
  const [externalPrompt, setExternalPrompt] = useState("");
  const [externalChangeNote, setExternalChangeNote] = useState("");
  const [externalVersions, setExternalVersions] = useState([]);
  const [externalEvents, setExternalEvents] = useState([]);
  const [aiAppointments, setAiAppointments] = useState([]);
  const [aiReminders, setAiReminders] = useState([]);
  const [aiFollowUps, setAiFollowUps] = useState([]);
  const [followUpConfig, setFollowUpConfig] = useState(null);
  const [followUpConfigLoading, setFollowUpConfigLoading] = useState(false);
  const [followUpConfigSaving, setFollowUpConfigSaving] = useState(false);
  const [followUpProcessResult, setFollowUpProcessResult] = useState(null);
  const [followUpProcessing, setFollowUpProcessing] = useState(false);
  const [followUpLogs, setFollowUpLogs] = useState([]);
  const [followUpLogsLoading, setFollowUpLogsLoading] = useState(false);
  const [followUpRetrying, setFollowUpRetrying] = useState(null);
  const [whatsappOptions, setWhatsappOptions] = useState([]);
  const [aiWebhooks, setAiWebhooks] = useState([]);
  const [webhookForm, setWebhookForm] = useState({ name: "", url: "", eventType: "" });
  const [editingWebhookId, setEditingWebhookId] = useState(null);
  const [chatMemoryLoading, setChatMemoryLoading] = useState(false);
  const [chatMemories, setChatMemories] = useState([]);
  const [chatMemoryTotal, setChatMemoryTotal] = useState(0);
  const [chatMemoryPage, setChatMemoryPage] = useState(1);
  const [chatMemoryFilters, setChatMemoryFilters] = useState({
    search: "",
    range: "recent",
    leadId: "",
    sessionId: "",
  });
  const [chatMemoryDetail, setChatMemoryDetail] = useState(null);
  const [chatMemoryDeleteTarget, setChatMemoryDeleteTarget] = useState(null);
  const [chatMemoryDangerOpen, setChatMemoryDangerOpen] = useState(false);
  const [chatMemoryDangerText, setChatMemoryDangerText] = useState("");
  const [ragDocuments, setRagDocuments] = useState([]);
  const [ragBase, setRagBase] = useState("empresa");
  const [ragContent, setRagContent] = useState("");
  const [ragFile, setRagFile] = useState(null);
  const [ragQuery, setRagQuery] = useState("");
  const [aiActionsLoading, setAiActionsLoading] = useState(false);
  const [aiActionsStatus, setAiActionsStatus] = useState(null);
  const [aiBlockedContacts, setAiBlockedContacts] = useState([]);
  const [aiActionsFilter, setAiActionsFilter] = useState({ search: "", blockMode: "" });
  const [pauseUntilDialog, setPauseUntilDialog] = useState({ open: false, contactId: null, contactName: "" });
  const [pauseUntilDate, setPauseUntilDate] = useState("");
  const [aiSettings, setAiSettings] = useState(null);
  const [aiSettingsLoading, setAiSettingsLoading] = useState(false);
  const [aiSettingsTokenVisible, setAiSettingsTokenVisible] = useState(false);
  // Etapas personalizadas (custom_stages) para IA externa
  const [aiCustomStagesDraft, setAiCustomStagesDraft] = useState(["", "", "", "", ""]);
  const [aiPipelineStageOptions, setAiPipelineStageOptions] = useState([]);
  const [aiPipelineStageOptionsLoaded, setAiPipelineStageOptionsLoaded] = useState(false);
  const [aiCustomStagesSaving, setAiCustomStagesSaving] = useState(false);
  const [ragResults, setRagResults] = useState([]);
  const [businessHoursForm, setBusinessHoursForm] = useState(DEFAULT_BUSINESS_HOURS);
  const [businessHoursSaving, setBusinessHoursSaving] = useState(false);
  const [calendarApiTestLoading, setCalendarApiTestLoading] = useState(false);
  const [calendarApiTestResult, setCalendarApiTestResult] = useState(null);
  // System Prompt AI Tools
  const [promptGallery, setPromptGallery] = useState([]);
  const [promptGalleryLoaded, setPromptGalleryLoaded] = useState(false);
  const [promptGalleryModalOpen, setPromptGalleryModalOpen] = useState(false);
  const [promptTemplatePreview, setPromptTemplatePreview] = useState(null);
  const [promptApplyDialog, setPromptApplyDialog] = useState(false);
  const [promptToolBlocksOpen, setPromptToolBlocksOpen] = useState(false);
  const [promptAnalysis, setPromptAnalysis] = useState(null);
  const [promptAnalysisLoading, setPromptAnalysisLoading] = useState(false);
  const [promptImprovedVersion, setPromptImprovedVersion] = useState(null);
  const [promptImproveLoading, setPromptImproveLoading] = useState(false);
  const [promptImproveDialog, setPromptImproveDialog] = useState(false);
  const [promptExamples, setPromptExamples] = useState([]);
  const [promptExamplesLoading, setPromptExamplesLoading] = useState(false);
  const [promptExamplesOpen, setPromptExamplesOpen] = useState(false);
  const [companyAiStatus, setCompanyAiStatus] = useState(null);
  const [companyAiLoading, setCompanyAiLoading] = useState(false);
  const [companyAiSaving, setCompanyAiSaving] = useState(false);
  const [companyPauseDialog, setCompanyPauseDialog] = useState(false);
  const [companyPauseMinutes, setCompanyPauseMinutes] = useState(30);
  const [companyPauseReason, setCompanyPauseReason] = useState("");
  const [companyDisableDialog, setCompanyDisableDialog] = useState(false);
  const [companyDisableReason, setCompanyDisableReason] = useState("");
  const [appointmentForm, setAppointmentForm] = useState({
    title: "",
    leadName: "",
    leadPhone: "",
    leadEmail: "",
    scheduleId: "",
    startDatetime: "",
    durationMinutes: 60,
    reminderEnabled: true,
  });
  const [reminderForm, setReminderForm] = useState({
    leadName: "",
    leadPhone: "",
    scheduledAt: "",
    message: "",
  });

  const defaultReminderSettings = {
    enabled: true,
    whatsappId: "",
    hoursBefore: 4,
    text: "CONFIRMACAO DE CONSULTA\n\nOla, *{{leadName}}*! Tudo bem?\n\nEstamos passando para confirmar seu compromisso conosco:\n\nData: {{appointmentDate}}\n\nVoce podera comparecer neste horario?\n\nResponda com uma das opcoes:",
    footer: "",
    buttons: [
      { buttonId: "1", buttonText: { displayText: "Confirmar" } },
      { buttonId: "2", buttonText: { displayText: "Remarcar" } },
      { buttonId: "3", buttonText: { displayText: "Cancelar" } },
    ],
  };

  const defaultGroupNotifications = {
    appointmentCreated: {
      enabled: false,
      name: "Agendamento criado",
      whatsappId: "",
      groupNumber: "",
      message: "Novo agendamento criado.\n\nLead: {{leadName}}\nTelefone: {{leadPhone}}\nData: {{appointmentDate}}\nHorario: {{appointmentTime}}\nEmpresa: {{companyName}}",
    },
    reminderSent: {
      enabled: false,
      name: "Lembrete enviado",
      whatsappId: "",
      groupNumber: "",
      message: "Lembrete enviado ao cliente.\n\nLead: {{leadName}}\nTelefone: {{leadPhone}}\nCompromisso: {{appointmentDate}} as {{appointmentTime}}\nEmpresa: {{companyName}}",
    },
    appointmentCancelled: {
      enabled: false,
      name: "Agendamento cancelado",
      whatsappId: "",
      groupNumber: "",
      message: "Agendamento cancelado.\n\nLead: {{leadName}}\nTelefone: {{leadPhone}}\nData: {{appointmentDate}}\nHorario: {{appointmentTime}}\nMotivo: {{cancellationReason}}\nEmpresa: {{companyName}}",
    },
  };

  const dynamicVariables = [
    { token: "{{leadName}}", label: "Nome do lead" },
    { token: "{{leadPhone}}", label: "Telefone" },
    { token: "{{appointmentDate}}", label: "Data" },
    { token: "{{appointmentTime}}", label: "Hora" },
    { token: "{{appointmentDateTime}}", label: "Data e hora" },
    { token: "{{companyName}}", label: "Empresa" },
  ];

  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [internalSection, setInternalSection] = useState("criar");
  const [internalTemplates, setInternalTemplates] = useState([]);
  const [internalTemplatesLoading, setInternalTemplatesLoading] = useState(false);
  const [selectedInitialTemplate, setSelectedInitialTemplate] = useState(null);
  const [memoryContactId, setMemoryContactId] = useState("");
  const [memoryData, setMemoryData] = useState(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [automationMenuAnchor, setAutomationMenuAnchor] = useState(null);
  const [automationMenuPromptId, setAutomationMenuPromptId] = useState(null);
  const [deletingAiAppointment, setDeletingAiAppointment] = useState(null);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [deletingReminder, setDeletingReminder] = useState(null);
  const { user } = useContext(AuthContext);
  const { isConnected, on } = useSocket();

  const { getPlanCompany } = usePlans();
  const history = useHistory();
  const companyId = user.companyId;
  const toolMap = useMemo(() => {
    const map = {};
    TOOL_CATALOG.forEach(tool => {
      map[tool.value] = tool;
    });
    return map;
  }, []);

  const loadExternalAgent = async () => {
    setExternalLoading(true);
    try {
      const [
        configResponse,
        versionsResponse,
        eventsResponse,
        appointmentsResponse,
        remindersResponse,
        followUpsResponse,
        ragResponse,
        whatsappsResponse,
        webhooksResponse,
      ] = await Promise.all([
        api.get("/ai-agents/external/config"),
        api.get("/ai-agents/external/prompt/versions"),
        api.get("/ai-agents/external/events", { params: { pageNumber: 1 } }),
        api.get("/ai-agents/external/appointments", { params: { pageNumber: 1 } }),
        api.get("/ai-agents/external/reminders", { params: { pageNumber: 1 } }),
        api.get("/ai-agents/external/follow-ups", { params: { pageNumber: 1 } }),
        api.get(`/ai-agents/external/rag/${ragBase}`, { params: { pageNumber: 1 } }),
        api.get("/whatsapp/filter", { params: { session: 0, channel: "whatsapp" } }),
        api.get("/ai-agents/external/webhooks"),
      ]);

      setExternalConfig(configResponse.data);
      setExternalPrompt(configResponse.data?.systemPrompt || "");
      setExternalVersions(versionsResponse.data?.versions || []);
      setExternalEvents(eventsResponse.data?.events || []);
      setAiAppointments(appointmentsResponse.data?.appointments || []);
      setAiReminders(remindersResponse.data?.reminders || []);
      setAiFollowUps(followUpsResponse.data?.leads || []);
      setRagDocuments(ragResponse.data?.documents || []);
      setWhatsappOptions(whatsappsResponse.data || []);
      setAiWebhooks(webhooksResponse.data?.webhooks || []);
    } catch (err) {
      toastError(err);
    } finally {
      setExternalLoading(false);
    }
  };

  const loadRagDocuments = async (base = ragBase) => {
    try {
      const { data } = await api.get(`/ai-agents/external/rag/${base}`, {
        params: { pageNumber: 1 },
      });
      setRagDocuments(data?.documents || []);
    } catch (err) {
      toastError(err);
    }
  };

  const loadChatMemory = async (page = chatMemoryPage, filters = chatMemoryFilters) => {
    setChatMemoryLoading(true);
    try {
      const { data } = await api.get("/ai-agents/external/chat-memory", {
        params: {
          ...filters,
          page,
          limit: 25,
        },
      });
      setChatMemories(data?.memories || []);
      setChatMemoryTotal(data?.count || 0);
      setChatMemoryPage(data?.page || page);
    } catch (err) {
      toastError(err);
    } finally {
      setChatMemoryLoading(false);
    }
  };

  const handleChatMemoryFilterChange = (field, value) => {
    setChatMemoryFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearchChatMemory = () => {
    setChatMemoryPage(1);
    loadChatMemory(1);
  };

  const handleClearChatMemoryFilters = () => {
    const nextFilters = { search: "", range: "recent", leadId: "", sessionId: "" };
    setChatMemoryFilters(nextFilters);
    setChatMemoryPage(1);
    loadChatMemory(1, nextFilters);
  };

  const loadAiSettings = async (forceRefresh = false) => {
    setAiSettingsLoading(true);
    try {
      const { data } = await api.get(`/ai-external/settings${forceRefresh ? "?refresh=1" : ""}`);
      setAiSettings(data);
    } catch (err) {
      toastError(err);
    } finally {
      setAiSettingsLoading(false);
    }
  };

  // Carrega as etapas reais da empresa para o select de etapas personalizadas.
  // Reutiliza o endpoint existente GET /pipelines (já filtrado por companyId).
  const loadAiPipelineStageOptions = async () => {
    try {
      const { data } = await api.get("/pipelines");
      const opts = [];
      (data || []).forEach((p) => {
        (p.stages || []).forEach((st) => {
          opts.push({
            stageId: st.id,
            stageName: st.name,
            pipelineName: p.name,
            label: `${p.name} — ${st.name} — ID ${st.id}`,
          });
        });
      });
      setAiPipelineStageOptions(opts);
      setAiPipelineStageOptionsLoaded(true);
    } catch (err) {
      // Não quebra a aba — apenas deixa o select sem opções.
    }
  };

  const handleSaveCustomStages = async () => {
    setAiCustomStagesSaving(true);
    try {
      const custom_stages = [0, 1, 2, 3, 4].map((i) => {
        const stageId = Number(aiCustomStagesDraft[i]) || null;
        const opt = aiPipelineStageOptions.find((o) => o.stageId === stageId);
        return {
          key: `stage_${i + 1}`,
          label: `Etapa ${i + 1}`,
          name: opt ? opt.stageName : null,
          stage_id: opt ? opt.stageId : null,
        };
      });
      const { data } = await api.put("/ai-external/settings/custom-stages", { custom_stages });
      setAiSettings(data);
      toast.success("Etapas personalizadas salvas!");
    } catch (err) {
      toastError(err);
    } finally {
      setAiCustomStagesSaving(false);
    }
  };

  const handleClearCustomStages = () => setAiCustomStagesDraft(["", "", "", "", ""]);

  const handleCopyAiSetting = async (value) => {
    try {
      await navigator.clipboard.writeText(String(value));
      toast.success("Copiado!");
    } catch (_) {
      toast.error("Erro ao copiar");
    }
  };

  const loadAiActions = async () => {
    setAiActionsLoading(true);
    try {
      const [statusRes, contactsRes] = await Promise.all([
        api.get("/ai-actions/status"),
        api.get("/ai-actions/blocked-contacts"),
      ]);
      setAiActionsStatus(statusRes.data);
      setAiBlockedContacts(contactsRes.data || []);
    } catch (err) {
      toastError(err);
    } finally {
      setAiActionsLoading(false);
    }
  };

  const handleAiPauseContact = async (contactId) => {
    try {
      await api.post(`/ai-actions/contacts/${contactId}/pause`);
      toast.success("IA pausada manualmente.");
      loadAiActions();
    } catch (err) {
      toastError(err);
    }
  };

  const handleAiResumeContact = async (contactId) => {
    try {
      await api.post(`/ai-actions/contacts/${contactId}/resume`);
      toast.success("IA reativada.");
      loadAiActions();
    } catch (err) {
      toastError(err);
    }
  };

  const handleAiPauseUntilConfirm = async () => {
    if (!pauseUntilDate) {
      toast.error("Informe a data/hora de reativação.");
      return;
    }
    try {
      await api.post(`/ai-actions/contacts/${pauseUntilDialog.contactId}/pause-until`, {
        pauseUntil: new Date(pauseUntilDate).toISOString(),
      });
      toast.success("IA pausada até " + new Date(pauseUntilDate).toLocaleString("pt-BR"));
      setPauseUntilDialog({ open: false, contactId: null, contactName: "" });
      setPauseUntilDate("");
      loadAiActions();
    } catch (err) {
      toastError(err);
    }
  };

  const handleShowChatMemory = async (memoryId) => {
    setExternalSaving(true);
    try {
      const { data } = await api.get(`/ai-agents/external/chat-memory/${memoryId}`);
      setChatMemoryDetail(data);
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const copyToClipboard = async (value, label = "Conteudo") => {
    try {
      await navigator.clipboard.writeText(String(value || ""));
      toast.success(`${label} copiado.`);
    } catch {
      toast.error("Nao foi possivel copiar para a area de transferencia.");
    }
  };

  const requestDeleteChatMemory = (type, payload) => {
    setChatMemoryDeleteTarget({ type, ...payload });
  };

  const handleDeleteChatMemory = async () => {
    if (!chatMemoryDeleteTarget) return;

    setExternalSaving(true);
    try {
      if (chatMemoryDeleteTarget.type === "record") {
        await api.delete(`/ai-agents/external/chat-memory/${chatMemoryDeleteTarget.id}`);
      }
      if (chatMemoryDeleteTarget.type === "lead") {
        await api.delete(`/ai-agents/external/chat-memory/lead/${chatMemoryDeleteTarget.leadId}`);
      }
      if (chatMemoryDeleteTarget.type === "session") {
        await api.delete(`/ai-agents/external/chat-memory/session/${encodeURIComponent(chatMemoryDeleteTarget.sessionId)}`);
      }
      setChatMemoryDeleteTarget(null);
      await loadChatMemory();
      toast.success("Chat Memory excluido.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleDeleteCompanyChatMemory = async () => {
    if (chatMemoryDangerText !== "EXCLUIR MEMORIA") return;

    setExternalSaving(true);
    try {
      const { data } = await api.delete("/ai-agents/external/chat-memory/company", {
        data: { confirmation: chatMemoryDangerText },
      });
      setChatMemoryDangerOpen(false);
      setChatMemoryDangerText("");
      await loadChatMemory(1);
      toast.success(`${data?.deleted || 0} registro(s) de Chat Memory excluido(s).`);
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleExternalConfigChange = (field, value) => {
    setExternalConfig(prev => ({
      ...(prev || {}),
      [field]: value,
    }));
  };

  const getExternalReminderSettings = () => ({
    ...defaultReminderSettings,
    ...(externalConfig?.metadata?.autoReminder || {}),
    buttons: externalConfig?.metadata?.autoReminder?.buttons || defaultReminderSettings.buttons,
  });

  const getExternalGroupNotifications = () => {
    const saved = externalConfig?.metadata?.groupNotifications || {};
    return Object.keys(defaultGroupNotifications).reduce((acc, key) => {
      acc[key] = {
        ...defaultGroupNotifications[key],
        ...(saved[key] || {}),
      };
      return acc;
    }, {});
  };

  const handleReminderSettingChange = (field, value) => {
    setExternalConfig(prev => {
      const current = prev || {};
      const previousSettings = current.metadata?.autoReminder || {};
      return {
        ...current,
        metadata: {
          ...(current.metadata || {}),
          autoReminder: {
            ...defaultReminderSettings,
            ...previousSettings,
            buttons: previousSettings.buttons || defaultReminderSettings.buttons,
            [field]: value,
          },
        },
      };
    });
  };

  const handleReminderButtonChange = (index, value) => {
    const settings = getExternalReminderSettings();
    const buttons = settings.buttons.map((button, buttonIndex) => (
      buttonIndex === index
        ? { ...button, buttonText: { displayText: value }, buttonId: String(index + 1) }
        : button
    ));
    handleReminderSettingChange("buttons", buttons);
  };

  const handleGroupNotificationChange = (key, field, value) => {
    setExternalConfig(prev => {
      const current = prev || {};
      const previousGroups = current.metadata?.groupNotifications || {};
      return {
        ...current,
        metadata: {
          ...(current.metadata || {}),
          groupNotifications: {
            ...previousGroups,
            [key]: {
              ...defaultGroupNotifications[key],
              ...(previousGroups[key] || {}),
              [field]: value,
            },
          },
        },
      };
    });
  };

  const insertReminderVariable = (token) => {
    const currentText = getExternalReminderSettings().text || "";
    handleReminderSettingChange("text", `${currentText}${currentText ? " " : ""}${token}`);
  };

  const insertGroupVariable = (key, token) => {
    const settings = getExternalGroupNotifications()[key];
    const currentText = settings.message || "";
    handleGroupNotificationChange(key, "message", `${currentText}${currentText ? " " : ""}${token}`);
  };

  useEffect(() => {
    if (externalConfig) {
      setBusinessHoursForm(
        externalConfig?.metadata?.businessHours
          ? {
              ...DEFAULT_BUSINESS_HOURS,
              ...externalConfig.metadata.businessHours,
              days: { ...DEFAULT_BUSINESS_HOURS.days, ...externalConfig.metadata.businessHours.days },
              lunchBreak: externalConfig.metadata.businessHours.lunchBreak || DEFAULT_BUSINESS_HOURS.lunchBreak,
              slotDurationMinutes: externalConfig.metadata.businessHours.slotDurationMinutes ?? DEFAULT_BUSINESS_HOURS.slotDurationMinutes,
              minAdvanceHours: externalConfig.metadata.businessHours.minAdvanceHours ?? DEFAULT_BUSINESS_HOURS.minAdvanceHours,
              futureDaysLimit: externalConfig.metadata.businessHours.futureDaysLimit ?? DEFAULT_BUSINESS_HOURS.futureDaysLimit,
            }
          : DEFAULT_BUSINESS_HOURS
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalConfig?.id]);

  const handleBusinessHoursDayChange = (day, field, value) => {
    setBusinessHoursForm(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: { ...prev.days[day], [field]: value },
      },
    }));
  };

  const loadCompanyAiStatus = async () => {
    setCompanyAiLoading(true);
    try {
      const { data } = await api.get("/ai-actions/company-status");
      setCompanyAiStatus(data);
    } catch (err) {
      toastError(err);
    } finally {
      setCompanyAiLoading(false);
    }
  };

  const handleCompanyPause = async () => {
    setCompanyAiSaving(true);
    try {
      await api.post("/ai-actions/company/pause", { minutes: companyPauseMinutes, reason: companyPauseReason || null });
      toast.success("IA Geral pausada com sucesso.");
      setCompanyPauseDialog(false);
      setCompanyPauseReason("");
      await loadCompanyAiStatus();
    } catch (err) {
      toastError(err);
    } finally {
      setCompanyAiSaving(false);
    }
  };

  const handleCompanyDisable = async () => {
    setCompanyAiSaving(true);
    try {
      await api.post("/ai-actions/company/disable", { reason: companyDisableReason || null });
      toast.success("IA Geral desligada.");
      setCompanyDisableDialog(false);
      setCompanyDisableReason("");
      await loadCompanyAiStatus();
    } catch (err) {
      toastError(err);
    } finally {
      setCompanyAiSaving(false);
    }
  };

  const handleCompanyResume = async () => {
    setCompanyAiSaving(true);
    try {
      await api.post("/ai-actions/company/resume");
      toast.success("IA Geral reativada.");
      await loadCompanyAiStatus();
    } catch (err) {
      toastError(err);
    } finally {
      setCompanyAiSaving(false);
    }
  };

  const handleSaveBusinessHours = async () => {
    setBusinessHoursSaving(true);
    try {
      const { data } = await api.put("/ai-agents/external/config", {
        name: externalConfig?.name || "Agente Externo N8N",
        metadata: {
          ...(externalConfig?.metadata || {}),
          businessHours: businessHoursForm,
        },
      });
      setExternalConfig(data);
      toast.success("Horário de funcionamento salvo com sucesso.");
    } catch (err) {
      toastError(err);
    } finally {
      setBusinessHoursSaving(false);
    }
  };

  const handleSaveExternalConfig = async () => {
    setExternalSaving(true);
    try {
      const { data } = await api.put("/ai-agents/external/config", {
        name: externalConfig?.name || "Agente Externo N8N",
        metadata: externalConfig?.metadata || {},
      });
      setExternalConfig(data);
      toast.success("Configuracao do agente externo salva.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleSaveExternalPrompt = async () => {
    setExternalSaving(true);
    try {
      await api.post("/ai-agents/external/prompt/versions", {
        content: externalPrompt,
        changeNote: externalChangeNote || null,
      });
      setExternalChangeNote("");
      await loadExternalAgent();
      toast.success("System Prompt salvo e evento enviado para o N8N.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const loadPromptGallery = async () => {
    if (promptGalleryLoaded) return;
    try {
      const { data } = await api.get("/ai-agents/external/system-prompt/templates");
      if (data?.templates) {
        setPromptGallery(data.templates);
        setPromptGalleryLoaded(true);
      }
    } catch { /* fail silently — gallery is non-critical */ }
  };

  const handleAnalyzePrompt = async () => {
    if (!externalPrompt.trim()) return;
    setPromptAnalysisLoading(true);
    setPromptAnalysis(null);
    try {
      const { data } = await api.post("/ai-agents/external/system-prompt/analyze", {
        prompt: externalPrompt,
      });
      if (data?.ok) setPromptAnalysis(data);
    } catch (err) {
      const msg = err?.response?.data?.error;
      if (msg === "global_ai_provider_not_configured") {
        toast.error("IA global não configurada. Configure no painel do Superadmin.");
      } else {
        toastError(err);
      }
    } finally {
      setPromptAnalysisLoading(false);
    }
  };

  const handleImprovePrompt = async () => {
    if (!externalPrompt.trim()) return;
    setPromptImproveLoading(true);
    setPromptImprovedVersion(null);
    try {
      const { data } = await api.post("/ai-agents/external/system-prompt/improve", {
        prompt: externalPrompt,
        mode: "general",
      });
      if (data?.ok && data.improvedPrompt) {
        setPromptImprovedVersion(data);
        setPromptImproveDialog(true);
      }
    } catch (err) {
      const msg = err?.response?.data?.error;
      if (msg === "global_ai_provider_not_configured") {
        toast.error("IA global não configurada. Configure no painel do Superadmin.");
      } else {
        toastError(err);
      }
    } finally {
      setPromptImproveLoading(false);
    }
  };

  const handleApplyImprovedPrompt = () => {
    try {
      const improved = promptImprovedVersion?.improvedPrompt;
      if (typeof improved !== "string" || !improved.trim()) {
        toast.error("Não foi possível aplicar a sugestão da IA. Formato inválido.");
        return;
      }
      // Close dialog and clear state BEFORE setting prompt — avoids intermediate renders with partial state
      setPromptImproveDialog(false);
      setPromptImprovedVersion(null);
      setExternalPrompt(improved);
      toast.success("Prompt melhorado aplicado. Salve para criar nova versão.");
    } catch {
      toast.error("Erro ao aplicar sugestão. Tente novamente.");
    }
  };

  const handleFetchExamples = async () => {
    setPromptExamplesLoading(true);
    setPromptExamples([]);
    try {
      const { data } = await api.post("/ai-agents/external/system-prompt/examples-from-memory", {
        limit: 20,
        focus: "general",
      });
      if (data?.ok) {
        setPromptExamples(data.examples || []);
        setPromptExamplesOpen(true);
        if (!data.examples?.length) {
          toast.info("Não há Chat Memory suficiente para gerar exemplos ainda.");
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.error;
      if (msg === "global_ai_provider_not_configured") {
        toast.error("IA global não configurada. Configure no painel do Superadmin.");
      } else {
        toastError(err);
      }
    } finally {
      setPromptExamplesLoading(false);
    }
  };

  const handleAddExamplesToPrompt = () => {
    if (!promptExamples.length) return;
    const block = promptExamples.map(ex =>
      `Exemplo — ${ex.title}\nCliente: "${ex.clientExample}"\nAgente: "${ex.suggestedAnswer}"`
    ).join("\n\n");
    setExternalPrompt(prev => prev + "\n\n# EXEMPLOS DE CONVERSA\n" + block);
    toast.success("Exemplos adicionados ao prompt. Salve para criar nova versão.");
    setPromptExamplesOpen(false);
  };

  const TOOL_BLOCKS = [
    { id: "rag", label: "RAG / Base de Conhecimento", text: "\n\n# RAG / BASE DE CONHECIMENTO\nSEMPRE consulte a base de conhecimento (RAG) antes de responder sobre produtos, serviços, preços ou políticas.\nVariável disponível: {{ragContext}}\nSe a informação não estiver na base: \"Vou verificar e retorno em breve.\"" },
    { id: "agenda", label: "Agenda / Horários Disponíveis", text: "\n\n# AGENDA\nNUNCA ofereça horário sem consultar a ferramenta de agenda.\nNUNCA confirme agendamento sem executar criar_compromisso.\nVariável de contexto de calendário: {{calendarContextUrl}}" },
    { id: "horario", label: "Horário de Funcionamento", text: "\n\n# HORÁRIO DE FUNCIONAMENTO\nInforme o horário de funcionamento apenas com base na variável {{businessHours}}.\nNão invente horários. Se estiver fechado: \"No momento estamos fora do horário de atendimento. Posso agendar um retorno?\"" },
    { id: "memory", label: "Chat Memory / Contexto", text: "\n\n# CHAT MEMORY\nConsulte o histórico da conversa para personalizar o atendimento.\nVariável: {{chatMemorySummary}}\nSe houver histórico anterior, faça referência de forma natural." },
    { id: "lead", label: "Movimentação de Lead", text: "\n\n# MOVIMENTAÇÃO DE LEAD\nMova o lead de etapa conforme o progresso:\n- Demonstrou interesse → \"Qualificado\"\n- Agendamento confirmado → \"Agendado\"\n- Proposta enviada → \"Proposta\"\n- Fechou → \"Convertido\"\n- Desistiu → \"Perdido\"\nUse a ferramenta mover_lead somente quando o critério for atingido." },
    { id: "antialucin", label: "Anti-alucinação", text: "\n\n# REGRAS ANTI-ALUCINAÇÃO\n- NUNCA invente preços, horários, nomes ou informações não confirmadas.\n- NUNCA diga que agendou sem ter executado criar_compromisso.\n- NUNCA diga que consultou RAG sem ter chamado a ferramenta.\n- Se não souber: \"Vou verificar e retorno em breve.\"" },
    { id: "humano", label: "Atendimento Humano", text: "\n\n# TRANSFERÊNCIA PARA HUMANO\nAcione atendimento humano (pausar_ia) quando:\n- Cliente pedir explicitamente por humano.\n- Situação de emergência ou urgência.\n- Reclamação grave.\n- Negociação fora do padrão.\n- Dúvida que o agente não consegue resolver após 2 tentativas." },
    { id: "qualif", label: "Qualificação Comercial", text: "\n\n# QUALIFICAÇÃO COMERCIAL\nColete SEMPRE:\n1. Nome completo\n2. Necessidade principal\n3. Urgência (quando precisa resolver)\n4. Orçamento disponível (se aplicável)\n5. Quem decide (o próprio ou outro)\nSomente mova para \"Qualificado\" com todos os dados coletados." },
    { id: "followup", label: "Follow-up", text: "\n\n# FOLLOW-UP\nSe o cliente não responder em 24h, o sistema enviará follow-up automático.\nNÃO prometa retorno manual. O agente de follow-up cuidará disso automaticamente." },
    { id: "lgpd", label: "LGPD / Dados Sensíveis", text: "\n\n# LGPD E DADOS SENSÍVEIS\nNÃO solicite CPF, RG, dados bancários ou documentos pessoais via WhatsApp.\nNão armazene dados sensíveis na conversa.\nSe necessário: \"Para sua segurança, esses dados serão coletados de forma segura pelo nosso sistema.\"" },
  ];

  const handleRestoreExternalVersion = async (versionId) => {
    setExternalSaving(true);
    try {
      await api.post(`/ai-agents/external/prompt/versions/${versionId}/restore`);
      await loadExternalAgent();
      toast.success("Versao restaurada e enviada para o N8N.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleDeleteExternalVersion = async (versionId) => {
    setExternalSaving(true);
    try {
      await api.delete(`/ai-agents/external/prompt/versions/${versionId}`);
      await loadExternalAgent();
      toast.success("Versao do prompt excluida.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleCreateAiAppointment = async () => {
    setExternalSaving(true);
    try {
      await api.post("/ai-agents/external/appointments", {
        ...appointmentForm,
        scheduleId: Number(appointmentForm.scheduleId),
        durationMinutes: Number(appointmentForm.durationMinutes || 60),
      });
      setAppointmentForm({
        title: "",
        leadName: "",
        leadPhone: "",
        leadEmail: "",
        scheduleId: "",
        startDatetime: "",
        durationMinutes: 60,
        reminderEnabled: true,
      });
      await loadExternalAgent();
      toast.success("Agendamento IA criado e sincronizado com compromissos.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleDeleteAiAppointment = async () => {
    if (!deletingAiAppointment) return;

    setExternalSaving(true);
    try {
      await api.delete(`/ai-agents/external/appointments/${deletingAiAppointment.id}`);
      setDeletingAiAppointment(null);
      await loadExternalAgent();
      toast.success("Agendamento IA excluido.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleSendAppointmentGroup = async (appointmentId) => {
    setExternalSaving(true);
    try {
      await api.post(`/ai-agents/external/appointments/${appointmentId}/send-group`);
      toast.success("Notificacao enviada ao grupo.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleCreateReminder = async () => {
    setExternalSaving(true);
    try {
      const settings = getExternalReminderSettings();
      const payload = {
        ...reminderForm,
        metadata: {
          manual: !editingReminderId,
          editedFromPanel: Boolean(editingReminderId),
          interactivePayload: {
            number: reminderForm.leadPhone,
            text: reminderForm.message || settings.text,
            footer: settings.footer,
            buttons: settings.buttons,
          },
        },
      };

      if (editingReminderId) {
        await api.put(`/ai-agents/external/reminders/${editingReminderId}`, payload);
      } else {
        await api.post("/ai-agents/external/reminders", payload);
      }

      setReminderForm({ leadName: "", leadPhone: "", scheduledAt: "", message: "" });
      setEditingReminderId(null);
      await loadExternalAgent();
      toast.success(editingReminderId ? "Lembrete atualizado." : "Lembrete criado.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleSendReminderNow = async (reminderId) => {
    setExternalSaving(true);
    try {
      await api.post(`/ai-agents/external/reminders/${reminderId}/send-now`);
      await loadExternalAgent();
      toast.success("Lembrete enviado ao lead.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleSendReminderGroup = async (reminderId) => {
    setExternalSaving(true);
    try {
      await api.post(`/ai-agents/external/reminders/${reminderId}/send-group`);
      toast.success("Notificacao de lembrete enviada ao grupo.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const toDateTimeLocal = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
  };

  const handleEditReminder = (reminder) => {
    setEditingReminderId(reminder.id);
    setReminderForm({
      leadName: reminder.leadName || "",
      leadPhone: reminder.leadPhone || "",
      scheduledAt: toDateTimeLocal(reminder.scheduledAt),
      message: reminder.message || reminder.metadata?.interactivePayload?.text || "",
    });
  };

  const handleCancelEditReminder = () => {
    setEditingReminderId(null);
    setReminderForm({ leadName: "", leadPhone: "", scheduledAt: "", message: "" });
  };

  const handleDeleteReminder = async () => {
    if (!deletingReminder) return;

    setExternalSaving(true);
    try {
      await api.delete(`/ai-agents/external/reminders/${deletingReminder.id}`);
      setDeletingReminder(null);
      if (editingReminderId === deletingReminder.id) {
        handleCancelEditReminder();
      }
      await loadExternalAgent();
      toast.success("Lembrete excluido.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleCreateRagDocument = async () => {
    setExternalSaving(true);
    try {
      if (ragFile) {
        const formData = new FormData();
        formData.append("file", ragFile);
        formData.append("metadata", JSON.stringify({ origem: "crm", base: ragBase }));
        await api.post(`/ai-agents/external/rag/${ragBase}/upload`, formData);
      } else {
        await api.post(`/ai-agents/external/rag/${ragBase}`, {
          content: ragContent,
          metadata: {
            origem: "crm",
            base: ragBase,
          },
        });
      }
      setRagContent("");
      setRagFile(null);
      await loadRagDocuments();
      toast.success("Documento enviado para a base RAG.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleSearchRag = async () => {
    setExternalSaving(true);
    try {
      const { data } = await api.post(`/ai-agents/external/rag/${ragBase}/search`, {
        query: ragQuery,
        matchCount: 5,
      });
      setRagResults(data?.results || []);
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleDeleteRagDocument = async (documentId) => {
    setExternalSaving(true);
    try {
      await api.delete(`/ai-agents/external/rag/${ragBase}/${documentId}`);
      await loadRagDocuments();
      toast.success("Documento removido da base RAG.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const WEBHOOK_EVENT_TYPES = [
    { value: "external_agent.appointment.created", label: "Agendamento criado" },
    { value: "external_agent.appointment.updated", label: "Agendamento atualizado" },
    { value: "external_agent.appointment.deleted", label: "Agendamento excluido" },
    { value: "external_agent.reminder.created", label: "Lembrete criado" },
    { value: "external_agent.reminder.updated", label: "Lembrete atualizado" },
    { value: "external_agent.reminder.sent", label: "Lembrete enviado" },
    { value: "external_agent.followup.sent", label: "Follow-up enviado" },
    { value: "external_agent.rag.created", label: "Documento RAG criado" },
    { value: "external_agent.prompt.updated", label: "Prompt atualizado" },
    { value: "external_agent.config.updated", label: "Configuracao alterada" },
  ];

  const handleSaveWebhook = async () => {
    setExternalSaving(true);
    try {
      if (editingWebhookId) {
        await api.put(`/ai-agents/external/webhooks/${editingWebhookId}`, webhookForm);
        toast.success("Webhook atualizado.");
      } else {
        await api.post("/ai-agents/external/webhooks", { ...webhookForm, isActive: true });
        toast.success("Webhook cadastrado.");
      }
      setWebhookForm({ name: "", url: "", eventType: "" });
      setEditingWebhookId(null);
      const { data } = await api.get("/ai-agents/external/webhooks");
      setAiWebhooks(data?.webhooks || []);
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleEditWebhook = (webhook) => {
    setEditingWebhookId(webhook.id);
    setWebhookForm({ name: webhook.name, url: webhook.url, eventType: webhook.eventType });
  };

  const handleCancelEditWebhook = () => {
    setEditingWebhookId(null);
    setWebhookForm({ name: "", url: "", eventType: "" });
  };

  const handleToggleWebhook = async (webhookId) => {
    setExternalSaving(true);
    try {
      await api.patch(`/ai-agents/external/webhooks/${webhookId}/toggle`);
      const { data } = await api.get("/ai-agents/external/webhooks");
      setAiWebhooks(data?.webhooks || []);
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    setExternalSaving(true);
    try {
      await api.delete(`/ai-agents/external/webhooks/${webhookId}`);
      const { data } = await api.get("/ai-agents/external/webhooks");
      setAiWebhooks(data?.webhooks || []);
      toast.success("Webhook removido.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const handleDeleteExternalEvent = async (eventId) => {
    setExternalSaving(true);
    try {
      await api.delete(`/ai-agents/external/events/${eventId}`);
      await loadExternalAgent();
      toast.success("Log removido.");
    } catch (err) {
      toastError(err);
    } finally {
      setExternalSaving(false);
    }
  };

  const loadFollowUpConfig = async () => {
    setFollowUpConfigLoading(true);
    try {
      const { data } = await api.get("/ai-agents/external/follow-ups/config");
      setFollowUpConfig(data);
    } catch (err) {
      toastError(err);
    } finally {
      setFollowUpConfigLoading(false);
    }
  };

  const handleSaveFollowUpConfig = async () => {
    if (!followUpConfig) return;
    setFollowUpConfigSaving(true);
    try {
      const { data } = await api.put("/ai-agents/external/follow-ups/config", {
        enabled: followUpConfig.enabled,
        prompt: followUpConfig.prompt || null,
        abandonmentMinutes: Number(followUpConfig.abandonmentMinutes),
        cooldownHours: Number(followUpConfig.cooldownHours),
        maxPerRun: Number(followUpConfig.maxPerRun),
        maxPerDay: Number(followUpConfig.maxPerDay),
        minDelaySeconds: Number(followUpConfig.minDelaySeconds),
        maxDelaySeconds: Number(followUpConfig.maxDelaySeconds),
        ignoreCompanyAiPaused: Boolean(followUpConfig.ignoreCompanyAiPaused),
        timezone: followUpConfig.timezone || "America/Sao_Paulo",
        executionTimes: Array.isArray(followUpConfig.executionTimes) ? followUpConfig.executionTimes : ["08:00", "12:00", "17:30"],
        lookbackHours: Number(followUpConfig.lookbackHours),
        ignoreResolvedTickets: Boolean(followUpConfig.ignoreResolvedTickets),
        ignoreClosedTickets: Boolean(followUpConfig.ignoreClosedTickets),
        typingSimulationEnabled: Boolean(followUpConfig.typingSimulationEnabled),
      });
      setFollowUpConfig((prev) => ({ ...prev, ...data }));
      toast.success("Configuração do follow-up salva.");
    } catch (err) {
      toastError(err);
    } finally {
      setFollowUpConfigSaving(false);
    }
  };

  const loadFollowUpLogs = async () => {
    setFollowUpLogsLoading(true);
    try {
      const { data } = await api.get("/ai-agents/external/follow-ups/logs");
      setFollowUpLogs(data.logs || []);
    } catch (err) {
      toastError(err);
    } finally {
      setFollowUpLogsLoading(false);
    }
  };

  const handleRetryLog = async (logId) => {
    setFollowUpRetrying(logId);
    try {
      await api.post(`/ai-agents/external/follow-ups/logs/${logId}/retry`);
      toast.success("Follow-up recolocado na fila para reenvio.");
      await loadFollowUpLogs();
    } catch (err) {
      toastError(err);
    } finally {
      setFollowUpRetrying(null);
    }
  };

  const handleProcessAiFollowUps = async () => {
    setFollowUpProcessing(true);
    setFollowUpProcessResult(null);
    try {
      const { data } = await api.post("/ai-agents/external/follow-ups/process");
      setFollowUpProcessResult(data);
      await loadExternalAgent();
      if (data?.blocked) {
        toast.warning("IA da empresa está pausada/desligada. Follow-up bloqueado.");
      } else {
        toast.success(`${data?.sent || 0} enviado(s), ${data?.skipped || 0} ignorado(s), ${data?.failed || 0} falha(s).`);
      }
    } catch (err) {
      toastError(err);
    } finally {
      setFollowUpProcessing(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString("pt-BR");
    } catch {
      return value;
    }
  };

  const getEventStatusClass = (status) => {
    if (status === "sent") return classes.statusSent;
    if (status === "failed") return classes.statusFailed;
    if (status === "skipped") return classes.statusSkipped;
    return classes.statusPending;
  };

  const externalMenuItems = [
    { key: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { key: "prompt", label: "System Prompt", icon: <PsychologyIcon /> },
    { key: "appointments", label: "Agendamentos IA", icon: <EventNoteIcon /> },
    { key: "reminders", label: "Lembretes", icon: <NotificationsActiveIcon /> },
    { key: "followups", label: "Follow-up", icon: <NotificationsActiveIcon /> },
    { key: "rag", label: "Base RAG", icon: <StorageIcon /> },
    { key: "settings", label: "Configurações de Mensagens", icon: <ChatBubbleOutlineIcon /> },
    { key: "business_hours", label: "Horário de Funcionamento", icon: <AccessTimeIcon /> },
  ];

  const externalSecondaryMenuItems = [
    { key: "webhooks", label: "Webhooks", icon: <LinkIcon /> },
    { key: "events", label: "Eventos / Logs", icon: <ListAltIcon /> },
    { key: "chatMemory", label: "Chat Memory", icon: <MemoryIcon /> },
    { key: "ai_actions", label: "Ações da IA", icon: <BlockIcon /> },
    { key: "ai_settings", label: "Informações", icon: <InfoOutlinedIcon /> },
  ];

  const externalStats = {
    promptVersions: externalVersions.length,
    sentEvents: externalEvents.filter(event => event.status === "sent").length,
    failedEvents: externalEvents.filter(event => event.status === "failed").length,
    skippedEvents: externalEvents.filter(event => event.status === "skipped").length,
    appointments: aiAppointments.length,
    reminders: aiReminders.length,
    followUps: aiFollowUps.filter(lead => lead.status === "follow_up" || lead.leadStatus === "follow_up").length,
    followUpsSent: aiFollowUps.filter(lead => lead.status === "follow_up_enviado" || lead.leadStatus === "follow_up_enviado").length,
    ragDocuments: ragDocuments.length,
  };

  const renderExternalEvents = () => (
    <Box className={classes.externalPanel}>
      <Typography className={classes.panelTitle}>Eventos enviados ao N8N</Typography>
      <Typography className={classes.panelSubtitle}>
        Historico recente dos disparos feitos pelo agente externo.
      </Typography>
      {externalEvents.length === 0 ? (
        <Typography className={classes.toolsEmpty}>Nenhum evento registrado ainda.</Typography>
      ) : (
        externalEvents.map((event) => (
          <Box key={event.id} className={classes.eventItem}>
            <Box>
              <Typography className={classes.versionTitle}>{event.eventType}</Typography>
              <Typography className={classes.versionMeta}>
                {formatDateTime(event.createdAt)}
                {event.errorMessage ? ` - ${event.errorMessage}` : ""}
              </Typography>
            </Box>
            <Box className={classes.inlineActions}>
              <span className={`${classes.eventStatus} ${getEventStatusClass(event.status)}`}>
                {event.status}
              </span>
              <Tooltip title="Excluir log">
                <IconButton size="small" onClick={() => handleDeleteExternalEvent(event.id)} disabled={externalSaving}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );

  const renderExternalPrompt = () => {
    const galleryPreview = promptGallery.slice(0, 8);

    return (
    <Box>
      {/* --- GALERIA DE PROMPTS --- */}
      {promptGallery.length > 0 && (
        <Box className={classes.externalPanel} style={{ marginBottom: 16 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" style={{ marginBottom: 10 }}>
            <Box>
              <Typography className={classes.panelTitle}>Galeria de Prompts</Typography>
              <Typography className={classes.panelSubtitle}>
                Escolha um modelo pronto para o seu nicho e aplique como base.
              </Typography>
            </Box>
          </Box>
          <Box className={classes.promptGalleryRow}>
            {galleryPreview.map(tpl => (
              <Box
                key={tpl.id}
                className={classes.promptTemplateCard}
                onClick={() => { setPromptTemplatePreview(tpl); setPromptApplyDialog(true); }}
              >
                <div className={classes.templateCardIcon}>{tpl.icon}</div>
                <Typography className={classes.templateCardName}>{tpl.name}</Typography>
                <Typography className={classes.templateCardDesc}>{tpl.description}</Typography>
                <Box>
                  {(tpl.tools || []).slice(0, 3).map(t => (
                    <span key={t} className={classes.templateToolBadge}>{t}</span>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
          {promptGallery.length > 8 && (
            <Box textAlign="center" style={{ marginTop: 8 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setPromptGalleryModalOpen(true)}
              >
                Ver mais modelos ({promptGallery.length - 8} restantes)
              </Button>
            </Box>
          )}
        </Box>
      )}

      <Box className={classes.externalGrid}>
        <Box className={classes.externalPanel}>
          <Typography className={classes.panelTitle}>System Prompt</Typography>
          <Typography className={classes.panelSubtitle}>
            Cada salvamento cria uma nova versao e dispara o evento para o N8N.
          </Typography>
          <TextField
            className={classes.promptEditor}
            label="Prompt do agente externo"
            variant="outlined"
            fullWidth
            multiline
            minRows={18}
            maxRows={18}
            value={externalPrompt}
            onChange={(event) => setExternalPrompt(event.target.value)}
          />

          {/* --- BLOCOS DE FERRAMENTAS --- */}
          <Box style={{ marginTop: 12 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setPromptToolBlocksOpen(v => !v)}
              style={{ marginBottom: 8 }}
            >
              {promptToolBlocksOpen ? "▲ Ocultar blocos de ferramentas" : "▼ Blocos prontos de ferramentas"}
            </Button>
            {promptToolBlocksOpen && (
              <Box className={classes.toolBlocksGrid}>
                {TOOL_BLOCKS.map(block => (
                  <Box key={block.id} className={classes.toolBlockCard}>
                    <Typography style={{ fontSize: "0.78rem", fontWeight: 600 }}>{block.label}</Typography>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      style={{ minWidth: 90, whiteSpace: "nowrap", marginLeft: 8 }}
                      onClick={() => {
                        setExternalPrompt(prev => prev + block.text);
                        toast.success(`Bloco "${block.label}" adicionado ao prompt.`);
                      }}
                    >
                      Adicionar
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <TextField
            label="Nota da alteracao"
            variant="outlined"
            fullWidth
            size="small"
            value={externalChangeNote}
            onChange={(event) => setExternalChangeNote(event.target.value)}
            style={{ marginTop: 12 }}
          />
          <Box className={classes.actionRow} style={{ flexWrap: "wrap", gap: 8 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              disabled={externalSaving || !externalPrompt.trim()}
              onClick={handleSaveExternalPrompt}
            >
              Salvar prompt
            </Button>
            <Button
              variant="outlined"
              disabled={promptAnalysisLoading || !externalPrompt.trim()}
              onClick={handleAnalyzePrompt}
              startIcon={promptAnalysisLoading ? <CircularProgress size={14} /> : null}
            >
              {promptAnalysisLoading ? "Analisando..." : "Analisar com IA"}
            </Button>
            <Button
              variant="outlined"
              disabled={promptImproveLoading || !externalPrompt.trim()}
              onClick={handleImprovePrompt}
              startIcon={promptImproveLoading ? <CircularProgress size={14} /> : null}
            >
              {promptImproveLoading ? "Melhorando..." : "Melhorar com IA"}
            </Button>
            <Button
              variant="outlined"
              disabled={promptExamplesLoading}
              onClick={handleFetchExamples}
              startIcon={promptExamplesLoading ? <CircularProgress size={14} /> : null}
            >
              {promptExamplesLoading ? "Buscando..." : "Exemplos do Chat Memory"}
            </Button>
          </Box>

          {/* --- PAINEL DE ANÁLISE --- */}
          {promptAnalysis && (
            <Box className={classes.analysisPanel}>
              <Box display="flex" alignItems="flex-start" style={{ gap: 16 }}>
                <Box
                  className={classes.scoreCircle}
                  style={{
                    backgroundColor: promptAnalysis.score >= 80 ? "#16a34a" :
                      promptAnalysis.score >= 60 ? "#d97706" : "#dc2626"
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>{promptAnalysis.score}</span>
                  <span style={{ fontSize: "0.55rem", fontWeight: 600 }}>{promptAnalysis.grade}</span>
                </Box>
                <Box flex={1}>
                  <Typography style={{ fontWeight: 700, marginBottom: 8 }}>Análise do Prompt</Typography>
                  {promptAnalysis.strengths?.length > 0 && (
                    <Box style={{ marginBottom: 8 }}>
                      <Typography style={{ fontSize: "0.75rem", fontWeight: 800, color: "#16a34a", marginBottom: 3 }}>✓ PONTOS FORTES</Typography>
                      {promptAnalysis.strengths.map((s, i) => (
                        <Typography key={i} className={classes.analysisBullet}>{s}</Typography>
                      ))}
                    </Box>
                  )}
                  {promptAnalysis.weaknesses?.length > 0 && (
                    <Box style={{ marginBottom: 8 }}>
                      <Typography style={{ fontSize: "0.75rem", fontWeight: 800, color: "#dc2626", marginBottom: 3 }}>✗ PONTOS FRACOS</Typography>
                      {promptAnalysis.weaknesses.map((s, i) => (
                        <Typography key={i} className={classes.analysisBullet}>{s}</Typography>
                      ))}
                    </Box>
                  )}
                  {promptAnalysis.hallucinationRisks?.length > 0 && (
                    <Box style={{ marginBottom: 8 }}>
                      <Typography style={{ fontSize: "0.75rem", fontWeight: 800, color: "#d97706", marginBottom: 3 }}>⚠ RISCOS DE ALUCINAÇÃO</Typography>
                      {promptAnalysis.hallucinationRisks.map((s, i) => (
                        <Typography key={i} className={classes.analysisBullet}>{s}</Typography>
                      ))}
                    </Box>
                  )}
                  {promptAnalysis.suggestions?.length > 0 && (
                    <Box>
                      <Typography style={{ fontSize: "0.75rem", fontWeight: 800, color: "#1f5eea", marginBottom: 3 }}>💡 SUGESTÕES</Typography>
                      {promptAnalysis.suggestions.map((s, i) => (
                        <Typography key={i} className={classes.analysisBullet}>{s}</Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
              <Box textAlign="right" style={{ marginTop: 8 }}>
                <Button size="small" onClick={() => setPromptAnalysis(null)}>Fechar análise</Button>
              </Box>
            </Box>
          )}

          {/* --- EXEMPLOS DO CHAT MEMORY --- */}
          {promptExamplesOpen && promptExamples.length > 0 && (
            <Box className={classes.examplesPanel}>
              <Box display="flex" alignItems="center" justifyContent="space-between" style={{ marginBottom: 10 }}>
                <Typography style={{ fontWeight: 700 }}>Exemplos de Conversa (Chat Memory)</Typography>
                <Button size="small" onClick={() => setPromptExamplesOpen(false)}>Fechar</Button>
              </Box>
              {promptExamples.map((ex, i) => (
                <Box key={i} className={classes.exampleCard}>
                  <Typography style={{ fontWeight: 700, fontSize: "0.8rem", marginBottom: 6 }}>
                    {ex.title}
                  </Typography>
                  <Typography style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 4 }}>
                    <strong>Cliente:</strong> {ex.clientExample}
                  </Typography>
                  <Typography style={{ fontSize: "0.78rem", color: "#374151" }}>
                    <strong>Sugestão:</strong> {ex.suggestedAnswer}
                  </Typography>
                </Box>
              ))}
              <Box display="flex" style={{ gap: 8, marginTop: 8 }}>
                <Button size="small" variant="contained" color="primary" onClick={handleAddExamplesToPrompt}>
                  Adicionar exemplos ao prompt
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const text = promptExamples.map(ex =>
                      `${ex.title}\nCliente: "${ex.clientExample}"\nAgente: "${ex.suggestedAnswer}"`
                    ).join("\n\n");
                    navigator.clipboard?.writeText(text);
                    toast.success("Exemplos copiados.");
                  }}
                >
                  Copiar exemplos
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        <Box className={classes.externalPanel}>
          <Typography className={classes.panelTitle}>Versoes do Prompt</Typography>
          <Typography className={classes.panelSubtitle}>
            Restaure uma versao anterior quando precisar voltar o comportamento do agente.
          </Typography>

          <Box className={classes.versionList}>
            {externalVersions.length === 0 ? (
              <Typography className={classes.toolsEmpty}>Nenhuma versao salva ainda.</Typography>
            ) : (
              externalVersions.map((version) => (
                <Box
                  key={version.id}
                  className={`${classes.versionItem} ${version.isActive ? classes.activeVersionItem : ""}`}
                >
                  <Box className={classes.versionHeader}>
                    <Box>
                      <Typography className={classes.versionTitle}>
                        Versao {version.version} {version.isActive ? "(ativa)" : ""}
                      </Typography>
                      <Typography className={classes.versionMeta}>
                        {formatDateTime(version.createdAt)}
                      </Typography>
                    </Box>
                    <HistoryIcon style={{ color: version.isActive ? "#1f5eea" : "#9ca3af" }} />
                  </Box>
                  {version.changeNote && (
                    <Typography className={classes.versionMeta}>
                      {version.changeNote}
                    </Typography>
                  )}
                  <Typography className={classes.versionPreview}>
                    {(version.content || "").slice(0, 180)}
                    {(version.content || "").length > 180 ? "..." : ""}
                  </Typography>
                  <Box className={classes.inlineActions}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RestoreIcon />}
                      disabled={externalSaving || version.isActive}
                      onClick={() => handleRestoreExternalVersion(version.id)}
                    >
                      Restaurar
                    </Button>
                    <Tooltip title={version.isActive ? "A versao ativa nao pode ser excluida" : "Excluir versao"}>
                      <span>
                        <IconButton
                          size="small"
                          color="secondary"
                          disabled={externalSaving || version.isActive}
                          onClick={() => handleDeleteExternalVersion(version.id)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Box>

      {/* --- DIALOG: APLICAR TEMPLATE --- */}
      <Dialog
        open={promptApplyDialog}
        onClose={() => setPromptApplyDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {promptTemplatePreview?.icon} {promptTemplatePreview?.name}
          <Typography variant="caption" display="block" style={{ marginTop: 4 }}>
            {promptTemplatePreview?.description}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            multiline
            minRows={14}
            maxRows={22}
            fullWidth
            variant="outlined"
            value={promptTemplatePreview?.content || ""}
            InputProps={{ readOnly: true }}
            style={{ fontFamily: "monospace", fontSize: "0.78rem" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromptApplyDialog(false)}>Cancelar</Button>
          <Button
            variant="outlined"
            onClick={() => {
              setExternalPrompt(prev => prev + "\n\n" + (promptTemplatePreview?.content || ""));
              setPromptApplyDialog(false);
              toast.success("Template inserido no final do prompt. Salve para criar nova versão.");
            }}
          >
            Inserir no final
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setExternalPrompt(promptTemplatePreview?.content || "");
              setPromptApplyDialog(false);
              toast.success("Template aplicado. Salve para criar nova versão.");
            }}
          >
            Substituir prompt atual
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG: GALERIA COMPLETA --- */}
      <Dialog
        open={promptGalleryModalOpen}
        onClose={() => setPromptGalleryModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Todos os modelos de prompt</DialogTitle>
        <DialogContent>
          <Box className={classes.promptGalleryRow} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {promptGallery.map(tpl => (
              <Box
                key={tpl.id}
                className={classes.promptTemplateCard}
                onClick={() => {
                  setPromptTemplatePreview(tpl);
                  setPromptGalleryModalOpen(false);
                  setPromptApplyDialog(true);
                }}
              >
                <div className={classes.templateCardIcon}>{tpl.icon}</div>
                <Typography className={classes.templateCardName}>{tpl.name}</Typography>
                <Typography className={classes.templateCardDesc}>{tpl.description}</Typography>
                <Box>
                  {(tpl.tools || []).slice(0, 3).map(t => (
                    <span key={t} className={classes.templateToolBadge}>{t}</span>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromptGalleryModalOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG: COMPARAR PROMPT MELHORADO --- */}
      <Dialog
        open={promptImproveDialog}
        onClose={() => setPromptImproveDialog(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          Prompt Melhorado pela IA
          {promptImprovedVersion?.summary && (
            <Typography variant="caption" display="block" style={{ marginTop: 4, color: "#64748b" }}>
              {promptImprovedVersion.summary}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box className={classes.compareGrid}>
            <Box>
              <Typography style={{ fontWeight: 700, marginBottom: 8, color: "#64748b" }}>Prompt atual</Typography>
              <TextField
                multiline
                minRows={16}
                maxRows={28}
                fullWidth
                variant="outlined"
                value={externalPrompt}
                InputProps={{ readOnly: true }}
                style={{ fontSize: "0.78rem" }}
              />
            </Box>
            <Box>
              <Typography style={{ fontWeight: 700, marginBottom: 8, color: "#1f5eea" }}>Prompt sugerido pela IA</Typography>
              <TextField
                multiline
                minRows={16}
                maxRows={28}
                fullWidth
                variant="outlined"
                value={promptImprovedVersion?.improvedPrompt || ""}
                InputProps={{ readOnly: true }}
                style={{ fontSize: "0.78rem" }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromptImproveDialog(false)}>Cancelar</Button>
          <Button
            variant="outlined"
            onClick={() => {
              navigator.clipboard?.writeText(promptImprovedVersion?.improvedPrompt || "");
              toast.success("Prompt sugerido copiado.");
            }}
          >
            Copiar sugestão
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleApplyImprovedPrompt}
          >
            Aplicar sugestão
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    );
  };

  const renderVariableChips = (onInsert, extraVariables = []) => (
    <Box display="flex" flexWrap="wrap" style={{ gap: 6 }}>
      {[...dynamicVariables, ...extraVariables].map(variable => (
        <Chip
          key={variable.token}
          size="small"
          label={variable.label}
          onClick={() => onInsert(variable.token)}
          style={{ fontWeight: 700 }}
        />
      ))}
    </Box>
  );

  const renderWhatsappSelect = (label, value, onChange) => (
    <TextField
      select
      label={label}
      variant="outlined"
      size="small"
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
    >
      <MenuItem value="">Selecionar conexao</MenuItem>
      {whatsappOptions.map((whatsapp) => (
        <MenuItem key={whatsapp.id} value={whatsapp.id}>
          {whatsapp.name || `Conexao #${whatsapp.id}`}
        </MenuItem>
      ))}
    </TextField>
  );

  const renderGroupNotificationSettings = () => {
    const groups = getExternalGroupNotifications();
    const items = [
      {
        key: "appointmentCreated",
        title: "Envio para grupo - agendamento criado",
        description: "Notifica o grupo quando um compromisso for criado.",
      },
      {
        key: "reminderSent",
        title: "Envio para grupo - lembrete enviado",
        description: "Notifica o grupo quando o lembrete automatico for enviado ao cliente.",
      },
      {
        key: "appointmentCancelled",
        title: "Envio para grupo - cancelamento",
        description: "Notifica o grupo quando um compromisso for cancelado.",
      },
    ];

    return (
      <Box className={classes.fieldStack} style={{ marginTop: 18 }}>
        <Divider />
        <Typography className={classes.panelTitle}>Notificacoes para grupo da empresa</Typography>
        <Typography className={classes.panelSubtitle}>
          Configure mensagens automaticas para o grupo operacional da empresa.
        </Typography>

        {items.map(item => {
          const settings = groups[item.key];
          return (
            <Box key={item.key} className={classes.externalPanel} style={{ boxShadow: "none" }}>
              <Typography className={classes.panelTitle}>{item.title}</Typography>
              <Typography className={classes.panelSubtitle}>{item.description}</Typography>
              <Box className={classes.fieldStack}>
                <FormControlLabel
                  control={
                    <Switch
                      color="primary"
                      checked={Boolean(settings.enabled)}
                      onChange={(event) => handleGroupNotificationChange(item.key, "enabled", event.target.checked)}
                    />
                  }
                  label="Ativar envio para grupo"
                />
                {renderWhatsappSelect(
                  "Instancia/conexao de envio",
                  settings.whatsappId,
                  (value) => handleGroupNotificationChange(item.key, "whatsappId", value)
                )}
                <TextField
                  label="Nome da configuracao"
                  variant="outlined"
                  size="small"
                  value={settings.name || ""}
                  onChange={(event) => handleGroupNotificationChange(item.key, "name", event.target.value)}
                />
                <TextField
                  label="Numero/ID do grupo"
                  variant="outlined"
                  size="small"
                  value={settings.groupNumber || ""}
                  onChange={(event) => handleGroupNotificationChange(item.key, "groupNumber", event.target.value)}
                  placeholder="Ex.: 120363000000000000@g.us"
                />
                <TextField
                  label="Mensagem personalizada"
                  variant="outlined"
                  multiline
                  minRows={4}
                  value={settings.message || ""}
                  onChange={(event) => handleGroupNotificationChange(item.key, "message", event.target.value)}
                />
                {renderVariableChips(
                  (token) => insertGroupVariable(item.key, token),
                  item.key === "appointmentCancelled"
                    ? [{ token: "{{cancellationReason}}", label: "Motivo cancelamento" }]
                    : []
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderExternalSettings = () => (
    <Box className={classes.placeholderGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Configuracoes do Agente Externo N8N</Typography>
        <Typography className={classes.panelSubtitle}>
          Configure as opcoes gerais do agente externo. Para gerenciar URLs de webhook por evento, acesse a aba Webhooks.
        </Typography>

        <Box className={classes.fieldStack}>
          <TextField
            label="Nome do agente"
            variant="outlined"
            size="small"
            value={externalConfig?.name || ""}
            onChange={(event) => handleExternalConfigChange("name", event.target.value)}
          />
        </Box>

        <Box className={classes.actionRow}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={externalSaving}
            onClick={handleSaveExternalConfig}
          >
            Salvar configuracao
          </Button>
        </Box>

        {renderGroupNotificationSettings()}
      </Box>

      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Lembretes automaticos</Typography>
        <Typography className={classes.panelSubtitle}>
          Template usado quando o agente externo criar um agendamento.
        </Typography>
        <Box className={classes.fieldStack}>
          <FormControlLabel
            control={
              <Switch
                color="primary"
                checked={getExternalReminderSettings().enabled}
                onChange={(event) => handleReminderSettingChange("enabled", event.target.checked)}
              />
            }
            label="Criar lembrete automaticamente"
          />
          <TextField
            select
            label="Conexao de envio"
            variant="outlined"
            size="small"
            value={getExternalReminderSettings().whatsappId || ""}
            onChange={(event) => handleReminderSettingChange("whatsappId", event.target.value)}
          >
            <MenuItem value="">Selecionar conexao</MenuItem>
            {whatsappOptions.map((whatsapp) => (
              <MenuItem key={whatsapp.id} value={whatsapp.id}>
                {whatsapp.name || `Conexao #${whatsapp.id}`}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Horas antes do compromisso"
            type="number"
            variant="outlined"
            size="small"
            value={getExternalReminderSettings().hoursBefore}
            onChange={(event) => handleReminderSettingChange("hoursBefore", Number(event.target.value || 4))}
          />
          <TextField
            label="Texto do lembrete"
            variant="outlined"
            multiline
            minRows={6}
            value={getExternalReminderSettings().text}
            onChange={(event) => handleReminderSettingChange("text", event.target.value)}
          />
          {renderVariableChips(insertReminderVariable)}
          <TextField
            label="Rodape"
            variant="outlined"
            size="small"
            value={getExternalReminderSettings().footer}
            onChange={(event) => handleReminderSettingChange("footer", event.target.value)}
          />
          {getExternalReminderSettings().buttons.map((button, index) => (
            <TextField
              key={`auto-reminder-button-${index}`}
              label={`Botao ${index + 1}`}
              variant="outlined"
              size="small"
              value={button?.buttonText?.displayText || ""}
              onChange={(event) => handleReminderButtonChange(index, event.target.value)}
            />
          ))}
        </Box>
        <Box className={classes.actionRow}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={externalSaving}
            onClick={handleSaveExternalConfig}
          >
            Salvar lembretes
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const renderExternalDashboard = () => (
    <>
      <Box className={classes.dashboardGrid}>
        <Box className={classes.metricBox}>
          <Typography className={classes.metricLabel}>Agendamentos IA</Typography>
          <Typography className={classes.metricValue}>{externalStats.appointments}</Typography>
        </Box>
        <Box className={classes.metricBox}>
          <Typography className={classes.metricLabel}>Lembretes</Typography>
          <Typography className={classes.metricValue}>{externalStats.reminders}</Typography>
        </Box>
        <Box className={classes.metricBox}>
          <Typography className={classes.metricLabel}>Docs RAG</Typography>
          <Typography className={classes.metricValue}>{externalStats.ragDocuments}</Typography>
        </Box>
        <Box className={classes.metricBox}>
          <Typography className={classes.metricLabel}>Falhas N8N</Typography>
          <Typography className={classes.metricValue}>{externalStats.failedEvents}</Typography>
        </Box>
      </Box>
      <Box className={classes.placeholderGrid}>
        <Box className={classes.externalPanel}>
          <Typography className={classes.panelTitle}>Operacao da IA</Typography>
          <Typography className={classes.panelSubtitle}>
            Resumo inicial do agente externo. Os proximos passos vao conectar agendamentos, lembretes e RAG.
          </Typography>
          <Box className={classes.placeholderList}>
            <Box className={classes.placeholderRow}>
              <Typography>Versoes de prompt</Typography>
              <span className={classes.mutedPill}>{externalStats.promptVersions}</span>
            </Box>
            <Box className={classes.placeholderRow}>
              <Typography>Eventos enviados</Typography>
              <span className={classes.mutedPill}>{externalStats.sentEvents}</span>
            </Box>
            <Box className={classes.placeholderRow}>
              <Typography>Eventos sem webhook</Typography>
              <span className={classes.mutedPill}>{externalStats.skippedEvents}</span>
            </Box>
          </Box>
        </Box>
        {renderExternalEvents()}
      </Box>
    </>
  );

  const renderExternalPlaceholder = ({ title, subtitle, rows }) => (
    <Box className={classes.placeholderGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>{title}</Typography>
        <Typography className={classes.panelSubtitle}>{subtitle}</Typography>
        <Box className={classes.placeholderList}>
          {rows.map((row) => (
            <Box key={row.title} className={classes.placeholderRow}>
              <Box>
                <Typography className={classes.versionTitle}>{row.title}</Typography>
                <Typography className={classes.versionMeta}>{row.description}</Typography>
              </Box>
              <span className={classes.mutedPill}>{row.status}</span>
            </Box>
          ))}
        </Box>
      </Box>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Proximo desenvolvimento</Typography>
        <Typography className={classes.panelSubtitle}>
          Esta area ja fica posicionada no menu do agente externo para receber as tabelas, rotas e automacoes especificas.
        </Typography>
      </Box>
    </Box>
  );

  const renderAppointments = () => (
    <Box className={classes.placeholderGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Agendamentos IA</Typography>
        <Typography className={classes.panelSubtitle}>
          Crie e acompanhe agendamentos da IA sincronizados com Compromissos do CRM.
        </Typography>
        <Box className={classes.fieldStack}>
          <TextField label="Titulo" variant="outlined" size="small" value={appointmentForm.title} onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })} />
          <TextField label="Nome do lead" variant="outlined" size="small" value={appointmentForm.leadName} onChange={(e) => setAppointmentForm({ ...appointmentForm, leadName: e.target.value })} />
          <TextField label="Telefone" variant="outlined" size="small" value={appointmentForm.leadPhone} onChange={(e) => setAppointmentForm({ ...appointmentForm, leadPhone: e.target.value })} />
          <TextField label="Email" variant="outlined" size="small" value={appointmentForm.leadEmail} onChange={(e) => setAppointmentForm({ ...appointmentForm, leadEmail: e.target.value })} />
          <TextField label="ID da agenda" variant="outlined" size="small" value={appointmentForm.scheduleId} onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduleId: e.target.value })} />
          <TextField label="Data e hora" type="datetime-local" variant="outlined" size="small" InputLabelProps={{ shrink: true }} value={appointmentForm.startDatetime} onChange={(e) => setAppointmentForm({ ...appointmentForm, startDatetime: e.target.value })} />
          <TextField label="Duracao em minutos" type="number" variant="outlined" size="small" value={appointmentForm.durationMinutes} onChange={(e) => setAppointmentForm({ ...appointmentForm, durationMinutes: e.target.value })} />
        </Box>
        <Box className={classes.actionRow}>
          <Button variant="contained" color="primary" disabled={externalSaving || !appointmentForm.title || !appointmentForm.scheduleId || !appointmentForm.startDatetime} onClick={handleCreateAiAppointment}>
            Criar agendamento
          </Button>
        </Box>
      </Box>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Lista de agendamentos</Typography>
        <Typography className={classes.panelSubtitle}>{aiAppointments.length} registro(s) da IA.</Typography>
        <Box className={classes.placeholderList}>
          {aiAppointments.length === 0 ? (
            <Typography className={classes.toolsEmpty}>Nenhum agendamento IA criado ainda.</Typography>
          ) : aiAppointments.map((item) => (
            <Box key={item.id} className={classes.placeholderRow}>
              <Box>
                <Typography className={classes.versionTitle}>{item.title}</Typography>
                <Typography className={classes.versionMeta}>
                  {item.leadName || item.leadPhone || "Sem lead"} - {formatDateTime(item.startDatetime)}
                </Typography>
              </Box>
              <Box className={classes.inlineActions}>
                <span className={classes.mutedPill}>{item.status}</span>
                <Tooltip title="Enviar notificacao ao grupo">
                  <IconButton
                    size="small"
                    disabled={externalSaving}
                    onClick={() => handleSendAppointmentGroup(item.id)}
                  >
                    <GroupIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir agendamento">
                  <IconButton
                    size="small"
                    color="secondary"
                    disabled={externalSaving}
                    onClick={() => setDeletingAiAppointment(item)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );

  const renderReminders = () => (
    <Box className={classes.placeholderGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Lembretes</Typography>
        <Typography className={classes.panelSubtitle}>
          Crie lembretes e pause a IA por 30 minutos para proteger a cadencia.
        </Typography>
        <Box className={classes.fieldStack}>
          <TextField label="Nome do lead" variant="outlined" size="small" value={reminderForm.leadName} onChange={(e) => setReminderForm({ ...reminderForm, leadName: e.target.value })} />
          <TextField label="Telefone" variant="outlined" size="small" value={reminderForm.leadPhone} onChange={(e) => setReminderForm({ ...reminderForm, leadPhone: e.target.value })} />
          <TextField label="Quando lembrar" type="datetime-local" variant="outlined" size="small" InputLabelProps={{ shrink: true }} value={reminderForm.scheduledAt} onChange={(e) => setReminderForm({ ...reminderForm, scheduledAt: e.target.value })} />
          <TextField
            label="Mensagem em botoes"
            variant="outlined"
            size="small"
            multiline
            minRows={4}
            value={reminderForm.message}
            onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })}
            placeholder={getExternalReminderSettings().text}
          />
          <Box className={classes.inlineActions}>
            {getExternalReminderSettings().buttons.map((button, index) => (
              <span key={`reminder-preview-${index}`} className={classes.mutedPill}>
                {button?.buttonText?.displayText || `Botao ${index + 1}`}
              </span>
            ))}
          </Box>
        </Box>
        <Box className={classes.actionRow}>
          <Button variant="contained" color="primary" disabled={externalSaving || !reminderForm.scheduledAt} onClick={handleCreateReminder}>
            {editingReminderId ? "Salvar lembrete" : "Criar lembrete"}
          </Button>
          {editingReminderId && (
            <Button variant="outlined" disabled={externalSaving} onClick={handleCancelEditReminder}>
              Cancelar edicao
            </Button>
          )}
        </Box>
      </Box>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Lembretes ativos</Typography>
        <Typography className={classes.panelSubtitle}>{aiReminders.length} registro(s).</Typography>
        <Box className={classes.placeholderList}>
          {aiReminders.length === 0 ? (
            <Typography className={classes.toolsEmpty}>Nenhum lembrete criado ainda.</Typography>
          ) : aiReminders.map((item) => (
            <Box key={item.id} className={classes.placeholderRow}>
              <Box>
                <Typography className={classes.versionTitle}>{item.leadName || item.leadPhone || "Lead"}</Typography>
                <Typography className={classes.versionMeta}>
                  {formatDateTime(item.scheduledAt)}
                  {item.aiAppointment?.title ? ` - ${item.aiAppointment.title}` : ""}
                </Typography>
              </Box>
              <Box className={classes.inlineActions}>
                <span className={classes.mutedPill}>{item.status}</span>
                <Tooltip title="Enviar lembrete privado agora">
                  <IconButton
                    size="small"
                    disabled={externalSaving || !(item.leadPhone || item.aiAppointment?.leadPhone)}
                    onClick={() => handleSendReminderNow(item.id)}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Enviar notificacao ao grupo">
                  <IconButton
                    size="small"
                    disabled={externalSaving}
                    onClick={() => handleSendReminderGroup(item.id)}
                  >
                    <GroupIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar lembrete">
                  <IconButton
                    size="small"
                    disabled={externalSaving}
                    onClick={() => handleEditReminder(item)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir lembrete">
                  <IconButton
                    size="small"
                    color="secondary"
                    disabled={externalSaving}
                    onClick={() => setDeletingReminder(item)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );

  const renderFollowUps = () => {
    const cfg = followUpConfig || {};
    const isEnabled = cfg.enabled === true;
    const statusColor = isEnabled ? "#22c55e" : "#94a3b8";
    const defaultPrompt = cfg.defaultPrompt || "";

    return (
      <Box style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Status do Agente ─────────────────────────────────────── */}
        <Box style={{ background: "#fff", borderRadius: 12, border: `1px solid ${statusColor}44`, padding: "20px 24px" }}>
          <Box style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <Box style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Box style={{ background: `${statusColor}18`, borderRadius: 10, padding: 10, display: "flex" }}>
                <NotificationsActiveIcon style={{ color: statusColor, fontSize: 26 }} />
              </Box>
              <Box>
                <Typography style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                  Agente de Follow-up Inteligente
                </Typography>
                <Box style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <Box style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor }} />
                  <Typography style={{ fontSize: 13, color: statusColor, fontWeight: 600 }}>
                    {isEnabled ? "Ativo" : "Inativo"}
                  </Typography>
                </Box>
                <Typography style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  Recupera leads que abandonaram a conversa ou não avançaram no funil.
                </Typography>
              </Box>
            </Box>
            <Box style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {/* Cards de stats */}
              {[
                { label: "Aguardando", value: externalStats.followUps, color: "#f59e0b" },
                { label: "Enviados", value: externalStats.followUpsSent, color: "#22c55e" },
              ].map((s) => (
                <Box key={s.label} style={{
                  background: `${s.color}11`, border: `1px solid ${s.color}33`,
                  borderRadius: 10, padding: "10px 16px", textAlign: "center", minWidth: 80
                }}>
                  <Typography style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</Typography>
                  <Typography style={{ fontSize: 11, color: "#64748b" }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Toggle ativo/inativo */}
          <Box style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <Switch
              size="small"
              checked={isEnabled}
              onChange={(e) => setFollowUpConfig((p) => ({ ...p, enabled: e.target.checked }))}
              color="primary"
            />
            <Typography style={{ fontSize: 13, color: "#475569" }}>
              {isEnabled ? "Agente ativo — processará follow-ups conforme configuração" : "Agente inativo — nenhum follow-up será enviado automaticamente"}
            </Typography>
          </Box>
        </Box>

        {/* ── Resultado da última execução ─────────────────────────── */}
        {followUpProcessResult && (
          <Box style={{
            background: followUpProcessResult.blocked ? "#fef3c7" : "#f0fdf4",
            border: `1px solid ${followUpProcessResult.blocked ? "#fcd34d" : "#bbf7d0"}`,
            borderRadius: 12, padding: "16px 20px"
          }}>
            <Typography style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
              Resultado da última execução
            </Typography>
            {followUpProcessResult.blocked ? (
              <Typography style={{ fontSize: 13, color: "#92400e" }}>
                IA da empresa está pausada/desligada ({followUpProcessResult.blockReason}). Nenhum follow-up enviado.
              </Typography>
            ) : (
              <Box style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { label: "Total processado", v: followUpProcessResult.processed, c: "#64748b" },
                  { label: "Enviados", v: followUpProcessResult.sent, c: "#22c55e" },
                  { label: "Ignorados", v: followUpProcessResult.skipped, c: "#f59e0b" },
                  { label: "Falhas", v: followUpProcessResult.failed, c: "#ef4444" },
                ].map((s) => (
                  <Box key={s.label} style={{ textAlign: "center" }}>
                    <Typography style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.v ?? 0}</Typography>
                    <Typography style={{ fontSize: 11, color: "#64748b" }}>{s.label}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* ── Prompt do Follow-up ──────────────────────────────────── */}
          <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
            <Typography style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
              Prompt do Follow-up
            </Typography>
            <Typography style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
              Variáveis: {"{{leadName}}"} {"{{companyName}}"} {"{{lastUserMessage}}"} {"{{conversationSummary}}"}
            </Typography>
            <TextField
              multiline
              minRows={12}
              maxRows={16}
              fullWidth
              variant="outlined"
              size="small"
              placeholder={defaultPrompt || "Deixe vazio para usar o prompt padrão do sistema."}
              value={cfg.prompt || ""}
              onChange={(e) => setFollowUpConfig((p) => ({ ...p, prompt: e.target.value }))}
            />
            {cfg.prompt && (
              <button
                type="button"
                onClick={() => setFollowUpConfig((p) => ({ ...p, prompt: "" }))}
                style={{ marginTop: 6, fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}
              >
                Limpar e usar prompt padrão
              </button>
            )}
          </Box>

          {/* ── Regras de Detecção + Envio ───────────────────────────── */}
          <Box style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
              <Typography style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>
                Regras de Detecção
              </Typography>
              <Box style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Abandono após (minutos)", key: "abandonmentMinutes", min: 10 },
                  { label: "Cooldown entre envios (horas)", key: "cooldownHours", min: 1 },
                  { label: "Máx. por execução", key: "maxPerRun", min: 1 },
                  { label: "Máx. por dia", key: "maxPerDay", min: 1 },
                ].map(({ label, key, min }) => (
                  <Box key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Typography style={{ fontSize: 13, color: "#475569", flex: 1 }}>{label}</Typography>
                    <TextField
                      type="number"
                      size="small"
                      variant="outlined"
                      value={cfg[key] ?? ""}
                      onChange={(e) => setFollowUpConfig((p) => ({ ...p, [key]: e.target.value }))}
                      inputProps={{ min, style: { width: 80, textAlign: "right" } }}
                      style={{ width: 100 }}
                    />
                  </Box>
                ))}
                <Box style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography style={{ fontSize: 13, color: "#475569" }}>Respeitar pausa/desligamento da IA</Typography>
                  <Switch
                    size="small"
                    checked={cfg.ignoreCompanyAiPaused !== false}
                    onChange={(e) => setFollowUpConfig((p) => ({ ...p, ignoreCompanyAiPaused: e.target.checked }))}
                    color="primary"
                  />
                </Box>
              </Box>
            </Box>

            <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
              <Typography style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>
                Regras de Envio
              </Typography>
              <Box style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Delay mínimo entre envios (seg)", key: "minDelaySeconds", min: 0 },
                  { label: "Delay máximo entre envios (seg)", key: "maxDelaySeconds", min: 0 },
                ].map(({ label, key, min }) => (
                  <Box key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Typography style={{ fontSize: 13, color: "#475569", flex: 1 }}>{label}</Typography>
                    <TextField
                      type="number"
                      size="small"
                      variant="outlined"
                      value={cfg[key] ?? ""}
                      onChange={(e) => setFollowUpConfig((p) => ({ ...p, [key]: e.target.value }))}
                      inputProps={{ min, style: { width: 80, textAlign: "right" } }}
                      style={{ width: 100 }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Horários de Processamento ─────────────────────────────── */}
        <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
          <Typography style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
            Horários de Processamento
          </Typography>
          <Typography style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>
            O agente será executado nos horários configurados. Timezone: {cfg.timezone || "America/Sao_Paulo"}
          </Typography>
          <Box style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {(cfg.executionTimes || ["08:00", "12:00", "17:30"]).map((t, idx) => (
              <Box key={idx} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#f1f5f9", borderRadius: 8, padding: "4px 10px"
              }}>
                <Typography style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{t}</Typography>
                <button
                  type="button"
                  onClick={() => setFollowUpConfig((p) => ({
                    ...p,
                    executionTimes: (p.executionTimes || []).filter((_, i) => i !== idx)
                  }))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, lineHeight: 1 }}
                >×</button>
              </Box>
            ))}
            <Box style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <TextField
                type="time"
                size="small"
                variant="outlined"
                id="new-exec-time"
                inputProps={{ style: { fontSize: 13 } }}
                style={{ width: 110 }}
              />
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("new-exec-time");
                  if (el && el.value) {
                    setFollowUpConfig((p) => ({
                      ...p,
                      executionTimes: [...(p.executionTimes || []), el.value].sort()
                    }));
                    el.value = "";
                  }
                }}
                style={{
                  background: "#2563eb", color: "#fff", border: "none", borderRadius: 6,
                  padding: "6px 12px", fontSize: 12, cursor: "pointer"
                }}
              >
                + Adicionar
              </button>
            </Box>
          </Box>
          <Box style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Typography style={{ fontSize: 13, color: "#475569" }}>Janela de busca retroativa (horas)</Typography>
            <TextField
              type="number"
              size="small"
              variant="outlined"
              value={cfg.lookbackHours ?? 12}
              onChange={(e) => setFollowUpConfig((p) => ({ ...p, lookbackHours: e.target.value }))}
              inputProps={{ min: 1, style: { width: 60, textAlign: "right" } }}
              style={{ width: 80 }}
            />
          </Box>
        </Box>

        {/* ── Botões salvar / processar ─────────────────────────────── */}
        <Box style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleSaveFollowUpConfig}
            disabled={followUpConfigSaving || followUpConfigLoading}
            style={{
              background: "#1e293b", color: "#fff", border: "none", borderRadius: 8,
              padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer"
            }}
          >
            {followUpConfigSaving ? "Salvando…" : "Salvar configuração"}
          </button>
          <button
            type="button"
            onClick={handleProcessAiFollowUps}
            disabled={followUpProcessing}
            style={{
              background: "#2563eb", color: "#fff", border: "none", borderRadius: 8,
              padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            <PlayArrowIcon style={{ fontSize: 18 }} />
            {followUpProcessing ? "Processando…" : "Processar follow-ups agora"}
          </button>
        </Box>

        {/* ── Logs de Follow-up ─────────────────────────────────────── */}
        <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <Box style={{
            padding: "16px 20px", borderBottom: "1px solid #f1f5f9",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <Box>
              <Typography style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Logs de Follow-up</Typography>
              <Typography style={{ fontSize: 12, color: "#94a3b8" }}>{followUpLogs.length} registro(s)</Typography>
            </Box>
            <button
              type="button"
              onClick={loadFollowUpLogs}
              disabled={followUpLogsLoading}
              style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", color: "#64748b" }}
            >
              {followUpLogsLoading ? "Carregando…" : "Atualizar"}
            </button>
          </Box>
          {followUpLogs.length === 0 ? (
            <Box style={{ textAlign: "center", padding: "32px 16px", color: "#94a3b8" }}>
              <Typography style={{ fontSize: 13 }}>Nenhum log registrado ainda.</Typography>
            </Box>
          ) : followUpLogs.map((log) => {
            const statusMap = {
              sent: { label: "Enviado", bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
              pending: { label: "Pendente", bg: "#fef9c3", color: "#854d0e", border: "#fde68a" },
              processing: { label: "Processando", bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
              skipped: { label: "Ignorado", bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" },
              failed: { label: "Falha", bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
            };
            const s = statusMap[log.status] || statusMap.pending;
            return (
              <Box key={log.id} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto",
                padding: "12px 20px", borderBottom: "1px solid #f8fafc", alignItems: "center", gap: 8
              }}>
                <Box>
                  <Typography style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                    {log.sessionId ? `Sessão ${log.sessionId.slice(0, 12)}…` : log.contactId ? `Contato #${log.contactId}` : `Log #${log.id}`}
                  </Typography>
                  <Typography style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    {log.detectedIntent || log.reason || "—"}
                  </Typography>
                  {log.generatedMessage && (
                    <Typography style={{ fontSize: 11, color: "#475569", marginTop: 2, fontStyle: "italic" }}>
                      "{log.generatedMessage.slice(0, 80)}…"
                    </Typography>
                  )}
                </Box>
                <Box style={{
                  display: "inline-flex", alignItems: "center", padding: "2px 10px",
                  borderRadius: 99, fontSize: 11, fontWeight: 600,
                  background: s.bg, color: s.color, border: `1px solid ${s.border}`, width: "fit-content"
                }}>
                  {s.label}
                </Box>
                <Typography style={{ fontSize: 11, color: "#94a3b8" }}>
                  {formatDateTime(log.sentAt || log.createdAt)}
                </Typography>
                {(log.status === "failed" || log.status === "skipped") && (
                  <button
                    type="button"
                    onClick={() => handleRetryLog(log.id)}
                    disabled={followUpRetrying === log.id}
                    style={{
                      background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6,
                      padding: "4px 10px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap"
                    }}
                  >
                    {followUpRetrying === log.id ? "…" : "Reenviar"}
                  </button>
                )}
              </Box>
            );
          })}
        </Box>

        {/* ── Leads em Follow-up (CRM legacy) ─────────────────────── */}
        {aiFollowUps.length > 0 && (
          <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <Box style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <Typography style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Leads CRM em Follow-up</Typography>
              <Typography style={{ fontSize: 12, color: "#94a3b8" }}>{aiFollowUps.length} registro(s)</Typography>
            </Box>
            {aiFollowUps.map((lead) => {
              const isSent = lead.status === "follow_up_enviado" || lead.leadStatus === "follow_up_enviado";
              return (
                <Box key={lead.id} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr",
                  padding: "12px 20px", borderBottom: "1px solid #f8fafc", alignItems: "center"
                }}>
                  <Box>
                    <Typography style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                      {lead.name || `Lead ${lead.id}`}
                    </Typography>
                    <Typography style={{ fontSize: 12, color: "#94a3b8" }}>{lead.phone || "Sem telefone"}</Typography>
                  </Box>
                  <Box style={{
                    display: "inline-flex", alignItems: "center", padding: "2px 10px",
                    borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: isSent ? "#dcfce7" : "#fef9c3",
                    color: isSent ? "#166534" : "#854d0e",
                    border: `1px solid ${isSent ? "#bbf7d0" : "#fde68a"}`,
                  }}>
                    {isSent ? "Enviado" : "Aguardando"}
                  </Box>
                  <Typography style={{ fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
                    {formatDateTime(lead.updatedAt)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

  const renderRag = () => (
    <Box className={classes.placeholderGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Base RAG</Typography>
        <Typography className={classes.panelSubtitle}>
          Envie, consulte e exclua informacoes da base vetorial por empresa.
        </Typography>
        <Box className={classes.fieldStack}>
          <TextField select SelectProps={{ native: true }} label="Base" variant="outlined" size="small" value={ragBase} onChange={(e) => { setRagBase(e.target.value); setRagResults([]); loadRagDocuments(e.target.value); }}>
            <option value="empresa">Empresa</option>
            <option value="produtos">Produtos / Servicos</option>
            <option value="suporte">Suporte / FAQ</option>
            <option value="comercial">Comercial / Vendas</option>
          </TextField>
          <TextField label="Conteudo" variant="outlined" multiline minRows={7} value={ragContent} onChange={(e) => setRagContent(e.target.value)} />
          <Button variant="outlined" component="label">
            {ragFile ? ragFile.name : "Anexar PDF, imagem ou documento"}
            <input
              type="file"
              hidden
              accept=".pdf,.txt,.csv,.json,.md,image/*"
              onChange={(event) => setRagFile(event.target.files?.[0] || null)}
            />
          </Button>
        </Box>
        <Box className={classes.actionRow}>
          <Button variant="contained" color="primary" disabled={externalSaving || (!ragContent.trim() && !ragFile)} onClick={handleCreateRagDocument}>
            Enviar para RAG
          </Button>
        </Box>
        <Divider style={{ margin: "16px 0" }} />
        <Box className={classes.fieldStack}>
          <TextField label="Consultar RAG" variant="outlined" size="small" value={ragQuery} onChange={(e) => setRagQuery(e.target.value)} />
        </Box>
        <Box className={classes.actionRow}>
          <Button variant="outlined" color="primary" disabled={externalSaving || !ragQuery.trim()} onClick={handleSearchRag}>
            Consultar
          </Button>
        </Box>
        {ragResults.length > 0 && (
          <Box className={classes.placeholderList}>
            {ragResults.map((result) => (
              <Box key={`result-${result.id}`} className={classes.placeholderRow}>
                <Typography className={classes.versionPreview}>{result.content}</Typography>
                <span className={classes.mutedPill}>{Number(result.similarity || 0).toFixed(2)}</span>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Documentos</Typography>
        <Typography className={classes.panelSubtitle}>{ragDocuments.length} documento(s) em {ragBase}.</Typography>
        <Box className={classes.placeholderList}>
          {ragDocuments.length === 0 ? (
            <Typography className={classes.toolsEmpty}>Nenhum documento nesta base.</Typography>
          ) : ragDocuments.map((doc) => (
            <Box key={doc.id} className={classes.placeholderRow}>
              <Typography className={classes.versionPreview}>{(doc.content || "").slice(0, 130)}</Typography>
              <Button size="small" color="secondary" onClick={() => handleDeleteRagDocument(doc.id)}>Excluir</Button>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );

  const renderWebhooks = () => (
    <Box className={classes.placeholderGrid}>
      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>
          {editingWebhookId ? "Editar Webhook" : "Novo Webhook"}
        </Typography>
        <Typography className={classes.panelSubtitle}>
          Cada evento pode ter sua propria URL de destino. O sistema dispara o evento apenas para o webhook configurado para aquele tipo.
        </Typography>
        <Box className={classes.fieldStack}>
          <TextField
            label="Nome do webhook"
            variant="outlined"
            size="small"
            value={webhookForm.name}
            onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
            placeholder="Ex: Agendamento para n8n producao"
          />
          <TextField
            select
            label="Tipo de evento"
            variant="outlined"
            size="small"
            value={webhookForm.eventType}
            onChange={(e) => setWebhookForm({ ...webhookForm, eventType: e.target.value })}
            SelectProps={{ native: false }}
          >
            <MenuItem value="">Selecionar evento</MenuItem>
            {WEBHOOK_EVENT_TYPES.map((et) => (
              <MenuItem key={et.value} value={et.value}>
                {et.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="URL de destino"
            variant="outlined"
            size="small"
            value={webhookForm.url}
            onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
            placeholder="https://n8n.seudominio.com/webhook/..."
          />
        </Box>
        <Box className={classes.actionRow}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={externalSaving || !webhookForm.name.trim() || !webhookForm.url.trim() || !webhookForm.eventType}
            onClick={handleSaveWebhook}
          >
            {editingWebhookId ? "Salvar alteracoes" : "Cadastrar webhook"}
          </Button>
          {editingWebhookId && (
            <Button variant="outlined" disabled={externalSaving} onClick={handleCancelEditWebhook}>
              Cancelar
            </Button>
          )}
        </Box>
      </Box>

      <Box className={classes.externalPanel}>
        <Typography className={classes.panelTitle}>Webhooks cadastrados</Typography>
        <Typography className={classes.panelSubtitle}>
          {aiWebhooks.length} webhook(s). Clique no toggle para ativar ou desativar.
        </Typography>
        <Box className={classes.placeholderList}>
          {aiWebhooks.length === 0 ? (
            <Typography className={classes.toolsEmpty}>Nenhum webhook cadastrado ainda.</Typography>
          ) : (
            aiWebhooks.map((webhook) => {
              const eventLabel = WEBHOOK_EVENT_TYPES.find((et) => et.value === webhook.eventType)?.label || webhook.eventType;
              return (
                <Box key={webhook.id} className={classes.placeholderRow}>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Typography className={classes.versionTitle}>{webhook.name}</Typography>
                    <Typography className={classes.versionMeta} style={{ wordBreak: "break-all" }}>
                      {eventLabel}
                    </Typography>
                    <Typography className={classes.versionMeta} style={{ wordBreak: "break-all", fontSize: "0.72rem", color: "#9ca3af" }}>
                      {webhook.url}
                    </Typography>
                  </Box>
                  <Box className={classes.inlineActions} style={{ flexShrink: 0 }}>
                    <Switch
                      size="small"
                      color="primary"
                      checked={Boolean(webhook.isActive)}
                      disabled={externalSaving}
                      onChange={() => handleToggleWebhook(webhook.id)}
                    />
                    <Tooltip title="Editar webhook">
                      <IconButton
                        size="small"
                        disabled={externalSaving}
                        onClick={() => handleEditWebhook(webhook)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir webhook">
                      <IconButton
                        size="small"
                        color="secondary"
                        disabled={externalSaving}
                        onClick={() => handleDeleteWebhook(webhook.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );

  const renderChatMemory = () => {
    const totalPages = Math.max(Math.ceil(chatMemoryTotal / 25), 1);
    const canDeleteAll = chatMemoryDangerText === "EXCLUIR MEMORIA";
    const canManageChatMemory = ["admin", "super"].includes(user?.profile);

    return (
      <Box className={classes.chatMemoryGrid}>
        <Box className={classes.externalPanel}>
          <Typography className={classes.panelTitle}>Chat Memory</Typography>
          <Typography className={classes.panelSubtitle}>
            Consulte e gerencie a memoria de conversa salva pelo N8N somente da empresa logada.
          </Typography>

          <Box className={classes.chatMemoryFilters}>
            <TextField
              label="Buscar por key, session, texto ou ID"
              variant="outlined"
              size="small"
              value={chatMemoryFilters.search}
              onChange={(event) => handleChatMemoryFilterChange("search", event.target.value)}
            />
            <TextField
              select
              label="Periodo"
              variant="outlined"
              size="small"
              value={chatMemoryFilters.range}
              onChange={(event) => handleChatMemoryFilterChange("range", event.target.value)}
            >
              <MenuItem value="recent">Ultimas conversas</MenuItem>
              <MenuItem value="24h">Ultimas 24 horas</MenuItem>
              <MenuItem value="7d">Ultimos 7 dias</MenuItem>
              <MenuItem value="all">Todos da empresa</MenuItem>
            </TextField>
            <TextField
              label="Lead ID"
              variant="outlined"
              size="small"
              value={chatMemoryFilters.leadId}
              onChange={(event) => handleChatMemoryFilterChange("leadId", event.target.value)}
            />
            <TextField
              label="Session ID"
              variant="outlined"
              size="small"
              value={chatMemoryFilters.sessionId}
              onChange={(event) => handleChatMemoryFilterChange("sessionId", event.target.value)}
            />
          </Box>

          <Box className={classes.actionRow} style={{ justifyContent: "space-between", marginTop: 0, marginBottom: 12 }}>
            <Typography className={classes.versionMeta}>
              {chatMemoryTotal} registro(s) encontrado(s). Pagina {chatMemoryPage} de {totalPages}.
            </Typography>
            <Box className={classes.inlineActions}>
              <Button size="small" variant="outlined" onClick={handleClearChatMemoryFilters} disabled={chatMemoryLoading}>
                Limpar
              </Button>
              <Button size="small" variant="outlined" onClick={() => loadChatMemory(chatMemoryPage)} disabled={chatMemoryLoading}>
                Atualizar
              </Button>
              <Button size="small" variant="contained" color="primary" onClick={handleSearchChatMemory} disabled={chatMemoryLoading}>
                Buscar
              </Button>
            </Box>
          </Box>

          {chatMemoryLoading ? (
            <Box className={classes.loadingContainer}>
              <CircularProgress size={28} />
            </Box>
          ) : chatMemories.length === 0 ? (
            <Typography className={classes.toolsEmpty}>Nenhuma memoria encontrada para esta empresa.</Typography>
          ) : (
            chatMemories.map((memory) => {
              const leadId = memory.parsed?.leadId;
              const sessionId = memory.parsed?.sessionId;
              const key = memory.sessionId || memory.key || "";
              return (
                <Box key={memory.id} className={classes.chatMemoryRow}>
                  <Box className={classes.chatMemoryHeader}>
                    <Box style={{ minWidth: 0 }}>
                      <Typography className={classes.versionTitle}>
                        Lead {leadId || "-"} {memory.leadName ? `- ${memory.leadName}` : ""}
                      </Typography>
                      <Typography className={classes.versionMeta} style={{ wordBreak: "break-all" }}>
                        Session: {sessionId || "-"}
                      </Typography>
                      <Typography className={classes.versionMeta}>
                        {memory.leadPhone ? `Telefone: ${memory.leadPhone} - ` : ""}
                        {memory.updatedAt || memory.createdAt ? formatDateTime(memory.updatedAt || memory.createdAt) : "Sem data na tabela"}
                      </Typography>
                    </Box>
                    <Box className={classes.inlineActions} style={{ flexShrink: 0 }}>
                      <Tooltip title="Ver detalhes">
                        <IconButton size="small" onClick={() => handleShowChatMemory(memory.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Copiar Session ID">
                        <IconButton size="small" onClick={() => copyToClipboard(sessionId || key, "Session ID")}>
                          <FileCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir este registro">
                        <IconButton
                          size="small"
                          color="secondary"
                          disabled={!canManageChatMemory}
                          onClick={() => requestDeleteChatMemory("record", { id: memory.id, leadId, sessionId })}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography className={classes.chatMemoryPreview}>
                    {memory.preview || "Sem previa disponivel."}
                  </Typography>
                  <Box className={classes.itemDetails} style={{ marginTop: 8 }}>
                    <span>ID: {memory.id}</span>
                    <span>Interacoes: {memory.messageCount || 0}</span>
                    <span>Origem: {memory.source}</span>
                  </Box>
                  {canManageChatMemory && (
                    <Box className={classes.inlineActions} style={{ marginTop: 8 }}>
                      {leadId && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          onClick={() => requestDeleteChatMemory("lead", { leadId, sessionId })}
                        >
                          Excluir lead
                        </Button>
                      )}
                      {sessionId && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          onClick={() => requestDeleteChatMemory("session", { leadId, sessionId })}
                        >
                          Excluir sessao
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })
          )}

          <Box className={classes.actionRow}>
            <Button
              size="small"
              variant="outlined"
              disabled={chatMemoryPage <= 1 || chatMemoryLoading}
              onClick={() => loadChatMemory(chatMemoryPage - 1)}
            >
              Anterior
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={chatMemoryPage >= totalPages || chatMemoryLoading}
              onClick={() => loadChatMemory(chatMemoryPage + 1)}
            >
              Proxima
            </Button>
          </Box>
        </Box>

        <Box className={`${classes.externalPanel} ${classes.dangerPanel}`}>
          <Typography className={classes.dangerTitle}>
            <WarningIcon fontSize="small" />
            Zona de risco
          </Typography>
          <Typography className={classes.panelSubtitle}>
            Exclui somente os registros de Chat Memory da empresa logada. O backend valida o companyId pela sessao.
            {!canManageChatMemory ? " Apenas administradores podem executar exclusoes." : ""}
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<DeleteSweepIcon />}
            disabled={!canManageChatMemory}
            onClick={() => setChatMemoryDangerOpen(true)}
          >
            Excluir toda memoria da empresa
          </Button>
        </Box>

        <Dialog open={Boolean(chatMemoryDetail)} onClose={() => setChatMemoryDetail(null)} fullWidth maxWidth="md">
          <DialogTitle>Detalhes do Chat Memory</DialogTitle>
          <DialogContent dividers>
            {chatMemoryDetail && (
              <>
                <Box className={classes.itemDetails} style={{ marginBottom: 12 }}>
                  <span>ID: {chatMemoryDetail.id}</span>
                  <span>Company ID: {chatMemoryDetail.parsed?.companyId || companyId}</span>
                  <span>Lead ID: {chatMemoryDetail.parsed?.leadId || "-"}</span>
                  <span>Session ID: {chatMemoryDetail.parsed?.sessionId || "-"}</span>
                </Box>
                <Typography className={classes.versionMeta} style={{ wordBreak: "break-all", marginBottom: 12 }}>
                  Key: {chatMemoryDetail.sessionId || chatMemoryDetail.key || "-"}
                </Typography>
                <Typography className={classes.chatMemoryPreview}>
                  {chatMemoryDetail.preview || "Sem previa disponivel."}
                </Typography>
                <Box className={classes.rawJsonBox}>
                  {JSON.stringify(chatMemoryDetail.message ?? chatMemoryDetail, null, 2)}
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => copyToClipboard(JSON.stringify(chatMemoryDetail?.message ?? {}, null, 2), "Conteudo")}>
              Copiar conteudo
            </Button>
            <Button color="primary" variant="contained" onClick={() => setChatMemoryDetail(null)}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={Boolean(chatMemoryDeleteTarget)} onClose={() => setChatMemoryDeleteTarget(null)} fullWidth maxWidth="sm">
          <DialogTitle>Excluir Chat Memory?</DialogTitle>
          <DialogContent dividers>
            <Typography>
              Tem certeza que deseja excluir esta memoria? Essa acao nao podera ser desfeita.
            </Typography>
            {chatMemoryDeleteTarget && (
              <Typography className={classes.versionMeta} style={{ marginTop: 8 }}>
                Escopo: {chatMemoryDeleteTarget.type === "record" ? "registro" : chatMemoryDeleteTarget.type}
                {" | "}
                Lead: {chatMemoryDeleteTarget.leadId || "-"} | Session: {chatMemoryDeleteTarget.sessionId || "-"}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChatMemoryDeleteTarget(null)}>Cancelar</Button>
            <Button color="secondary" variant="contained" disabled={externalSaving} onClick={handleDeleteChatMemory}>
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={chatMemoryDangerOpen} onClose={() => setChatMemoryDangerOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Excluir toda memoria da empresa</DialogTitle>
          <DialogContent dividers>
            <Typography>
              Esta acao remove todos os registros de Chat Memory vinculados a empresa atual.
              Digite <strong>EXCLUIR MEMORIA</strong> para confirmar.
            </Typography>
            <Typography className={classes.versionMeta} style={{ marginTop: 8 }}>
              Registros estimados na busca atual: {chatMemoryTotal}
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              label="Confirmacao"
              value={chatMemoryDangerText}
              onChange={(event) => setChatMemoryDangerText(event.target.value)}
              style={{ marginTop: 16 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChatMemoryDangerOpen(false)}>Cancelar</Button>
            <Button color="secondary" variant="contained" disabled={!canDeleteAll || externalSaving} onClick={handleDeleteCompanyChatMemory}>
              Excluir memoria da empresa
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  const renderAiSettings = () => {
    const s = aiSettings;

    const SettingRow = ({ label, value, id, extra, status }) => {
      const displayValue = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
      const isToken = label === "Token do sistema";
      const shown = isToken ? aiSettingsTokenVisible : true;
      return (
        <Box style={{
          display: "grid", gridTemplateColumns: "200px 1fr auto auto",
          alignItems: "center", gap: 12, padding: "14px 20px",
          borderBottom: "1px solid #f1f5f9",
        }}>
          <Typography style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{label}</Typography>
          <Box>
            <Typography style={{ fontSize: 13, fontFamily: isToken ? "monospace" : "inherit", color: "#1e293b", wordBreak: "break-all" }}>
              {aiSettingsLoading ? "…" : (shown ? (displayValue || "—") : "••••••••••••••••••••••••••••••••")}
            </Typography>
            {extra && <Typography style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{extra}</Typography>}
          </Box>
          <Chip
            size="small"
            label={status || (value != null ? "OK" : "Ausente")}
            style={{
              fontSize: 10,
              background: value != null ? "#dcfce7" : "#fef2f2",
              color: value != null ? "#16a34a" : "#dc2626",
            }}
          />
          <Box style={{ display: "flex", gap: 4 }}>
            {isToken && (
              <Tooltip title={aiSettingsTokenVisible ? "Ocultar" : "Visualizar"}>
                <IconButton size="small" onClick={() => setAiSettingsTokenVisible(v => !v)}>
                  <VisibilityIcon style={{ fontSize: 16, color: "#64748b" }} />
                </IconButton>
              </Tooltip>
            )}
            {value != null && (
              <Tooltip title="Copiar">
                <IconButton size="small" onClick={() => handleCopyAiSetting(displayValue)}>
                  <FileCopyIcon style={{ fontSize: 16, color: "#64748b" }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      );
    };

    return (
      <Box style={{ padding: "24px" }}>
        <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Box>
            <Typography style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>Informações da IA Externa</Typography>
            <Typography style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
              Dados operacionais enviados automaticamente nos eventos de webhook (MESSAGE_RECEIVED / MESSAGE_SENT).
            </Typography>
          </Box>
          <button
            type="button"
            onClick={() => loadAiSettings(true)}
            disabled={aiSettingsLoading}
            style={{
              background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8,
              padding: "8px 16px", cursor: "pointer", fontSize: 13, color: "#334155",
            }}
          >
            {aiSettingsLoading ? "Carregando…" : "Atualizar / Garantir"}
          </button>
        </Box>

        {aiSettingsLoading && !s ? (
          <Box style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <Box style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <Box style={{ display: "grid", gridTemplateColumns: "200px 1fr auto auto" }}>
                {["Campo", "Valor / ID", "Status", ""].map(h => (
                  <Typography key={h} style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</Typography>
                ))}
              </Box>
            </Box>

            <SettingRow label="Nome da IA" value={s?.ai_name} />
            <SettingRow label="Token do sistema" value={s?.system_token} />
            <SettingRow
              label="Usuário padrão"
              value={s?.default_user ? s.default_user.name : null}
              extra={s?.default_user ? `ID: ${s.default_user.id}` : null}
            />
            <SettingRow
              label="Departamento / Fila"
              value={s?.default_queue ? s.default_queue.name : null}
              extra={s?.default_queue ? `queueId: ${s.default_queue.id}` : null}
            />
            <SettingRow
              label="Funil padrão"
              value={s?.default_pipeline ? s.default_pipeline.name : null}
              extra={s?.default_pipeline ? `pipeline_id: ${s.default_pipeline.id}` : null}
            />
            <SettingRow
              label="Etapa padrão"
              value={s?.default_stage ? s.default_stage.name : null}
              extra={s?.default_stage ? `stage_id: ${s.default_stage.id}` : null}
            />
            <SettingRow
              label="Agenda padrão"
              value={s?.default_calendar ? s.default_calendar.name : null}
              extra={s?.default_calendar ? `agenda_id: ${s.default_calendar.id}` : null}
            />
            <SettingRow
              label="Etapa Agendamento"
              value={s?.appointment_stage ? s.appointment_stage.stage_name : null}
              extra={s?.appointment_stage
                ? `pipeline_id: ${s.appointment_stage.pipeline_id} — stage_id: ${s.appointment_stage.stage_id}`
                : null}
            />
          </Box>
        )}

        {s && (
          <Box style={{ marginTop: 20, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px" }}>
            <Typography style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
              Etapas personalizadas para IA externa
            </Typography>
            <Typography style={{ fontSize: 13, color: "#64748b", marginTop: 4, marginBottom: 16 }}>
              Selecione até 5 etapas que serão enviadas no payload dos webhooks (custom_stages) para uso em ferramentas externas, como n8n ou Make.
            </Typography>

            {[0, 1, 2, 3, 4].map((i) => {
              const draftVal = aiCustomStagesDraft[i] ?? "";
              const valueInOptions = aiPipelineStageOptions.some(
                (o) => String(o.stageId) === String(draftVal)
              );
              return (
                <Box key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <Typography style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{`Etapa ${i + 1}`}</Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={valueInOptions ? draftVal : ""}
                    onChange={(e) => {
                      const next = [...aiCustomStagesDraft];
                      next[i] = e.target.value === "" ? "" : Number(e.target.value);
                      setAiCustomStagesDraft(next);
                    }}
                    style={{ fontSize: 13 }}
                  >
                    <MenuItem value="">— Nenhuma —</MenuItem>
                    {aiPipelineStageOptions.map((o) => (
                      <MenuItem key={o.stageId} value={o.stageId}>{o.label}</MenuItem>
                    ))}
                  </TextField>
                </Box>
              );
            })}

            <Box style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Button
                variant="contained"
                color="primary"
                disabled={aiCustomStagesSaving}
                onClick={handleSaveCustomStages}
              >
                {aiCustomStagesSaving ? "Salvando…" : "Salvar etapas personalizadas"}
              </Button>
              <Button
                variant="outlined"
                disabled={aiCustomStagesSaving}
                onClick={handleClearCustomStages}
              >
                Limpar
              </Button>
            </Box>
          </Box>
        )}

        {s && (
          <Box style={{ marginTop: 20, background: "#f8fafc", borderRadius: 10, padding: "16px 20px", border: "1px solid #e2e8f0" }}>
            <Typography style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
              PREVIEW DO PAYLOAD (ai_external_settings)
            </Typography>
            <Typography component="pre" style={{
              fontSize: 11, fontFamily: "monospace", color: "#334155",
              whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0
            }}>
              {JSON.stringify({
                ai_name: s.ai_name,
                system_token: aiSettingsTokenVisible ? s.system_token : "••••••••••••••••••••••••",
                default_user_id: s.default_user?.id,
                default_user_name: s.default_user?.name,
                default_queue_id: s.default_queue?.id,
                default_queue_name: s.default_queue?.name,
                default_pipeline_id: s.default_pipeline?.id,
                default_pipeline_name: s.default_pipeline?.name,
                default_stage_id: s.default_stage?.id,
                default_stage_name: s.default_stage?.name,
                default_calendar_id: s.default_calendar?.id,
                default_calendar_name: s.default_calendar?.name,
                appointment_pipeline_id: s.appointment_stage?.pipeline_id,
                appointment_stage_id: s.appointment_stage?.stage_id,
                appointment_stage_name: s.appointment_stage?.stage_name,
                custom_stages: s.custom_stages,
              }, null, 2)}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const renderAiActions = () => {
    const blockModeLabel = {
      disabled_in_stage: "Etapa do funil",
      disabled_manual: "Desligado manual",
      manual: "Manual",
      manual_until: "Manual com prazo",
      pause_until: "Por tempo",
    };
    const blockModeColor = {
      disabled_in_stage: "#f59e0b",
      disabled_manual: "#ef4444",
      manual: "#ef4444",
      manual_until: "#8b5cf6",
      pause_until: "#3b82f6",
    };

    const filtered = aiBlockedContacts.filter((c) => {
      const q = aiActionsFilter.search.toLowerCase();
      const matchSearch = !q || c.contactName?.toLowerCase().includes(q) || c.contactNumber?.includes(q);
      const matchMode = !aiActionsFilter.blockMode || c.aiBlockMode === aiActionsFilter.blockMode;
      return matchSearch && matchMode;
    });

    const companyStatusColor = {
      active: "#22c55e",
      paused: "#f59e0b",
      disabled: "#ef4444",
    };
    const companyStatusLabel = {
      active: "Ativa",
      paused: "Pausada",
      disabled: "Desligada",
    };
    const csStatus = companyAiStatus?.status ?? "active";

    return (
      <Box style={{ padding: "24px" }}>
        {/* Controle Geral da IA da Empresa */}
        <Box style={{
          background: "#fff", borderRadius: 12,
          border: `1px solid ${(companyStatusColor[csStatus] ?? "#22c55e")}44`,
          padding: "20px 24px", marginBottom: 24,
        }}>
          <Box style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <Box style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Box style={{
                background: `${(companyStatusColor[csStatus] ?? "#22c55e")}18`,
                borderRadius: 10, padding: 10, display: "flex",
              }}>
                {csStatus === "active"
                  ? <CheckCircleOutlineIcon style={{ color: "#22c55e", fontSize: 26 }} />
                  : csStatus === "paused"
                  ? <PauseIcon style={{ color: "#f59e0b", fontSize: 26 }} />
                  : <BlockIcon style={{ color: "#ef4444", fontSize: 26 }} />}
              </Box>
              <Box>
                <Typography style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                  Controle Geral da IA da Empresa
                </Typography>
                {companyAiLoading ? (
                  <Typography style={{ fontSize: 12, color: "#94a3b8" }}>Carregando…</Typography>
                ) : (
                  <Box style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <Box style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: companyStatusColor[csStatus] ?? "#22c55e",
                    }} />
                    <Typography style={{ fontSize: 13, color: companyStatusColor[csStatus] ?? "#22c55e", fontWeight: 600 }}>
                      {companyStatusLabel[csStatus] ?? "Ativa"}
                    </Typography>
                    {csStatus === "paused" && companyAiStatus?.pausedUntil && (
                      <Typography style={{ fontSize: 12, color: "#94a3b8" }}>
                        até {new Date(companyAiStatus.pausedUntil).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </Typography>
                    )}
                    {(csStatus === "paused" || csStatus === "disabled") && companyAiStatus?.reason && (
                      <Typography style={{ fontSize: 12, color: "#94a3b8" }}>
                        — {companyAiStatus.reason}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
            <Box style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {csStatus !== "paused" && csStatus !== "disabled" && (
                <button
                  type="button"
                  onClick={() => { setCompanyPauseMinutes(30); setCompanyPauseReason(""); setCompanyPauseDialog(true); }}
                  disabled={companyAiLoading || companyAiSaving}
                  style={{
                    background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8,
                    padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    color: "#92400e", display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <PauseIcon style={{ fontSize: 16 }} /> Pausar IA Geral
                </button>
              )}
              {csStatus !== "disabled" && (
                <button
                  type="button"
                  onClick={() => { setCompanyDisableReason(""); setCompanyDisableDialog(true); }}
                  disabled={companyAiLoading || companyAiSaving}
                  style={{
                    background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8,
                    padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    color: "#991b1b", display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <BlockIcon style={{ fontSize: 16 }} /> Desligar IA Geral
                </button>
              )}
              {(csStatus === "paused" || csStatus === "disabled") && (
                <button
                  type="button"
                  onClick={handleCompanyResume}
                  disabled={companyAiLoading || companyAiSaving}
                  style={{
                    background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8,
                    padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    color: "#166534", display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <PlayArrowIcon style={{ fontSize: 16 }} /> Reativar IA Geral
                </button>
              )}
              <button
                type="button"
                onClick={loadCompanyAiStatus}
                disabled={companyAiLoading}
                style={{
                  background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#475569",
                }}
              >
                {companyAiLoading ? "…" : "↻"}
              </button>
            </Box>
          </Box>
        </Box>

        {/* Dialog — Pausar IA Geral */}
        <Dialog open={companyPauseDialog} onClose={() => setCompanyPauseDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Pausar IA Geral</DialogTitle>
          <DialogContent>
            <Typography style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Nenhuma mensagem recebida será processada pela IA enquanto estiver pausada. A pausa é desfeita automaticamente ao final do prazo.
            </Typography>
            <TextField
              select
              label="Duração da pausa"
              fullWidth
              variant="outlined"
              size="small"
              value={companyPauseMinutes}
              onChange={(e) => setCompanyPauseMinutes(Number(e.target.value))}
              style={{ marginBottom: 14 }}
            >
              <MenuItem value={15}>15 minutos</MenuItem>
              <MenuItem value={30}>30 minutos</MenuItem>
              <MenuItem value={60}>1 hora</MenuItem>
              <MenuItem value={120}>2 horas</MenuItem>
              <MenuItem value={480}>8 horas</MenuItem>
              <MenuItem value={1440}>24 horas</MenuItem>
            </TextField>
            <TextField
              label="Motivo (opcional)"
              fullWidth
              variant="outlined"
              size="small"
              value={companyPauseReason}
              onChange={(e) => setCompanyPauseReason(e.target.value)}
              placeholder="Ex: manutenção, feriado..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompanyPauseDialog(false)} disabled={companyAiSaving}>Cancelar</Button>
            <Button onClick={handleCompanyPause} variant="contained" color="primary" disabled={companyAiSaving}>
              {companyAiSaving ? "Salvando…" : "Confirmar pausa"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog — Desligar IA Geral */}
        <Dialog open={companyDisableDialog} onClose={() => setCompanyDisableDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Desligar IA Geral</DialogTitle>
          <DialogContent>
            <Typography style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              A IA ficará completamente desligada para toda a empresa até ser reativada manualmente. Use "Reativar IA Geral" para retomar.
            </Typography>
            <TextField
              label="Motivo (opcional)"
              fullWidth
              variant="outlined"
              size="small"
              value={companyDisableReason}
              onChange={(e) => setCompanyDisableReason(e.target.value)}
              placeholder="Ex: sem créditos, instabilidade..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompanyDisableDialog(false)} disabled={companyAiSaving}>Cancelar</Button>
            <Button onClick={handleCompanyDisable} variant="contained" style={{ background: "#ef4444", color: "#fff" }} disabled={companyAiSaving}>
              {companyAiSaving ? "Desligando…" : "Confirmar desligamento"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Summary cards */}
        <Box style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          {[
            { label: "IA bloqueada", value: aiActionsStatus?.totalBlocked ?? "—", color: "#ef4444", icon: <BlockIcon style={{ fontSize: 20 }} /> },
            { label: "Por etapa", value: aiActionsStatus?.byMode?.disabled_in_stage ?? "—", color: "#f59e0b", icon: <PauseIcon style={{ fontSize: 20 }} /> },
            { label: "Manual", value: (aiActionsStatus?.byMode?.manual ?? 0) + (aiActionsStatus?.byMode?.manual_until ?? 0), color: "#8b5cf6", icon: <BlockIcon style={{ fontSize: 20 }} /> },
            { label: "Por tempo", value: aiActionsStatus?.byMode?.pause_until ?? "—", color: "#3b82f6", icon: <TimerIcon style={{ fontSize: 20 }} /> },
          ].map((card) => (
            <Box key={card.label} style={{
              flex: "1 1 150px", minWidth: 140, background: "#fff", borderRadius: 12,
              border: `1px solid ${card.color}22`, padding: "16px 20px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <Box style={{ color: card.color }}>{card.icon}</Box>
              <Box>
                <Typography style={{ fontSize: 22, fontWeight: 700, color: card.color, lineHeight: 1.2 }}>
                  {aiActionsLoading ? "…" : card.value}
                </Typography>
                <Typography style={{ fontSize: 12, color: "#888" }}>{card.label}</Typography>
              </Box>
            </Box>
          ))}
          <Box style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
            <button
              type="button"
              onClick={loadAiActions}
              disabled={aiActionsLoading}
              style={{
                background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8,
                padding: "8px 16px", cursor: "pointer", fontSize: 13, color: "#334155",
              }}
            >
              {aiActionsLoading ? "Carregando…" : "Atualizar"}
            </button>
          </Box>
        </Box>

        {/* Filters */}
        <Box style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <TextField
            size="small"
            variant="outlined"
            placeholder="Buscar contato..."
            value={aiActionsFilter.search}
            onChange={(e) => setAiActionsFilter((p) => ({ ...p, search: e.target.value }))}
            style={{ flex: 1, maxWidth: 280 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon style={{ fontSize: 18, color: "#999" }} /></InputAdornment>
            }}
          />
          <TextField
            select
            size="small"
            variant="outlined"
            value={aiActionsFilter.blockMode}
            onChange={(e) => setAiActionsFilter((p) => ({ ...p, blockMode: e.target.value }))}
            style={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos os modos</MenuItem>
            <MenuItem value="disabled_in_stage">Etapa do funil</MenuItem>
            <MenuItem value="manual">Manual</MenuItem>
            <MenuItem value="manual_until">Manual com prazo</MenuItem>
            <MenuItem value="pause_until">Por tempo</MenuItem>
          </TextField>
          <Typography style={{ fontSize: 13, color: "#888" }}>
            {filtered.length} contato{filtered.length !== 1 ? "s" : ""}
          </Typography>
        </Box>

        {/* Contacts table */}
        <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {/* Table header */}
          <Box style={{
            display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1.5fr 1fr",
            padding: "10px 16px", background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}>
            {["Contato", "Modo", "Etapa / Prazo", "Ticket", "Ações"].map((h) => (
              <Typography key={h} style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {h}
              </Typography>
            ))}
          </Box>

          {aiActionsLoading ? (
            <Box style={{ display: "flex", justifyContent: "center", padding: 40 }}>
              <CircularProgress size={28} />
            </Box>
          ) : filtered.length === 0 ? (
            <Box style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
              <BlockIcon style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }} />
              <Typography style={{ fontSize: 14 }}>Nenhum contato com IA bloqueada</Typography>
            </Box>
          ) : (
            filtered.map((c) => (
              <Box key={c.contactId} style={{
                display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1.5fr 1fr",
                padding: "12px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center",
              }}>
                <Box>
                  <Typography style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{c.contactName || "—"}</Typography>
                  <Typography style={{ fontSize: 12, color: "#94a3b8" }}>{c.contactNumber}</Typography>
                </Box>
                <Box>
                  <Chip
                    size="small"
                    label={blockModeLabel[c.aiBlockMode] || c.aiBlockMode}
                    style={{
                      background: (blockModeColor[c.aiBlockMode] || "#6b7280") + "22",
                      color: blockModeColor[c.aiBlockMode] || "#6b7280",
                      fontWeight: 600, fontSize: 11,
                    }}
                  />
                </Box>
                <Box>
                  {c.aiBlockMode === "disabled_in_stage" && c.stageName ? (
                    <Typography style={{ fontSize: 12, color: "#f59e0b" }}>{c.stageName}</Typography>
                  ) : c.aiBlockMode === "manual_until" && c.aiBlockedUntil ? (
                    <Typography style={{ fontSize: 12, color: "#8b5cf6" }}>
                      até {new Date(c.aiBlockedUntil).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </Typography>
                  ) : c.aiBlockMode === "pause_until" && c.aiBlockedUntil ? (
                    <Typography style={{ fontSize: 12, color: "#3b82f6" }}>
                      até {new Date(c.aiBlockedUntil).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </Typography>
                  ) : (
                    <Typography style={{ fontSize: 12, color: "#94a3b8" }}>—</Typography>
                  )}
                </Box>
                <Box>
                  {c.ticketId ? (
                    <Typography style={{ fontSize: 12, color: "#3b82f6" }}>
                      #{c.ticketId} <span style={{ color: "#94a3b8" }}>({c.ticketStatus})</span>
                    </Typography>
                  ) : (
                    <Typography style={{ fontSize: 12, color: "#94a3b8" }}>—</Typography>
                  )}
                </Box>
                <Box style={{ display: "flex", gap: 6 }}>
                  <Tooltip title="Reativar IA">
                    <IconButton size="small" onClick={() => handleAiResumeContact(c.contactId)}
                      style={{ color: "#22c55e", background: "#dcfce722" }}>
                      <PlayArrowIcon style={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Pausar manualmente">
                    <IconButton size="small" onClick={() => handleAiPauseContact(c.contactId)}
                      style={{ color: "#ef4444", background: "#fee2e222" }}>
                      <PauseIcon style={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Pausar por tempo">
                    <IconButton size="small"
                      onClick={() => { setPauseUntilDialog({ open: true, contactId: c.contactId, contactName: c.contactName }); setPauseUntilDate(""); }}
                      style={{ color: "#8b5cf6", background: "#ede9fe22" }}>
                      <TimerIcon style={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))
          )}
        </Box>

        {/* Pause until dialog */}
        <Dialog open={pauseUntilDialog.open} onClose={() => setPauseUntilDialog({ open: false, contactId: null, contactName: "" })}>
          <DialogTitle>Pausar IA por tempo — {pauseUntilDialog.contactName}</DialogTitle>
          <DialogContent>
            <Typography style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              A IA ficará pausada até a data/hora informada. Após esse prazo, será reativada automaticamente na próxima mensagem.
            </Typography>
            <TextField
              label="Reativar em"
              type="datetime-local"
              fullWidth
              variant="outlined"
              size="small"
              value={pauseUntilDate}
              onChange={(e) => setPauseUntilDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date(Date.now() + 60000).toISOString().slice(0, 16) }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPauseUntilDialog({ open: false, contactId: null, contactName: "" })}>Cancelar</Button>
            <Button onClick={handleAiPauseUntilConfirm} variant="contained" color="primary" disabled={!pauseUntilDate}>
              Confirmar pausa
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  const renderBusinessHours = () => {
    const bh = businessHoursForm;
    const timezoneOptions = [
      "America/Sao_Paulo", "America/Manaus", "America/Belem",
      "America/Fortaleza", "America/Recife", "America/Noronha",
      "America/Campo_Grande", "America/Porto_Velho", "America/Boa_Vista",
      "America/Rio_Branco", "America/Santarem",
    ];

    return (
      <Box style={{ padding: 24 }}>
        {/* Header card */}
        <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <Box style={{ background: "#eff6ff", borderRadius: 10, padding: 10, display: "flex" }}>
            <AccessTimeIcon style={{ color: "#2563eb", fontSize: 28 }} />
          </Box>
          <Box>
            <Typography style={{ fontSize: 17, fontWeight: 700, color: "#1e293b" }}>Horário de Expediente</Typography>
            <Typography style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
              Define quando sua equipe humana está disponível para atendimento
            </Typography>
          </Box>
        </Box>

        {/* Day cards */}
        <Box style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 12, marginBottom: 20 }}>
          {DAYS_CONFIG.map(({ key, label }) => {
            const day = bh.days[key] || { enabled: false, start: "", end: "" };
            return (
              <Box
                key={key}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  border: day.enabled ? "2px solid #22c55e" : "1px solid #e2e8f0",
                  padding: "16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  transition: "border-color 0.2s",
                }}
              >
                <Box style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography style={{ fontSize: 14, fontWeight: 700, color: day.enabled ? "#15803d" : "#94a3b8" }}>
                    {label}
                  </Typography>
                  <Switch
                    size="small"
                    checked={!!day.enabled}
                    onChange={(e) => handleBusinessHoursDayChange(key, "enabled", e.target.checked)}
                    color="primary"
                  />
                </Box>

                {day.enabled ? (
                  <>
                    <Box>
                      <Typography style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 3 }}>INÍCIO</Typography>
                      <TextField
                        type="time"
                        size="small"
                        variant="outlined"
                        fullWidth
                        value={day.start || ""}
                        onChange={(e) => handleBusinessHoursDayChange(key, "start", e.target.value)}
                        inputProps={{ style: { fontSize: 13, padding: "6px 8px" } }}
                        InputProps={{ style: { borderRadius: 6 } }}
                      />
                    </Box>
                    <Box>
                      <Typography style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 3 }}>FIM</Typography>
                      <TextField
                        type="time"
                        size="small"
                        variant="outlined"
                        fullWidth
                        value={day.end || ""}
                        onChange={(e) => handleBusinessHoursDayChange(key, "end", e.target.value)}
                        inputProps={{ style: { fontSize: 13, padding: "6px 8px" } }}
                        InputProps={{ style: { borderRadius: 6 } }}
                      />
                    </Box>
                  </>
                ) : (
                  <Typography style={{ fontSize: 13, color: "#cbd5e1", textAlign: "center", padding: "8px 0" }}>—</Typography>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Extra settings */}
        <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <Box>
            <Typography style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Fuso horário</Typography>
            <TextField
              select
              size="small"
              variant="outlined"
              value={bh.timezone || "America/Sao_Paulo"}
              onChange={(e) => setBusinessHoursForm(prev => ({ ...prev, timezone: e.target.value }))}
              style={{ minWidth: 260 }}
            >
              {timezoneOptions.map(tz => (
                <MenuItem key={tz} value={tz}>{tz}</MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <Typography style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              Mensagem fora do expediente
            </Typography>
            <TextField
              multiline
              rows={3}
              fullWidth
              variant="outlined"
              size="small"
              value={bh.outOfHoursMessage || ""}
              onChange={(e) => setBusinessHoursForm(prev => ({ ...prev, outOfHoursMessage: e.target.value }))}
              placeholder="Mensagem enviada quando o contato entrar fora do horário de atendimento..."
              inputProps={{ style: { fontSize: 13 } }}
            />
          </Box>

          <Box>
            <Typography style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              Mensagem dentro do expediente <Chip size="small" label="opcional" style={{ fontSize: 10, height: 18, marginLeft: 6, background: "#f1f5f9", color: "#64748b" }} />
            </Typography>
            <TextField
              multiline
              rows={2}
              fullWidth
              variant="outlined"
              size="small"
              value={bh.inHoursMessage || ""}
              onChange={(e) => setBusinessHoursForm(prev => ({ ...prev, inHoursMessage: e.target.value }))}
              placeholder="Mensagem de boas-vindas dentro do horário (opcional)..."
              inputProps={{ style: { fontSize: 13 } }}
            />
          </Box>
        </Box>

        {/* Lunch break */}
        <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 20 }}>
          <Typography style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>Pausa para Almoço</Typography>
          <Box style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!(bh.lunchBreak && bh.lunchBreak.enabled)}
                  onChange={(e) => setBusinessHoursForm(prev => ({
                    ...prev,
                    lunchBreak: { ...(prev.lunchBreak || { start: "12:00", end: "14:00" }), enabled: e.target.checked }
                  }))}
                  color="primary"
                  size="small"
                />
              }
              label={<Typography style={{ fontSize: 13, color: "#475569" }}>Ativar pausa</Typography>}
            />
            {bh.lunchBreak && bh.lunchBreak.enabled && (
              <>
                <Box>
                  <Typography style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 3 }}>INÍCIO</Typography>
                  <TextField
                    type="time"
                    size="small"
                    variant="outlined"
                    value={bh.lunchBreak.start || "12:00"}
                    onChange={(e) => setBusinessHoursForm(prev => ({
                      ...prev,
                      lunchBreak: { ...(prev.lunchBreak || { enabled: true, end: "14:00" }), start: e.target.value }
                    }))}
                    inputProps={{ style: { fontSize: 13, padding: "6px 8px" } }}
                    InputProps={{ style: { borderRadius: 6 } }}
                  />
                </Box>
                <Box>
                  <Typography style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 3 }}>FIM</Typography>
                  <TextField
                    type="time"
                    size="small"
                    variant="outlined"
                    value={bh.lunchBreak.end || "14:00"}
                    onChange={(e) => setBusinessHoursForm(prev => ({
                      ...prev,
                      lunchBreak: { ...(prev.lunchBreak || { enabled: true, start: "12:00" }), end: e.target.value }
                    }))}
                    inputProps={{ style: { fontSize: 13, padding: "6px 8px" } }}
                    InputProps={{ style: { borderRadius: 6 } }}
                  />
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* Calendar / Slots config */}
        <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 20 }}>
          <Typography style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>Configuração de Agenda</Typography>
          <Box style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <Box style={{ minWidth: 200 }}>
              <Typography style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Duração do slot</Typography>
              <TextField
                select
                size="small"
                variant="outlined"
                value={bh.slotDurationMinutes || 60}
                onChange={(e) => setBusinessHoursForm(prev => ({ ...prev, slotDurationMinutes: Number(e.target.value) }))}
                style={{ minWidth: 180 }}
              >
                <MenuItem value={30}>30 minutos</MenuItem>
                <MenuItem value={45}>45 minutos</MenuItem>
                <MenuItem value={60}>60 minutos</MenuItem>
                <MenuItem value={90}>90 minutos</MenuItem>
                <MenuItem value={120}>120 minutos</MenuItem>
              </TextField>
            </Box>
            <Box style={{ minWidth: 220 }}>
              <Typography style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Antecedência mínima</Typography>
              <TextField
                select
                size="small"
                variant="outlined"
                value={bh.minAdvanceHours ?? 0}
                onChange={(e) => setBusinessHoursForm(prev => ({ ...prev, minAdvanceHours: Number(e.target.value) }))}
                style={{ minWidth: 200 }}
              >
                <MenuItem value={0}>Sem antecedência</MenuItem>
                <MenuItem value={1}>1 hora</MenuItem>
                <MenuItem value={2}>2 horas</MenuItem>
                <MenuItem value={4}>4 horas</MenuItem>
                <MenuItem value={24}>24 horas</MenuItem>
              </TextField>
            </Box>
            <Box style={{ minWidth: 200 }}>
              <Typography style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Dias futuros disponíveis</Typography>
              <TextField
                select
                size="small"
                variant="outlined"
                value={bh.futureDaysLimit || 7}
                onChange={(e) => setBusinessHoursForm(prev => ({ ...prev, futureDaysLimit: Number(e.target.value) }))}
                style={{ minWidth: 180 }}
              >
                <MenuItem value={7}>7 dias</MenuItem>
                <MenuItem value={15}>15 dias</MenuItem>
                <MenuItem value={30}>30 dias</MenuItem>
                <MenuItem value={60}>60 dias</MenuItem>
              </TextField>
            </Box>
          </Box>
        </Box>

        {/* Actions */}
        <Box style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginBottom: 24 }}>
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={() => setBusinessHoursForm(DEFAULT_BUSINESS_HOURS)}
            disabled={businessHoursSaving}
          >
            Restaurar padrão
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveBusinessHours}
            disabled={businessHoursSaving}
          >
            {businessHoursSaving ? "Salvando…" : "Salvar Horário"}
          </Button>
        </Box>

        {/* Calendar API for Agent/N8N */}
        <Box style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 8 }}>
          <Box style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Box style={{ background: "#eff6ff", borderRadius: 8, padding: 8, display: "flex" }}>
              <LinkIcon style={{ color: "#2563eb", fontSize: 20 }} />
            </Box>
            <Box>
              <Typography style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>API de Calendário para Agente / N8N</Typography>
              <Typography style={{ fontSize: 12, color: "#64748b" }}>
                Use este endpoint para consultar horários disponíveis e compromissos via N8N ou qualquer automação.
              </Typography>
            </Box>
          </Box>

          {(() => {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
            const rawToken = aiSettings?.system_token || "";
            const maskedToken = rawToken.length > 6
              ? "••••••••••••••••••••••••••••••" + rawToken.slice(-6)
              : rawToken;
            const endpoint = `${backendUrl}/api/external/calendar/context?days=${bh.futureDaysLimit || 7}&include_slots=true&include_appointments=true`;
            const curlCmd = `curl -s "${endpoint}" \\\n  -H "Authorization: Bearer ${maskedToken}"`;

            const handleCopy = (text) => {
              navigator.clipboard.writeText(text).then(() => toast.success("Copiado!")).catch(() => toast.error("Falha ao copiar"));
            };

            const handleCopyEndpoint = () => handleCopy(`${backendUrl}/api/external/calendar/context?days=${bh.futureDaysLimit || 7}&include_slots=true&include_appointments=true`);
            const handleCopyCurl = () => handleCopy(`curl -s "${endpoint}" \\\n  -H "Authorization: Bearer ${rawToken}"`);

            const handleTestCalendar = async () => {
              if (!rawToken) {
                toast.error("Token do sistema não encontrado. Vá em Informações da IA para garantir o token.");
                return;
              }
              setCalendarApiTestLoading(true);
              setCalendarApiTestResult(null);
              try {
                const { data } = await api.get(`/api/external/calendar/context?days=${bh.futureDaysLimit || 7}&include_slots=true&include_appointments=true`, {
                  headers: { Authorization: `Bearer ${rawToken}` },
                  baseURL: backendUrl,
                });
                setCalendarApiTestResult({ ok: true, data });
              } catch (err) {
                setCalendarApiTestResult({ ok: false, error: err?.response?.data || err?.message || String(err) });
              } finally {
                setCalendarApiTestLoading(false);
              }
            };

            return (
              <Box>
                {/* Endpoint row */}
                <Box style={{ marginBottom: 12 }}>
                  <Typography style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    Endpoint
                  </Typography>
                  <Box style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Box style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px" }}>
                      <Typography style={{ fontSize: 12, fontFamily: "monospace", color: "#334155", wordBreak: "break-all" }}>
                        GET {endpoint}
                      </Typography>
                    </Box>
                    <Tooltip title="Copiar endpoint">
                      <IconButton size="small" onClick={handleCopyEndpoint}>
                        <FileCopyIcon style={{ fontSize: 16, color: "#64748b" }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Header row */}
                <Box style={{ marginBottom: 12 }}>
                  <Typography style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    Header de autenticação
                  </Typography>
                  <Box style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px" }}>
                    <Typography style={{ fontSize: 12, fontFamily: "monospace", color: "#334155" }}>
                      Authorization: Bearer {maskedToken || "(token não encontrado — vá em Informações da IA)"}
                    </Typography>
                  </Box>
                </Box>

                {/* cURL row */}
                <Box style={{ marginBottom: 16 }}>
                  <Typography style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    cURL
                  </Typography>
                  <Box style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Box style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px" }}>
                      <Typography component="pre" style={{ fontSize: 12, fontFamily: "monospace", color: "#334155", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                        {curlCmd}
                      </Typography>
                    </Box>
                    <Tooltip title="Copiar cURL">
                      <IconButton size="small" onClick={handleCopyCurl} style={{ marginTop: 4 }}>
                        <FileCopyIcon style={{ fontSize: 16, color: "#64748b" }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Test button */}
                <Box style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleTestCalendar}
                    disabled={calendarApiTestLoading || !rawToken}
                  >
                    {calendarApiTestLoading ? "Consultando…" : "Testar consulta"}
                  </Button>
                  {calendarApiTestResult && (
                    <Chip
                      size="small"
                      label={calendarApiTestResult.ok ? "Sucesso" : "Erro"}
                      style={{
                        background: calendarApiTestResult.ok ? "#dcfce7" : "#fef2f2",
                        color: calendarApiTestResult.ok ? "#16a34a" : "#dc2626",
                        fontSize: 11,
                      }}
                    />
                  )}
                </Box>

                {/* Test result */}
                {calendarApiTestResult && (
                  <Box style={{ marginTop: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", maxHeight: 320, overflowY: "auto" }}>
                    <Typography component="pre" style={{ fontSize: 11, fontFamily: "monospace", color: "#334155", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                      {JSON.stringify(calendarApiTestResult.data || calendarApiTestResult.error, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })()}
        </Box>
      </Box>
    );
  };

  const renderExternalSection = () => {
    if (externalSection === "dashboard") return renderExternalDashboard();
    if (externalSection === "prompt") return renderExternalPrompt();
    if (externalSection === "settings") return renderExternalSettings();
    if (externalSection === "business_hours") return renderBusinessHours();
    if (externalSection === "webhooks") return renderWebhooks();
    if (externalSection === "events") return renderExternalEvents();
    if (externalSection === "appointments") return renderAppointments();
    if (externalSection === "reminders") return renderReminders();
    if (externalSection === "followups") return renderFollowUps();
    if (externalSection === "rag") return renderRag();
    if (externalSection === "chatMemory") return renderChatMemory();
    if (externalSection === "ai_actions") return renderAiActions();
    if (externalSection === "ai_settings") return renderAiSettings();
    return null;
  };

  useEffect(() => {
    async function fetchData() {
      const planConfigs = await getPlanCompany(undefined, companyId);
      const aiEnabled =
        typeof planConfigs.plan.aiEnabled === "boolean"
          ? planConfigs.plan.aiEnabled
          : Boolean(planConfigs.plan.useOpenAi);
      const aiAgentEnabled =
        typeof planConfigs.plan.aiAgentEnabled === "boolean"
          ? planConfigs.plan.aiAgentEnabled
          : aiEnabled;
      if (!aiEnabled || !aiAgentEnabled) {
        toast.error("Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando.");
        setTimeout(() => {
          history.push(`/`)
        }, 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/prompt");
        dispatch({ type: "LOAD_PROMPTS", payload: data.prompts });

        setLoading(false);
      } catch (err) {
        toastError(err);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeAgentTab === "external" && !externalConfig && !externalLoading) {
      loadExternalAgent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgentTab]);

  const loadInternalTemplates = async () => {
    setInternalTemplatesLoading(true);
    try {
      const { data } = await api.get("/ai-agent-templates");
      setInternalTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err);
    } finally {
      setInternalTemplatesLoading(false);
    }
  };

  useEffect(() => {
    if (activeAgentTab === "internal" && internalTemplates.length === 0 && !internalTemplatesLoading) {
      loadInternalTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgentTab]);

  useEffect(() => {
    if (activeAgentTab === "external" && externalSection === "prompt" && !promptGalleryLoaded) {
      loadPromptGallery();
    }
    if (activeAgentTab === "external" && externalSection === "chatMemory") {
      loadChatMemory(1);
    }
    if (activeAgentTab === "external" && externalSection === "ai_actions") {
      loadAiActions();
      loadCompanyAiStatus();
    }
    if (activeAgentTab === "external" && externalSection === "ai_settings") {
      loadAiSettings();
      if (!aiPipelineStageOptionsLoaded) loadAiPipelineStageOptions();
    }
    if (activeAgentTab === "external" && externalSection === "followups") {
      loadFollowUpConfig();
      loadFollowUpLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgentTab, externalSection]);

  // Sincroniza o rascunho dos selects com o custom_stages vindo do backend.
  useEffect(() => {
    if (Array.isArray(aiSettings?.custom_stages)) {
      setAiCustomStagesDraft(
        [0, 1, 2, 3, 4].map((i) => aiSettings.custom_stages[i]?.stage_id ?? "")
      );
    }
  }, [aiSettings]);

  useEffect(() => {
    if (!isConnected || !user.companyId) return;

    const onPromptEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_PROMPTS", payload: data.prompt });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_PROMPT", payload: data.promptId });
      }
    };

    const cleanup = on(`company-${companyId}-prompt`, onPromptEvent);
    return () => {
      cleanup();
    };
  }, [isConnected, on, user.companyId]);

  const handleLoadMemory = async () => {
    if (!memoryContactId) return;
    setMemoryLoading(true);
    try {
      const { data } = await api.get("/internal-agent/context", {
        params: { contactId: memoryContactId }
      });
      setMemoryData(data);
    } catch (err) {
      toastError(err);
    } finally {
      setMemoryLoading(false);
    }
  };

  const handleDeleteMemory = async (memoryId) => {
    try {
      await api.delete(`/internal-agent/memory/${memoryId}`);
      setMemoryData(prev => prev ? {
        ...prev,
        memories: prev.memories.filter(m => m.id !== memoryId)
      } : null);
      toast.success("Memória excluída");
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenAutomationMenu = (event, promptId) => {
    setAutomationMenuAnchor(event.currentTarget);
    setAutomationMenuPromptId(promptId);
  };

  const handleCloseAutomationMenu = () => {
    setAutomationMenuAnchor(null);
    setAutomationMenuPromptId(null);
  };

  const handleOpenCreateModal = (templateKey = null) => {
    setSelectedInitialTemplate(templateKey || null);
    setSelectedPrompt(null);
    setPromptModalOpen(true);
  };

  const handleClosePromptModal = (savedPrompt) => {
    if (savedPrompt?.id) {
      dispatch({ type: "UPDATE_PROMPTS", payload: savedPrompt });
      setInternalSection("agentes");
    }
    setPromptModalOpen(false);
    setSelectedPrompt(null);
    setSelectedInitialTemplate(null);
  };

  const handleEditPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setPromptModalOpen(true);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedPrompt(null);
  };

  const handleDeletePrompt = async (promptId) => {
    try {
      const { data } = await api.delete(`/prompt/${promptId}`);
      toast.info(i18n.t(data.message));
      dispatch({ type: "DELETE_PROMPT", payload: promptId });
    } catch (err) {
      toastError(err);
    }
    setSelectedPrompt(null);
  };

  const getWhatsappBinding = (prompt) =>
    (prompt.channelBindings || []).find((binding) => binding.channelType === "whatsapp");

  const handleDuplicatePrompt = async (prompt) => {
    try {
      const { data } = await api.post(`/prompt/${prompt.id}/duplicate`);
      toast.success("Agente duplicado. O clone fica sem canal ativo para evitar conflito.");
      if (data?.id) {
        dispatch({ type: "UPDATE_PROMPTS", payload: data });
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleTogglePrompt = async (prompt) => {
    try {
      const { data } = await api.patch(`/prompt/${prompt.id}/channel-binding/toggle`);
      toast.success("Status do agente atualizado.");
      if (data?.id) {
        dispatch({ type: "UPDATE_PROMPTS", payload: data });
      }
    } catch (err) {
      toastError(err);
    }
  };

  const [metricsOpen, setMetricsOpen] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsData, setMetricsData] = useState(null);

  const handleOpenMetrics = async (prompt) => {
    setSelectedPrompt(prompt);
    setMetricsOpen(true);
    setMetricsLoading(true);
    try {
      const { data } = await api.get(`/prompt/${prompt.id}/metrics`);
      setMetricsData(data);
    } catch (err) {
      toastError(err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const filteredPrompts = prompts.filter((prompt) =>
    prompt.name?.toLowerCase().includes(searchParam.toLowerCase()) ||
    prompt.queue?.name?.toLowerCase().includes(searchParam.toLowerCase())
  );

  const getTemplateMeta = (prompt) => {
    if (!prompt.templateKey || !internalTemplates.length) return null;
    return internalTemplates.find(t => t.key === prompt.templateKey) || null;
  };

  if (user.profile === "user") {
    return <ForbiddenPage />;
  }

  return (
    <Box className={classes.root}>
      <ConfirmationModal
        title={
          selectedPrompt &&
          `${i18n.t("prompts.confirmationModal.deleteTitle")} ${selectedPrompt.name}?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeletePrompt(selectedPrompt.id)}
      >
        {i18n.t("prompts.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      {/* Galeria de Modelos */}
      <Dialog open={galleryOpen} onClose={() => setGalleryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DashboardIcon style={{ color: "#1f5eea" }} />
            <span>Galeria de Modelos de Agentes</span>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {internalTemplatesLoading ? (
            <Box style={{ display: "flex", justifyContent: "center", padding: 32 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <Box className={classes.galleryGrid}>
              {internalTemplates.map((template) => (
                <Box
                  key={template.key}
                  className={`${classes.galleryCard} ${selectedInitialTemplate === template.key ? classes.galleryCardActive : ""}`}
                  onClick={() => {
                    setSelectedInitialTemplate(template.key);
                    setGalleryOpen(false);
                  }}
                >
                  <Typography className={classes.galleryCardNiche}>{template.niche}</Typography>
                  <Typography className={classes.galleryCardName}>{template.name}</Typography>
                  <Typography className={classes.galleryCardDesc}>{template.description}</Typography>
                  {selectedInitialTemplate === template.key && (
                    <span className={classes.galleryBadge}>Selecionado</span>
                  )}
                </Box>
              ))}
              <Box
                className={`${classes.galleryCard} ${!selectedInitialTemplate ? classes.galleryCardActive : ""}`}
                onClick={() => {
                  setSelectedInitialTemplate(null);
                  setGalleryOpen(false);
                }}
              >
                <Typography className={classes.galleryCardNiche}>GERAL</Typography>
                <Typography className={classes.galleryCardName}>Criar do Zero</Typography>
                <Typography className={classes.galleryCardDesc}>Formulário em branco. Configure tudo manualmente.</Typography>
                {!selectedInitialTemplate && (
                  <span className={classes.galleryBadge}>Selecionado</span>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGalleryOpen(false)}>Fechar</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setGalleryOpen(false);
              handleOpenCreateModal(selectedInitialTemplate);
            }}
          >
            {selectedInitialTemplate
              ? `Criar com: ${internalTemplates.find(t => t.key === selectedInitialTemplate)?.name || selectedInitialTemplate}`
              : "Criar do zero"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu Automação */}
      <Menu
        anchorEl={automationMenuAnchor}
        open={Boolean(automationMenuAnchor)}
        onClose={handleCloseAutomationMenu}
        getContentAnchorEl={null}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={() => { handleCloseAutomationMenu(); }}>
          <AddIcon fontSize="small" style={{ marginRight: 8 }} /> Criar automação
        </MenuItem>
        <MenuItem onClick={() => { handleCloseAutomationMenu(); }}>
          <SettingsIcon fontSize="small" style={{ marginRight: 8 }} /> Ver automações ativas
        </MenuItem>
      </Menu>

      <ConfirmationModal
        title={
          deletingAiAppointment
            ? `Excluir agendamento "${deletingAiAppointment.title}"?`
            : "Excluir agendamento?"
        }
        open={Boolean(deletingAiAppointment)}
        onClose={() => setDeletingAiAppointment(null)}
        onConfirm={handleDeleteAiAppointment}
      >
        Este agendamento sera removido do painel da IA e tambem da base de
        Compromissos, quando houver compromisso vinculado.
      </ConfirmationModal>
      <ConfirmationModal
        title={
          deletingReminder
            ? `Excluir lembrete de "${deletingReminder.leadName || deletingReminder.leadPhone || "Lead"}"?`
            : "Excluir lembrete?"
        }
        open={Boolean(deletingReminder)}
        onClose={() => setDeletingReminder(null)}
        onConfirm={handleDeleteReminder}
      >
        Este lembrete sera removido da lista de lembretes ativos e da base de
        dados.
      </ConfirmationModal>
      <PromptModal
        open={promptModalOpen}
        onClose={handleClosePromptModal}
        promptId={selectedPrompt?.id}
        initialTemplateKey={selectedInitialTemplate}
      />
      <Dialog open={metricsOpen} onClose={() => setMetricsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Métricas do agente</DialogTitle>
        <DialogContent dividers>
          {metricsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <>
              <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
                {selectedPrompt?.name}
              </Typography>
              <Box display="flex" flexWrap="wrap" gridGap={8} mt={2}>
                <Chip label={`Usos: ${metricsData?.total || 0}`} />
                <Chip label={`Sucessos: ${metricsData?.success || 0}`} />
                <Chip label={`Erros: ${metricsData?.errors || 0}`} />
                <Chip label={`Créditos: ${metricsData?.creditsConsumed || 0}`} />
              </Box>
              <Box mt={2}>
                <Typography variant="subtitle2">Últimas execuções</Typography>
                {(metricsData?.lastExecutions || []).length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Ainda não há registros de uso para este agente.
                  </Typography>
                ) : (
                  (metricsData?.lastExecutions || []).map(item => (
                    <Box key={item.id} display="flex" justifyContent="space-between" py={1}>
                      <Typography variant="body2">
                        {item.provider || "-"} / {item.model || "-"}
                      </Typography>
                      <Chip size="small" label={item.status} />
                    </Box>
                  ))
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetricsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Box className={classes.agentTabs}>
        <button
          type="button"
          className={`${classes.agentTab} ${activeAgentTab === "external" ? classes.agentTabActive : ""}`}
          onClick={() => setActiveAgentTab("external")}
        >
          Agente Externo N8N
        </button>
        <button
          type="button"
          className={`${classes.agentTab} ${activeAgentTab === "internal" ? classes.agentTabActive : ""}`}
          onClick={() => setActiveAgentTab("internal")}
        >
          Agente Interno
        </button>
      </Box>

      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <Box className={classes.headerIcon}>
            <PsychologyIcon />
          </Box>
          <Box>
            <Typography className={classes.headerTitle}>Agentes de IA</Typography>
            <Typography className={classes.headerSubtitle}>
              {activeAgentTab === "internal"
                ? internalSection === "criar"
                  ? "Criar e configurar novo agente"
                  : `${prompts.length} ${prompts.length === 1 ? "agente configurado" : "agentes configurados"}`
                : "System Prompt versionado e integrado ao N8N"}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Internal sub-navigation */}
      {activeAgentTab === "internal" && (
        <Box className={classes.internalSubNav}>
          <button
            type="button"
            className={`${classes.internalSubNavBtn} ${internalSection === "criar" ? classes.internalSubNavBtnActive : ""}`}
            onClick={() => setInternalSection("criar")}
          >
            Criar Agente
          </button>
          <button
            type="button"
            className={`${classes.internalSubNavBtn} ${internalSection === "agentes" ? classes.internalSubNavBtnActive : ""}`}
            onClick={() => setInternalSection("agentes")}
          >
            Meus Agentes{prompts.length > 0 ? ` (${prompts.length})` : ""}
          </button>
          <button
            type="button"
            className={`${classes.internalSubNavBtn} ${internalSection === "memoria" ? classes.internalSubNavBtnActive : ""}`}
            onClick={() => setInternalSection("memoria")}
          >
            Memória
          </button>
        </Box>
      )}

      {/* Content */}
      <Box className={classes.content}>
        {activeAgentTab === "external" ? (
          externalLoading ? (
            <Box className={classes.loadingContainer}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <>
              <Box className={classes.externalMenu}>
                {externalMenuItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`${classes.externalMenuButton} ${externalSection === item.key ? classes.externalMenuButtonActive : ""}`}
                    onClick={() => setExternalSection(item.key)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </Box>
              <Box className={classes.externalMenuSecondary}>
                {externalSecondaryMenuItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`${classes.externalMenuButton} ${externalSection === item.key ? classes.externalMenuButtonActive : ""}`}
                    onClick={() => setExternalSection(item.key)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </Box>
              {renderExternalSection()}
            </>
          )
        ) : internalSection === "criar" ? (
          <Box className={classes.createSection}>
            <Box className={classes.createHeader}>
              <Typography className={classes.createTitle}>Criar novo agente</Typography>
              <Typography className={classes.createSubtitle}>
                Escolha um template para iniciar rapidamente ou crie do zero. Configure objetivo, ferramentas, memória e canais.
              </Typography>
            </Box>

            {internalTemplatesLoading ? (
              <Box className={classes.loadingContainer}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <>
                <Box style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <Typography className={classes.createSectionLabel}>Template pronto</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DashboardIcon />}
                    onClick={() => setGalleryOpen(true)}
                    style={{ borderRadius: 8, fontWeight: 700 }}
                  >
                    Ver galeria completa ({internalTemplates.length + 1})
                  </Button>
                </Box>
                <Typography className={classes.createSectionDesc}>
                  Clique em um template para pré-configurar prompt, ferramentas e comportamento do agente.
                </Typography>
                <Box className={classes.internalTemplateGrid}>
                  {internalTemplates.slice(0, 6).map((template) => (
                    <Box
                      key={template.key}
                      className={`${classes.internalTemplateCard} ${selectedInitialTemplate === template.key ? classes.internalTemplateCardActive : ""}`}
                      onClick={() => setSelectedInitialTemplate(selectedInitialTemplate === template.key ? null : template.key)}
                    >
                      <Typography className={classes.internalTemplateCardTitle}>{template.name}</Typography>
                      <Typography className={classes.internalTemplateCardNiche}>{template.niche}</Typography>
                      <Typography className={classes.internalTemplateCardDesc}>{template.description}</Typography>
                    </Box>
                  ))}
                  <Box
                    className={`${classes.internalTemplateCard} ${classes.internalTemplateCardBlank} ${!selectedInitialTemplate ? classes.internalTemplateCardActive : ""}`}
                    onClick={() => setSelectedInitialTemplate(null)}
                  >
                    <AddIcon style={{ fontSize: 28, color: "#9ca3af", marginBottom: 4 }} />
                    <Typography className={classes.internalTemplateCardTitle}>Criar do zero</Typography>
                    <Typography className={classes.internalTemplateCardDesc}>
                      Formulário em branco. Configure tudo manualmente.
                    </Typography>
                  </Box>
                </Box>

                <Box className={classes.createCTARow}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenCreateModal(selectedInitialTemplate)}
                  >
                    {selectedInitialTemplate
                      ? `Criar com template: ${internalTemplates.find(t => t.key === selectedInitialTemplate)?.name || selectedInitialTemplate}`
                      : "+ Criar agente do zero"}
                  </Button>
                  {prompts.length > 0 && (
                    <Button variant="outlined" onClick={() => setInternalSection("agentes")}>
                      Ver meus agentes ({prompts.length})
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Box>
        ) : internalSection === "agentes" ? (
          <>
            <Box className={classes.myAgentsHeader}>
              <TextField
                placeholder="Buscar agente..."
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
              <Tooltip title="Novo agente">
                <button className={classes.addButton} onClick={() => handleOpenCreateModal(null)}>
                  <AddIcon style={{ fontSize: 24 }} />
                </button>
              </Tooltip>
            </Box>

            {loading ? (
              <Box className={classes.loadingContainer}>
                <CircularProgress size={32} />
              </Box>
            ) : filteredPrompts.length === 0 ? (
              <Box className={classes.emptyState}>
                <PsychologyIcon />
                <Typography>Nenhum agente encontrado</Typography>
                <Button variant="outlined" onClick={() => setInternalSection("criar")} style={{ marginTop: 16 }}>
                  Criar primeiro agente
                </Button>
              </Box>
            ) : (
              filteredPrompts.map((prompt) => {
                const binding = getWhatsappBinding(prompt);
                const isActive = Boolean(binding?.isActive);
                const templateMeta = getTemplateMeta(prompt);
                return (
                  <Box key={prompt.id} className={classes.agentCard}>
                    {/* Icon */}
                    <Box className={classes.agentCardIcon}>
                      <PsychologyIcon />
                    </Box>

                    {/* Body */}
                    <Box className={classes.agentCardBody}>
                      <Box className={classes.agentCardRow}>
                        <Typography className={classes.agentCardName}>{prompt.name}</Typography>
                        <Chip
                          size="small"
                          label={isActive ? "Ativo" : "Inativo"}
                          style={{
                            fontWeight: 700,
                            fontSize: "0.68rem",
                            height: 22,
                            backgroundColor: isActive ? "#dcfce7" : "#f3f4f6",
                            color: isActive ? "#166534" : "#6b7280"
                          }}
                        />
                        {templateMeta && (
                          <Chip
                            size="small"
                            label={templateMeta.niche || templateMeta.name}
                            style={{ fontWeight: 600, fontSize: "0.65rem", height: 20, backgroundColor: "#eff6ff", color: "#1f5eea" }}
                          />
                        )}
                      </Box>
                      {prompt.description ? (
                        <Typography className={classes.agentCardDesc}>{prompt.description}</Typography>
                      ) : templateMeta?.description ? (
                        <Typography className={classes.agentCardDesc}>{templateMeta.description}</Typography>
                      ) : null}
                      <Box className={classes.agentCardMeta}>
                        <span>Fila: {prompt.queue?.name || "Sem fila"}</span>
                        <span>•</span>
                        <span>Tokens: {prompt.maxTokens}</span>
                        {prompt.model && <><span>•</span><span>{prompt.model}</span></>}
                      </Box>
                      <Box className={classes.toolsWrapper}>
                        {prompt.toolsEnabled?.length ? (
                          prompt.toolsEnabled.map((toolName) => {
                            const meta = toolMap[toolName];
                            const isSensitive = DEFAULT_SENSITIVE_TOOLS.includes(toolName);
                            return (
                              <Tooltip key={`${prompt.id}-${toolName}`} title={meta?.description || toolName} arrow>
                                <Chip
                                  size="small"
                                  label={meta?.title || toolName}
                                  className={`${classes.toolChip} ${isSensitive ? classes.toolChipSensitive : classes.toolChipSafe}`}
                                />
                              </Tooltip>
                            );
                          })
                        ) : (
                          <Typography className={classes.toolsEmpty}>Nenhuma ferramenta habilitada</Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Box className={classes.agentCardActions}>
                      <Tooltip title={binding ? "Ativar/Desativar" : "Configure um canal para ativar"}>
                        <span>
                          <Switch
                            size="small"
                            color="primary"
                            checked={isActive}
                            onChange={() => handleTogglePrompt(prompt)}
                            disabled={!binding?.whatsappId}
                          />
                        </span>
                      </Tooltip>
                      <Tooltip title="Configurar">
                        <IconButton
                          size="small"
                          className={`${classes.actionButton} ${classes.editButton}`}
                          onClick={() => handleEditPrompt(prompt)}
                        >
                          <SettingsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Métricas">
                        <IconButton
                          size="small"
                          className={`${classes.actionButton} ${classes.metricsButton}`}
                          onClick={() => handleOpenMetrics(prompt)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicar">
                        <IconButton
                          size="small"
                          className={`${classes.actionButton} ${classes.duplicateButton}`}
                          onClick={() => handleDuplicatePrompt(prompt)}
                        >
                          <FileCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <button
                        type="button"
                        className={classes.automationBtn}
                        onClick={(e) => handleOpenAutomationMenu(e, prompt.id)}
                      >
                        <LinkIcon fontSize="small" />
                        Automação ▾
                      </button>
                      <Tooltip title="Excluir">
                        <IconButton
                          size="small"
                          className={`${classes.actionButton} ${classes.deleteButton}`}
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setConfirmModalOpen(true);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                );
              })
            )}
          </>
        ) : internalSection === "memoria" ? (
          <Box className={classes.memorySection}>
            <Typography variant="h6" style={{ fontWeight: 600, color: "#1a1a1a" }}>
              Memória Contextual
            </Typography>
            <Typography variant="body2" style={{ color: "#666" }}>
              Consulte e gerencie as memórias persistentes salvas pelo motor contextual do Agente Interno.
            </Typography>
            <Box className={classes.memorySearchBar}>
              <TextField
                variant="outlined"
                size="small"
                label="ID do Contato"
                value={memoryContactId}
                onChange={e => setMemoryContactId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLoadMemory()}
                style={{ width: 220, backgroundColor: "#fff", borderRadius: 8 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleLoadMemory}
                disabled={memoryLoading || !memoryContactId}
              >
                {memoryLoading ? <CircularProgress size={18} /> : "Buscar"}
              </Button>
            </Box>

            {memoryData && (
              <>
                {memoryData.state && (
                  <Box className={classes.memoryStateBox}>
                    <Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: 4 }}>
                      Estado da Conversa
                    </Typography>
                    <Typography variant="body2">
                      Status: <strong>{memoryData.state.status}</strong> &nbsp;|&nbsp;
                      Turnos: <strong>{memoryData.state.turnCount}</strong> &nbsp;|&nbsp;
                      Última atividade: <strong>{memoryData.state.lastActivity ? new Date(memoryData.state.lastActivity).toLocaleString("pt-BR") : "—"}</strong>
                    </Typography>
                  </Box>
                )}

                <Typography variant="subtitle1" style={{ fontWeight: 600, marginTop: 8 }}>
                  Memórias salvas ({memoryData.memories?.length || 0})
                </Typography>

                {(!memoryData.memories || memoryData.memories.length === 0) ? (
                  <Typography variant="body2" style={{ color: "#999" }}>
                    Nenhuma memória encontrada para este contato.
                  </Typography>
                ) : (
                  memoryData.memories.map(memory => (
                    <Box key={memory.id} className={classes.memoryCard}>
                      <Box className={classes.memoryCardHeader}>
                        <Chip
                          label={memory.memoryType}
                          size="small"
                          className={classes.memoryChip}
                          style={{
                            backgroundColor:
                              memory.memoryType === "summary" ? "#e3f2fd" :
                              memory.memoryType === "fact" ? "#e8f5e9" :
                              memory.memoryType === "preference" ? "#fff3e0" : "#f3e5f5",
                            color:
                              memory.memoryType === "summary" ? "#1565c0" :
                              memory.memoryType === "fact" ? "#2e7d32" :
                              memory.memoryType === "preference" ? "#e65100" : "#6a1b9a"
                          }}
                        />
                        <Tooltip title="Excluir memória">
                          <IconButton size="small" onClick={() => handleDeleteMemory(memory.id)}>
                            <DeleteOutlineIcon fontSize="small" style={{ color: "#e53935" }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Typography className={classes.memoryContent}>{memory.content}</Typography>
                      <Typography className={classes.memoryMeta}>
                        Relevância: {memory.relevanceScore} &nbsp;|&nbsp;
                        Criado: {new Date(memory.createdAt).toLocaleString("pt-BR")}
                        {memory.expiresAt && ` | Expira: ${new Date(memory.expiresAt).toLocaleDateString("pt-BR")}`}
                      </Typography>
                    </Box>
                  ))
                )}
              </>
            )}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default Prompts;
