import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Appointment from "../../models/Appointment";
import UserSchedule from "../../models/UserSchedule";
import User from "../../models/User";
import UserGoogleCalendarIntegration from "../../models/UserGoogleCalendarIntegration";
import { createGoogleCalendarEvent } from "../../helpers/googleCalendarClient";
import { notifyAiExternalGroup } from "../AiExternalAgentServices/AiExternalNotificationService";

interface CreateAppointmentData {
  title: string;
  description?: string;
  startDatetime: Date | string;
  durationMinutes: number;
  status?: string;
  scheduleId: number;
  serviceId?: number;
  clientId?: number;
  contactId?: number;
  companyId: number;
  clientEmail?: string;
  leadName?: string;
  leadPhone?: string;
  participantEmails?: string[];
  meetingLink?: string;
  operationalNote?: string;
  createdByUserId?: number;
}

const CreateAppointmentService = async (
  data: CreateAppointmentData
): Promise<Appointment> => {
  const schema = Yup.object().shape({
    title: Yup.string().required("Título é obrigatório").max(200),
    description: Yup.string().nullable(),
    startDatetime: Yup.date().required("Data/hora de início é obrigatória"),
    durationMinutes: Yup.number().required("Duração é obrigatória").min(1),
    status: Yup.string().oneOf(["scheduled", "confirmed", "completed", "cancelled", "no_show"]).default("scheduled"),
    scheduleId: Yup.number().required("Agenda é obrigatória"),
    serviceId: Yup.number().nullable(),
    clientId: Yup.number().nullable(),
    contactId: Yup.number().nullable(),
    companyId: Yup.number().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const schedule = await UserSchedule.findOne({
    where: { id: data.scheduleId, companyId: data.companyId },
    include: [{ model: User, as: "user" }]
  });

  if (!schedule) {
    throw new AppError("Agenda não encontrada", 404);
  }

  if (!schedule.active) {
    throw new AppError("Esta agenda não está ativa", 400);
  }

  if (data.createdByUserId) {
    const createdByUser = await User.findOne({
      where: { id: data.createdByUserId, companyId: data.companyId },
      attributes: ["id"]
    });

    if (!createdByUser) {
      throw new AppError("Usuario responsavel nao encontrado nesta empresa", 404);
    }
  }

  const startDatetime = new Date(data.startDatetime);
  const endDatetime = new Date(startDatetime.getTime() + data.durationMinutes * 60000);

  const user = schedule.user;
  const userStartWork = user?.startWork || "00:00";
  const userEndWork = user?.endWork || "23:59";
  const userWorkDays = user?.workDays || "0,1,2,3,4,5,6";
  const userLunchStart = user?.lunchStart || null;
  const userLunchEnd = user?.lunchEnd || null;

  // Validar dia de trabalho
  const dayOfWeek = startDatetime.getDay(); // 0 = Domingo, 6 = Sábado
  const workDaysArray = userWorkDays.split(",").map(d => parseInt(d.trim(), 10));

  if (!workDaysArray.includes(dayOfWeek)) {
    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    throw new AppError(
      `O profissional não trabalha neste dia (${dayNames[dayOfWeek]}). Dias de trabalho: ${workDaysArray.map(d => dayNames[d]).join(", ")}`,
      400
    );
  }

  // Validar horário de trabalho
  const startTime = startDatetime.toTimeString().substring(0, 5);
  const endTime = endDatetime.toTimeString().substring(0, 5);

  if (startTime < userStartWork || endTime > userEndWork) {
    throw new AppError(
      `O compromisso deve estar dentro do horário de trabalho do profissional (${userStartWork} - ${userEndWork})`,
      400
    );
  }

  // Validar horário de almoço
  if (userLunchStart && userLunchEnd) {
    // Verificar se o compromisso conflita com o horário de almoço
    const lunchStartMinutes = parseInt(userLunchStart.split(":")[0], 10) * 60 + parseInt(userLunchStart.split(":")[1], 10);
    const lunchEndMinutes = parseInt(userLunchEnd.split(":")[0], 10) * 60 + parseInt(userLunchEnd.split(":")[1], 10);

    const appointmentStartMinutes = startDatetime.getHours() * 60 + startDatetime.getMinutes();
    const appointmentEndMinutes = endDatetime.getHours() * 60 + endDatetime.getMinutes();

    // Verifica se há sobreposição com o horário de almoço
    const overlapsLunch = (
      (appointmentStartMinutes >= lunchStartMinutes && appointmentStartMinutes < lunchEndMinutes) ||
      (appointmentEndMinutes > lunchStartMinutes && appointmentEndMinutes <= lunchEndMinutes) ||
      (appointmentStartMinutes <= lunchStartMinutes && appointmentEndMinutes >= lunchEndMinutes)
    );

    if (overlapsLunch) {
      throw new AppError(
        `O compromisso não pode ser agendado durante o horário de almoço do profissional (${userLunchStart} - ${userLunchEnd})`,
        400
      );
    }
  }

  const appointment = await Appointment.create({
    title: data.title,
    description: data.description || null,
    startDatetime,
    durationMinutes: data.durationMinutes,
    status: data.status || "scheduled",
    scheduleId: data.scheduleId,
    serviceId: data.serviceId || null,
    clientId: data.clientId || null,
    contactId: data.contactId || null,
    companyId: data.companyId,
    leadName: data.leadName || null,
    leadPhone: data.leadPhone || null,
    participantEmails: data.participantEmails && data.participantEmails.length > 0 ? data.participantEmails : null,
    meetingLink: data.meetingLink || null,
    operationalNote: data.operationalNote || null,
    createdByUserId: data.createdByUserId || null
  });

  // Verificar se a agenda tem integração com Google Calendar
  if (schedule.userGoogleCalendarIntegrationId) {
    try {
      console.log("DEBUG - Criando evento no Google Calendar para appointment:", appointment.id);

      const integration = await UserGoogleCalendarIntegration.findOne({
        where: {
          id: schedule.userGoogleCalendarIntegrationId,
          companyId: data.companyId
        }
      });

      if (integration && integration.accessToken) {
        console.log("DEBUG - Usando integração:", {
          email: integration.email,
          calendarId: integration.calendarId,
          googleUserId: integration.googleUserId
        });

        // Buscar informações adicionais para descrição completa
        let fullDescription = data.description || "";

        if (data.serviceId) {
          // TODO: Buscar informações do serviço
          fullDescription += fullDescription ? "\n\n" : "";
          fullDescription += `Serviço ID: ${data.serviceId}`;
        }

        if (data.clientId) {
          // TODO: Buscar informações do cliente
          fullDescription += fullDescription ? "\n\n" : "";
          fullDescription += `Cliente ID: ${data.clientId}`;
        }

        if (data.contactId) {
          // TODO: Buscar informações do contato
          fullDescription += fullDescription ? "\n\n" : "";
          fullDescription += `Contato ID: ${data.contactId}`;
        }

        fullDescription += fullDescription ? "\n\n" : "";
        fullDescription += `Status: ${appointment.status}`;
        fullDescription += `\nAgendado via sistema em: ${appointment.createdAt.toLocaleDateString('pt-BR')}`;

        const attendees: any[] = [];
        if (data.clientEmail) attendees.push({ email: data.clientEmail });
        if (data.participantEmails && data.participantEmails.length > 0) {
          data.participantEmails.forEach(email => {
            if (!attendees.find(a => a.email === email)) {
              attendees.push({ email });
            }
          });
        }

        const crypto = require("crypto");
        const eventBody: any = {
          summary: data.title,
          description: fullDescription,
          start: {
            dateTime: startDatetime.toISOString(),
            timeZone: 'America/Sao_Paulo'
          },
          end: {
            dateTime: endDatetime.toISOString(),
            timeZone: 'America/Sao_Paulo'
          },
          conferenceData: {
            createRequest: {
              requestId: crypto.randomBytes(10).toString("hex"),
              conferenceSolutionKey: { type: "hangoutsMeet" }
            }
          }
        };

        if (attendees.length > 0) {
          eventBody.attendees = attendees;
        }

        const googleEvent = await createGoogleCalendarEvent(
          integration.accessToken,
          integration.refreshToken,
          eventBody,
          integration.calendarId
        );

        if (googleEvent && googleEvent.id) {
          // Extrair dados do Google Meet e organizador
          const meetLink =
            googleEvent.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri ||
            googleEvent.conferenceData?.entryPoints?.[0]?.uri ||
            null;

          const organizerEmail = googleEvent.organizer?.email || null;
          const organizerName = googleEvent.organizer?.displayName || null;
          const participants = googleEvent.attendees
            ? googleEvent.attendees.map((a: any) => a.email).filter(Boolean)
            : null;

          await appointment.update({
            googleEventId: googleEvent.id,
            googleMeetLink: meetLink,
            organizerEmail,
            organizerName,
            participants
          });
          console.log("DEBUG - Evento criado no Google Calendar:", googleEvent.id, "Meet:", meetLink);
        }
      }
    } catch (error) {
      console.error("ERROR - Falha ao criar evento no Google Calendar:", error);
      // Não falhar a criação do appointment se falhar a sincronização
    }
  }

  notifyAiExternalGroup({
    companyId: data.companyId,
    eventType: "appointmentCreated",
    appointment
  }).catch(() => undefined);

  return appointment;
};

export default CreateAppointmentService;
