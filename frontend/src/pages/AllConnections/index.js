import React, { useState, useCallback, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { format, parseISO, set } from "date-fns";

import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import { Stack } from "@mui/material";
import { makeStyles } from "@material-ui/core/styles";
import { useHistory } from "react-router-dom";
import { green } from "@material-ui/core/colors";
import {
  Button,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Table,
  TableHead,
  Paper,
  Tooltip,
  Typography,
  CircularProgress,
  Divider
} from "@material-ui/core";
import {
  Edit,
  CheckCircle,
  SignalCellularConnectedNoInternet2Bar,
  SignalCellularConnectedNoInternet0Bar,
  SignalCellular4Bar,
  CropFree,
  DeleteOutline,
  Facebook,
  Instagram,
  WhatsApp
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import { AuthContext } from "../../context/Auth/AuthContext";
import useCompanies from "../../hooks/useCompanies";
import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import WhatsAppModalCompany from "../../components/CompanyWhatsapps";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";
import ForbiddenPage from "../../components/ForbiddenPage";
import { getEnvVariable } from "../../config";

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    borderRadius: "0",
    boxShadow: "none",
    ...theme.scrollbarStyles
  },
  customTableCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  tooltip: {
    backgroundColor: "#f5f5f9",
    color: "rgba(0, 0, 0, 0.87)",
    fontSize: theme.typography.pxToRem(14),
    border: "0",
    maxWidth: 450
  },
  tooltipPopper: {
    textAlign: "center"
  },
  buttonProgress: {
    color: green[500]
  },
  TableHead: {
    backgroundColor: "#8A2BE2",
    boxShadow: "none",
    color: "textSecondary",
    borderRadius: "0"
  }
}));

const CustomToolTip = ({ title, content, children }) => {
  const classes = useStyles();

  return (
    <Tooltip
      arrow
      classes={{
        tooltip: classes.tooltip,
        popper: classes.tooltipPopper
      }}
      title={
        <React.Fragment>
          <Typography gutterBottom color="inherit">
            {title}
          </Typography>
          {content && <Typography>{content}</Typography>}
        </React.Fragment>
      }
    >
      {children}
    </Tooltip>
  );
};

const IconChannel = channel => {
  switch (channel) {
    case "facebook":
      return <Facebook />;
    case "instagram":
      return <Instagram />;
    case "whatsapp":
      return <WhatsApp />;
    default:
      return "error";
  }
};

const AllConnections = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { list } = useCompanies();
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);
  const [loadingComp, setLoadingComp] = useState(false);
  const [whats, setWhats] = useState([]);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [filterConnections, setFilterConnections] = useState([]);
  const [companyWhatsApps, setCompanyWhatsApps] = useState(null);
  const confirmationModalInitialState = {
    action: "",
    title: "",
    message: "",
    whatsAppId: "",
    open: false
  };
  const [confirmModalInfo, setConfirmModalInfo] = useState(
    confirmationModalInitialState
  );
  const backendUrl = getEnvVariable("REACT_APP_BACKEND_URL");
  const facebookAppId = getEnvVariable("REACT_APP_FACEBOOK_APP_ID");
  const whatsappEmbeddedSignupUrl = getEnvVariable("REACT_APP_WHATSAPP_EMBEDDED_SIGNUP_URL");

  const history = useHistory();
  if (!user.super) {
    history.push("/tickets")
  }

  const openMetaOAuth = (channel, targetCompanyId = user.companyId) => {
    if (!facebookAppId) {
      toast.error("FACEBOOK_APP_ID não configurado no frontend.");
      return;
    }

    if (!backendUrl) {
      toast.error("BACKEND_URL não configurado no frontend.");
      return;
    }

    const state = String(targetCompanyId);

    if (channel === "instagram") {
      const params = new URLSearchParams({
        force_reauth: "true",
        client_id: facebookAppId,
        redirect_uri: `${backendUrl}/instagram-callback`,
        response_type: "code",
        scope: [
          "instagram_business_basic",
          "instagram_business_manage_messages",
          "instagram_business_manage_comments",
          "instagram_business_content_publish",
          "instagram_business_manage_insights"
        ].join(","),
        state
      });

      window.open(`https://www.instagram.com/oauth/authorize?${params.toString()}`, "_blank", "width=720,height=720");
      return;
    }

    const params = new URLSearchParams({
      client_id: facebookAppId,
      redirect_uri: `${backendUrl}/facebook-callback`,
      response_type: "code",
      scope: [
        "public_profile",
        "pages_messaging",
        "pages_show_list",
        "pages_manage_metadata",
        "pages_read_engagement",
        "business_management"
      ].join(","),
      state
    });

    window.open(`https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`, "_blank", "width=720,height=720");
  };

  const openWhatsAppEmbeddedSignup = targetCompanyId => {
    if (!whatsappEmbeddedSignupUrl) {
      toast.error("Configure REACT_APP_WHATSAPP_EMBEDDED_SIGNUP_URL para abrir o cadastro incorporado do WhatsApp.");
      return;
    }

    const url = new URL(whatsappEmbeddedSignupUrl);
    if (targetCompanyId) {
      url.searchParams.set("state", String(targetCompanyId));
    }

    window.open(url.toString(), "_blank", "width=720,height=720");
  };


  useEffect(() => {
    setLoadingWhatsapp(true);
    const fetchSession = async () => {
      try {
        const { data } = await api.get("/whatsapp/all/?session=0");
        setWhats(data);
        setLoadingWhatsapp(false);
      } catch (err) {
        setLoadingWhatsapp(false);
        toastError(err);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    loadCompanies();
  }, []);
  const loadCompanies = async () => {
    setLoadingComp(true);
    try {
      const companyList = await list();
      setCompanies(companyList);
    } catch (e) {
      toast.error("Não foi possível carregar a lista de registros");
    }
    setLoadingComp(false);
  }

  const handleStartWhatsAppSession = async whatsAppId => {
    try {
      await api.post(`/whatsappsession/${whatsAppId}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleRequestNewQrCode = async whatsAppId => {
    try {
      await api.put(`/whatsappsession/${whatsAppId}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenWhatsAppModal = (whatsappsFilter, comp) => {
    setSelectedWhatsApp(null);
    setWhatsAppModalOpen(true);
    if (whatsappsFilter?.length > 0) {
      setFilterConnections(whatsappsFilter);
      setCompanyWhatsApps(comp);
    }
  };



  const handleCloseWhatsAppModal = useCallback(() => {
    setWhatsAppModalOpen(false);
    setSelectedWhatsApp(null);
    setFilterConnections([]);
    setCompanyWhatsApps(null);
  }, [setSelectedWhatsApp, setWhatsAppModalOpen]);

  const handleOpenQrModal = whatsApp => {
    setSelectedWhatsApp(whatsApp);
    setQrModalOpen(true);
  };

  const handleCloseQrModal = useCallback(() => {
    setSelectedWhatsApp(null);
    setQrModalOpen(false);
  }, [setQrModalOpen, setSelectedWhatsApp]);

  const handleEditWhatsApp = whatsApp => {
    setSelectedWhatsApp(whatsApp);
    setWhatsAppModalOpen(true);
  };

  const handleOpenConfirmationModal = (action, whatsAppId) => {
    if (action === "disconnect") {
      setConfirmModalInfo({
        action: action,
        title: i18n.t("connections.confirmationModal.disconnectTitle"),
        message: i18n.t("connections.confirmationModal.disconnectMessage"),
        whatsAppId: whatsAppId
      });
    }

    if (action === "delete") {
      setConfirmModalInfo({
        action: action,
        title: i18n.t("connections.confirmationModal.deleteTitle"),
        message: i18n.t("connections.confirmationModal.deleteMessage"),
        whatsAppId: whatsAppId
      });
    }
    setConfirmModalOpen(true);
  };

  const handleSubmitConfirmationModal = async () => {
    if (confirmModalInfo.action === "disconnect") {
      try {
        await api.delete(`/whatsappsession/admin/${confirmModalInfo.whatsAppId}`);
        toast.success(i18n.t("connections.toasts.disconnected"));
      } catch (err) {
        toastError(err);
      }
    }

    if (confirmModalInfo.action === "delete") {
      try {
        await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
        toast.success(i18n.t("connections.toasts.deleted"));
      } catch (err) {
        toastError(err);
      }
    }

    setConfirmModalInfo(confirmationModalInitialState);
  };

  const renderActionButtons = whatsApp => {
    return (
      <>
        {whatsApp.status === "qrcode" && (
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => handleOpenQrModal(whatsApp)}
          >
            {i18n.t("connections.buttons.qrcode")}
          </Button>
        )}
        {whatsApp.status === "DISCONNECTED" && (
          <>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => handleStartWhatsAppSession(whatsApp.id)}
            >
              {i18n.t("connections.buttons.tryAgain")}
            </Button>{" "}
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={() => handleRequestNewQrCode(whatsApp.id)}
            >
              {i18n.t("connections.buttons.newQr")}
            </Button>
          </>
        )}
        {(whatsApp.status === "CONNECTED" ||
          whatsApp.status === "PAIRING" ||
          whatsApp.status === "TIMEOUT") && (
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={() => {
                handleOpenConfirmationModal("disconnect", whatsApp.id);
              }}
            >
              {i18n.t("connections.buttons.disconnect")}
            </Button>
          )}
        {whatsApp.status === "OPENING" && (
          <Button size="small" variant="outlined" disabled color="default">
            {i18n.t("connections.buttons.connecting")}
          </Button>
        )}
      </>
    );
  };

  const renderStatusToolTips = whatsApp => {
    return (
      <div className={classes.customTableCell}>
        {whatsApp.status === "DISCONNECTED" && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.disconnected.title")}
            content={i18n.t("connections.toolTips.disconnected.content")}
          >
            <SignalCellularConnectedNoInternet0Bar color="secondary" />
          </CustomToolTip>
        )}
        {whatsApp.status === "OPENING" && (
          <CircularProgress size={24} className={classes.buttonProgress} />
        )}
        {whatsApp.status === "qrcode" && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.qrcode.title")}
            content={i18n.t("connections.toolTips.qrcode.content")}
          >
            <CropFree />
          </CustomToolTip>
        )}
        {whatsApp.status === "CONNECTED" && (
          <CustomToolTip title={i18n.t("connections.toolTips.connected.title")}>
            <SignalCellular4Bar style={{ color: green[500] }} />
          </CustomToolTip>
        )}
        {(whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.timeout.title")}
            content={i18n.t("connections.toolTips.timeout.content")}
          >
            <SignalCellularConnectedNoInternet2Bar color="secondary" />
          </CustomToolTip>
        )}
      </div>
    );
  };
  return (
    <MainContainer>
      <ConfirmationModal
        title={confirmModalInfo.title}
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={handleSubmitConfirmationModal}
      >
        {confirmModalInfo.message}
      </ConfirmationModal>
      <QrcodeModal
        open={qrModalOpen}
        onClose={handleCloseQrModal}
        whatsAppId={!whatsAppModalOpen && selectedWhatsApp?.id}
      />
      <WhatsAppModalCompany
        open={whatsAppModalOpen}
        onClose={handleCloseWhatsAppModal}
        filteredWhatsapps={filterConnections}
        companyInfos={companyWhatsApps}
        whatsAppId={!qrModalOpen && selectedWhatsApp?.id}
      />

      {user.profile === "user" ?
        <ForbiddenPage />
        :
        <>
          <Paper className={classes.mainPaper} style={{ overflow: "hidden" }} variant="outlined">
            <MainHeader>
              <Stack>
                <Typography variant="h5" color="black" style={{ fontWeight: "bold", marginLeft: "10px", marginTop: "10px" }} gutterBottom>
                  {i18n.t("connections.title")}
                </Typography>
                <Typography style={{ marginTop: "-10px", marginLeft: "10px" }} variant="caption" color="textSecondary">
                  Conecte seus canais de atendimento para receber mensagens e iniciar conversas com seus clientes.
                </Typography>
              </Stack>

              <MainHeaderButtonsWrapper>
                <PopupState variant="popover" popupId="demo-popup-menu">
                  {popupState => (
                    <React.Fragment>
                      <Menu {...bindMenu(popupState)}>
                        <MenuItem
                          onClick={() => {
                            handleOpenWhatsAppModal();
                            popupState.close();
                          }}
                        >
                          <WhatsApp
                            fontSize="small"
                            style={{
                              marginRight: "10px"
                            }}
                          />
                          WhatsApp
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            openWhatsAppEmbeddedSignup();
                            popupState.close();
                          }}
                        >
                          <WhatsApp
                            fontSize="small"
                            style={{
                              marginRight: "10px"
                            }}
                          />
                          WhatsApp Oficial incorporado
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            openMetaOAuth("facebook");
                            popupState.close();
                          }}
                        >
                          <Facebook
                            fontSize="small"
                            style={{
                              marginRight: "10px"
                            }}
                          />
                          Facebook
                        </MenuItem>

                        <MenuItem
                          onClick={() => {
                            openMetaOAuth("instagram");
                            popupState.close();
                          }}
                        >
                          <Instagram
                            fontSize="small"
                            style={{
                              marginRight: "10px"
                            }}
                          />
                          Instagram
                        </MenuItem>
                      </Menu>
                    </React.Fragment>
                  )}
                </PopupState>
              </MainHeaderButtonsWrapper>
            </MainHeader>
            <Stack
              style={{
                overflowY: "auto",
                padding: "20px",
                backgroundColor: "rgb(244 244 244 / 53%)",
                borderRadius: "5px",
                height: "93%"
              }}
            >
              <Paper >
                <Grid container spacing={2}>
                  {loadingWhatsapp ? (
                    <Grid item xs={12}>
                      <Card
                        variant="outlined"
                        style={{
                          backgroundColor: "#d7e0e4",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                          borderRadius: "10px",
                          padding: "20px",
                          margin: "10px",
                          transition: "transform 0.2s ease-in-out",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      >
                        <CardContent>
                          <Typography variant="body2" color="textSecondary">
                            {i18n.t("loading")}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ) : (
                    companies?.length > 0 &&
                    companies.map((company) => (
                      <Grid item xs={12} sm={6} md={4} key={company.id}>
                        <Card
                          variant="outlined"
                          style={{
                            backgroundColor: "#d7e0e4",
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                            borderRadius: "10px",
                            padding: "20px",
                            margin: "10px",
                            transition: "transform 0.2s ease-in-out",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        >
                          <CardContent>
                            <Typography variant="h6" color="textPrimary" align="center">
                              {company?.name}
                            </Typography>
                            <Typography variant="body2" align="center">
                              {i18n.t("Conexões conectadas")}:{" "}
                              {whats?.length &&
                                whats.filter((item) => item?.companyId === company?.id && item?.status === "CONNECTED").length}
                            </Typography>
                            <Typography variant="body2" align="center">
                              {i18n.t("Conexões desconectadas")}:{" "}
                              {whats?.length &&
                                whats.filter((item) => item?.companyId === company?.id && item?.status !== "CONNECTED").length}
                            </Typography>
                            <Typography variant="body2" align="center">
                              {i18n.t("Total de Conexões")}:{" "}
                              {whats?.length && whats.filter((item) => item?.companyId === company?.id).length}
                            </Typography>
                          </CardContent>
                          {user.profile === "admin" && (
                            <CardActions style={{ justifyContent: "flex-end", gap: "10px" }}>
                              <Tooltip title="WhatsApp Oficial incorporado">
                                <div
                                  onClick={() => openWhatsAppEmbeddedSignup(company.id)}
                                  style={{
                                    backgroundColor: "#128C7E",
                                    borderRadius: "10px",
                                    width: "40px",
                                    height: "40px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    transition: "0.3s",
                                  }}
                                >
                                  <WhatsApp style={{ color: "#fff" }} />
                                </div>
                              </Tooltip>
                              <Tooltip title="Conectar Facebook">
                                <div
                                  onClick={() => openMetaOAuth("facebook", company.id)}
                                  style={{
                                    backgroundColor: "#3b5998",
                                    borderRadius: "10px",
                                    width: "40px",
                                    height: "40px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    transition: "0.3s",
                                  }}
                                >
                                  <Facebook style={{ color: "#fff" }} />
                                </div>
                              </Tooltip>
                              <Tooltip title="Conectar Instagram">
                                <div
                                  onClick={() => openMetaOAuth("instagram", company.id)}
                                  style={{
                                    backgroundColor: "#e1306c",
                                    borderRadius: "10px",
                                    width: "40px",
                                    height: "40px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    transition: "0.3s",
                                  }}
                                >
                                  <Instagram style={{ color: "#fff" }} />
                                </div>
                              </Tooltip>
                              <div
                                onClick={() =>
                                  handleOpenWhatsAppModal(
                                    whats.filter((item) => item?.companyId === company?.id),
                                    company
                                  )
                                }
                                style={{
                                  backgroundColor: "#3DB8FF",
                                  borderRadius: "10px",
                                  width: "40px",
                                  height: "40px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  transition: "0.3s",
                                }}
                              >
                                <Edit style={{ color: "#fff" }} />
                              </div>
                            </CardActions>
                          )}
                        </Card>
                      </Grid>
                    ))
                  )}
                  {!loadingWhatsapp && (
                    <Grid item xs={12}>
                      <Card variant="outlined" style={{ padding: "10px", backgroundColor: "#333", color: "#fff" }}>
                        <CardContent>
                          <Typography variant="h6" align="center">
                            {i18n.t("Total")}
                          </Typography>
                          <Typography variant="body2" align="center">
                            {i18n.t("Conexões conectadas")}:{" "}
                            {whats?.length && whats.filter((item) => item?.status === "CONNECTED").length}
                          </Typography>
                          <Typography variant="body2" align="center">
                            {i18n.t("Conexões desconectadas")}:{" "}
                            {whats?.length && whats.filter((item) => item?.status !== "CONNECTED").length}
                          </Typography>
                          <Typography variant="body2" align="center">
                            {i18n.t("Total de Conexões")}: {whats?.length && whats.length}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Stack>
          </Paper>
        </>}
    </MainContainer>
  );
};

export default AllConnections;
