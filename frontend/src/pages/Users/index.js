import React, { useState, useEffect, useReducer, useContext } from "react";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  CircularProgress,
  Avatar,
  Tooltip,
  Grid
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import { AccountCircle } from "@material-ui/icons";
import whatsappIcon from '../../assets/nopicture.png'
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import UserModal from "../../components/UserModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import UserStatusIcon from "../../components/UserModal/statusIcon";
import { getBackendUrl } from "../../config";
import { AuthContext } from "../../context/Auth/AuthContext";
import ForbiddenPage from "../../components/ForbiddenPage";
import AddIcon from '@mui/icons-material/Add';
import useSafeApi from "../../hooks/useSafeApi";
import { useSocket } from "../../context/SocketContext";
import SafeComponent from "../../components/SafeComponent";
import PeopleAltIcon from '@material-ui/icons/PeopleAlt';
import EventAvailableIcon from '@material-ui/icons/EventAvailable';
import { useRef } from "react";

const backendUrl = getBackendUrl();

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f5f5f5",
    ...theme.scrollbarStyles
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #e0e0e0",
    backgroundColor: "#f5f5f5",
    flexWrap: "wrap",
    gap: 12
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    backgroundColor: "#e8f4fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 28,
      color: "#1976d2"
    }
  },
  headerTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1a1a1a"
  },
  headerSubtitle: {
    fontSize: "0.85rem",
    color: "#666",
    marginTop: 4
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap"
  },
  addButton: {
    width: 48,
    height: 48,
    minWidth: 48,
    borderRadius: "50%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    padding: 0,
    "&:hover": {
      backgroundColor: "#333",
      transform: "scale(1.05)"
    },
    transition: "all 0.2s ease"
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "20px 24px",
    gap: 16,
    minHeight: 0
  },
  filtersRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap"
  },
  searchField: {
    minWidth: 200,
    "& .MuiInputBase-root": {
      backgroundColor: "#fff",
      borderRadius: 8,
      border: "1px solid #e0e0e0",
      padding: "4px 12px",
      fontSize: "0.875rem",
      "&:hover": {
        borderColor: "#e0e0e0"
      },
      "&.Mui-focused": {
        borderColor: "#e0e0e0"
      },
      "&::before, &::after": {
        display: "none"
      }
    },
    "& .MuiInputBase-input": {
      padding: "6px 0",
      "&::placeholder": {
        color: "#9e9e9e",
        opacity: 1
      }
    }
  },
  listWrapper: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingBottom: 20
  },
  card: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: "18px 20px",
    boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
    gap: 16,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 20px 32px rgba(15,23,42,0.12)"
    }
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: "50%"
  },
  cardInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    fontSize: "0.85rem",
    color: "#555"
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f5f5f5",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: "0.75rem",
    fontWeight: 600
  },
  cardActions: {
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12
  },
  editButton: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    "&:hover": {
      backgroundColor: "#bbdefb"
    }
  },
  deleteButton: {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    "&:hover": {
      backgroundColor: "#ffcdd2"
    }
  },
  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "40px 0",
    justifyContent: "center"
  },
  emptyState: {
    borderRadius: 16,
    backgroundColor: "#fff",
    textAlign: "center",
    padding: "60px 20px",
    color: "#999",
    "& svg": {
      fontSize: 48,
      marginBottom: 12,
      color: "#d9d9d9"
    }
  }
}));

const Users = () => {
  const classes = useStyles();
  const history = useHistory();

  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const { user: loggedInUser } = useContext(AuthContext);
  const { profileImage } = loggedInUser;
  const isMounted = useRef(true);

  const {
    data: users,
    loading: loadingUsers,
    error: errorUsers,
    setData: setUsers,
    request: fetchUsersApi,
  } = useSafeApi("/users/", { manual: true, initialData: [] });

  const { isReady, on } = useSocket();

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    setUsers([]);
    setPageNumber(1);
  }, [searchParam, setUsers]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isMounted.current) return;
      const data = await fetchUsersApi({
        params: { searchParam, pageNumber },
      });
      if (data && isMounted.current) {
        setUsers((prev) => {
          const newUsers = data.users || [];
          const updatedUsers = [...prev];

          newUsers.forEach((user) => {
            const index = updatedUsers.findIndex((u) => u.id === user.id);
            if (index !== -1) {
              updatedUsers[index] = user;
            } else {
              updatedUsers.push(user);
            }
          });

          return updatedUsers;
        });
        setHasMore(data.hasMore);
      }
    };
    fetchUsers();
  }, [searchParam, pageNumber, fetchUsersApi, setUsers]);

  useEffect(() => {
    if (!isReady || !loggedInUser) return;

    const companyId = loggedInUser.companyId;
    const cleanup = on(`company-${companyId}-user`, (data) => {
      if (data.action === "update" || data.action === "create") {
        setUsers((prev) => {
          const updatedUsers = [...prev];
          const index = updatedUsers.findIndex((u) => u.id === data.user.id);
          if (index !== -1) {
            updatedUsers[index] = data.user;
            return updatedUsers;
          } else {
            return [data.user, ...updatedUsers];
          }
        });
      }
      if (data.action === "delete") {
        setUsers((prev) => {
          return prev.filter((u) => u.id !== +data.userId);
        });
      }
    });

    return cleanup;
  }, [isReady, loggedInUser, on, setUsers]);

  const handleOpenUserModal = () => {
    setSelectedUser(null);
    setUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setSelectedUser(null);
    setUserModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      toast.success(i18n.t("users.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingUser(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setPageNumber((prevPage) => prevPage + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loadingUsers) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const renderProfileImage = (user) => {
    if (user.id === loggedInUser.id) {
      return (
        <Avatar
          src={`${backendUrl}/public/company${user.companyId}/user/${profileImage ? profileImage : whatsappIcon}`}
          alt={user.name}
          className={classes.userAvatar}
        />
      )
    }
    if (user.id !== loggedInUser.id) {
      return (
        <Avatar
          src={user.profileImage ? `${backendUrl}/public/company${user.companyId}/user/${user.profileImage}` : whatsappIcon}
          alt={user.name}
          className={classes.userAvatar}
        />
      )
    }
    return (
      <AccountCircle />
    )
  };

  return (
    <Box className={classes.root}>
      <ConfirmationModal
        title={
          deletingUser &&
          `${i18n.t("users.confirmationModal.deleteTitle")} ${deletingUser.name
          }?`
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteUser(deletingUser.id)}
      >
        {i18n.t("users.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <UserModal
        open={userModalOpen}
        onClose={handleCloseUserModal}
        aria-labelledby="form-dialog-title"
        userId={selectedUser && selectedUser.id}
      />
      {loggedInUser.profile === "user" ? (
        <ForbiddenPage />
      ) : (
        <>
          <Box className={classes.header}>
            <Box className={classes.headerLeft}>
              <Box className={classes.headerIcon}>
                <PeopleAltIcon />
              </Box>
              <Box>
                <Typography className={classes.headerTitle}>
                  {i18n.t("users.title")}
                </Typography>
                <Typography className={classes.headerSubtitle}>
                  {Array.isArray(users) ? users.filter((user) => user.id !== 1).length : 0} usuários cadastrados
                </Typography>
              </Box>
            </Box>
            <Box className={classes.headerActions}>
              <TextField
                className={classes.searchField}
                placeholder="Pesquisar..."
                type="search"
                value={searchParam}
                onChange={handleSearch}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon style={{ color: "#9e9e9e", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Tooltip title="Agendas">
                <IconButton
                  className={classes.addButton}
                  style={{ backgroundColor: "#059669" }}
                  onClick={() => history.push("/user-schedules")}
                >
                  <EventAvailableIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Novo Usuário">
                <IconButton
                  className={classes.addButton}
                  onClick={handleOpenUserModal}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Box className={classes.content}>
            <Box className={classes.listWrapper} onScroll={handleScroll}>
              <SafeComponent
                loading={loadingUsers && users.length === 0}
                error={errorUsers}
                data={users}
                renderData={(records) => (
                  <>
                    {records.filter((u) => u.id !== 1).map((user) => (
                      <Box key={user.id} className={classes.card}>
                        {renderProfileImage(user)}
                        <Box className={classes.cardInfo}>
                          <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                            {user.name}
                          </Typography>
                          <Box className={classes.metaRow}>
                            <span>ID: {user.id}</span>
                            <span>•</span>
                            <span>Perfil: {user.profile}</span>
                            <span>•</span>
                            <span>Email: {user.email}</span>
                          </Box>
                          <Box className={classes.metaRow}>
                            <span>Início: {user.startWork || "N/A"}</span>
                            <span>•</span>
                            <span>Fim: {user.endWork || "N/A"}</span>
                          </Box>
                          <Box className={classes.statusBadge}>
                            <UserStatusIcon user={user} /> Status
                          </Box>
                        </Box>
                        <Box className={classes.cardActions}>
                          <Tooltip title="Editar">
                            <IconButton
                              className={`${classes.actionButton} ${classes.editButton}`}
                              onClick={() => handleEditUser(user)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton
                              className={`${classes.actionButton} ${classes.deleteButton}`}
                              onClick={() => {
                                setConfirmModalOpen(true);
                                setDeletingUser(user);
                              }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    ))}
                    {loadingUsers && (
                      <Box className={classes.loadingBox}>
                        <CircularProgress size={20} />
                        <Typography variant="body2">{i18n.t("loading")}</Typography>
                      </Box>
                    )}
                  </>
                )}
              />
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Users;