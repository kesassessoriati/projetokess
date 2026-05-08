import { Server as HttpServer, IncomingMessage } from "http";
import { Server as HttpsServer } from "https";
import WebSocket, { WebSocketServer } from "ws";
import { Socket } from "net";
import SipSetting from "../models/SipSetting";
import logger from "../utils/logger";

const SIP_PROXY_PATH = "/sip-ws";

export const initSipWsProxy = (server: HttpServer | HttpsServer): void => {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request: IncomingMessage, socket: Socket, head: Buffer) => {
    let pathname: string;
    try {
      pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
    } catch {
      return;
    }

    if (pathname !== SIP_PROXY_PATH) {
      return;
    }

    const url = new URL(request.url!, `http://${request.headers.host}`);
    const companyId = url.searchParams.get("companyId");

    if (!companyId || isNaN(Number(companyId))) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    let setting: SipSetting | null;
    try {
      setting = await SipSetting.findOne({
        where: { companyId: Number(companyId), enabled: true }
      });
    } catch (err) {
      logger.error("[SIP Proxy] DB error looking up SipSetting:", err);
      socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      socket.destroy();
      return;
    }

    if (!setting) {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    const targetUrl = `ws://${setting.host}:${setting.port}${setting.wsPath || ""}`;
    const subprotocol = request.headers["sec-websocket-protocol"] as string | undefined;

    wss.handleUpgrade(request, socket, head, (clientWs) => {
      const targetWs = new WebSocket(targetUrl, subprotocol ? subprotocol.split(",").map(s => s.trim()) : undefined);

      targetWs.once("open", () => {
        logger.info(`[SIP Proxy] company=${companyId} connected to ${targetUrl}`);

        clientWs.on("message", (data, isBinary) => {
          if (targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(data, { binary: isBinary });
          }
        });

        targetWs.on("message", (data, isBinary) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data, { binary: isBinary });
          }
        });

        clientWs.on("close", (code) => {
          if (targetWs.readyState === WebSocket.OPEN || targetWs.readyState === WebSocket.CONNECTING) {
            targetWs.close(code);
          }
        });

        targetWs.on("close", (code) => {
          if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
            clientWs.close(code);
          }
        });

        clientWs.on("error", (err) => {
          logger.warn(`[SIP Proxy] client error company=${companyId}:`, err.message);
          targetWs.terminate();
        });

        targetWs.on("error", (err) => {
          logger.warn(`[SIP Proxy] target error company=${companyId}:`, err.message);
          clientWs.terminate();
        });
      });

      targetWs.once("error", (err) => {
        logger.error(`[SIP Proxy] Cannot connect to SIP server ${targetUrl}:`, err.message);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(1011, "SIP server unreachable");
        }
      });
    });
  });

  logger.info(`[SIP Proxy] WebSocket proxy ready at path: ${SIP_PROXY_PATH}`);
};
