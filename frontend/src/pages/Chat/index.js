import React, { useContext, useEffect, useRef, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  makeStyles,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@material-ui/core";
import ChatList from "./ChatList";
import ChatMessages from "./ChatMessages";
import { UsersFilter } from "../../components/UsersFilter";
import api from "../../services/api";
import { has, isObject } from "lodash";
import { AuthContext } from "../../context/Auth/AuthContext";
import withWidth, { isWidthUp } from "@material-ui/core/withWidth";
import { i18n } from "../../translate/i18n";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import CancelIcon from "@mui/icons-material/Cancel";
import ForumIcon from "@mui/icons-material/Forum";
import useSafeApi from "../../hooks/useSafeApi";
import { useSocket } from "../../context/SocketContext";
import SafeComponent from "../../components/SafeComponent";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    height: "calc(100% - 48px)",
    overflowY: "hidden",
    padding: theme.spacing(2),
    background:
      "radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 28%), linear-gradient(180deg, #f6f8fc 0%, #eef3f8 100%)",
  },
  gridContainer: {
    flex: 1,
    height: "100%",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    background: "rgba(255,255,255,0.84)",
    backdropFilter: "blur(14px)",
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0 22px 55px rgba(15,23,42,0.12)",
  },
  gridItem: {
    height: "100%",
  },
  btnContainer: {
    padding: "18px 18px 12px",
  },
  sidebarPanel: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background:
      "linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(239,246,255,0.94) 100%)",
    borderRight: "1px solid rgba(148,163,184,0.16)",
  },
  sidebarHeader: {
    padding: "20px 18px 0",
  },
  sidebarEyebrow: {
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#2563eb",
    marginBottom: 6,
  },
  sidebarTitle: {
    fontSize: "1.12rem",
    fontWeight: 800,
    color: "#0f172a",
  },
  sidebarSubtitle: {
    fontSize: "0.84rem",
    color: "#475569",
    marginTop: 4,
    lineHeight: 1.5,
  },
  addButton: {
    color: "#fff",
    background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
    boxShadow: "0 14px 30px rgba(34,197,94,0.28)",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 800,
    textTransform: "none",
    "&:hover": {
      background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
      boxShadow: "0 18px 36px rgba(34,197,94,0.34)",
    },
  },
  mobileTabs: {
    margin: "0 18px 12px",
    padding: 4,
    background: "#e2e8f0",
    borderRadius: 14,
    minHeight: 48,
    "& .MuiTabs-indicator": {
      height: "calc(100% - 8px)",
      borderRadius: 12,
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      zIndex: 0,
    },
  },
  mobileTab: {
    minHeight: 40,
    borderRadius: 10,
    fontWeight: 700,
    textTransform: "none",
    color: "#334155",
    zIndex: 1,
    "&.Mui-selected": {
      color: "#ffffff",
    },
  },
  messagePanel: {
    height: "100%",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%)",
  },
  emptyChat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 14,
    padding: 32,
    background:
      "radial-gradient(circle at top, rgba(37,99,235,0.08), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(241,245,249,0.92))",
  },
  emptyIconWrap: {
    width: 92,
    height: 92,
    borderRadius: 28,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.14))",
    color: "#1d4ed8",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
  },
  emptyTitle: {
    fontWeight: 800,
    color: "#0f172a",
  },
  emptyText: {
    maxWidth: 360,
    textAlign: "center",
    color: "#475569",
    lineHeight: 1.6,
  },
}));

export function ChatModal({
  open,
  chat,
  type,
  handleClose,
  handleLoadNewChat,
}) {
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    setTitle("");
    setUsers([]);
    if (type === "edit") {
      const userList = chat.users.map((u) => ({
        id: u.user.id,
        name: u.user.name,
      }));
      setUsers(userList);
      setTitle(chat.title);
    }
  }, [chat, open, type]);

  const handleSave = async () => {
    try {
      if (type === "edit") {
        await api.put(`/chats/${chat.id}`, {
          users,
          title,
        });
      } else {
        const { data } = await api.post("/chats", {
          users,
          title,
        });
        handleLoadNewChat(data);
        window.location.reload();
      }
      handleClose();
    } catch (err) {}
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {i18n.t("chatInternal.modal.title")}
      </DialogTitle>
      <DialogContent>
        <Grid spacing={2} container>
          <Grid xs={12} style={{ padding: 18 }} item>
            <TextField
              label="Título"
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
            />
          </Grid>
          <Grid xs={12} item>
            <UsersFilter
              onFiltered={(filteredUsers) => setUsers(filteredUsers)}
              initialUsers={users}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          startIcon={<CancelIcon />}
          style={{
            color: "white",
            backgroundColor: "#db6565",
            boxShadow: "none",
            borderRadius: 8,
          }}
        >
          {i18n.t("chatInternal.modal.cancel")}
        </Button>
        <Button
          onClick={handleSave}
          startIcon={<SaveIcon />}
          style={{
            color: "white",
            backgroundColor: "#16a34a",
            boxShadow: "none",
            borderRadius: 8,
          }}
          variant="contained"
          disabled={
            users === undefined ||
            users.length === 0 ||
            title === null ||
            title === "" ||
            title === undefined
          }
        >
          {i18n.t("chatInternal.modal.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Chat(props) {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const history = useHistory();
  const { id } = useParams();

  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState("new");
  const [currentChat, setCurrentChat] = useState({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [tab, setTab] = useState(0);
  const [messages, setMessages] = useState([]);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesPageInfo, setMessagesPageInfo] = useState({ hasMore: false });
  const scrollToBottomRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const {
    data: chatsData,
    loading: loadingChats,
    error: errorChats,
    request: findChats,
    setData: setChatsData,
  } = useSafeApi("/chats", { manual: false });

  const { isReady, on } = useSocket();

  const upsertChatRecord = (records = [], chat) => {
    if (!chat?.id) return records;
    const chatExists = records.some((record) => record.id === chat.id);
    if (chatExists) {
      return records.map((record) => (record.id === chat.id ? chat : record));
    }
    return [chat, ...records];
  };

  useEffect(() => {
    if (chatsData?.records && id) {
      const chat = chatsData.records.find((r) => r.uuid === id);
      if (chat) selectChat(chat);
    }
  }, [chatsData, id]);

  const findMessages = (chatId) => fetchMessages(chatId, 1);

  useEffect(() => {
    if (isObject(currentChat) && has(currentChat, "id")) {
      findMessages(currentChat.id);
    }
  }, [currentChat]);

  useEffect(() => {
    if (!isReady) return;

    const companyId = user.companyId;

    const cleanupChatUser = on(
      `company-${companyId}-chat-user-${user.id}`,
      (data) => {
        if (data.action === "create") {
          setChatsData((prev) => ({ ...prev, records: [data.record, ...prev.records] }));
        }
        if (data.action === "update") {
          setChatsData((prev) => ({
            ...prev,
            records: prev.records.map((c) =>
              c.id === data.record.id ? data.record : c
            ),
          }));
          if (currentChat.id === data.record.id) setCurrentChat(data.record);
        }
      }
    );

    const cleanupChat = on(`company-${companyId}-chat`, (data) => {
      if (data.action === "new-message") {
        const chatRecord = data.chat || data.newMessage?.chat;
        if (chatRecord) {
          setChatsData((prev) => ({
            ...prev,
            records: upsertChatRecord(prev?.records || [], chatRecord),
          }));
          if (currentChat.id === chatRecord.id) {
            setCurrentChat(chatRecord);
          }
        }
      }
      if (data.action === "update" && data.chat) {
        setChatsData((prev) => ({
          ...prev,
          records: upsertChatRecord(prev?.records || [], data.chat),
        }));
        if (currentChat.id === data.chat.id) {
          setCurrentChat(data.chat);
        }
      }
      if (data.action === "delete") {
        setChatsData((prev) => ({
          ...prev,
          records: prev.records.filter((c) => c.id !== +data.id),
        }));
        if (currentChat.id === +data.id) {
          setCurrentChat({});
          history.push("/chats");
        }
      }
    });

    let cleanupCurrentChat;
    if (currentChat?.id) {
      cleanupCurrentChat = on(`company-${companyId}-chat-${currentChat.id}`, (data) => {
        if (data.action === "new-message") {
          setMessages((prev) => [...prev, data.newMessage]);
          if (scrollToBottomRef.current) {
            scrollToBottomRef.current();
          }
        }
        if (data.action === "update-message" && data.message) {
          setMessages((prev) =>
            prev.map((message) => (message.id === data.message.id ? data.message : message))
          );
          if (data.chat?.id === currentChat.id) {
            setCurrentChat(data.chat);
          }
        }
        if (data.action === "delete-message" && data.messageId) {
          setMessages((prev) => prev.filter((message) => message.id !== data.messageId));
          if (data.chat?.id === currentChat.id) {
            setCurrentChat(data.chat);
          }
        }
      });
    }

    return () => {
      if (cleanupChatUser) cleanupChatUser();
      if (cleanupChat) cleanupChat();
      if (cleanupCurrentChat) cleanupCurrentChat();
    };
  }, [isReady, currentChat, user.id]);

  const selectChat = (chat) => {
    setCurrentChat(chat);
    setTab(1);
  };

  const fetchMessages = async (chatId, page) => {
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/chats/${chatId}/messages?pageNumber=${page}`);
      if (data && data.records) {
        setMessages((prev) => (page === 1 ? data.records : [...data.records, ...prev]));
        setMessagesPageInfo(data);
        if (page === 1) setTimeout(() => scrollToBottomRef.current?.(), 200);
      }
    } catch (err) {
      toastError(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (isObject(currentChat) && has(currentChat, "id")) {
      setMessages([]);
      setMessagesPage(1);
      fetchMessages(currentChat.id, 1);
    }
  }, [currentChat.id]);

  const handleSendMessage = async (content, medias) => {
    try {
      if (medias && medias.length > 0) {
        const formData = new FormData();
        formData.append("message", content || " ");
        medias.forEach((media) => {
          formData.append("medias", media);
        });
        await api.post(`/chats/${currentChat.id}/messages`, formData);
      } else {
        await api.post(`/chats/${currentChat.id}/messages`, { message: content });
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleDeleteChat = async (chat) => {
    try {
      await api.delete(`/chats/${chat.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleUpdateMessage = async (message, content) => {
    try {
      await api.put(`/chats/${currentChat.id}/messages/${message.id}`, {
        message: content,
      });
    } catch (err) {
      toastError(err);
      throw err;
    }
  };

  const handleDeleteMessage = async (message) => {
    try {
      await api.delete(`/chats/${currentChat.id}/messages/${message.id}`);
    } catch (err) {
      toastError(err);
      throw err;
    }
  };

  const handleLoadMoreMessages = () => {
    if (messagesPageInfo.hasMore && !loadingMessages) {
      const nextPage = messagesPage + 1;
      setMessagesPage(nextPage);
      fetchMessages(currentChat.id, nextPage);
    }
  };

  const isMdUp = isWidthUp("md", props.width);

  return (
    <div className={classes.mainContainer}>
      <ChatModal
        open={showDialog}
        chat={currentChat}
        type={dialogType}
        handleClose={() => setShowDialog(false)}
        handleLoadNewChat={(data) => {
          setChatsData((prev) => ({ ...prev, records: [data, ...prev.records] }));
          selectChat(data);
          history.push(`/chats/${data.uuid}`);
        }}
      />

      <Paper className={classes.gridContainer}>
        <Grid className={classes.gridItem} container>
          {(isMdUp || tab === 0) && (
            <Grid className={classes.gridItem} xs={12} md={3} item>
              <div className={classes.sidebarPanel}>
                <div className={classes.sidebarHeader}>
                  <Typography className={classes.sidebarEyebrow}>
                    Comunicacao interna
                  </Typography>
                  <Typography className={classes.sidebarTitle}>
                    Chat da equipe
                  </Typography>
                  <Typography className={classes.sidebarSubtitle}>
                    Centralize alinhamentos, destaque as conversas mais importantes
                    e acompanhe novas mensagens com mais clareza.
                  </Typography>
                </div>

                <div className={classes.btnContainer}>
                  <Button
                    onClick={() => {
                      setDialogType("new");
                      setShowDialog(true);
                    }}
                    variant="contained"
                    startIcon={<AddIcon />}
                    fullWidth
                    className={classes.addButton}
                  >
                    Novo chat interno
                  </Button>
                </div>

                {!isMdUp && (
                  <Tabs
                    value={tab}
                    onChange={(e, v) => setTab(v)}
                    variant="fullWidth"
                    className={classes.mobileTabs}
                  >
                    <Tab label="Conversas" className={classes.mobileTab} />
                    <Tab
                      label="Mensagens"
                      disabled={!currentChat.id}
                      className={classes.mobileTab}
                    />
                  </Tabs>
                )}

                <SafeComponent
                  loading={loadingChats}
                  error={errorChats}
                  data={chatsData?.records}
                  onRetry={findChats}
                  emptyMessage="Nenhum chat interno ativo."
                  renderData={(records) => (
                    <ChatList
                      chats={records}
                      currentChat={currentChat}
                      selectChat={(chat) => {
                        selectChat(chat);
                        history.push(`/chats/${chat.uuid}`);
                      }}
                      handleDeleteChat={handleDeleteChat}
                      handleEditChat={(chat) => {
                        if (chat) setCurrentChat(chat);
                        setDialogType("edit");
                        setShowDialog(true);
                      }}
                      user={user}
                    />
                  )}
                />
              </div>
            </Grid>
          )}

          {(isMdUp || tab === 1) && (
            <Grid className={classes.gridItem} xs={12} md={9} item>
              {!isMdUp && (
                <Tabs
                  value={tab}
                  onChange={(e, v) => setTab(v)}
                  variant="fullWidth"
                  className={classes.mobileTabs}
                >
                  <Tab label="Conversas" className={classes.mobileTab} />
                  <Tab label="Mensagens" className={classes.mobileTab} />
                </Tabs>
              )}

              <div className={classes.messagePanel}>
                {currentChat.id ? (
                  <ChatMessages
                    chat={currentChat}
                    messages={messages}
                    handleSendMessage={handleSendMessage}
                    handleUpdateMessage={handleUpdateMessage}
                    handleDeleteMessage={handleDeleteMessage}
                    handleLoadMore={handleLoadMoreMessages}
                    scrollToBottomRef={scrollToBottomRef}
                    pageInfo={messagesPageInfo}
                    loading={loadingMessages}
                  />
                ) : (
                  <div className={classes.emptyChat}>
                    <div className={classes.emptyIconWrap}>
                      <ForumIcon style={{ fontSize: 42 }} />
                    </div>
                    <Typography variant="h5" className={classes.emptyTitle}>
                      Selecione uma conversa
                    </Typography>
                    <Typography variant="body2" className={classes.emptyText}>
                      Abra um chat na coluna ao lado para visualizar mensagens,
                      anexos e participantes em um painel mais organizado e com
                      leitura mais rápida.
                    </Typography>
                  </div>
                )}
              </div>
            </Grid>
          )}
        </Grid>
      </Paper>
    </div>
  );
}

export default withWidth()(Chat);
