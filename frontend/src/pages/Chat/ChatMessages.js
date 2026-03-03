import React, { useContext, useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  makeStyles,
  Paper,
  Tooltip,
  Typography,
  Modal,
  Button,
  Chip,
} from "@material-ui/core";
import SendIcon from "@material-ui/icons/Send";
import InsertEmoticonIcon from "@material-ui/icons/InsertEmoticon";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import GetAppIcon from "@material-ui/icons/GetApp";
import PeopleIcon from "@material-ui/icons/People";
import InsertDriveFileIcon from "@material-ui/icons/InsertDriveFile";
import ImageIcon from "@material-ui/icons/Image";
import PictureAsPdfIcon from "@material-ui/icons/PictureAsPdf";
import ChatBubbleOutlineIcon from "@material-ui/icons/ChatBubbleOutline";
import EmojiPicker from "emoji-picker-react";

import { AuthContext } from "../../context/Auth/AuthContext";
import { useDate } from "../../hooks/useDate";
import api from "../../services/api";
import { getBackendUrl } from "../../config";

import waBackground from '../../assets/wa-background.png';

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    overflow: "hidden",
    borderRadius: 0,
    height: "100%",
    borderLeft: "1px solid rgba(0, 0, 0, 0.12)",
    backgroundColor: theme.palette.background.paper,
  },
  chatHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    backgroundColor: theme.palette.background.paper,
    borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    minHeight: 58,
    flexShrink: 0,
  },
  chatHeaderAvatar: {
    width: 36,
    height: 36,
    fontSize: "0.85rem",
    fontWeight: 700,
    background: "linear-gradient(135deg, #4ec24e 0%, #2d9e2d 100%)",
    boxShadow: "0 2px 6px rgba(78,194,78,0.35)",
  },
  chatHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  chatHeaderTitle: {
    fontWeight: 700,
    fontSize: "0.95rem",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chatHeaderParticipants: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    display: "flex",
    alignItems: "center",
    gap: 3,
  },
  messageList: {
    position: "relative",
    overflowY: "auto",
    flex: 1,
    ...theme.scrollbarStyles,
    backgroundImage: `url(${waBackground})`,
    backgroundSize: "auto",
    backgroundRepeat: "repeat",
    padding: "8px 0",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      pointerEvents: "none",
    },
  },
  emptyMessages: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: 32,
    gap: 12,
    color: theme.palette.text.secondary,
    opacity: 0.7,
  },
  inputArea: {
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    padding: "8px 12px",
    backgroundColor: theme.palette.background.paper,
    borderTop: "1px solid rgba(0, 0, 0, 0.08)",
    gap: 6,
    boxShadow: "0 -1px 6px rgba(0,0,0,0.04)",
    flexShrink: 0,
  },
  inputActions: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    paddingBottom: 2,
  },
  inputIconBtn: {
    padding: 7,
    borderRadius: 10,
    transition: "background 0.15s",
    "&:hover": {
      backgroundColor: "rgba(0,0,0,0.06)",
    }
  },
  textAreaWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.mode === 'light' ? "#f0f2f5" : "#eee",
    borderRadius: 20,
    padding: "4px 12px 4px 12px",
    minHeight: 40,
    justifyContent: "center",
  },
  mediaPreviewRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    paddingTop: 4,
    paddingBottom: 2,
  },
  textArea: {
    border: "none",
    outline: "none",
    resize: "none",
    backgroundColor: "transparent",
    color: theme.palette.text.primary,
    fontFamily: "inherit",
    fontSize: "15px",
    lineHeight: "20px",
    minHeight: 32,
    maxHeight: 180,
    overflowY: "auto",
    width: "100%",
    "&::placeholder": {
      color: "#999"
    }
  },
  sendBtn: {
    padding: 9,
    borderRadius: 12,
    transition: "background 0.2s, transform 0.1s",
    marginBottom: 2,
    "&:active": {
      transform: "scale(0.93)",
    }
  },
  // Message row
  messageRow: {
    display: "flex",
    alignItems: "flex-end",
    padding: "2px 12px",
    gap: 6,
  },
  messageRowMine: {
    flexDirection: "row-reverse",
  },
  msgAvatar: {
    width: 28,
    height: 28,
    fontSize: "0.7rem",
    fontWeight: 700,
    flexShrink: 0,
    marginBottom: 2,
  },
  boxLeft: {
    padding: "6px 10px",
    position: "relative",
    backgroundColor: "#ffffff",
    color: "#303030",
    maxWidth: "72%",
    borderRadius: "0 8px 8px 8px",
    border: "1px solid rgba(0,0,0,0.07)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  boxRight: {
    padding: "6px 10px",
    position: "relative",
    backgroundColor: "#e2fbc9",
    color: "#303030",
    maxWidth: "72%",
    borderRadius: "8px 0 8px 8px",
    border: "1px solid rgba(0,0,0,0.07)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  senderName: {
    fontWeight: 700,
    fontSize: "0.75rem",
    marginBottom: 2,
  },
  messageText: {
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    lineHeight: "1.4",
    fontSize: "14px",
    "& a": {
      color: "#0366d6",
      textDecoration: "none",
      "&:hover": { textDecoration: "underline" }
    },
  },
  messageTime: {
    textAlign: "right",
    marginTop: 3,
    color: "rgba(0,0,0,0.4)",
    fontSize: "0.68rem",
  },
  // Media attachment inside message
  mediaImage: {
    maxWidth: "100%",
    maxHeight: 220,
    objectFit: "contain",
    borderRadius: 8,
    cursor: "zoom-in",
    display: "block",
    margin: "4px 0",
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
  },
  mediaFile: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    margin: "4px 0",
    textDecoration: "none",
    color: "inherit",
    border: "1px solid rgba(0,0,0,0.08)",
    transition: "background 0.15s",
    "&:hover": {
      backgroundColor: "rgba(0,0,0,0.09)",
    }
  },
  mediaFileName: {
    fontSize: 13,
    wordBreak: "break-all",
    flex: 1,
  },
  // Emoji picker
  emojiPicker: {
    position: "absolute",
    bottom: "100%",
    left: 10,
    zIndex: 10,
  },
  // Image modal
  modal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    borderRadius: 12,
    textAlign: "center",
    outline: "none",
    maxWidth: "95vw",
  },
  modalImage: {
    maxWidth: "90vw",
    maxHeight: "80vh",
    marginBottom: theme.spacing(2),
    borderRadius: 8,
  },
}));

const formatMessage = (text) => {
  if (!text || !text.trim()) return "";
  const escaped = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return escaped.replace(urlRegex, (url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );
};

const getInitials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");

const stringToColor = (str = "") => {
  const colors = ["#7b5ea7", "#2196f3", "#4caf50", "#f44336", "#ff9800", "#00bcd4", "#e91e63", "#009688"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const isImageFile = (name = "") => /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i.test(name);
const isPdfFile = (name = "") => /\.pdf$/i.test(name);

// Renders media attached to a message
const MediaContent = React.memo(({ mediaPath, mediaName, onImageClick }) => {
  const classes = useStyles();
  if (!mediaPath) return null;

  const fileUrl = `${getBackendUrl()}/public${mediaPath}`;

  if (isImageFile(mediaName)) {
    return (
      <img
        src={fileUrl}
        alt={mediaName}
        className={classes.mediaImage}
        onClick={() => onImageClick(fileUrl)}
        loading="lazy"
      />
    );
  }

  const Icon = isPdfFile(mediaName) ? PictureAsPdfIcon : InsertDriveFileIcon;
  const iconColor = isPdfFile(mediaName) ? "#e53935" : "#1565c0";

  return (
    <a href={fileUrl} download={mediaName} target="_blank" rel="noopener noreferrer" className={classes.mediaFile}>
      <Icon style={{ color: iconColor, fontSize: 22, flexShrink: 0 }} />
      <span className={classes.mediaFileName}>{mediaName || "arquivo"}</span>
      <GetAppIcon style={{ fontSize: 16, color: "#888", flexShrink: 0 }} />
    </a>
  );
});

const MessageItem = React.memo(({ item, isMine, onImageClick }) => {
  const classes = useStyles();
  const { datetimeToClient } = useDate();

  const senderName = item.sender?.name || "Usuário";
  const initials = getInitials(senderName);
  const avatarColor = stringToColor(senderName);

  const isHtml = /<\/?[a-z][\s\S]*>/i.test(String(item.message || ""));
  const content = isHtml ? item.message : formatMessage(item.message);
  const hasText = content && content.trim() && content.trim() !== "&nbsp;" && content !== " ";

  return (
    <div className={`${classes.messageRow} ${isMine ? classes.messageRowMine : ""}`}>
      <Avatar className={classes.msgAvatar} style={{ backgroundColor: avatarColor }}>
        {initials}
      </Avatar>
      <div className={isMine ? classes.boxRight : classes.boxLeft}>
        {!isMine && (
          <Typography className={classes.senderName} style={{ color: avatarColor }}>
            {senderName}
          </Typography>
        )}
        {item.mediaPath && (
          <MediaContent mediaPath={item.mediaPath} mediaName={item.mediaName} onImageClick={onImageClick} />
        )}
        {hasText && (
          <div
            className={classes.messageText}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
        <div className={classes.messageTime}>
          {datetimeToClient(item.createdAt)}
        </div>
      </div>
    </div>
  );
});

// Chat header bar
const ChatHeader = React.memo(({ chat }) => {
  const classes = useStyles();
  if (!chat?.id) return null;

  const title = chat.title || "Chat";
  const participantCount = Array.isArray(chat.users) ? chat.users.length : 0;
  const initials = getInitials(title);
  const bgColor = stringToColor(title);

  return (
    <div className={classes.chatHeader}>
      <Avatar className={classes.chatHeaderAvatar} style={{ background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}cc 100%)` }}>
        {initials || <PeopleIcon style={{ fontSize: 18 }} />}
      </Avatar>
      <div className={classes.chatHeaderInfo}>
        <div className={classes.chatHeaderTitle}>{title}</div>
        {participantCount > 0 && (
          <div className={classes.chatHeaderParticipants}>
            <PeopleIcon style={{ fontSize: 12 }} />
            {participantCount} participante{participantCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
});

export default function ChatMessages({
  chat,
  messages,
  handleSendMessage,
  handleLoadMore,
  scrollToBottomRef,
  pageInfo,
  loading,
}) {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const baseRef = useRef();

  const [contentMessage, setContentMessage] = useState("");
  const [medias, setMedias] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const textAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (baseRef.current) {
      baseRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const unreadMessages = useCallback((currentChat) => {
    if (currentChat && Array.isArray(currentChat.users)) {
      const currentUser = currentChat.users.find((u) => u.userId === user.id);
      return currentUser ? currentUser.unreads > 0 : false;
    }
    return false;
  }, [user.id]);

  useEffect(() => {
    if (chat?.id && unreadMessages(chat)) {
      try {
        api.post(`/chats/${chat.id}/read`, { userId: user.id });
      } catch (err) { }
    }
    scrollToBottomRef.current = scrollToBottom;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id]);

  const handleScroll = useCallback((e) => {
    const { scrollTop } = e.currentTarget;
    if (!pageInfo?.hasMore || loading) return;
    if (scrollTop < 300) handleLoadMore();
  }, [pageInfo, loading, handleLoadMore]);

  const handleSend = useCallback(() => {
    if (contentMessage.trim() !== "" || medias.length > 0) {
      handleSendMessage(contentMessage, medias);
      setContentMessage("");
      setMedias([]);
      if (textAreaRef.current) textAreaRef.current.style.height = "32px";
    }
  }, [contentMessage, medias, handleSendMessage]);

  const handleEmojiClick = useCallback((emojiObject) => {
    setContentMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  }, []);

  const handleImageClick = useCallback((src) => setSelectedImage(src), []);

  const handleChangeMedias = (e) => {
    if (!e.target.files) return;
    setMedias((prev) => [...prev, ...Array.from(e.target.files)]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setContentMessage(e.target.value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "32px";
      textAreaRef.current.style.height = Math.min(textAreaRef.current.scrollHeight, 180) + "px";
    }
  };

  const handleDownloadImage = () => {
    if (selectedImage) {
      const link = document.createElement("a");
      link.href = selectedImage;
      link.download = "imagem.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const canSend = contentMessage.trim() !== "" || medias.length > 0;

  return (
    <Paper className={classes.mainContainer} elevation={0}>
      <ChatHeader chat={chat} />

      <div onScroll={handleScroll} className={classes.messageList}>
        {loading && (
          <Box display="flex" justifyContent="center" p={1}>
            <CircularProgress size={20} />
          </Box>
        )}

        {!loading && Array.isArray(messages) && messages.length === 0 && (
          <div className={classes.emptyMessages}>
            <ChatBubbleOutlineIcon style={{ fontSize: 48, opacity: 0.3 }} />
            <Typography variant="body2" style={{ opacity: 0.6 }}>
              Nenhuma mensagem ainda. Diga olá!
            </Typography>
          </div>
        )}

        {Array.isArray(messages) && messages.map((item, key) => (
          <MessageItem
            key={item.id || key}
            item={item}
            isMine={item.senderId === user.id}
            onImageClick={handleImageClick}
          />
        ))}
        <div ref={baseRef} />
      </div>

      <div className={classes.inputArea}>
        {showEmojiPicker && (
          <div className={classes.emojiPicker}>
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        <div className={classes.inputActions}>
          <Tooltip title="Anexar arquivo">
            <IconButton
              className={classes.inputIconBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              <AttachFileIcon style={{ color: "#888", fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Emoji">
            <IconButton
              className={classes.inputIconBtn}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <InsertEmoticonIcon style={{ color: "#888", fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </div>

        <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleChangeMedias}
        />

        <div className={classes.textAreaWrapper}>
          {medias.length > 0 && (
            <div className={classes.mediaPreviewRow}>
              {medias.map((media, index) => (
                <Chip
                  key={index}
                  label={media.name}
                  size="small"
                  icon={isImageFile(media.name) ? <ImageIcon style={{ fontSize: 14 }} /> : <InsertDriveFileIcon style={{ fontSize: 14 }} />}
                  onDelete={() => setMedias(medias.filter((_, i) => i !== index))}
                  style={{ maxWidth: 160, fontSize: 11 }}
                />
              ))}
            </div>
          )}
          <textarea
            ref={textAreaRef}
            value={contentMessage}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={classes.textArea}
            placeholder="Digite uma mensagem..."
            rows={1}
          />
        </div>

        <Tooltip title="Enviar (Enter)">
          <span>
            <IconButton
              className={classes.sendBtn}
              onClick={handleSend}
              disabled={!canSend}
              style={{
                backgroundColor: canSend ? "#4ec24e" : "#e0e0e0",
                marginBottom: 2,
              }}
            >
              <SendIcon style={{ color: "#fff", fontSize: 20 }} />
            </IconButton>
          </span>
        </Tooltip>
      </div>

      <Modal open={!!selectedImage} onClose={() => setSelectedImage(null)} className={classes.modal}>
        <div className={classes.modalContent}>
          <img src={selectedImage} alt="Ampliada" className={classes.modalImage} />
          <Box display="flex" justifyContent="center" gap={1} mt={1}>
            <Button
              variant="contained"
              startIcon={<GetAppIcon />}
              onClick={handleDownloadImage}
              style={{ backgroundColor: "#437db5", color: "white", borderRadius: 8, boxShadow: "none" }}
            >
              Baixar
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSelectedImage(null)}
              style={{ borderRadius: 8 }}
            >
              Fechar
            </Button>
          </Box>
        </div>
      </Modal>
    </Paper>
  );
}
