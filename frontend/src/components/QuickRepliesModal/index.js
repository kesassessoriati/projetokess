import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  InputAdornment,
  List,
  ListItem,
  Typography,
  Box,
  IconButton,
  Grid,
  Chip,
  Tooltip,
  CircularProgress,
  Badge
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import SearchIcon from "@material-ui/icons/Search";
import CloseIcon from "@material-ui/icons/Close";
import FolderIcon from "@material-ui/icons/Folder";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import SendIcon from "@material-ui/icons/Send";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    height: "75vh",
    maxHeight: 600,
  },
  dialogContent: {
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  searchBox: {
    marginBottom: theme.spacing(2),
    flexShrink: 0,
  },
  columnsWrapper: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  groupList: {
    borderRight: `1px solid ${theme.palette.divider}`,
    height: "100%",
    overflowY: "auto",
    paddingRight: theme.spacing(1),
  },
  replyList: {
    height: "100%",
    overflowY: "auto",
    paddingLeft: theme.spacing(1),
  },
  groupItem: {
    borderRadius: 8,
    marginBottom: 4,
    cursor: "pointer",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    transition: "background 0.15s",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  groupItemActive: {
    backgroundColor: theme.palette.primary.main + "22",
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    fontWeight: 600,
  },
  replyCard: {
    borderRadius: 8,
    marginBottom: 8,
    cursor: "pointer",
    border: `1px solid ${theme.palette.divider}`,
    padding: "10px 14px",
    flexDirection: "column",
    alignItems: "flex-start",
    transition: "box-shadow 0.15s, border-color 0.15s",
    "&:hover": {
      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.background.paper,
    },
  },
  replyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  shortcutChip: {
    height: 22,
    fontSize: "0.7rem",
    backgroundColor: theme.palette.primary.main + "18",
    color: theme.palette.primary.main,
    fontWeight: 700,
    marginLeft: 6,
  },
  messagePreview: {
    color: theme.palette.text.secondary,
    fontSize: "0.82rem",
    lineHeight: 1.4,
    display: "-webkit-box",
    "-webkit-line-clamp": 3,
    "-webkit-box-orient": "vertical",
    overflow: "hidden",
    wordBreak: "break-word",
  },
  sendHint: {
    color: theme.palette.primary.main,
    fontSize: "0.72rem",
    marginTop: 6,
    opacity: 0,
    transition: "opacity 0.15s",
    "$replyCard:hover &": {
      opacity: 1,
    },
  },
  countBadge: {
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    borderRadius: 10,
    fontSize: "0.68rem",
    padding: "1px 6px",
    marginLeft: "auto",
    flexShrink: 0,
  },
  emptyBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: theme.palette.text.disabled,
    paddingTop: theme.spacing(4),
  },
  gridContainer: {
    flex: 1,
    overflow: "hidden",
    minHeight: 0,
  },
  gridItem: {
    height: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: 6,
    flexShrink: 0,
  },
}));

const QuickRepliesModal = ({ open, onClose, onSelect }) => {
  const classes = useStyles();
  const [groups, setGroups] = useState([]);
  const [replies, setReplies] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    if (open) {
      fetchGroups();
      fetchReplies();
      setSelectedGroupId(null);
      setSearchQuery("");
    }
  }, [open]);

  const fetchGroups = async () => {
    try {
      const { data } = await api.get("/quick-reply-groups");
      setGroups(Array.isArray(data) ? data : (data.records || []));
    } catch (err) {
      toastError(err);
    }
  };

  const fetchReplies = async (search = "") => {
    setLoading(true);
    try {
      const { data } = await api.get("/quick-replies", {
        params: { searchParam: search, pageNumber: 1, pageSize: 200 }
      });
      setReplies(data.records || []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchReplies(searchQuery);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectReply = async (reply) => {
    setSendingId(reply.id);
    if (reply.mediaUrl) {
      try {
        const { data } = await api.get(reply.mediaUrl, { responseType: "blob" });
        const fileName = reply.mediaUrl.split("/").pop();
        const file = new File([data], fileName, { type: reply.mediaType || data.type });
        onSelect(reply.message, file);
      } catch (err) {
        toastError(err);
        onSelect(reply.message, null);
      }
    } else {
      onSelect(reply.message, null);
    }
    setSendingId(null);
    onClose();
  };

  const filteredReplies = replies.filter((r) => {
    if (selectedGroupId && r.groupId !== selectedGroupId) return false;
    return true;
  });

  const getGroupCount = (groupId) => {
    if (groupId === null) return replies.length;
    return replies.filter((r) => r.groupId === groupId).length;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle disableTypography>
        <Box display="flex" alignItems="center">
          <FlashOnIcon color="primary" style={{ marginRight: 8 }} />
          <Typography variant="h6" style={{ fontWeight: 600 }}>Respostas Rápidas</Typography>
          <IconButton onClick={onClose} style={{ marginLeft: "auto" }} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent className={classes.dialogContent} dividers>
        <Box className={classes.searchBox}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Buscar mensagem..."
            value={searchQuery}
            autoFocus
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: loading && (
                <InputAdornment position="end">
                  <CircularProgress size={16} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Grid container spacing={1} className={classes.gridContainer} style={{ flex: 1, minHeight: 0 }}>
          {/* Grupos */}
          <Grid item xs={4} className={classes.gridItem}>
            <Typography variant="caption" color="textSecondary" className={classes.sectionTitle}>
              GRUPOS
            </Typography>
            <div className={classes.groupList}>
              <div
                className={`${classes.groupItem} ${!selectedGroupId ? classes.groupItemActive : ""}`}
                onClick={() => setSelectedGroupId(null)}
              >
                <FolderIcon fontSize="small" color="action" style={{ marginRight: 8, flexShrink: 0 }} />
                <Typography variant="body2" noWrap style={{ flex: 1 }}>Todos</Typography>
                <span className={classes.countBadge}>{getGroupCount(null)}</span>
              </div>
              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`${classes.groupItem} ${selectedGroupId === group.id ? classes.groupItemActive : ""}`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <FolderIcon fontSize="small" color={selectedGroupId === group.id ? "primary" : "action"} style={{ marginRight: 8, flexShrink: 0 }} />
                  <Typography variant="body2" noWrap style={{ flex: 1, fontWeight: selectedGroupId === group.id ? 600 : 400 }}>
                    {group.name}
                  </Typography>
                  <span className={classes.countBadge}>{getGroupCount(group.id)}</span>
                </div>
              ))}
            </div>
          </Grid>

          {/* Respostas */}
          <Grid item xs={8} className={classes.gridItem}>
            <Typography variant="caption" color="textSecondary" className={classes.sectionTitle}>
              MENSAGENS ({filteredReplies.length})
            </Typography>
            <div className={classes.replyList}>
              {filteredReplies.length === 0 ? (
                <div className={classes.emptyBox}>
                  <FlashOnIcon style={{ fontSize: 40, marginBottom: 8, opacity: 0.3 }} />
                  <Typography variant="body2">Nenhuma mensagem encontrada</Typography>
                </div>
              ) : (
                filteredReplies.map((reply) => (
                  <Tooltip key={reply.id} title="Clique para enviar" placement="top" arrow>
                    <ListItem
                      button
                      className={classes.replyCard}
                      onClick={() => handleSelectReply(reply)}
                      disabled={sendingId === reply.id}
                    >
                      <div className={classes.replyHeader}>
                        <Box display="flex" alignItems="center" style={{ flex: 1, minWidth: 0 }}>
                          {sendingId === reply.id ? (
                            <CircularProgress size={14} style={{ marginRight: 6 }} />
                          ) : (
                            <SendIcon fontSize="small" color="primary" style={{ marginRight: 6, flexShrink: 0 }} />
                          )}
                          {reply.shortcut && (
                            <Chip label={`/${reply.shortcut}`} size="small" className={classes.shortcutChip} />
                          )}
                        </Box>
                        {reply.mediaUrl && (
                          <Tooltip title="Contém mídia">
                            <AttachFileIcon fontSize="small" color="action" style={{ flexShrink: 0 }} />
                          </Tooltip>
                        )}
                      </div>
                      <Typography className={classes.messagePreview}>
                        {reply.message || <em style={{ opacity: 0.5 }}>Sem texto</em>}
                      </Typography>
                      <Typography className={classes.sendHint}>
                        Clique para inserir no chat →
                      </Typography>
                    </ListItem>
                  </Tooltip>
                ))
              )}
            </div>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default QuickRepliesModal;
