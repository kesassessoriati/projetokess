import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import {
  sanitizeRemoteJid,
  stripCompanionDeviceSuffix
} from "../../helpers/normalizeContactNumber";

const GetProfilePicUrl = async (
  number: string,
  companyId: number,
  contact?: Contact,
): Promise<string> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(null, companyId);

  const wbot = getWbot(defaultWhatsapp.id);

  let profilePicUrl: string;
  try {
    const targetJid = contact?.isGroup
      ? contact.remoteJid
      : sanitizeRemoteJid(
        stripCompanionDeviceSuffix(contact?.remoteJid || ""),
        contact?.number || number,
        false
      ) || `${number}@s.whatsapp.net`;

    profilePicUrl = await wbot.profilePictureUrl(targetJid, "image");
  } catch (error) {
    profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
  }

  return profilePicUrl;
};

export default GetProfilePicUrl;
