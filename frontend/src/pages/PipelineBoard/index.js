import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import { useHistory } from "react-router-dom";
import { AuthContext } from "../../context/Auth/AuthContext";
import { usePlanPermissions } from "../../context/PlanPermissionsContext";
import { useSocket } from "../../context/SocketContext";
import {
  makeStyles,
  Typography,
  Box,
  IconButton,
  Button,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  TextField,
  Menu,
  Tab,
  Tabs,
  Chip,
  Grid,
} from "@material-ui/core";
import {
  Warning as WarningIcon,
  Timeline as TimelineIcon,
  FilterList as FilterListIcon,
  DragIndicator as DragIndicatorIcon,
  Schedule as ClockIcon,
  TipsAndUpdates as LightbulbIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Clear as ClearIcon,
  Dashboard as DashboardIcon,
  Tune as TuneIcon,
  MoreVert as MoreVertIcon,
  LayersClear as LayersClearIcon,
  Message as MessageIcon,
  FlashOn as FlashOnIcon,
  Note as NoteIcon,
  Assignment as AssignmentIcon,
  GetApp as GetAppIcon2,
  PushPin as PushPinIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  SmartToy as SmartToyIcon,
} from "@mui/icons-material";
import api from "../../services/api";
import { toast } from "react-toastify";
import ImportLeadsModal from "../../components/ImportLeadsModal";
import InternetLeadSearchModal from "../../components/InternetLeadSearchModal";
import GetAppIcon from "@material-ui/icons/GetApp";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import UniversalLeadModal from "../../components/UniversalLeadModal";
import { CrmAiFab } from "../../components/CrmAiAssistant";
import QuickRepliesModal from "../../components/QuickRepliesModal";
import { useWebphone } from "../../context/WebphoneContext";
import CallIcon from "@material-ui/icons/Call";
import {
  QUICK_MESSAGE_VARIABLES,
  QUICK_MESSAGE_VARIABLES_HELPER,
} from "../../constants/messageVariables";
import {
  getPreferredWhatsappId,
  sortWhatsappsByUserQueues,
} from "../../utils/whatsappQueuePreference";

const fCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
};

const useStyles = makeStyles((theme) => ({
  container: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#F5F5F5",
    overflow: "hidden",
    marginTop: 0,
  },
  header: {
    padding: theme.spacing(2, 3, 1.75, 3),
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid #cadecf",
    boxShadow: "0 12px 28px rgba(16, 24, 40, 0.08)",
    zIndex: 10,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5, 1.5, 1.25, 1.5),
    },
  },
  headerTop: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: theme.spacing(2),
    alignItems: "center",
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "1fr",
    },
  },
  titleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  titleBadge: {
    padding: "5px 10px",
    borderRadius: 999,
    backgroundColor: "#e8f7ee",
    border: "1px solid #bde2ca",
    color: "#155c34",
    fontSize: "0.7rem",
    fontWeight: 800,
    letterSpacing: ".04em",
    textTransform: "uppercase",
  },
  pageTitle: {
    fontSize: "1.08rem",
    fontWeight: 800,
    color: "#163624",
    lineHeight: 1.2,
  },
  pageSubtitle: {
    fontSize: "0.78rem",
    color: "#557464",
    fontWeight: 500,
  },
  topRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    [theme.breakpoints.down("md")]: {
      justifyContent: "flex-start",
    },
  },
  selector: {
    minWidth: 220,
    [theme.breakpoints.down("sm")]: {
      minWidth: "unset",
      flex: 1,
      width: "100%",
    },
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
      backgroundColor: "#f9fcfa",
      height: 40,
    },
    "& .MuiInputLabel-outlined": {
      fontSize: "0.83rem",
    },
  },
  aiPriorityBtn: {
    height: 40,
    borderRadius: 10,
    fontWeight: 800,
    textTransform: "none",
    fontSize: "0.78rem",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#b9d8c5",
    color: "#1b5f36",
    backgroundColor: "#f3faf6",
    "&:hover": {
      borderColor: "#7eb596",
      backgroundColor: "#e9f6ee",
    },
  },
  aiPriorityBtnActive: {
    borderColor: "#117a43",
    color: "#fff",
    background: "linear-gradient(135deg, #22a45d 0%, #15773f 100%)",
    boxShadow: "0 10px 24px rgba(23, 121, 66, 0.3)",
    "&:hover": {
      background: "linear-gradient(135deg, #1c914f 0%, #126338 100%)",
    },
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "1px solid #c6dfd0",
    backgroundColor: "#f4fbf7",
    color: "#205e38",
    "&:hover": {
      backgroundColor: "#e6f4ec",
    },
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 10,
    marginTop: 12,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
      gap: 8,
      marginTop: 8,
    },
  },
  metricCard: {
    borderRadius: 12,
    border: "2px solid #000",
    background: "#ffffff",
    padding: "10px 12px",
    boxShadow: "0 6px 18px rgba(16,24,40,0.07)",
    [theme.breakpoints.down("sm")]: {
      padding: "6px 8px",
      borderRadius: 8,
    },
  },
  metricLabel: {
    fontSize: "0.67rem",
    color: "#111111",
    letterSpacing: ".04em",
    textTransform: "uppercase",
    fontWeight: 800,
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.58rem",
    },
  },
  metricValue: {
    marginTop: 2,
    fontSize: "1.05rem",
    fontWeight: 900,
    lineHeight: 1.2,
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.88rem",
    },
  },
  controlBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid #e4efe8",
    [theme.breakpoints.down("sm")]: {
      flexWrap: "nowrap",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      paddingBottom: 4,
      gap: 6,
      marginTop: 8,
      paddingTop: 8,
      "& > *": { flexShrink: 0 },
    },
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#f8fcf9",
    border: "1px solid #cde1d4",
    borderRadius: 11,
    padding: "6px 12px",
    gap: 8,
    minWidth: 220,
    maxWidth: 285,
    flex: 1,
    [theme.breakpoints.down("sm")]: {
      minWidth: 200,
      maxWidth: 260,
      flex: "0 0 200px",
    },
    "&:focus-within": {
      border: "1px solid #1f9d55",
      backgroundColor: "#fff",
      boxShadow: "0 0 0 3px rgba(31,157,85,0.18)",
    },
  },
  searchToolsStack: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 220,
    maxWidth: 285,
    flex: 1,
    [theme.breakpoints.down("sm")]: {
      minWidth: 220,
      maxWidth: 260,
      flex: "0 0 220px",
    },
  },
  internetSearchBtn: {
    justifyContent: "flex-start",
    borderRadius: 11,
    border: "1px solid #cde1d4",
    backgroundColor: "#eff8f3",
    color: "#185c35",
    fontWeight: 800,
    textTransform: "none",
    padding: "7px 12px",
    boxShadow: "0 10px 18px rgba(24,92,53,0.08)",
    "&:hover": {
      backgroundColor: "#e4f4ea",
      borderColor: "#9fcbaf",
    },
  },
  searchInput: {
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: "0.84rem",
    color: "#2f4a3d",
    width: "100%",
    "&::placeholder": { color: "#7b9688" },
  },
  resultCount: {
    fontSize: "0.72rem",
    color: "#176f3e",
    fontWeight: 800,
    backgroundColor: "#eaf8ef",
    border: "1px solid #c5e2d0",
    borderRadius: 999,
    padding: "4px 10px",
  },
  keywordFilterButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: "1px solid #cde1d4",
    backgroundColor: "#f8fcf9",
    color: "#176f3e",
    flexShrink: 0,
    "&:hover": {
      backgroundColor: "#eaf8ef",
      borderColor: "#8fc9a4",
    },
  },
  keywordFilterButtonActive: {
    backgroundColor: "#e6f6ed",
    borderColor: "#1f9d55",
    boxShadow: "0 0 0 3px rgba(31,157,85,0.14)",
  },
  keywordFilterSummary: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "4px 8px 4px 10px",
    backgroundColor: "#ecfdf3",
    border: "1px solid #bde2ca",
    color: "#176f3e",
    fontSize: "0.72rem",
    fontWeight: 800,
    maxWidth: 260,
  },
  keywordFilterText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  crmTabs: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  crmTabBtn: {
    borderRadius: 10,
    border: "1px solid #c8ddcf",
    backgroundColor: "#f7fbf8",
    color: "#355645",
    textTransform: "none",
    fontWeight: 700,
    fontSize: "0.76rem",
    padding: "4px 10px",
    minHeight: 34,
    "&:hover": {
      borderColor: "#8fc9a6",
      backgroundColor: "#ecf7f0",
    },
  },
  crmTabBtnActive: {
    color: "#fff",
    borderColor: "#11723d",
    background: "linear-gradient(135deg, #22a65b 0%, #15763f 100%)",
    boxShadow: "0 10px 20px rgba(21,118,63,0.28)",
  },
  viewModeBtn: {
    borderRadius: 10,
    fontWeight: 700,
    textTransform: "none",
    fontSize: "0.78rem",
    padding: "6px 12px",
    minHeight: 36,
  },
  teamBtn: {
    background: "linear-gradient(135deg, #20a35a 0%, #15793f 100%)",
    color: "#fff",
    border: "1px solid #126f3a",
    boxShadow: "0 8px 18px rgba(21,121,63,0.24)",
    "&:hover": {
      background: "linear-gradient(135deg, #1c904f 0%, #116438 100%)",
    },
  },
  personalBtn: {
    backgroundColor: "#f8fcf9",
    color: "#355746",
    border: "1px solid #cfe1d4",
    "&:hover": { backgroundColor: "#eef7f1" },
  },
  memberSelect: {
    minWidth: 190,
    [theme.breakpoints.down("sm")]: {
      minWidth: 160,
      flex: "0 0 160px",
    },
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
      height: 36,
      fontSize: "0.82rem",
      backgroundColor: "#fff",
    },
    "& .MuiInputLabel-outlined": { fontSize: "0.82rem" },
  },
  topScrollWrapper: {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    backgroundColor: "#f5faf7",
    borderBottom: "1px solid #d8e7df",
    height: 18,
    scrollbarColor: "#8b8f96 #e5e7eb",
    scrollbarWidth: "auto",
    "&::-webkit-scrollbar": { height: 14 },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "#e5e7eb",
      borderRadius: 999,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "#8b8f96",
      borderRadius: 999,
      border: "3px solid #e5e7eb",
    },
  },
  topScrollContent: {
    height: 1,
  },
  boardArea: {
    flex: 1,
    display: "flex",
    overflowX: "auto",
    padding: theme.spacing(2),
    gap: theme.spacing(2),
    alignItems: "flex-start",
    scrollbarColor: "#8b8f96 #e5e7eb",
    scrollbarWidth: "auto",
    "&::-webkit-scrollbar": { height: 16 },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "#e5e7eb",
      borderRadius: 999,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "#8b8f96",
      borderRadius: 999,
      border: "3px solid #e5e7eb",
    },
  },
  lane: {
    minWidth: 348,
    maxWidth: 348,
    borderRadius: 16,
    maxHeight: "100%",
    display: "flex",
    flexDirection: "column",
    border: "none",
    boxShadow: "0 10px 24px rgba(16,24,40,0.18)",
    overflow: "hidden",
    transition: "background-color 0.2s",
    [theme.breakpoints.down("sm")]: {
      minWidth: 300,
      maxWidth: 300,
    },
  },
  laneHeader: {
    padding: theme.spacing(1.75, 1.75, 1.5, 1.75),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    borderBottom: "1px solid #e2ede6",
    minHeight: 80,
    maxHeight: 80,
    justifyContent: "space-between",
  },
  laneTitle: {
    fontWeight: 800,
    fontSize: "0.94rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#ffffff",
  },
  laneTitleLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flex: 1,
    "& > span:nth-child(2)": {
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
      wordBreak: "break-word",
    },
  },
  laneTitleMain: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  laneDragHandle: {
    width: 28,
    height: 28,
    borderRadius: 10,
    color: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.18)",
    cursor: "grab",
    flexShrink: 0,
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.22)",
    },
    "&:active": {
      cursor: "grabbing",
    },
  },
  laneColorDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  laneStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    fontSize: "0.74rem",
    color: "rgba(255,255,255,0.85)",
    fontWeight: 700,
  },
  laneRiskNotice: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: "0.68rem",
    backgroundColor: "#feecec",
    color: "#b42318",
    border: "1px solid #f6c0bf",
    padding: "3px 8px",
    borderRadius: 999,
  },
  cardList: {
    padding: theme.spacing(1.5),
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.4),
    backgroundColor: "transparent",
    "&::-webkit-scrollbar": { width: 7 },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "#b4cebf",
      borderRadius: 4,
    },
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: theme.spacing(1.5),
    boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
    cursor: "pointer",
    transition: "all .18s ease",
    border: "1px solid #d8e8df",
    borderLeft: (props) => `5px solid ${props.riskColor || "#cde1d4"}`,
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 14px 24px rgba(16,24,40,0.14)",
      borderColor: "#a8c8b6",
    },
    "&:focus-visible": {
      outline: "none",
      boxShadow: "0 0 0 3px rgba(31,157,85,0.25)",
    },
  },
  cardTitle: {
    fontWeight: 800,
    color: "#111111",
    lineHeight: 1.25,
    fontSize: "0.82rem",
  },
  cardContact: {
    fontSize: "0.72rem",
    color: "#111111",
    fontWeight: 700,
  },
  cardMetaLine: {
    fontSize: "0.7rem",
    color: "#759082",
    marginTop: 3,
  },
  cardValueRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardValue: {
    fontWeight: 900,
    fontSize: "0.95rem",
    color: "#173925",
  },
  riskChip: {
    fontSize: "0.62rem",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: 999,
    textTransform: "uppercase",
    border: "1px solid transparent",
  },
  cardTagsRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  cardTagChip: {
    display: "inline-block",
    maxWidth: 96,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.62rem",
    lineHeight: 1.4,
    fontWeight: 700,
    padding: "1px 7px",
    borderRadius: 8,
    backgroundColor: "#eef2f5",
    color: "#475569",
    border: "1px solid #cbd5e1",
  },
  cardTagChipMore: {
    backgroundColor: "#e2e8f0",
    color: "#334155",
    border: "1px solid #cbd5e1",
    fontWeight: 800,
  },
  loadMore: {
    textAlign: "center",
    padding: theme.spacing(1),
    color: "rgba(255,255,255,0.8)",
    cursor: "pointer",
    fontSize: "0.76rem",
    fontWeight: 700,
    "&:hover": { color: "#1e7f47" },
  },
  searchHighlight: {
    backgroundColor: "#fff8e6",
    borderLeft: "4px solid #cc9c00 !important",
  },
  noResults: {
    textAlign: "center",
    padding: theme.spacing(2),
    color: "rgba(255,255,255,0.75)",
    fontSize: "0.76rem",
    border: "1px dashed #cfe1d5",
    borderRadius: 10,
    backgroundColor: "#f8fcf9",
  },
}));

const LEAD_STATUS_LABELS = {
  novo: "Novo Lead",
  contactado: "Contactado",
  qualificado: "Qualificado",
  follow_up: "Follow-up",
  follow_up_enviado: "Follow-up enviado",
  reuniao_agendada: "Reunião Agendada",
  nao_qualificado: "Não Qualificado",
  convertido: "Convertido",
  perdido: "Perdido",
};

const LEAD_STATUS_COLORS = {
  novo: { bg: "#e0f2fe", color: "#0369a1" },
  contactado: { bg: "#fef9c3", color: "#854d0e" },
  qualificado: { bg: "#dcfce7", color: "#166534" },
  follow_up: { bg: "#ffedd5", color: "#9a3412" },
  follow_up_enviado: { bg: "#cffafe", color: "#155e75" },
  reuniao_agendada: { bg: "#ede9fe", color: "#5b21b6" },
  nao_qualificado: { bg: "#f1f5f9", color: "#475569" },
  convertido: { bg: "#d1fae5", color: "#065f46" },
  perdido: { bg: "#fee2e2", color: "#991b1b" },
};

const IntelligentCard = ({ op, onClick, highlight }) => {
  const { makeCall } = useWebphone();
  const { webphone: canUseWebphone } = usePlanPermissions();
  const riskColor =
    op.prediction && op.prediction.riskLevel === "HIGH"
      ? "#ef4444"
      : op.prediction && op.prediction.riskLevel === "MEDIUM"
        ? "#f59e0b"
        : "#10b981";
  const probability =
    (op.prediction && (op.prediction.probability * 100).toFixed(0)) || 0;
  const cardColor = op.lead?.cardColor || op.lead?.card_color || null;
  const activeColor =
    cardColor && cardColor !== "#FFFFFF" ? cardColor : riskColor;
  const classes = useStyles({ riskColor: activeColor });

  return (
    <Box
      className={`${classes.card} ${highlight ? classes.searchHighlight : ""}`}
      onClick={() => onClick(op)}
      tabIndex={0}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={1}
      >
        <Typography className={classes.cardTitle}>{op.title}</Typography>
        {op.prediction && op.prediction.riskLevel === "HIGH" && (
          <Tooltip title="Alto Risco">
            <WarningIcon style={{ fontSize: 16, color: riskColor }} />
          </Tooltip>
        )}
      </Box>

      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
        <Typography className={classes.cardContact}>
          {(op.contact && op.contact.name) ||
            (op.lead && op.lead.name) ||
            "Sem contato"}
        </Typography>
        {canUseWebphone && (
          <Tooltip title="Chamar agora">
            <IconButton
              size="small"
              style={{ marginLeft: "auto", color: "#22a45d" }}
              onClick={(e) => {
                e.stopPropagation();
                const phone =
                  (op.contact && op.contact.number) || (op.lead && op.lead.phone);
                if (phone) {
                  makeCall(
                    phone,
                    {
                      id: op.lead?.id || op.contact?.id,
                      name:
                        (op.lead && op.lead.name) ||
                        (op.contact && op.contact.name) ||
                        phone,
                      phone,
                    },
                    {
                      contactId: op.contact?.id || op.lead?.contactId || null,
                      leadId: op.lead?.id || op.leadId || null,
                      opportunityId: op.id,
                      pipelineId: op.pipelineId || op.stage?.pipelineId || null,
                      stageId: op.stageId || null,
                      ticketId: op.ticketId || null,
                    },
                  );
                } else {
                  toast.info("Lead sem telefone cadastrado.");
                }
              }}
            >
              <CallIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {Array.isArray(op.contact?.tags) && op.contact.tags.length > 0 && (
        <Box className={classes.cardTagsRow}>
          {op.contact.tags.slice(0, 3).map((tag) => {
            const tagColor =
              tag.color && /^#?[0-9a-fA-F]{3,8}$/.test(tag.color)
                ? tag.color.startsWith("#")
                  ? tag.color
                  : `#${tag.color}`
                : null;
            return (
              <Tooltip key={tag.id} title={tag.name || ""}>
                <span
                  className={classes.cardTagChip}
                  style={
                    tagColor
                      ? {
                          backgroundColor: tagColor + "1A",
                          color: tagColor,
                          borderColor: tagColor + "44",
                        }
                      : undefined
                  }
                >
                  {tag.name}
                </span>
              </Tooltip>
            );
          })}
          {op.contact.tags.length > 3 && (
            <Tooltip
              title={op.contact.tags
                .slice(3)
                .map((t) => t.name)
                .join(", ")}
            >
              <span className={`${classes.cardTagChip} ${classes.cardTagChipMore}`}>
                +{op.contact.tags.length - 3}
              </span>
            </Tooltip>
          )}
        </Box>
      )}

      {op.lead && op.lead.companyName && (
        <Typography className={classes.cardMetaLine}>
          Empresa: {op.lead.companyName}
        </Typography>
      )}

      <Box className={classes.cardValueRow} mt={1.1}>
        <Typography className={classes.cardValue}>
          {fCurrency(op.value)}
        </Typography>
        <span
          className={classes.riskChip}
          style={{
            backgroundColor: riskColor + "14",
            color: riskColor,
            borderColor: riskColor + "44",
          }}
        >
          Win: {probability}%
        </span>
      </Box>
      {op.lead?.status && op.lead.status !== "novo" && (
        <Box mt={0.5}>
          <span
            style={{
              display: "inline-block",
              fontSize: "0.6rem",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 4,
              backgroundColor: (
                LEAD_STATUS_COLORS[op.lead.status] || LEAD_STATUS_COLORS.novo
              ).bg,
              color: (
                LEAD_STATUS_COLORS[op.lead.status] || LEAD_STATUS_COLORS.novo
              ).color,
              letterSpacing: 0.2,
            }}
          >
            {LEAD_STATUS_LABELS[op.lead.status] || op.lead.status}
          </span>
        </Box>
      )}
      {op.slaStatus === "EXPIRED" && (
        <Box
          mt={0.7}
          display="flex"
          alignItems="center"
          gap={0.5}
          style={{ color: "#b42318", fontSize: "0.65rem", fontWeight: 800 }}
        >
          <ClockIcon style={{ fontSize: 13 }} /> SLA vencido
        </Box>
      )}
    </Box>
  );
};

const PipelineBoard = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const { firecrawl: canUseFirecrawl } = usePlanPermissions();
  const { hydrateLeadContext } = useWebphone();
  const isAdmin = user && user.profile === "admin";

  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [pinTrigger, setPinTrigger] = useState(0);

  const pinKey = useMemo(() => {
    return `crm_kanban_pinned_pipeline_${user?.companyId}_${user?.id}`;
  }, [user]);

  const isPinned = useMemo(() => {
    if (!selectedPipelineId) return false;
    const pinnedPipelineId = localStorage.getItem(pinKey);
    return Number(pinnedPipelineId) === Number(selectedPipelineId);
  }, [selectedPipelineId, pinKey, pinTrigger]);

  const handleTogglePin = () => {
    try {
      if (isPinned) {
        localStorage.removeItem(pinKey);
        toast.info("Funil desfixado como padrão.");
      } else {
        localStorage.setItem(pinKey, selectedPipelineId);
        toast.success("Funil fixado como padrão.");
      }
      setPinTrigger((p) => p + 1);
    } catch (e) {
      toast.error("Não foi possível fixar o funil.");
    }
  };

  const [board, setBoard] = useState({ stages: [] });
  const [loading, setLoading] = useState(false);
  const [loadingStageIds, setLoadingStageIds] = useState([]);
  const [sort, setSort] = useState("CREATED_AT");

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [internetSearchOpen, setInternetSearchOpen] = useState(false);
  const [selectedStageToImport, setSelectedStageToImport] = useState(null);
  const [universalModalOpen, setUniversalModalOpen] = useState(false);

  // Filtros existentes
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState("");
  const [onlyAI, setOnlyAI] = useState(false);
  const [onlyExpired, setOnlyExpired] = useState(false);

  // NOVO: Busca client-side
  const [searchText, setSearchText] = useState("");
  const [keywordFilterModalOpen, setKeywordFilterModalOpen] = useState(false);
  const [keywordFilterDraft, setKeywordFilterDraft] = useState("");
  const [keywordFilter, setKeywordFilter] = useState("");

  // NOVO: Filtros de usuário (admin only)
  // viewMode: "team" = vê todos; "personal" = vê apenas próprios leads
  const [viewMode, setViewMode] = useState("team");
  const [selectedOwnerUserId, setSelectedOwnerUserId] = useState("");
  const [teamUsers, setTeamUsers] = useState([]);

  // IA Feedback
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedOp, setSelectedOp] = useState(null);

  // Ações em massa por etapa
  const [stageMenuAnchor, setStageMenuAnchor] = useState(null);
  const [stageMenuTarget, setStageMenuTarget] = useState(null); // stage object
  const [massActionModalOpen, setMassActionModalOpen] = useState(false);
  const [massActionTab, setMassActionTab] = useState(0);
  const [massActionStage, setMassActionStage] = useState(null);
  const [massDeleting, setMassDeleting] = useState(false);
  const [massNote, setMassNote] = useState("");
  const [massSaving, setMassSaving] = useState(false);
  const [massTaskTitle, setMassTaskTitle] = useState("");
  const [massTaskDueDate, setMassTaskDueDate] = useState("");
  const [massTaskPriority, setMassTaskPriority] = useState("Média");
  const [massMsg, setMassMsg] = useState("");
  const [massMediaFiles, setMassMediaFiles] = useState([]);
  const [massQuickRepliesOpen, setMassQuickRepliesOpen] = useState(false);
  const [massWhatsapps, setMassWhatsapps] = useState([]);
  const [massWhatsappId, setMassWhatsappId] = useState("");
  const [massScheduleDate, setMassScheduleDate] = useState("");
  const [massTaskBoards, setMassTaskBoards] = useState([]);
  const [massTaskListId, setMassTaskListId] = useState("");

  // Modal standalone de Automação por etapa
  const [stageAutomationModalOpen, setStageAutomationModalOpen] = useState(false);
  const [stageAutomationStage, setStageAutomationStage] = useState(null);
  const [stageAutomationWhatsapps, setStageAutomationWhatsapps] = useState([]);
  const [stageAutomationTaskBoards, setStageAutomationTaskBoards] = useState([]);

  const appendMassToken = (token) => {
    setMassMsg((prev) => {
      const safeCurrent = String(prev || "");
      const spacer =
        safeCurrent && !safeCurrent.endsWith(" ") && !safeCurrent.endsWith("\n")
          ? " "
          : "";

      return `${safeCurrent}${spacer}${token}`;
    });
  };

  const appendMassMessage = (currentValue, nextValue) => {
    const safeCurrent = String(currentValue || "").trimEnd();
    const safeNext = String(nextValue || "").trim();

    if (!safeNext) {
      return safeCurrent;
    }

    if (!safeCurrent) {
      return safeNext;
    }

    return `${safeCurrent}${safeCurrent.endsWith("\n") ? "\n" : "\n\n"}${safeNext}`;
  };

  const handleMassQuickReplySelect = (replyMessage, file) => {
    setMassMsg((prev) => appendMassMessage(prev, replyMessage));

    if (file) {
      setMassMediaFiles((prev) => [...prev, file]);
    }

    setMassQuickRepliesOpen(false);
  };

  const topScrollRef = useRef(null);
  const boardScrollRef = useRef(null);
  const massMediaInputRef = useRef(null);

  const syncScroll = (source, target) => {
    if (target.current && source.current) {
      target.current.scrollLeft = source.current.scrollLeft;
    }
  };

  useEffect(() => {
    fetchPipelines();
    if (isAdmin) fetchTeamUsers();
  }, []);

  useEffect(() => {
    if (!massActionModalOpen || massActionTab !== 1) {
      setMassQuickRepliesOpen(false);
    }
  }, [massActionModalOpen, massActionTab]);

  const { socket } = useSocket();

  useEffect(() => {
    if (selectedPipelineId) {
      fetchBoard();
    }

    if (!user || !user.companyId || !socket) return;

    const onEvent = () => fetchBoard();

    const oppEv = `company-${user.companyId}-opportunity`;
    const leadEv = `company-${user.companyId}-lead`;

    socket.on(oppEv, onEvent);
    socket.on(leadEv, onEvent);

    return () => {
      socket.off(oppEv, onEvent);
      socket.off(leadEv, onEvent);
    };
  }, [
    selectedPipelineId,
    riskFilter,
    onlyAI,
    onlyExpired,
    sort,
    viewMode,
    selectedOwnerUserId,
    keywordFilter,
    user,
    socket,
  ]);

  const fetchPipelines = async () => {
    try {
      const { data } = await api.get("/pipelines");
      setPipelines(data);
      if (data.length > 0) {
        const pinKey = `crm_kanban_pinned_pipeline_${user?.companyId}_${user?.id}`;
        const pinnedPipelineId = localStorage.getItem(pinKey);
        const hasPinned = data.some(p => Number(p.id) === Number(pinnedPipelineId));
        if (hasPinned && pinnedPipelineId) {
          setSelectedPipelineId(Number(pinnedPipelineId));
        } else {
          setSelectedPipelineId(data[0].id);
        }
      }
    } catch (e) {}
  };

  const fetchTeamUsers = async () => {
    try {
      const { data } = await api.get("/users/");
      setTeamUsers(data.users || []);
    } catch (e) {}
  };

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const params = buildBoardParams();

      const { data } = await api.get(`/pipelines/${selectedPipelineId}/board`, {
        params,
      });

      // Deduplicação global por ID em cada estágio
      if (data && data.stages) {
        data.stages = data.stages.map((stage) => {
          const uniqueCards = Array.from(
            new Map((stage.opportunities || []).map((c) => [c.id, c])).values(),
          );
          return {
            ...stage,
            opportunities: uniqueCards,
            visibleOpportunitiesCount: uniqueCards.length,
          };
        });
      }

      setBoard(data);

      if (selectedOp?.id && data?.stages?.length) {
        const refreshedOpportunity = data.stages
          .flatMap((stage) => stage.opportunities || [])
          .find((opportunity) => opportunity.id === selectedOp.id);

        if (refreshedOpportunity) {
          setSelectedOp(refreshedOpportunity);
        }
      }
    } catch (err) {
      toast.error("Impossível conectar ao serviço de inteligência");
    } finally {
      setLoading(false);
    }
  };

  const buildBoardParams = (extraParams = {}) => {
    const params = { riskLevel: riskFilter, onlyAI, onlyExpired, sort, ...extraParams };

    if (keywordFilter.trim()) {
      params.searchKeyword = keywordFilter.trim();
    }

    if (isAdmin) {
      if (viewMode === "personal") {
        params.viewMode = "personal";
      } else if (selectedOwnerUserId) {
        params.ownerUserId = selectedOwnerUserId;
      } else {
        params.viewMode = "team";
      }
    }

    return params;
  };

  const mergeUniqueOpportunities = (current = [], incoming = []) => {
    return Array.from(
      new Map([...current, ...incoming].map((opportunity) => [opportunity.id, opportunity])).values(),
    );
  };

  const handleOpenKeywordFilter = () => {
    setKeywordFilterDraft(keywordFilter);
    setKeywordFilterModalOpen(true);
  };

  const handleApplyKeywordFilter = () => {
    setKeywordFilter(keywordFilterDraft.trim());
    setKeywordFilterModalOpen(false);
  };

  const handleClearKeywordFilter = () => {
    setKeywordFilter("");
    setKeywordFilterDraft("");
    setKeywordFilterModalOpen(false);
  };

  const handleLoadMoreStage = async (stage) => {
    if (!stage?.hasMore || !stage.nextCursor || loadingStageIds.includes(stage.id)) return;

    setLoadingStageIds((prev) => [...prev, stage.id]);

    try {
      const { data } = await api.get(`/pipelines/${selectedPipelineId}/board`, {
        params: buildBoardParams({
          stageId: stage.id,
          cursor: stage.nextCursor,
        }),
      });

      const loadedStage = (data?.stages || []).find((item) => item.id === stage.id);
      if (!loadedStage) return;

      setBoard((prevBoard) => ({
        ...prevBoard,
        pipeline: data?.pipeline || prevBoard.pipeline,
        stages: (prevBoard.stages || []).map((currentStage) => {
          if (currentStage.id !== stage.id) return currentStage;
          const mergedOpportunities = mergeUniqueOpportunities(
            currentStage.opportunities,
            loadedStage.opportunities,
          );

          return {
            ...currentStage,
            totalValue: loadedStage.totalValue,
            forecastValue: loadedStage.forecastValue,
            opportunitiesCount: loadedStage.opportunitiesCount,
            visibleOpportunitiesCount: mergedOpportunities.length,
            highRiskCount: loadedStage.highRiskCount,
            opportunities: mergedOpportunities,
            hasMore: loadedStage.hasMore,
            nextCursor: loadedStage.nextCursor,
          };
        }),
      }));
    } catch (err) {
      toast.error("Nao foi possivel carregar mais oportunidades desta etapa.");
    } finally {
      setLoadingStageIds((prev) => prev.filter((id) => id !== stage.id));
    }
  };

  // Filtro client-side por busca
  const filteredBoard = useMemo(() => {
    if (!searchText.trim()) return board;
    const q = searchText.toLowerCase().trim();
    return {
      ...board,
      stages: (board.stages || []).map((stage) => {
        const filteredOpportunities = (stage.opportunities || []).filter((op) => {
          const title = (op.title || "").toLowerCase();
          const leadName = (op.lead?.name || "").toLowerCase();
          const contactName = (op.contact?.name || "").toLowerCase();
          const companyName = (op.lead?.companyName || "").toLowerCase();
          const cnpj = (op.lead?.cnpj || "").toLowerCase();
          return (
            title.includes(q) ||
            leadName.includes(q) ||
            contactName.includes(q) ||
            companyName.includes(q) ||
            cnpj.includes(q)
          );
        });

        return {
          ...stage,
          opportunities: filteredOpportunities,
          visibleOpportunitiesCount: filteredOpportunities.length,
        };
      }),
    };
  }, [board, searchText]);

  const handleOpenStageMenu = (event, stage) => {
    setStageMenuAnchor(event.currentTarget);
    setStageMenuTarget(stage);
  };

  const handleCloseStageMenu = () => {
    setStageMenuAnchor(null);
    setStageMenuTarget(null);
  };

  const handleOpenMassAction = async (stage) => {
    handleCloseStageMenu();
    setMassActionStage(stage);
    setMassActionTab(0);
    setMassNote("");
    setMassTaskTitle("");
    setMassTaskDueDate("");
    setMassTaskPriority("Média");
    setMassMsg("");
    setMassMediaFiles([]);
    setMassQuickRepliesOpen(false);
    setMassWhatsappId("");
    setMassScheduleDate("");
    setMassTaskListId("");
    if (massMediaInputRef.current) {
      massMediaInputRef.current.value = "";
    }
    // carrega conexões WhatsApp e boards de tarefas
    try {
      const [wpRes, boardRes] = await Promise.all([
        api.get("/whatsapp"),
        api.get("/tasks"),
      ]);
      const connectedWhatsapps = sortWhatsappsByUserQueues(
        (wpRes.data || []).filter((w) => w.status === "CONNECTED"),
        user,
      );
      setMassWhatsapps(connectedWhatsapps);
      setMassWhatsappId(getPreferredWhatsappId(connectedWhatsapps, user));
      setMassTaskBoards(boardRes.data || []);
    } catch (_) {}
    setMassActionModalOpen(true);
  };

  const handleOpenStageAutomation = async (stage) => {
    handleCloseStageMenu();
    setStageAutomationStage(stage);
    try {
      const [wpRes, boardRes] = await Promise.all([
        api.get("/whatsapp"),
        api.get("/tasks"),
      ]);
      const connectedWhatsapps = sortWhatsappsByUserQueues(
        (wpRes.data || []).filter((w) => w.status === "CONNECTED"),
        user,
      );
      setStageAutomationWhatsapps(connectedWhatsapps);
      setStageAutomationTaskBoards(boardRes.data || []);
    } catch (_) {}
    setStageAutomationModalOpen(true);
  };

  const handleMassDelete = async () => {
    if (!massActionStage) return;
    if (
      !window.confirm(
        `Excluir TODAS as ${massActionStage.opportunities.length} oportunidades desta etapa do funil? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setMassDeleting(true);
    try {
      const ids = massActionStage.opportunities.map((o) => o.id);
      for (const id of ids) {
        await api.delete(`/opportunities/${id}`);
      }
      toast.success("Oportunidades removidas do funil.");
      setMassQuickRepliesOpen(false);
      setMassActionModalOpen(false);
      fetchBoard();
    } catch (err) {
      toast.error("Erro ao excluir oportunidades.");
    } finally {
      setMassDeleting(false);
    }
  };

  const handleMassNote = async () => {
    if (!massNote.trim() || !massActionStage) return;
    setMassSaving(true);
    try {
      for (const op of massActionStage.opportunities) {
        await api.post(`/opportunities/${op.id}/events`, {
          type: "ANOTACAO",
          metadata: { text: massNote },
        });
      }
      toast.success("Anotações adicionadas em massa.");
      setMassNote("");
    } catch (_) {
      toast.error("Erro ao adicionar anotações.");
    } finally {
      setMassSaving(false);
    }
  };

  const handleMassTask = async () => {
    if (!massTaskTitle.trim() || !massTaskListId || !massActionStage) return;
    setMassSaving(true);
    try {
      for (const op of massActionStage.opportunities) {
        await api.post("/tasks/item", {
          listId: Number(massTaskListId),
          title: massTaskTitle,
          priority: massTaskPriority,
          dueDate: massTaskDueDate || null,
          leadId: op.leadId || null,
        });
      }
      toast.success("Tarefas criadas em massa.");
      setMassTaskTitle("");
      setMassTaskDueDate("");
      setMassTaskListId("");
    } catch (_) {
      toast.error("Erro ao criar tarefas.");
    } finally {
      setMassSaving(false);
    }
  };

  const handleMassMessage = async () => {
    if (
      (!massMsg.trim() && !massMediaFiles.length) ||
      !massWhatsappId ||
      !massActionStage
    )
      return;
    setMassSaving(true);
    try {
      const formData = new FormData();
      formData.append(
        "campaignName",
        `Disparo Funil - ${massActionStage.name}`,
      );
      formData.append("recipientMode", "crmStage");
      formData.append("stageId", String(massActionStage.id));
      formData.append("whatsappId", String(massWhatsappId));
      formData.append("viewMode", viewMode);
      if (selectedOwnerUserId) {
        formData.append("ownerUserId", String(selectedOwnerUserId));
      }
      formData.append("messageType", "text");
      formData.append("message", massMsg || "");
      formData.append("sendNow", massScheduleDate ? "false" : "true");

      if (massScheduleDate) {
        formData.append(
          "scheduledAt",
          new Date(massScheduleDate).toISOString(),
        );
      }

      massMediaFiles.forEach((file) => {
        formData.append("medias", file);
      });

      await api.post("/quick-send/campaign", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        massScheduleDate
          ? "Disparo do funil agendado e enviado para a fila de Disparos."
          : "Disparo do funil criado e iniciado com sucesso.",
      );
      setMassMsg("");
      setMassScheduleDate("");
      setMassMediaFiles([]);
      if (massMediaInputRef.current) {
        massMediaInputRef.current.value = "";
      }
      setMassQuickRepliesOpen(false);
      setMassActionModalOpen(false);
    } catch (_) {
      toast.error("Erro ao criar o disparo em massa desta etapa.");
    } finally {
      setMassSaving(false);
    }
  };

  const handleMassMediaChange = (event) => {
    const files = Array.from(event.target.files || []);
    setMassMediaFiles(files);
  };

  const removeMassMedia = (index) => {
    setMassMediaFiles((current) => {
      const nextFiles = current.filter(
        (_, currentIndex) => currentIndex !== index,
      );
      if (!nextFiles.length && massMediaInputRef.current) {
        massMediaInputRef.current.value = "";
      }
      return nextFiles;
    });
  };

  const handleOpenImport = (stageId = "") => {
    setSelectedStageToImport(stageId);
    setImportModalOpen(true);
  };

  const handleImportSuccess = () => {
    fetchBoard();
  };

  const handleAiFeedback = async (feedback) => {
    try {
      await api.post(`/opportunities/${selectedOp.id}/feedback`, {
        suggestedStageId: selectedOp.aiSuggestedStageId,
        actualStageId: selectedOp.stageId,
        feedback,
      });
      toast.success("Obrigado! A IA está aprendendo com você.");
      setFeedbackOpen(false);
    } catch (e) {
      toast.error("Erro ao enviar feedback");
    }
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    if (type === "STAGE") {
      const reorderedStages = Array.from(board.stages || []);
      const [movedStage] = reorderedStages.splice(source.index, 1);
      reorderedStages.splice(destination.index, 0, movedStage);

      const normalizedStages = reorderedStages.map((stage, index) => ({
        ...stage,
        order: index,
      }));

      setBoard((prev) => ({
        ...prev,
        stages: normalizedStages,
      }));

      try {
        await api.put(`/pipelines/${selectedPipelineId}/stages/sort`, {
          stages: normalizedStages.map((stage) => ({
            id: stage.id,
            order: stage.order,
          })),
        });
        toast.success("Ordem das etapas atualizada.");
      } catch (err) {
        toast.error("Erro ao reorganizar etapas.");
        fetchBoard();
      }
      return;
    }

    const sourceStageId = parseInt(source.droppableId);
    const destStageId = parseInt(destination.droppableId);

    // Deep clone safe for optimistic UI
    const newBoard = {
      ...board,
      stages: board.stages.map((stage) => ({
        ...stage,
        opportunities: [...stage.opportunities],
      })),
    };
    let draggedOp, sourceStageIdx, destStageIdx;

    newBoard.stages.forEach((stage, idx) => {
      if (stage.id === sourceStageId) sourceStageIdx = idx;
      if (stage.id === destStageId) destStageIdx = idx;
    });

    if (sourceStageIdx !== undefined) {
      draggedOp = newBoard.stages[sourceStageIdx].opportunities.find(
        (op) => op.id === parseInt(draggableId),
      );
      if (draggedOp) {
        newBoard.stages[sourceStageIdx].opportunities.splice(source.index, 1);
        // Update stageId so any open modal immediately reflects the new stage
        draggedOp = { ...draggedOp, stageId: destStageId };
      }
    }

    if (draggedOp && destStageIdx !== undefined) {
      newBoard.stages[destStageIdx].opportunities = newBoard.stages[
        destStageIdx
      ].opportunities.filter((o) => o.id !== draggedOp.id);
      newBoard.stages[destStageIdx].opportunities.splice(
        destination.index,
        0,
        draggedOp,
      );

      if (sourceStageId !== destStageId) {
        const movedValue = Number(draggedOp.value || 0);
        newBoard.stages[sourceStageIdx].opportunitiesCount = Math.max(
          Number(newBoard.stages[sourceStageIdx].opportunitiesCount || 0) - 1,
          0,
        );
        newBoard.stages[sourceStageIdx].totalValue = Math.max(
          Number(newBoard.stages[sourceStageIdx].totalValue || 0) - movedValue,
          0,
        );
        newBoard.stages[destStageIdx].opportunitiesCount =
          Number(newBoard.stages[destStageIdx].opportunitiesCount || 0) + 1;
        newBoard.stages[destStageIdx].totalValue =
          Number(newBoard.stages[destStageIdx].totalValue || 0) + movedValue;
      }

      setBoard(newBoard);
    }

    try {
      await api.post(`/opportunities/${draggableId}/move`, {
        toStageId: destStageId,
      });
    } catch (err) {
      toast.error("Erro ao mover card.");
      fetchBoard(); // Revert
    }
  };

  const totals = useMemo(() => {
    return (board.stages || []).reduce(
      (acc, stage) => {
        acc.totalValue += stage.totalValue;
        acc.forecastValue += stage.forecastValue;
        acc.highRiskCount += stage.highRiskCount;
        return acc;
      },
      { totalValue: 0, forecastValue: 0, highRiskCount: 0 },
    );
  }, [board]);

  const searchResultCount = useMemo(() => {
    if (!searchText.trim() && !keywordFilter.trim()) return null;
    return (filteredBoard.stages || []).reduce(
      (acc, s) => acc + s.opportunities.length,
      0,
    );
  }, [filteredBoard, searchText, keywordFilter]);

  return (
    <Box className={classes.container}>
      <header className={classes.header}>
        <div className={classes.headerTop}>
          {/* <div className={classes.titleWrap}>
            <div className={classes.titleRow}>
              <span className={classes.titleBadge}>CRM Kanban</span>
            </div>
          </div> */}

          <div className={classes.topRight}>
            {/* Seletor movido para o Grid de Métricas */}
          </div>
        </div>

        <div className={classes.metricsGrid}>
          {/* Card 1: Seletor de Funil + Botão Pin */}
          <div
            className={classes.metricCard}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderColor: "#c6dfd0",
            }}
          >
            <FormControl
              variant="outlined"
              size="small"
              className={classes.selector}
              style={{ flex: 1, minWidth: 160 }}
            >
              <InputLabel>Funil de Vendas</InputLabel>
              <Select
                value={selectedPipelineId}
                onChange={(e) => setSelectedPipelineId(e.target.value)}
                label="Funil de Vendas"
              >
                {pipelines.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Tooltip title={isPinned ? "Funil fixado como padrão" : "Fixar este funil"}>
              <IconButton
                size="small"
                onClick={handleTogglePin}
                style={{
                  color: isPinned ? "#0f8f4b" : "#6b7280",
                  backgroundColor: isPinned ? "#effaf4" : "transparent",
                  border: isPinned ? "1px solid #10b981" : "1px solid #d1d5db",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <PushPinIcon style={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </div>

          {/* Card 2: Compromissos Agendados */}
          <div className={classes.metricCard}>
            <Typography className={classes.metricLabel}>
              Compromissos agendados
            </Typography>
            <Typography
              className={classes.metricValue}
              style={{ color: "#166534" }}
            >
              {board.pipeline?.scheduledMeetingsCount || 0}
            </Typography>
          </div>

          {/* Card 3: Valor Total do Funil */}
          <div className={classes.metricCard}>
            <Typography className={classes.metricLabel}>
              Valor Total do Funil
            </Typography>
            <Typography
              className={classes.metricValue}
              style={{ color: "#0f8f4b" }}
            >
              {fCurrency(totals.totalValue)}
            </Typography>
          </div>
          {/* <div className={classes.metricCard}>
            <Typography className={classes.metricLabel}>
              Alertas de risco
            </Typography>
            <Typography
              className={classes.metricValue}
              style={{ color: "#b42318" }}
            >
              {totals.highRiskCount}
            </Typography>
          </div> */}
        </div>

        <div className={classes.controlBar}>
          <div className={classes.searchToolsStack}>
            <div className={classes.searchBox}>
              <SearchIcon
                style={{ fontSize: 16, color: "#7b9688", flexShrink: 0 }}
              />
              <input
                className={classes.searchInput}
                placeholder="Buscar lead, contato, empresa ou CNPJ..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              {searchText && (
                <IconButton
                  size="small"
                  onClick={() => setSearchText("")}
                  style={{ padding: 2 }}
                >
                  <ClearIcon style={{ fontSize: 14, color: "#7b9688" }} />
                </IconButton>
              )}
            </div>
            {canUseFirecrawl && (
            <Button
              size="small"
              startIcon={<FlashOnIcon style={{ fontSize: 16 }} />}
              className={classes.internetSearchBtn}
              onClick={() => setInternetSearchOpen(true)}
            >
              Buscar Leads na internet
            </Button>
            )}
          </div>

          <Tooltip title={keywordFilter ? `Filtro aplicado: ${keywordFilter}` : "Filtro por palavra-chave"}>
            <IconButton
              size="small"
              className={`${classes.keywordFilterButton} ${keywordFilter ? classes.keywordFilterButtonActive : ""}`}
              onClick={handleOpenKeywordFilter}
            >
              <FilterListIcon style={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          {keywordFilter && (
            <span className={classes.keywordFilterSummary}>
              <span className={classes.keywordFilterText}>{keywordFilter}</span>
              <IconButton size="small" onClick={handleClearKeywordFilter} style={{ padding: 1 }}>
                <ClearIcon style={{ fontSize: 14, color: "#176f3e" }} />
              </IconButton>
            </span>
          )}

          {(searchText || keywordFilter) && searchResultCount !== null && (
            <span className={classes.resultCount}>
              {searchResultCount} resultado{searchResultCount !== 1 ? "s" : ""}
            </span>
          )}

          <div className={classes.crmTabs}>
            <Tooltip title="Dashboard Executivo">
              <Button
                size="small"
                className={classes.crmTabBtn}
                startIcon={<DashboardIcon style={{ fontSize: 15 }} />}
                onClick={() =>
                  history.push({
                    pathname: "/executive-dashboard",
                    state: { from: history.location.pathname },
                  })
                }
              >
                Dashboard
              </Button>
            </Tooltip>
            <Tooltip title="Configuração de Funil">
              <Button
                size="small"
                className={classes.crmTabBtn}
                startIcon={<TuneIcon style={{ fontSize: 15 }} />}
                onClick={() =>
                  history.push({
                    pathname: "/pipeline-config",
                    state: { from: history.location.pathname },
                  })
                }
              >
                Config. Funil
              </Button>
            </Tooltip>
            <Tooltip title="Gerenciamento de Tarefas">
              <Button
                size="small"
                className={classes.crmTabBtn}
                startIcon={<DashboardIcon style={{ fontSize: 15 }} />}
                onClick={() =>
                  history.push({
                    pathname: "/crm/tasks",
                    state: { from: history.location.pathname },
                  })
                }
              >
                Tarefas
              </Button>
            </Tooltip>
            <Button
              size="small"
              className={`${classes.crmTabBtn} ${classes.crmTabBtnActive}`}
              startIcon={
                viewMode === "team" ? (
                  <PeopleIcon style={{ fontSize: 15 }} />
                ) : (
                  <PersonIcon style={{ fontSize: 15 }} />
                )
              }
            >
              {viewMode === "team" ? "Kanban Equipe" : "Kanban Pessoal"}
            </Button>
          </div>

          {/* Filtros de equipe — apenas admin */}
          {isAdmin && (
            <>
              <Tooltip
                title={
                  viewMode === "team"
                    ? "Visualizando toda a equipe"
                    : "Visualizando apenas seus leads"
                }
              >
                <Button
                  size="small"
                  className={`${classes.viewModeBtn} ${viewMode === "team" ? classes.teamBtn : classes.personalBtn}`}
                  startIcon={
                    viewMode === "team" ? (
                      <PeopleIcon style={{ fontSize: 16 }} />
                    ) : (
                      <PersonIcon style={{ fontSize: 16 }} />
                    )
                  }
                  onClick={() => {
                    setViewMode((v) => (v === "team" ? "personal" : "team"));
                    setSelectedOwnerUserId("");
                  }}
                >
                  {viewMode === "team" ? "Equipe" : "Pessoal"}
                </Button>
              </Tooltip>

              {viewMode === "team" && (
                <FormControl
                  variant="outlined"
                  size="small"
                  className={classes.memberSelect}
                >
                  <InputLabel>Membro da Equipe</InputLabel>
                  <Select
                    value={selectedOwnerUserId}
                    onChange={(e) => setSelectedOwnerUserId(e.target.value)}
                    label="Membro da Equipe"
                  >
                    <MenuItem value="">
                      <em>Toda a equipe</em>
                    </MenuItem>
                    {teamUsers.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar
                            style={{
                              width: 20,
                              height: 20,
                              fontSize: "0.65rem",
                              backgroundColor: "#1f9d55",
                            }}
                          >
                            {u.name ? u.name[0].toUpperCase() : "?"}
                          </Avatar>
                          {u.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </>
          )}
        </div>
      </header>

      <div
        className={classes.topScrollWrapper}
        ref={topScrollRef}
        onScroll={() => syncScroll(topScrollRef, boardScrollRef)}
      >
        <div
          className={classes.topScrollContent}
          style={{ width: (board.stages?.length || 0) * 364 + 48 }}
        />
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable
          droppableId="pipeline-stages"
          direction="horizontal"
          type="STAGE"
        >
          {(stageDropProvided) => (
            <Box
              className={classes.boardArea}
              ref={(node) => {
                boardScrollRef.current = node;
                stageDropProvided.innerRef(node);
              }}
              onScroll={() => syncScroll(boardScrollRef, topScrollRef)}
              {...stageDropProvided.droppableProps}
            >
              {loading && (
                <CircularProgress style={{ margin: "auto" }} color="primary" />
              )}

              {!loading &&
                (filteredBoard.stages || []).map((stage, stageIndex) => {
                  const stageColor = stage.color || "#1f9d55";
                  const textColor = "#fff";
                  const visibleCardsCount = (stage.opportunities || []).length;
                  const totalCardsCount = Number(stage.opportunitiesCount ?? visibleCardsCount);
                  return (
                    <Draggable
                      key={stage.id}
                      draggableId={`stage-${stage.id}`}
                      index={stageIndex}
                    >
                      {(stageProvided, stageSnapshot) => (
                        <div
                          ref={stageProvided.innerRef}
                          {...stageProvided.draggableProps}
                          style={{
                            ...stageProvided.draggableProps.style,
                            opacity: stageSnapshot.isDragging ? 0.92 : 1,
                          }}
                        >
                          <Droppable
                            key={stage.id}
                            droppableId={String(stage.id)}
                            type="CARD"
                          >
                            {(provided) => (
                              <Box
                                className={`${classes.lane} kanban-column`}
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{
                                  backgroundColor: stageColor,
                                  border: "none",
                                }}
                              >
                                <div
                                  className={`${classes.laneHeader} kanban-column-header`}
                                  style={{
                                    borderBottom:
                                      "1px solid rgba(255,255,255,0.25)",
                                  }}
                                >
                                  <div className={classes.laneTitle}>
                                    <div className={classes.laneTitleMain}>
                                      <Tooltip title="Arrastar etapa">
                                        <IconButton
                                          size="small"
                                          className={classes.laneDragHandle}
                                          {...stageProvided.dragHandleProps}
                                        >
                                          <DragIndicatorIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <div className={classes.laneTitleLeft}>
                                        <span>{stage.name}</span>
                                        <span
                                          style={{
                                            fontSize: "0.68rem",
                                            color: "rgba(255,255,255,0.7)",
                                          }}
                                        >
                                          ID {stage.id}
                                        </span>
                                      </div>
                                    </div>
                                    <Tooltip title="Opções da etapa">
                                      <IconButton
                                        size="small"
                                        onClick={(e) =>
                                          handleOpenStageMenu(e, stage)
                                        }
                                        style={{ color: textColor }}
                                      >
                                        <MoreVertIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </div>
                                  <div
                                    className={classes.laneStats}
                                    style={{ color: textColor }}
                                  >
                                    <span>
                                      Real: {fCurrency(stage.totalValue)}
                                    </span>
                                    <span
                                      style={{
                                        color: "rgba(255,255,255,0.85)",
                                        fontWeight: 800,
                                      }}
                                    >
                                      Total cards:{" "}
                                      {totalCardsCount}
                                    </span>
                                  </div>
                                  {stage.highRiskCount > 0 && (
                                    <Box className={classes.laneRiskNotice}>
                                      <WarningIcon style={{ fontSize: 12 }} />{" "}
                                      {stage.highRiskCount} leads críticos
                                    </Box>
                                  )}
                                </div>

                                <div className={classes.cardList}>
                                  {stage.opportunities.length === 0 && (
                                    <Typography className={classes.noResults}>
                                      {searchText || keywordFilter
                                        ? "Nenhum resultado nesta etapa"
                                        : "Sem cards nesta etapa"}
                                    </Typography>
                                  )}
                                  {stage.opportunities.map((op, index) => (
                                    <Draggable
                                      key={op.id}
                                      draggableId={String(op.id)}
                                      index={index}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          style={{
                                            ...provided.draggableProps.style,
                                            marginBottom: 16,
                                            opacity: snapshot.isDragging
                                              ? 0.8
                                              : 1,
                                          }}
                                        >
                                          <IntelligentCard
                                            op={op}
                                            highlight={!!searchText.trim() || !!keywordFilter.trim()}
                                            onClick={(o) => {
                                              hydrateLeadContext(
                                                {
                                                  id:
                                                    o.lead?.id ||
                                                    o.leadId ||
                                                    null,
                                                  name:
                                                    o.lead?.name ||
                                                    o.contact?.name ||
                                                    o.title,
                                                  phone:
                                                    o.lead?.phone ||
                                                    o.contact?.number ||
                                                    "",
                                                  companyName:
                                                    o.lead?.companyName || "",
                                                  pipelineId:
                                                    o.pipelineId ||
                                                    selectedPipelineId,
                                                  stageId: o.stageId || null,
                                                  opportunityId: o.id,
                                                  contactId:
                                                    o.contact?.id ||
                                                    o.lead?.contactId ||
                                                    null,
                                                  status:
                                                    o.lead?.status || null,
                                                  meetingScheduledAt:
                                                    o.lead
                                                      ?.meetingScheduledAt ||
                                                    null,
                                                },
                                                {
                                                  contactId:
                                                    o.contact?.id ||
                                                    o.lead?.contactId ||
                                                    null,
                                                  leadId:
                                                    o.lead?.id ||
                                                    o.leadId ||
                                                    null,
                                                  opportunityId: o.id,
                                                  pipelineId:
                                                    o.pipelineId ||
                                                    selectedPipelineId ||
                                                    null,
                                                  stageId: o.stageId || null,
                                                  ticketId: o.ticketId || null,
                                                },
                                                { tab: "lead" },
                                              );
                                              setSelectedOp(o);
                                              setUniversalModalOpen(true);
                                            }}
                                          />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                  {stage.hasMore && !searchText && (
                                    <Typography
                                      className={classes.loadMore}
                                      onClick={() => handleLoadMoreStage(stage)}
                                    >
                                      {loadingStageIds.includes(stage.id)
                                        ? "Carregando..."
                                        : "Carregar mais..."}
                                    </Typography>
                                  )}
                                </div>
                              </Box>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
              {stageDropProvided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>

      {/* Menu de opções da etapa */}
      <Menu
        anchorEl={stageMenuAnchor}
        open={Boolean(stageMenuAnchor)}
        onClose={handleCloseStageMenu}
        PaperProps={{
          style: {
            borderRadius: 10,
            minWidth: 200,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          },
        }}
      >
        <MenuItem
          onClick={() => handleOpenMassAction(stageMenuTarget)}
          style={{ gap: 8 }}
        >
          <LayersClearIcon fontSize="small" style={{ color: "#6366f1" }} />
          <Box>
            <Typography variant="body2" style={{ fontWeight: 700 }}>
              Ações em massa
            </Typography>
            <Chip
              label="BETA"
              size="small"
              style={{
                fontSize: "0.6rem",
                height: 16,
                backgroundColor: "#e0e7ff",
                color: "#4338ca",
              }}
            />
          </Box>
        </MenuItem>
        <MenuItem
          onClick={() => handleOpenStageAutomation(stageMenuTarget)}
          style={{ gap: 8 }}
        >
          <TuneIcon fontSize="small" style={{ color: "#7c3aed" }} />
          <Typography variant="body2" style={{ fontWeight: 600 }}>
            Automação
          </Typography>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleCloseStageMenu();
            handleOpenImport(stageMenuTarget?.id);
          }}
          style={{ gap: 8 }}
        >
          <GetAppIcon2 fontSize="small" style={{ color: "#059669" }} />
          <Typography variant="body2" style={{ fontWeight: 600 }}>
            Importar negócios
          </Typography>
        </MenuItem>
      </Menu>

      {/* Modal de Ações em Massa */}
      <Dialog
        open={massActionModalOpen}
        onClose={() => {
          setMassQuickRepliesOpen(false);
          setMassActionModalOpen(false);
        }}
        maxWidth={
          massQuickRepliesOpen && massActionTab === 1 ? "lg" : "sm"
        }
        fullWidth
        PaperProps={{
          style: {
            borderRadius: 16,
            width:
              massQuickRepliesOpen && massActionTab === 1
                ? "min(1040px, 96vw)"
                : undefined,
            maxWidth:
              massQuickRepliesOpen && massActionTab === 1 ? "96vw" : undefined,
            maxHeight: "calc(100vh - 48px)",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle style={{ fontWeight: 800, paddingBottom: 0 }}>
          Ações em massa — {massActionStage?.name}
          <Typography
            variant="caption"
            display="block"
            style={{ color: "#6b7280", fontWeight: 400 }}
          >
            {massActionStage?.opportunities?.length || 0} oportunidade(s) nesta
            etapa
          </Typography>
        </DialogTitle>
        <Tabs
          value={massActionTab}
          onChange={(_, v) => setMassActionTab(v)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          style={{ borderBottom: "1px solid #e5e7eb", paddingLeft: 16 }}
        >
          <Tab
            label="Excluir"
            icon={<LayersClearIcon fontSize="small" />}
            style={{ minWidth: 80, fontSize: "0.75rem" }}
          />
          <Tab
            label="Mensagem"
            icon={<MessageIcon fontSize="small" />}
            style={{ minWidth: 80, fontSize: "0.75rem" }}
          />
          <Tab
            label="Anotações"
            icon={<NoteIcon fontSize="small" />}
            style={{ minWidth: 80, fontSize: "0.75rem" }}
          />
          <Tab
            label="Tarefas"
            icon={<AssignmentIcon fontSize="small" />}
            style={{ minWidth: 80, fontSize: "0.75rem" }}
          />
        </Tabs>
        <DialogContent
          style={{ minHeight: 220, paddingTop: 20, overflowY: "auto", flex: 1 }}
        >
          <Box display="flex" alignItems="stretch" style={{ gap: 16 }}>
            <Box flex={1} minWidth={0}>
              {/* Aba 0: Excluir */}
              {massActionTab === 0 && (
                <Box>
                  <Typography
                    variant="body2"
                    style={{ color: "#b91c1c", marginBottom: 12 }}
                  >
                    Esta ação remove todas as oportunidades desta etapa do
                    funil. Os leads NÃO são excluídos, apenas saem do pipeline.
                  </Typography>
                  <Box
                    p={2}
                    style={{
                      backgroundColor: "#fef2f2",
                      borderRadius: 10,
                      border: "1px solid #fca5a5",
                    }}
                  >
                    <Typography variant="body2" style={{ fontWeight: 700 }}>
                      {massActionStage?.opportunities?.length || 0}{" "}
                      oportunidade(s) serão removidas
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={
                      massDeleting || !massActionStage?.opportunities?.length
                    }
                    onClick={handleMassDelete}
                    style={{
                      marginTop: 16,
                      backgroundColor: "#dc2626",
                      color: "#fff",
                    }}
                  >
                    {massDeleting ? (
                      <CircularProgress size={20} style={{ color: "#fff" }} />
                    ) : (
                      "Excluir todas do funil"
                    )}
                  </Button>
                </Box>
              )}
              {/* Aba 1: Mensagem em massa */}
              {massActionTab === 1 && (
                <Box display="flex" flexDirection="column" style={{ gap: 14 }}>
                  <Box
                    p={2}
                    style={{
                      borderRadius: 14,
                      background:
                        "linear-gradient(135deg, #effaf4 0%, #f8fcfa 100%)",
                      border: "1px solid #d7eadf",
                    }}
                  >
                    <Typography
                      variant="body2"
                      style={{
                        fontWeight: 800,
                        color: "#175c35",
                        marginBottom: 6,
                      }}
                    >
                      Este envio usa o mesmo motor de Disparos do sistema
                    </Typography>
                    <Typography
                      variant="body2"
                      style={{ color: "#496a58", lineHeight: 1.5 }}
                    >
                      A mensagem entra na fila de disparos e cada contato válido
                      desta etapa ganha ticket próprio para acompanhamento.
                    </Typography>
                  </Box>
                  <Box
                    display="grid"
                    style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}
                  >
                    <FormControl variant="outlined" fullWidth size="small">
                      <InputLabel>Conexão WhatsApp</InputLabel>
                      <Select
                        value={massWhatsappId}
                        onChange={(e) => setMassWhatsappId(e.target.value)}
                        label="Conexão WhatsApp"
                      >
                        <MenuItem value="">Selecione...</MenuItem>
                        {massWhatsapps.map((w) => (
                          <MenuItem key={w.id} value={w.id}>
                            {w.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Data/hora de envio (opcional)"
                      type="datetime-local"
                      variant="outlined"
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={massScheduleDate}
                      onChange={(e) => setMassScheduleDate(e.target.value)}
                      helperText={
                        massScheduleDate
                          ? "Se preenchido, o envio entra agendado em Disparos."
                          : "Se vazio, o envio começa agora."
                      }
                    />
                  </Box>
                  <Box>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      style={{ marginBottom: 8 }}
                    >
                      <Typography
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#4f6f60",
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                        }}
                      >
                        Mensagem do disparo
                      </Typography>
                      <Tooltip title="Abrir respostas rápidas">
                        <IconButton
                          size="small"
                          onClick={() =>
                            setMassQuickRepliesOpen((prev) => !prev)
                          }
                          style={{
                            border: "1px solid rgba(20, 92, 53, 0.14)",
                            backgroundColor: "#eef8f2",
                            color: "#175c35",
                          }}
                        >
                          <FlashOnIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <TextField
                      label="Mensagem"
                      multiline
                      rows={5}
                      variant="outlined"
                      fullWidth
                      value={massMsg}
                      onChange={(e) => setMassMsg(e.target.value)}
                      placeholder="Digite a mensagem a enviar para todos os contatos desta etapa..."
                    />
                  </Box>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    style={{ marginTop: -4 }}
                  >
                    <Typography
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#4f6f60",
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                      }}
                    >
                      Variáveis dinâmicas
                    </Typography>
                    <Typography style={{ fontSize: 11, color: "#789181" }}>
                      Clique para inserir
                    </Typography>
                  </Box>
                  <Box
                    display="flex"
                    flexWrap="wrap"
                    style={{ gap: 6, marginTop: -4 }}
                  >
                    {QUICK_MESSAGE_VARIABLES.map((item) => (
                      <Chip
                        key={item.token}
                        label={item.label}
                        size="small"
                        clickable
                        onClick={() => appendMassToken(item.token)}
                        style={{
                          backgroundColor: "#e0f2fe",
                          color: "#0f172a",
                          fontWeight: 700,
                          border: "1px solid #bae6fd",
                        }}
                      />
                    ))}
                  </Box>
                  <Box
                    p={1.25}
                    style={{
                      borderRadius: 10,
                      border: "1px solid #cce6d6",
                      backgroundColor: "#f1fbf5",
                      marginTop: -4,
                    }}
                  >
                    <Typography
                      variant="body2"
                      style={{ color: "#2f6f4b", fontSize: 12 }}
                    >
                      {QUICK_MESSAGE_VARIABLES_HELPER}
                    </Typography>
                  </Box>
                  <Box
                    p={2}
                    style={{
                      borderRadius: 14,
                      border: "1px dashed #bfd8c8",
                      backgroundColor: "#fbfefd",
                    }}
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      style={{ gap: 12, marginBottom: 10 }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          style={{ fontWeight: 800, color: "#173929" }}
                        >
                          Mídia do disparo
                        </Typography>
                        <Typography
                          variant="caption"
                          style={{ color: "#62806f" }}
                        >
                          Você pode anexar imagem, vídeo, áudio ou documento.
                        </Typography>
                      </Box>
                      <input
                        ref={massMediaInputRef}
                        type="file"
                        multiple
                        style={{ display: "none" }}
                        id="pipeline-mass-media-upload"
                        onChange={handleMassMediaChange}
                      />
                      <label htmlFor="pipeline-mass-media-upload">
                        <Button
                          component="span"
                          variant="outlined"
                          style={{
                            borderRadius: 10,
                            textTransform: "none",
                            fontWeight: 700,
                          }}
                        >
                          Adicionar mídia
                        </Button>
                      </label>
                    </Box>
                    {massMediaFiles.length > 0 ? (
                      <Box display="flex" flexWrap="wrap" style={{ gap: 8 }}>
                        {massMediaFiles.map((file, index) => (
                          <Chip
                            key={`${file.name}-${index}`}
                            label={file.name}
                            onDelete={() => removeMassMedia(index)}
                            style={{
                              maxWidth: "100%",
                              backgroundColor: "#eef7f1",
                            }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" style={{ color: "#708a7a" }}>
                        Nenhuma mídia selecionada ainda.
                      </Typography>
                    )}
                  </Box>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    style={{
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 14,
                      backgroundColor: "#f7faf8",
                      border: "1px solid #dde8e0",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        style={{ fontWeight: 800, color: "#18382a" }}
                      >
                        {massActionStage?.opportunities?.length || 0}{" "}
                        oportunidade(s) nesta etapa
                      </Typography>
                      <Typography
                        variant="caption"
                        style={{ color: "#688372" }}
                      >
                        O sistema cria o disparo e abre ticket para os contatos
                        válidos encontrados no funil.
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={
                        massSaving ||
                        (!massMsg.trim() && !massMediaFiles.length) ||
                        !massWhatsappId
                      }
                      onClick={handleMassMessage}
                      style={{
                        borderRadius: 12,
                        minWidth: 220,
                        minHeight: 42,
                        textTransform: "none",
                        fontWeight: 800,
                        boxShadow: "0 10px 24px rgba(25,118,210,0.24)",
                      }}
                    >
                      {massSaving ? (
                        <CircularProgress size={20} style={{ color: "#fff" }} />
                      ) : massScheduleDate ? (
                        "Agendar em Disparos"
                      ) : (
                        "Enviar agora pelo funil"
                      )}
                    </Button>
                  </Box>
                </Box>
              )}
              {/* Aba 2: Anotações em massa */}
              {massActionTab === 2 && (
                <Box display="flex" flexDirection="column" style={{ gap: 12 }}>
                  <Typography variant="body2" color="textSecondary">
                    A anotação será adicionada em todos os cards desta etapa.
                  </Typography>
                  <TextField
                    label="Anotação"
                    multiline
                    rows={5}
                    variant="outlined"
                    fullWidth
                    value={massNote}
                    onChange={(e) => setMassNote(e.target.value)}
                    placeholder="Digite a anotação..."
                    style={{ backgroundColor: "#fef3c7" }}
                  />
                  <Button
                    variant="contained"
                    disabled={massSaving || !massNote.trim()}
                    onClick={handleMassNote}
                    style={{ backgroundColor: "#f59e0b", color: "#fff" }}
                  >
                    {massSaving ? (
                      <CircularProgress size={20} />
                    ) : (
                      "Adicionar anotação em massa"
                    )}
                  </Button>
                </Box>
              )}
              {/* Aba 3: Tarefas em massa */}
              {massActionTab === 3 && (
                <Box display="flex" flexDirection="column" style={{ gap: 12 }}>
                  <Typography variant="body2" color="textSecondary">
                    Uma tarefa será criada para cada lead desta etapa.
                  </Typography>
                  <TextField
                    label="Título da tarefa"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={massTaskTitle}
                    onChange={(e) => setMassTaskTitle(e.target.value)}
                    placeholder="Ex: Ligar às 14h, Reunião online..."
                  />
                  <FormControl variant="outlined" size="small" fullWidth>
                    <InputLabel>Quadro de tarefas (coluna)</InputLabel>
                    <Select
                      value={massTaskListId}
                      onChange={(e) => setMassTaskListId(e.target.value)}
                      label="Quadro de tarefas (coluna)"
                    >
                      <MenuItem value="">Selecione...</MenuItem>
                      {massTaskBoards.flatMap((b) =>
                        (b.lists || []).map((l) => (
                          <MenuItem key={l.id} value={l.id}>
                            {b.name} → {l.name}
                          </MenuItem>
                        )),
                      )}
                    </Select>
                  </FormControl>
                  <FormControl variant="outlined" size="small" fullWidth>
                    <InputLabel>Prioridade</InputLabel>
                    <Select
                      value={massTaskPriority}
                      onChange={(e) => setMassTaskPriority(e.target.value)}
                      label="Prioridade"
                    >
                      {["Baixa", "Média", "Alta", "Urgente"].map((p) => (
                        <MenuItem key={p} value={p}>
                          {p}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Prazo"
                    type="datetime-local"
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={massTaskDueDate}
                    onChange={(e) => setMassTaskDueDate(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={
                      massSaving || !massTaskTitle.trim() || !massTaskListId
                    }
                    onClick={handleMassTask}
                  >
                    {massSaving ? (
                      <CircularProgress size={20} />
                    ) : (
                      "Criar tarefas em massa"
                    )}
                  </Button>
                </Box>
              )}
            </Box>
            {massQuickRepliesOpen && massActionTab === 1 && (
              <QuickRepliesModal
                open={massQuickRepliesOpen}
                onClose={() => setMassQuickRepliesOpen(false)}
                onSelect={handleMassQuickReplySelect}
                variant="sidebar"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setMassQuickRepliesOpen(false);
              setMassActionModalOpen(false);
            }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal standalone de Automação por Etapa */}
      <Dialog
        open={stageAutomationModalOpen}
        onClose={() => setStageAutomationModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            borderRadius: 16,
            width: "min(780px, 96vw)",
            maxWidth: "96vw",
            maxHeight: "calc(100vh - 48px)",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle style={{ fontWeight: 800, paddingBottom: 0 }}>
          Automação — {stageAutomationStage?.name}
          <Typography
            variant="caption"
            display="block"
            style={{ color: "#6b7280", fontWeight: 400 }}
          >
            Configure ações automáticas para esta etapa do funil
          </Typography>
        </DialogTitle>
        <DialogContent
          style={{ minHeight: 220, paddingTop: 20, overflowY: "auto", flex: 1 }}
        >
          {stageAutomationStage && (
            <StageAutomationPanel
              stage={stageAutomationStage}
              whatsapps={stageAutomationWhatsapps}
              taskBoards={stageAutomationTaskBoards}
              stages={board.stages || []}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStageAutomationModalOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Universal Lead Modal */}
      <UniversalLeadModal
        open={universalModalOpen}
        onClose={() => setUniversalModalOpen(false)}
        op={selectedOp}
        onSuccess={fetchBoard}
      />

      {/* Modal de Detalhes e Feedback da IA */}
      <Dialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          style: { borderRadius: 20, border: "1px solid #cee1d5" },
        }}
      >
        <DialogTitle style={{ fontWeight: 900 }}>
          Inteligência de Vendas
        </DialogTitle>
        <DialogContent>
          {selectedOp && (
            <Box>
              <Typography
                variant="body2"
                paragraph
                style={{
                  backgroundColor: "#f8fcf9",
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid #d5e6db",
                }}
              >
                <LightbulbIcon
                  style={{
                    fontSize: 16,
                    color: "#1f9d55",
                    marginBottom: -3,
                    marginRight: 4,
                  }}
                />
                <strong>Análise do Sistema:</strong>{" "}
                {(selectedOp.prediction && selectedOp.prediction.explanation) ||
                  "Aguardando processamento heurístico..."}
              </Typography>

              <Box
                mt={3}
                p={2}
                style={{
                  backgroundColor: "#eaf8ef",
                  borderRadius: 12,
                  border: "1px solid #cde2d4",
                }}
              >
                <Typography
                  variant="subtitle2"
                  style={{ color: "#1c5f36", fontWeight: 700 }}
                  gutterBottom
                >
                  Essa sugestão foi útil?
                </Typography>
                <Box display="flex" gap={1} mt={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    style={{ backgroundColor: "#10b981", color: "#fff" }}
                    startIcon={<ThumbUpIcon />}
                    onClick={() => handleAiFeedback("AGREE")}
                  >
                    Sim
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    style={{ backgroundColor: "#ef4444", color: "#fff" }}
                    startIcon={<ThumbDownIcon />}
                    onClick={() => handleAiFeedback("DISAGREE")}
                  >
                    Não
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackOpen(false)} color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={keywordFilterModalOpen}
        onClose={() => setKeywordFilterModalOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          style: { borderRadius: 14, border: "1px solid #cee1d5" },
        }}
      >
        <DialogTitle style={{ fontWeight: 800 }}>
          Filtro por palavra-chave
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" style={{ color: "#5f7669", marginBottom: 12 }}>
            Busque em todas as etapas por nome, empresa, produto, origem,
            observações, anotações e campos personalizados do lead.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            variant="outlined"
            label="Palavra-chave"
            placeholder="Ex: imobiliária, clínica, escritório..."
            value={keywordFilterDraft}
            onChange={(event) => setKeywordFilterDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleApplyKeywordFilter();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClearKeywordFilter}>
            Limpar
          </Button>
          <Button onClick={() => setKeywordFilterModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleApplyKeywordFilter}
            variant="contained"
            style={{ backgroundColor: "#1f9d55", color: "#fff" }}
          >
            Aplicar filtro
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Filtros */}
      <Dialog
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        PaperProps={{
          style: { borderRadius: 16, border: "1px solid #cee1d5" },
        }}
      >
        <DialogTitle>Filtros Avançados</DialogTitle>
        <DialogContent>
          <Box
            display="flex"
            flexDirection="column"
            gap={3}
            mt={1}
            minWidth={300}
          >
            <FormControl fullWidth variant="outlined">
              <InputLabel>Nível de Risco</InputLabel>
              <Select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                label="Nível de Risco"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="LOW">Baixo</MenuItem>
                <MenuItem value="MEDIUM">Médio</MenuItem>
                <MenuItem value="HIGH">Alto</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={onlyAI}
                  onChange={(e) => setOnlyAI(e.target.checked)}
                  style={{ color: "#1f9d55" }}
                />
              }
              label="Apenas movidos por IA"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={onlyExpired}
                  onChange={(e) => setOnlyExpired(e.target.checked)}
                  style={{ color: "#1f9d55" }}
                />
              }
              label="Apenas SLA Vencido"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRiskFilter("");
              setOnlyAI(false);
              setOnlyExpired(false);
              setSort("CREATED_AT");
            }}
          >
            Limpar
          </Button>
          <Button
            onClick={() => setFilterModalOpen(false)}
            variant="contained"
            style={{ backgroundColor: "#1f9d55", color: "#fff" }}
          >
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>

      <ImportLeadsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        defaultPipelineId={selectedPipelineId}
        stageId={selectedStageToImport}
        onSuccess={handleImportSuccess}
      />
      <InternetLeadSearchModal
        open={internetSearchOpen}
        onClose={() => setInternetSearchOpen(false)}
        pipelines={pipelines}
        defaultPipelineId={selectedPipelineId}
        onImported={handleImportSuccess}
      />

      {/* CRM AI Assistant FAB */}
      <CrmAiFab
        onNewLead={() => {
          setSelectedOp(null);
          setUniversalModalOpen(true);
        }}
        pipelineId={selectedPipelineId || undefined}
      />
    </Box>
  );
};

const ACTION_TYPE_LABELS = {
  send_message: "Mensagem WhatsApp",
  create_task: "Criar Tarefa",
  create_note: "Criar Anotação",
  add_tag: "Aplicar Etiqueta",
  move_lead: "Mover de Etapa",
  call_task: "Tarefa de Ligação",
  ai_actions: "Ações da IA",
  remove_tag: "Remover Etiqueta",
  transfer_queue: "Transferir Fila",
  transfer_user: "Transferir Atendente",
  close_ticket: "Fechar Ticket",
  wait: "Aguardar",
};

const StageAutomationPanel = ({ stage, whatsapps, taskBoards, stages }) => {
  const [enabled, setEnabled] = useState(false);
  const [actions, setActions] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quickReplyModalIndex, setQuickReplyModalIndex] = useState(-1);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testOpportunityId, setTestOpportunityId] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [autoRes, tagsRes] = await Promise.all([
          api.get(`/pipelines/${stage.pipelineId}/stages/${stage.id}/automation`),
          api.get("/tags/list")
        ]);
        if (autoRes.data) {
          setEnabled(autoRes.data.isActive);
          setActions(autoRes.data.actions || []);
        } else {
          setEnabled(false);
          setActions([]);
        }
        setTags(tagsRes.data || []);
      } catch (err) {
        toast.error("Erro ao carregar dados de automação");
      } finally {
        setLoading(false);
      }
    };
    if (stage) {
      loadData();
    }
  }, [stage]);

  const handleSave = async () => {
    // Validar ações antes de salvar
    if (actions && Array.isArray(actions)) {
      for (const act of actions) {
        if (act.actionType === "add_tag" && !act.actionConfig?.tagId) {
          toast.error("Por favor, selecione uma etiqueta para a ação 'Aplicar Etiqueta'.");
          return;
        }
        if (act.actionType === "move_lead") {
          if (!act.actionConfig?.destinationStageId) {
            toast.error("Por favor, selecione a etapa de destino para a ação 'Mover Lead'.");
            return;
          }
          if (Number(act.actionConfig.destinationStageId) === Number(stage.id)) {
            toast.error("Não é permitido mover o lead para a mesma etapa em que ele já se encontra.");
            return;
          }
        }
        if (act.actionType === "send_message" && !act.actionConfig?.message?.trim() && !act.actionConfig?.quickReplyId) {
          toast.error("Por favor, digite a mensagem ou selecione uma resposta rápida.");
          return;
        }
        if (act.actionType === "create_task" && !act.actionConfig?.title?.trim()) {
          toast.error("Por favor, informe o título da tarefa.");
          return;
        }
        if (act.actionType === "create_note" && !act.actionConfig?.text?.trim()) {
          toast.error("Por favor, digite o conteúdo da anotação.");
          return;
        }
        if (act.actionType === "call_task" && !act.actionConfig?.title?.trim()) {
          toast.error("Por favor, informe o título da tarefa de ligação.");
          return;
        }
        if (act.actionType === "ai_actions") {
          const dur = parseInt(act.actionConfig?.duration, 10);
          if (act.actionConfig?.aiAction === "pause_for" && (!dur || dur <= 0)) {
            toast.error("Configure uma duração válida para a pausa da IA.");
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      await api.put(`/pipelines/${stage.pipelineId}/stages/${stage.id}/automation`, {
        isActive: enabled,
        actions: actions.map((act, idx) => ({
          ...act,
          order: idx
        }))
      });
      toast.success("Automação atualizada com sucesso!");
    } catch (err) {
      const errorMessage = err?.response?.data?.error || "Erro ao salvar automação";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAction = (type) => {
    let config = {};
    if (type === "send_message") config = { message: "", whatsappId: whatsapps[0]?.id || "", quickReplyId: null, quickReplyName: null, mediaId: null };
    else if (type === "create_task") config = { title: "", description: "", priority: "normal", listId: "" };
    else if (type === "create_note") config = { text: "" };
    else if (type === "add_tag") config = { tagId: "" };
    else if (type === "move_lead") config = { destinationStageId: "" };
    else if (type === "call_task") config = { title: "", description: "", priority: "high", listId: "" };
    else if (type === "ai_actions") config = { aiAction: "pause_for", duration: 24, unit: "hours", reason: "" };

    const newAction = {
      actionType: type,
      actionConfig: config,
      delayMinutes: 0
    };
    setActions([...actions, newAction]);
  };

  const handleRemoveAction = (index) => {
    setActions(actions.filter((_, idx) => idx !== index));
  };

  const handleUpdateAction = (index, field, value) => {
    setActions(actions.map((act, idx) => {
      if (idx === index) {
        if (field === "delayMinutes") {
          return { ...act, delayMinutes: Number(value) };
        }
        return {
          ...act,
          actionConfig: {
            ...act.actionConfig,
            [field]: value
          }
        };
      }
      return act;
    }));
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newActions = [...actions];
    const temp = newActions[index - 1];
    newActions[index - 1] = newActions[index];
    newActions[index] = temp;
    setActions(newActions);
  };

  const handleMoveDown = (index) => {
    if (index === actions.length - 1) return;
    const newActions = [...actions];
    const temp = newActions[index + 1];
    newActions[index + 1] = newActions[index];
    newActions[index] = temp;
    setActions(newActions);
  };

  const handleSelectQuickReply = (index, reply) => {
    setActions(actions.map((act, idx) => {
      if (idx !== index) return act;
      return {
        ...act,
        actionConfig: {
          ...act.actionConfig,
          quickReplyId: reply.id,
          quickReplyName: reply.shortcut || reply.message?.substring(0, 40) || `Resposta #${reply.id}`,
          message: act.actionConfig?.message || reply.message || ""
        }
      };
    }));
    setQuickReplyModalIndex(-1);
  };

  const handleClearQuickReply = (index) => {
    setActions(actions.map((act, idx) => {
      if (idx !== index) return act;
      return {
        ...act,
        actionConfig: {
          ...act.actionConfig,
          quickReplyId: null,
          quickReplyName: null
        }
      };
    }));
  };

  const handleOpenTestDialog = () => {
    const opps = stage?.opportunities || [];
    setTestOpportunityId(opps.length > 0 ? String(opps[0].id) : "");
    setTestResults(null);
    setTestDialogOpen(true);
  };

  const handleRunTest = async () => {
    if (!testOpportunityId) {
      toast.error("Selecione uma oportunidade para o teste.");
      return;
    }
    setTesting(true);
    setTestResults(null);
    try {
      const { data } = await api.post(
        `/pipelines/${stage.pipelineId}/stages/${stage.id}/automation/test`,
        { opportunityId: Number(testOpportunityId), skipDelays: true }
      );
      setTestResults(data);
    } catch (err) {
      const msg = err?.response?.data?.error || "Erro ao executar teste de automação";
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <CircularProgress size={32} color="primary" />
      </Box>
    );
  }

  const stageOpportunities = stage?.opportunities || [];

  return (
    <Box display="flex" flexDirection="column" style={{ gap: 16 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" p={2} style={{ backgroundColor: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <Box>
          <Typography variant="subtitle2" style={{ fontWeight: 800 }}>Ativar Automação da Etapa</Typography>
          <Typography variant="caption" style={{ color: "#6b7280" }}>Executa ações configuradas ao mover lead para esta etapa</Typography>
        </Box>
        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
          <Tooltip title="Testar automação manualmente">
            <span>
              <IconButton
                size="small"
                onClick={handleOpenTestDialog}
                disabled={!enabled || actions.length === 0}
                style={{
                  backgroundColor: enabled && actions.length > 0 ? "#effaf4" : undefined,
                  color: enabled && actions.length > 0 ? "#1f9d55" : undefined,
                  border: "1px solid #d1fae5",
                }}
              >
                <PlayArrowIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Switch
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            color="primary"
          />
        </Box>
      </Box>

      {enabled && (
        <>
          <Typography variant="subtitle2" style={{ fontWeight: 800 }}>Fluxo de Ações</Typography>
          <Box display="flex" flexWrap="wrap" style={{ gap: 8 }}>
            <Button size="small" variant="outlined" startIcon={<MessageIcon fontSize="small" />} onClick={() => handleAddAction("send_message")} style={{ borderRadius: 8, fontSize: "0.75rem" }}>
              Mensagem WhatsApp
            </Button>
            <Button size="small" variant="outlined" startIcon={<AssignmentIcon fontSize="small" />} onClick={() => handleAddAction("create_task")} style={{ borderRadius: 8, fontSize: "0.75rem" }}>
              Criar Tarefa
            </Button>
            <Button size="small" variant="outlined" startIcon={<NoteIcon fontSize="small" />} onClick={() => handleAddAction("create_note")} style={{ borderRadius: 8, fontSize: "0.75rem" }}>
              Adicionar Anotação
            </Button>
            <Button size="small" variant="outlined" startIcon={<FlashOnIcon fontSize="small" />} onClick={() => handleAddAction("add_tag")} style={{ borderRadius: 8, fontSize: "0.75rem" }}>
              Aplicar Etiqueta
            </Button>
            <Button size="small" variant="outlined" startIcon={<TimelineIcon fontSize="small" />} onClick={() => handleAddAction("move_lead")} style={{ borderRadius: 8, fontSize: "0.75rem" }}>
              Mover de Etapa
            </Button>
            <Button size="small" variant="outlined" startIcon={<SmartToyIcon fontSize="small" />} onClick={() => handleAddAction("ai_actions")} style={{ borderRadius: 8, fontSize: "0.75rem" }}>
              Ações da IA
            </Button>
          </Box>

          <Box display="flex" flexDirection="column" style={{ gap: 12 }}>
            {actions.length === 0 && (
              <Box p={4} display="flex" justifyContent="center" alignItems="center" style={{ border: "2px dashed #e5e7eb", borderRadius: 12 }}>
                <Typography variant="body2" style={{ color: "#9ca3af" }}>Nenhuma ação configurada ainda. Clique nos botões acima para adicionar!</Typography>
              </Box>
            )}
            {actions.map((action, index) => (
              <Box key={index} p={2} style={{ border: "1px solid #e5e7eb", borderRadius: 12, backgroundColor: "#fff", display: "flex", flexDirection: "column", gap: 12 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                    <Chip size="small" label={`Ordem ${index + 1}`} style={{ backgroundColor: "#effaf4", color: "#175c35", fontWeight: 700 }} />
                    <Typography variant="subtitle2" style={{ fontWeight: 800, textTransform: "uppercase", fontSize: "0.7rem", color: "#4b5563" }}>
                      {action.actionType === "send_message" && "WhatsApp"}
                      {action.actionType === "create_task" && "Criar Tarefa"}
                      {action.actionType === "create_note" && "Criar Anotação"}
                      {action.actionType === "add_tag" && "Aplicar Etiqueta"}
                      {action.actionType === "move_lead" && "Mover de Etapa"}
                      {action.actionType === "call_task" && "Tarefa de Ligação"}
                      {action.actionType === "ai_actions" && "Ações da IA"}
                    </Typography>
                  </Box>
                  <Box display="flex" style={{ gap: 4 }}>
                    <IconButton size="small" disabled={index === 0} onClick={() => handleMoveUp(index)}>
                      <ClockIcon style={{ transform: "rotate(-90deg)", fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" disabled={index === actions.length - 1} onClick={() => handleMoveDown(index)}>
                      <ClockIcon style={{ transform: "rotate(90deg)", fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" style={{ color: "#dc2626" }} onClick={() => handleRemoveAction(index)}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Aguardar (min)"
                      type="number"
                      size="small"
                      variant="outlined"
                      value={action.delayMinutes || 0}
                      onChange={(e) => handleUpdateAction(index, "delayMinutes", e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <Box display="flex" flexDirection="column" style={{ gap: 12 }}>
                      {action.actionType === "send_message" && (
                        <>
                          <FormControl variant="outlined" size="small" fullWidth>
                            <InputLabel>Conexão WhatsApp</InputLabel>
                            <Select
                              value={action.actionConfig?.whatsappId || ""}
                              onChange={(e) => handleUpdateAction(index, "whatsappId", e.target.value)}
                              label="Conexão WhatsApp"
                            >
                              {whatsapps.map(w => (
                                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          {action.actionConfig?.quickReplyId ? (
                            <Box display="flex" alignItems="center" style={{ gap: 8, padding: "6px 10px", backgroundColor: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                              <FlashOnIcon style={{ fontSize: 14, color: "#16a34a" }} />
                              <Typography variant="caption" style={{ color: "#15803d", flex: 1 }}>
                                Resposta rápida: {action.actionConfig?.quickReplyName || `ID ${action.actionConfig.quickReplyId}`}
                              </Typography>
                              <IconButton size="small" onClick={() => handleClearQuickReply(index)} style={{ padding: 2 }}>
                                <ClearIcon style={{ fontSize: 12, color: "#dc2626" }} />
                              </IconButton>
                            </Box>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<FlashOnIcon fontSize="small" />}
                              onClick={() => setQuickReplyModalIndex(index)}
                              style={{ borderRadius: 8, fontSize: "0.75rem", borderColor: "#d1d5db", color: "#374151" }}
                            >
                              Selecionar Resposta Rápida
                            </Button>
                          )}

                          <Box>
                            <Typography variant="caption" style={{ color: "#6b7280", display: "block", marginBottom: 4 }}>Variáveis:</Typography>
                            <Box display="flex" flexWrap="wrap" style={{ gap: 4 }}>
                              {QUICK_MESSAGE_VARIABLES.map(v => (
                                <Chip
                                  key={v.token}
                                  label={v.token}
                                  size="small"
                                  onClick={() => handleUpdateAction(index, "message", (action.actionConfig?.message || "") + v.token)}
                                  style={{ cursor: "pointer", fontSize: "0.68rem", backgroundColor: "#e0f2fe", color: "#0369a1" }}
                                />
                              ))}
                            </Box>
                          </Box>

                          <TextField
                            label="Mensagem do Disparo"
                            multiline
                            rows={3}
                            variant="outlined"
                            size="small"
                            value={action.actionConfig?.message || ""}
                            onChange={(e) => handleUpdateAction(index, "message", e.target.value)}
                            placeholder={action.actionConfig?.quickReplyId ? "Texto adicional (opcional, complementa a resposta rápida)" : "Digite a mensagem ou selecione uma resposta rápida acima"}
                            fullWidth
                          />
                        </>
                      )}

                      {action.actionType === "create_task" && (
                        <>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <TextField
                                label="Título da Tarefa"
                                variant="outlined"
                                size="small"
                                value={action.actionConfig?.title || ""}
                                onChange={(e) => handleUpdateAction(index, "title", e.target.value)}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControl variant="outlined" size="small" fullWidth>
                                <InputLabel>Lista de Tarefas</InputLabel>
                                <Select
                                  value={action.actionConfig?.listId || ""}
                                  onChange={(e) => handleUpdateAction(index, "listId", e.target.value)}
                                  label="Lista de Tarefas"
                                >
                                  {taskBoards.map(board =>
                                    (board.lists || []).map(list => (
                                      <MenuItem key={list.id} value={list.id}>
                                        {board.name} - {list.name}
                                      </MenuItem>
                                    ))
                                  )}
                                </Select>
                              </FormControl>
                            </Grid>
                          </Grid>
                          <TextField
                            label="Descrição da Tarefa"
                            multiline
                            rows={2}
                            variant="outlined"
                            size="small"
                            value={action.actionConfig?.description || ""}
                            onChange={(e) => handleUpdateAction(index, "description", e.target.value)}
                            fullWidth
                          />
                        </>
                      )}

                      {action.actionType === "create_note" && (
                        <TextField
                          label="Texto da Anotação"
                          multiline
                          rows={2}
                          variant="outlined"
                          size="small"
                          value={action.actionConfig?.text || ""}
                          onChange={(e) => handleUpdateAction(index, "text", e.target.value)}
                          fullWidth
                        />
                      )}

                      {action.actionType === "add_tag" && (
                        <FormControl variant="outlined" size="small" fullWidth>
                          <InputLabel>Selecionar Etiqueta</InputLabel>
                          <Select
                            value={action.actionConfig?.tagId || ""}
                            onChange={(e) => handleUpdateAction(index, "tagId", e.target.value)}
                            label="Selecionar Etiqueta"
                          >
                            {!Array.isArray(tags) || tags.length === 0 ? (
                              <MenuItem disabled value="">
                                <em>Nenhuma etiqueta cadastrada</em>
                              </MenuItem>
                            ) : (
                              tags.map(t => (
                                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                              ))
                            )}
                          </Select>
                        </FormControl>
                      )}

                      {action.actionType === "move_lead" && (
                        <FormControl variant="outlined" size="small" fullWidth>
                          <InputLabel>Mover para Etapa</InputLabel>
                          <Select
                            value={action.actionConfig?.destinationStageId || ""}
                            onChange={(e) => handleUpdateAction(index, "destinationStageId", e.target.value)}
                            label="Mover para Etapa"
                          >
                            {(stages || []).map(s => (
                              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {action.actionType === "call_task" && (
                        <>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <TextField
                                label="Título da Ligação"
                                variant="outlined"
                                size="small"
                                value={action.actionConfig?.title || ""}
                                onChange={(e) => handleUpdateAction(index, "title", e.target.value)}
                                placeholder="Ex: Telefonar para lead"
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControl variant="outlined" size="small" fullWidth>
                                <InputLabel>Lista de Tarefas</InputLabel>
                                <Select
                                  value={action.actionConfig?.listId || ""}
                                  onChange={(e) => handleUpdateAction(index, "listId", e.target.value)}
                                  label="Lista de Tarefas"
                                >
                                  {taskBoards.map(board =>
                                    (board.lists || []).map(list => (
                                      <MenuItem key={list.id} value={list.id}>
                                        {board.name} - {list.name}
                                      </MenuItem>
                                    ))
                                  )}
                                </Select>
                              </FormControl>
                            </Grid>
                          </Grid>
                          <TextField
                            label="Instruções da Ligação"
                            multiline
                            rows={2}
                            variant="outlined"
                            size="small"
                            value={action.actionConfig?.description || ""}
                            onChange={(e) => handleUpdateAction(index, "description", e.target.value)}
                            placeholder="Ex: Oferecer desconto especial de 10%..."
                            fullWidth
                          />
                        </>
                      )}

                      {action.actionType === "ai_actions" && (
                        <>
                          <FormControl variant="outlined" size="small" fullWidth>
                            <InputLabel>Ação</InputLabel>
                            <Select
                              value={action.actionConfig?.aiAction || "pause_for"}
                              onChange={(e) => handleUpdateAction(index, "aiAction", e.target.value)}
                              label="Ação"
                            >
                              <MenuItem value="pause_for">Pausar IA por tempo determinado</MenuItem>
                              <MenuItem value="disable_in_stage">Desativar IA enquanto estiver nesta etapa</MenuItem>
                              <MenuItem value="enable_ai">Reativar IA</MenuItem>
                            </Select>
                          </FormControl>

                          {action.actionConfig?.aiAction === "pause_for" && (
                            <Grid container spacing={1}>
                              <Grid item xs={6}>
                                <TextField
                                  label="Duração"
                                  type="number"
                                  variant="outlined"
                                  size="small"
                                  value={action.actionConfig?.duration ?? 24}
                                  onChange={(e) => handleUpdateAction(index, "duration", parseInt(e.target.value, 10) || 1)}
                                  inputProps={{ min: 1 }}
                                  fullWidth
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <FormControl variant="outlined" size="small" fullWidth>
                                  <InputLabel>Unidade</InputLabel>
                                  <Select
                                    value={action.actionConfig?.unit || "hours"}
                                    onChange={(e) => handleUpdateAction(index, "unit", e.target.value)}
                                    label="Unidade"
                                  >
                                    <MenuItem value="minutes">Minutos</MenuItem>
                                    <MenuItem value="hours">Horas</MenuItem>
                                    <MenuItem value="days">Dias</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                            </Grid>
                          )}

                          <TextField
                            label="Motivo / observação (opcional)"
                            variant="outlined"
                            size="small"
                            value={action.actionConfig?.reason || ""}
                            onChange={(e) => handleUpdateAction(index, "reason", e.target.value)}
                            placeholder="Ex: Lead entrou na base de clientes"
                            fullWidth
                          />
                        </>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Box>
        </>
      )}

      <Button
        variant="contained"
        fullWidth
        disabled={saving}
        onClick={handleSave}
        style={{
          marginTop: 8,
          backgroundColor: "#1f9d55",
          color: "#fff",
        }}
      >
        {saving ? (
          <CircularProgress size={20} style={{ color: "#fff" }} />
        ) : (
          "Salvar Configurações de Automação"
        )}
      </Button>

      <QuickRepliesModal
        open={quickReplyModalIndex >= 0}
        onClose={() => setQuickReplyModalIndex(-1)}
        onSelect={(_message, _file, _autoSend, reply) => {
          if (quickReplyModalIndex >= 0 && reply) {
            handleSelectQuickReply(quickReplyModalIndex, reply);
          }
        }}
      />

      {/* Dialog de Teste de Automação */}
      <Dialog
        open={testDialogOpen}
        onClose={() => { if (!testing) setTestDialogOpen(false); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle disableTypography style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box display="flex" alignItems="center" style={{ gap: 8 }}>
            <PlayArrowIcon style={{ color: "#1f9d55" }} />
            <Typography variant="h6" style={{ fontWeight: 800 }}>Testar Automação</Typography>
          </Box>
          <IconButton size="small" onClick={() => setTestDialogOpen(false)} disabled={testing}>
            <ClearIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" style={{ color: "#6b7280", marginBottom: 16 }}>
            Executa as ações configuradas nesta automação para a oportunidade selecionada.
            Os delays configurados são ignorados no teste.
          </Typography>

          {stageOpportunities.length === 0 ? (
            <Box p={3} style={{ backgroundColor: "#fef9c3", borderRadius: 8, border: "1px solid #fde047", textAlign: "center" }}>
              <Typography variant="body2" style={{ color: "#854d0e" }}>
                Nenhuma oportunidade nesta etapa. Mova um card para esta etapa antes de testar.
              </Typography>
            </Box>
          ) : (
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel>Selecionar Oportunidade para Teste</InputLabel>
              <Select
                value={testOpportunityId}
                onChange={(e) => setTestOpportunityId(e.target.value)}
                label="Selecionar Oportunidade para Teste"
                disabled={testing}
              >
                {stageOpportunities.map(op => (
                  <MenuItem key={op.id} value={String(op.id)}>
                    {op.title || op.contact?.name || `Oportunidade #${op.id}`}
                    {op.contact?.name && op.title ? ` — ${op.contact.name}` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {testResults && (
            <Box mt={2} display="flex" flexDirection="column" style={{ gap: 8 }}>
              <Typography variant="subtitle2" style={{ fontWeight: 800, marginTop: 8 }}>
                Resultado do Teste ({testResults.executedActions.filter(r => r.success).length}/{testResults.executedActions.length} ações executadas)
              </Typography>
              {testResults.executedActions.map((item, i) => (
                <Box
                  key={i}
                  display="flex"
                  alignItems="flex-start"
                  style={{
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 8,
                    backgroundColor: item.success ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${item.success ? "#bbf7d0" : "#fecaca"}`,
                  }}
                >
                  {item.success
                    ? <CheckCircleIcon style={{ color: "#16a34a", fontSize: 18, marginTop: 2, flexShrink: 0 }} />
                    : <ErrorOutlineIcon style={{ color: "#dc2626", fontSize: 18, marginTop: 2, flexShrink: 0 }} />
                  }
                  <Box>
                    <Typography variant="caption" style={{ fontWeight: 700, color: item.success ? "#15803d" : "#b91c1c", display: "block" }}>
                      Ação {item.order}: {ACTION_TYPE_LABELS[item.type] || item.type}
                    </Typography>
                    <Typography variant="caption" style={{ color: item.success ? "#166534" : "#991b1b" }}>
                      {item.message}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions style={{ padding: 16 }}>
          <Button onClick={() => setTestDialogOpen(false)} disabled={testing}>
            Fechar
          </Button>
          <Button
            variant="contained"
            onClick={handleRunTest}
            disabled={testing || stageOpportunities.length === 0 || !testOpportunityId}
            startIcon={testing ? <CircularProgress size={16} style={{ color: "#fff" }} /> : <PlayArrowIcon />}
            style={{ backgroundColor: "#1f9d55", color: "#fff" }}
          >
            {testing ? "Executando..." : "Executar Teste"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PipelineBoard;
