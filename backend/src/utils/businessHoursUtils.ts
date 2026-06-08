export interface BusinessHoursDay {
  enabled: boolean;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface BusinessHoursLunchBreak {
  enabled: boolean;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface BusinessHours {
  timezone?: string;
  days?: {
    monday?:    BusinessHoursDay;
    tuesday?:   BusinessHoursDay;
    wednesday?: BusinessHoursDay;
    thursday?:  BusinessHoursDay;
    friday?:    BusinessHoursDay;
    saturday?:  BusinessHoursDay;
    sunday?:    BusinessHoursDay;
  };
  outOfHoursMessage?: string;
  inHoursMessage?: string;
  lunchBreak?: BusinessHoursLunchBreak;
  slotDurationMinutes?: number;  // default 60
  minAdvanceHours?: number;      // default 0
  futureDaysLimit?: number;      // default 7
}

const JS_DAY_TO_KEY: Record<number, keyof NonNullable<BusinessHours["days"]>> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

function parseHHMM(hhmm: string): { h: number; m: number } | null {
  if (!hhmm || !hhmm.includes(":")) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return { h, m };
}

function getNowInTimezone(timezone: string): Date {
  try {
    const nowStr = new Date().toLocaleString("en-US", { timeZone: timezone });
    return new Date(nowStr);
  } catch {
    return new Date();
  }
}

export function isCompanyOpenNow(
  businessHours: BusinessHours | null | undefined,
  now?: Date,
  timezone?: string
): boolean {
  if (!businessHours?.days) return true;

  const tz = timezone || businessHours.timezone || "America/Sao_Paulo";
  const localNow = now ? now : getNowInTimezone(tz);

  const dayKey = JS_DAY_TO_KEY[localNow.getDay()];
  const dayConfig = businessHours.days[dayKey];

  if (!dayConfig || !dayConfig.enabled) return false;

  const startParsed = parseHHMM(dayConfig.start);
  const endParsed = parseHHMM(dayConfig.end);

  if (!startParsed || !endParsed) return true;

  const currentMinutes = localNow.getHours() * 60 + localNow.getMinutes();
  const startMinutes = startParsed.h * 60 + startParsed.m;
  const endMinutes = endParsed.h * 60 + endParsed.m;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export function buildBusinessHoursPayload(
  businessHours: BusinessHours | null | undefined
): Record<string, unknown> {
  if (!businessHours?.days) return {};

  const tz = businessHours.timezone || "America/Sao_Paulo";
  const localNow = getNowInTimezone(tz);
  const dayKey = JS_DAY_TO_KEY[localNow.getDay()];
  const todayConfig = businessHours.days[dayKey];

  const pad = (n: number) => String(n).padStart(2, "0");
  const currentTime = `${pad(localNow.getHours())}:${pad(localNow.getMinutes())}`;

  return {
    timezone: tz,
    is_open_now: isCompanyOpenNow(businessHours),
    current_day: dayKey,
    current_time: currentTime,
    today: todayConfig || { enabled: false, start: "", end: "" },
    days: businessHours.days,
    lunchBreak: businessHours.lunchBreak || null,
    slotDurationMinutes: businessHours.slotDurationMinutes || 60,
    minAdvanceHours: businessHours.minAdvanceHours ?? 0,
    futureDaysLimit: businessHours.futureDaysLimit || 7,
  };
}

export function timeToMinutes(hhmm: string): number {
  const parsed = parseHHMM(hhmm);
  if (!parsed) return 0;
  return parsed.h * 60 + parsed.m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isBusySlot(
  slotStart: string,
  slotEnd: string,
  appointments: Array<{ startTime: string; endTime: string }>,
  lunchBreak?: BusinessHoursLunchBreak | null
): boolean {
  const sStart = timeToMinutes(slotStart);
  const sEnd = timeToMinutes(slotEnd);

  // Check lunch break overlap
  if (lunchBreak?.enabled && lunchBreak.start && lunchBreak.end) {
    const lStart = timeToMinutes(lunchBreak.start);
    const lEnd = timeToMinutes(lunchBreak.end);
    if (sStart < lEnd && sEnd > lStart) return true;
  }

  // Check appointments overlap
  for (const appt of appointments) {
    const aStart = timeToMinutes(appt.startTime);
    const aEnd = timeToMinutes(appt.endTime);
    if (sStart < aEnd && sEnd > aStart) return true;
  }

  return false;
}

export interface GenerateSlotsParams {
  dayConfig: BusinessHoursDay;
  appointments: Array<{ startTime: string; endTime: string }>;
  lunchBreak?: BusinessHoursLunchBreak | null;
  slotDurationMinutes: number;
  minAdvanceHours: number;
  referenceNow?: Date;
  forDate: string; // YYYY-MM-DD
  timezone: string;
}

export function generateAvailableSlots(
  params: GenerateSlotsParams
): Array<{ start: string; end: string }> {
  const { dayConfig, appointments, lunchBreak, slotDurationMinutes, minAdvanceHours, referenceNow, forDate, timezone } = params;

  if (!dayConfig.enabled || !dayConfig.start || !dayConfig.end) return [];

  const businessStart = timeToMinutes(dayConfig.start);
  const businessEnd = timeToMinutes(dayConfig.end);
  const duration = slotDurationMinutes > 0 ? slotDurationMinutes : 60;

  // Calculate cutoff time if today and minAdvanceHours > 0
  let cutoffMinutes: number | null = null;
  try {
    const now = referenceNow ? referenceNow : getNowInTimezone(timezone);
    const nowDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (nowDateStr === forDate && minAdvanceHours > 0) {
      cutoffMinutes = now.getHours() * 60 + now.getMinutes() + minAdvanceHours * 60;
    } else if (nowDateStr === forDate && minAdvanceHours === 0) {
      cutoffMinutes = now.getHours() * 60 + now.getMinutes();
    }
  } catch {
    // ignore
  }

  const slots: Array<{ start: string; end: string }> = [];
  let current = businessStart;

  while (current + duration <= businessEnd) {
    const slotStart = minutesToTime(current);
    const slotEnd = minutesToTime(current + duration);

    // Skip past slots (with advance cutoff)
    if (cutoffMinutes !== null && current < cutoffMinutes) {
      current += duration;
      continue;
    }

    if (!isBusySlot(slotStart, slotEnd, appointments, lunchBreak)) {
      slots.push({ start: slotStart, end: slotEnd });
    }

    current += duration;
  }

  return slots;
}
