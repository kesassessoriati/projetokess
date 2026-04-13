import React, { useRef, useState, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Badge from "@material-ui/core/Badge";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Chip from "@material-ui/core/Chip";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Popover from "@material-ui/core/Popover";
import Switch from "@material-ui/core/Switch";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import NotificationsIcon from "@material-ui/icons/Notifications";
import NotificationsNoneIcon from "@material-ui/icons/NotificationsNone";
import NotificationsOffIcon from "@material-ui/icons/NotificationsOff";
import DoneAllIcon from "@material-ui/icons/DoneAll";
import SettingsIcon from "@material-ui/icons/Settings";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import AssignmentLateIcon from "@material-ui/icons/AssignmentLate";
import AssignmentIcon from "@material-ui/icons/Assignment";
import InfoIcon from "@material-ui/icons/Info";
import EventIcon from "@material-ui/icons/Event";
import MessageIcon from "@material-ui/icons/Message";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useHistory } from "react-router-dom";

import useNotifications from "../../hooks/useNotifications";

// ── Preference helpers ──────────────────────────────────────────────────────
const PREFS_KEY = "notificationPrefs";

const defaultPrefs = {
  inAppEnabled: true,
  emailEnabled: true,
  taskDue: true,
  taskOverdue: true,
  taskCreated: true,
  message: true,
  appointment: true,
  system: true,
};

const loadPrefs = () => {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : { ...defaultPrefs };
  } catch {
    return { ...defaultPrefs };
  }
};

const savePrefs = (prefs) => {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
};

// ── Styles ──────────────────────────────────────────────────────────────────
const useStyles = makeStyles((theme) => ({
  bellButton: {
    color: "#fff",
  },
  popoverPaper: {
    width: 380,
    maxWidth: "96vw",
    maxHeight: "70vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1.2, 1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: 15,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
  },
  smallBtn: {
    fontSize: 11,
    textTransform: "none",
    color: theme.palette.primary.main,
    minWidth: "auto",
    padding: "2px 6px",
  },
  listContainer: {
    overflowY: "auto",
    flexGrow: 1,
    ...theme.scrollbarStyles,
  },
  notificationItem: {
    padding: theme.spacing(1.2, 2),
    cursor: "pointer",
    transition: "background 0.15s",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  unreadItem: {
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.05)"
        : "rgba(25,118,210,0.05)",
    borderLeft: `3px solid ${theme.palette.primary.main}`,
  },
  readItem: {
    borderLeft: "3px solid transparent",
  },
  itemTitle: {
    fontWeight: 500,
    fontSize: 13,
    lineHeight: 1.3,
    marginBottom: 2,
  },
  itemBody: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    lineHeight: 1.3,
  },
  itemTime: {
    fontSize: 11,
    color: theme.palette.text.disabled,
    marginTop: 3,
  },
  typeIcon: {
    marginRight: theme.spacing(1),
    fontSize: 18,
    flexShrink: 0,
    marginTop: 2,
  },
  emptyState: {
    textAlign: "center",
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
  footer: {
    padding: theme.spacing(1),
    borderTop: `1px solid ${theme.palette.divider}`,
    textAlign: "center",
    flexShrink: 0,
  },
  loadMoreBtn: {
    fontSize: 12,
    textTransform: "none",
  },
  badge: {
    "& .MuiBadge-badge": {
      fontSize: 10,
      minWidth: 16,
      height: 16,
      padding: "0 4px",
    },
  },
  typeChip: {
    height: 16,
    fontSize: 10,
    marginLeft: 4,
    "& .MuiChip-label": {
      padding: "0 5px",
    },
  },
  // Settings panel
  settingsContainer: {
    overflowY: "auto",
    flexGrow: 1,
    padding: theme.spacing(0, 0, 1),
    ...theme.scrollbarStyles,
  },
  settingsSection: {
    padding: theme.spacing(1.5, 2, 0.5),
  },
  settingsSectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    color: theme.palette.text.disabled,
    letterSpacing: "0.08em",
    marginBottom: theme.spacing(0.5),
  },
  settingsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(0.4, 0),
  },
  settingsLabel: {
    fontSize: 13,
    color: theme.palette.text.primary,
  },
  settingsSubLabel: {
    fontSize: 11,
    color: theme.palette.text.secondary,
  },
}));

// ── Type config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  task_due:     { icon: AssignmentLateIcon, color: "#f57c00", label: "Prazo" },
  task_overdue: { icon: AssignmentLateIcon, color: "#d32f2f", label: "Atrasada" },
  task_created: { icon: AssignmentIcon,     color: "#1976d2", label: "Nova tarefa" },
  message:      { icon: MessageIcon,        color: "#388e3c", label: "Mensagem" },
  appointment:  { icon: EventIcon,          color: "#7b1fa2", label: "Reunião" },
  system:       { icon: InfoIcon,           color: "#607d8b", label: "Sistema" },
};

const getTypeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.system;

// ── Component ────────────────────────────────────────────────────────────────
const NotificationCenter = () => {
  const classes = useStyles();
  const history = useHistory();
  const anchorEl = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState(loadPrefs);

  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    markRead,
    markAllRead,
    loadMore,
  } = useNotifications();

  const handleOpen = () => {
    setShowSettings(false);
    setIsOpen(true);
  };
  const handleClose = () => setIsOpen(false);

  const handleItemClick = (notification) => {
    if (notification.status === "unread") markRead(notification.id);
    const taskId = notification?.metadata?.taskId;
    if (taskId) {
      handleClose();
      history.push(`/tasks?taskId=${taskId}`);
      return;
    }
  };

  const handlePrefChange = useCallback((key) => (e) => {
    const updated = { ...prefs, [key]: e.target.checked };
    setPrefs(updated);
    savePrefs(updated);
  }, [prefs]);

  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
    } catch {
      return "";
    }
  };

  // Filter notifications based on user prefs
  const visibleNotifications = notifications.filter((n) => {
    if (!prefs.inAppEnabled) return false;
    const key = n.type === "task_due" ? "taskDue"
      : n.type === "task_overdue" ? "taskOverdue"
      : n.type === "task_created" ? "taskCreated"
      : n.type;
    return prefs[key] !== false;
  });

  return (
    <>
      <Tooltip title="Central de Notificações">
        <IconButton
          className={classes.bellButton}
          onClick={handleOpen}
          ref={anchorEl}
          aria-label="Notificações"
        >
          <Badge
            badgeContent={unreadCount > 0 ? unreadCount : null}
            color="error"
            className={classes.badge}
            max={99}
          >
            {!prefs.inAppEnabled ? (
              <NotificationsOffIcon color="inherit" />
            ) : unreadCount > 0 ? (
              <NotificationsIcon color="inherit" />
            ) : (
              <NotificationsNoneIcon color="inherit" />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        disableScrollLock
        open={isOpen}
        anchorEl={anchorEl.current}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        classes={{ paper: classes.popoverPaper }}
        onClose={handleClose}
      >
        {/* ── Header ── */}
        <div className={classes.header}>
          <div className={classes.headerLeft}>
            {showSettings ? (
              <Tooltip title="Voltar">
                <IconButton size="small" onClick={() => setShowSettings(false)}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            <Typography className={classes.headerTitle}>
              {showSettings ? "Preferências" : (
                <>
                  Notificações{" "}
                  {unreadCount > 0 && (
                    <Chip
                      label={unreadCount}
                      color="primary"
                      size="small"
                      className={classes.typeChip}
                    />
                  )}
                </>
              )}
            </Typography>
          </div>

          <div className={classes.headerActions}>
            {!showSettings && unreadCount > 0 && (
              <Tooltip title="Marcar todas como lidas">
                <Button
                  className={classes.smallBtn}
                  startIcon={<DoneAllIcon style={{ fontSize: 14 }} />}
                  onClick={markAllRead}
                  size="small"
                >
                  Marcar todas
                </Button>
              </Tooltip>
            )}
            <Tooltip title={showSettings ? "Fechar preferências" : "Preferências de notificações"}>
              <IconButton size="small" onClick={() => setShowSettings((v) => !v)}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* ── Settings panel ── */}
        {showSettings ? (
          <div className={classes.settingsContainer}>
            {/* Canais */}
            <div className={classes.settingsSection}>
              <Typography className={classes.settingsSectionTitle}>Canais</Typography>
              <Divider />
              <div className={classes.settingsRow}>
                <div>
                  <Typography className={classes.settingsLabel}>Notificações no app</Typography>
                  <Typography className={classes.settingsSubLabel}>Exibe alertas dentro do sistema</Typography>
                </div>
                <Switch
                  size="small"
                  checked={prefs.inAppEnabled}
                  onChange={handlePrefChange("inAppEnabled")}
                  color="primary"
                />
              </div>
              <div className={classes.settingsRow}>
                <div>
                  <Typography className={classes.settingsLabel}>Notificações por e-mail</Typography>
                  <Typography className={classes.settingsSubLabel}>Envia e-mail para lembretes de tarefas</Typography>
                </div>
                <Switch
                  size="small"
                  checked={prefs.emailEnabled}
                  onChange={handlePrefChange("emailEnabled")}
                  color="primary"
                />
              </div>
            </div>

            {/* Tipos */}
            <div className={classes.settingsSection}>
              <Typography className={classes.settingsSectionTitle}>Tipos de notificação</Typography>
              <Divider />
              {[
                { key: "taskDue",     label: "Tarefa próxima do prazo",  sub: "Aviso quando uma tarefa vence em até 24h" },
                { key: "taskOverdue", label: "Tarefa atrasada",           sub: "Aviso quando o prazo de uma tarefa passou" },
                { key: "taskCreated", label: "Nova tarefa atribuída",     sub: "Quando uma tarefa for criada para você" },
                { key: "message",     label: "Mensagens",                 sub: "Notificações de novas mensagens" },
                { key: "appointment", label: "Reuniões / Compromissos",   sub: "Lembretes de agenda" },
                { key: "system",      label: "Sistema",                   sub: "Alertas gerais do sistema" },
              ].map(({ key, label, sub }) => (
                <div key={key} className={classes.settingsRow}>
                  <div>
                    <Typography className={classes.settingsLabel}>{label}</Typography>
                    <Typography className={classes.settingsSubLabel}>{sub}</Typography>
                  </div>
                  <Switch
                    size="small"
                    checked={prefs[key] !== false}
                    onChange={handlePrefChange(key)}
                    color="primary"
                    disabled={!prefs.inAppEnabled}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Notifications list ── */
          <>
            <div className={classes.listContainer}>
              {loading && visibleNotifications.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <CircularProgress size={24} />
                </Box>
              ) : visibleNotifications.length === 0 ? (
                <div className={classes.emptyState}>
                  {prefs.inAppEnabled ? (
                    <>
                      <NotificationsNoneIcon style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }} />
                      <Typography variant="body2">Nenhuma notificação</Typography>
                    </>
                  ) : (
                    <>
                      <NotificationsOffIcon style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }} />
                      <Typography variant="body2">Notificações no app desativadas</Typography>
                      <Button
                        size="small"
                        color="primary"
                        style={{ marginTop: 8, fontSize: 12, textTransform: "none" }}
                        onClick={() => setShowSettings(true)}
                      >
                        Abrir preferências
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <List disablePadding>
                  {visibleNotifications.map((n, idx) => {
                    const cfg = getTypeConfig(n.type);
                    const TypeIcon = cfg.icon;
                    const isUnread = n.status === "unread";

                    return (
                      <React.Fragment key={n.id}>
                        {idx > 0 && <Divider component="li" />}
                        <ListItem
                          className={`${classes.notificationItem} ${
                            isUnread ? classes.unreadItem : classes.readItem
                          }`}
                          onClick={() => handleItemClick(n)}
                          alignItems="flex-start"
                        >
                          <TypeIcon
                            className={classes.typeIcon}
                            style={{ color: cfg.color }}
                          />
                          <ListItemText
                            disableTypography
                            primary={
                              <Typography className={classes.itemTitle}>
                                {n.title}
                                <Chip
                                  label={cfg.label}
                                  size="small"
                                  className={classes.typeChip}
                                  style={{ backgroundColor: cfg.color, color: "#fff" }}
                                />
                              </Typography>
                            }
                            secondary={
                              <>
                                {n.body && (
                                  <Typography className={classes.itemBody} noWrap>
                                    {n.body}
                                  </Typography>
                                )}
                                <Typography className={classes.itemTime}>
                                  {formatTime(n.createdAt)}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </div>

            {hasMore && (
              <div className={classes.footer}>
                <Button
                  className={classes.loadMoreBtn}
                  onClick={loadMore}
                  disabled={loading}
                  size="small"
                >
                  {loading ? <CircularProgress size={14} /> : "Carregar mais"}
                </Button>
              </div>
            )}
          </>
        )}
      </Popover>
    </>
  );
};

export default NotificationCenter;
