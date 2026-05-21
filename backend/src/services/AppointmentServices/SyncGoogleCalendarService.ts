import { Op } from "sequelize";
import { google } from "googleapis";
import Appointment from "../../models/Appointment";
import UserSchedule from "../../models/UserSchedule";
import UserGoogleCalendarIntegration from "../../models/UserGoogleCalendarIntegration";
import User from "../../models/User";
import { createOAuth2Client } from "../../helpers/googleCalendarClient";
import logger from "../../utils/logger";

export interface SyncGoogleCalendarResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Busca eventos do Google Calendar e importa/atualiza como appointments no sistema.
 * Suporta sync incremental via syncToken para eficiência.
 *
 * @param companyId - ID da empresa
 * @param userId - (opcional) limitar ao usuário específico
 */
const SyncGoogleCalendarService = async (
  companyId: number,
  userId?: number
): Promise<SyncGoogleCalendarResult> => {
  const result: SyncGoogleCalendarResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  logger.info(`[Calendar Sync] Iniciando sync para company ${companyId}${userId ? ` user ${userId}` : ""}`);

  const whereClause: any = {
    companyId,
    active: true,
    userGoogleCalendarIntegrationId: { [Op.not]: null }
  };

  const includeArr: any[] = [
    {
      model: UserGoogleCalendarIntegration,
      as: "googleCalendarIntegration",
      required: true,
      where: { active: true, companyId }
    }
  ];

  if (userId) {
    includeArr.push({
      model: User, // Needs import: import User from "../../models/User";
      as: "users",
      where: { id: userId },
      required: true,
      attributes: []
    });
  }

  const schedules = await UserSchedule.findAll({
    where: whereClause,
    include: includeArr
  });

  if (schedules.length === 0) {
    logger.info("[Calendar Sync] Nenhuma agenda com Google Calendar vinculado encontrada.");
    return result;
  }

  logger.info(`[Calendar Sync] Sincronizando ${schedules.length} agenda(s)...`);

  for (const schedule of schedules) {
    try {
      await syncScheduleEvents(schedule, companyId, result);
    } catch (err: any) {
      const msg = `Agenda ${schedule.id} (${schedule.name}): ${err?.message || String(err)}`;
      logger.error(`[Calendar Sync] Erro - ${msg}`);
      result.errors.push(msg);
    }
  }

  logger.info(
    `[Calendar Sync] Concluído - importados: ${result.imported}, atualizados: ${result.updated}, pulados: ${result.skipped}, erros: ${result.errors.length}`
  );

  return result;
};

const syncScheduleEvents = async (
  schedule: UserSchedule,
  companyId: number,
  result: SyncGoogleCalendarResult
): Promise<void> => {
  const integration = (schedule as any).googleCalendarIntegration as UserGoogleCalendarIntegration;

  if (!integration?.accessToken) {
    logger.warn(`[Calendar Sync] Agenda ${schedule.id} sem access token, pulando.`);
    result.skipped++;
    return;
  }

  const oauth2Client = await createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken || undefined,
    expiry_date: integration.expiryDate
      ? new Date(integration.expiryDate).getTime()
      : undefined
  });

  // Atualizar access token automaticamente quando renovado
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await integration.update({
        accessToken: tokens.access_token,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      });
      logger.info(`[Calendar Sync] Token renovado para agenda ${schedule.id}`);
    }
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const calendarId = integration.calendarId || "primary";

  // Busca incremental com syncToken se disponível, senão busca últimos 30 dias
  const listParams: any = {
    calendarId,
    maxResults: 250,
    singleEvents: true
  };

  if (integration.syncToken) {
    listParams.syncToken = integration.syncToken;
  } else {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    listParams.timeMin = thirtyDaysAgo.toISOString();
    listParams.orderBy = "startTime";
  }

  let events: any[] = [];
  let newSyncToken: string | null | undefined = null;

  try {
    const response = await listGoogleCalendarEvents(calendar, listParams);
    events = response.events;
    newSyncToken = response.nextSyncToken;
  } catch (err: any) {
    if (err?.code === 410 || err?.status === 410) {
      // syncToken expirado - fazer full sync
      logger.warn(`[Calendar Sync] syncToken inválido para agenda ${schedule.id}, fazendo full sync.`);
      await integration.update({ syncToken: null });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const fallbackParams: any = {
        calendarId,
        maxResults: 250,
        singleEvents: true,
        timeMin: thirtyDaysAgo.toISOString(),
        orderBy: "startTime"
      };

      const response = await listGoogleCalendarEvents(calendar, fallbackParams);
      events = response.events;
      newSyncToken = response.nextSyncToken;
    } else {
      throw err;
    }
  }

  for (const event of events) {
    try {
      await processGoogleEvent(event, schedule, companyId, result);
    } catch (err: any) {
      logger.error(`[Calendar Sync] Erro ao processar evento ${event.id}: ${err?.message}`);
      result.errors.push(`Evento ${event.id}: ${err?.message}`);
    }
  }

  // Salvar novo syncToken e atualizar lastSyncAt
  if (newSyncToken) {
    await integration.update({
      syncToken: newSyncToken,
      lastSyncAt: new Date()
    });
  }
};

const processGoogleEvent = async (
  event: any,
  schedule: UserSchedule,
  companyId: number,
  result: SyncGoogleCalendarResult
): Promise<void> => {
  // Ignorar eventos sem data/hora
  if (!event.start?.dateTime && !event.start?.date) {
    result.skipped++;
    return;
  }

  const startDatetime = new Date(event.start.dateTime || event.start.date);
  const endRaw = event.end?.dateTime || event.end?.date;
  const endDatetime = endRaw ? new Date(endRaw) : new Date(startDatetime.getTime() + 60 * 60000);
  const durationMinutes = Math.max(1, Math.round((endDatetime.getTime() - startDatetime.getTime()) / 60000));
  const title = event.summary?.trim() || "(Sem título)";
  const description = event.description || null;

  if (isPersonalCalendarEvent(event, title, description)) {
    logger.info(
      `[Calendar Sync] Evento pessoal ignorado - agenda ${schedule.id}, evento ${event.id}, titulo "${title}"`
    );
    result.skipped++;
    return;
  }

  // Extrair dados do Google Meet e organizador
  const meetLink =
    event.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri ||
    event.conferenceData?.entryPoints?.[0]?.uri ||
    null;
  const organizerEmail = event.organizer?.email || null;
  const organizerName = event.organizer?.displayName || null;
  const participants = event.attendees
    ? event.attendees.map((a: any) => a.email).filter(Boolean)
    : null;

  const existing = await Appointment.findOne({
    where: { googleEventId: event.id, companyId }
  });

  // Evento deletado/cancelado no Google → cancelar no sistema
  if (event.status === "cancelled") {
    if (existing && existing.status !== "cancelled") {
      await existing.update({ status: "cancelled" });
      result.updated++;
    } else {
      result.skipped++;
    }
    return;
  }

  if (!existing) {
    await Appointment.create({
      title,
      description,
      startDatetime,
      durationMinutes,
      status: "scheduled",
      scheduleId: schedule.id,
      companyId,
      googleEventId: event.id,
      googleMeetLink: meetLink,
      organizerEmail,
      organizerName,
      participants,
      source: "google_calendar"
    });
    result.imported++;
  } else {
    // Verificar se houve mudança
    const existingStart = new Date(existing.startDatetime).getTime();
    const changed =
      existing.title !== title ||
      existingStart !== startDatetime.getTime() ||
      existing.durationMinutes !== durationMinutes ||
      existing.googleMeetLink !== meetLink;

    if (changed) {
      await existing.update({
        title,
        description,
        startDatetime,
        durationMinutes,
        googleMeetLink: meetLink,
        organizerEmail,
        organizerName,
        participants
      });
      result.updated++;
    } else {
      result.skipped++;
    }
  }
};

const listGoogleCalendarEvents = async (
  calendar: any,
  params: any
): Promise<{ events: any[]; nextSyncToken?: string | null }> => {
  const events: any[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null | undefined;

  do {
    const response = await calendar.events.list({
      ...params,
      pageToken
    });

    events.push(...(response.data.items || []));
    pageToken = response.data.nextPageToken || undefined;
    nextSyncToken = response.data.nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken };
};

const normalizeText = (value?: string | null): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const personalCalendarPatterns = [
  "parabens",
  "aniversario",
  "feliz aniversario",
  "birthday",
  "happy birthday",
  "cumpleanos"
];

const isPersonalCalendarEvent = (
  event: any,
  title: string,
  description?: string | null
): boolean => {
  if (event.eventType === "birthday" || event.birthdayProperties) {
    return true;
  }

  const searchableText = `${normalizeText(title)} ${normalizeText(description)}`;

  return personalCalendarPatterns.some(pattern => searchableText.includes(pattern));
};

export default SyncGoogleCalendarService;
