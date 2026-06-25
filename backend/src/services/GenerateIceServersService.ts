import crypto from "crypto";
import fs from "fs";
import logger from "../utils/logger";

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceServersResult {
  iceServers: IceServer[];
  ttl: number;
}

// Lê o TURN_SECRET de forma segura: prioriza arquivo (Docker secret) e cai
// para variável de ambiente. Nunca loga o valor.
const readTurnSecret = (): string => {
  const secretFile = process.env.TURN_SECRET_FILE;
  if (secretFile) {
    try {
      const fromFile = fs.readFileSync(secretFile, "utf8").trim();
      if (fromFile) {
        return fromFile;
      }
    } catch (err) {
      logger.warn(
        "[ice-servers] TURN_SECRET_FILE definido mas ilegível; usando TURN_SECRET (env)"
      );
    }
  }
  return (process.env.TURN_SECRET || "").trim();
};

// Gera iceServers (STUN + TURN) com credencial temporária HMAC compatível com
// o coturn em modo use-auth-secret (TURN REST API):
//   username   = "{expiry}:{userId}"
//   credential = base64(HMAC-SHA1(TURN_SECRET, username))
// O segredo nunca vai para o frontend; apenas a credencial efêmera.
const GenerateIceServersService = (
  userId: number,
  _companyId?: number
): IceServersResult => {
  const host = process.env.TURN_HOST || process.env.TURN_REALM || "turn.wapainel.com.br";
  const port = process.env.TURN_PORT || "3478";
  const ttl = Number(process.env.TURN_TTL_SECONDS || 3600);
  const secret = readTurnSecret();

  const stunServer: IceServer = { urls: `stun:${host}:${port}` };

  // Sem segredo configurado: degrada para STUN-only (não quebra o webphone).
  if (!secret) {
    logger.warn("[ice-servers] TURN_SECRET ausente; retornando apenas STUN");
    return { iceServers: [stunServer], ttl };
  }

  const expiry = Math.floor(Date.now() / 1000) + ttl;
  const username = `${expiry}:${userId}`;
  const credential = crypto
    .createHmac("sha1", secret)
    .update(username)
    .digest("base64");

  return {
    iceServers: [
      stunServer,
      {
        urls: [
          `turn:${host}:${port}?transport=udp`,
          `turn:${host}:${port}?transport=tcp`
        ],
        username,
        credential
      }
    ],
    ttl
  };
};

export default GenerateIceServersService;
