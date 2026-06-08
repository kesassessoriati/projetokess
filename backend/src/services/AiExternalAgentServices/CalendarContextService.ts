import { Op } from "sequelize";
import AiExternalAgentConfig from "../../models/AiExternalAgentConfig";
import AiExternalAppointment from "../../models/AiExternalAppointment";
import Appointment from "../../models/Appointment";
import UserSchedule from "../../models/UserSchedule";
import Company from "../../models/Company";
import Contact from "../../models/Contact";
import {
  BusinessHours,
  BusinessHoursDay,
  BusinessHoursLunchBreak,
  generateAvailableSlots,
  isBusySlot,
  timeToMinutes,
  minutesToTime,
  isCompanyOpenNow,
  buildBusinessHoursPayload,
} from "../../utils/businessHoursUtils";

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

type WeekdayKey = typeof WEEKDAY_KEYS[number];

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  sunday: "Domingo",
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
};

export interface CalendarContextParams {
  companyId: number;
  date?: string;        // YYYY-MM-DD, default = today in company timezone
  days?: number;        // default = businessHours.futureDaysLimit || 7
  includeSlots?: boolean;
  includeAppointments?: boolean;
  slotDuration?: number; // override slotDurationMinutes
}

interface AppointmentEntry {
  id: number;
  title: string;
  leadName?: string;
  leadPhone?: string;
  startDatetime: string;
  endDatetime: string;
  status: string;
  source: string;
}

interface DayEntry {
  date: string;
  weekday: WeekdayKey;
  weekday_label: string;
  enabled: boolean;
  business_start: string | null;
  business_end: string | null;
  lunch_break: { enabled: boolean; start: string; end: string } | null;
  appointments: AppointmentEntry[];
  busy_slots: Array<{ start: string; end: string; reason: string }>;
  available_slots: Array<{ start: string; end: string }>;
}

function getNowInTimezone(timezone: string): Date {
  try {
    const nowStr = new Date().toLocaleString("en-US", { timeZone: timezone });
    return new Date(nowStr);
  } catch {
    return new Date();
  }
}

function formatDateInTimezone(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const y = parts.find(p => p.type === "year")?.value;
    const mo = parts.find(p => p.type === "month")?.value;
    const d = parts.find(p => p.type === "day")?.value;
    return `${y}-${mo}-${d}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function getDayOfWeek(dateStr: string): WeekdayKey {
  // Parse as UTC noon to avoid timezone drift
  const d = new Date(dateStr + "T12:00:00Z");
  return WEEKDAY_KEYS[d.getUTCDay()];
}

function getStartOfDay(dateStr: string, timezone: string): Date {
  try {
    // Build midnight in the given timezone
    const d = new Date(`${dateStr}T00:00:00`);
    // Convert using the timezone offset
    const tzMidnight = new Date(
      new Date(`${dateStr}T00:00:00`).toLocaleString("en-US", { timeZone: timezone })
    );
    // Get the actual UTC time for midnight in that timezone
    const offsetMs = new Date(`${dateStr}T00:00:00`).getTime() - tzMidnight.getTime();
    return new Date(new Date(`${dateStr}T00:00:00`).getTime() + offsetMs);
  } catch {
    return new Date(`${dateStr}T00:00:00.000Z`);
  }
}

function getEndOfDay(dateStr: string, timezone: string): Date {
  try {
    const tzEndnight = new Date(
      new Date(`${dateStr}T23:59:59`).toLocaleString("en-US", { timeZone: timezone })
    );
    const offsetMs = new Date(`${dateStr}T23:59:59`).getTime() - tzEndnight.getTime();
    return new Date(new Date(`${dateStr}T23:59:59`).getTime() + offsetMs);
  } catch {
    return new Date(`${dateStr}T23:59:59.999Z`);
  }
}

async function getAppointmentsForDay(
  companyId: number,
  dateStr: string,
  timezone: string
): Promise<AppointmentEntry[]> {
  const startOfDay = getStartOfDay(dateStr, timezone);
  const endOfDay = getEndOfDay(dateStr, timezone);

  // Fetch AiExternalAppointments
  const aiAppts = await AiExternalAppointment.findAll({
    where: {
      companyId,
      startDatetime: { [Op.between]: [startOfDay.getTime(), endOfDay.getTime()] as any },
      status: { [Op.in]: ["scheduled", "confirmed"] },
    },
    include: [{ model: Contact, attributes: ["name"], required: false }],
  });

  // Fetch internal Appointments
  const internalAppts = await Appointment.findAll({
    where: {
      companyId,
      startDatetime: { [Op.between]: [startOfDay.getTime(), endOfDay.getTime()] as any },
      status: { [Op.in]: ["scheduled", "confirmed"] },
    },
  });

  const results: AppointmentEntry[] = [];

  for (const a of aiAppts) {
    const startDt = new Date(a.startDatetime);
    const endDt = new Date(startDt.getTime() + (a.durationMinutes || 60) * 60000);
    results.push({
      id: a.id,
      title: a.title || "(sem título)",
      leadName: a.leadName || (a.contact as any)?.name || undefined,
      leadPhone: a.leadPhone || undefined,
      startDatetime: a.startDatetime.toISOString(),
      endDatetime: endDt.toISOString(),
      status: a.status,
      source: a.source || "crm",
    });
  }

  for (const a of internalAppts) {
    const startDt = new Date(a.startDatetime);
    const endDt = new Date(startDt.getTime() + (a.durationMinutes || 60) * 60000);
    results.push({
      id: a.id,
      title: a.title || "(sem título)",
      leadName: a.leadName || undefined,
      leadPhone: a.leadPhone || undefined,
      startDatetime: a.startDatetime.toISOString(),
      endDatetime: endDt.toISOString(),
      status: a.status,
      source: "internal",
    });
  }

  return results;
}

function appointmentToTimeRange(
  appt: AppointmentEntry,
  timezone: string
): { startTime: string; endTime: string } {
  // Extract HH:MM in local timezone
  const start = new Date(appt.startDatetime);
  const end = new Date(appt.endDatetime);
  try {
    const fmtTime = (d: Date) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(d);
      const h = parts.find(p => p.type === "hour")?.value ?? "00";
      const m = parts.find(p => p.type === "minute")?.value ?? "00";
      return `${h === "24" ? "00" : h}:${m}`;
    };
    return { startTime: fmtTime(start), endTime: fmtTime(end) };
  } catch {
    return {
      startTime: `${String(start.getUTCHours()).padStart(2, "0")}:${String(start.getUTCMinutes()).padStart(2, "0")}`,
      endTime: `${String(end.getUTCHours()).padStart(2, "0")}:${String(end.getUTCMinutes()).padStart(2, "0")}`,
    };
  }
}

export async function getCalendarContext(
  params: CalendarContextParams
): Promise<Record<string, unknown>> {
  const { companyId, includeSlots = true, includeAppointments = true } = params;

  // 1. Fetch company
  const company = await Company.findByPk(companyId, { attributes: ["id", "name"] });

  // 2. Fetch agent config with businessHours
  const agentConfig = await AiExternalAgentConfig.findOne({ where: { companyId } });
  const businessHours: BusinessHours = agentConfig?.metadata?.businessHours || {};
  const timezone = businessHours.timezone || "America/Sao_Paulo";

  const slotDurationMinutes =
    params.slotDuration ||
    businessHours.slotDurationMinutes ||
    60;

  const futureDaysLimit = params.days ?? businessHours.futureDaysLimit ?? 7;
  const minAdvanceHours = businessHours.minAdvanceHours ?? 0;
  const lunchBreak = businessHours.lunchBreak || null;

  // 3. Calculate now in company timezone
  const nowLocal = getNowInTimezone(timezone);
  const pad = (n: number) => String(n).padStart(2, "0");
  const nowTimeStr = `${pad(nowLocal.getHours())}:${pad(nowLocal.getMinutes())}`;
  const nowDateStr = params.date || formatDateInTimezone(nowLocal, timezone);
  const nowWeekday = getDayOfWeek(nowDateStr) as WeekdayKey;

  const nowIso = (() => {
    try {
      return new Date().toLocaleString("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return new Date().toISOString();
    }
  })();

  // 4. Build days array
  const daysResult: DayEntry[] = [];

  for (let i = 0; i < futureDaysLimit; i++) {
    const dateStr = addDays(nowDateStr, i);
    const weekday = getDayOfWeek(dateStr) as WeekdayKey;
    const dayConfig: BusinessHoursDay = businessHours.days?.[weekday] || { enabled: false, start: "", end: "" };

    let appointments: AppointmentEntry[] = [];
    if (includeAppointments || includeSlots) {
      appointments = await getAppointmentsForDay(companyId, dateStr, timezone);
    }

    const apptTimeRanges = appointments.map(a => appointmentToTimeRange(a, timezone));

    // Build busy_slots: appointments + lunch
    const busySlots: Array<{ start: string; end: string; reason: string }> = [];

    if (dayConfig.enabled) {
      for (const a of appointments) {
        const tr = appointmentToTimeRange(a, timezone);
        busySlots.push({ start: tr.startTime, end: tr.endTime, reason: "appointment" });
      }
      if (lunchBreak?.enabled && lunchBreak.start && lunchBreak.end) {
        busySlots.push({ start: lunchBreak.start, end: lunchBreak.end, reason: "lunch_break" });
      }
    }

    // Build available_slots
    let availableSlots: Array<{ start: string; end: string }> = [];
    if (includeSlots && dayConfig.enabled) {
      availableSlots = generateAvailableSlots({
        dayConfig,
        appointments: apptTimeRanges,
        lunchBreak,
        slotDurationMinutes,
        minAdvanceHours,
        referenceNow: nowLocal,
        forDate: dateStr,
        timezone,
      });
    }

    daysResult.push({
      date: dateStr,
      weekday,
      weekday_label: WEEKDAY_LABELS[weekday],
      enabled: !!dayConfig.enabled,
      business_start: dayConfig.enabled ? (dayConfig.start || null) : null,
      business_end: dayConfig.enabled ? (dayConfig.end || null) : null,
      lunch_break: lunchBreak
        ? { enabled: !!lunchBreak.enabled, start: lunchBreak.start, end: lunchBreak.end }
        : null,
      appointments: includeAppointments ? appointments : [],
      busy_slots: busySlots,
      available_slots: availableSlots,
    });
  }

  const endDate = addDays(nowDateStr, futureDaysLimit - 1);

  return {
    ok: true,
    company: {
      id: companyId,
      name: company?.name || null,
    },
    now: {
      timezone,
      date: nowDateStr,
      time: nowTimeStr,
      iso: nowIso,
      weekday: nowWeekday,
      weekday_label: WEEKDAY_LABELS[nowWeekday],
      is_business_open_now: isCompanyOpenNow(businessHours),
    },
    business_hours: buildBusinessHoursPayload(businessHours),
    calendar: {
      calendar_id: null,
      slot_duration_minutes: slotDurationMinutes,
      range: {
        start_date: nowDateStr,
        end_date: endDate,
        days: futureDaysLimit,
      },
      days: daysResult,
    },
    agent_instructions: {
      summary:
        "Use esses dados para responder sobre horário atual, expediente e disponibilidade de agenda.",
      rules: [
        "Nunca invente horários disponíveis.",
        "Use apenas available_slots para oferecer horários.",
        "Se available_slots estiver vazio em um dia, diga que não há horários disponíveis nesse dia.",
        "Respeite o fuso horário informado em now.timezone.",
        "Considere is_business_open_now para saber se o expediente está aberto agora.",
        "Ao confirmar um agendamento, use o endpoint POST /api/external/appointments.",
      ],
    },
  };
}
