import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  IconButton,
  Grid
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import SearchIcon from "@material-ui/icons/Search";
import CloseIcon from "@material-ui/icons/Close";
import FolderIcon from "@material-ui/icons/Folder";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    padding: theme.spacing(2),
    height: "100%",
    minHeight: 400,
    overflowY: "auto"
  },
  searchBox: {
    marginBottom: theme.spacing(2)
  },
  groupList: {
    borderRight: `1px solid ${theme.palette.divider}`,
    height: "100%",
    paddingRight: theme.spacing(1)
  },
  replyList: {
    height: "100%",
    paddingLeft: theme.spacing(2)
  },
  listItem: {
    borderRadius: 8,
    marginBottom: 4,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: theme.palette.action.hover
    }
  },
  activeItem: {
    backgroundColor: theme.palette.action.selected
  },
  previewMedia: {
    maxWidth: 100,
    maxHeight: 100,
    objectFit: "cover",
    borderRadius: 8,
    marginTop: 8
  }
}));

const QuickRepliesModal = ({ open, onClose, onSelect }) => {
  const classes = useStyles();
  const [groups, setGroups] = useState([]);
  const [replies, setReplies] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

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
      setGroups(data);
    } catch (err) {
      toastError(err);
    }
  };

  const fetchReplies = async (search = "") => {
    try {
      const { data } = await api.get("/quick-replies", {
        params: { searchParam: search, pageNumber: 1 }
      });
      setReplies(data.records);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchReplies(searchQuery);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectReply = async (reply) => {
    if (reply.mediaUrl) {
      try {
        const { data } = await api.get(reply.mediaUrl, {
          responseType: "blob",
        });
        const file = new File([data], reply.mediaUrl.split('/').pop(), { type: reply.mediaType || data.type });
        onSelect(reply.message, file);
      } catch (err) {
        toastError(err);
        onSelect(reply.message, null);
      }
    } else {
      onSelect(reply.message, null);
    }
    onClose();
  };

  const filteredReplies = replies.filter((r) => {
    if (selectedGroupId && r.groupId !== selectedGroupId) return false;
    return true;
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justify="space-between" width="100%">
          <Typography variant="h6">Respostas Rápidas</Typography>
          <IconButton onClick={onClose} style={{ marginLeft: "auto" }}>
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
            placeholder="Buscar resposta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
        </Box>

        <Grid container style={{ height: "calc(100% - 60px)" }}>
          <Grid item xs={4} className={classes.groupList}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Grupos
            </Typography>
            <List component="nav">
              <ListItem
                button
                className={`${classes.listItem} ${!selectedGroupId ? classes.activeItem : ""}`}
                onClick={() => setSelectedGroupId(null)}
              >
                <ListItemText primary="Todos os Grupos" />
              </ListItem>
              {groups.map((group) => (
                <ListItem
                  button
                  key={group.id}
                  className={`${classes.listItem} ${selectedGroupId === group.id ? classes.activeItem : ""}`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <FolderIcon color="action" style={{ marginRight: 8 }} />
                  <ListItemText primary={group.name} />
                </ListItem>
              ))}
            </List>
          </Grid>

          <Grid item xs={8} className={classes.replyList}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Respostas
            </Typography>
            <List>
              {filteredReplies.length === 0 ? (
                <Box textAlign="center" mt={5}>
                  <Typography color="textSecondary">Nenhuma resposta encontrada.</Typography>
                </Box>
              ) : (
                filteredReplies.map((reply) => (
                  <ListItem
                    button
                    key={reply.id}
                    className={classes.listItem}
                    onClick={() => handleSelectReply(reply)}
                    style={{ border: "1px solid #eee", marginBottom: 8, flexDirection: "column", alignItems: "flex-start" }}
                  >
                    <Box display="flex" alignItems="center">
                      <FlashOnIcon color="primary" style={{ marginRight: 8 }} />
                      <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                        {reply.shortcut}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
                      {reply.message}
                    </Typography>
                    {reply.mediaUrl && (
                      <Box mt={1}>
                        <Typography variant="caption" color="primary">Contém mídia</Typography>
                      </Box>
                    )}
                  </ListItem>
                ))
              )}
            </List>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default QuickRepliesModal;
