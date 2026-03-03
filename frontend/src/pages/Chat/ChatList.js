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
  },
  chatList: {
    flex: 1,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  listItem: {
    cursor: "pointer",
    padding: "10px 14px",
    transition: "background 0.15s",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
    "&:hover": {
      backgroundColor: theme.mode === "light" ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
    },
  },
  listItemActive: {
    cursor: "pointer",
    padding: "10px 14px",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
    backgroundColor: theme.mode === "light" ? "#e8f5e9" : "rgba(78,194,78,0.12)",
    borderLeft: "4px solid #4ec24e",
    "&:hover": {
      backgroundColor: theme.mode === "light" ? "#dff0df" : "rgba(78,194,78,0.18)",
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
    width: 42,
    height: 42,
    fontSize: "0.9rem",
    fontWeight: 700,
    flexShrink: 0,
    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  chatTitle: {
    fontWeight: 700,
    fontSize: "0.88rem",
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
  },
  chatTime: {
    fontSize: "0.7rem",
    color: theme.palette.text.secondary,
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  lastMessage: {
    fontSize: "0.78rem",
    color: theme.palette.text.secondary,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.3,
    maxWidth: "100%",
  },
  unreadBadge: {
    "& .MuiBadge-badge": {
      backgroundColor: "#4ec24e",
      color: "#fff",
      fontWeight: 700,
      fontSize: "0.7rem",
      minWidth: 18,
      height: 18,
      borderRadius: 9,
    },
  },
  actions: {
    display: "flex",
    gap: 4,
    flexShrink: 0,
    marginLeft: 4,
  },
  actionBtn: {
    padding: 5,
    borderRadius: 8,
  },
  tagDotRow: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
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
    "#7b5ea7", "#2196f3", "#4caf50", "#f44336",
    "#ff9800", "#00bcd4", "#e91e63", "#009688",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");

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
      } catch (err) { }
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
      ? chat.lastMessage.substring(0, 55) + "…"
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
                        <Avatar
                          className={classes.avatar}
                          style={{ backgroundColor: color }}
                        >
                          {initials || <GroupIcon style={{ fontSize: 20 }} />}
                        </Avatar>
                      </Badge>

                      <div className={classes.textBlock}>
                        <div className={classes.titleRow}>
                          <Typography
                            className={classes.chatTitle}
                            style={{ fontWeight: unreads > 0 ? 800 : 600 }}
                          >
                            {title}
                          </Typography>
                          <Typography className={classes.chatTime}>
                            {datetimeToClient(chat.updatedAt)}
                          </Typography>
                        </div>

                        {lastMsg ? (
                          <Typography
                            className={classes.lastMessage}
                            style={{ fontWeight: unreads > 0 ? 600 : 400 }}
                          >
                            {lastMsg}
                          </Typography>
                        ) : (
                          <Typography className={classes.lastMessage}>
                            {Array.isArray(chat.users) ? `${chat.users.length} participantes` : "Sem mensagens"}
                          </Typography>
                        )}

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
                        <div className={classes.actions} onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Editar">
                            <IconButton
                              className={classes.actionBtn}
                              size="small"
                              style={{ color: "#40BFFF", backgroundColor: "rgba(64,191,255,0.1)" }}
                              onClick={() => handleEditChat(chat)}
                            >
                              <EditIcon style={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton
                              className={classes.actionBtn}
                              size="small"
                              style={{ color: "#FF6B6B", backgroundColor: "rgba(255,107,107,0.1)" }}
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
