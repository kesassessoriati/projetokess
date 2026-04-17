import React, { useContext, useEffect, useState } from "react";
import {
  makeStyles,
  Modal,
  Backdrop,
  Fade,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Tooltip,
  Avatar,
  LinearProgress,
  Chip,
  Slide,
  Box,
  TextField,
  InputAdornment
} from "@material-ui/core";
import {
  Delete as DeleteIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Label as LabelIcon,
  Search as SearchIcon,
  BusinessCenter as BusinessCenterIcon
} from "@material-ui/icons";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useSocket } from "../../context/SocketContext";

const useStyles = makeStyles((theme) => ({
  modal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(8px)",
    padding: theme.spacing(2),
  },
  paper: {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[24],
    padding: 0,
    borderRadius: "8px",
    overflow: "hidden",
    maxHeight: "90vh",
    width: "90%",
    maxWidth: "1200px",
    border: "none",
    display: "flex",
    flexDirection: "column",
    "&:focus": {
      outline: "none",
    },
  },
  header: {
    padding: theme.spacing(3),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
  },
  closeButton: {
    color: theme.palette.primary.contrastText,
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  },
  title: {
    fontWeight: 700,
    fontSize: "1.5rem",
  },
  tagChip: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    color: theme.palette.primary.contrastText,
    fontWeight: 500,
    height: "32px",
    borderRadius: "8px",
  },
  content: {
    padding: theme.spacing(3),
    overflowY: "auto",
    flex: 1,
  },
  controls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(3),
    gap: theme.spacing(2),
  },
  searchField: {
    flex: 1,
    maxWidth: "400px",
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      backgroundColor: theme.palette.background.default,
    },
    "& .MuiOutlinedInput-input": {
      padding: "12px 14px",
    },
  },
  tableContainer: {
    borderRadius: "8px",
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "none",
    "&::-webkit-scrollbar": {
      height: "8px",
      width: "8px",
    },
    "&::-webkit-scrollbar-track": {
      background: theme.palette.action.hover,
    },
    "&::-webkit-scrollbar-thumb": {
      background: theme.palette.text.disabled,
      borderRadius: "4px",
    },
  },
  table: {
    minWidth: 650,
  },
  tableHeader: {
    backgroundColor: theme.palette.background.default,
    "& th": {
      fontWeight: 600,
      fontSize: "0.875rem",
      color: theme.palette.text.secondary,
      padding: "16px",
    },
  },
  tableRow: {
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  tableCell: {
    padding: "16px",
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  avatarContact: {
    backgroundColor: "#25d366",
    color: "#fff",
    width: theme.spacing(4),
    height: theme.spacing(4),
    fontSize: "1rem",
  },
  avatarClient: {
    backgroundColor: "#1976d2",
    color: "#fff",
    width: theme.spacing(4),
    height: theme.spacing(4),
    fontSize: "1rem",
  },
  contactName: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
  },
  contactInfo: {
    display: "flex",
    flexDirection: "column",
  },
  contactId: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
  },
  phoneCell: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    color: theme.palette.text.primary,
  },
  actionCell: {
    width: "120px",
    textAlign: "center",
  },
  deleteButton: {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.main,
    "&:hover": {
      backgroundColor: "#ffcdd2",
    },
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(6),
    textAlign: "center",
  },
  emptyIcon: {
    fontSize: "4rem",
    color: theme.palette.action.disabledBackground,
    marginBottom: theme.spacing(2),
  },
  emptyText: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  loading: {
    width: "100%",
    marginTop: theme.spacing(2),
  },
  progressBar: {
    height: "6px",
    borderRadius: "3px",
    "& .MuiLinearProgress-bar": {
      borderRadius: "3px",
    },
  },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    color: theme.palette.primary.contrastText,
    borderRadius: "12px",
    padding: "4px 8px",
    fontSize: "0.75rem",
    fontWeight: 600,
    marginLeft: theme.spacing(1),
  },
  typeBadgeContact: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    fontWeight: 600,
    fontSize: "0.7rem",
    height: 20,
    borderRadius: 4,
  },
  typeBadgeClient: {
    backgroundColor: "#e3f2fd",
    color: "#1565c0",
    fontWeight: 600,
    fontSize: "0.7rem",
    height: 20,
    borderRadius: 4,
  },
}));

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const ContactTagListModal = ({ open, onClose, tag }) => {
  const classes = useStyles();
  const [allEntities, setAllEntities] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const { isConnected, on } = useSocket();

  // Build combined list from contacts + clients
  const buildEntities = (tagObj) => {
    const contacts = (tagObj?.contacts || []).map((c) => ({
      id: c.id,
      name: c.name,
      displayPhone: c.number,
      entityType: "Contato",
      entityKey: `contact-${c.id}`,
    }));
    const clients = (tagObj?.clients || []).map((c) => ({
      id: c.id,
      name: c.name,
      displayPhone: c.phone,
      entityType: "Cliente",
      entityKey: `client-${c.id}`,
    }));
    return [...contacts, ...clients];
  };

  useEffect(() => {
    if (open && tag) {
      setLoading(true);
      const timer = setTimeout(() => {
        const entities = buildEntities(tag);
        setAllEntities(entities);
        setFilteredList(entities);
        setLoading(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [open, tag]);

  useEffect(() => {
    if (!isConnected || !tag?.id) return;

    const onCompanyTags = (data) => {
      if (
        (data.action === "update" || data.action === "create") &&
        data.tag?.id === tag.id
      ) {
        const entities = buildEntities(data.tag);
        setAllEntities(entities);
        setFilteredList(entities);
      }
    };

    const cleanup = on(`company${user.companyId}-tag`, onCompanyTags);
    return () => cleanup();
  }, [isConnected, on, tag?.id, user.companyId]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredList(allEntities);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredList(
        allEntities.filter(
          (e) =>
            e.name?.toLowerCase().includes(lower) ||
            e.displayPhone?.includes(searchTerm)
        )
      );
    }
  }, [searchTerm, allEntities]);

  const handleRemoveContactTag = async (entity) => {
    try {
      if (entity.entityType === "Contato") {
        await api.delete(`/tags-contacts/${tag.id}/${entity.id}`);
      } else {
        // Remove from crm_client_tags via bulk-remove-tags endpoint
        await api.post("/crm/clients/bulk-remove-tags", {
          clientIds: [entity.id],
          tagIds: [tag.id],
        });
      }
      const updated = allEntities.filter((e) => e.entityKey !== entity.entityKey);
      setAllEntities(updated);
    } catch (error) {
      console.error("Erro ao remover tag:", error);
    }
  };

  return (
    <Modal
      className={classes.modal}
      open={open}
      onClose={onClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{ timeout: 500 }}
    >
      <Transition in={open} timeout={300}>
        <div className={classes.paper}>
          <div className={classes.header}>
            <div className={classes.headerContent}>
              <Avatar className={classes.avatarContact}>
                <LabelIcon fontSize="small" />
              </Avatar>
              <Typography variant="h6" className={classes.title}>
                Contatos na Tag
                <Chip
                  icon={<LabelIcon style={{ fontSize: "16px" }} />}
                  label={tag?.name}
                  className={classes.tagChip}
                  size="small"
                  style={{ marginLeft: 8 }}
                />
                {filteredList.length > 0 && (
                  <span className={classes.countBadge}>
                    {filteredList.length}{" "}
                    {filteredList.length === 1 ? "registro" : "registros"}
                  </span>
                )}
              </Typography>
            </div>
            <IconButton
              className={classes.closeButton}
              onClick={onClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </div>

          <div className={classes.content}>
            <Box className={classes.controls}>
              <TextField
                className={classes.searchField}
                variant="outlined"
                placeholder="Localizar contato ou cliente"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {loading ? (
              <div className={classes.loading}>
                <LinearProgress className={classes.progressBar} />
              </div>
            ) : filteredList.length > 0 ? (
              <TableContainer component={Paper} className={classes.tableContainer}>
                <Table className={classes.table} aria-label="Tabela de registros" stickyHeader>
                  <TableHead className={classes.tableHeader}>
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Telefone</TableCell>
                      <TableCell className={classes.actionCell}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredList.map((entity) => (
                      <TableRow key={entity.entityKey} className={classes.tableRow} hover>
                        <TableCell className={classes.tableCell}>
                          <div className={classes.contactName}>
                            <Avatar
                              className={
                                entity.entityType === "Contato"
                                  ? classes.avatarContact
                                  : classes.avatarClient
                              }
                            >
                              {entity.entityType === "Contato" ? (
                                entity.name?.charAt(0) || <PersonIcon fontSize="small" />
                              ) : (
                                <BusinessCenterIcon fontSize="small" />
                              )}
                            </Avatar>
                            <div className={classes.contactInfo}>
                              <Typography variant="body1" style={{ fontWeight: 500 }}>
                                {entity.name || "Sem nome"}
                              </Typography>
                              <Typography variant="caption" className={classes.contactId}>
                                ID: {entity.id}
                              </Typography>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className={classes.tableCell}>
                          <Chip
                            label={entity.entityType}
                            size="small"
                            className={
                              entity.entityType === "Contato"
                                ? classes.typeBadgeContact
                                : classes.typeBadgeClient
                            }
                          />
                        </TableCell>
                        <TableCell className={classes.tableCell}>
                          <div className={classes.phoneCell}>
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body1">
                              {entity.displayPhone || "N/A"}
                            </Typography>
                          </div>
                        </TableCell>
                        <TableCell className={classes.tableCell} align="center">
                          <Tooltip title="Remover desta tag">
                            <IconButton
                              style={{
                                backgroundColor: "#FF6B6B",
                                padding: "8px",
                                borderRadius: "10px",
                              }}
                              onClick={() => handleRemoveContactTag(entity)}
                              size="small"
                            >
                              <DeleteIcon style={{ color: "#fff" }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <div className={classes.emptyState}>
                <PersonIcon className={classes.emptyIcon} />
                <Typography variant="h6" className={classes.emptyText}>
                  {searchTerm
                    ? "Nenhum registro correspondente encontrado"
                    : "Nenhum contato ou cliente nesta tag"}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {searchTerm
                    ? "Tente ajustar seus critérios de pesquisa"
                    : "Adicione contatos ou clientes a esta tag para vê-los listados aqui"}
                </Typography>
              </div>
            )}
          </div>
        </div>
      </Transition>
    </Modal>
  );
};

export default ContactTagListModal;
