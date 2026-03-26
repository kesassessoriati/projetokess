import React, { useRef, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Badge from "@material-ui/core/Badge";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Chip from "@material-ui/core/Chip";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Popover from "@material-ui/core/Popover";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import NotificationsIcon from "@material-ui/icons/Notifications";
import NotificationsNoneIcon from "@material-ui/icons/NotificationsNone";
import DoneAllIcon from "@material-ui/icons/DoneAll";
import AssignmentLateIcon from "@material-ui/icons/AssignmentLate";
import AssignmentIcon from "@material-ui/icons/Assignment";
import InfoIcon from "@material-ui/icons/Info";
import EventIcon from "@material-ui/icons/Event";
import MessageIcon from "@material-ui/icons/Message";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import useNotifications from "../../hooks/useNotifications";

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
    padding: theme.spacing(1.5, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: 15,
  },
  markAllBtn: {
    fontSize: 11,
    textTransform: "none",
    color: theme.palette.primary.main,
    minWidth: "auto",
    padding: "2px 8px",
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
}));

const TYPE_CONFIG = {
  task_due: { icon: AssignmentLateIcon, color: "#f57c00", label: "Prazo" },
  task_overdue: { icon: AssignmentLateIcon, color: "#d32f2f", label: "Atrasada" },
  task_created: { icon: AssignmentIcon, color: "#1976d2", label: "Nova tarefa" },
  message: { icon: MessageIcon, color: "#388e3c", label: "Mensagem" },
  appointment: { icon: EventIcon, color: "#7b1fa2", label: "Reunião" },
  system: { icon: InfoIcon, color: "#607d8b", label: "Sistema" },
};

const getTypeConfig = (type) =>
  TYPE_CONFIG[type] || TYPE_CONFIG.system;

const NotificationCenter = () => {
  const classes = useStyles();
  const anchorEl = useRef();
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    markRead,
    markAllRead,
    loadMore,
  } = useNotifications();

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleItemClick = (notification) => {
    if (notification.status === "unread") {
      markRead(notification.id);
    }
    // Future: navigate to task/ticket based on metadata
  };

  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "";
    }
  };

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
            {unreadCount > 0 ? (
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
        {/* Header */}
        <div className={classes.header}>
          <Typography className={classes.headerTitle}>
            Notificações{" "}
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                color="primary"
                size="small"
                className={classes.typeChip}
              />
            )}
          </Typography>
          {unreadCount > 0 && (
            <Tooltip title="Marcar todas como lidas">
              <Button
                className={classes.markAllBtn}
                startIcon={<DoneAllIcon style={{ fontSize: 14 }} />}
                onClick={markAllRead}
                size="small"
              >
                Marcar todas
              </Button>
            </Tooltip>
          )}
        </div>

        {/* Notification list */}
        <div className={classes.listContainer}>
          {loading && notifications.length === 0 ? (
            <Box textAlign="center" py={4}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <div className={classes.emptyState}>
              <NotificationsNoneIcon
                style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}
              />
              <Typography variant="body2">
                Nenhuma notificação
              </Typography>
            </div>
          ) : (
            <List disablePadding>
              {notifications.map((n, idx) => {
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
                              <Typography
                                className={classes.itemBody}
                                noWrap
                              >
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

        {/* Footer: load more */}
        {hasMore && (
          <div className={classes.footer}>
            <Button
              className={classes.loadMoreBtn}
              onClick={loadMore}
              disabled={loading}
              size="small"
            >
              {loading ? (
                <CircularProgress size={14} />
              ) : (
                "Carregar mais"
              )}
            </Button>
          </div>
        )}
      </Popover>
    </>
  );
};

export default NotificationCenter;
