import { Request, Response } from "express";
import SipSetting from "../models/SipSetting";
import AppError from "../errors/AppError";

const normalizeDid = (did: any) => {
  if (!did) {
    return null;
  }

  const number = String(did.number || did.value || "").replace(/\D/g, "");
  if (!number) {
    return null;
  }

  return {
    number,
    label: String(did.label || did.name || number).trim(),
    default: Boolean(did.default)
  };
};

const normalizeDids = (metadata: any = {}) => {
  const dids = Array.isArray(metadata?.dids)
    ? metadata.dids.map(normalizeDid).filter(Boolean)
    : [];

  const fallbackDid = normalizeDid({
    number: metadata?.trunkDid || metadata?.did || metadata?.defaultDid,
    label: "Principal",
    default: true
  });

  if (!dids.length && fallbackDid) {
    dids.push(fallbackDid);
  }

  if (!dids.length) {
    return [];
  }

  const defaultIndex = dids.findIndex((did: any) => did.default);
  return dids.map((did: any, index: number) => ({
    ...did,
    default: defaultIndex >= 0 ? index === defaultIndex : index === 0
  }));
};

const serializeSipSetting = (record: SipSetting | null) => {
  if (!record) {
    return null;
  }

  const payload = record.toJSON() as any;
  delete payload.password;
  payload.metadata = payload.metadata || {};
  payload.dids = normalizeDids(payload.metadata);
  payload.websocketUrl = `${payload.websocketProtocol || "wss"}://${payload.host}:${payload.port}${payload.wsPath || ""}`;
  return payload;
};

const validateBody = (body: any) => {
  if (!body.host || !String(body.host).trim()) {
    throw new AppError("Host SIP é obrigatório.", 400);
  }

  const port = Number(body.port);
  if (!port || port < 1 || port > 65535) {
    throw new AppError("Porta SIP inválida.", 400);
  }

  if (!body.username || !String(body.username).trim()) {
    throw new AppError("Usuário SIP é obrigatório.", 400);
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const setting = await SipSetting.findOne({
    where: { companyId }
  });

  return res.json(serializeSipSetting(setting));
};

export const runtime = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const setting = await SipSetting.findOne({
    where: { companyId, enabled: true }
  });

  if (!setting) {
    return res.json(null);
  }

  const payload = setting.toJSON() as any;
  payload.metadata = payload.metadata || {};
  payload.dids = normalizeDids(payload.metadata);
  const directWsUrl = `${payload.websocketProtocol || "wss"}://${payload.host}:${payload.port}${payload.wsPath || ""}`;
  payload.websocketUrl = directWsUrl;
  payload.userUri = `sip:${payload.username}@${payload.sipDomain || payload.host}`;

  // Se o servidor SIP usa WS simples (porta 80 / ws://), fornece a URL do proxy
  // interno do backend (wss://) para evitar bloqueio de mixed content no navegador.
  const sipUsesPlainWs = (payload.websocketProtocol || "wss") === "ws";
  if (sipUsesPlainWs) {
    const backendUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
    const proxyBase = backendUrl.startsWith("http://")
      ? backendUrl.replace("http://", "wss://")
      : backendUrl.replace("https://", "wss://");
    payload.proxyWebsocketUrl = `${proxyBase}/sip-ws?companyId=${companyId}`;
  }

  return res.json(payload);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  validateBody(req.body);

  const {
    label,
    host,
    port,
    websocketProtocol,
    wsPath,
    sipDomain,
    username,
    authUser,
    password,
    displayName,
    outboundProxy,
    stunServer,
    registerOnStartup,
    enabled,
    metadata
  } = req.body;

  let setting = await SipSetting.findOne({ where: { companyId } });
  const normalizedDids = normalizeDids(metadata);

  const payload = {
    label: label?.trim() || "Webphone Principal",
    host: host?.trim(),
    port: Number(port),
    websocketProtocol: websocketProtocol || "wss",
    wsPath: wsPath?.trim() || "",
    sipDomain: sipDomain?.trim() || host?.trim(),
    username: username?.trim(),
    authUser: authUser?.trim() || username?.trim(),
    password: password ? String(password).trim() : undefined,
    displayName: displayName?.trim() || username?.trim(),
    outboundProxy: outboundProxy?.trim() || null,
    stunServer: stunServer?.trim() || null,
    registerOnStartup: registerOnStartup !== false,
    enabled: Boolean(enabled),
    metadata: {
      ...(metadata || {}),
      dids: normalizedDids
    }
  };

  if (setting) {
    await setting.update(payload);
  } else {
    setting = await SipSetting.create({
      ...payload,
      companyId
    });
  }

  return res.status(200).json(serializeSipSetting(setting));
};

export const test = async (req: Request, res: Response): Promise<Response> => {
  validateBody(req.body);

  const normalized = {
    websocketUrl: `${req.body.websocketProtocol || "wss"}://${req.body.host}:${Number(req.body.port)}${req.body.wsPath || ""}`,
    sipUri: `sip:${req.body.username}@${req.body.sipDomain || req.body.host}`
  };

  return res.status(200).json({
    message: "Configuração SIP validada com sucesso.",
    normalized
  });
};
