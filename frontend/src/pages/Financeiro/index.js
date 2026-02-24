import React, { useState, useEffect, useReducer, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { Box, Typography, Grid, Card, CardContent, Chip, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import SubscriptionModal from "../../components/SubscriptionModal";
import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import toastError from "../../errors/toastError";
import useSafeApi from "../../hooks/useSafeApi";
import SafeComponent from "../../components/SafeComponent";
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { AuthContext } from "../../context/Auth/AuthContext";
import { listCompanyPaymentSettings } from "../../services/companyPaymentSettings";
import { toast } from "react-toastify";

import moment from "moment";

const reducer = (state, action) => {
  if (action.type === "LOAD_INVOICES") {
    const invoices = action.payload;
    const newUsers = [];

    invoices.forEach((user) => {
      const userIndex = state.findIndex((u) => u.id === user.id);
      if (userIndex !== -1) {
        state[userIndex] = user;
      } else {
        newUsers.push(user);
      }
    });

    return [...state, ...newUsers];
  }

  if (action.type === "UPDATE_USERS") {
    const user = action.payload;
    const userIndex = state.findIndex((u) => u.id === user.id);

    if (userIndex !== -1) {
      state[userIndex] = user;
      return [...state];
    } else {
      return [user, ...state];
    }
  }

  if (action.type === "DELETE_USER") {
    const userId = action.payload;

    const userIndex = state.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      state.splice(userIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(3),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    backgroundColor: "#f8fafc",
  },
  headerCard: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: theme.spacing(3),
    borderRadius: 16,
    marginBottom: theme.spacing(3),
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  },
  statsCard: {
    padding: theme.spacing(2),
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    height: "100%",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
    },
  },
  paidCard: {
    background: "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)",
    color: "white",
  },
  unpaidCard: {
    background: "linear-gradient(135deg, #f87171 0%, #ef4444 100%)",
    color: "white",
  },
  totalCard: {
    background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
    color: "white",
  },
  invoiceTable: {
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
  },
  tableHead: {
    backgroundColor: "#f1f5f9",
  },
  statusChip: {
    fontWeight: "bold",
    fontSize: "12px",
    padding: "4px 12px",
    borderRadius: "16px",
  },
  paidChip: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  unpaidChip: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
  },
  overdueChip: {
    backgroundColor: "#fef3c7",
    color: "#d97706",
  },
  payButton: {
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    color: "white",
    fontWeight: "bold",
    padding: "8px 16px",
    borderRadius: "8px",
    "&:hover": {
      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    },
  },
  paidButton: {
    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    color: "white",
    fontWeight: "bold",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "default",
  },
}));

const Invoices = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam] = useState("");
  const [storagePlans, setStoragePlans] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [noGatewayModalOpen, setNoGatewayModalOpen] = useState(false);

  const isCompanyIdOne = user?.companyId === 1;

  const { data: invoices, loading: loadingInvoices, error: errorInvoices, setData: setInvoices, request: fetchInvoicesApi } = useSafeApi("/invoices/all", { manual: true });

  const fetchInvoices = useCallback(async () => {
    try {
      const data = await fetchInvoicesApi({
        params: { searchParam, pageNumber },
      });

      if (data && Array.isArray(data.invoices)) { // Ensure data.invoices is an array
        setInvoices((prev) => {
          if (pageNumber === 1) return data.invoices;
          return [...prev, ...data.invoices];
        });
        setHasMore(data.hasMore);
      } else {
        setInvoices([]);
        setHasMore(false);
      }
    } catch (err) {
      toastError(err);
    }
  }, [searchParam, pageNumber, fetchInvoicesApi, setInvoices]);

  useEffect(() => {
    setInvoices([]);
    setPageNumber(1);
  }, [searchParam, setInvoices]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchInvoices();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchInvoices]);

  const handleOpenContactModal = async (invoice) => {
    try {
      const paymentSettings = await listCompanyPaymentSettings();
      const hasGateway = Array.isArray(paymentSettings) && paymentSettings.length > 0 && paymentSettings.some(p => p.active);

      if (!hasGateway) {
        setNoGatewayModalOpen(true);
        return;
      }
    } catch (err) {
      toastError(err);
      return;
    }

    setStoragePlans(invoice);
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loadingInvoices) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const rowStyle = (record) => {
    const hoje = moment();
    const vencimento = moment(record.dueDate);
    if (vencimento.isBefore(hoje, 'day') && record.status !== "paid") {
      return { backgroundColor: "#ffbcbc9c" };
    }
  };

  const rowStatus = (record) => {
    const hoje = moment();
    const vencimento = moment(record.dueDate);
    const status = record.status;
    if (status === "paid") {
      return { text: "Pago", color: "paid", overdueDays: 0 };
    }
    if (vencimento.isBefore(hoje, 'day')) {
      return { text: "Vencido", color: "overdue", overdueDays: Math.abs(hoje.diff(vencimento, 'days')) };
    } else {
      return { text: "Em Aberto", color: "unpaid", overdueDays: 0 };
    }
  };

  const getFilteredInvoices = () => {
    if (!invoices) return [];

    let filtered = invoices;
    if (isCompanyIdOne) {
      filtered = filtered.filter(inv => inv.companyId !== 1);

      if (statusFilter === "paid") filtered = filtered.filter(inv => inv.status === "paid");
      if (statusFilter === "unpaid") filtered = filtered.filter(inv => inv.status !== "paid");
      if (statusFilter === "overdue") {
        const hoje = moment();
        filtered = filtered.filter(inv => {
          return inv.status !== "paid" && moment(inv.dueDate).isBefore(hoje, 'day');
        });
      }
    } else {
      filtered = filtered.filter(inv => inv.companyId === user?.companyId);
    }
    return filtered;
  };

  const stats = (() => {
    const filtered = getFilteredInvoices();
    const paid = filtered.filter(inv => inv.status === "paid").length;
    const unpaid = filtered.filter(inv => inv.status !== "paid").length;
    const total = filtered.reduce((sum, inv) => sum + (inv.value || 0), 0);
    const unpaidTotal = filtered.filter(inv => inv.status !== "paid").reduce((sum, inv) => sum + (inv.value || 0), 0);

    return { paid, unpaid, total, unpaidTotal };
  })();

  const filteredInvoicesList = getFilteredInvoices();

  const renderUseWhatsapp = (row) => { return row.status === false ? "Não" : "Sim" };
  const renderUseFacebook = (row) => { return row.status === false ? "Não" : "Sim" };
  const renderUseInstagram = (row) => { return row.status === false ? "Não" : "Sim" };
  const renderUseCampaigns = (row) => { return row.status === false ? "Não" : "Sim" };
  const renderUseSchedules = (row) => { return row.status === false ? "Não" : "Sim" };
  const renderUseInternalChat = (row) => { return row.status === false ? "Não" : "Sim" };
  const renderUseExternalApi = (row) => { return row.status === false ? "Não" : "Sim" };

  return (
    <MainContainer>
      <SubscriptionModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        aria-labelledby="form-dialog-title"
        Invoice={storagePlans}
        contactId={selectedContactId}
      />

      <MainHeader>
        <Title>Financeiro</Title>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
        {/* Header Card */}
        <Card className={classes.headerCard}>
          <Typography variant="h4" gutterBottom>
            💰 Centro de Cobranças
          </Typography>
          <Typography variant="body1">
            Gerencie suas faturas e mantenha seu plano em dia
          </Typography>
        </Card>

        {/* Company ID 1 - Painel Admin */}
        {isCompanyIdOne && (
          <Alert severity="info" style={{ marginBottom: 24 }}>
            <Typography variant="h6" gutterBottom>
              🛠️ Painel Administrativo
            </Typography>
            <Typography>
              Visualizando todas as faturas das empresas clientes (sua fatura administrativa está oculta).
              Use o filtro abaixo para filtrar por status e acompanhar pagamentos dos clientes.
            </Typography>
          </Alert>
        )}

        {/* Estatísticas - Para todas as companies */}
        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} md={3}>
            <Card className={`${classes.statsCard} ${classes.paidCard}`}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ✅ Pagas
                </Typography>
                <Typography variant="h4" style={{ fontWeight: 'bold' }}>
                  {stats.paid}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card className={`${classes.statsCard} ${classes.unpaidCard}`}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ⏰ Em Aberto
                </Typography>
                <Typography variant="h4" style={{ fontWeight: 'bold' }}>
                  {stats.unpaid}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card className={`${classes.statsCard} ${classes.totalCard}`}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  💵 Total Geral
                </Typography>
                <Typography variant="h4" style={{ fontWeight: 'bold' }}>
                  {stats.total.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card className={`${classes.statsCard} ${classes.unpaidCard}`}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ⚠️ Em Aberto
                </Typography>
                <Typography variant="h4" style={{ fontWeight: 'bold' }}>
                  {stats.unpaidTotal.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filtro de Status - Apenas para Company ID 1 */}
        {isCompanyIdOne && (
          <Grid container spacing={3} style={{ marginBottom: 24 }}>
            <Grid item xs={12} md={4}>
              <FormControl variant="outlined" size="small" fullWidth>
                <InputLabel>Filtrar por Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Filtrar por Status"
                >
                  <MenuItem value="all">Todas as Faturas</MenuItem>
                  <MenuItem value="paid">Apenas Pagas</MenuItem>
                  <MenuItem value="unpaid">Apenas Em Aberto</MenuItem>
                  <MenuItem value="overdue">Apenas Vencidas</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <Box display="flex" alignItems="center" pt={1}>
                <Typography variant="body2" color="textSecondary">
                  Mostrando {filteredInvoices.length} fatura(s)
                  {statusFilter !== "all" && ` - Filtro: ${statusFilter === "paid" ? "Pagas" : statusFilter === "unpaid" ? "Em Aberto" : "Vencidas"}`}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        {/* Tabela de Faturas - Para todas as companies */}
        <SafeComponent
          loading={loadingInvoices && invoices.length === 0}
          error={errorInvoices}
          data={invoices}
          renderData={() => (
            <>
              <Typography variant="h6" gutterBottom style={{ marginTop: 24, marginBottom: 16 }}>
                📋 {isCompanyIdOne ? "Faturas das Empresas Clientes" : "Histórico de Faturas"}
              </Typography>

              {filteredInvoicesList.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Typography variant="h6" color="textSecondary">
                    {isCompanyIdOne ? "Nenhuma fatura de cliente encontrada" : "Nenhuma fatura encontrada"}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {isCompanyIdOne ? "Não há faturas registradas para as empresas clientes" : "Você não possui faturas em seu histórico"}
                  </Typography>
                </Box>
              ) : (
                <Card className={classes.invoiceTable}>
                  <Table size="small">
                    <TableHead className={classes.tableHead}>
                      <TableRow>
                        <TableCell align="center">Detalhes</TableCell>
                        <TableCell align="center">Empresa</TableCell>
                        <TableCell align="center">Usuários</TableCell>
                        <TableCell align="center">Conexões</TableCell>
                        <TableCell align="center">Filas</TableCell>
                        <TableCell align="center">Valor</TableCell>
                        <TableCell align="center">Vencimento</TableCell>
                        <TableCell align="center">Status</TableCell>
                        {isCompanyIdOne && <TableCell align="center">Atraso</TableCell>}
                        <TableCell align="center">Ação</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredInvoicesList.map((invoice) => {
                        const status = rowStatus(invoice);
                        return (
                          <TableRow
                            key={invoice.id}
                            style={rowStyle(invoice)}
                            hover
                          >
                            <TableCell align="center">{invoice.detail}</TableCell>
                            <TableCell align="center">
                              {isCompanyIdOne ? (
                                <Chip
                                  label={`ID: ${invoice.companyId || 'N/A'} ${invoice.companyId === 1 ? '(Admin)' : ''}`}
                                  size="small"
                                  style={{
                                    backgroundColor: invoice.companyId === 1 ? '#f3e5f5' : '#e3f2fd',
                                    color: invoice.companyId === 1 ? '#7b1fa2' : '#1976d2'
                                  }}
                                />
                              ) : (
                                invoice.detail
                              )}
                            </TableCell>
                            <TableCell align="center">{invoice.users}</TableCell>
                            <TableCell align="center">{invoice.connections}</TableCell>
                            <TableCell align="center">{invoice.queues}</TableCell>
                            <TableCell align="center" style={{ fontWeight: 'bold' }}>
                              {(invoice.value || 0).toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell align="center">
                              {moment(invoice.dueDate).format("DD/MM/YYYY")}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={status.text}
                                className={`${classes.statusChip} ${classes[`${status.color}Chip`]}`}
                              />
                            </TableCell>
                            {isCompanyIdOne && (
                              <TableCell align="center">
                                {status.overdueDays > 0 ? (
                                  <Chip
                                    label={`${status.overdueDays} dias`}
                                    size="small"
                                    style={{
                                      backgroundColor: status.overdueDays > 30 ? '#ffebee' : '#fff3e0',
                                      color: status.overdueDays > 30 ? '#c62828' : '#f57c00'
                                    }}
                                  />
                                ) : (
                                  <Typography variant="body2" color="textSecondary">
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                            )}
                            <TableCell align="center">
                              {status.text !== "Pago" ? (
                                <Button
                                  startIcon={<AttachMoneyIcon />}
                                  size="small"
                                  className={classes.payButton}
                                  onClick={() => {
                                    handleOpenContactModal(invoice);
                                  }}
                                >
                                  PAGAR
                                </Button>
                              ) : (
                                <Button
                                  startIcon={<AttachMoneyIcon />}
                                  size="small"
                                  className={classes.paidButton}
                                >
                                  PAGO
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {loadingInvoices && <TableRowSkeleton columns={isCompanyIdOne ? 9 : 8} />}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </>
          )}
        />

        {/* Modal de aviso sobre gateway não configurado */}
        <Dialog
          open={noGatewayModalOpen}
          onClose={() => setNoGatewayModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle style={{
            backgroundColor: '#f44336',
            color: 'white',
            textAlign: 'center'
          }}>
            Atenção
          </DialogTitle>
          <DialogContent style={{ padding: '24px', textAlign: 'center' }}>
            <Typography variant="h6" style={{ marginBottom: '16px', color: '#333' }}>
              Entre em contato com o administrador
            </Typography>
            <Typography variant="body1" style={{ color: '#666' }}>
              Para realizar o pagamento, por favor, fale com o administrador do sistema.
            </Typography>
          </DialogContent>
          <DialogActions style={{ padding: '16px 24px', justifyContent: 'center' }}>
            <Button
              onClick={() => setNoGatewayModalOpen(false)}
              variant="contained"
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                padding: '8px 24px'
              }}
            >
              Entendido
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </MainContainer>
  );
};

export default Invoices;
