import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
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

import waBackground from "../../assets/wa-background.png";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    overflow: "hidden",
    borderRadius: 0,
    height: "100%",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(248,250,252,0.96) 100%)",
  },
  chatHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(239,246,255,0.96) 100%)",
    borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
    boxShadow: "0 8px 28px rgba(15,23,42,0.06)",
    minHeight: 72,
    flexShrink: 0,
  },
  chatHeaderAvatar: {
    width: 44,
    height: 44,
    fontSize: "0.95rem",
    fontWeight: 700,
    boxShadow: "0 12px 26px rgba(37,99,235,0.22)",
    border: "2px solid rgba(255,255,255,0.88)",
  },
  chatHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  chatHeaderTitle: {
    fontWeight: 800,
    fontSize: "1rem",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "#0f172a",
  },
  chatHeaderParticipants: {
    fontSize: "0.78rem",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    fontWeight: 600,
  },
  messageList: {
    position: "relative",
    overflowY: "auto",
    flex: 1,
    ...theme.scrollbarStyles,
    backgroundImage: `url(${waBackground})`,
    backgroundSize: "300px auto",
    backgroundRepeat: "repeat",
    padding: "18px 0 8px",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background:
        "linear-gradient(180deg, rgba(248,250,252,0.76) 0%, rgba(248,250,252,0.56) 100%)",
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
    color: "#475569",
    opacity: 0.9,
  },
  loadMoreWrap: {
    display: "flex",
    justifyContent: "center",
    padding: "0 16px 12px",
    position: "relative",
    zIndex: 1,
  },
  loadMoreChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(148,163,184,0.22)",
    color: "#334155",
    fontSize: "0.8rem",
    fontWeight: 700,
    boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
  },
  inputArea: {
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    padding: "14px 18px 18px",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,250,252,0.98) 100%)",
    borderTop: "1px solid rgba(148, 163, 184, 0.14)",
    gap: 10,
    boxShadow: "0 -12px 30px rgba(15,23,42,0.05)",
    flexShrink: 0,
  },
  inputActions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    paddingBottom: 4,
  },
  inputIconBtn: {
    padding: 10,
    borderRadius: 14,
    transition: "all 0.15s ease",
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.18)",
    boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
    "&:hover": {
      backgroundColor: "#eff6ff",
      borderColor: "rgba(59,130,246,0.28)",
    },
  },
  textAreaWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    borderRadius: 22,
    padding: "8px 14px",
    minHeight: 52,
    justifyContent: "center",
    border: "1px solid rgba(148,163,184,0.18)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.7), 0 10px 24px rgba(15,23,42,0.05)",
  },
  mediaPreviewRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 2,
    paddingBottom: 6,
  },
  textArea: {
    border: "none",
    outline: "none",
    resize: "none",
    backgroundColor: "transparent",
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: "15px",
    lineHeight: "22px",
    minHeight: 32,
    maxHeight: 180,
    overflowY: "auto",
    width: "100%",
    "&::placeholder": {
      color: "#64748b",
    },
  },
  sendBtn: {
    padding: 12,
    borderRadius: 18,
    transition: "all 0.2s ease, transform 0.1s",
    marginBottom: 2,
    boxShadow: "0 16px 32px rgba(37,99,235,0.28)",
    "&:active": {
      transform: "scale(0.93)",
    },
  },
  messageRow: {
    display: "flex",
    alignItems: "flex-end",
    padding: "4px 18px",
    gap: 8,
    position: "relative",
    zIndex: 1,
  },
  messageRowMine: {
    flexDirection: "row-reverse",
  },
  msgAvatar: {
    width: 32,
    height: 32,
    fontSize: "0.7rem",
    fontWeight: 700,
    flexShrink: 0,
    marginBottom: 4,
    boxShadow: "0 10px 18px rgba(15,23,42,0.12)",
  },
  boxLeft: {
    padding: "10px 12px",
    position: "relative",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
    color: "#0f172a",
    maxWidth: "74%",
    borderRadius: "18px 18px 18px 6px",
    border: "1px solid rgba(148,163,184,0.16)",
    boxShadow: "0 14px 28px rgba(15,23,42,0.08)",
  },
  boxRight: {
    padding: "10px 12px",
    position: "relative",
    background:
      "linear-gradient(135deg, rgba(220,252,231,0.98) 0%, rgba(187,247,208,0.98) 100%)",
    color: "#052e16",
    maxWidth: "74%",
    borderRadius: "18px 18px 6px 18px",
    border: "1px solid rgba(34,197,94,0.22)",
    boxShadow: "0 16px 34px rgba(34,197,94,0.12)",
  },
  senderName: {
    fontWeight: 700,
    fontSize: "0.76rem",
    marginBottom: 4,
  },
  messageText: {
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    lineHeight: 1.55,
    fontSize: "14px",
    color: "inherit",
    "& a": {
      color: "#1d4ed8",
      textDecoration: "none",
      fontWeight: 700,
      "&:hover": {
        textDecoration: "underline",
      },
    },
  },
  messageTime: {
    textAlign: "right",
    marginTop: 6,
    color: "rgba(15,23,42,0.52)",
    fontSize: "0.68rem",
    fontWeight: 600,
  },
  mediaImage: {
    maxWidth: "100%",
    maxHeight: 240,
    objectFit: "contain",
    borderRadius: 14,
    cursor: "zoom-in",
    display: "block",
    margin: "4px 0 6px",
    boxShadow: "0 12px 24px rgba(15,23,42,0.14)",
  },
  mediaFile: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 12,
    margin: "4px 0",
    textDecoration: "none",
    color: "inherit",
    border: "1px solid rgba(148,163,184,0.18)",
    transition: "all 0.15s ease",
    "&:hover": {
      backgroundColor: "rgba(239,246,255,0.92)",
      borderColor: "rgba(59,130,246,0.22)",
    },
  },
  mediaFileName: {
    fontSize: 13,
    wordBreak: "break-all",
    flex: 1,
  },
  emojiPicker: {
    position: "absolute",
    bottom: "100%",
    left: 18,
    zIndex: 10,
  },
  modal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    borderRadius: 20,
    textAlign: "center",
    outline: "none",
    maxWidth: "95vw",
    boxShadow: "0 24px 60px rgba(15,23,42,0.26)",
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
  return escaped.replace(
    urlRegex,
    (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

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

const isImageFile = (name = "") =>
  /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i.test(name);
const isPdfFile = (name = "") => /\.pdf$/i.test(name);

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
    <a
      href={fileUrl}
      download={mediaName}
      target="_blank"
      rel="noopener noreferrer"
      className={classes.mediaFile}
    >
      <Icon style={{ color: iconColor, fontSize: 22, flexShrink: 0 }} />
      <span className={classes.mediaFileName}>{mediaName || "arquivo"}</span>
      <GetAppIcon style={{ fontSize: 16, color: "#64748b", flexShrink: 0 }} />
    </a>
  );
});

const MessageItem = React.memo(({ item, isMine, onImageClick }) => {
  const classes = useStyles();
  const { datetimeToClient } = useDate();

  const senderName = item.sender?.name || "Usuario";
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
          <MediaContent
            mediaPath={item.mediaPath}
            mediaName={item.mediaName}
            onImageClick={onImageClick}
          />
        )}
        {hasText && (
          <div
            className={classes.messageText}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
        <div className={classes.messageTime}>{datetimeToClient(item.createdAt)}</div>
      </div>
    </div>
  );
});

const ChatHeader = React.memo(({ chat }) => {
  const classes = useStyles();
  if (!chat?.id) return null;

  const title = chat.title || "Chat";
  const participantCount = Array.isArray(chat.users) ? chat.users.length : 0;
  const initials = getInitials(title);
  const bgColor = stringToColor(title);

  return (
    <div className={classes.chatHeader}>
      <Avatar
        className={classes.chatHeaderAvatar}
        style={{ background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}cc 100%)` }}
      >
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
      <Chip
        label="Online"
        size="small"
        style={{
          background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
          color: "#166534",
          fontWeight: 800,
          borderRadius: 999,
          height: 30,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
        }}
      />
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

  const unreadMessages = useCallback(
    (currentChat) => {
      if (currentChat && Array.isArray(currentChat.users)) {
        const currentUser = currentChat.users.find((u) => u.userId === user.id);
        return currentUser ? currentUser.unreads > 0 : false;
      }
      return false;
    },
    [user.id]
  );

  useEffect(() => {
    if (chat?.id && unreadMessages(chat)) {
      try {
        api.post(`/chats/${chat.id}/read`, { userId: user.id });
      } catch (err) {}
    }
    scrollToBottomRef.current = scrollToBottom;
  }, [chat?.id]);

  const handleScroll = useCallback(
    (e) => {
      const { scrollTop } = e.currentTarget;
      if (!pageInfo?.hasMore || loading) return;
      if (scrollTop < 300) handleLoadMore();
    },
    [pageInfo, loading, handleLoadMore]
  );

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
      textAreaRef.current.style.height = `${Math.min(
        textAreaRef.current.scrollHeight,
        180
      )}px`;
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
          <div className={classes.loadMoreWrap}>
            <div className={classes.loadMoreChip}>
              <CircularProgress size={16} thickness={5} />
              Carregando mensagens
            </div>
          </div>
        )}

        {!loading && Array.isArray(messages) && messages.length === 0 && (
          <div className={classes.emptyMessages}>
            <ChatBubbleOutlineIcon style={{ fontSize: 48, opacity: 0.3 }} />
            <Typography variant="body2" style={{ opacity: 0.7 }}>
              Nenhuma mensagem ainda. Comece a conversa com mais contexto para a equipe.
            </Typography>
          </div>
        )}

        {Array.isArray(messages) &&
          messages.map((item, key) => (
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
              <AttachFileIcon style={{ color: "#334155", fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Emoji">
            <IconButton
              className={classes.inputIconBtn}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <InsertEmoticonIcon style={{ color: "#334155", fontSize: 20 }} />
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
                  icon={
                    isImageFile(media.name) ? (
                      <ImageIcon style={{ fontSize: 14 }} />
                    ) : (
                      <InsertDriveFileIcon style={{ fontSize: 14 }} />
                    )
                  }
                  onDelete={() => setMedias(medias.filter((_, i) => i !== index))}
                  style={{
                    maxWidth: 180,
                    fontSize: 11,
                    background: "#e0f2fe",
                    color: "#0f172a",
                    fontWeight: 700,
                    borderRadius: 999,
                  }}
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
                background: canSend
                  ? "linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)"
                  : "#cbd5e1",
                marginBottom: 2,
              }}
            >
              <SendIcon style={{ color: "#fff", fontSize: 20 }} />
            </IconButton>
          </span>
        </Tooltip>
      </div>

      <Modal
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        className={classes.modal}
      >
        <div className={classes.modalContent}>
          <img src={selectedImage} alt="Ampliada" className={classes.modalImage} />
          <Box display="flex" justifyContent="center" gap={1} mt={1}>
            <Button
              variant="contained"
              startIcon={<GetAppIcon />}
              onClick={handleDownloadImage}
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                borderRadius: 10,
                boxShadow: "none",
              }}
            >
              Baixar
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSelectedImage(null)}
              style={{ borderRadius: 10 }}
            >
              Fechar
            </Button>
          </Box>
        </div>
      </Modal>
    </Paper>
  );
}
