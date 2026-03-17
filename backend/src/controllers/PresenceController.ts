import { Request, Response } from "express";
import AppError from "../errors/AppError";
import { getWbot } from "../libs/wbot";
import Whatsapp from "../models/Whatsapp";

export const sendTyping = async (req: Request, res: Response): Promise<Response> => {
  const { number, whatsappId, duration = 3000 } = req.body;
  const companyId = req.externalAuth?.companyId;

  if (!number || !whatsappId) {
    throw new AppError("ERR_MISSING_PARAMS: number e whatsappId são obrigatórios", 400);
  }

  const whatsapp = await Whatsapp.findOne({ where: { id: whatsappId, companyId } });
  if (!whatsapp) {
    throw new AppError("ERR_WHATSAPP_NOT_FOUND", 404);
  }

  const wbot = getWbot(Number(whatsappId));
  const jid = `${String(number).replace(/\D/g, "")}@s.whatsapp.net`;

  await wbot.presenceSubscribe(jid);
  await wbot.sendPresenceUpdate("composing", jid);

  setTimeout(async () => {
    try {
      await wbot.sendPresenceUpdate("paused", jid);
    } catch (_) {}
  }, Number(duration));

  return res.json({ ok: true, jid, duration: Number(duration) });
};

export const stopTyping = async (req: Request, res: Response): Promise<Response> => {
  const { number, whatsappId } = req.body;
  const companyId = req.externalAuth?.companyId;

  if (!number || !whatsappId) {
    throw new AppError("ERR_MISSING_PARAMS: number e whatsappId são obrigatórios", 400);
  }

  const whatsapp = await Whatsapp.findOne({ where: { id: whatsappId, companyId } });
  if (!whatsapp) {
    throw new AppError("ERR_WHATSAPP_NOT_FOUND", 404);
  }

  const wbot = getWbot(Number(whatsappId));
  const jid = `${String(number).replace(/\D/g, "")}@s.whatsapp.net`;

  await wbot.sendPresenceUpdate("paused", jid);

  return res.json({ ok: true, jid });
};
