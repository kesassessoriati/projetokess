import React, { useEffect, useState } from "react";
import { BrowserRouter, Switch, Redirect } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import LoggedInLayout from "../layout";
import Dashboard from "../pages/Painel";
import TicketResponsiveContainer from "../pages/TicketResponsiveContainer";
import Cadastro from "../pages/Cadastro";
import Login from "../pages/Login";
import MobileLogin from "../pages/MobileLogin";
import Canais from "../pages/Canais";
import SettingsCustom from "../pages/SettingsCustom";
import Financeiro from "../pages/Financeiro";
import Users from "../pages/Users";
import Contatos from "../pages/Contatos";
import ContactImportPage from "../pages/Contatos/import";
import ChatMoments from "../pages/Moments"
import Departamentos from "../pages/Departamentos";
import Etiquetas from "../pages/Etiquetas";
import DocumentacaoPage from "../pages/Documentacao";
import ApiClientesPage from "../pages/api-clientes";
import ApiMensagensPage from "../pages/api-mensagens";
import ApiContatosPage from "../pages/api-contatos";
import ApiTagsPage from "../pages/api-tags";
import ApiProdutosPage from "../pages/api-produtos";
import ApiServicosPage from "../pages/api-servicos";
import ApiUsuariosPage from "../pages/api-usuarios";
import ApiFilasPage from "../pages/api-filas";
import ApiNegociosPage from "../pages/api-negocios";
import ApiTagsKanbanPage from "../pages/api-tags-kanban";
import ApiProjetosPage from "../pages/api-projetos";
import ApiTarefasPage from "../pages/api-tarefas";
import ApiTicketsPage from "../pages/api-tickets";
import ApiConexoesPage from "../pages/api-conexoes";
import ApiFaturasPage from "../pages/api-faturas";
import ApiCrmLeadsPage from "../pages/api-crm-leads";
import ApiPipelinePage from "../pages/api-pipeline";
import PublicApiDocs from "../pages/PublicApiDocs";
import Helps from "../pages/Helps";
import ContactLists from "../pages/ContactLists";
import ContactListItems from "../pages/ContactListItems";
import Companies from "../pages/Companies";
import QuickMessages from "../pages/QuickMessages";
import { AuthProvider } from "../context/Auth/AuthContext";
import { PlanPermissionsProvider } from "../context/PlanPermissionsContext";
import { SocketProvider } from "../context/SocketContext";
import { TicketsContextProvider } from "../context/Tickets/TicketsContext";
import { WhatsAppsProvider } from "../context/WhatsApp/WhatsAppsContext";
import Route from "./Route";
import Schedules from "../pages/Lembretes";
import Campanhas from "../pages/Campanhas";
import CampaignsConfig from "../pages/CampaignsConfig";
import CampaignReport from "../pages/CampaignReport";
import Annoucements from "../pages/Annoucements";
import Faturas from "../pages/Faturas";
import GestorFinancasIA from "../pages/GestorFinancasIA";
import Chat from "../pages/Chat";
import Agentes from "../pages/Agentes";
import ForgetPassword from "../pages/ForgetPassWord/";
import AllConnections from "../pages/AllConnections";
import Reports from "../pages/Relatorios";
import { FlowBuilderConfig } from "../pages/FlowBuilderConfig";
import FlowBuilder from "../pages/FlowBuilder";
import KanbanAutomationsConfig from "../pages/KanbanAutomationsConfig";
import KanbanAutomations from "../pages/KanbanAutomations";
import FlowDefault from "../pages/FlowDefault"
import CampaignsPhrase from "../pages/CampaignsPhrase";
import Subscription from "../pages/Subscription";
import QueueIntegration from "../pages/Integracao";
import Files from "../pages/Files";
import Produtos from "../pages/Produtos";
import Kanban from "../pages/Kanban";
import PipelineConfig from "../pages/PipelineConfig";
import CRMWebhooks from "../pages/CRMWebhooks";
import TagsKanban from "../pages/TagsKanban";
import empresa from "../pages/Empresa";
import IaWorkflows from "../pages/IaWorkflows";
import IaWorkflowEditor from "../pages/IaWorkflowEditor";
import TutorialVideos from "../pages/TutorialVideos";
import SliderBannersPage from "../pages/SliderBanners";
import ServicosPage from "../pages/Servicos";
import ProfissionaisPage from "../pages/Profissionais";
import Automations from "../pages/Automations";
import Sistema from "../pages/Sistema";
import PaymentSettings from "../pages/PaymentSettings";
import IntegrationSettings from "../pages/IntegrationSettings";
import FerramentasPage from "../pages/Ferramentas";
import ContactSettings from "../pages/ContactSettings";
import ContactAnalytics from "../pages/ContactAnalytics";
import Leads from "../pages/Leads";
import Clients from "../pages/Clientes";
import ClientDetails from "../pages/ClientDetails";
import Projects from "../pages/Projects";
import ProjectDetails from "../pages/ProjectDetails";
import UserSchedules from "../pages/UserSchedules";
import Agenda from "../pages/Agenda";
import CallHistory from "../pages/CallHistory";
import PipelineBoard from "../pages/PipelineBoard";
import ExecutiveDashboard from "../pages/ExecutiveDashboard";
import Smtp from "../pages/Smtp";
import GroupManagement from "../pages/GroupManagement";
import FollowUps from "../pages/FollowUps";
import AquecimentoWhatsApp from "../pages/AquecimentoWhatsApp";
import DisparoBotoes from "../pages/DisparoBotoes";

// [DEPRECATED] Funil Legado - migrado para Board Inteligente
// import Funil from "../pages/Funil";
import FeatureDetailPage from "../pages/landingpage/FeatureDetailPage";
import TermsOfService from "../pages/landingpage/TermsOfService";
import UsagePolicy from "../pages/landingpage/UsagePolicy";
import PrivacyPolicy from "../pages/landingpage/PrivacyPolicy";
import PublicCheckout from "../pages/PublicCheckout";
import Atendimentos from "../pages/Atendimentos";
import AtendimentosMobile from "../pages/atendimentomobile";
import Tasks from "../pages/Tasks";
import RedesSociais from "../pages/RedesSociais";
import MeusSites from "../pages/MeusSites";
import { QueueSelectedProvider } from "../context/QueuesSelected/QueuesSelectedContext";
import NotificationToast from "../components/NotificationToast";
import EmbeddedLink from "../pages/EmbeddedLink";
import ExternalAppConfig from "../pages/ExternalAppConfig";
import FrontendErrors from "../pages/FrontendErrors";
import BackendErrors from "../pages/BackendErrors";
import SystemMetrics from "../pages/SystemMetrics";
import Performance from "../pages/Performance";
import { embeddedLinks } from "../config/embedded_links";

const Routes = () => {
  const [showCampaigns, setShowCampaigns] = useState(false);

  useEffect(() => {
    const cshow = localStorage.getItem("cshow");
    if (cshow !== undefined) {
      setShowCampaigns(true);
    }
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <PlanPermissionsProvider>
            <TicketsContextProvider>
              <Switch>
                <Route exact path="/" component={Login} isPublic />
                <Route exact path="/login" component={Login} isPublic />
                <Route exact path="/solucoes/:slug" component={FeatureDetailPage} isPublic />
                <Route exact path="/docs/public/api" component={PublicApiDocs} isPublic />
                <Route exact path="/termos-de-servico" component={TermsOfService} isPublic />
                <Route exact path="/politica-de-uso" component={UsagePolicy} isPublic />
                <Route exact path="/politica-de-privacidade" component={PrivacyPolicy} isPublic />
                <Route exact path="/mobile-login" component={MobileLogin} isPublic />
                <Route exact path="/cadastro" component={Cadastro} isPublic />
                <Route exact path="/forgetpsw" component={ForgetPassword} isPublic />
                <Route exact path="/checkout/:token" component={PublicCheckout} isPublic />
                <Route exact path="/public/checkout/:token" component={PublicCheckout} isPublic />

                <WhatsAppsProvider>
                  <QueueSelectedProvider>
                    <LoggedInLayout>
                      <NotificationToast />
                      <Switch>
                        <Route exact path="/financeiro" component={Financeiro} isPrivate />

                        <Route exact path="/companies" component={Companies} isPrivate />
                        <Route exact path="/dashboard" component={Dashboard} isPrivate />
                        <Route exact path="/painel" component={Dashboard} isPrivate />
                        <Route exact path="/tickets/:ticketId?" component={TicketResponsiveContainer} isPrivate />
                        <Route exact path="/conversas/:ticketId?" component={TicketResponsiveContainer} isPrivate />
                        <Route exact path="/atendimentos/:ticketId?" component={Atendimentos} isPrivate />
                        <Route exact path="/atendimentomobile/:ticketId?" component={AtendimentosMobile} isPrivate />
                        <Route exact path="/connections" component={Canais} isPrivate />
                        <Route exact path="/canais" component={Canais} isPrivate />
                        <Route exact path="/quick-messages" component={QuickMessages} isPrivate />
                        <Route exact path="/todolist" component={Produtos} isPrivate />
                        <Route exact path="/produtos" component={Produtos} isPrivate />
                        <Route exact path="/schedules" component={Schedules} isPrivate />
                        <Route exact path="/lembretes" component={Schedules} isPrivate />
                        <Route exact path="/tags" component={Etiquetas} isPrivate />
                        <Route exact path="/etiquetas" component={Etiquetas} isPrivate />
                        <Route exact path="/contacts" component={Contatos} isPrivate />
                        <Route exact path="/contatos" component={Contatos} isPrivate />
                        <Route exact path="/contacts/import" component={ContactImportPage} isPrivate />
                        <Route exact path="/contatos/import" component={ContactImportPage} isPrivate />
                        <Route exact path="/helps" component={Helps} isPrivate />
                        <Route exact path="/users" component={Users} isPrivate />
                        <Route exact path="/messages-api" component={DocumentacaoPage} isPrivate />
                        <Route exact path="/messages-api/documentacao" component={ApiClientesPage} isPrivate />
                        <Route exact path="/api-mensagens" component={ApiMensagensPage} isPrivate />
                        <Route exact path="/api-contatos" component={ApiContatosPage} isPrivate />
                        <Route exact path="/api-tags" component={ApiTagsPage} isPrivate />
                        <Route exact path="/api-produtos" component={ApiProdutosPage} isPrivate />
                        <Route exact path="/api-servicos" component={ApiServicosPage} isPrivate />
                        <Route exact path="/api-usuarios" component={ApiUsuariosPage} isPrivate />
                        <Route exact path="/api-filas" component={ApiFilasPage} isPrivate />
                        <Route exact path="/api-negocios" component={ApiNegociosPage} isPrivate />
                        <Route exact path="/api-tags-kanban" component={ApiTagsKanbanPage} isPrivate />
                        <Route exact path="/api-projetos" component={ApiProjetosPage} isPrivate />
                        <Route exact path="/api-tarefas" component={ApiTarefasPage} isPrivate />
                        <Route exact path="/api-tickets" component={ApiTicketsPage} isPrivate />
                        <Route exact path="/api-conexoes" component={ApiConexoesPage} isPrivate />
                        <Route exact path="/api-faturas" component={ApiFaturasPage} isPrivate />
                        <Route exact path="/api-crm-leads" component={ApiCrmLeadsPage} isPrivate />
                        <Route exact path="/api-pipeline" component={ApiPipelinePage} isPrivate />
                        <Route exact path="/settings" component={SettingsCustom} isPrivate />
                        <Route exact path="/queues" component={Departamentos} isPrivate />
                        <Route exact path="/departamentos" component={Departamentos} isPrivate />
                        <Route exact path="/relatorios" component={Reports} isPrivate />
                        <Route exact path="/sistema" component={Sistema} isPrivate />
                        <Route exact path="/smtp" component={Smtp} isPrivate />
                        <Route exact path="/ferramentas" component={FerramentasPage} isPrivate />
                        <Route exact path="/queue-integration" component={QueueIntegration} isPrivate />
                        <Route exact path="/integracao" component={QueueIntegration} isPrivate />
                        <Route exact path="/announcements" component={Annoucements} isPrivate />
                        <Route exact path="/faturas" component={Faturas} isPrivate />
                        <Route exact path="/gestor-financas/gestor-financeiro-ia" component={GestorFinancasIA} isPrivate />
                        {/* [DEPRECATED] Funil Legado - rotas desativadas, migradas para Board Inteligente */}
                        {/* <Route exact path="/documentacao" component={Funil} isPrivate /> */}
                        {/* <Route exact path="/funil" component={Funil} isPrivate /> */}
                        <Route exact path="/empresa" component={empresa} isPrivate />
                        <Route exact path="/payment-settings" component={PaymentSettings} isPrivate />
                        <Route
                          exact
                          path="/integration-settings"
                          component={IntegrationSettings}
                          isPrivate
                        />

                        <Route
                          exact
                          path="/phrase-lists"
                          component={CampaignsPhrase}
                          isPrivate
                        />
                        <Route
                          exact
                          path="/flowbuilders"
                          component={FlowBuilder}
                          isPrivate
                        />
                        <Route
                          exact
                          path="/flowbuilder/:id?"
                          component={FlowBuilderConfig}
                          isPrivate
                        />
                        <Route
                          exact
                          path="/kanban-automations"
                          component={KanbanAutomations}
                          isPrivate
                        />
                        <Route
                          exact
                          path="/kanban-automations-config/:id?"
                          component={KanbanAutomationsConfig}
                          isPrivate
                        />
                        <Route exact path="/chats/:id?" component={Chat} isPrivate />
                        <Route exact path="/files" component={Files} isPrivate />
                        <Route exact path="/moments" component={ChatMoments} isPrivate />
                        <Route exact path="/intelligent-board" component={PipelineBoard} isPrivate />
                        <Route exact path="/executive-dashboard" component={ExecutiveDashboard} isPrivate />
                        <Route exact path="/pipeline-config" component={PipelineConfig} isPrivate />
                        <Route exact path="/crm-webhooks" component={CRMWebhooks} isPrivate />
                        <Route exact path="/kanban" component={PipelineBoard} isPrivate />
                        <Route exact path="/crm/tasks" component={Tasks} isPrivate />
                        <Route exact path="/social-media" component={RedesSociais} isPrivate />
                        <Route exact path="/my-sites" component={MeusSites} isPrivate />
                        {/* [DEPRECATED] TagsKanban - migrado para Board Inteligente */}
                        {/* <Route exact path="/TagsKanban" component={TagsKanban} isPrivate /> */}
                        <Route exact path="/prompts" component={Agentes} isPrivate />
                        <Route exact path="/agentes" component={Agentes} isPrivate />
                        <Route exact path="/ia-workflows" component={IaWorkflows} isPrivate />
                        <Route exact path="/ia-workflows/:id" component={IaWorkflowEditor} isPrivate />
                        <Route exact path="/tutorial-videos" component={TutorialVideos} isPrivate />
                        <Route exact path="/slider-banners" component={SliderBannersPage} isPrivate />
                        <Route exact path="/servicos" component={ServicosPage} isPrivate />
                        <Route exact path="/profissionais" component={ProfissionaisPage} isPrivate />
                        <Route exact path="/leads" component={Leads} isPrivate />
                        <Route exact path="/clientes" component={Clients} isPrivate />
                        <Route exact path="/clientes/:clientId" component={ClientDetails} isPrivate />
                        <Route exact path="/projects" component={Projects} isPrivate />
                        <Route exact path="/projetos" component={Projects} isPrivate />
                        <Route exact path="/projects/:projectId" component={ProjectDetails} isPrivate />
                        <Route exact path="/user-schedules" component={UserSchedules} isPrivate />
                        <Route exact path="/agendas" component={UserSchedules} isPrivate />
                        <Route exact path="/appointments" component={Agenda} isPrivate />
                        <Route exact path="/compromissos" component={Agenda} isPrivate />
                        <Route exact path="/group-management" component={GroupManagement} isPrivate />
                        <Route exact path="/follow-ups" component={FollowUps} isPrivate />
                        <Route exact path="/aquecimento-whatsapp" component={AquecimentoWhatsApp} isPrivate />
                        <Route exact path="/disparo-botoes" component={DisparoBotoes} isPrivate />
                        <Route exact path="/automations" component={Automations} isPrivate />
                        <Route exact path="/allConnections" component={AllConnections} isPrivate />
                        <Route
                          exact
                          path="/subscription"
                          component={Subscription}
                          isPrivate
                        />
                        <Route exact path="/contact-settings" component={ContactSettings} isPrivate />
                        <Route exact path="/contact-analytics" component={ContactAnalytics} isPrivate />
                        <Route exact path="/call-history" component={CallHistory} isPrivate />
                        <Route exact path="/chamadas" component={CallHistory} isPrivate />
                        <Route exact path="/admin/frontend-errors" component={FrontendErrors} isPrivate />
                        <Route exact path="/admin/backend-errors" component={BackendErrors} isPrivate />
                        <Route exact path="/admin/system-metrics" component={SystemMetrics} isPrivate />
                        <Route exact path="/admin/performance" component={Performance} isPrivate />
                        {showCampaigns && (
                          <>
                            <Route exact path="/contact-lists" component={ContactLists} isPrivate />
                            <Route exact path="/contact-lists/:contactListId/contacts" component={ContactListItems} isPrivate />
                            <Route exact path="/campaigns" component={Campanhas} isPrivate />
                            <Route exact path="/campanhas" component={Campanhas} isPrivate />
                            <Route exact path="/campaign/:campaignId/report" component={CampaignReport} isPrivate />
                            <Route exact path="/campaigns-config" component={CampaignsConfig} isPrivate />
                          </>
                        )}
                        {/* Rotas para Links Embedded */}
                        <Route exact path="/apps-config" component={ExternalAppConfig} isPrivate />
                        <Route exact path="/apps/:appId" component={EmbeddedLink} isPrivate />
                        {/* Fallback para rotas privadas não encontradas dentro do layout */}
                        <Route path="*" component={() => <Redirect to="/atendimentos" />} isPrivate />
                      </Switch>
                    </LoggedInLayout>
                  </QueueSelectedProvider>
                </WhatsAppsProvider>
                {/* Fallback global para rotas não encontradas */}
                <Route path="*" component={() => <Redirect to="/login" />} />
              </Switch>
              <ToastContainer position="top-center" autoClose={3000} />
            </TicketsContextProvider>
          </PlanPermissionsProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
