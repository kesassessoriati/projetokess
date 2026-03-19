// @ts-nocheck
import { Sequelize } from "sequelize-typescript";
import User from "../models/User";
import Setting from "../models/Setting";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import ContactCustomField from "../models/ContactCustomField";
import Message from "../models/Message";
import Queue from "../models/Queue";
import WhatsappQueue from "../models/WhatsappQueue";
import UserQueue from "../models/UserQueue";
import Company from "../models/Company";
import Plan from "../models/Plan";
import TicketNote from "../models/TicketNote";
import QuickMessage from "../models/QuickMessage";
import QuickReply from "../models/QuickReply";
import QuickReplyGroup from "../models/QuickReplyGroup";
import Help from "../models/Help";
import TicketTraking from "../models/TicketTraking";
import UserRating from "../models/UserRating";
import Schedule from "../models/Schedule";
import Tag from "../models/Tag";
import Negocio from "../models/Negocio";
import Produto from "../models/Produto";
import Ferramenta from "../models/Ferramenta";
import TicketTag from "../models/TicketTag";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";
import Campaign from "../models/Campaign";
import CampaignSetting from "../models/CampaignSetting";
import Baileys from "../models/Baileys";
import CampaignShipping from "../models/CampaignShipping";
import Announcement from "../models/Announcement";
import Chat from "../models/Chat";
import ChatUser from "../models/ChatUser";
import ChatMessage from "../models/ChatMessage";
import Chatbot from "../models/Chatbot";
import DialogChatBots from "../models/DialogChatBots";
import QueueIntegrations from "../models/QueueIntegrations";
import Invoices from "../models/Invoices";
import Fatura from "../models/Fatura";
import Subscriptions from "../models/Subscriptions";
import ApiUsages from "../models/ApiUsages";
import Files from "../models/Files";
import FilesOptions from "../models/FilesOptions";
import ContactTag from "../models/ContactTag";
import CompaniesSettings from "../models/CompaniesSettings";
import LogTicket from "../models/LogTicket";
import Prompt from "../models/Prompt";
import PromptToolSetting from "../models/PromptToolSetting";
import Partner from "../models/Partner";
import ContactWallet from "../models/ContactWallet";
import ScheduledMessages from "../models/ScheduledMessages";
import ScheduledMessagesEnvio from "../models/ScheduledMessagesEnvio";
import Versions from "../models/Versions";
import GoogleCalendarIntegration from "../models/GoogleCalendarIntegration";
import { FlowDefaultModel } from "../models/FlowDefault";
import { FlowBuilderModel } from "../models/FlowBuilder";
import { FlowAudioModel } from "../models/FlowAudio";
import { FlowCampaignModel } from "../models/FlowCampaign";
import FlowExecution from "../models/FlowExecution";
import { FlowImgModel } from "../models/FlowImg";
import { WebhookModel } from "../models/Webhook";
import MobileWebhook from "../models/MobileWebhook";
import TutorialVideo from "../models/TutorialVideo";
import SliderHome from "../models/SliderHome";
import Profissional from "../models/Profissional";
import Servico from "../models/Servico";
import MediaFolder from "../models/MediaFolder";
import MediaFile from "../models/MediaFile";
import Automation from "../models/Automation";
import AutomationAction from "../models/AutomationAction";
import AutomationLog from "../models/AutomationLog";
import AutomationExecution from "../models/AutomationExecution";
import CrmLead from "../models/CrmLead";
import LeadTag from "../models/LeadTag";
import CrmClient from "../models/CrmClient";
import FinanceiroFatura from "../models/FinanceiroFatura";
import FinanceiroPagamento from "../models/FinanceiroPagamento";
import CompanyPaymentSetting from "../models/CompanyPaymentSetting";
import CompanyIntegrationSetting from "../models/CompanyIntegrationSetting";
import CompanyIntegrationFieldMap from "../models/CompanyIntegrationFieldMap";
import CompanyApiKey from "../models/CompanyApiKey";
import CrmClientContact from "../models/CrmClientContact";
import ScheduledDispatcher from "../models/ScheduledDispatcher";
import ScheduledDispatchLog from "../models/ScheduledDispatchLog";
import Project from "../models/Project";
import ProjectService from "../models/ProjectService";
import ProjectProduct from "../models/ProjectProduct";
import ProjectUser from "../models/ProjectUser";
import ProjectTask from "../models/ProjectTask";
import ProjectTaskUser from "../models/ProjectTaskUser";
import UserSchedule from "../models/UserSchedule";
import UserScheduleUser from "../models/UserScheduleUser";
import Appointment from "../models/Appointment";
import UserService from "../models/UserService";
import UserGoogleCalendarIntegration from "../models/UserGoogleCalendarIntegration";
import FollowUp from "../models/FollowUp";
import CallRecord from "../models/CallRecord";
import GoogleSheetsToken from "../models/GoogleSheetsToken";
import UserDevice from "../models/UserDevice";
import ExternalApp from "../models/ExternalApp";
import IaWorkflow from "../models/IaWorkflow";
import FrontendError from "../models/FrontendError";
import BackendError from "../models/BackendError";
import SystemMetric from "../models/SystemMetric";
import BackendMetric from "../models/BackendMetric";
import SlowQuery from "../models/SlowQuery";
import SystemProcessMetric from "../models/SystemProcessMetric";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import Opportunity from "../models/Opportunity";
import OpportunityMovement from "../models/OpportunityMovement";
import OpportunityEvent from "../models/OpportunityEvent";
import PipelineAutomation from "../models/PipelineAutomation";
import PipelineAutomationLog from "../models/PipelineAutomationLog";
import SystemWebhook from "../models/SystemWebhook";
import WebhookDeliveryLog from "../models/WebhookDeliveryLog";
import OpportunityPrediction from "../models/OpportunityPrediction";
import AISuggestionFeedback from "../models/AISuggestionFeedback";
import PipelineTemplate from "../models/PipelineTemplate";
import LeadMessage from "../models/LeadMessage";
import LeadAttachment from "../models/LeadAttachment";
import TimerTask from "../models/TimerTask";
import TimerSession from "../models/TimerSession";
import KanbanAutomation from "../models/KanbanAutomation";
import KanbanAutomationRun from "../models/KanbanAutomationRun";
import KanbanAutomationRunAction from "../models/KanbanAutomationRunAction";
import KanbanAutomationTimer from "../models/KanbanAutomationTimer";
import SmtpSetting from "../models/SmtpSetting";
import WhatsappWarmup from "../models/WhatsappWarmup";
import WhatsappWarmupLog from "../models/WhatsappWarmupLog";
import WhatsappWarmupSession from "../models/WhatsappWarmupSession";
import WhatsappWarmupSessionLog from "../models/WhatsappWarmupSessionLog";
import FollowUpCampaign from "../models/FollowUpCampaign";
import FollowUpStage from "../models/FollowUpStage";
import FollowUpLog from "../models/FollowUpLog";
import FollowUpBoard from "../models/FollowUpBoard";
import TaskBoard from "../models/TaskBoard";
import TaskList from "../models/TaskList";
import Task from "../models/Task";
import TaskChecklist from "../models/TaskChecklist";
import TaskComment from "../models/TaskComment";
import GroupDirectory from "../models/GroupDirectory";
import GroupMember from "../models/GroupMember";
import GroupTemplate from "../models/GroupTemplate";
import GroupCampaign from "../models/GroupCampaign";
import GroupCampaignTarget from "../models/GroupCampaignTarget";
import GroupCampaignLog from "../models/GroupCampaignLog";
import ButtonCampaign from "../models/ButtonCampaign";
import ButtonCampaignShipping from "../models/ButtonCampaignShipping";
import SocialBoard from "../models/SocialBoard";
import SocialStage from "../models/SocialStage";
import SocialContent from "../models/SocialContent";
import MySiteBoardColumn from "../models/MySiteBoardColumn";
import MySiteBoardCard from "../models/MySiteBoardCard";
import MySiteBoardChecklistItem from "../models/MySiteBoardChecklistItem";
import MySiteBoardComment from "../models/MySiteBoardComment";
import MySiteBoardAttachment from "../models/MySiteBoardAttachment";
import GfProfile from "../models/GfProfile";
import GfCategoria from "../models/GfCategoria";
import GfReceita from "../models/GfReceita";
import GfDespesa from "../models/GfDespesa";
import GfTransacao from "../models/GfTransacao";
import GfDivida from "../models/GfDivida";
import GfCategoriaMeta from "../models/GfCategoriaMeta";
import GfMeta from "../models/GfMeta";
import GfCategoriaMercado from "../models/GfCategoriaMercado";
import GfItemMercado from "../models/GfItemMercado";
import GfOrcamentoMercado from "../models/GfOrcamentoMercado";
import GfVeiculo from "../models/GfVeiculo";
import GfTipoManutencao from "../models/GfTipoManutencao";
import GfManutencao from "../models/GfManutencao";
import GfIaConfiguracao from "../models/GfIaConfiguracao";
import GfIaUpload from "../models/GfIaUpload";
import GfIaAnalysisResult from "../models/GfIaAnalysisResult";
import Chip from "../models/Chip";
import ChipActivityLog from "../models/ChipActivityLog";
import AIUsageLog from "../models/AIUsageLog";
import { applyTenantIsolation } from "./tenantIsolation";
// eslint-disable-next-line
const dbConfig = require("../config/database");

const sequelize = new Sequelize({
  ...dbConfig,
  benchmark: true,
  logging: (sql: string, duration?: number | any) => {
    // Se a duração for maior que 500ms, registra como SlowQuery
    if (typeof duration === "number" && duration > 500) {
      const context = (require("../libs/logContext").logContextStorage).getStore();

      let severity = "LOW";
      if (duration > 2000) severity = "CRITICAL";
      else if (duration > 1000) severity = "HIGH";

      // Fire and forget persistence
      SlowQuery.create({
        query: sql,
        duration: duration,
        severity,
        companyId: context?.companyId,
        route: context?.path // Nota: precisamos garantir que o path esteja no context
      }).catch(e => {
        // Evitar loop infinito se o erro for no próprio SlowQuery
        if (!sql.includes("SlowQueries")) {
          console.error("Erro ao registrar SlowQuery:", e);
        }
      });
    }
  }
});

const models = [
  Company,
  User,
  Contact,
  ContactTag,
  Ticket,
  Message,
  Whatsapp,
  ContactCustomField,
  Setting,
  Queue,
  WhatsappQueue,
  UserQueue,
  Plan,
  TicketNote,
  QuickMessage,
  QuickReply,
  QuickReplyGroup,
  Help,
  TicketTraking,
  UserRating,
  Schedule,
  Tag,
  Negocio,
  Produto,
  Ferramenta,
  TicketTag,
  ContactList,
  ContactListItem,
  Campaign,
  CampaignSetting,
  Baileys,
  CampaignShipping,
  Announcement,
  Chat,
  ChatUser,
  ChatMessage,
  Chatbot,
  DialogChatBots,
  QueueIntegrations,
  Invoices,
  Fatura,
  Subscriptions,
  ApiUsages,
  Files,
  FilesOptions,
  CompaniesSettings,
  LogTicket,
  Prompt,
  PromptToolSetting,
  AIUsageLog,
  Partner,
  ContactWallet,
  ScheduledMessages,
  ScheduledMessagesEnvio,
  Versions,
  FlowDefaultModel,
  FlowBuilderModel,
  FlowAudioModel,
  FlowCampaignModel,
  FlowImgModel,
  FlowExecution,
  WebhookModel,
  MobileWebhook,
  GoogleCalendarIntegration,
  TutorialVideo,
  SliderHome,
  Profissional,
  Servico,
  MediaFolder,
  MediaFile,
  Automation,
  AutomationAction,
  AutomationLog,
  AutomationExecution,
  CrmLead,
  LeadTag,
  CrmClient,
  FinanceiroFatura,
  FinanceiroPagamento,
  CrmClientContact,
  CompanyPaymentSetting,
  CompanyIntegrationSetting,
  CompanyIntegrationFieldMap,
  CompanyApiKey,
  ScheduledDispatcher,
  ScheduledDispatchLog,
  Project,
  ProjectService,
  ProjectProduct,
  ProjectUser,
  ProjectTask,
  ProjectTaskUser,
  UserSchedule,
  UserScheduleUser,
  Appointment,
  UserService,
  UserGoogleCalendarIntegration,
  FollowUp,
  GoogleSheetsToken,
  UserDevice,
  CallRecord,
  ExternalApp,
  IaWorkflow,
  FrontendError,
  BackendError,
  SystemMetric,
  BackendMetric,
  SlowQuery,
  SystemProcessMetric,
  PipelineTemplate,
  Pipeline,
  PipelineStage,
  Opportunity,
  OpportunityMovement,
  OpportunityEvent,
  PipelineAutomation,
  PipelineAutomationLog,
  SystemWebhook,
  WebhookDeliveryLog,
  OpportunityPrediction,
  AISuggestionFeedback,
  LeadMessage,
  LeadAttachment,
  SmtpSetting,
  TimerTask,
  TimerSession,
  KanbanAutomation,
  KanbanAutomationRun,
  KanbanAutomationRunAction,
  KanbanAutomationTimer,
  WhatsappWarmup,
  WhatsappWarmupLog,
  WhatsappWarmupSession,
  WhatsappWarmupSessionLog,
  FollowUpCampaign,
  FollowUpStage,
  FollowUpLog,
  FollowUpBoard,
  TaskBoard,
  TaskList,
  Task,
  TaskChecklist,
  TaskComment,
  GroupDirectory,
  GroupMember,
  GroupTemplate,
  GroupCampaign,
  GroupCampaignTarget,
  GroupCampaignLog,
  SocialBoard,
  SocialStage,
  SocialContent,
  MySiteBoardColumn,
  MySiteBoardCard,
  MySiteBoardChecklistItem,
  MySiteBoardComment,
  MySiteBoardAttachment,
  ButtonCampaign,
  ButtonCampaignShipping,
  GfProfile,
  GfCategoria,
  GfReceita,
  GfDespesa,
  GfTransacao,
  GfDivida,
  GfCategoriaMeta,
  GfMeta,
  GfCategoriaMercado,
  GfItemMercado,
  GfOrcamentoMercado,
  GfVeiculo,
  GfTipoManutencao,
  GfManutencao,
  GfIaConfiguracao,
  GfIaUpload,
  GfIaAnalysisResult,
  Chip,
  ChipActivityLog
];

sequelize.addModels(models);
applyTenantIsolation(sequelize);

// Hack p/ corrigir problema crônico de migration não rodada em prod:
sequelize.query('ALTER TABLE "Opportunities" ALTER COLUMN "contactId" DROP NOT NULL;').catch(e => console.log("Hack contactId executado (ou ignorado se já estava ok)."));

export default sequelize;
