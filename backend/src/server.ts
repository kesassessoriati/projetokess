import 'dotenv/config';
import gracefulShutdown from "http-graceful-shutdown";
import https from 'https'; // Importando https para o servidor
import fs from 'fs'; // Para ler os arquivos do certificado
import path from 'path';
import app from "./app";
import cron from "node-cron";
import { initIO } from "./libs/socket";
import { initSipWsProxy } from "./libs/sipWsProxy";
import logger from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import Company from "./models/Company";
import BullQueue from './libs/queue';
import { startQueueProcess } from "./queues";
import SLASchedulerService from "./services/PipelineServices/SLASchedulerService";
import WebhookService from "./services/PipelineServices/WebhookService";
import AIAnalyzerService from "./services/PipelineServices/AIAnalyzerService";
import InitPipelineTemplatesService from "./services/PipelineServices/InitPipelineTemplatesService";
import StageAutomationService from "./services/AutomationServices/StageAutomationService";
import startScheduledFlowTriggers from "./services/FlowBuilderService/ScheduledFlowTriggerService";

const isEnabled = (value?: string): boolean =>
  ["true", "1", "yes", "on", "enabled"].includes(
    String(value || "").toLowerCase()
  );

const hasInternalMessageSyncRedis = (): boolean =>
  Boolean(process.env.INTERNAL_MESSAGE_SYNC_REDIS_URI || process.env.REDIS_URI);

const startBullQueueProcessors = (): void => {
  if (process.env.REDIS_URI_ACK && process.env.REDIS_URI_ACK !== "") {
    BullQueue.process();
    return;
  }

  if (
    isEnabled(process.env.INTERNAL_MESSAGE_SYNC_ENABLED) &&
    hasInternalMessageSyncRedis()
  ) {
    BullQueue.process(["internalMessageSyncQueue"]);
  }
};

if (process.env.CERTIFICADOS == "true") {

  const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_FILE),
    cert: fs.readFileSync(process.env.SSL_CRT_FILE)
  };

  const server = https.createServer(httpsOptions, app).listen(process.env.PORT, async () => {
    const companies = await Company.findAll({
      where: { status: true },
      attributes: ["id"]
    });

    const allPromises: any[] = [];
    companies.map(async c => {
      const promise = StartAllWhatsAppsSessions(c.id);
      allPromises.push(promise);
    });

    Promise.all(allPromises).then(async () => {
      await startQueueProcess();
    });

    startBullQueueProcessors();

    logger.info(`Server started on port: ${process.env.PORT} with HTTPS`);

    // Inicializar Pipeline Engine
    SLASchedulerService.init();
    WebhookService.init();
    AIAnalyzerService.init();
    StageAutomationService.init();
    InitPipelineTemplatesService();
    startScheduledFlowTriggers();
  });

  process.on("uncaughtException", err => {
    console.error(`${new Date().toUTCString()} uncaughtException:`, err.message);
    console.error(err.stack);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, p) => {
    console.error(
      `${new Date().toUTCString()} unhandledRejection:`,
      reason,
      p
    );
    process.exit(1);
  });

  initIO(server);
  initSipWsProxy(server);
  gracefulShutdown(server);

} else {
  const server = app.listen(process.env.PORT, async () => {
    const companies = await Company.findAll({
      where: { status: true },
      attributes: ["id"]
    });

    const allPromises: any[] = [];
    companies.map(async c => {
      const promise = StartAllWhatsAppsSessions(c.id);
      allPromises.push(promise);
    });

    Promise.all(allPromises).then(async () => {

      await startQueueProcess();
    });

    startBullQueueProcessors();

    logger.info(`Server started on port: ${process.env.PORT}`);

    // Inicializar Pipeline Engine
    SLASchedulerService.init();
    WebhookService.init();
    AIAnalyzerService.init();
    StageAutomationService.init();
    InitPipelineTemplatesService();
    startScheduledFlowTriggers();
  });

  process.on("uncaughtException", err => {
    console.error(`${new Date().toUTCString()} uncaughtException:`, err.message);
    console.error(err.stack);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, p) => {
    console.error(
      `${new Date().toUTCString()} unhandledRejection:`,
      reason,
      p
    );
    process.exit(1);
  });

  initIO(server);
  initSipWsProxy(server);
  gracefulShutdown(server);

}

import { executeWhatsappWarmups } from "./services/WhatsappWarmupServices/WhatsappWarmupService";
import { processScheduledWarmupSessions } from "./services/WhatsappWarmupServices/WhatsappWarmupSessionEngineService";
import executeFollowUpCampaigns from "./services/FollowUpCampaignService/ExecuteFollowUpCampaignService";
import SyncEmailChannelService from "./services/EmailChannelServices/SyncEmailChannelService";
import { processScheduledGroupCampaigns } from "./services/GroupManagementServices/GroupCampaignProcessorService";
import SyncGoogleCalendarService from "./services/AppointmentServices/SyncGoogleCalendarService";
import ProcessExpiredCrmClientsService from "./services/CrmClientService/ProcessExpiredCrmClientsService";
import ClearExpiredWebhookPausesService from "./services/TicketServices/ClearExpiredWebhookPausesService";
import { processAiExternalFollowUps } from "./services/AiExternalFollowUpServices/AiExternalFollowUpService";
import { processAiExternalReminders } from "./services/AiExternalAgentServices/AiExternalNotificationService";
import SyncAiExternalAppointmentsService from "./services/AiExternalAppointmentServices/SyncAiExternalAppointmentsService";
import AutoAcceptPendingTicketsService from "./services/TicketServices/AutoAcceptPendingTicketsService";

let syncingAiExternalAppointments = false;

// Check warmups every 5 minutes
cron.schedule("*/5 * * * *", () => {
  executeWhatsappWarmups();
});

// Check scheduled warmup sessions every minute
cron.schedule("* * * * *", () => {
  processScheduledWarmupSessions();
});

// Process group campaigns every minute
cron.schedule("* * * * *", () => {
  processScheduledGroupCampaigns();
});

// Process the active FollowUpCampaign engine every 5 minutes.
// This remains cron-based for now; the legacy singular FollowUp scheduler is
// separate and is not executed from this cron.
cron.schedule("*/5 * * * *", () => {
  executeFollowUpCampaigns();
});

// Process AI External follow-ups every 2 hours.
cron.schedule("0 */2 * * *", () => {
  processAiExternalFollowUps().catch(() => {});
});

// Sync AI External appointments into CRM appointments and automatic reminders every minute.
cron.schedule("* * * * *", async () => {
  if (syncingAiExternalAppointments) return;
  syncingAiExternalAppointments = true;

  try {
    const companies = await Company.findAll({
      where: { status: true },
      attributes: ["id"]
    });

    for (const company of companies) {
      await SyncAiExternalAppointmentsService({ companyId: company.id }).catch(error => {
        logger.warn(
          `[AI External Appointments] Falha ao sincronizar empresa ${company.id}: ${error?.message || error}`
        );
      });
    }
  } catch (error: any) {
    logger.warn(
      `[AI External Appointments] Falha na rotina de sincronizacao: ${error?.message || error}`
    );
  } finally {
    syncingAiExternalAppointments = false;
  }
});

// Process due AI External reminders every minute.
cron.schedule("* * * * *", () => {
  processAiExternalReminders().catch(() => {});
});

// Sync e-mail channels (IMAP inbox) every 2 minutes
cron.schedule("*/2 * * * *", () => {
  SyncEmailChannelService();
});

// Reactivate expired per-conversation N8N pauses.
cron.schedule("* * * * *", () => {
  ClearExpiredWebhookPausesService().catch(() => {});
});

// Sync Google Calendar appointments every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    const companies = await Company.findAll({
      where: { status: true },
      attributes: ["id"]
    });
    for (const company of companies) {
      SyncGoogleCalendarService(company.id).catch(() => {});
    }
  } catch (err) {
    // Non-blocking: log silently
  }
});

// Process expired CRM clients every hour
cron.schedule("0 * * * *", () => {
  ProcessExpiredCrmClientsService().catch(() => {});
});

// Auto-accept pending tickets every minute
cron.schedule("* * * * *", () => {
  AutoAcceptPendingTicketsService().catch(() => {});
});
