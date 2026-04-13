const sanitizeCandidate = (value?: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
};

const extractFromNested = (value?: any): string[] => {
  if (!value || typeof value !== "object") return [];

  return [
    sanitizeCandidate(value.name),
    sanitizeCandidate(value.displayName),
    sanitizeCandidate(value.formattedName),
    sanitizeCandidate(value.verifiedName),
    sanitizeCandidate(value?.details?.name),
    sanitizeCandidate(value?.details?.formattedName)
  ].filter(Boolean);
};

const looksLikeRawIdentifier = (
  value: string,
  fallbackDigits: string,
  fallbackId: string
): boolean => {
  const normalized = sanitizeCandidate(value);
  if (!normalized) return true;

  const digitsOnly = normalized.replace(/\D/g, "");
  if (fallbackDigits && digitsOnly === fallbackDigits) return true;

  if (fallbackId) {
    const normalizedId = sanitizeCandidate(fallbackId);
    if (normalized === normalizedId) return true;
    if (normalized === normalizedId.split("@")[0]) return true;
  }

  if (/^\+?\d[\d\s\-()]{5,}$/.test(normalized)) return true;
  if (/@(?:s\.whatsapp\.net|lid|g\.us)$/i.test(normalized)) return true;

  return false;
};

const isMeaningfulName = (
  value: string,
  fallbackDigits: string,
  fallbackId: string
): boolean => {
  const normalized = sanitizeCandidate(value);
  if (!normalized) return false;
  if (/^contato sem nome(?:\s+\d+)?$/i.test(normalized)) return false;
  if (/^unknown$/i.test(normalized)) return false;

  return !looksLikeRawIdentifier(normalized, fallbackDigits, fallbackId);
};

const resolveWhatsAppContactName = (contact: any, fallbackId = ""): string => {
  const baseId = fallbackId || sanitizeCandidate(contact?.id);
  const fallbackDigits = baseId.replace(/\D/g, "");

  const candidates = [
    sanitizeCandidate(contact?.name),
    sanitizeCandidate(contact?.notify),
    sanitizeCandidate(contact?.fullName),
    sanitizeCandidate(contact?.pushName),
    sanitizeCandidate(contact?.short),
    sanitizeCandidate(contact?.verifiedName),
    sanitizeCandidate(contact?.verifiedBizName),
    sanitizeCandidate(contact?.businessName),
    sanitizeCandidate(contact?.displayName),
    sanitizeCandidate(contact?.vname),
    ...extractFromNested(contact?.profile),
    ...extractFromNested(contact?.verifiedName)
  ];

  return (
    candidates.find(candidate => isMeaningfulName(candidate, fallbackDigits, baseId)) ||
    ""
  );
};

export default resolveWhatsAppContactName;
