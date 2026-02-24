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
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
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
    padding: theme.spacing(2),
    height: `calc(100% - 48px)`,
    overflowY: "hidden",
    border: "1px solid rgba(0, 0, 0, 0.12)",
  },
  gridContainer: {
    flex: 1,
    height: "100%",
    border: "1px solid rgba(0, 0, 0, 0.12)",
    background: theme.palette.background.color,
  },
  gridItem: {
    height: "100%",
  },
  gridItemTab: {
    height: "92%",
    width: "100%",
  },
  btnContainer: {
    textAlign: "right",
    padding: 10,
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
        window.location.reload(); // Recarrega a página após salvar um novo chat
      }
      handleClose();
    } catch (err) { }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{i18n.t("chatInternal.modal.title")}</DialogTitle>
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
              onFiltered={(users) => setUsers(users)}
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
            borderRadius: "5px",
          }}
        >
          {i18n.t("chatInternal.modal.cancel")}
        </Button>
        <Button
          onClick={handleSave}
          startIcon={<SaveIcon />}
          style={{
            color: "white",
            backgroundColor: "#4ec24e",
            boxShadow: "none",
            borderRadius: "5px",
          }}
          variant="contained"
          disabled={users === undefined || users.length === 0 || title === null || title === "" || title === undefined}
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
    return () => { isMounted.current = false; };
  }, []);

  // FASE 2: Consumo seguro de API via Hook
  const {
    data: chatsData,
    loading: loadingChats,
    error: errorChats,
    request: findChats,
    setData: setChatsData
  } = useSafeApi("/chats", { manual: false });

  const { socket, isReady, on } = useSocket();

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

  // FASE 3: Socket Seguro via useSocket + on() helper
  useEffect(() => {
    if (!isReady) return;

    const companyId = user.companyId;

    const cleanupChatUser = on(`company-${companyId}-chat-user-${user.id}`, (data) => {
      if (data.action === "create") {
        setChatsData(prev => ({ ...prev, records: [data.record, ...prev.records] }));
      }
      if (data.action === "update") {
        setChatsData(prev => ({
          ...prev,
          records: prev.records.map(c => c.id === data.record.id ? data.record : c)
        }));
        if (currentChat.id === data.record.id) setCurrentChat(data.record);
      }
    });

    const cleanupChat = on(`company-${companyId}-chat`, (data) => {
      if (data.action === "delete") {
        setChatsData(prev => ({ ...prev, records: prev.records.filter(c => c.id !== +data.id) }));
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
          setMessages(prev => [...prev, data.newMessage]);
          if (scrollToBottomRef.current) {
            scrollToBottomRef.current();
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
        setMessages(prev => page === 1 ? data.records : [...data.records, ...prev]);
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

  const handleSendMessage = async (content) => {
    try {
      await api.post(`/chats/${currentChat.id}/messages`, { message: content });
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
          setChatsData(prev => ({ ...prev, records: [data, ...prev.records] }));
          selectChat(data);
          history.push(`/chats/${data.uuid}`);
        }}
      />

      <Paper className={classes.gridContainer}>
        <Grid className={classes.gridItem} container>
          {/* LISTA DE CHATS */}
          {(isMdUp || tab === 0) && (
            <Grid className={classes.gridItem} xs={12} md={3} item>
              <div className={classes.btnContainer}>
                <Button
                  onClick={() => { setDialogType("new"); setShowDialog(true); }}
                  color="primary"
                  variant="contained"
                  startIcon={<AddIcon />}
                  fullWidth
                  style={{
                    color: "white",
                    backgroundColor: "#FFA500",
                    boxShadow: "none",
                    borderRadius: "5px",
                  }}
                >
                  {i18n.t("chatInternal.main.addChat")}
                </Button>
              </div>

              {!isMdUp && (
                <Tabs value={tab} onChange={(e, v) => setTab(v)} indicatorColor="primary" textColor="primary" variant="fullWidth" style={{ marginBottom: 10 }}>
                  <Tab label="Chats" />
                  <Tab label="Mensagens" disabled={!currentChat.id} />
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
                    handleEditChat={() => { setDialogType("edit"); setShowDialog(true); }}
                    user={user}
                  />
                )}
              />
            </Grid>
          )}

          {/* MENSAGENS */}
          {(isMdUp || tab === 1) && (
            <Grid className={classes.gridItem} xs={12} md={9} item>
              {!isMdUp && (
                <Tabs value={tab} onChange={(e, v) => setTab(v)} indicatorColor="primary" textColor="primary" variant="fullWidth" style={{ marginBottom: 10 }}>
                  <Tab label="Chats" />
                  <Tab label="Mensagens" />
                </Tabs>
              )}

              {currentChat.id ? (
                <ChatMessages
                  chat={currentChat}
                  messages={messages}
                  handleSendMessage={handleSendMessage}
                  handleLoadMore={handleLoadMoreMessages}
                  scrollToBottomRef={scrollToBottomRef}
                  loading={loadingMessages}
                  hasMore={messagesPageInfo.hasMore}
                />
              ) : (
                <Paper style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 20 }}>
                  <Typography variant="h6" color="textSecondary">
                    Selecione um chat para visualizar as mensagens
                  </Typography>
                </Paper>
              )}
            </Grid>
          )}
        </Grid>
      </Paper>
    </div>
  );
}

export default withWidth()(Chat);
