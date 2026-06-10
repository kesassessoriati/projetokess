import { Request, Response } from "express";
import SipSetting from "../models/SipSetting";
import AppError from "../errors/AppError";
import {
  ensureSipSettingDids,
  normalizeSipDids,
  syncSipSettingDids
} from "../services/SyncSipSettingDidsService";

const DEFAULT_WEBPHONE_HOST = process.env.SIP_WEBPHONE_HOST || "sip.wapainel.com.br";
const DEFAULT_WEBPHONE_PORT = Number(process.env.SIP_WEBPHONE_PORT || 443);
const DEFAULT_WEBPHONE_PROTOCOL = process.env.SIP_WEBPHONE_PROTOCOL || "wss";
const DEFAULT_WEBPHONE_WS_PATH = process.env.SIP_WEBPHONE_WS_PATH || "/ws";
const DEFAULT_INTERNAL_SIP_DOMAIN = process.env.SIP_INTERNAL_DOMAIN || DEFAULT_WEBPHONE_HOST;

const getProviderMetadata = (metadata: any = {}) => {
  if (metadata?.providerConfig && typeof metadata.providerConfig === "object") {
    return metadata.providerConfig;
  }

  if (metadata?.provider && typeof metadata.provider === "object") {
    return metadata.provider;
  }

  return {};
};

const sanitizeMetadata = (metadata: any = {}) => {
  const providerConfig = { ...getProviderMetadata(metadata) };
  delete providerConfig.password;
  delete providerConfig.providerPassword;

  const nextMetadata = {
    ...metadata,
    providerConfig
  };

  if (nextMetadata.provider && typeof nextMetadata.provider === "object") {
    delete nextMetadata.provider.password;
    delete nextMetadata.provider.providerPassword;
  }

  return nextMetadata;
};

const serializeSipSetting = async (record: SipSetting | null) => {
  if (!record) {
    return null;
  }

  const payload = record.toJSON() as any;
  delete payload.password;
  payload.metadata = sanitizeMetadata(payload.metadata || {});
  payload.dids = await ensureSipSettingDids(record);
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

  return res.json(await serializeSipSetting(setting));
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
  payload.metadata = sanitizeMetadata(payload.metadata || {});
  payload.dids = await ensureSipSettingDids(setting);
  const directWsUrl = `${payload.websocketProtocol || "wss"}://${payload.host}:${payload.port}${payload.wsPath || ""}`;
  payload.websocketUrl = directWsUrl;
  payload.userUri = `sip:${payload.username}@${payload.sipDomain || payload.host}`;
  payload.defaultDid = (payload.dids.find((did: any) => did.default) || payload.dids[0] || null)?.number || null;
  payload.availableDids = payload.dids.map((did: any) => did.number);

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
  const normalizedDids = normalizeSipDids(metadata);
  const previousMetadata = (setting?.metadata || {}) as any;
  const incomingProviderConfig = { ...getProviderMetadata(metadata) };
  const previousProviderConfig = { ...getProviderMetadata(previousMetadata) };
  const providerPassword =
    incomingProviderConfig.password ||
    incomingProviderConfig.providerPassword ||
    previousProviderConfig.password ||
    previousProviderConfig.providerPassword ||
    null;

  delete incomingProviderConfig.providerPassword;
  if (providerPassword) {
    incomingProviderConfig.password = String(providerPassword).trim();
  } else {
    delete incomingProviderConfig.password;
  }

  const nextMetadata = {
    ...(metadata || {}),
    providerConfig: incomingProviderConfig,
    dids: normalizedDids
  };

  const payload = {
    label: label?.trim() || "Webphone Principal",
    host: host?.trim() || DEFAULT_WEBPHONE_HOST,
    port: Number(port) || DEFAULT_WEBPHONE_PORT,
    websocketProtocol: websocketProtocol || DEFAULT_WEBPHONE_PROTOCOL,
    wsPath: wsPath?.trim() || DEFAULT_WEBPHONE_WS_PATH,
    sipDomain: sipDomain?.trim() || DEFAULT_INTERNAL_SIP_DOMAIN,
    username: username?.trim(),
    authUser: authUser?.trim() || username?.trim(),
    password: password ? String(password).trim() : undefined,
    displayName: displayName?.trim() || username?.trim(),
    outboundProxy: outboundProxy?.trim() || null,
    stunServer: stunServer?.trim() || null,
    registerOnStartup: registerOnStartup !== false,
    enabled: Boolean(enabled),
    metadata: nextMetadata
  };

  if (setting) {
    await setting.update(payload);
  } else {
    setting = await SipSetting.create({
      ...payload,
      companyId
    });
  }

  await syncSipSettingDids(setting, payload.metadata);

  return res.status(200).json(await serializeSipSetting(setting));
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
