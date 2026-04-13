import React, { useEffect, useMemo, useRef, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import SearchIcon from "@material-ui/icons/Search";
import DragIndicatorIcon from "@material-ui/icons/DragIndicator";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import GroupModal from "./GroupModal";
import ReplyModal from "./ReplyModal";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(3),
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5)
    }
  },
  hero: {
    padding: theme.spacing(2.5),
    borderRadius: 22,
    background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(29,78,216,0.92))",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    flexWrap: "wrap"
  },
  heroStats: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    alignItems: "center"
  },
  heroChip: {
    backgroundColor: "rgba(255,255,255,0.14)",
    color: "#fff",
    borderRadius: 999
  },
  toolbar: {
    display: "flex",
    gap: theme.spacing(1.5),
    flexWrap: "wrap",
    alignItems: "center"
  },
  boardArea: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1)
  },
  boardTopScrollbar: {
    overflowX: "auto",
    overflowY: "hidden",
    height: 16,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 999,
    border: "1px solid rgba(148, 163, 184, 0.18)"
  },
  boardTopScrollbarInner: {
    height: 1
  },
  searchField: {
    minWidth: 280,
    backgroundColor: "#fff",
    borderRadius: 14
  },
  boardWrapper: {
    flex: 1,
    minHeight: 0,
    overflowX: "auto",
    overflowY: "hidden",
    paddingBottom: theme.spacing(1),
    scrollbarGutter: "stable both-edges"
  },
  board: {
    display: "flex",
    gap: theme.spacing(2),
    minHeight: "100%",
    height: "100%",
    minWidth: "max-content",
    alignItems: "stretch",
    paddingBottom: theme.spacing(0.5)
  },
  columnShell: {
    minWidth: 320,
    maxWidth: 320,
    display: "flex",
    alignSelf: "stretch",
    [theme.breakpoints.down("sm")]: {
      minWidth: 286,
      maxWidth: 286
    }
  },
  column: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: 24,
    backgroundColor: "#fff",
    border: "1px solid #dbe4ee",
    boxShadow: "0 18px 36px rgba(15, 23, 42, 0.08)",
    overflow: "hidden"
  },
  columnHeader: {
    padding: theme.spacing(1.5, 2),
    borderBottom: "1px solid #e5e7eb",
    background: "linear-gradient(135deg, #f8fafc, #eff6ff)"
  },
  columnHeaderTop: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  columnTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flex: 1,
    minWidth: 0
  },
  columnTitle: {
    fontWeight: 800,
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  countChip: {
    borderRadius: 999,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    color: "#1d4ed8",
    fontWeight: 700
  },
  dragHandle: {
    cursor: "grab",
    color: "#64748b"
  },
  columnBody: {
    flex: 1,
    minHeight: 0,
    padding: theme.spacing(1.5),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.25),
    overflowY: "auto",
    background: "linear-gradient(180deg, rgba(248,250,252,0.35), rgba(255,255,255,0.92))",
    scrollbarGutter: "stable"
  },
  card: {
    borderRadius: 18,
    padding: theme.spacing(1.5),
    border: "1px solid #dbe4ee",
    backgroundColor: "#fff",
    boxShadow: "0 10px 24px rgba(15,23,42,0.06)"
  },
  cardTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  shortcutChip: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    color: "#047857",
    fontWeight: 700,
    borderRadius: 999
  },
  cardMessage: {
    color: "#475569",
    lineHeight: 1.5,
    minHeight: 42,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word"
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
  },
  emptyColumn: {
    borderRadius: 18,
    border: "1px dashed #cbd5e1",
    padding: theme.spacing(2),
    textAlign: "center",
    color: "#94a3b8",
    backgroundColor: "rgba(248,250,252,0.85)"
  }
}));

const UNGROUPED_ID = "ungrouped";

const QuickMessages = () => {
  const classes = useStyles();
  const topScrollbarRef = useRef(null);
  const topScrollbarInnerRef = useRef(null);
  const boardWrapperRef = useRef(null);
  const scrollSyncSourceRef = useRef(null);
  const [groups, setGroups] = useState([]);
  const [replies, setReplies] = useState([]);
  const [search, setSearch] = useState("");
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedReply, setSelectedReply] = useState(null);
  const [defaultGroupId, setDefaultGroupId] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const [groupsRes, repliesRes] = await Promise.all([
        api.get("/quick-reply-groups"),
        api.get("/quick-replies", { params: { pageNumber: 1, pageSize: 500, searchParam: "" } })
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
    fetchBoard();
  }, []);

  const filteredReplies = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return replies;

    return replies.filter((reply) =>
      [reply.shortcut, reply.message, reply.group?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [replies, search]);

  const orderedColumns = useMemo(
    () => [
      { id: UNGROUPED_ID, name: "Sem pipeline", description: "Mensagens soltas", isVirtual: true, sortOrder: -1 },
      ...groups
    ],
    [groups]
  );

  const repliesByGroup = useMemo(() => {
    const grouped = orderedColumns.reduce((acc, column) => {
      acc[column.id] = [];
      return acc;
    }, {});

    filteredReplies.forEach((reply) => {
      const bucketId = reply.groupId || UNGROUPED_ID;
      if (!grouped[bucketId]) {
        grouped[bucketId] = [];
      }
      grouped[bucketId].push(reply);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key] = grouped[key].sort((a, b) => {
        const aOrder = Number(a.sortOrder || 0);
        const bOrder = Number(b.sortOrder || 0);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return String(a.shortcut || "").localeCompare(String(b.shortcut || ""));
      });
    });

    return grouped;
  }, [filteredReplies, orderedColumns]);

  const totalMediaReplies = replies.filter((reply) => Boolean(reply.mediaUrl)).length;
  const dragDisabled = Boolean(search.trim());

  useEffect(() => {
    const syncScrollbarWidth = () => {
      if (!boardWrapperRef.current || !topScrollbarInnerRef.current) return;
      topScrollbarInnerRef.current.style.width = `${boardWrapperRef.current.scrollWidth}px`;
    };

    syncScrollbarWidth();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" && boardWrapperRef.current
        ? new ResizeObserver(() => syncScrollbarWidth())
        : null;

    if (resizeObserver && boardWrapperRef.current) {
      resizeObserver.observe(boardWrapperRef.current);
      const boardNode = boardWrapperRef.current.firstElementChild;
      if (boardNode) {
        resizeObserver.observe(boardNode);
      }
    }

    window.addEventListener("resize", syncScrollbarWidth);

    return () => {
      window.removeEventListener("resize", syncScrollbarWidth);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [groups, replies, filteredReplies.length, loading, search]);

  const syncHorizontalScroll = (source) => {
    const topNode = topScrollbarRef.current;
    const bottomNode = boardWrapperRef.current;

    if (!topNode || !bottomNode) return;

    if (scrollSyncSourceRef.current && scrollSyncSourceRef.current !== source) {
      return;
    }

    scrollSyncSourceRef.current = source;

    if (source === "top") {
      bottomNode.scrollLeft = topNode.scrollLeft;
    } else {
      topNode.scrollLeft = bottomNode.scrollLeft;
    }

    window.requestAnimationFrame(() => {
      scrollSyncSourceRef.current = null;
    });
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Deseja mesmo excluir o pipeline "${group.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/quick-reply-groups/${group.id}`);
      toast.success("Pipeline removido.");
      fetchBoard();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDeleteReply = async (reply) => {
    if (!window.confirm(`Deseja mesmo excluir a resposta "/${reply.shortcut}"?`)) {
      return;
    }

    try {
      await api.delete(`/quick-replies/${reply.id}`);
      toast.success("Resposta removida.");
      fetchBoard();
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenNewReply = (groupId = "") => {
    setSelectedReply(null);
    setDefaultGroupId(groupId);
    setReplyModalOpen(true);
  };

  const persistGroupOrder = async (nextGroups) => {
    await api.put("/quick-reply-groups/sort", {
      groups: nextGroups.map((group, index) => ({
        id: group.id,
        sortOrder: index
      }))
    });
  };

  const buildReplyBuckets = (sourceReplies, sourceGroups) => {
    const bucketIds = [UNGROUPED_ID, ...sourceGroups.map((group) => String(group.id))];
    const buckets = bucketIds.reduce((acc, bucketId) => {
      acc[bucketId] = [];
      return acc;
    }, {});

    sourceReplies.forEach((reply) => {
      const bucketId = reply.groupId ? String(reply.groupId) : UNGROUPED_ID;
      if (!buckets[bucketId]) {
        buckets[bucketId] = [];
      }
      buckets[bucketId].push(reply);
    });

    bucketIds.forEach((bucketId) => {
      buckets[bucketId] = buckets[bucketId].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    });

    return { bucketIds, buckets };
  };

  const persistReplyOrder = async (bucketIds, buckets) => {
    const payload = bucketIds.flatMap((bucketId) =>
      (buckets[bucketId] || []).map((reply, index) => ({
        id: reply.id,
        groupId: bucketId === UNGROUPED_ID ? null : Number(bucketId),
        sortOrder: index
      }))
    );

    await api.put("/quick-replies/sort", { replies: payload });
  };

  const handleDragEnd = async (result) => {
    const { source, destination, type } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (dragDisabled) return;

    if (type === "GROUP") {
      const nextGroups = Array.from(groups);
      const [movedGroup] = nextGroups.splice(source.index, 1);
      nextGroups.splice(destination.index, 0, movedGroup);

      setGroups(nextGroups.map((group, index) => ({ ...group, sortOrder: index })));

      try {
        await persistGroupOrder(nextGroups);
        toast.success("Pipelines reorganizados.");
      } catch (err) {
        toast.error("Erro ao reorganizar pipelines.");
        fetchBoard();
      }
      return;
    }

    const { bucketIds, buckets } = buildReplyBuckets(replies, groups);
    const sourceBucket = Array.from(buckets[source.droppableId] || []);
    const destinationBucket =
      source.droppableId === destination.droppableId
        ? sourceBucket
        : Array.from(buckets[destination.droppableId] || []);

    const [movedReply] = sourceBucket.splice(source.index, 1);
    destinationBucket.splice(destination.index, 0, {
      ...movedReply,
      groupId: destination.droppableId === UNGROUPED_ID ? null : Number(destination.droppableId)
    });

    const nextBuckets = {
      ...buckets,
      [source.droppableId]: sourceBucket,
      [destination.droppableId]: destinationBucket
    };

    const nextReplies = bucketIds.flatMap((bucketId) =>
      (nextBuckets[bucketId] || []).map((reply, index) => ({
        ...reply,
        groupId: bucketId === UNGROUPED_ID ? null : Number(bucketId),
        sortOrder: index
      }))
    );

    setReplies(nextReplies);

    try {
      await persistReplyOrder(bucketIds, nextBuckets);
      toast.success("Resposta reposicionada.");
    } catch (err) {
      toast.error("Erro ao mover resposta rápida.");
      fetchBoard();
    }
  };

  return (
    <Box className={classes.root}>
      <Paper className={classes.hero} elevation={0}>
        <Box>
          <Typography variant="h4" style={{ fontWeight: 800, marginBottom: 8 }}>
            Biblioteca de Respostas Rápidas
          </Typography>
          <Typography variant="body1" style={{ maxWidth: 760, opacity: 0.85 }}>
            Organize campanhas, etapas e contextos de atendimento em pipelines visuais. Cada card pode combinar
            texto com mídia da biblioteca para acelerar o envio no chat.
          </Typography>
        </Box>
        <Box className={classes.heroStats}>
          <Chip icon={<FolderOpenIcon style={{ color: "#fff" }} />} label={`${groups.length} pipelines`} className={classes.heroChip} />
          <Chip icon={<FlashOnIcon style={{ color: "#fff" }} />} label={`${replies.length} respostas`} className={classes.heroChip} />
          <Chip icon={<AttachFileIcon style={{ color: "#fff" }} />} label={`${totalMediaReplies} com mídia`} className={classes.heroChip} />
        </Box>
      </Paper>

      <Box className={classes.toolbar}>
        <TextField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar atalho, mensagem ou pipeline..."
          variant="outlined"
          size="small"
          className={classes.searchField}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedGroup(null);
            setGroupModalOpen(true);
          }}
        >
          Novo Pipeline
        </Button>
        <Button variant="contained" color="secondary" startIcon={<FlashOnIcon />} onClick={() => handleOpenNewReply("")}>
          Nova Resposta
        </Button>
        {dragDisabled && (
          <Chip
            label="A ordenação por arraste fica pausada enquanto houver busca ativa."
            color="secondary"
            variant="outlined"
          />
        )}
      </Box>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={classes.boardArea}>
          <div
            className={classes.boardTopScrollbar}
            ref={topScrollbarRef}
            onScroll={() => syncHorizontalScroll("top")}
          >
            <div className={classes.boardTopScrollbarInner} ref={topScrollbarInnerRef} />
          </div>

          <div
            className={classes.boardWrapper}
            ref={boardWrapperRef}
            onScroll={() => syncHorizontalScroll("bottom")}
          >
          <Droppable droppableId="quick-reply-board" direction="horizontal" type="GROUP">
            {(boardProvided) => (
              <div className={classes.board} ref={boardProvided.innerRef} {...boardProvided.droppableProps}>
                {orderedColumns.map((column, columnIndex) => {
                  const columnReplies = repliesByGroup[column.id] || [];
                  const isVirtual = column.id === UNGROUPED_ID;

                  return (
                    <Draggable
                      key={column.id}
                      draggableId={`group-${column.id}`}
                      index={columnIndex}
                      isDragDisabled={dragDisabled || isVirtual}
                    >
                      {(groupProvided) => (
                        <div
                          className={classes.columnShell}
                          ref={groupProvided.innerRef}
                          {...groupProvided.draggableProps}
                          style={groupProvided.draggableProps.style}
                        >
                          <Paper className={classes.column} elevation={0}>
                            <div className={classes.columnHeader}>
                              <div className={classes.columnHeaderTop}>
                                {!isVirtual ? (
                                  <div {...groupProvided.dragHandleProps} className={classes.dragHandle}>
                                    <DragIndicatorIcon />
                                  </div>
                                ) : (
                                  <Avatar style={{ width: 32, height: 32, background: "#e2e8f0", color: "#334155" }}>
                                    <FolderOpenIcon fontSize="small" />
                                  </Avatar>
                                )}

                                <div className={classes.columnTitleWrap}>
                                  <Typography variant="subtitle1" className={classes.columnTitle}>
                                    {column.name}
                                  </Typography>
                                  <Chip label={columnReplies.length} size="small" className={classes.countChip} />
                                </div>

                                {!isVirtual && (
                                  <>
                                    <Tooltip title="Editar pipeline">
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setSelectedGroup(column);
                                          setGroupModalOpen(true);
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Excluir pipeline">
                                      <IconButton size="small" onClick={() => handleDeleteGroup(column)}>
                                        <DeleteOutlineIcon fontSize="small" color="secondary" />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                              </div>

                              <Box mt={1} display="flex" alignItems="center" justifyContent="space-between">
                                <Typography variant="caption" color="textSecondary">
                                  {isVirtual ? "Respostas ainda não categorizadas." : column.description || "Use como campanha, etapa ou playbook."}
                                </Typography>
                                <Button size="small" color="primary" onClick={() => handleOpenNewReply(isVirtual ? "" : column.id)}>
                                  + Resposta
                                </Button>
                              </Box>
                            </div>

                            <Droppable droppableId={String(column.id)} type="REPLY" isDropDisabled={dragDisabled}>
                              {(replyProvided) => (
                                <div className={classes.columnBody} ref={replyProvided.innerRef} {...replyProvided.droppableProps}>
                                  {columnReplies.length === 0 && (
                                    <div className={classes.emptyColumn}>
                                      <Typography variant="body2">
                                        {loading ? "Carregando..." : "Nenhuma resposta neste pipeline ainda."}
                                      </Typography>
                                    </div>
                                  )}

                                  {columnReplies.map((reply, replyIndex) => (
                                    <Draggable
                                      key={reply.id}
                                      draggableId={`reply-${reply.id}`}
                                      index={replyIndex}
                                      isDragDisabled={dragDisabled}
                                    >
                                      {(replyDragProvided) => (
                                        <div ref={replyDragProvided.innerRef} {...replyDragProvided.draggableProps} {...replyDragProvided.dragHandleProps}>
                                          <Paper className={classes.card} elevation={0}>
                                            <div className={classes.cardTop}>
                                              <Avatar style={{ width: 36, height: 36, background: "#dbeafe", color: "#1d4ed8" }}>
                                                <FlashOnIcon fontSize="small" />
                                              </Avatar>
                                              <Box flex={1} minWidth={0}>
                                                <Box display="flex" alignItems="center" style={{ gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                                                  <Chip label={`/${reply.shortcut}`} size="small" className={classes.shortcutChip} />
                                                  {reply.mediaUrl && <Chip size="small" icon={<AttachFileIcon />} label={reply.mediaName || "Mídia"} />}
                                                </Box>
                                                <Typography className={classes.cardMessage}>
                                                  {reply.message || "Sem texto. Esta resposta envia apenas a mídia vinculada."}
                                                </Typography>
                                              </Box>
                                            </div>

                                            <div className={classes.cardFooter}>
                                              <Typography variant="caption" color="textSecondary">
                                                {reply.mediaSource === "library" ? "Biblioteca integrada" : reply.mediaUrl ? "Upload vinculado" : "Texto puro"}
                                              </Typography>
                                              <Box display="flex" alignItems="center">
                                                <Tooltip title="Editar resposta">
                                                  <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                      setSelectedReply(reply);
                                                      setDefaultGroupId(reply.groupId || "");
                                                      setReplyModalOpen(true);
                                                    }}
                                                  >
                                                    <EditIcon fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Excluir resposta">
                                                  <IconButton size="small" onClick={() => handleDeleteReply(reply)}>
                                                    <DeleteOutlineIcon fontSize="small" color="secondary" />
                                                  </IconButton>
                                                </Tooltip>
                                              </Box>
                                            </div>
                                          </Paper>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {replyProvided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </Paper>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {boardProvided.placeholder}
              </div>
            )}
          </Droppable>
          </div>
        </div>
      </DragDropContext>

      <GroupModal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        group={selectedGroup}
        onSaved={fetchBoard}
      />

      <ReplyModal
        open={replyModalOpen}
        onClose={() => setReplyModalOpen(false)}
        reply={selectedReply}
        groups={groups}
        defaultGroupId={defaultGroupId}
        onSaved={fetchBoard}
      />
    </Box>
  );
};

export default QuickMessages;
