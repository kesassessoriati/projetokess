import React, { useContext, useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Box,
  IconButton,
  makeStyles,
  Paper,
  Typography,
  Modal,
  Button,
  Chip,
} from "@material-ui/core";
import SendIcon from "@material-ui/icons/Send";
import InsertEmoticonIcon from "@material-ui/icons/InsertEmoticon";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import EmojiPicker from "emoji-picker-react";
import GetAppIcon from "@material-ui/icons/GetApp";

import { AuthContext } from "../../context/Auth/AuthContext";
import { useDate } from "../../hooks/useDate";
import api from "../../services/api";

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
  },
  messageList: {
    position: "relative",
    overflowY: "auto",
    height: "100%",
    ...theme.scrollbarStyles,
    backgroundColor: theme.mode === 'light' ? "#f2f2f2" : "#7f7f7f",
    backgroundImage: `url(${waBackground})`,
    backgroundSize: "auto",
    backgroundRepeat: "repeat",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      pointerEvents: "none",
    },
  },
  inputArea: {
    position: "relative",
    height: "auto",
    display: "flex",
    alignItems: "flex-end", // Alinha itens para baixo para acompanhar o crescer do textarea
    padding: "8px 15px",
    backgroundColor: theme.palette.background.paper,
    borderTop: "1px solid rgba(0, 0, 0, 0.12)",
  },
  textArea: {
    flex: 1,
    border: "none",
    outline: "none",
    resize: "none",
    padding: "10px",
    borderRadius: "20px",
    backgroundColor: theme.mode === 'light' ? "#f0f2f5" : "#eee",
    color: theme.palette.text.primary,
    fontFamily: "inherit",
    fontSize: "15px",
    lineHeight: "20px",
    minHeight: "40px",
    maxHeight: "180px",
    overflowY: "auto",
    margin: "0 10px",
    "&::placeholder": {
      color: "#999"
    }
  },
  buttonContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "5px",
  },
  boxLeft: {
    padding: "6px 8px",
    margin: "8px",
    position: "relative",
    backgroundColor: "#ffffff",
    color: "#303030",
    maxWidth: "80%",
    borderRadius: 8,
    borderTopLeftRadius: 0,
    border: "1px solid rgba(0, 0, 0, 0.12)",
    zIndex: 1,
    boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
  },
  boxRight: {
    padding: "6px 8px",
    margin: "8px 8px 8px auto",
    position: "relative",
    backgroundColor: "#dcf8c6",
    color: "#303030",
    textAlign: "left",
    maxWidth: "80%",
    borderRadius: 8,
    borderTopRightRadius: 0,
    border: "1px solid rgba(0, 0, 0, 0.12)",
    zIndex: 1,
    boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
  },
  messageText: {
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    lineHeight: "1.3",
    fontSize: "14px",
    marginTop: "4px",
    "& a": {
      color: "#0366d6",
      textDecoration: "none",
      "&:hover": {
        textDecoration: "underline",
      }
    },
    "& img": {
      maxWidth: "100%",
      maxHeight: "250px",
      objectFit: "contain",
      borderRadius: 8,
      cursor: "zoom-in",
      display: "block",
      margin: "4px 0"
    }
  },
  emojiPicker: {
    position: "absolute",
    bottom: "100%",
    left: 10,
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
    borderRadius: theme.shape.borderRadius,
    textAlign: "center",
  },
  modalImage: {
    maxWidth: "90%",
    maxHeight: "80vh",
    marginBottom: theme.spacing(2),
  },
}));

const formatMessage = (text) => {
  if (!text) return "";
  const escapedText = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const linkedText = escapedText.replace(urlRegex, function (url) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  return linkedText;
};

const MessageItem = React.memo(({ item, isMine, onImageClick }) => {
  const classes = useStyles();
  const { datetimeToClient } = useDate();

  const isHtml = /<\/?[a-z][\s\S]*>/i.test(String(item.message));

  let content = "";
  if (isHtml) {
    content = item.message;
  } else {
    content = formatMessage(item.message);
  }

  const handleClick = useCallback((e) => {
    if (e.target.tagName === "IMG") {
      onImageClick(e.target.src);
    }
  }, [onImageClick]);

  return (
    <Box className={isMine ? classes.boxRight : classes.boxLeft}>
      <Typography variant="subtitle2" style={{ fontWeight: "bold", fontSize: "0.80rem" }}>
        {item.sender?.name || "Usuário"}
      </Typography>
      <div
        className={classes.messageText}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <Typography variant="caption" display="block" style={{ textAlign: "right", marginTop: 4, color: "rgba(0,0,0,0.45)" }}>
        {datetimeToClient(item.createdAt)}
      </Typography>
    </Box>
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
    if (scrollTop < 300) {
      handleLoadMore();
    }
  }, [pageInfo, loading, handleLoadMore]);

  const handleSend = useCallback(() => {
    if (contentMessage.trim() !== "" || medias.length > 0) {
      handleSendMessage(contentMessage, medias);
      setContentMessage("");
      setMedias([]);
      if (textAreaRef.current) {
        textAreaRef.current.style.height = '40px';
      }
    }
  }, [contentMessage, medias, handleSendMessage]);

  const handleEmojiClick = useCallback((emojiObject) => {
    setContentMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  }, []);

  const handleImageClick = useCallback((imageSrc) => {
    setSelectedImage(imageSrc);
  }, []);

  const handleChangeMedias = (e) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    setMedias((prev) => [...prev, ...selectedFiles]);
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
      textAreaRef.current.style.height = '40px';
      const scrollHeight = textAreaRef.current.scrollHeight;
      textAreaRef.current.style.height = Math.min(scrollHeight, 180) + 'px';
    }
  };

  const handleDownloadImage = () => {
    if (selectedImage) {
      const link = document.createElement("a");
      link.href = selectedImage;
      link.download = "image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Paper className={classes.mainContainer}>
      <div onScroll={handleScroll} className={classes.messageList}>
        {Array.isArray(messages) &&
          messages.map((item, key) => (
            <MessageItem
              key={item.id || key}
              item={item}
              isMine={item.senderId === user.id}
              onImageClick={handleImageClick}
            />
          ))}
        <div ref={baseRef}></div>
      </div>

      <div className={classes.inputArea}>
        {showEmojiPicker && (
          <div className={classes.emojiPicker}>
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
        <div className={classes.buttonContainer}>
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            style={{ backgroundColor: "transparent", padding: "8px" }}
            title="Anexar arquivo"
          >
            <AttachFileIcon style={{ color: "#888" }} />
          </IconButton>

          <IconButton
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{ backgroundColor: "transparent", padding: "8px" }}
          >
            <InsertEmoticonIcon style={{ color: "#888" }} />
          </IconButton>
        </div>

        <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleChangeMedias}
        />

        <Box display="flex" flexDirection="column" style={{ flex: 1 }}>
          {medias.length > 0 && (
            <Box display="flex" flexWrap="wrap" gap={1} mb={1}>
              {medias.map((media, index) => (
                <Chip
                  key={index}
                  label={media.name}
                  size="small"
                  onDelete={() => setMedias(medias.filter((_, i) => i !== index))}
                  style={{ margin: "2px" }}
                />
              ))}
            </Box>
          )}
          <textarea
            ref={textAreaRef}
            value={contentMessage}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={classes.textArea}
            placeholder="Digite uma mensagem..."
            rows={1}
            style={{ margin: 0, width: "100%" }}
          />
        </Box>

        <div className={classes.buttonContainer} style={{ marginLeft: "10px" }}>
          <IconButton
            onClick={handleSend}
            disabled={!contentMessage.trim() && medias.length === 0}
            style={{
              backgroundColor: (contentMessage.trim() || medias.length > 0) ? "#4ec24e" : "#e0e0e0",
              padding: "10px",
            }}
          >
            <SendIcon style={{ color: "#fff", fontSize: "1.2rem" }} />
          </IconButton>
        </div>
      </div>

      <Modal open={!!selectedImage} onClose={() => setSelectedImage(null)} className={classes.modal}>
        <div className={classes.modalContent}>
          <img src={selectedImage} alt="Ampliada" className={classes.modalImage} />
          <Button
            variant="contained"
            color="primary"
            startIcon={<GetAppIcon />}
            onClick={handleDownloadImage}
            style={{
              color: "white",
              backgroundColor: "#437db5",
              boxShadow: "none",
              borderRadius: 0,
              marginTop: 10
            }}
          >
            Baixar Imagem
          </Button>
        </div>
      </Modal>
    </Paper>
  );
}