import React, { useState } from "react";
import {
  Avatar,
  Badge,
  IconButton,
  List,
  ListItem,
  makeStyles,
  Tooltip,
  Typography,
} from "@material-ui/core";

import { useHistory, useParams } from "react-router-dom";
import { useDate } from "../../hooks/useDate";

import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import GroupIcon from "@material-ui/icons/Group";

import ConfirmationModal from "../../components/ConfirmationModal";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    height: "calc(100% - 58px)",
    overflow: "hidden",
    padding: "0 12px 14px",
  },
  summaryBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "0 8px 12px",
  },
  summaryText: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "#334155",
  },
  summaryBadge: {
    minWidth: 28,
    height: 28,
    padding: "0 10px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
    color: "#1d4ed8",
    fontSize: "0.78rem",
    fontWeight: 800,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
  },
  chatList: {
    flex: 1,
    overflowY: "auto",
    ...theme.scrollbarStyles,
    paddingRight: 4,
  },
  listItem: {
    cursor: "pointer",
    padding: "14px 14px",
    transition: "all 0.18s ease",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 18,
    marginBottom: 10,
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
    "&:hover": {
      background: "linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)",
      borderColor: "rgba(59,130,246,0.28)",
      boxShadow: "0 14px 30px rgba(15,23,42,0.09)",
      transform: "translateY(-1px)",
    },
  },
  listItemActive: {
    cursor: "pointer",
    padding: "14px 14px",
    border: "1px solid rgba(37,99,235,0.2)",
    borderRadius: 18,
    marginBottom: 10,
    background:
      "linear-gradient(135deg, rgba(219,234,254,0.95) 0%, rgba(240,253,250,0.96) 100%)",
    boxShadow: "0 18px 40px rgba(37,99,235,0.14)",
    position: "relative",
    "&::before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: 14,
      bottom: 14,
      width: 4,
      borderRadius: 999,
      background: "linear-gradient(180deg, #2563eb 0%, #10b981 100%)",
    },
    "&:hover": {
      background:
        "linear-gradient(135deg, rgba(219,234,254,1) 0%, rgba(236,253,245,1) 100%)",
    },
  },
  itemContent: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    minWidth: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    fontSize: "0.95rem",
    fontWeight: 700,
    flexShrink: 0,
    boxShadow: "0 10px 22px rgba(15,23,42,0.18)",
    border: "2px solid rgba(255,255,255,0.9)",
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  chatTitle: {
    fontWeight: 700,
    fontSize: "0.92rem",
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
    color: "#0f172a",
  },
  chatTime: {
    fontSize: "0.72rem",
    color: "#64748b",
    flexShrink: 0,
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  lastMessage: {
    fontSize: "0.8rem",
    color: "#475569",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.35,
    maxWidth: "100%",
  },
  unreadBadge: {
    "& .MuiBadge-badge": {
      background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
      color: "#fff",
      fontWeight: 700,
      fontSize: "0.7rem",
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      boxShadow: "0 6px 12px rgba(34,197,94,0.35)",
    },
  },
  actions: {
    display: "flex",
    gap: 4,
    flexShrink: 0,
    marginLeft: 4,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 10,
  },
  tagDotRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    boxShadow: "0 0 0 1.5px rgba(15,23,42,0.12)",
  },
}));

const stringToColor = (str = "") => {
  const colors = [
    "#7b5ea7",
    "#2196f3",
    "#4caf50",
    "#f44336",
    "#ff9800",
    "#00bcd4",
    "#e91e63",
    "#009688",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

export default function ChatList({
  chats,
  selectChat,
  handleDeleteChat,
  handleEditChat,
  user,
}) {
  const classes = useStyles();
  const history = useHistory();
  const { datetimeToClient } = useDate();

  const [confirmationModal, setConfirmModalOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState({});

  const { id } = useParams();

  const goToMessages = async (chat) => {
    if (unreadMessages(chat) > 0) {
      try {
        await api.post(`/chats/${chat.id}/read`, { userId: user.id });
      } catch (err) {}
    }
    if (id !== chat.uuid) {
      selectChat(chat);
      history.push(`/chats/${chat.uuid}`);
    }
  };

  const handleDelete = () => {
    handleDeleteChat(selectedChat);
  };

  const unreadMessages = (chat) => {
    if (!chat || !chat.users) return 0;
    const currentUser = chat.users.find((u) => u.userId === user.id);
    return currentUser ? currentUser.unreads : 0;
  };

  const formatLastMessage = (chat) => {
    if (!chat.lastMessage) return null;
    return chat.lastMessage.length > 55
      ? `${chat.lastMessage.substring(0, 55)}...`
      : chat.lastMessage;
  };

  return (
    <>
      <ConfirmationModal
        title="Excluir Conversa"
        open={confirmationModal}
        onClose={setConfirmModalOpen}
        onConfirm={handleDelete}
      >
        Esta ação não pode ser revertida, confirmar?
      </ConfirmationModal>

      <div className={classes.mainContainer}>
        <div className={classes.summaryBar}>
          <Typography className={classes.summaryText}>Conversas ativas</Typography>
          <span className={classes.summaryBadge}>
            {Array.isArray(chats) ? chats.length : 0}
          </span>
        </div>

        <div className={classes.chatList}>
          <List disablePadding>
            {Array.isArray(chats) &&
              chats.map((chat, key) => {
                const unreads = unreadMessages(chat);
                const isActive = chat.uuid === id;
                const title = chat.title || "Sem título";
                const color = stringToColor(title);
                const initials = getInitials(title);
                const lastMsg = formatLastMessage(chat);

                return (
                  <ListItem
                    key={chat.id || key}
                    onClick={() => goToMessages(chat)}
                    className={isActive ? classes.listItemActive : classes.listItem}
                    button
                  >
                    <div className={classes.itemContent}>
                      <Badge
                        badgeContent={unreads}
                        className={classes.unreadBadge}
                        invisible={unreads === 0}
                        overlap="circular"
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      >
                        <Avatar className={classes.avatar} style={{ backgroundColor: color }}>
                          {initials || <GroupIcon style={{ fontSize: 20 }} />}
                        </Avatar>
                      </Badge>

                      <div className={classes.textBlock}>
                        <Typography
                          className={classes.chatTitle}
                          style={{ fontWeight: unreads > 0 ? 800 : 700 }}
                        >
                          {title}
                        </Typography>

                        <div className={classes.titleRow}>
                          {lastMsg ? (
                            <Typography
                              className={classes.lastMessage}
                              style={{ fontWeight: unreads > 0 ? 700 : 500 }}
                            >
                              {lastMsg}
                            </Typography>
                          ) : (
                            <Typography className={classes.lastMessage}>
                              {Array.isArray(chat.users)
                                ? `${chat.users.length} participantes`
                                : "Sem mensagens"}
                            </Typography>
                          )}
                          <Typography className={classes.chatTime}>
                            {datetimeToClient(chat.updatedAt)}
                          </Typography>
                        </div>

                        {Array.isArray(chat.tags) && chat.tags.length > 0 && (
                          <div className={classes.tagDotRow}>
                            {chat.tags.map((tag) => (
                              <Tooltip key={tag.id} title={tag.name} placement="top">
                                <span
                                  className={classes.tagDot}
                                  style={{ backgroundColor: tag.color || "#999" }}
                                />
                              </Tooltip>
                            ))}
                          </div>
                        )}
                      </div>

                      {chat.ownerId === user?.id && (
                        <div
                          className={classes.actions}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip title="Editar">
                            <IconButton
                              className={classes.actionBtn}
                              size="small"
                              style={{
                                color: "#0284c7",
                                backgroundColor: "rgba(14,165,233,0.12)",
                              }}
                              onClick={() => handleEditChat(chat)}
                            >
                              <EditIcon style={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton
                              className={classes.actionBtn}
                              size="small"
                              style={{
                                color: "#dc2626",
                                backgroundColor: "rgba(248,113,113,0.14)",
                              }}
                              onClick={() => {
                                setSelectedChat(chat);
                                setConfirmModalOpen(true);
                              }}
                            >
                              <DeleteIcon style={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </ListItem>
                );
              })}
          </List>
        </div>
      </div>
    </>
  );
}
