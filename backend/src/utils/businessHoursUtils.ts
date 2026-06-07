export interface BusinessHoursDay {
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
  };
}
