import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  IconButton,
  TextField,
  InputAdornment,
  Typography,
  Tooltip,
  CircularProgress,
  Chip,
} from "@material-ui/core";

import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import AddIcon from "@material-ui/icons/Add";
import TextFieldsIcon from "@material-ui/icons/TextFields";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { Can } from "../../components/Can";
import { AuthContext } from "../../context/Auth/AuthContext";
import CampaignModalPhrase from "../../components/CampaignModalPhrase";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f5f5f5",
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    backgroundColor: "#f5f5f5",
    borderBottom: "1px solid #e0e0e0",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#e3f2fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#1976d2",
    },
  },
  headerTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  headerSubtitle: {
    fontSize: "0.875rem",
    color: "#666",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  searchField: {
    backgroundColor: "#fff",
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      "& fieldset": {
        borderColor: "#e0e0e0",
      },
      "&:hover fieldset": {
        borderColor: "#1976d2",
      },
    },
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#333",
      transform: "scale(1.05)",
    },
  },
  content: {
    flex: 1,
    padding: "16px 24px",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    transition: "all 0.2s ease",
    "&:hover": {
      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    },
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#fff3e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#ff9800",
    },
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  itemName: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  itemDetails: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: "0.8rem",
    color: "#666",
  },
  statusChip: {
    fontWeight: 500,
    fontSize: "0.75rem",
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    "&:hover": {
      backgroundColor: "#bbdefb",
    },
  },
  deleteButton: {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    "&:hover": {
      backgroundColor: "#ffcdd2",
    },
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    color: "#999",
    "& svg": {
      fontSize: 64,
      marginBottom: 16,
      opacity: 0.5,
    },
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "24px",
  },
}));

const CampaignsPhrase = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(null);
  const [searchParam, setSearchParam] = useState("");

  const [campaignflows, setCampaignFlows] = useState([]);
  const [modalOpenPhrase, setModalOpenPhrase] = useState(false);
  const [campaignflowSelected, setCampaignFlowSelected] = useState();

  const handleDeleteCampaign = async (campaignId) => {
    try {
      await api.delete(`/flowcampaign/${campaignId}`);
      toast.success("Campanha deletada");
      getCampaigns();
    } catch (err) {
      toastError(err);
    }
    setDeletingCampaign(null);
    setConfirmModalOpen(false);
  };

  const getCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.get("/flowcampaign");
      setCampaignFlows(res.data.flow || []);
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  const onSaveModal = () => {
    getCampaigns();
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenModal = () => {
    setCampaignFlowSelected(undefined);
    setModalOpenPhrase(true);
  };

  const handleEditCampaign = (flowId) => {
    setCampaignFlowSelected(flowId);
    setModalOpenPhrase(true);
  };

  useEffect(() => {
    getCampaigns();
  }, []);

  const filteredCampaigns = campaignflows.filter((flow) =>
    flow.name?.toLowerCase().includes(searchParam)
  );

  const getStatusChip = (status) => {
    if (status) {
      return (
        <Chip
          label="Ativo"
          size="small"
          className={classes.statusChip}
          style={{
            backgroundColor: "#e8f5e9",
            color: "#4caf50",
          }}
        />
      );
    }
    return (
      <Chip
        label="Desativado"
        size="small"
        className={classes.statusChip}
        style={{
          backgroundColor: "#f5f5f5",
          color: "#9e9e9e",
        }}
      />
    );
  };

  return (
    <Box className={classes.root}>
      {/* Modais */}
      <ConfirmationModal
        title={
          deletingCampaign &&
          `${i18n.t("campaigns.confirmationModal.deleteTitle")} ${deletingCampaign.name}?`
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteCampaign(deletingCampaign.id)}
      >
        {i18n.t("campaigns.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <CampaignModalPhrase
        open={modalOpenPhrase}
        onClose={() => setModalOpenPhrase(false)}
        FlowCampaignId={campaignflowSelected}
        onSave={onSaveModal}
      />

      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <Box className={classes.headerIcon}>
            <TextFieldsIcon />
          </Box>
          <Box>
            <Typography className={classes.headerTitle}>
              Campanhas por Frase
            </Typography>
            <Typography className={classes.headerSubtitle}>
              {campaignflows.length} {campaignflows.length === 1 ? "campanha cadastrada" : "campanhas cadastradas"}
            </Typography>
          </Box>
        </Box>

        <Box className={classes.headerRight}>
          <TextField
            placeholder={i18n.t("campaigns.searchPlaceholder")}
            variant="outlined"
            size="small"
            value={searchParam}
            onChange={handleSearch}
            className={classes.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "#999" }} />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Adicionar Campanha">
            <button className={classes.addButton} onClick={handleOpenModal}>
              <AddIcon style={{ fontSize: 24 }} />
            </button>
          </Tooltip>
        </Box>
      </Box>

      {/* Content */}
      <Box className={classes.content}>
        {filteredCampaigns.length === 0 && !loading ? (
          <Box className={classes.emptyState}>
            <TextFieldsIcon />
            <Typography>Nenhuma campanha encontrada</Typography>
          </Box>
        ) : (
          filteredCampaigns.map((flow) => (
            <Box key={flow.id} className={classes.listItem}>
              {/* Icon */}
              <Box className={classes.itemIcon}>
                <TextFieldsIcon />
              </Box>

              {/* Info */}
              <Box className={classes.itemInfo}>
                <Typography className={classes.itemName}>
                  {flow.name}
                </Typography>
                <Box className={classes.itemDetails}>
                  <span>ID: {flow.id}</span>
                  <span>•</span>
                  {getStatusChip(flow.status)}
                </Box>
              </Box>

              {/* Actions */}
              <Box className={classes.itemActions}>
                <Tooltip title="Editar">
                  <IconButton
                    size="small"
                    className={`${classes.actionButton} ${classes.editButton}`}
                    onClick={() => handleEditCampaign(flow.id)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Can
                  role={user.profile}
                  perform="contacts-page:deleteContact"
                  yes={() => (
                    <Tooltip title="Excluir">
                      <IconButton
                        size="small"
                        className={`${classes.actionButton} ${classes.deleteButton}`}
                        onClick={() => {
                          setConfirmModalOpen(true);
                          setDeletingCampaign(flow);
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                />
              </Box>
            </Box>
          ))
        )}

        {loading && (
          <Box className={classes.loadingContainer}>
            <CircularProgress size={32} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CampaignsPhrase;