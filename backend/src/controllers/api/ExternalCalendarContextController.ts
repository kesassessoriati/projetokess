import { Request, Response } from "express";
import { getCalendarContext } from "../../services/AiExternalAgentServices/CalendarContextService";

// GET /api/external/calendar/context
export const calendarContext = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    if (!req.externalAuth) {
      return res.status(401).json({ ok: false, error: "ERR_EXTERNAL_AUTH_REQUIRED", message: "Token de autenticação ausente." });
    }

    const { companyId } = req.externalAuth;
    const {
      date,
      days,
      include_slots,
      include_appointments,
      slot_duration,
    } = req.query as Record<string, string>;

    const result = await getCalendarContext({
      companyId,
      date: date || undefined,
      days: days ? parseInt(days, 10) : undefined,
      includeSlots: include_slots !== "false",
      includeAppointments: include_appointments !== "false",
      slotDuration: slot_duration ? parseInt(slot_duration, 10) : undefined,
    });

    return res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ ok: false, error: "calendar_error", message });
  }
};
