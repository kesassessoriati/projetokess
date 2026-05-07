import ShowBaileysService from "../services/BaileysServices/ShowBaileysService";
import resolveWhatsAppContactName from "./resolveWhatsAppContactName";
import { getBrazilianPhoneVariants } from "./normalizeContactNumber";
import logger from "../utils/logger";

interface LookupParams {
  whatsappId?: number | null;
  wbot?: any;
  number?: string | null;
  remoteJid?: string | null;
  remoteJidAlt?: string | null;
}

const sanitize = (value?: string | null): string => (value || "").trim();

const parseContacts = (contacts: any): any[] => {
  if (!contacts) return [];
  if (Array.isArray(contacts)) return contacts;
  if (typeof contacts === "string") {
    try {
      const parsed = JSON.parse(contacts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | null> => {
  try {
    return await Promise.race([
      promise,
      new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs))
    ]);
  } catch {
    return null;
  }
};

const buildCandidates = ({
  number,
  remoteJid,
  remoteJidAlt
}: LookupParams): { ids: Set<string>; digits: Set<string> } => {
  const ids = new Set<string>();
  const digits = new Set<string>();

  [remoteJid, remoteJidAlt].forEach(value => {
    const sanitized = sanitize(value);
    if (!sanitized) return;
    ids.add(sanitized);
    const onlyDigits = sanitized.replace(/\D/g, "");
    if (onlyDigits) digits.add(onlyDigits);
  });

  const baseDigits = sanitize(number).replace(/\D/g, "");
  if (baseDigits) {
    digits.add(baseDigits);
    getBrazilianPhoneVariants(baseDigits).forEach(variant => digits.add(variant));
  }

  Array.from(digits).forEach(value => {
    ids.add(`${value}@s.whatsapp.net`);
    ids.add(`${value}@c.us`);
  });

  return { ids, digits };
};

const contactMatches = (
  contact: any,
  ids: Set<string>,
  digits: Set<string>
): boolean => {
  const contactIds = [
    sanitize(contact?.id),
    sanitize(contact?.jid),
    sanitize(contact?.remoteJid),
    sanitize(contact?.remoteJidAlt)
  ].filter(Boolean);

  if (contactIds.some(id => ids.has(id))) return true;

  return contactIds.some(id => {
    const onlyDigits = id.replace(/\D/g, "");
    return onlyDigits ? digits.has(onlyDigits) : false;
  });
};

const findNameInContacts = (contacts: any[], params: LookupParams): string => {
  const { ids, digits } = buildCandidates(params);
  const matchedContact = contacts.find(contact => contactMatches(contact, ids, digits));
  if (!matchedContact) return "";

  return resolveWhatsAppContactName(
    matchedContact,
    sanitize(matchedContact.id) || sanitize(params.remoteJid) || sanitize(params.number)
  );
};

const lookupWhatsAppContactName = async ({
  whatsappId,
  wbot,
  number,
  remoteJid,
  remoteJidAlt
}: LookupParams): Promise<string> => {
  const params = { whatsappId, wbot, number, remoteJid, remoteJidAlt };
  const storeContacts = wbot?.store?.contacts
    ? Object.values(wbot.store.contacts)
    : [];

  const storeName = findNameInContacts(storeContacts, params);
  if (storeName) return storeName;

  if (whatsappId) {
    try {
      const baileysData = await ShowBaileysService(whatsappId);
      const baileysName = findNameInContacts(parseContacts(baileysData.contacts), params);
      if (baileysName) return baileysName;
    } catch (err) {
      logger.debug(`lookupWhatsAppContactName: cache unavailable: ${err?.message || err}`);
    }
  }

  const targetJid =
    sanitize(remoteJidAlt) ||
    sanitize(remoteJid) ||
    (sanitize(number).replace(/\D/g, "")
      ? `${sanitize(number).replace(/\D/g, "")}@s.whatsapp.net`
      : "");

  if (wbot?.getBusinessProfile && targetJid) {
    const profile = await withTimeout(wbot.getBusinessProfile(targetJid), 2500);
    const profileName = resolveWhatsAppContactName(profile, targetJid);
    if (profileName) return profileName;
  }

  return "";
};

export default lookupWhatsAppContactName;
