import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

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
import CampaignIcon from "@material-ui/icons/Send";
import DescriptionIcon from "@material-ui/icons/Description";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import ScheduleIcon from "@material-ui/icons/Schedule";
import PeopleIcon from "@material-ui/icons/People";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import CampaignModal from "../../components/CampaignModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { isArray } from "lodash";
import { useDate } from "../../hooks/useDate";
import ForbiddenPage from "../../components/ForbiddenPage";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useSocket } from "../../context/SocketContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_CAMPAIGNS") {
    const campaigns = action.payload;
    const newCampaigns = [];

    if (isArray(campaigns)) {
      campaigns.forEach((campaign) => {
        const campaignIndex = state.findIndex((u) => u.id === campaign.id);
        if (campaignIndex !== -1) {
          state[campaignIndex] = campaign;
        } else {
          newCampaigns.push(campaign);
        }
      });
    }

    return [...state, ...newCampaigns];
  }

  if (action.type === "UPDATE_CAMPAIGNS") {
    const campaign = action.payload;
    const campaignIndex = state.findIndex((u) => u.id === campaign.id);

    if (campaignIndex !== -1) {
      state[campaignIndex] = campaign;
      return [...state];
    } else {
      return [campaign, ...state];
    }
  }

  if (action.type === "DELETE_CAMPAIGN") {
    const campaignId = action.payload;
    const campaignIndex = state.findIndex((u) => u.id === campaignId);
    if (campaignIndex !== -1) {
      state.splice(campaignIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

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
    backgroundColor: "#e8f5e9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#4caf50",
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
    flexWrap: "wrap",
  },
  itemDetail: {
    display: "flex",
    alignItems: "center",
    gap: 4,
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
  reportButton: {
    backgroundColor: "#e8f5e9",
    color: "#4caf50",
    "&:hover": {
      backgroundColor: "#c8e6c9",
    },
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

const Campaigns = () => {
  const classes = useStyles();
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [deletingCampaign, setDeletingCampaign] = useState(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [campaigns, dispatch] = useReducer(reducer, []);
  const { user } = useContext(AuthContext);
  const { isConnected, on } = useSocket();

  const { datetimeToClient } = useDate();
  const { getPlanCompany } = usePlans();

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useCampaigns) {
        toast.error("Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando.");
        setTimeout(() => {
          history.push(`/`);
        }, 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchCampaigns();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam, pageNumber]);

  useEffect(() => {
    if (!isConnected || !user?.companyId) return;
    const companyId = user.companyId;

    const onCompanyCampaign = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CAMPAIGNS", payload: data.record });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_CAMPAIGN", payload: +data.id });
      }
    };

    const cleanup = on(`company-${companyId}-campaign`, onCompanyCampaign);
    return () => {
      cleanup();
    };
  }, [isConnected, on, user?.companyId]);

  const fetchCampaigns = async () => {
    try {
      const { data } = await api.get("/campaigns/", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_CAMPAIGNS", payload: data.records });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenCampaignModal = () => {
    setSelectedCampaign(null);
    setCampaignModalOpen(true);
  };

  const handleCloseCampaignModal = () => {
    setSelectedCampaign(null);
    setCampaignModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setCampaignModalOpen(true);
  };

  const handleDeleteCampaign = async (campaignId) => {
    try {
      await api.delete(`/campaigns/${campaignId}`);
      toast.success(i18n.t("campaigns.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingCampaign(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      INATIVA: { label: "Inativa", color: "#9e9e9e", bg: "#f5f5f5" },
      PROGRAMADA: { label: "Programada", color: "#1976d2", bg: "#e3f2fd" },
      EM_ANDAMENTO: { label: "Em Andamento", color: "#ff9800", bg: "#fff3e0" },
      CANCELADA: { label: "Cancelada", color: "#d32f2f", bg: "#ffebee" },
      FINALIZADA: { label: "Finalizada", color: "#4caf50", bg: "#e8f5e9" },
    };

    const config = statusConfig[status] || { label: status, color: "#666", bg: "#f5f5f5" };

    return (
      <Chip
        label={config.label}
        size="small"
        className={classes.statusChip}
        style={{
          backgroundColor: config.bg,
          color: config.color,
        }}
      />
    );
  };

  if (user.profile === "user") {
    return <ForbiddenPage />;
  }

  return (
    <Box className={classes.root} onScroll={handleScroll}>
      {/* Modais */}
      <ConfirmationModal
        title={
          deletingCampaign &&
          `${i18n.t("campaigns.confirmationModal.deleteTitle")} ${deletingCampaign.name}?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteCampaign(deletingCampaign.id)}
      >
        {i18n.t("campaigns.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      {campaignModalOpen && (
        <CampaignModal
          resetPagination={() => {
            setPageNumber(1);
            fetchCampaigns();
          }}
          open={campaignModalOpen}
          onClose={handleCloseCampaignModal}
          aria-labelledby="form-dialog-title"
          campaignId={selectedCampaign && selectedCampaign.id}
        />
      )}

      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <Box className={classes.headerIcon}>
            <CampaignIcon />
          </Box>
          <Box>
            <Typography className={classes.headerTitle}>
              {i18n.t("campaigns.title")}
            </Typography>
            <Typography className={classes.headerSubtitle}>
              {campaigns.length} {campaigns.length === 1 ? "campanha cadastrada" : "campanhas cadastradas"}
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
          <Tooltip title={i18n.t("campaigns.buttons.add")}>
            <button className={classes.addButton} onClick={handleOpenCampaignModal}>
              <AddIcon style={{ fontSize: 24 }} />
            </button>
          </Tooltip>
        </Box>
      </Box>

      {/* Content */}
      <Box className={classes.content}>
        {campaigns.length === 0 && !loading ? (
          <Box className={classes.emptyState}>
            <CampaignIcon />
            <Typography>Nenhuma campanha encontrada</Typography>
          </Box>
        ) : (
          campaigns.map((campaign) => (
            <Box key={campaign.id} className={classes.listItem}>
              {/* Icon */}
              <Box className={classes.itemIcon}>
                <CampaignIcon />
              </Box>

              {/* Info */}
              <Box className={classes.itemInfo}>
                <Typography className={classes.itemName}>
                  {campaign.name}
                </Typography>
                <Box className={classes.itemDetails}>
                  <span>ID: {campaign.id}</span>
                  <span>•</span>
                  {getStatusChip(campaign.status)}
                  <span>•</span>
                  <Box className={classes.itemDetail}>
                    <PeopleIcon style={{ fontSize: 14 }} />
                    <span>
                      {campaign.contactListId
                        ? campaign.contactList?.name
                        : "Sem lista"}
                    </span>
                  </Box>
                  <span>•</span>
                  <Box className={classes.itemDetail}>
                    <WhatsAppIcon style={{ fontSize: 14, color: "#25D366" }} />
                    <span>
                      {campaign.whatsappId
                        ? campaign.whatsapp?.name
                        : "Não definido"}
                    </span>
                  </Box>
                  {campaign.scheduledAt && (
                    <>
                      <span>•</span>
                      <Box className={classes.itemDetail}>
                        <ScheduleIcon style={{ fontSize: 14 }} />
                        <span>{datetimeToClient(campaign.scheduledAt)}</span>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>

              {/* Actions */}
              <Box className={classes.itemActions}>
                <Tooltip title="Relatório">
                  <IconButton
                    size="small"
                    className={`${classes.actionButton} ${classes.reportButton}`}
                    onClick={() => history.push(`/campaign/${campaign.id}/report`)}
                  >
                    <DescriptionIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar">
                  <IconButton
                    size="small"
                    className={`${classes.actionButton} ${classes.editButton}`}
                    onClick={() => handleEditCampaign(campaign)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir">
                  <IconButton
                    size="small"
                    className={`${classes.actionButton} ${classes.deleteButton}`}
                    onClick={() => {
                      setConfirmModalOpen(true);
                      setDeletingCampaign(campaign);
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
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

export default Campaigns;