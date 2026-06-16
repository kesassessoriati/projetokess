import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import syncContactToLead from "../CrmLeadService/helpers/syncContactToLead";
import ContactIdentityResolverService, {
  isGenericContactName
} from "./ContactIdentityResolverService";
import lookupWhatsAppContactName from "../../helpers/lookupWhatsAppContactName";
import logger from "../../utils/logger";
import fs from "fs";
import path, { join } from "path";
import axios from "axios";
import cacheLayer from "../../libs/cache";
import {
  getBrazilianPhoneVariants,
  sanitizeRemoteJid,
  stripCompanionDeviceSuffix
} from "../../helpers/normalizeContactNumber";

interface Params {
  contact: Contact;
  whatsappId?: number | null;
  wbot?: any;
}

const sanitizeName = (value?: string | null): string => (value || "").trim();

const isFallbackName = (value?: string | null): boolean =>
  /^Contato sem nome(?:\s+\d+)?$/i.test(sanitizeName(value));

const hasMeaningfulName = (
  value?: string | null,
  referenceNumber?: string | null,
  referenceLid?: string | null
): boolean => {
  const normalized = sanitizeName(value);
  if (!normalized) return false;
  if (isFallbackName(normalized)) return false;
  if (referenceNumber && normalized === referenceNumber) return false;
  if (referenceLid && normalized === referenceLid) return false;
  if (/^\+?\d[\d\s\-()]{5,}$/.test(normalized)) return false;
  return true;
};

const hasRealPicture = (contact: Contact): boolean => {
  const storedPicture = (contact as any).getDataValue?.("urlPicture");
  return Boolean(storedPicture && storedPicture !== "nopicture.png");
};

const getStoredProfilePicUrl = (contact: Contact): string => {
  const profilePicUrl = sanitizeName(contact.profilePicUrl);
  return profilePicUrl && !profilePicUrl.includes("nopicture.png")
    ? profilePicUrl
    : "";
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

const buildProfilePictureCandidates = (contact: Contact): string[] => {
  const candidates = new Set<string>();
  const number = sanitizeName(contact.number).replace(/\D/g, "");

  const sanitizedRemoteJid = sanitizeRemoteJid(
    stripCompanionDeviceSuffix(contact.remoteJid || ""),
    number,
    false
  );

  [sanitizedRemoteJid, contact.remoteJid].forEach(value => {
    const jid = sanitizeName(value);
    if (jid && jid.includes("@")) candidates.add(jid);
  });

  if (number) {
    getBrazilianPhoneVariants(number).forEach(variant => {
      candidates.add(`${variant}@s.whatsapp.net`);
    });
  }

  return Array.from(candidates);
};

const lookupWhatsAppProfilePicUrl = async (
  contact: Contact,
  wbot?: any
): Promise<string> => {
  if (!wbot?.profilePictureUrl) return "";

  for (const jid of buildProfilePictureCandidates(contact)) {
    const profilePicUrl = await withTimeout(
      wbot.profilePictureUrl(jid, "image"),
      3000
    );

    if (
      typeof profilePicUrl === "string" &&
      profilePicUrl &&
      !profilePicUrl.includes("nopicture.png")
    ) {
      return profilePicUrl;
    }
  }

  return "";
};

const downloadProfileImage = async ({
  profilePicUrl,
  companyId,
  contactId
}: {
  profilePicUrl: string;
  companyId: number;
  contactId: number;
}): Promise<string | null> => {
  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const folder = path.resolve(publicFolder, `company${companyId}`, "contacts");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    fs.chmodSync(folder, 0o777);
  }

  try {
    const response = await axios.get(profilePicUrl, {
      responseType: "arraybuffer"
    });
    const filename = `${Date.now()}_${contactId}.jpeg`;
    fs.writeFileSync(join(folder, filename), response.data);
    return filename;
  } catch (error) {
    logger.warn(`Could not download profile image for contact ${contactId}: ${error?.message || error}`);
    return null;
  }
};

const CACHE_TTL_HIT = 86400;  // 24h quando algo foi atualizado
const CACHE_TTL_MISS = 3600;  // 1h quando o lookup não encontrou nada

const EnsureWhatsAppContactNameService = async ({
  contact,
  whatsappId,
  wbot
}: Params): Promise<Contact> => {
  if (!contact || contact.isGroup) return contact;

  // Rate-limit: 24h se a última verificação atualizou algo, 1h se não encontrou nada
  const cacheKey = `contact:${contact.id}:identity-checked`;
  const alreadyChecked = await cacheLayer.get(cacheKey);
  if (alreadyChecked) return contact;

  const resolvedName = await lookupWhatsAppContactName({
    whatsappId: whatsappId || contact.whatsappId,
    wbot,
    number: contact.number,
    remoteJid: contact.remoteJid,
    remoteJidAlt: contact.remoteJid
  });

  let changed = false;
  const originalName = contact.name;
  const originalProfilePicUrl = contact.profilePicUrl;

  if (
    hasMeaningfulName(resolvedName, contact.number, contact.lid) &&
    contact.name !== resolvedName &&
    isGenericContactName(contact.name, contact.number, contact.lid)
  ) {
    contact.name = resolvedName;
    changed = true;
  }

  if (!hasRealPicture(contact)) {
    const profilePicUrl =
      getStoredProfilePicUrl(contact) ||
      await lookupWhatsAppProfilePicUrl(contact, wbot);
    if (profilePicUrl) {
      const filename = await downloadProfileImage({
        profilePicUrl,
        companyId: contact.companyId,
        contactId: contact.id
      });

      if (filename) {
        contact.profilePicUrl = profilePicUrl;
        (contact as any).setDataValue?.("urlPicture", filename);
        contact.pictureUpdated = true;
        changed = true;
      }
    }
  }

  if (changed) {
    await contact.save();
  }

  contact = await ContactIdentityResolverService({
    contact,
    companyId: contact.companyId,
    pushName: resolvedName
  });

  await syncContactToLead({ contact, companyId: contact.companyId });

  const identityChanged =
    originalName !== contact.name || originalProfilePicUrl !== contact.profilePicUrl;

  if (changed || identityChanged) {
    const io = getIO();
    io.of(String(contact.companyId)).emit(`company-${contact.companyId}-contact`, {
      action: "update",
      contact
    });
    logger.info(`Updated contact ${contact.id} from WhatsApp profile cache`);
  }

  // TTL adaptativo: 24h se algo foi resolvido (nome ou foto), 1h se lookup falhou
  const ttl = (changed || identityChanged) ? CACHE_TTL_HIT : CACHE_TTL_MISS;
  await cacheLayer.set(cacheKey, "1", "EX", ttl);

  return contact;
};

export default EnsureWhatsAppContactNameService;
