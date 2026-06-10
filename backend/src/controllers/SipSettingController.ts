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
const DEFAULT_WEBPHONE_DOMAIN = process.env.SIP_WEBPHONE_DOMAIN || "sip.wapainel.com.br";

const getProviderMetadata = (metadata: any = {}) => {
  if (metadata?.providerConfig && typeof metadata.providerConfig === "object") {
    return metadata.providerConfig;
  }

  if (metadata?.provider && typeof metadata.provider === "object") {
    return metadata.provider;
  }

  return {};
};

const stripSensitiveKeys = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(stripSensitiveKeys);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.entries(value).reduce((acc, [key, entry]) => {
    if (/password|providerPassword|secret/i.test(key)) {
      return acc;
    }

    return {
      ...acc,
      [key]: stripSensitiveKeys(entry)
    };
  }, {} as any);
};

const firstDidNumber = (dids: any[] = []) => {
  const did = dids.find(item => item?.default) || dids[0] || null;
  return did?.number || null;
};

const isProviderLikeHost = (value: any, metadata: any = {}, providerConfig: any = {}) => {
  const normalizedValue = String(value || "").trim().toLowerCase();
  if (!normalizedValue) {
    return false;
  }

  const candidates = [
    providerConfig.host,
    providerConfig.domain,
    providerConfig.trunkHost,
    metadata.trunkHost,
    metadata.providerHost,
    metadata.providerDomain
  ]
    .map(item => String(item || "").trim().toLowerCase())
    .filter(Boolean);

  return candidates.includes(normalizedValue);
};

const hydrateProviderConfig = (payload: any = {}, dids: any[] = []) => {
  const metadata = payload.metadata || {};
  const existingProviderConfig = getProviderMetadata(metadata);
  const providerType =
    existingProviderConfig.type ||
    (typeof metadata.provider === "string" ? metadata.provider : null) ||
    metadata.providerType ||
    "custom";
  const defaultDid = firstDidNumber(dids) || metadata.trunkDid || metadata.defaultDid || null;
  const legacyHost =
    existingProviderConfig.host ||
    existingProviderConfig.trunkHost ||
    metadata.trunkHost ||
    metadata.providerHost ||
    (payload.host && payload.host !== DEFAULT_WEBPHONE_HOST ? payload.host : null);
  const legacyDomain =
    existingProviderConfig.domain ||
    metadata.providerDomain ||
    metadata.trunkHost ||
    (payload.sipDomain && payload.sipDomain !== DEFAULT_WEBPHONE_DOMAIN ? payload.sipDomain : null) ||
    legacyHost;

  return stripSensitiveKeys({
    type: providerType,
    ...existingProviderConfig,
    host: legacyHost || existingProviderConfig.host || "",
    domain: legacyDomain || existingProviderConfig.domain || legacyHost || "",
    username: existingProviderConfig.username || metadata.providerUsername || payload.username || "",
    authUser:
      existingProviderConfig.authUser ||
      metadata.providerAuthUser ||
      payload.authUser ||
      payload.username ||
      "",
    mainDid: existingProviderConfig.mainDid || metadata.trunkDid || defaultDid || "",
    trunkHost: existingProviderConfig.trunkHost || metadata.trunkHost || legacyHost || "",
    transport: existingProviderConfig.transport || metadata.transport || "udp"
  });
};

const getWebphoneRuntimeConfig = (payload: any, providerConfig: any = {}) => {
  const metadata = payload.metadata || {};
  const host = isProviderLikeHost(payload.host, metadata, providerConfig)
    ? DEFAULT_WEBPHONE_HOST
    : payload.host || DEFAULT_WEBPHONE_HOST;
  const sipDomain = isProviderLikeHost(payload.sipDomain, metadata, providerConfig)
    ? DEFAULT_WEBPHONE_DOMAIN
    : payload.sipDomain || DEFAULT_WEBPHONE_DOMAIN;

  return {
    host,
    port: Number(payload.port) || DEFAULT_WEBPHONE_PORT,
    websocketProtocol: payload.websocketProtocol || DEFAULT_WEBPHONE_PROTOCOL,
    wsPath: payload.wsPath || DEFAULT_WEBPHONE_WS_PATH,
    sipDomain
  };
};

const buildWebsocketUrl = (webphoneConfig: any) => {
  const portSuffix = Number(webphoneConfig.port) === 443 ? "" : `:${webphoneConfig.port}`;
  return `${webphoneConfig.websocketProtocol}://${webphoneConfig.host}${portSuffix}${webphoneConfig.wsPath || ""}`;
};

const sanitizeMetadata = (metadata: any = {}, payload: any = {}, dids: any[] = []) => (
  stripSensitiveKeys({
    ...metadata,
    providerConfig: hydrateProviderConfig({ ...payload, metadata }, dids)
  })
);

const serializeSipSetting = async (record: SipSetting | null) => {
  if (!record) {
    return null;
  }

  const payload = record.toJSON() as any;
  delete payload.password;
  payload.dids = await ensureSipSettingDids(record);
  payload.metadata = sanitizeMetadata(payload.metadata || {}, payload, payload.dids);
  const webphoneConfig = getWebphoneRuntimeConfig(payload, payload.metadata.providerConfig);
  Object.assign(payload, webphoneConfig);
  payload.websocketUrl = buildWebsocketUrl(webphoneConfig);
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
  payload.dids = await ensureSipSettingDids(setting);
  payload.metadata = sanitizeMetadata(payload.metadata || {}, payload, payload.dids);
  const webphoneConfig = getWebphoneRuntimeConfig(payload, payload.metadata.providerConfig);
  Object.assign(payload, webphoneConfig);
  const directWsUrl = buildWebsocketUrl(webphoneConfig);
  payload.websocketUrl = directWsUrl;
  payload.userUri = `sip:${payload.username}@${webphoneConfig.sipDomain}`;
  payload.defaultDid = (payload.dids.find((did: any) => did.default) || payload.dids[0] || null)?.number || null;
  payload.availableDids = payload.dids.map((did: any) => did.number);

  // Se o servidor SIP usa WS simples (porta 80 / ws://), fornece a URL do proxy
  // interno do backend (wss://) para evitar bloqueio de mixed content no navegador.
  const sipUsesPlainWs = webphoneConfig.websocketProtocol === "ws";
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
    sipDomain: sipDomain?.trim() || DEFAULT_WEBPHONE_DOMAIN,
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
