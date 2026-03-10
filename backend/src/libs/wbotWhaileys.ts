// @ts-nocheck
import * as Sentry from "@sentry/node";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";
import { Boom } from "@hapi/boom";
import { getIO } from "./socket";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import cacheLayer from "./cache";
import NodeCache from "node-cache";

/**
 * Canal paralelo usando a biblioteca "whaileys" (fork canove do Baileys).
 * Funciona de forma independente do canal @whiskeysockets/baileys.
 */

const msgRetryCounterCache = new NodeCache({
  stdTTL: 600,
  maxKeys: 1000,
  checkperiod: 300,
  useClones: false
});

type WhaileysSession = {
  id?: number;
  sendMessage: Function;
  ws: { close: () => void };
  ev: {
    on: (event: string, handler: Function) => void;
    removeAllListeners: (event?: string) => void;
  };
  logout: () => Promise<void>;
  user?: { id: string };
  type?: string;
};

const whaileySessions: WhaileysSession[] = [];
const retriesQrCodeMap = new Map<number, number>();

export const getWbotWhaileys = (whatsappId: number): WhaileysSession => {
  const sessionIndex = whaileySessions.findIndex(s => s.id === whatsappId);
  if (sessionIndex === -1) {
    throw new Error(`ERR_WAPP_WHAILEYS_NOT_INITIALIZED:${whatsappId}`);
  }
  return whaileySessions[sessionIndex];
};

export const removeWbotWhaileys = async (
  whatsappId: number,
  isLogout = true
): Promise<void> => {
  try {
    const sessionIndex = whaileySessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex !== -1) {
      if (isLogout) {
        try {
          await whaileySessions[sessionIndex].logout();
        } catch (_) {}
        whaileySessions[sessionIndex].ws.close();
      }
      whaileySessions.splice(sessionIndex, 1);
    }
  } catch (err) {
    logger.error(`[Whaileys] removeWbotWhaileys error: ${err}`);
  }
};

export const initWASocketWhaileys = async (
  whatsapp: Whatsapp
): Promise<WhaileysSession> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Importação dinâmica da biblioteca whaileys
      let makeWASocket: any;
      let DisconnectReason: any;
      let useMultiFileAuthState: any;
      let Browsers: any;
      let makeCacheableSignalKeyStore: any;
      let jidNormalizedUser: any;
      let isJidBroadcast: any;
      let isJidGroup: any;

      try {
        const whaileys = await import("whaileys");
        makeWASocket = whaileys.default || whaileys.makeWASocket;
        DisconnectReason = whaileys.DisconnectReason;
        useMultiFileAuthState = whaileys.useMultiFileAuthState;
        Browsers = whaileys.Browsers;
        makeCacheableSignalKeyStore = whaileys.makeCacheableSignalKeyStore;
        jidNormalizedUser = whaileys.jidNormalizedUser;
        isJidBroadcast = whaileys.isJidBroadcast;
        isJidGroup = whaileys.isJidGroup;
      } catch (err) {
        logger.error(`[Whaileys] Falha ao importar biblioteca whaileys: ${err}`);
        return reject(err);
      }

      const io = getIO();

      const whatsappUpdate = await Whatsapp.findOne({
        where: { id: whatsapp.id }
      });
      if (!whatsappUpdate) return reject(new Error("Whatsapp not found"));

      const { id, name, allowGroup, companyId } = whatsappUpdate;

      logger.info(`[Whaileys] Iniciando sessão ${name} (id=${id})`);

      let retriesQrCode = 0;

      // Auth state — usa diretório separado para não conflitar com Baileys
      const sessionDir = `whaileys_sessions/${whatsapp.companyId}/${whatsapp.id}`;
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      let wsocket: WhaileysSession = makeWASocket({
        logger: { level: "silent", trace: () => {}, debug: () => {}, info: () => {}, warn: logger.warn.bind(logger), error: logger.error.bind(logger), fatal: logger.error.bind(logger), child: () => ({}) },
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore ? makeCacheableSignalKeyStore(state.keys, logger) : state.keys
        },
        browser: Browsers ? Browsers.appropriate("Desktop") : ["AtendZappy", "Chrome", "120.0"],
        msgRetryCounterCache,
        markOnlineOnConnect: false,
        defaultQueryTimeoutMs: undefined,
        connectTimeoutMs: 25_000,
        retryRequestDelayMs: 500,
        shouldIgnoreJid: (jid: string) => {
          if (isJidBroadcast && isJidGroup) {
            return isJidBroadcast(jid) || (!allowGroup && isJidGroup(jid));
          }
          return false;
        },
        getMessage: async () => undefined
      });

      // Importação circular: usamos require dinâmico para evitar circular import
      const { StartWhaileysSession } = await import(
        "../services/WbotServices/StartWhaileysSession"
      );

      wsocket.ev.on(
        "connection.update",
        async ({ connection, lastDisconnect, qr }: any) => {
          logger.info(
            `[Whaileys] ${name} connection.update: ${connection || ""} ${lastDisconnect?.error?.message || ""}`
          );

          if (connection === "close") {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

            if (statusCode === 403 || statusCode === DisconnectReason?.loggedOut) {
              await whatsapp.update({ status: "PENDING", session: "" });
              await DeleteBaileysService(whatsapp.id);
              await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
              io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
                action: "update",
                session: whatsapp
              });
              removeWbotWhaileys(id, false);
            } else {
              removeWbotWhaileys(id, false);
              setTimeout(() => StartWhaileysSession(whatsapp, companyId), 2000);
            }
          }

          if (connection === "open") {
            const number = jidNormalizedUser
              ? jidNormalizedUser(wsocket?.user?.id || "").split("@")[0]
              : "";

            await whatsapp.update({
              status: "CONNECTED",
              qrcode: "",
              retries: 0,
              number
            });

            io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
              action: "update",
              session: whatsapp
            });

            const sessionIndex = whaileySessions.findIndex(s => s.id === whatsapp.id);
            if (sessionIndex === -1) {
              wsocket.id = whatsapp.id;
              whaileySessions.push(wsocket);
            }

            resolve(wsocket);
          }

          if (qr !== undefined) {
            const currentRetries = retriesQrCodeMap.get(id) || 0;
            if (currentRetries >= 3) {
              await whatsappUpdate.update({ status: "DISCONNECTED", qrcode: "" });
              await DeleteBaileysService(whatsappUpdate.id);
              await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
              io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
                action: "update",
                session: whatsappUpdate
              });
              wsocket.ev.removeAllListeners("connection.update");
              wsocket.ws.close();
              wsocket = null;
              retriesQrCodeMap.delete(id);
            } else {
              logger.info(`[Whaileys] QRCode gerado para ${name}`);
              retriesQrCodeMap.set(id, retriesQrCode + 1);
              retriesQrCode += 1;

              await whatsapp.update({
                qrcode: qr,
                status: "qrcode",
                retries: 0,
                number: ""
              });

              const sessionIndex = whaileySessions.findIndex(s => s.id === whatsapp.id);
              if (sessionIndex === -1) {
                wsocket.id = whatsapp.id;
                whaileySessions.push(wsocket);
              }

              io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
                action: "update",
                session: whatsapp
              });
            }
          }
        }
      );

      wsocket.ev.on("creds.update", saveCreds);
    } catch (error) {
      Sentry.captureException(error);
      logger.error(`[Whaileys] initWASocketWhaileys error: ${error}`);
      reject(error);
    }
  });
};
