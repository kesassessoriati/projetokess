import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Tooltip
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
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
    backgroundColor: theme.palette.background.default
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.palette.text.primary
  },
  paper: {
    padding: theme.spacing(2),
    height: "100%",
    display: "flex",
    flexDirection: "column"
  },
  actions: {
    marginBottom: theme.spacing(2)
  }
}));

const QuickMessages = () => {
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);

  const [groups, setGroups] = useState([]);
  const [replies, setReplies] = useState([]);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedReply, setSelectedReply] = useState(null);

  useEffect(() => {
    fetchGroups();
    fetchReplies();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await api.get("/quick-reply-groups");
      setGroups(data);
    } catch (err) {
      toastError(err);
    }
  };

  const fetchReplies = async () => {
    try {
      const { data } = await api.get("/quick-replies", {
        params: { pageNumber: 1, searchParam: "" }
      });
      setReplies(data.records);
    } catch (err) {
      toastError(err);
    }
  };

  const handleDeleteGroup = async (id) => {
    if (window.confirm("Deseja mesmo excluir este grupo?")) {
      try {
        await api.delete(`/quick-reply-groups/${id}`);
        toast.success("Grupo excluído.");
        fetchGroups();
      } catch (err) {
        toastError(err);
      }
    }
  };

  const handleDeleteReply = async (id) => {
    if (window.confirm("Deseja mesmo excluir esta resposta?")) {
      try {
        await api.delete(`/quick-replies/${id}`);
        toast.success("Resposta excluída.");
        fetchReplies();
      } catch (err) {
        toastError(err);
      }
    }
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Typography className={classes.title}>Respostas Rápidas com Mídia</Typography>
      </Box>

      <Paper className={classes.paper}>
        <Tabs
          value={tabValue}
          onChange={(e, val) => setTabValue(val)}
          indicatorColor="primary"
          textColor="primary"
          style={{ marginBottom: 16 }}
        >
          <Tab label="Respostas Rápidas" />
          <Tab label="Grupos de Respostas" />
        </Tabs>

        {tabValue === 0 && (
          <>
            <Box className={classes.actions}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedReply(null);
                  setReplyModalOpen(true);
                }}
              >
                Nova Resposta
              </Button>
            </Box>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Atalho</TableCell>
                  <TableCell>Mensagem</TableCell>
                  <TableCell>Mídia</TableCell>
                  <TableCell>Grupo</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {replies.map((reply) => (
                  <TableRow key={reply.id}>
                    <TableCell>{reply.shortcut}</TableCell>
                    <TableCell>
                      {reply.message.length > 50
                        ? `${reply.message.substring(0, 50)}...`
                        : reply.message}
                    </TableCell>
                    <TableCell>{reply.mediaUrl ? "Sim" : "Não"}</TableCell>
                    <TableCell>{reply.group?.name || "Sem Grupo"}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedReply(reply);
                          setReplyModalOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteReply(reply.id)}
                      >
                        <DeleteOutlineIcon color="secondary" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {tabValue === 1 && (
          <>
            <Box className={classes.actions}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedGroup(null);
                  setGroupModalOpen(true);
                }}
              >
                Novo Grupo
              </Button>
            </Box>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{group.description}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedGroup(group);
                          setGroupModalOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        <DeleteOutlineIcon color="secondary" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Paper>

      {groupModalOpen && (
        <GroupModal
          open={groupModalOpen}
          onClose={() => {
            setGroupModalOpen(false);
            fetchGroups();
          }}
          group={selectedGroup}
        />
      )}

      {replyModalOpen && (
        <ReplyModal
          open={replyModalOpen}
          groups={groups}
          onClose={() => {
            setReplyModalOpen(false);
            fetchReplies();
          }}
          reply={selectedReply}
        />
      )}
    </Box>
  );
};

export default QuickMessages;