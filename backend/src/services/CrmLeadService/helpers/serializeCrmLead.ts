const normalizeString = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const normalizeNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
};

export const serializeCrmLead = (lead: any) => {
  if (!lead) {
    return lead;
  }

  const plainLead = typeof lead.toJSON === "function" ? lead.toJSON() : { ...lead };
  const document = normalizeString(plainLead.document || plainLead.cnpj);

  return {
    ...plainLead,
    name: normalizeString(plainLead.name),
    email: normalizeString(plainLead.email),
    phone: normalizeString(plainLead.phone),
    document,
    cnpj: normalizeString(plainLead.cnpj),
    companyName: normalizeString(plainLead.companyName),
    position: normalizeString(plainLead.position),
    decisionMakerName: normalizeString(plainLead.decisionMakerName),
    decisionMakerPhone: normalizeString(plainLead.decisionMakerPhone),
    gmn: normalizeString(plainLead.gmn),
    website: normalizeString(plainLead.website),
    instagram: normalizeString(plainLead.instagram),
    linkedin: normalizeString(plainLead.linkedin),
    sessionid: normalizeString(plainLead.sessionid),
    source: normalizeString(plainLead.source),
    campaign: normalizeString(plainLead.campaign),
    medium: normalizeString(plainLead.medium),
    status: normalizeString(plainLead.status || plainLead.leadStatus || "novo"),
    leadStatus: normalizeString(plainLead.leadStatus || plainLead.status || "novo"),
    temperature: normalizeString(plainLead.temperature),
    notes: normalizeString(plainLead.notes),
    product: normalizeString(plainLead.product),
    paymentType: normalizeString(plainLead.paymentType),
    purchaseType: normalizeString(plainLead.purchaseType),
    purchaseValue: normalizeNullableNumber(plainLead.purchaseValue),
    acquisitionDate: plainLead.acquisitionDate || null,
    ownerUserId: normalizeNullableNumber(plainLead.ownerUserId),
    pipelineId: normalizeNullableNumber(plainLead.pipelineId),
    stageId: normalizeNullableNumber(plainLead.stageId),
    contactId: normalizeNullableNumber(plainLead.contactId),
    primaryTicketId: normalizeNullableNumber(plainLead.primaryTicketId),
    score: Number.isFinite(Number(plainLead.score)) ? Number(plainLead.score) : 0,
    tags: Array.isArray(plainLead.tags) ? plainLead.tags : []
  };
};

export default serializeCrmLead;
