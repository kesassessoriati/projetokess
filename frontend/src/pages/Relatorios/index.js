import React, { useEffect, useState, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@material-ui/core";
import { Tabs, Tab } from "@mui/material";
import Chart from "react-apexcharts";
import TrendingUpIcon from '@material-ui/icons/TrendingUp';
import TrendingDownIcon from '@material-ui/icons/TrendingDown';
import PeopleIcon from '@material-ui/icons/People';
import AssignmentIcon from '@material-ui/icons/Assignment';
import LocalOfferIcon from '@material-ui/icons/LocalOffer';
import AccessTimeIcon from '@material-ui/icons/AccessTime';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ScheduleIcon from '@material-ui/icons/Schedule';
import WhatsAppIcon from '@material-ui/icons/WhatsApp';
import FacebookIcon from '@material-ui/icons/Facebook';
import BarChartIcon from '@material-ui/icons/BarChart';
import TimelineIcon from '@material-ui/icons/Timeline';
import GetAppIcon from '@material-ui/icons/GetApp';
import RefreshIcon from '@material-ui/icons/Refresh';
import StarIcon from '@material-ui/icons/Star';
import StarBorderIcon from '@material-ui/icons/StarBorder';
import StarHalfIcon from '@material-ui/icons/StarHalf';
import ThumbUpIcon from '@material-ui/icons/ThumbUp';
import ThumbDownIcon from '@material-ui/icons/ThumbDown';
import SentimentSatisfiedIcon from '@material-ui/icons/SentimentSatisfied';
import InstagramIcon from '@material-ui/icons/Instagram';
import PhoneAndroidIcon from '@material-ui/icons/PhoneAndroid';
import SignalCellularAltIcon from '@material-ui/icons/SignalCellularAlt';
import AttachMoneyIcon from '@material-ui/icons/AttachMoney';
import ReceiptIcon from '@material-ui/icons/Receipt';
import MoneyOffIcon from '@material-ui/icons/MoneyOff';
import PaymentIcon from '@material-ui/icons/Payment';
import ShoppingBasketIcon from '@material-ui/icons/ShoppingBasket';
import BuildIcon from '@material-ui/icons/Build';
import VisibilityIcon from '@material-ui/icons/Visibility';
import moment from "moment";
import html2pdf from "html2pdf.js";

import api from "../../services/api";
import { listFinanceiroFaturas } from "../../services/financeiroFaturas";
import { listServicos } from "../../services/servicosService";
import { AuthContext } from "../../context/Auth/AuthContext";
import useDashboard from "../../hooks/useDashboard";
import toastError from "../../errors/toastError";
import ContactTagListModal from "../../components/ContactTagListModal";
import ProductivityReport from "./ProductivityReport";

const useStyles = makeStyles(theme => ({
  container: {
    padding: theme.spacing(3),
    width: "100%",
    margin: 0,
    background: "radial-gradient(circle at top left, #f4fbf6 0%, #ecf5ee 48%, #e3efe6 100%)",
    minHeight: "100vh",
    overflowX: "hidden",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
      paddingBottom: "100px",
    },
  },
  pageHeader: {
    marginBottom: theme.spacing(2),
    borderRadius: 16,
    padding: theme.spacing(2.25, 2.5),
    border: "1px solid #d5e5da",
    background: "linear-gradient(140deg, #ffffff 0%, #f6fbf7 100%)",
    boxShadow: "0 10px 30px rgba(16,24,40,.08)",
    [theme.breakpoints.down("sm")]: {
      marginBottom: theme.spacing(2),
      borderRadius: 12,
      padding: theme.spacing(1.25),
    },
  },
  pageTitle: {
    fontSize: "30px",
    fontWeight: 800,
    color: "#103a23",
    letterSpacing: "-0.02em",
    marginBottom: theme.spacing(0.5),
    [theme.breakpoints.down("sm")]: {
      fontSize: "20px",
    },
  },
  pageSubtitle: {
    fontSize: "13px",
    color: "#4e6556",
    [theme.breakpoints.down("sm")]: {
      fontSize: "12px",
    },
  },
  breadcrumb: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(1),
    color: "#6f8577",
    fontSize: "13px",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #dce9e1",
    backgroundColor: "#f4faf6",
    "& span": {
      color: "#128045",
      fontWeight: 700,
    },
  },
  tabsContainer: {
    background: "#ffffffd9",
    borderRadius: 14,
    border: "1px solid #d4e3d8",
    padding: theme.spacing(0.8),
    marginBottom: theme.spacing(2),
    boxShadow: "0 8px 24px rgba(16,24,40,.07)",
    backdropFilter: "blur(2px)",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(0.5),
      borderRadius: 10,
    },
  },
  tab: {
    textTransform: "none",
    fontWeight: 700,
    fontSize: "13px",
    minHeight: 46,
    color: "#3f5547",
    borderRadius: 10,
    marginRight: 8,
    border: "1px solid #d3e1d7",
    backgroundColor: "#f7fbf8",
    transition: "all .2s ease",
    "&:hover": {
      backgroundColor: "#edf7f1",
      borderColor: "#8fc9a1",
    },
    "&.Mui-selected": {
      color: "#ffffff",
      background: "linear-gradient(135deg, #1fa257 0%, #157a40 100%)",
      borderColor: "#106a38",
      boxShadow: "0 10px 24px rgba(24,135,71,.28)",
    },
    "&.Mui-focusVisible": {
      boxShadow: "0 0 0 3px rgba(31,157,85,.3)",
    },
    [theme.breakpoints.down("sm")]: {
      fontSize: "11px",
      minHeight: 40,
      padding: "6px 10px",
      minWidth: "auto",
      marginRight: 6,
    },
  },
  tabIndicator: {
    display: "none",
  },
  indicatorCard: {
    background: "linear-gradient(160deg, #ffffff 0%, #f8fcf9 100%)",
    borderRadius: 16,
    padding: theme.spacing(2.5),
    boxShadow: "0 12px 28px rgba(16,24,40,.08)",
    border: "1px solid #dce9e1",
    height: "100%",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    transition: "transform .18s ease, box-shadow .18s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 18px 36px rgba(16,24,40,.11)",
    },
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5),
      borderRadius: 10,
      gap: theme.spacing(1),
    },
  },
  indicatorIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 1px 1px rgba(255,255,255,.25), 0 8px 18px rgba(16,24,40,.18)",
    [theme.breakpoints.down("sm")]: {
      width: 40,
      height: 40,
      borderRadius: 8,
      "& svg": {
        fontSize: "20px !important",
      },
    },
  },
  indicatorContent: {
    flex: 1,
    minWidth: 0,
  },
  indicatorLabel: {
    fontSize: "12px",
    color: "#5f7566",
    marginBottom: 4,
    fontWeight: 600,
    [theme.breakpoints.down("sm")]: {
      fontSize: "11px",
      marginBottom: 2,
    },
  },
  indicatorValue: {
    fontSize: "26px",
    fontWeight: 800,
    color: "#103a23",
    lineHeight: 1.15,
    [theme.breakpoints.down("sm")]: {
      fontSize: "16px",
    },
  },
  indicatorTrend: {
    fontSize: "11px",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    marginTop: 7,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 999,
  },
  trendUp: {
    color: "#0f7d43",
    backgroundColor: "rgba(16, 185, 129, 0.14)",
  },
  trendDown: {
    color: "#b42318",
    backgroundColor: "rgba(239, 68, 68, 0.14)",
  },
  chartCard: {
    background: "linear-gradient(160deg, #ffffff 0%, #f8fcf9 100%)",
    borderRadius: 16,
    padding: theme.spacing(2.4),
    boxShadow: "0 12px 28px rgba(16,24,40,.08)",
    border: "1px solid #dce9e1",
    marginBottom: theme.spacing(3),
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5),
      borderRadius: 10,
      marginBottom: theme.spacing(2),
    },
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      marginBottom: theme.spacing(1),
      flexWrap: "wrap",
      gap: theme.spacing(1),
    },
  },
  chartTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#123b25",
    [theme.breakpoints.down("sm")]: {
      fontSize: "14px",
    },
  },
  tableCard: {
    background: "linear-gradient(160deg, #ffffff 0%, #f9fcfa 100%)",
    borderRadius: 16,
    padding: theme.spacing(2.4),
    boxShadow: "0 12px 28px rgba(16,24,40,.08)",
    border: "1px solid #dce9e1",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
      borderRadius: 10,
      overflowX: "auto",
    },
  },
  tableHeader: {
    background: "#f0f7f3",
    "& th": {
      fontWeight: 700,
      color: "#264634",
      borderBottom: "1px solid #d4e3da",
      [theme.breakpoints.down("sm")]: {
        fontSize: "11px",
        padding: "8px 4px",
        whiteSpace: "nowrap",
      },
    },
  },
  tableRow: {
    "&:hover": {
      background: "#f7fbf8",
    },
    [theme.breakpoints.down("sm")]: {
      "& td": {
        fontSize: "11px",
        padding: "8px 4px",
      },
    },
  },
  filtersContainer: {
    background: "#ffffff",
    borderRadius: 14,
    border: "1px solid #d4e3d8",
    padding: theme.spacing(1.8),
    marginBottom: theme.spacing(2.5),
    boxShadow: "0 8px 24px rgba(16,24,40,.07)",
    display: "flex",
    gap: theme.spacing(1.5),
    alignItems: "center",
    flexWrap: "wrap",
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
      backgroundColor: "#f8fcfa",
      "& fieldset": {
        borderColor: "#cfe0d5",
      },
      "&:hover fieldset": {
        borderColor: "#89c7a0",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#1e9b54",
        borderWidth: 2,
      },
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "#167f44",
    },
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
      gap: theme.spacing(1),
      marginBottom: theme.spacing(2),
      "& .MuiFormControl-root": {
        minWidth: "100%",
      },
      "& .MuiTextField-root": {
        minWidth: "calc(50% - 4px)",
      },
    },
  },
  filterActionButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    color: "#fff",
    boxShadow: "0 8px 18px rgba(16,24,40,.2)",
    transition: "transform .16s ease, box-shadow .16s ease",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 12px 22px rgba(16,24,40,.24)",
    },
    "&:focus-visible": {
      outline: "2px solid rgba(31,157,85,.5)",
      outlineOffset: 1,
    },
  },
  refreshButton: {
    background: "linear-gradient(135deg, #24a35a 0%, #14773f 100%)",
  },
  exportButton: {
    background: "linear-gradient(135deg, #187a44 0%, #0f5d33 100%)",
  },
  attendantAvatar: {
    width: 40,
    height: 40,
    marginRight: theme.spacing(1.5),
    background: "#178a4a",
    [theme.breakpoints.down("sm")]: {
      width: 32,
      height: 32,
      marginRight: theme.spacing(1),
    },
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    position: "absolute",
    bottom: 0,
    right: 0,
    border: "2px solid #fff",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400,
    [theme.breakpoints.down("sm")]: {
      minHeight: 200,
    },
  },
  hideOnMobile: {
    [theme.breakpoints.down("sm")]: {
      display: "none !important",
    },
  },
  mobileFullWidth: {
    [theme.breakpoints.down("sm")]: {
      width: "100%",
    },
  },
}));

// Componente de Card Indicador
const IndicatorCard = ({ icon, iconBg, label, value, trend, trendValue, classes }) => (
  <div className={classes.indicatorCard}>
    <div className={classes.indicatorIcon} style={{ background: iconBg }}>
      {icon}
    </div>
    <div className={classes.indicatorContent}>
      <Typography className={classes.indicatorLabel}>{label}</Typography>
      <Typography className={classes.indicatorValue}>{value}</Typography>
      {trend !== undefined && (
        <div className={`${classes.indicatorTrend} ${trend ? classes.trendUp : classes.trendDown}`}>
          {trend ? <TrendingUpIcon style={{ fontSize: 14 }} /> : <TrendingDownIcon style={{ fontSize: 14 }} />}
          {trendValue}
        </div>
      )}
    </div>
  </div>
);

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const Reports = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { find } = useDashboard();

  // Estados
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(moment().endOf('month').format('YYYY-MM-DD'));

  // Dados
  const [counters, setCounters] = useState({});
  const [attendants, setAttendants] = useState([]);
  const [tags, setTags] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [selectedPipelineInfo, setSelectedPipelineInfo] = useState(null);
  const [kanbanSummary, setKanbanSummary] = useState([]);
  const [kanbanOverview, setKanbanOverview] = useState({
    totalStages: 0,
    totalCurrentCards: 0,
    totalEnteredInPeriod: 0,
    totalCurrentValue: 0,
  });
  const [ticketsPerDay, setTicketsPerDay] = useState([]);
  const [previousCounters, setPreviousCounters] = useState({});
  const [whatsappConnections, setWhatsappConnections] = useState([]);
  const [instagramConnections, setInstagramConnections] = useState([]);
  const [facebookConnections, setFacebookConnections] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedKanbanUserId, setSelectedKanbanUserId] = useState("all");

  const loadPipelines = async () => {
    try {
      const { data } = await api.get("/pipelines");
      const pipelineList = Array.isArray(data) ? data : [];
      setPipelines(pipelineList);

      if (!selectedPipelineId && pipelineList.length > 0) {
        const defaultPipeline = pipelineList.find((pipeline) => pipeline.isDefault) || pipelineList[0];
        setSelectedPipelineId(String(defaultPipeline.id));
      }
    } catch (err) {
      console.log("Erro ao carregar funis:", err);
      setPipelines([]);
    }
  };

  // Carregar dados
  const loadData = async () => {
    setLoading(true);
    try {
      // Dados do período atual
      const data = await find({
        date_from: dateFrom,
        date_to: dateTo,
        pipelineId: activeTab === 4 ? (selectedPipelineId || undefined) : undefined,
        reportUserId: activeTab === 4 && selectedKanbanUserId !== "all"
          ? selectedKanbanUserId
          : undefined,
      });

      if (data) {
        setCounters(data.counters || {});
        setAttendants(data.attendants || []);
        setTags(data.tagsContactsSummary || []);
        setKanbanSummary(data.kanbanSummary || []);
        setKanbanOverview(data.kanbanOverview || {
          totalStages: 0,
          totalCurrentCards: 0,
          totalEnteredInPeriod: 0,
          totalCurrentValue: 0,
        });
        setSelectedPipelineInfo(data.selectedPipeline || null);
      }

      // Dados do período anterior para comparação
      const prevStart = moment(dateFrom).subtract(1, 'month').format('YYYY-MM-DD');
      const prevEnd = moment(dateTo).subtract(1, 'month').format('YYYY-MM-DD');
      const prevData = await find({
        date_from: prevStart,
        date_to: prevEnd,
      });

      if (prevData && prevData.counters) {
        setPreviousCounters(prevData.counters);
      }

      // Dados por dia (últimos 7 dias)
      const dailyData = [];
      for (let i = 6; i >= 0; i--) {
        const day = moment().subtract(i, 'days').format('YYYY-MM-DD');
        try {
          const dayData = await find({ date_from: day, date_to: day });
          dailyData.push({
            date: moment().subtract(i, 'days').format('DD/MM'),
            tickets: (dayData && dayData.counters && dayData.counters.supportFinished) || 0,
            leads: (dayData && dayData.counters && dayData.counters.crmLeadsGenerated) || 0,
            meetings: (dayData && dayData.counters && dayData.counters.crmMeetingsScheduled) || 0,
          });
        } catch {
          dailyData.push({ date: moment().subtract(i, 'days').format('DD/MM'), tickets: 0, leads: 0, meetings: 0 });
        }
      }
      setTicketsPerDay(dailyData);

      // Carregar conexões (WhatsApp e Instagram)
      try {
        const { data: whatsapps } = await api.get('/whatsapp');
        const whatsappList = whatsapps.filter(w => w.channel === 'whatsapp' || !w.channel);
        const instagramList = whatsapps.filter(w => w.channel === 'instagram');
        const facebookList = whatsapps.filter(w => w.channel === 'facebook');
        setWhatsappConnections(whatsappList);
        setInstagramConnections(instagramList);
        setFacebookConnections(facebookList);
      } catch (err) {
        console.log('Erro ao carregar conexões:', err);
      }

      // Carregar faturas (mesmo endpoint da página Financeiro/Faturas)
      try {
        const financeiroData = await listFinanceiroFaturas({ pageNumber: 1 });
        const fetchedInvoices =
          financeiroData?.faturamentos ||
          financeiroData?.records ||
          financeiroData?.faturas ||
          [];
        setInvoices(Array.isArray(fetchedInvoices) ? fetchedInvoices : []);
      } catch (err) {
        console.log('Erro ao carregar faturas:', err);
        setInvoices([]);
      }

      // Carregar produtos
      try {
        const { data: produtosData } = await api.get('/produtos');
        setProducts(Array.isArray(produtosData) ? produtosData : []);
      } catch (err) {
        console.log('Erro ao carregar produtos:', err);
        setProducts([]);
      }

      // Carregar serviços
      try {
        const { data: servicosData } = await listServicos();
        setServices(Array.isArray(servicosData) ? servicosData : []);
      } catch (err) {
        console.log('Erro ao carregar serviços:', err);
        setServices([]);
      }

    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipelines();
  }, []);

  useEffect(() => {
    if (activeTab === 4 && !selectedPipelineId && pipelines.length > 0) return;
    loadData();
  }, [dateFrom, dateTo, selectedPipelineId, selectedKanbanUserId, activeTab]);

  // Abrir modal de contatos da tag
  const handleTagClick = async (tag) => {
    try {
      const { data } = await api.get(`/tags/${tag.id}`);
      setSelectedTag(data);
      setContactModalOpen(true);
    } catch (err) {
      toastError(err);
    }
  };

  const handleCloseContactModal = () => {
    setContactModalOpen(false);
    setSelectedTag(null);
  };

  // Calcular tendências
  const calcTrend = (current, previous) => {
    if (!previous || previous === 0) return { value: 0, isUp: true };
    const diff = ((current - previous) / previous) * 100;
    return { value: Math.abs(diff).toFixed(1), isUp: diff >= 0 };
  };

  // Formatar tempo
  const formatTime = (minutes) => {
    if (!minutes) return '0 min';
    const mins = Math.round(parseFloat(minutes));
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  const handleExportPDF = () => {
    const element = document.getElementById("report-content");
    const activeTabLabel = [
      "Visão Geral", "Atendentes", "Tickets", "Tags", "Kanban",
      "Avaliações", "Canais", "Produtos", "Serviços", "Faturas"
    ][activeTab];
    const pipelineExportSuffix = activeTab === 4 && selectedPipelineInfo?.name
      ? `_${selectedPipelineInfo.name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_")}`
      : "";

    const options = {
      margin: [10, 10, 10, 10],
      filename: `Relatorio_${activeTabLabel}${pipelineExportSuffix}_${moment().format("DD_MM_YYYY")}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(options).save();
  };

  // ==================== ABA 1: VISÃO GERAL ====================
  const renderOverview = () => {
    const ticketsTrend = calcTrend(counters.supportFinished, previousCounters.supportFinished);
    const leadsTrend = calcTrend(counters.leads, previousCounters.leads);

    return (
      <>
        {/* Cards de Indicadores */}
        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<PeopleIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#10b981"
              label="Novos Leads (CRM)"
              value={counters.crmLeadsGenerated || 0}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<ScheduleIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#1e9b54"
              label="Reuniões Agendadas"
              value={counters.crmMeetingsScheduled || 0}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<TrendingUpIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#178a4a"
              label="Leads Convertidos"
              value={counters.crmConversions || 0}
              classes={classes}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} sm={6} md={4}>
            <IndicatorCard
              icon={<AssignmentIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#157a40"
              label="Total de Tickets"
              value={counters.supportFinished || 0}
              trend={ticketsTrend.isUp}
              trendValue={`${ticketsTrend.value}% vs período anterior`}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <IndicatorCard
              icon={<AccessTimeIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#f59e0b"
              label="TME"
              value={formatTime(counters.avgWaitTime)}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <IndicatorCard
              icon={<CheckCircleIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#dc2626"
              label="Em Atendimento"
              value={counters.supportHappening || 0}
              classes={classes}
            />
          </Grid>
        </Grid>

        {/* Gráfico de Tickets por Dia */}
        <div className={classes.chartCard}>
          <div className={classes.chartHeader}>
            <Typography className={classes.chartTitle}>Tickets por Dia (Últimos 7 dias)</Typography>
          </div>
          <Chart
            options={{
              chart: { type: 'bar', toolbar: { show: false } },
              colors: ['#178a4a', '#10b981', '#1e9b54'],
              plotOptions: {
                bar: { borderRadius: 6, columnWidth: '60%' }
              },
              xaxis: {
                categories: ticketsPerDay.map(d => d.date),
                labels: { style: { colors: '#9ca3af' } }
              },
              yaxis: { labels: { style: { colors: '#9ca3af' } } },
              grid: { borderColor: '#f1f5f9' },
              legend: { position: 'top' },
              dataLabels: { enabled: false },
            }}
            series={[
              { name: 'Tickets', data: ticketsPerDay.map(d => d.tickets) },
              { name: 'Leads (CRM)', data: ticketsPerDay.map(d => d.leads) },
              { name: 'Reuniões', data: ticketsPerDay.map(d => d.meetings) },
            ]}
            type="bar"
            height={320}
          />
        </div>
      </>
    );
  };

  // ==================== ABA 2: ATENDENTES ====================
  const renderAttendants = () => {
    const sortedAttendants = [...attendants].sort((a, b) => (b.tickets || 0) - (a.tickets || 0));

    return (
      <>
        {/* Cards de resumo */}
        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<PeopleIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#178a4a"
              label="Total de Atendentes"
              value={attendants.length}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<CheckCircleIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#10b981"
              label="Online Agora"
              value={attendants.filter(a => a.online).length}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<AssignmentIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#f59e0b"
              label="Total de Atendimentos"
              value={attendants.reduce((acc, a) => acc + (a.tickets || 0), 0)}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<AccessTimeIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#1e9b54"
              label="Média de Avaliação"
              value={attendants.length > 0
                ? (attendants.reduce((acc, a) => acc + (parseFloat(a.rating) || 0), 0) / attendants.length).toFixed(1)
                : '0'}
              classes={classes}
            />
          </Grid>
        </Grid>

        {/* Gráfico de Atendimentos por Atendente */}
        <div className={classes.chartCard}>
          <div className={classes.chartHeader}>
            <Typography className={classes.chartTitle}>Atendimentos por Atendente</Typography>
          </div>
          <Chart
            options={{
              chart: { type: 'bar', toolbar: { show: false } },
              colors: ['#178a4a'],
              plotOptions: {
                bar: { horizontal: true, borderRadius: 6, barHeight: '60%' }
              },
              xaxis: {
                categories: sortedAttendants.slice(0, 10).map(a => a.name),
                labels: { style: { colors: '#9ca3af' } }
              },
              yaxis: { labels: { style: { colors: '#374151' } } },
              grid: { borderColor: '#f1f5f9' },
              dataLabels: { enabled: true },
            }}
            series={[{ name: 'Atendimentos', data: sortedAttendants.slice(0, 10).map(a => a.tickets || 0) }]}
            type="bar"
            height={400}
          />
        </div>

        {/* Tabela de Atendentes */}
        <div className={classes.tableCard}>
          <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
            Detalhamento por Atendente
          </Typography>
          <Table>
            <TableHead className={classes.tableHeader}>
              <TableRow>
                <TableCell>Atendente</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Atendimentos</TableCell>
                <TableCell align="right">Tempo Médio Espera</TableCell>
                <TableCell align="right">Tempo Médio Atendimento</TableCell>
                <TableCell align="right">Avaliação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedAttendants.map((attendant) => (
                <TableRow key={attendant.id} className={classes.tableRow}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Box position="relative">
                        <Avatar className={classes.attendantAvatar}>
                          {attendant.name?.charAt(0).toUpperCase()}
                        </Avatar>
                        <div
                          className={classes.onlineIndicator}
                          style={{ background: attendant.online ? '#10b981' : '#9ca3af' }}
                        />
                      </Box>
                      <Typography style={{ fontWeight: 500 }}>{attendant.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      component="span"
                      style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: attendant.online ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                        color: attendant.online ? '#10b981' : '#6b7280',
                      }}
                    >
                      {attendant.online ? 'Online' : 'Offline'}
                    </Box>
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 600 }}>{attendant.tickets || 0}</TableCell>
                  <TableCell align="right">{formatTime(attendant.avgWaitTime)}</TableCell>
                  <TableCell align="right">{formatTime(attendant.avgSupportTime)}</TableCell>
                  <TableCell align="right">
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                      <span style={{ fontWeight: 600 }}>{parseFloat(attendant.rating || 0).toFixed(1)}</span>
                      <span style={{ color: '#f59e0b' }}>★</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>({attendant.countRating || 0})</span>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  // ==================== ABA 3: TICKETS ====================
  const renderTickets = () => (
    <>
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12} sm={6} md={3}>
          <IndicatorCard
            icon={<AssignmentIcon style={{ color: '#fff', fontSize: 28 }} />}
            iconBg="#178a4a"
            label="Tickets Finalizados"
            value={counters.supportFinished || 0}
            classes={classes}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <IndicatorCard
            icon={<ScheduleIcon style={{ color: '#fff', fontSize: 28 }} />}
            iconBg="#f59e0b"
            label="Aguardando"
            value={counters.supportPending || 0}
            classes={classes}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <IndicatorCard
            icon={<WhatsAppIcon style={{ color: '#fff', fontSize: 28 }} />}
            iconBg="#10b981"
            label="Em Atendimento"
            value={counters.supportHappening || 0}
            classes={classes}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <IndicatorCard
            icon={<AccessTimeIcon style={{ color: '#fff', fontSize: 28 }} />}
            iconBg="#1e9b54"
            label="Tempo Médio Atendimento"
            value={formatTime(counters.avgSupportTime)}
            classes={classes}
          />
        </Grid>
      </Grid>

      {/* Gráfico de Status */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <div className={classes.chartCard}>
            <Typography className={classes.chartTitle}>Distribuição por Status</Typography>
            <Chart
              options={{
                labels: ['Finalizados', 'Em Atendimento', 'Aguardando'],
                colors: ['#10b981', '#178a4a', '#f59e0b'],
                legend: { position: 'bottom' },
              }}
              series={[
                counters.supportFinished || 0,
                counters.supportHappening || 0,
                counters.supportPending || 0,
              ]}
              type="donut"
              height={320}
            />
          </div>
        </Grid>
        <Grid item xs={12} md={6}>
          <div className={classes.chartCard}>
            <Typography className={classes.chartTitle}>Avaliações (NPS)</Typography>
            <Chart
              options={{
                labels: ['Promotores', 'Neutros', 'Detratores'],
                colors: ['#10b981', '#f59e0b', '#ef4444'],
                legend: { position: 'bottom' },
              }}
              series={[
                counters.npsPromotersPerc || 0,
                counters.npsPassivePerc || 0,
                counters.npsDetractorsPerc || 0,
              ]}
              type="donut"
              height={320}
            />
          </div>
        </Grid>
      </Grid>
    </>
  );

  // ==================== ABA 4: TAGS ====================
  const renderTags = () => {
    const commonTags = tags.filter(t => !t.kanban || t.kanban === 0);
    const sortedTags = [...commonTags].sort((a, b) => (b.contactsCount || 0) - (a.contactsCount || 0));
    const totalContacts = sortedTags.reduce((acc, t) => acc + (t.contactsCount || 0), 0);

    return (
      <>
        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<LocalOfferIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#178a4a"
              label="Total de Tags"
              value={tags.length}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<PeopleIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#10b981"
              label="Contatos com Tags"
              value={totalContacts}
              classes={classes}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Distribuição por Tag</Typography>
              <Chart
                options={{
                  labels: sortedTags.slice(0, 8).map(t => t.name),
                  colors: sortedTags.slice(0, 8).map(t => t.color || '#178a4a'),
                  legend: { position: 'bottom' },
                  chart: {
                    events: {
                      dataPointSelection: (event, chartContext, config) => {
                        const tag = sortedTags[config.dataPointIndex];
                        if (tag) handleTagClick(tag);
                      },
                    },
                  },
                  plotOptions: { pie: { expandOnClick: false } },
                }}
                series={sortedTags.slice(0, 8).map(t => t.contactsCount || 0)}
                type="donut"
                height={320}
              />
            </div>
          </Grid>
          <Grid item xs={12} md={7}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Top 10 Tags</Typography>
              <Chart
                options={{
                  chart: {
                    type: 'bar',
                    toolbar: { show: false },
                    events: {
                      dataPointSelection: (event, chartContext, config) => {
                        const tag = sortedTags[config.dataPointIndex];
                        if (tag) handleTagClick(tag);
                      },
                    },
                  },
                  colors: ['#178a4a'],
                  plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
                  xaxis: { categories: sortedTags.slice(0, 10).map(t => t.name) },
                  dataLabels: { enabled: true },
                }}
                series={[{ name: 'Contatos', data: sortedTags.slice(0, 10).map(t => t.contactsCount || 0) }]}
                type="bar"
                height={320}
              />
            </div>
          </Grid>
        </Grid>

        {/* Lista de Tags Clicáveis */}
        <div className={classes.tableCard} style={{ marginTop: 24 }}>
          <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
            Todas as Tags
          </Typography>
          <Table>
            <TableHead className={classes.tableHeader}>
              <TableRow>
                <TableCell>Tag</TableCell>
                <TableCell align="right">Contatos</TableCell>
                <TableCell align="right">% do Total</TableCell>
                <TableCell align="center" style={{ width: 80 }}>Ver</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedTags.map((tag) => (
                <TableRow
                  key={tag.id}
                  className={classes.tableRow}
                  onClick={() => handleTagClick(tag)}
                  style={{ cursor: 'pointer' }}
                  hover
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" style={{ gap: 12 }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: tag.color || '#178a4a', flexShrink: 0
                      }} />
                      <Typography style={{ fontWeight: 500 }}>{tag.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 600 }}>
                    {(tag.contactsCount || 0).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell align="right" style={{ color: '#6b7280' }}>
                    {totalContacts > 0
                      ? ((tag.contactsCount || 0) / totalContacts * 100).toFixed(1)
                      : 0}%
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver contatos desta tag">
                      <VisibilityIcon style={{ fontSize: 20, color: '#9ca3af' }} />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  // ==================== ABA 5: KANBAN ====================
  const renderKanban = () => {
    const currentPipeline = pipelines.find((pipeline) => Number(pipeline.id) === Number(selectedPipelineId)) || selectedPipelineInfo;
    const currentKanbanAttendant = selectedKanbanUserId !== "all"
      ? attendants.find((attendant) => String(attendant.id) === String(selectedKanbanUserId))
      : null;
    const totalTickets = kanbanOverview.totalCurrentCards || 0;
    const totalStages = kanbanOverview.totalStages || kanbanSummary.length || 0;
    const totalEnteredInPeriod = kanbanOverview.totalEnteredInPeriod || 0;
    const totalCurrentValue = kanbanOverview.totalCurrentValue || 0;

    return (
      <>
        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<BarChartIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#178a4a"
              label="Etapas do Funil"
              value={totalStages}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<AssignmentIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#10b981"
              label="Cards no Funil"
              value={totalTickets}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<TimelineIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#1e9b54"
              label="Entradas no Período"
              value={totalEnteredInPeriod}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<AttachMoneyIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#f59e0b"
              label="Valor Atual do Funil"
              value={formatCurrency(totalCurrentValue)}
              classes={classes}
            />
          </Grid>
        </Grid>

        <div className={classes.chartCard} style={{ marginBottom: 24 }}>
          <div className={classes.chartHeader}>
            <Typography className={classes.chartTitle}>
              {currentPipeline?.name ? `Pipeline ${currentPipeline.name}` : "Pipeline selecionado"}
            </Typography>
          </div>
          <Typography style={{ color: '#5f7566', fontSize: 14, lineHeight: 1.7 }}>
            Esse relatório mostra como o funil escolhido evoluiu no período filtrado, trazendo volume atual por etapa,
            entradas registradas e valor acumulado das oportunidades e leads vinculados.
          </Typography>
          {currentKanbanAttendant && (
            <Typography style={{ color: '#178a4a', fontSize: 13, fontWeight: 600, marginTop: 12 }}>
              Filtro por agente: {currentKanbanAttendant.name}
            </Typography>
          )}
        </div>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Distribuição Atual por Etapa</Typography>
              <Chart
                options={{
                  labels: kanbanSummary.map(k => k.name),
                  colors: kanbanSummary.map(k => k.color || '#178a4a'),
                  legend: { position: 'bottom' },
                }}
                series={kanbanSummary.map(k => k.currentCards || 0)}
                type="donut"
                height={320}
              />
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Entradas por Etapa no Período</Typography>
              <Chart
                options={{
                  chart: { type: 'bar', toolbar: { show: false } },
                  colors: ['#178a4a'],
                  plotOptions: { bar: { borderRadius: 6, columnWidth: '60%' } },
                  xaxis: { categories: kanbanSummary.map(k => k.name) },
                  dataLabels: { enabled: true },
                }}
                series={[{ name: 'Entradas', data: kanbanSummary.map(k => k.enteredInPeriod || 0) }]}
                type="bar"
                height={320}
              />
            </div>
          </Grid>
        </Grid>

        <div className={classes.tableCard} style={{ marginTop: 24 }}>
          <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
            Detalhamento por Etapa
          </Typography>
          <Table>
            <TableHead className={classes.tableHeader}>
              <TableRow>
                <TableCell>Etapa</TableCell>
                <TableCell align="right">Cards Atuais</TableCell>
                <TableCell align="right">Entradas no Período</TableCell>
                <TableCell align="right">Leads Criados</TableCell>
                <TableCell align="right">Movimentações</TableCell>
                <TableCell align="right">Valor Atual</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {kanbanSummary.length > 0 ? kanbanSummary.map((stage) => (
                <TableRow key={stage.id} className={classes.tableRow}>
                  <TableCell>
                    <Box display="flex" alignItems="center" style={{ gap: 12 }}>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: stage.color || '#178a4a',
                          flexShrink: 0
                        }}
                      />
                      <Typography style={{ fontWeight: 600 }}>{stage.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 700 }}>{stage.currentCards || 0}</TableCell>
                  <TableCell align="right">{stage.enteredInPeriod || 0}</TableCell>
                  <TableCell align="right">{stage.leadEntriesCount || 0}</TableCell>
                  <TableCell align="right">{stage.movedIntoStageCount || 0}</TableCell>
                  <TableCell align="right">{formatCurrency(stage.currentValue || 0)}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" style={{ color: '#6b7280', padding: 24 }}>
                    Nenhuma movimentação ou etapa encontrada para o funil selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  // ==================== ABA 6: AVALIAÇÕES ====================
  const renderRatings = () => {
    // Calcular métricas gerais de avaliação
    const totalRatings = attendants.reduce((acc, a) => acc + (parseInt(a.countRating) || 0), 0);
    const avgRating = attendants.length > 0
      ? attendants.reduce((acc, a) => acc + (parseFloat(a.rating) || 0), 0) / attendants.filter(a => parseFloat(a.rating) > 0).length
      : 0;

    // Distribuição de notas (1-5)
    const ratingDistribution = [0, 0, 0, 0, 0]; // índice 0 = nota 1, índice 4 = nota 5
    attendants.forEach(a => {
      const rating = Math.round(parseFloat(a.rating) || 0);
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating - 1] += parseInt(a.countRating) || 0;
      }
    });

    // NPS geral
    const npsScore = (counters.npsPromotersPerc || 0) - (counters.npsDetractorsPerc || 0);

    // Top atendentes por avaliação
    const topRatedAttendants = [...attendants]
      .filter(a => parseFloat(a.rating) > 0)
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 5);

    // Renderizar estrelas
    const renderStars = (rating) => {
      const stars = [];
      const fullStars = Math.floor(rating);
      const hasHalf = rating % 1 >= 0.5;

      for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
          stars.push(<StarIcon key={i} style={{ color: '#f59e0b', fontSize: 20 }} />);
        } else if (i === fullStars && hasHalf) {
          stars.push(<StarHalfIcon key={i} style={{ color: '#f59e0b', fontSize: 20 }} />);
        } else {
          stars.push(<StarBorderIcon key={i} style={{ color: '#e5e7eb', fontSize: 20 }} />);
        }
      }
      return stars;
    };

    return (
      <>
        {/* Cards de Indicadores */}
        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<StarIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#f59e0b"
              label="Avaliação Média"
              value={avgRating ? avgRating.toFixed(1) : '0.0'}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<ThumbUpIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#10b981"
              label="Total de Avaliações"
              value={totalRatings}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<SentimentSatisfiedIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#178a4a"
              label="NPS Score"
              value={npsScore.toFixed(0)}
              trend={npsScore >= 0}
              trendValue={npsScore >= 50 ? 'Excelente' : npsScore >= 0 ? 'Bom' : 'Precisa melhorar'}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<PeopleIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#1e9b54"
              label="Promotores"
              value={`${counters.npsPromotersPerc || 0}%`}
              classes={classes}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Gráfico de Distribuição de Notas */}
          <Grid item xs={12} md={6}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Distribuição de Notas</Typography>
              <Chart
                options={{
                  chart: { type: 'bar', toolbar: { show: false } },
                  colors: ['#f59e0b'],
                  plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
                  xaxis: {
                    categories: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
                    labels: { style: { colors: '#374151', fontSize: '14px' } }
                  },
                  yaxis: { labels: { style: { colors: '#9ca3af' } } },
                  grid: { borderColor: '#f1f5f9' },
                  dataLabels: { enabled: true },
                }}
                series={[{ name: 'Avaliações', data: ratingDistribution }]}
                type="bar"
                height={280}
              />
            </div>
          </Grid>

          {/* Gráfico NPS */}
          <Grid item xs={12} md={6}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>NPS - Net Promoter Score</Typography>
              <Chart
                options={{
                  labels: ['Promotores (9-10)', 'Neutros (7-8)', 'Detratores (0-6)'],
                  colors: ['#10b981', '#f59e0b', '#ef4444'],
                  legend: { position: 'bottom' },
                  plotOptions: {
                    pie: {
                      donut: {
                        size: '70%',
                        labels: {
                          show: true,
                          total: {
                            show: true,
                            label: 'NPS',
                            formatter: () => `${npsScore.toFixed(0)}`
                          }
                        }
                      }
                    }
                  }
                }}
                series={[
                  counters.npsPromotersPerc || 0,
                  counters.npsPassivePerc || 0,
                  counters.npsDetractorsPerc || 0,
                ]}
                type="donut"
                height={280}
              />
            </div>
          </Grid>
        </Grid>

        {/* Top Atendentes por Avaliação */}
        <div className={classes.tableCard} style={{ marginTop: 24 }}>
          <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
            Top Atendentes por Avaliação
          </Typography>
          <Table>
            <TableHead className={classes.tableHeader}>
              <TableRow>
                <TableCell>Posição</TableCell>
                <TableCell>Atendente</TableCell>
                <TableCell align="center">Avaliação</TableCell>
                <TableCell align="right">Total de Avaliações</TableCell>
                <TableCell align="right">Atendimentos</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topRatedAttendants.map((attendant, index) => (
                <TableRow key={attendant.id} className={classes.tableRow}>
                  <TableCell>
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: index === 0 ? '#f59e0b' : index === 1 ? '#9ca3af' : index === 2 ? '#cd7f32' : '#e5e7eb',
                        color: index < 3 ? '#fff' : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {index + 1}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar className={classes.attendantAvatar}>
                        {attendant.name?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography style={{ fontWeight: 500 }}>{attendant.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      {renderStars(parseFloat(attendant.rating))}
                      <span style={{ fontWeight: 600, marginLeft: 8 }}>
                        {parseFloat(attendant.rating).toFixed(1)}
                      </span>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{attendant.countRating || 0}</TableCell>
                  <TableCell align="right">{attendant.tickets || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  // ==================== ABA 7: CANAIS ====================
  const renderChannels = () => {
    const allConnections = [...whatsappConnections, ...instagramConnections, ...facebookConnections];
    const connectedWhatsapp = whatsappConnections.filter(w => w.status === 'CONNECTED').length;
    const connectedInstagram = instagramConnections.filter(w => w.status === 'CONNECTED').length;
    const connectedFacebook = facebookConnections.filter(w => w.status === 'CONNECTED').length;

    // Calcular tickets por canal (estimativa baseada nas conexões)
    const totalTickets = attendants.reduce((acc, a) => acc + (a.tickets || 0), 0);
    const totalConn = Math.max(allConnections.length, 1);
    const whatsappTickets = (totalTickets * whatsappConnections.length) / totalConn;
    const instagramTickets = (totalTickets * instagramConnections.length) / totalConn;
    const facebookTickets = (totalTickets * facebookConnections.length) / totalConn;

    const getStatusColor = (status) => {
      switch (status) {
        case 'CONNECTED': return '#10b981';
        case 'OPENING': return '#f59e0b';
        case 'TIMEOUT': return '#ef4444';
        case 'DISCONNECTED': return '#6b7280';
        default: return '#9ca3af';
      }
    };

    const getStatusLabel = (status) => {
      switch (status) {
        case 'CONNECTED': return 'Conectado';
        case 'OPENING': return 'Conectando';
        case 'TIMEOUT': return 'Timeout';
        case 'DISCONNECTED': return 'Desconectado';
        case 'qrcode': return 'Aguardando QR';
        default: return status || 'Desconhecido';
      }
    };

    return (
      <>
        {/* Cards de Indicadores */}
        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<WhatsAppIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#25D366"
              label="Conexões WhatsApp"
              value={whatsappConnections.length}
              trend={connectedWhatsapp > 0}
              trendValue={`${connectedWhatsapp} online`}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<InstagramIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#E4405F"
              label="Conexões Instagram"
              value={instagramConnections.length}
              trend={connectedInstagram > 0}
              trendValue={`${connectedInstagram} online`}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<FacebookIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#1877F2"
              label="Conexões Facebook"
              value={facebookConnections.length}
              trend={connectedFacebook > 0}
              trendValue={`${connectedFacebook} online`}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<CheckCircleIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#10b981"
              label="Canais Ativos"
              value={connectedWhatsapp + connectedInstagram + connectedFacebook}
              classes={classes}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Gráfico de Distribuição por Canal */}
          <Grid item xs={12} md={6}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Conexões por Canal</Typography>
              <Chart
                options={{
                  labels: ['WhatsApp', 'Instagram', 'Facebook'],
                  colors: ['#25D366', '#E4405F', '#1877F2'],
                  legend: { position: 'bottom' },
                }}
                series={[whatsappConnections.length, instagramConnections.length, facebookConnections.length]}
                type="donut"
                height={280}
              />
            </div>
          </Grid>

          {/* Gráfico de Status */}
          <Grid item xs={12} md={6}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Status das Conexões</Typography>
              <Chart
                options={{
                  labels: ['Conectado', 'Desconectado', 'Outros'],
                  colors: ['#10b981', '#ef4444', '#f59e0b'],
                  legend: { position: 'bottom' },
                }}
                series={[
                  allConnections.filter(c => c.status === 'CONNECTED').length,
                  allConnections.filter(c => c.status === 'DISCONNECTED').length,
                  allConnections.filter(c => !['CONNECTED', 'DISCONNECTED'].includes(c.status)).length,
                ]}
                type="donut"
                height={280}
              />
            </div>
          </Grid>
        </Grid>

        {/* Tabela de Conexões WhatsApp */}
        {whatsappConnections.length > 0 && (
          <div className={classes.tableCard} style={{ marginTop: 24 }}>
            <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
              <WhatsAppIcon style={{ color: '#25D366', marginRight: 8, verticalAlign: 'middle' }} />
              Conexões WhatsApp
            </Typography>
            <Table>
              <TableHead className={classes.tableHeader}>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>Número</TableCell>
                  <TableCell>Fila Padrão</TableCell>
                  <TableCell align="center">Última Atualização</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {whatsappConnections.map((conn) => (
                  <TableRow key={conn.id} className={classes.tableRow}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <WhatsAppIcon style={{ color: '#25D366', marginRight: 8 }} />
                        <Typography style={{ fontWeight: 500 }}>{conn.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        component="span"
                        style={{
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: `${getStatusColor(conn.status)}20`,
                          color: getStatusColor(conn.status),
                        }}
                      >
                        {getStatusLabel(conn.status)}
                      </Box>
                    </TableCell>
                    <TableCell>{conn.number || '-'}</TableCell>
                    <TableCell>{conn.queue?.name || '-'}</TableCell>
                    <TableCell align="center">
                      {conn.updatedAt ? moment(conn.updatedAt).format('DD/MM/YYYY HH:mm') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Tabela de Conexões Instagram */}
        {instagramConnections.length > 0 && (
          <div className={classes.tableCard} style={{ marginTop: 24 }}>
            <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
              <InstagramIcon style={{ color: '#E4405F', marginRight: 8, verticalAlign: 'middle' }} />
              Conexões Instagram
            </Typography>
            <Table>
              <TableHead className={classes.tableHeader}>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Fila Padrão</TableCell>
                  <TableCell align="center">Última Atualização</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {instagramConnections.map((conn) => (
                  <TableRow key={conn.id} className={classes.tableRow}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <InstagramIcon style={{ color: '#E4405F', marginRight: 8 }} />
                        <Typography style={{ fontWeight: 500 }}>{conn.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        component="span"
                        style={{
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: `${getStatusColor(conn.status)}20`,
                          color: getStatusColor(conn.status),
                        }}
                      >
                        {getStatusLabel(conn.status)}
                      </Box>
                    </TableCell>
                    <TableCell>{conn.number || '-'}</TableCell>
                    <TableCell>{conn.queue?.name || '-'}</TableCell>
                    <TableCell align="center">
                      {conn.updatedAt ? moment(conn.updatedAt).format('DD/MM/YYYY HH:mm') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Mensagem se não houver conexões */}
        {allConnections.length === 0 && (
          <div className={classes.chartCard} style={{ textAlign: 'center', padding: 40 }}>
            <PhoneAndroidIcon style={{ fontSize: 64, color: '#9ca3af', marginBottom: 16 }} />
            <Typography style={{ color: '#6b7280', fontSize: 16 }}>
              Nenhuma conexão configurada
            </Typography>
            <Typography style={{ color: '#9ca3af', fontSize: 14 }}>
              Configure suas conexões WhatsApp e Instagram para ver os relatórios
            </Typography>
          </div>
        )}
      </>
    );
  };

  // ==================== ABA 8: PRODUTOS ====================
  const renderProducts = () => {
    const totalProducts = products.length;
    const availableProducts = products.filter(p => (p.status || "disponivel") === "disponivel");
    const unavailableProducts = totalProducts - availableProducts.length;
    const totalValue = products.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
    const avgTicket = totalProducts > 0 ? totalValue / totalProducts : 0;

    const typeAggregation = products.reduce((acc, product) => {
      const key = product.tipo || "Indefinido";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const typeLabels = Object.keys(typeAggregation);
    const topProducts = [...products]
      .sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0))
      .slice(0, 10);

    return (
      <>
        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<ShoppingBasketIcon style={{ color: "#fff", fontSize: 28 }} />}
              iconBg="#f97316"
              label="Total de Produtos"
              value={totalProducts}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<CheckCircleIcon style={{ color: "#fff", fontSize: 28 }} />}
              iconBg="#10b981"
              label="Disponíveis"
              value={availableProducts.length}
              trend
              trendValue={`${totalProducts ? ((availableProducts.length / totalProducts) * 100).toFixed(0) : 0}%`}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<MoneyOffIcon style={{ color: "#fff", fontSize: 28 }} />}
              iconBg="#f87171"
              label="Indisponíveis"
              value={unavailableProducts}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<AttachMoneyIcon style={{ color: "#fff", fontSize: 28 }} />}
              iconBg="#1f9f6a"
              label="Ticket Médio"
              value={formatCurrency(avgTicket)}
              classes={classes}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Distribuição por Tipo</Typography>
              {typeLabels.length > 0 ? (
                <Chart
                  options={{
                    labels: typeLabels,
                    legend: { position: "bottom" },
                  }}
                  series={typeLabels.map(label => typeAggregation[label])}
                  type="donut"
                  height={300}
                />
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography>Sem produtos cadastrados para exibir.</Typography>
                </Box>
              )}
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Produtos em Destaque</Typography>
              <Chart
                options={{
                  chart: { type: "bar", toolbar: { show: false } },
                  plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
                  dataLabels: {
                    enabled: true,
                    formatter: val => formatCurrency(val),
                    offsetX: 10,
                  },
                  xaxis: { categories: topProducts.map(p => p.nome) },
                  colors: ["#f97316"],
                }}
                series={[{ name: "Preço", data: topProducts.map(p => parseFloat(p.valor) || 0) }]}
                type="bar"
                height={320}
              />
            </div>
          </Grid>
        </Grid>

        <div className={classes.tableCard}>
          <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
            Catálogo de Produtos
          </Typography>
          {products.length > 0 ? (
            <Table>
              <TableHead className={classes.tableHeader}>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.slice(0, 20).map(prod => (
                  <TableRow key={prod.id} className={classes.tableRow}>
                    <TableCell>{prod.nome}</TableCell>
                    <TableCell>{prod.tipo || "-"}</TableCell>
                    <TableCell align="right" style={{ fontWeight: 600 }}>
                      {formatCurrency(prod.valor)}
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        component="span"
                        style={{
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background:
                            ((prod.status || "disponivel") === "disponivel" ? "#10b981" : "#f87171") + "20",
                          color: (prod.status || "disponivel") === "disponivel" ? "#10b981" : "#f87171",
                        }}
                      >
                        {(prod.status || "disponivel") === "disponivel" ? "Disponível" : "Indisponível"}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box textAlign="center" py={4}>
              <ShoppingBasketIcon style={{ fontSize: 48, color: "#9ca3af", marginBottom: 8 }} />
              <Typography>Nenhum produto cadastrado.</Typography>
            </Box>
          )}
        </div>
      </>
    );
  };

  // ==================== ABA 9: SERVIÇOS ====================
  const renderServices = () => {
    const totalServices = services.length;
    const servicesWithDiscount = services.filter(s => s.possuiDesconto);
    const avgServiceValue =
      totalServices > 0
        ? services.reduce((acc, s) => acc + (parseFloat(s.valorOriginal) || 0), 0) / totalServices
        : 0;

    const topServices = [...services]
      .map(service => ({
        ...service,
        vendas: service.vendas || service.sales || 0,
      }))
      .sort((a, b) => {
        if (b.vendas === a.vendas) {
          return (parseFloat(b.valorOriginal) || 0) - (parseFloat(a.valorOriginal) || 0);
        }
        return b.vendas - a.vendas;
      })
      .slice(0, 10);

    return (
      <>
        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<BuildIcon style={{ color: "#fff", fontSize: 28 }} />}
              iconBg="#178a4a"
              label="Serviços Ativos"
              value={totalServices}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<AttachMoneyIcon style={{ color: "#fff", fontSize: 28 }} />}
              iconBg="#22c55e"
              label="Com desconto"
              value={servicesWithDiscount.length}
              trend
              trendValue={`${totalServices ? ((servicesWithDiscount.length / totalServices) * 100).toFixed(0) : 0}%`}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<PaymentIcon style={{ color: "#fff", fontSize: 28 }} />}
              iconBg="#1f9f6a"
              label="Ticket Médio"
              value={formatCurrency(avgServiceValue)}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<TrendingUpIcon style={{ color: "#fff", fontSize: 28 }} />}
              iconBg="#f97316"
              label="Top Sellers"
              value={topServices.length}
              classes={classes}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Serviços Mais Vendidos</Typography>
              {topServices.length > 0 ? (
                <Chart
                  options={{
                    chart: { type: "bar", toolbar: { show: false } },
                    plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
                    dataLabels: {
                      enabled: true,
                      formatter: (val, opts) => {
                        const service = topServices[opts.dataPointIndex];
                        return `${service.vendas} vendas`;
                      },
                      offsetX: 10,
                    },
                    xaxis: { categories: topServices.map(s => s.nome) },
                    colors: ["#178a4a"],
                  }}
                  series={[{ name: "Vendas", data: topServices.map(s => s.vendas || 0) }]}
                  type="bar"
                  height={320}
                />
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography>Aguardando serviços com vendas registradas.</Typography>
                </Box>
              )}
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Receita Estimada</Typography>
              <Chart
                options={{
                  chart: { type: "area", toolbar: { show: false } },
                  stroke: { curve: "smooth", width: 3 },
                  fill: {
                    type: "gradient",
                    gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 },
                  },
                  xaxis: { categories: topServices.map(s => s.nome) },
                  yaxis: { labels: { formatter: val => formatCurrency(val) } },
                  colors: ["#178a4a"],
                  dataLabels: { enabled: false },
                  tooltip: { y: { formatter: val => formatCurrency(val) } },
                }}
                series={[{ name: "Valor Original", data: topServices.map(s => parseFloat(s.valorOriginal) || 0) }]}
                type="area"
                height={320}
              />
            </div>
          </Grid>
        </Grid>

        <div className={classes.tableCard}>
          <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
            Serviços monitorados
          </Typography>
          {services.length > 0 ? (
            <Table>
              <TableHead className={classes.tableHeader}>
                <TableRow>
                  <TableCell>Serviço</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell align="center">Vendas</TableCell>
                  <TableCell align="center">Desconto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topServices.map(service => (
                  <TableRow key={service.id} className={classes.tableRow}>
                    <TableCell>{service.nome}</TableCell>
                    <TableCell style={{ maxWidth: 260 }}>
                      <Typography variant="body2" color="textSecondary">
                        {service.descricao || "Sem descrição"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" style={{ fontWeight: 600 }}>
                      {formatCurrency(service.valorOriginal)}
                    </TableCell>
                    <TableCell align="center" style={{ fontWeight: 600 }}>
                      {service.vendas || 0}
                    </TableCell>
                    <TableCell align="center">
                      {service.possuiDesconto ? (
                        <Box
                          component="span"
                          style={{
                            padding: "4px 8px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            background: "#f472b620",
                            color: "#be185d",
                          }}
                        >
                          {formatCurrency(service.valorComDesconto || service.valorOriginal)}
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box textAlign="center" py={4}>
              <BuildIcon style={{ fontSize: 48, color: "#9ca3af", marginBottom: 8 }} />
              <Typography>Nenhum serviço cadastrado.</Typography>
            </Box>
          )}
        </div>
      </>
    );
  };

  // ==================== ABA 10: FATURAS ====================
  const renderInvoices = () => {
    // Garantir que invoices seja um array
    const invoicesList = Array.isArray(invoices) ? invoices : [];

    // Filtrar faturas do período selecionado (usando dataVencimento)
    const filteredInvoices = invoicesList.filter(inv => {
      const invDate = moment(inv.dataVencimento || inv.createdAt);
      return invDate.isBetween(dateFrom, dateTo, 'day', '[]');
    });

    // Métricas (usando campos corretos: status = 'pago', 'pendente', 'cancelado', 'atrasado')
    const totalInvoices = filteredInvoices.length;
    const paidInvoices = filteredInvoices.filter(inv => inv.status === 'pago');
    const pendingInvoices = filteredInvoices.filter(inv => inv.status === 'pendente' || !inv.status);
    const overdueInvoices = filteredInvoices.filter(inv => {
      const isOverdue = moment(inv.dataVencimento).isBefore(moment(), 'day');
      return (inv.status === 'pendente' || !inv.status) && isOverdue;
    });
    const cancelledInvoices = filteredInvoices.filter(inv => inv.status === 'cancelado');

    // Valores (usando campo 'valor')
    const totalValue = filteredInvoices.reduce((acc, inv) => acc + (parseFloat(inv.valor) || 0), 0);
    const paidValue = paidInvoices.reduce((acc, inv) => acc + (parseFloat(inv.valor) || 0), 0);
    const pendingValue = pendingInvoices.reduce((acc, inv) => acc + (parseFloat(inv.valor) || 0), 0);
    const overdueValue = overdueInvoices.reduce((acc, inv) => acc + (parseFloat(inv.valor) || 0), 0);

    // Taxa de pagamento
    const paymentRate = totalInvoices > 0 ? ((paidInvoices.length / totalInvoices) * 100).toFixed(1) : 0;

    // Dados para gráfico por mês (últimos 6 meses)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = moment().subtract(i, 'months').startOf('month');
      const monthEnd = moment().subtract(i, 'months').endOf('month');
      const monthInvoices = invoicesList.filter(inv => {
        const invDate = moment(inv.dataVencimento || inv.createdAt);
        return invDate.isBetween(monthStart, monthEnd, 'day', '[]');
      });

      monthlyData.push({
        month: monthStart.format('MMM/YY'),
        total: monthInvoices.length,
        paid: monthInvoices.filter(inv => inv.status === 'pago').length,
        pending: monthInvoices.filter(inv => inv.status === 'pendente' || !inv.status).length,
        value: monthInvoices.reduce((acc, inv) => acc + (parseFloat(inv.valor) || 0), 0),
        paidValue: monthInvoices.filter(inv => inv.status === 'pago').reduce((acc, inv) => acc + (parseFloat(inv.valor) || 0), 0),
      });
    }

    const getStatusColor = (status, dueDate) => {
      const isOverdue = moment(dueDate).isBefore(moment(), 'day');
      if (status === 'pago') return '#10b981';
      if ((status === 'pendente' || !status) && isOverdue) return '#ef4444';
      if (status === 'pendente' || !status) return '#f59e0b';
      if (status === 'cancelado') return '#6b7280';
      return '#9ca3af';
    };

    const getStatusLabel = (status, dueDate) => {
      const isOverdue = moment(dueDate).isBefore(moment(), 'day');
      if (status === 'pago') return 'Paga';
      if ((status === 'pendente' || !status) && isOverdue) return 'Atrasada';
      if (status === 'pendente' || !status) return 'Pendente';
      if (status === 'cancelado') return 'Cancelada';
      return status || 'Pendente';
    };

    const formatCurrency = (value) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    return (
      <>
        {/* Cards de Indicadores */}
        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<ReceiptIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#178a4a"
              label="Total de Faturas"
              value={totalInvoices}
              trend={true}
              trendValue={formatCurrency(totalValue)}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<CheckCircleIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#10b981"
              label="Faturas Pagas"
              value={paidInvoices.length}
              trend={true}
              trendValue={formatCurrency(paidValue)}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<ScheduleIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#f59e0b"
              label="Faturas Pendentes"
              value={pendingInvoices.length}
              trend={pendingInvoices.length === 0}
              trendValue={formatCurrency(pendingValue)}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<MoneyOffIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#ef4444"
              label="Faturas Atrasadas"
              value={overdueInvoices.length}
              trend={overdueInvoices.length === 0}
              trendValue={formatCurrency(overdueValue)}
              classes={classes}
            />
          </Grid>
        </Grid>

        {/* Segunda linha de indicadores */}
        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<AttachMoneyIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#1e9b54"
              label="Valor Total Recebido"
              value={formatCurrency(paidValue)}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<PaymentIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#178a4a"
              label="Taxa de Pagamento"
              value={`${paymentRate}%`}
              trend={parseFloat(paymentRate) >= 80}
              trendValue={parseFloat(paymentRate) >= 80 ? 'Excelente' : parseFloat(paymentRate) >= 50 ? 'Regular' : 'Baixa'}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<TrendingUpIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#10b981"
              label="Ticket Médio"
              value={formatCurrency(totalInvoices > 0 ? totalValue / totalInvoices : 0)}
              classes={classes}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IndicatorCard
              icon={<AssignmentIcon style={{ color: '#fff', fontSize: 28 }} />}
              iconBg="#6b7280"
              label="Canceladas"
              value={cancelledInvoices.length}
              classes={classes}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Gráfico de Faturas por Mês */}
          <Grid item xs={12} md={8}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Faturas por Mês (Últimos 6 meses)</Typography>
              <Chart
                options={{
                  chart: { type: 'bar', toolbar: { show: false }, stacked: true },
                  colors: ['#10b981', '#f59e0b'],
                  plotOptions: { bar: { borderRadius: 6, columnWidth: '60%' } },
                  xaxis: {
                    categories: monthlyData.map(d => d.month),
                    labels: { style: { colors: '#9ca3af' } }
                  },
                  yaxis: { labels: { style: { colors: '#9ca3af' } } },
                  grid: { borderColor: '#f1f5f9' },
                  legend: { position: 'top' },
                  dataLabels: { enabled: false },
                }}
                series={[
                  { name: 'Pagas', data: monthlyData.map(d => d.paid) },
                  { name: 'Pendentes', data: monthlyData.map(d => d.pending) },
                ]}
                type="bar"
                height={320}
              />
            </div>
          </Grid>

          {/* Gráfico de Status */}
          <Grid item xs={12} md={4}>
            <div className={classes.chartCard}>
              <Typography className={classes.chartTitle}>Status das Faturas</Typography>
              <Chart
                options={{
                  labels: ['Pagas', 'Pendentes', 'Atrasadas', 'Canceladas'],
                  colors: ['#10b981', '#f59e0b', '#ef4444', '#6b7280'],
                  legend: { position: 'bottom' },
                }}
                series={[
                  paidInvoices.length,
                  pendingInvoices.length - overdueInvoices.length,
                  overdueInvoices.length,
                  cancelledInvoices.length,
                ]}
                type="donut"
                height={320}
              />
            </div>
          </Grid>
        </Grid>

        {/* Gráfico de Receita por Mês */}
        <div className={classes.chartCard} style={{ marginTop: 24 }}>
          <Typography className={classes.chartTitle}>Receita por Mês (Últimos 6 meses)</Typography>
          <Chart
            options={{
              chart: { type: 'area', toolbar: { show: false } },
              colors: ['#178a4a', '#10b981'],
              stroke: { curve: 'smooth', width: 3 },
              fill: {
                type: 'gradient',
                gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 }
              },
              xaxis: {
                categories: monthlyData.map(d => d.month),
                labels: { style: { colors: '#9ca3af' } }
              },
              yaxis: {
                labels: {
                  style: { colors: '#9ca3af' },
                  formatter: (val) => formatCurrency(val)
                }
              },
              grid: { borderColor: '#f1f5f9' },
              legend: { position: 'top' },
              dataLabels: { enabled: false },
              tooltip: {
                y: { formatter: (val) => formatCurrency(val) }
              }
            }}
            series={[
              { name: 'Valor Total', data: monthlyData.map(d => d.value) },
              { name: 'Valor Recebido', data: monthlyData.map(d => d.paidValue) },
            ]}
            type="area"
            height={280}
          />
        </div>

        {/* Tabela de Faturas Recentes */}
        <div className={classes.tableCard} style={{ marginTop: 24 }}>
          <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
            Faturas do Período
          </Typography>
          {filteredInvoices.length > 0 ? (
            <Table>
              <TableHead className={classes.tableHeader}>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell align="center">Vencimento</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Data Pagamento</TableCell>
                  <TableCell align="center">Recorrente</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvoices
                  .sort((a, b) => moment(b.dataVencimento).diff(moment(a.dataVencimento)))
                  .slice(0, 20)
                  .map((invoice) => (
                    <TableRow key={invoice.id} className={classes.tableRow}>
                      <TableCell>
                        <Typography style={{ fontWeight: 500 }}>#{invoice.id}</Typography>
                      </TableCell>
                      <TableCell>{invoice.descricao || '-'}</TableCell>
                      <TableCell align="right" style={{ fontWeight: 600 }}>
                        {formatCurrency(invoice.valor)}
                      </TableCell>
                      <TableCell align="center">
                        {invoice.dataVencimento ? moment(invoice.dataVencimento).format('DD/MM/YYYY') : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          component="span"
                          style={{
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: `${getStatusColor(invoice.status, invoice.dataVencimento)}20`,
                            color: getStatusColor(invoice.status, invoice.dataVencimento),
                          }}
                        >
                          {getStatusLabel(invoice.status, invoice.dataVencimento)}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {invoice.dataPagamento
                          ? moment(invoice.dataPagamento).format('DD/MM/YYYY')
                          : '-'}
                      </TableCell>
                      <TableCell align="center">
                        {invoice.recorrente ? (
                          <Box
                            component="span"
                            style={{
                              padding: '4px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              background: '#178a4a20',
                              color: '#178a4a',
                            }}
                          >
                            {invoice.intervalo || 'Sim'}
                          </Box>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <Box textAlign="center" py={4}>
              <ReceiptIcon style={{ fontSize: 64, color: '#9ca3af', marginBottom: 16 }} />
              <Typography style={{ color: '#6b7280' }}>
                Nenhuma fatura encontrada no período selecionado
              </Typography>
            </Box>
          )}
        </div>
      </>
    );
  };

  // Renderizar conteúdo da aba ativa
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className={classes.loadingContainer}>
          <CircularProgress style={{ color: "#178a4a" }} />
        </div>
      );
    }

    switch (activeTab) {
      case 0: return renderOverview();
      case 1: return renderAttendants();
      case 2: return renderTickets();
      case 3: return renderTags();
      case 4: return renderKanban();
      case 5: return renderRatings();
      case 6: return renderChannels();
      case 7: return renderProducts();
      case 8: return renderServices();
      case 9: return renderInvoices();
      case 10: return <ProductivityReport dateFrom={dateFrom} dateTo={dateTo} />;
      default: return renderOverview();
    }
  };

  return (
    <div className={classes.container}>
      {/* Header */}
      <div className={classes.pageHeader}>
        <Grid container justifyContent="space-between" alignItems="flex-start">
          <Grid item>
            <Typography className={classes.pageTitle}>Relatorios</Typography>
            <Typography className={classes.pageSubtitle}>
              Analise detalhada e executiva da operacao
            </Typography>
          </Grid>
          <Grid item>
            <div className={classes.breadcrumb}>
              Inicio <span>{">"}</span> <span>Relatorios</span>
            </div>
          </Grid>
        </Grid>
      </div>

      {/* Tabs */}
      <div className={classes.tabsContainer}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          TabIndicatorProps={{ className: classes.tabIndicator }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="Visão Geral" className={classes.tab} />
          <Tab label="Atendentes" className={classes.tab} />
          <Tab label="Tickets" className={classes.tab} />
          <Tab label="Tags" className={classes.tab} />
          <Tab label="Kanban" className={classes.tab} />
          <Tab label="Avaliações" className={classes.tab} />
          <Tab label="Canais" className={classes.tab} />
          <Tab label="Produtos" className={classes.tab} />
          <Tab label="Serviços" className={classes.tab} />
          <Tab label="Faturas" className={classes.tab} />
          <Tab label="Produtividade" className={classes.tab} />
        </Tabs>
      </div>

      {/* Filtros */}
      <div className={classes.filtersContainer}>
        <TextField
          label="Data Inicial"
          type="date"
          size="small"
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <TextField
          label="Data Final"
          type="date"
          size="small"
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          style={{ minWidth: 160 }}
        />
        {activeTab === 4 && (
          <FormControl variant="outlined" size="small" style={{ minWidth: 220 }}>
            <InputLabel id="pipeline-report-select-label">Funil</InputLabel>
            <Select
              labelId="pipeline-report-select-label"
              value={selectedPipelineId}
              onChange={(e) => setSelectedPipelineId(String(e.target.value))}
              label="Funil"
            >
              {pipelines.map((pipeline) => (
                <MenuItem key={pipeline.id} value={String(pipeline.id)}>
                  {pipeline.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {activeTab === 4 && (
          <FormControl variant="outlined" size="small" style={{ minWidth: 220 }}>
            <InputLabel id="kanban-user-report-select-label">Agente</InputLabel>
            <Select
              labelId="kanban-user-report-select-label"
              value={selectedKanbanUserId}
              onChange={(e) => setSelectedKanbanUserId(String(e.target.value))}
              label="Agente"
            >
              <MenuItem value="all">Todos os agentes</MenuItem>
              {attendants.map((attendant) => (
                <MenuItem key={attendant.id} value={String(attendant.id)}>
                  {attendant.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Tooltip title="Sincronizar dados">
          <IconButton onClick={loadData} className={`${classes.filterActionButton} ${classes.refreshButton}`}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Exportar PDF">
          <IconButton onClick={handleExportPDF} className={`${classes.filterActionButton} ${classes.exportButton}`}>
            <GetAppIcon />
          </IconButton>
        </Tooltip>
      </div>

      {/* Conteúdo da Aba */}
      <div id="report-content">
        {renderTabContent()}
      </div>

      {/* Modal de Contatos por Tag */}
      {contactModalOpen && (
        <ContactTagListModal
          open={contactModalOpen}
          onClose={handleCloseContactModal}
          tag={selectedTag}
        />
      )}
    </div>
  );
};

export default Reports;


