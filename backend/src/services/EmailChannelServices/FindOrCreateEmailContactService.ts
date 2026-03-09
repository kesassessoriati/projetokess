import Contact from "../../models/Contact";

interface Request {
  companyId: number;
  channelId: number;
  email: string;
  name?: string;
}

const normalizeEmail = (value: string): string => (value || "").trim().toLowerCase();

const FindOrCreateEmailContactService = async ({
  companyId,
  channelId,
  email,
  name
}: Request): Promise<Contact | null> => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const fallbackName = name?.trim() || normalizedEmail;
  const numberKey = `email:${normalizedEmail}`;

  let contact = await Contact.findOne({
    where: {
      companyId,
      channel: "email",
      email: normalizedEmail
    }
  });

  if (contact) {
    const nextData: Partial<Contact> = {};
    if (!contact.name || contact.name === contact.email) {
      nextData.name = fallbackName;
    }
    if (contact.number !== numberKey) {
      nextData.number = numberKey;
    }
    if (contact.whatsappId !== channelId) {
      nextData.whatsappId = channelId;
    }
    if (Object.keys(nextData).length > 0) {
      await contact.update(nextData);
    }
    return contact;
  }

  contact = await Contact.create({
    name: fallbackName,
    number: numberKey,
    email: normalizedEmail,
    isGroup: false,
    profilePicUrl: `${process.env.FRONTEND_URL}/nopicture.png`,
    companyId,
    channel: "email",
    whatsappId: channelId,
    acceptAudioMessage: false
  } as any);

  return contact;
};

export default FindOrCreateEmailContactService;

