/**
 * isSafeWebhookUrl.ts
 *
 * Validação best-effort contra SSRF para URLs de webhook fornecidas pelo usuário
 * (ação de automação "Enviar Webhook"). Bloqueia esquemas não-HTTP, hosts locais,
 * loopback, link-local/metadata de nuvem e faixas de IP privadas.
 *
 * Limitação conhecida: não resolve DNS (não cobre DNS-rebinding). É uma camada de
 * defesa básica; o destino ainda deve ser confiável.
 */

const isPrivateIPv4 = (host: string): boolean => {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, Number(m[2]), Number(m[3]), Number(m[4])].some(n => n > 255)) return true; // inválido → bloqueia
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local / metadata cloud (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  return false;
};

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "metadata"
]);

export const isSafeWebhookUrl = (rawUrl: string): boolean => {
  const value = String(rawUrl || "").trim();
  if (!value) return false;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (host.endsWith(".local") || host.endsWith(".internal")) return false;

  // IPv6 loopback/link-local simplificado
  if (host.startsWith("[")) {
    const inner = host.replace(/^\[|\]$/g, "");
    if (inner === "::1" || inner.startsWith("fe80") || inner.startsWith("fc") || inner.startsWith("fd")) {
      return false;
    }
  }

  if (isPrivateIPv4(host)) return false;

  return true;
};

export default isSafeWebhookUrl;
