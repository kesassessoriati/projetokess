import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import SearchIcon from "@material-ui/icons/Search";
import CloseIcon from "@material-ui/icons/Close";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import SendIcon from "@material-ui/icons/Send";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import CreateIcon from "@material-ui/icons/Create";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    width: "min(960px, 96vw)",
    maxWidth: "96vw",
    height: "78vh",
    maxHeight: 760,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  sidebar: {
    width: 370,
    minWidth: 340,
    maxWidth: 400,
    height: "80vh",
    maxHeight: "80vh",
    backgroundColor: "#f8fafc",
    borderLeft: "1px solid #dbe4ee",
    boxShadow: "-10px 0 24px rgba(15, 23, 42, 0.08)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    overflow: "hidden"
  },
  header: {
    padding: theme.spacing(1.5, 2),
    borderBottom: "1px solid #dbe4ee",
    background: "linear-gradient(135deg, #075E54 0%, #128C7E 60%, #25D366 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexShrink: 0
  },
  content: {
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
    overflow: "hidden",
    height: "100%",
    minHeight: 0
  },
  searchField: {
    backgroundColor: "#fff",
    borderRadius: 14
  },
  filterRow: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  filterChip: {
    borderRadius: 999,
    fontWeight: 600
  },
  sectionsWrap: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
    paddingRight: theme.spacing(0.5)
  },
  section: {
    marginBottom: theme.spacing(1.5),
    borderRadius: 18,
    border: "1px solid #dbe4ee",
    backgroundColor: "#fff",
    overflow: "hidden"
  },
  sectionHeader: {
    padding: theme.spacing(1.25, 1.5),
    background: "linear-gradient(135deg, #eff6ff, #f8fafc)",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  sectionTitle: {
    fontWeight: 800,
    color: "#0f172a",
    flex: 1,
    minWidth: 0
  },
  sectionCount: {
    backgroundColor: "rgba(29,78,216,0.12)",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: 700
  },
  replyList: {
    padding: theme.spacing(1.25),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1)
  },
  replyCard: {
    borderRadius: 16,
    border: "1px solid #dbe4ee",
    backgroundColor: "#fff",
    padding: theme.spacing(1.25),
    transition: "all 0.2s ease",
    cursor: "pointer",
    "&:hover": {
      borderColor: theme.palette.primary.main,
      boxShadow: "0 8px 24px rgba(37, 99, 235, 0.12)"
    }
  },
  replyTop: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.75)
  },
  shortcutChip: {
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.12)",
    color: "#047857",
    fontWeight: 700
  },
  preview: {
    color: "#475569",
    fontSize: "0.84rem",
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word"
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
  },
  emptyState: {
    minHeight: 160,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: "#94a3b8",
    padding: theme.spacing(3)
  }
}));

const UNGROUPED_ID = "ungrouped";

const buildFileName = (reply, blob) => {
  if (reply?.mediaName) return reply.mediaName;

  const mime = reply?.mediaType || blob?.type || "";
  const extension = mime.includes("/") ? `.${mime.split("/")[1]}` : "";
  return `quick-reply-${reply?.id || Date.now()}${extension}`;
};

const QuickRepliesModal = ({ open, onClose, onSelect, variant = "dialog" }) => {
  const classes = useStyles();
  const [groups, setGroups] = useState([]);
  const [replies, setReplies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const isSidebar = variant === "sidebar";

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsRes, repliesRes] = await Promise.all([
        api.get("/quick-reply-groups"),
        api.get("/quick-replies", {
          params: {
            pageNumber: 1,
            pageSize: 500,
            searchParam: ""
          }
        })
      ]);

      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
      setReplies(Array.isArray(repliesRes.data?.records) ? repliesRes.data.records : []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedGroupId(null);
    }
  }, [open]);

  const filteredReplies = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return replies.filter((reply) => {
      if (selectedGroupId !== null) {
        const currentGroupId = reply.groupId || UNGROUPED_ID;
        if (String(currentGroupId) !== String(selectedGroupId)) {
          return false;
        }
      }

      if (!normalizedQuery) return true;

      return [reply.shortcut, reply.message, reply.group?.name, reply.mediaName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [replies, searchQuery, selectedGroupId]);

  const sections = useMemo(() => {
    const orderedGroups = [{ id: UNGROUPED_ID, name: "Sem pipeline", isVirtual: true }, ...groups];

    return orderedGroups
      .map((group) => {
        const groupReplies = filteredReplies.filter((reply) => {
          const currentGroupId = reply.groupId || UNGROUPED_ID;
          return String(currentGroupId) === String(group.id);
        });

        return {
          ...group,
          replies: groupReplies
        };
      })
      .filter((section) => section.replies.length > 0 || selectedGroupId === null || String(selectedGroupId) === String(section.id));
  }, [filteredReplies, groups, selectedGroupId]);

  const handleSelectReply = async (reply, autoSend = true) => {
    try {
      setSendingId(reply.id);

      let file = null;
      if (reply.mediaUrl) {
        const { data } = await api.get(`/quick-replies/${reply.id}/media`, {
          responseType: "blob"
        });
        file = new File([data], buildFileName(reply, data), {
          type: reply.mediaType || data.type || "application/octet-stream"
        });
      }

      onSelect(reply.message || "", file, autoSend, reply);

      if (!isSidebar && onClose) {
        onClose();
      }
    } catch (err) {
      toastError(err);
    } finally {
      setSendingId(null);
    }
  };

  const headerContent = (
    <div className={classes.header}>
      <FlashOnIcon />
      <Box minWidth={0} flex={1}>
        <Typography variant="subtitle1" style={{ fontWeight: 800 }}>
          Respostas rápidas
        </Typography>
        <Typography variant="caption" style={{ opacity: 0.82 }}>
          Texto e mídia prontos para envio em um clique.
        </Typography>
      </Box>
      <IconButton onClick={onClose} style={{ color: "#fff" }} size="small">
        <CloseIcon />
      </IconButton>
    </div>
  );

  const bodyContent = (
    <div className={classes.content}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Pesquisar resposta, mídia ou pipeline"
          value={searchQuery}
          autoFocus={!isSidebar}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={classes.searchField}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: loading ? (
              <InputAdornment position="end">
                <CircularProgress size={16} />
              </InputAdornment>
            ) : null
          }}
        />

        <div className={classes.filterRow}>
          <Chip
            label="Tudo"
            clickable
            color={selectedGroupId === null ? "primary" : "default"}
            onClick={() => setSelectedGroupId(null)}
            className={classes.filterChip}
          />
          <Chip
            label="Sem pipeline"
            clickable
            color={String(selectedGroupId) === UNGROUPED_ID ? "primary" : "default"}
            onClick={() => setSelectedGroupId(UNGROUPED_ID)}
            className={classes.filterChip}
          />
          {groups.map((group) => (
            <Chip
              key={group.id}
              label={group.name}
              clickable
              color={String(selectedGroupId) === String(group.id) ? "primary" : "default"}
              onClick={() => setSelectedGroupId(group.id)}
              className={classes.filterChip}
            />
          ))}
        </div>

        <div className={classes.sectionsWrap}>
          {loading ? (
            <div className={classes.emptyState}>
              <CircularProgress size={24} />
            </div>
          ) : sections.length === 0 ? (
            <div className={classes.emptyState}>
              <Typography variant="body2">Nenhuma resposta encontrada para este filtro.</Typography>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.id} className={classes.section}>
                <div className={classes.sectionHeader}>
                  <FolderOpenIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" className={classes.sectionTitle} noWrap>
                    {section.name}
                  </Typography>
                  <span className={classes.sectionCount}>{section.replies.length}</span>
                </div>

                <div className={classes.replyList}>
                  {section.replies.map((reply) => (
                    <div key={reply.id} className={classes.replyCard} onClick={() => handleSelectReply(reply, true)}>
                      <div className={classes.replyTop}>
                        {sendingId === reply.id ? (
                          <CircularProgress size={14} />
                        ) : (
                          <SendIcon fontSize="small" color="primary" />
                        )}

                        {reply.shortcut && (
                          <Chip label={`/${reply.shortcut}`} size="small" className={classes.shortcutChip} />
                        )}

                        {reply.interactiveType && reply.interactiveType !== "text" && (
                          <Chip
                            label={reply.interactiveType === "buttons" ? "Botões" : reply.interactiveType === "list" ? "Lista" : reply.interactiveType === "carousel" ? "Carrossel" : "Enquete"}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}

                        <Box marginLeft="auto" display="flex" alignItems="center">
                          {reply.mediaUrl && (
                            <Tooltip title={reply.mediaName || "Contém mídia"}>
                              <AttachFileIcon fontSize="small" color="action" style={{ marginRight: 8 }} />
                            </Tooltip>
                          )}
                          <Tooltip title="Revisar antes de enviar">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSelectReply(reply, false);
                              }}
                            >
                              <CreateIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </div>

                      <Typography className={classes.preview}>
                        {reply.message || "Resposta sem texto. Esta ação envia apenas a mídia vinculada."}
                      </Typography>

                      <div className={classes.footer}>
                        <Typography variant="caption" color="textSecondary">
                          {reply.mediaSource === "library"
                            ? "Biblioteca integrada"
                            : reply.mediaUrl
                              ? "Upload vinculado"
                              : reply.interactiveType && reply.interactiveType !== "text"
                                ? "Recurso premium"
                                : "Texto puro"}
                        </Typography>
                        <Typography variant="caption" color="primary">
                          Clique para enviar
                        </Typography>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
  );

  if (!open) {
    return null;
  }

  if (isSidebar) {
    return (
      <div className={classes.sidebar}>
        {headerContent}
        {bodyContent}
      </div>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" classes={{ paper: classes.dialogPaper }}>
      <DialogTitle disableTypography style={{ padding: 0 }}>
        {headerContent}
      </DialogTitle>
      <DialogContent dividers style={{ padding: 0, flex: 1, minHeight: 0, overflow: "hidden" }}>
        {bodyContent}
      </DialogContent>
    </Dialog>
  );
};

export default QuickRepliesModal;
