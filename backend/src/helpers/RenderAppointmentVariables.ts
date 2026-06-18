/**
 * RenderAppointmentVariables.ts
 *
 * Renderiza variáveis dinâmicas de agendamento ({{appointmentDate}}, etc.) em
 * mensagens de automação. Faz uma única consulta ao próximo Appointment do
 * contato apenas quando o texto contém pelo menos uma variável de agendamento
 * (custo zero para mensagens sem essas variáveis).
 *
 * Observação de timezone: o projeto não usa moment-timezone; a formatação usa o
 * timezone do servidor (padrão do projeto). Ajuste TZ no ambiente se necessário.
 */
import { Op } from "sequelize";
import moment from "moment";
import Appointment from "../models/Appointment";
import Servico from "../models/Servico";
import logger from "../utils/logger";

const APPOINTMENT_TOKEN_REGEX = /\{\{\s*appointment[A-Za-z]+\s*\}\}/;

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu"
};

export const messageHasAppointmentVariables = (text?: string | null): boolean =>
  APPOINTMENT_TOKEN_REGEX.test(String(text || ""));

const sanitizeLink = (url?: string | null): string => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) return "";
  return value.replace(/[\s<>"']/g, "");
};

interface RenderContext {
  companyId: number;
  contactId?: number | null;
}

export const renderAppointmentVariables = async (
  text: string,
  { companyId, contactId }: RenderContext
): Promise<string> => {
  let result = String(text || "");
  if (!messageHasAppointmentVariables(result)) return result;

  let appointment: Appointment | null = null;

  try {
    if (contactId) {
      const include = [{ model: Servico, as: "service", required: false }];

      // Preferir o próximo agendamento futuro não cancelado
      appointment = await Appointment.findOne({
        where: {
          companyId,
          contactId,
          startDatetime: { [Op.gte]: new Date() },
          status: { [Op.ne]: "cancelled" }
        },
        order: [["startDatetime", "ASC"]],
        include
      });

      // Fallback: agendamento mais recente não cancelado
      if (!appointment) {
        appointment = await Appointment.findOne({
          where: {
            companyId,
            contactId,
            status: { [Op.ne]: "cancelled" }
          },
          order: [["startDatetime", "DESC"]],
          include
        });
      }
    }
  } catch (err: any) {
    logger.error(`[RenderAppointmentVariables] Erro ao buscar agendamento: ${err.message}`);
  }

  const start = appointment?.startDatetime ? moment(appointment.startDatetime) : null;

  const values: Record<string, string> = {
    appointmentDate: start ? start.format("DD/MM/YYYY") : "",
    appointmentTime: start ? start.format("HH:mm") : "",
    appointmentDateTime: start ? start.format("DD/MM/YYYY HH:mm") : "",
    appointmentProfessional: appointment?.organizerName || "",
    appointmentService: (appointment as any)?.service?.nome || appointment?.title || "",
    appointmentStatus: appointment
      ? STATUS_LABELS[appointment.status] || String(appointment.status)
      : "",
    appointmentMeetLink: appointment
      ? sanitizeLink(appointment.googleMeetLink) || sanitizeLink(appointment.meetingLink)
      : "",
    appointmentLocation: "",
    appointmentNotes: appointment?.operationalNote || ""
  };

  Object.entries(values).forEach(([key, val]) => {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    result = result.replace(re, val ?? "");
  });

  return result;
};

export default renderAppointmentVariables;
