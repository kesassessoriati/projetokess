import React, { useContext, useState } from "react";
import {
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  makeStyles,
  Typography,
  Tooltip,
} from "@material-ui/core";

import { useHistory, useParams } from "react-router-dom";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useDate } from "../../hooks/useDate";

import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";

import ConfirmationModal from "../../components/ConfirmationModal";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    height: "calc(100% - 58px)",
    overflow: "hidden",
    borderRadius: 0,
    backgroundColor: theme.mode === 'light' ? "#f2f2f2" : "#7f7f7f",
  },
  chatList: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  listItemActive: {
    cursor: "pointer",
    backgroundColor: theme.palette.background.paper,
    borderLeft: "6px solid #002d6e",
  },
  listItem: {
    cursor: "pointer",
    backgroundColor: theme.palette.background.color,
  },
  secondaryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tagDotRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  tagDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    boxShadow: "0 0 0 2px rgba(15,23,42,0.15)",
  },
}));

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

  const getPrimaryText = (chat) => {
    const mainText = chat.title || "Sem título";
    const unreads = unreadMessages(chat);
    return (
      <>
        <Typography variant="body1" component="span" style={{ fontWeight: unreads > 0 ? 700 : 400 }}>
          {mainText}
        </Typography>
        {unreads > 0 && (
          <Chip
            size="small"
            style={{ marginLeft: 8, height: 20, fontSize: "0.75rem" }}
            label={unreads}
            color="secondary"
          />
        )}
      </>
    );
  };

  const getSecondaryText = (chat) => {
    return (
      <div className={classes.secondaryRow}>
        <Typography variant="caption" color="textSecondary">
          {datetimeToClient(chat.updatedAt)}
        </Typography>
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
    );
  };

  return (
    <>
      <ConfirmationModal
        title={"Excluir Conversa"}
        open={confirmationModal}
        onClose={setConfirmModalOpen}
        onConfirm={handleDelete}
      >
        Esta ação não pode ser revertida, confirmar?
      </ConfirmationModal>
      <div className={classes.mainContainer}>
        <div className={classes.chatList}>
          <List>
            {Array.isArray(chats) &&
              chats.map((chat, key) => (
                <ListItem
                  onClick={() => goToMessages(chat)}
                  key={chat.id || key}
                  className={chat.uuid === id ? classes.listItemActive : classes.listItem}
                  button
                  divider
                >
                  <ListItemText
                    primary={getPrimaryText(chat)}
                    secondary={getSecondaryText(chat)}
                  />
                  {chat.ownerId === user?.id && (
                    <ListItemSecondaryAction style={{ display: "flex", gap: "4px" }}>
                      <IconButton
                        onClick={() => {
                          handleEditChat(chat);
                        }}
                        size="small"
                        style={{
                          backgroundColor: "rgba(64, 191, 255, 0.1)",
                          color: "#40BFFF",
                          padding: "6px",
                          borderRadius: "8px",
                        }}
                        title="Editar"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        onClick={() => {
                          setSelectedChat(chat);
                          setConfirmModalOpen(true);
                        }}
                        size="small"
                        style={{
                          backgroundColor: "rgba(255, 107, 107, 0.1)",
                          color: "#FF6B6B",
                          padding: "6px",
                          borderRadius: "8px",
                        }}
                        title="Excluir"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
          </List>
        </div>
      </div>
    </>
  );
}
