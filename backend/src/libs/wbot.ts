import * as Sentry from "@sentry/node";
import type {
  AuthenticationState,
  WAMessage,
  WAMessageKey,
  WASocket
} from "@whiskeysockets/baileys";
import { FindOptions } from "sequelize/types";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";
import MAIN_LOGGER from "@whiskeysockets/baileys/lib/Utils/logger";
import { useMultiFileAuthState } from "../helpers/useMultiFileAuthState";
import { Boom } from "@hapi/boom";
import AppError from "../errors/AppError";
import { getIO } from "./socket";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import cacheLayer from "./cache";
import ImportWhatsAppMessageService from "../services/WhatsappService/ImportWhatsAppMessageService";
import { add } from "date-fns";
import moment from "moment";
import { getTypeMessage, isValidMsg } from "../services/WbotServices/wbotMessageListener";
import { addLogs } from "../helpers/addLogs";
import NodeCache from 'node-cache';
import { Store } from "./store";
import { handleCompanionSyncFallback } from "../services/WbotServices/handleCompanionSyncFallback";
import { loadBaileys } from "../utils/loadBaileys";

const msgRetryCounterCache = new NodeCache({
  stdTTL: 600,
  maxKeys: 5000,
  checkperiod: 300,
  useClones: false
});
const msgCache = new NodeCache({
  stdTTL: 60,
  maxKeys: 5000,
  checkperiod: 300,
  useClones: false
});

const loggerBaileys = MAIN_LOGGER.child({});
loggerBaileys.level = "error";

// Creates a per-session pino wrapper that intercepts "error in handling message"
// for companion sync pkmsg failures and triggers the application-level fallback.
function makeSessionLogger(whatsappId: number, companyId: number): any {
  const base = MAIN_LOGGER.child({});
  base.level = "error";

  const extractNodeAttr = (nodeStr: string, attr: string): string | null => {
    const m = nodeStr.match(new RegExp(`${attr}='([^']+)'`));
    return m ? m[1] : null;
  };

  const maskId = (id: string | null): string => {
    if (!id || id.length < 6) return "***";
    return `${id.slice(0, 6)}***`;
  };

  return new Proxy(base, {
    get(target: any, prop: string) {
      if (prop === "error") {
        return (data: any, msg?: string, ...rest: any[]) => {
          target.error(data, msg, ...rest);
          if (
            msg === "error in handling message" &&
            typeof data?.node === "string" &&
            data.node.includes("peer_recipient_pn=")
          ) {
            // 1. Create placeholder in DB
            handleCompanionSyncFallback(data.node, whatsappId, companyId).catch(
              (err: any) => logger.warn(`[CompanionSync Fallback] ${err?.message}`)
            );

            // 2. Request real content from phone via PDO.
            // Baileys only calls requestPlaceholderResend when the CIPHERTEXT path is reached
            // gracefully. When an exception propagates to the outer catch (error in handling message),
            // that path is skipped. We call it here explicitly to ensure the phone is asked to resend.
            // requestPlaceholderResend has a 2s delay + deduplication cache, so double-calling is safe.
            const msgId = extractNodeAttr(data.node, "id");
            const peerPn = extractNodeAttr(data.node, "peer_recipient_pn");
            if (msgId && peerPn) {
              const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
              if (sessionIndex >= 0) {
                const session = sessions[sessionIndex];
                if (typeof (session as any)?.requestPlaceholderResend === "function") {
                  const msgKey = { remoteJid: peerPn, fromMe: true as const, id: msgId };
                  (session as any).requestPlaceholderResend(msgKey).then(() => {
                    logger.info(
                      `[CompanionSync Fallback] PDO resend requested: companyId=${companyId} msgId=${maskId(msgId)}`
                    );
                  }).catch((pdoErr: any) =>
                    logger.warn(
                      `[CompanionSync Fallback] PDO resend failed: companyId=${companyId} err=${pdoErr?.message}`
                    )
                  );
                } else {
                  logger.warn(
                    `[CompanionSync Fallback] requestPlaceholderResend not available on session: companyId=${companyId} whatsappId=${whatsappId}`
                  );
                }
              } else {
                logger.warn(
                  `[CompanionSync Fallback] Session not found for PDO resend: companyId=${companyId} whatsappId=${whatsappId}`
                );
              }
            }
          }
        };
      }
      const val = target[prop];
      return typeof val === "function" ? val.bind(target) : val;
    }
  });
}

type Session = WASocket & {
  id?: number;
  store?: Store;
};

const sessions: Session[] = [];

const retriesQrCodeMap = new Map<number, number>();

export default function msg() {
  return {
    get: (key: WAMessageKey) => {
      const { id } = key;
      if (!id) return;
      let data = msgCache.get(id);
      if (data) {
        try {
          let msg = JSON.parse(data as string);
          return msg?.message;
        } catch (error) {
          logger.error(error);
        }
      }
    },
    save: (msg: WAMessage) => {
      const { id } = msg.key;
      const msgtxt = JSON.stringify(msg);
      try {
        msgCache.set(id as string, msgtxt);
      } catch (error) {
        logger.error(error);
      }
    }
  }
}

export const getWbot = (whatsappId: number): Session => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);

  if (sessionIndex === -1) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }
  return sessions[sessionIndex];
};

export const restartWbot = async (
  companyId: number,
  session?: any
): Promise<void> => {
  try {
    const options: FindOptions = {
      where: {
        companyId,
      },
      attributes: ["id"],
    }

    const whatsapp = await Whatsapp.findAll(options);

    whatsapp.map(async c => {
      const sessionIndex = sessions.findIndex(s => s.id === c.id);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].ws.close();
      }

    });

  } catch (err) {
    logger.error(err);
  }
};

export const removeWbot = async (
  whatsappId: number,
  isLogout = true
): Promise<void> => {
  try {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex !== -1) {
      const session = sessions[sessionIndex];
      if (isLogout) {
        try { await session.logout(); } catch (_) {}
      }
      try { (session.ev as any).removeAllListeners(); } catch (_) {}
      try { session.ws.close(); } catch (_) {}
      sessions.splice(sessionIndex, 1);
    }
  } catch (err) {
    logger.error(err);
  }
};

export var dataMessages: any = {};

export const importingWhatsappIds = new Set<number>();

export const msgDB = msg();

export const initWASocket = async (whatsapp: Whatsapp): Promise<Session | null> => {
  return new Promise((resolve, reject) => {
    let hasSettled = false;

    const settleInitialization = (session: Session | null) => {
      if (hasSettled) return;
      hasSettled = true;
      resolve(session);
    };

    const failInitialization = (error: any) => {
      if (hasSettled) return;
      hasSettled = true;
      reject(error);
    };

    (async () => {
      try {
        const io = getIO();

        const baileys = await loadBaileys();
        const {
          default: makeWASocket,
          Browsers,
          DisconnectReason,
          fetchLatestBaileysVersion,
          isJidBroadcast,
          isJidGroup,
          jidNormalizedUser,
          makeCacheableSignalKeyStore,
          proto
        } = baileys as any;

        const whatsappUpdate = await Whatsapp.findOne({
          where: { id: whatsapp.id }
        });

        if (!whatsappUpdate) {
          settleInitialization(null);
          return;
        }

        const { id, name, allowGroup, companyId } = whatsappUpdate;

        const { version, isLatest } = await fetchLatestBaileysVersion();
        logger.info(`Versão: v${version.join(".")}, isLatest: ${isLatest}`);
        logger.info(`Starting session ${name}`);
        let retriesQrCode = 0;

        let wsocket: Session = null;
        let connectionOpened = false;
       
        const { state, saveCreds } = await useMultiFileAuthState(whatsapp);

        wsocket = makeWASocket({
          version,
          logger: makeSessionLogger(id, companyId),
          printQRInTerminal: false,
          // auth: state as AuthenticationState,
          auth: {
            creds: state.creds,
            /** caching makes the store faster to send/recv messages */
            keys: makeCacheableSignalKeyStore(state.keys, logger),
          },
          generateHighQualityLinkPreview: true,
          linkPreviewImageThumbnailWidth: 192,
          // shouldIgnoreJid: jid => isJidBroadcast(jid),

          shouldIgnoreJid: (jid) => {
            //   // const isGroupJid = !allowGroup && isJidGroup(jid)
            return isJidBroadcast(jid) || (!allowGroup && isJidGroup(jid)) //|| jid.includes('newsletter')
          },
          browser: Browsers.appropriate("Desktop"),
          defaultQueryTimeoutMs: undefined,
          msgRetryCounterCache,
          markOnlineOnConnect: false,
          retryRequestDelayMs: 500,
          // maxMsgRetryCount: 5,
          enableInteractiveMessages: true,
          emitOwnEvents: true,
          fireInitQueries: true,
          transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
          connectTimeoutMs: 25_000,
          // keepAliveIntervalMs: 60_000,
          getMessage: msgDB.get,
          patchMessageBeforeSending(message) {
            if (message.deviceSentMessage?.message?.listMessage?.listType === proto.Message.ListMessage.ListType.PRODUCT_LIST) {
              message = JSON.parse(JSON.stringify(message));
              message.deviceSentMessage.message.listMessage.listType = proto.Message.ListMessage.ListType.SINGLE_SELECT;
            }
            if (message.listMessage?.listType == proto.Message.ListMessage.ListType.PRODUCT_LIST) {
              message = JSON.parse(JSON.stringify(message));
 
              message.listMessage.listType = proto.Message.ListMessage.ListType.SINGLE_SELECT;
            }
            return message; // Adicionei este retorno que estava faltando
          }
        });

        setTimeout(async () => {
          const wpp = await Whatsapp.findByPk(whatsapp.id);
          // console.log("Status:::::",wpp.status)
          if (wpp?.importOldMessages && wpp.status === "CONNECTED") {
            let dateOldLimit = new Date(wpp.importOldMessages).getTime();
            let dateRecentLimit = new Date(wpp.importRecentMessages).getTime();

            addLogs({
              fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`, forceNewFile: true,
              text: `Aguardando conexão para iniciar a importação de mensagens:
  Whatsapp nome: ${wpp.name}
  Whatsapp Id: ${wpp.id}
  Criação do arquivo de logs: ${moment().format("DD/MM/YYYY HH:mm:ss")}
  Selecionado Data de inicio de importação: ${moment(dateOldLimit).format("DD/MM/YYYY HH:mm:ss")} 
  Selecionado Data final da importação: ${moment(dateRecentLimit).format("DD/MM/YYYY HH:mm:ss")} 
  `})

            const statusImportMessages = new Date().getTime();

            await wpp.update({
              statusImportMessages
            });
            wsocket.ev.on("messaging-history.set", async (messageSet: any) => {
              //if(messageSet.isLatest){

              const statusImportMessages = new Date().getTime();

              await wpp.update({
                statusImportMessages
              });
              const whatsappId = whatsapp.id;
              let filteredMessages = messageSet.messages
              let filteredDateMessages = []
              filteredMessages.forEach(msg => {
                const ts = msg.messageTimestamp;
                const timestampMsg = Math.floor((typeof ts === "object" && ts !== null ? ts.low : Number(ts)) * 1000)
                if (isValidMsg(msg) && dateOldLimit < timestampMsg && dateRecentLimit > timestampMsg) {
                  if (msg.key?.remoteJid.split("@")[1] != "g.us") {
                    addLogs({
                      fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`, text: `Adicionando mensagem para pos processamento:
  Não é Mensagem de GRUPO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  Data e hora da mensagem: ${moment(timestampMsg).format("DD/MM/YYYY HH:mm:ss")}
  Contato da Mensagem : ${msg.key?.remoteJid}
  Tipo da mensagem : ${getTypeMessage(msg)}
  
  `})
                    filteredDateMessages.push(msg)
                  } else {
                    if (wpp?.importOldMessagesGroups) {
                      addLogs({
                        fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`, text: `Adicionando mensagem para pos processamento:
  Mensagem de GRUPO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  Data e hora da mensagem: ${moment(timestampMsg).format("DD/MM/YYYY HH:mm:ss")}
  Contato da Mensagem : ${msg.key?.remoteJid}
  Tipo da mensagem : ${getTypeMessage(msg)}
  
  `})
                      filteredDateMessages.push(msg)
                    }
                  }
                }

              });


              if (!dataMessages?.[whatsappId]) {
                dataMessages[whatsappId] = [];

                dataMessages[whatsappId].unshift(...filteredDateMessages);
              } else {
                dataMessages[whatsappId].unshift(...filteredDateMessages);
              }

              setTimeout(async () => {
                const wpp = await Whatsapp.findByPk(whatsappId);




                io.of(String(companyId))
                  .emit(`importMessages-${wpp.companyId}`, {
                    action: "update",
                    status: { this: -1, all: -1 }
                  });



                io.of(String(companyId))
                  .emit(`company-${companyId}-whatsappSession`, {
                    action: "update",
                    session: wpp
                  });
                //console.log(JSON.stringify(wpp, null, 2));
              }, 500);

              setTimeout(async () => {


                const wpp = await Whatsapp.findByPk(whatsappId);

                if (wpp?.importOldMessages) {
                  let isTimeStamp = !isNaN(
                    new Date(Math.floor(parseInt(wpp?.statusImportMessages))).getTime()
                  );

                  if (isTimeStamp) {
                    const ultimoStatus = new Date(
                      Math.floor(parseInt(wpp?.statusImportMessages))
                    ).getTime();
                    const dataLimite = +add(ultimoStatus, { seconds: +45 }).getTime();

                    if (dataLimite < new Date().getTime() && !importingWhatsappIds.has(wpp.id)) {
                      //console.log("Pronto para come?ar")
                      importingWhatsappIds.add(wpp.id);
                      ImportWhatsAppMessageService(wpp.id)
                      wpp.update({
                        statusImportMessages: "Running"
                      })

                    } else {
                      //console.log("Aguardando inicio")
                    }
                  }
                }
                io.of(String(companyId))
                  .emit(`company-${companyId}-whatsappSession`, {
                    action: "update",
                    session: wpp
                  });
              }, 1000 * 45);

            });
          }

        }, 2500);




        wsocket.ev.on(
          "connection.update",
          async ({ connection, lastDisconnect, qr }) => {
            logger.info(
              `Socket  ${name} Connection Update ${connection || ""} ${lastDisconnect ? lastDisconnect.error.message : ""
              }`
            );

            if (connection === "close") {
              console.log("DESCONECTOU", JSON.stringify(lastDisconnect, null, 2))
              logger.info(
                `Socket  ${name} Connection Update ${connection || ""} ${lastDisconnect ? lastDisconnect.error.message : ""
                }`
              );
              const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
              if ((lastDisconnect?.error as Boom)?.output?.statusCode === 403) {
                await whatsapp.update({ status: "PENDING", session: "" });
                await DeleteBaileysService(whatsapp.id);
                await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
                io.of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });
                removeWbot(id, false);
              }
              if (
                statusCode !==
                DisconnectReason.loggedOut
              ) {
                removeWbot(id, false);
                setTimeout(
                  () => StartWhatsAppSession(whatsapp, whatsapp.companyId),
                  2000
                );
              } else {
                await whatsapp.update({ status: "PENDING", session: "" });
                await DeleteBaileysService(whatsapp.id);
                await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
                io.of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });
                removeWbot(id, false);
                setTimeout(
                  () => StartWhatsAppSession(whatsapp, whatsapp.companyId),
                  2000
                );
              }

              if (!connectionOpened) {
                logger.info(
                  `[Wbot] Sessão ${name} encerrada antes de abrir. Liberando inicialização para novo socket (status=${statusCode || "unknown"}).`
                );
                settleInitialization(null);
              }
            }

            if (connection === "open") {
              connectionOpened = true;
              await whatsapp.update({
                status: "CONNECTED",
                qrcode: "",
                retries: 0,
                number:
                  wsocket.type === "md"
                    ? jidNormalizedUser((wsocket as WASocket).user.id).split("@")[0]
                    : "-"
              });

              io.of(String(companyId))
                .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                  action: "update",
                  session: whatsapp
                });

              const sessionIndex = sessions.findIndex(
                s => s.id === whatsapp.id
              );
              if (sessionIndex === -1) {
                wsocket.id = whatsapp.id;
                sessions.push(wsocket);
              }

              settleInitialization(wsocket);
            }

            if (qr !== undefined && whatsapp.notificameHub !== true) {
              if (retriesQrCodeMap.get(id) && retriesQrCodeMap.get(id) >= 3) {
                await whatsappUpdate.update({
                  status: "DISCONNECTED",
                  qrcode: ""
                });
                await DeleteBaileysService(whatsappUpdate.id);
                io.of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsappUpdate
                  });
                wsocket.ev.removeAllListeners("connection.update");
                wsocket.ws.close();
                wsocket = null;
                retriesQrCodeMap.delete(id);
                if (!connectionOpened) {
                  settleInitialization(null);
                }
              } else {
                logger.info(`Session QRCode Generate ${name}`);
                retriesQrCodeMap.set(id, (retriesQrCode += 1));

                await whatsapp.update({
                  qrcode: qr,
                  status: "qrcode",
                  retries: 0,
                  number: ""
                });
                const sessionIndex = sessions.findIndex(
                  s => s.id === whatsapp.id
                );

                if (sessionIndex === -1) {
                  wsocket.id = whatsapp.id;
                  sessions.push(wsocket);
                }

                io.of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });
              }
            }
          }
        );
        wsocket.ev.on("creds.update", saveCreds);
        // wsocket.store = store;
        // store.bind(wsocket.ev);
      } catch (error) {
        Sentry.captureException(error);
        console.log(error);
        failInitialization(error);
      }
    })();
  });
};
