import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";
import OfficialCampaign from "../../models/OfficialCampaign";
import OfficialCampaignShipping from "../../models/OfficialCampaignShipping";
import OfficialTemplate from "../../models/OfficialTemplate";
import Whatsapp from "../../models/Whatsapp";
import { buildGraphClient, extractGraphError } from "../WhatsappCoexistence/graphApiHelper";

const RUNNING_CAMPAIGNS = new Set<number>();

type ConnectionInfo = Pick<
  Whatsapp,
  "id" | "name" | "status" | "channel" | "coexistencePhoneNumberId" | "coexistenceWabaId" | "lastCoexistenceSync"
>;

interface CampaignPayload {
  companyId: number;
  whatsappId: number;
  contactListId: number;
  officialTemplateId?: number | null;
  name: string;
  templateName?: string;
  templateLanguage?: string;
  templateCategory?: string;
  templateComponents?: any[];
  variableMapping?: Record<string, any>;
  advancedComponents?: any[] | null;
  previewNumber?: string | null;
  intervalSeconds?: number;
  scheduledAt?: string | null;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const sanitizePhoneNumber = (value?: string | null): string =>
  String(value || "").replace(/\D/g, "");

const truncate = (value: string, max = 500): string =>
  value.length > max ? value.slice(0, max) : value;

// Returns true when the name is a system-generated placeholder that should
// never appear in outgoing messages (e.g. "Contato sem nome 9470").
const isFallbackName = (value?: string | null): boolean => {
  const trimmed = String(value || "").trim().toLowerCase();
  if (!trimmed) return true;
  return (
    /^contato\s+sem\s+nome(\s+\d+)?$/.test(trimmed) ||
    /^sem\s+nome(\s+\d+)?$/.test(trimmed)
  );
};

const getFirstName = (name?: string | null): string => {
  if (isFallbackName(name)) return "";
  const text = String(name || "").trim();
  return text ? text.split(/\s+/)[0] : "";
};

const resolveTemplateValue = (
  input: any,
  contact?: Partial<ContactListItem> | null,
  shipping?: Partial<OfficialCampaignShipping> | null
): string => {
  if (input === null || input === undefined) {
    return "";
  }

  if (typeof input !== "string") {
    return String(input);
  }

  const rawName = String(contact?.name || shipping?.contactName || "");
  const safeName = isFallbackName(rawName) ? "" : rawName;

  const tokens: Record<string, string> = {
    name: safeName,
    firstName: getFirstName(rawName),
    number: sanitizePhoneNumber(contact?.number || shipping?.number),
    phone: sanitizePhoneNumber(contact?.number || shipping?.number),
    email: String(contact?.email || ""),
    contactId: contact?.id ? String(contact.id) : "",
    today: new Intl.DateTimeFormat("pt-BR").format(new Date()),
    now: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date())
  };

  return input.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, token) => {
    return tokens[token] ?? "";
  });
};

const resolveJsonTokens = (
  value: any,
  contact?: Partial<ContactListItem> | null,
  shipping?: Partial<OfficialCampaignShipping> | null
): any => {
  if (Array.isArray(value)) {
    return value.map(item => resolveJsonTokens(item, contact, shipping));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, entry]) => {
      acc[key] = resolveJsonTokens(entry, contact, shipping);
      return acc;
    }, {} as Record<string, any>);
  }

  if (typeof value === "string") {
    return resolveTemplateValue(value, contact, shipping);
  }

  return value;
};

const extractPlaceholderCount = (value?: string | null): number => {
  if (!value) return 0;
  const matches = value.match(/\{\{\d+\}\}/g) || [];
  return matches.length;
};

const getConnection = async (companyId: number, whatsappId: number): Promise<Whatsapp> => {
  const whatsapp = await Whatsapp.findOne({
    where: {
      id: whatsappId,
      companyId,
      channel: "whatsapp_official"
    }
  });

  if (!whatsapp) {
    throw new AppError("Conexão oficial não encontrada.", 404);
  }

  if (!whatsapp.coexistencePhoneNumberId || !whatsapp.coexistencePermanentToken || !whatsapp.coexistenceWabaId) {
    throw new AppError("A conexão oficial não possui credenciais completas para a Graph API.", 400);
  }

  return whatsapp;
};

const buildTemplatePayload = (
  campaign: Partial<OfficialCampaign>,
  shipping: Partial<OfficialCampaignShipping>,
  contact?: Partial<ContactListItem> | null
) => {
  const advancedComponents = Array.isArray(campaign.advancedComponents)
    ? resolveJsonTokens(campaign.advancedComponents, contact, shipping)
    : null;

  if (advancedComponents && advancedComponents.length > 0) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: sanitizePhoneNumber(shipping.number),
      type: "template",
      template: {
        name: campaign.templateName,
        language: { code: campaign.templateLanguage },
        components: advancedComponents
      }
    };
  }

  const variableMapping = campaign.variableMapping || {};
  const templateComponents = Array.isArray(campaign.templateComponents)
    ? campaign.templateComponents
    : [];
  const components: any[] = [];

  templateComponents.forEach((component: any) => {
    const type = String(component?.type || "").toUpperCase();

    if (type === "HEADER") {
      const format = String(component?.format || "").toUpperCase();

      if (format === "TEXT") {
        const count = extractPlaceholderCount(component?.text);
        if (count > 0) {
          const parameters = Array.from({ length: count }).map((_, idx) => ({
            type: "text",
            text: resolveTemplateValue(
              variableMapping?.header?.[String(idx + 1)] ?? variableMapping?.header?.[idx + 1] ?? "",
              contact,
              shipping
            )
          }));

          components.push({ type: "header", parameters });
        }
      } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(format)) {
        const mediaLink = resolveTemplateValue(variableMapping?.headerMediaLink || "", contact, shipping);
        if (mediaLink) {
          const mediaType = format.toLowerCase();
          const mediaPayload: Record<string, any> = {
            link: mediaLink
          };
          if (mediaType === "document" && variableMapping?.headerDocumentFilename) {
            mediaPayload.filename = resolveTemplateValue(variableMapping.headerDocumentFilename, contact, shipping);
          }
          components.push({
            type: "header",
            parameters: [
              {
                type: mediaType,
                [mediaType]: mediaPayload
              }
            ]
          });
        }
      }
    }

    if (type === "BODY") {
      const count = extractPlaceholderCount(component?.text);
      if (count > 0) {
        const parameters = Array.from({ length: count }).map((_, idx) => ({
          type: "text",
          text: resolveTemplateValue(
            variableMapping?.body?.[String(idx + 1)] ?? variableMapping?.body?.[idx + 1] ?? "",
            contact,
            shipping
          )
        }));

        components.push({ type: "body", parameters });
      }
    }

    if (type === "BUTTONS" && Array.isArray(component?.buttons)) {
      component.buttons.forEach((button: any, idx: number) => {
        const buttonType = String(button?.type || "").toUpperCase();
        const hasDynamicUrl = buttonType === "URL" && extractPlaceholderCount(button?.url) > 0;

        if (hasDynamicUrl) {
          const value = resolveTemplateValue(
            variableMapping?.buttons?.[String(idx)] ?? variableMapping?.buttons?.[idx] ?? "",
            contact,
            shipping
          );

          components.push({
            type: "button",
            sub_type: "url",
            index: String(idx),
            parameters: [{ type: "text", text: value }]
          });
        }
      });
    }
  });

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: sanitizePhoneNumber(shipping.number),
    type: "template",
    template: {
      name: campaign.templateName,
      language: { code: campaign.templateLanguage },
      ...(components.length > 0 ? { components } : {})
    }
  };
};

const refreshCampaignCounters = async (campaignId: number) => {
  const [totalTargets, successCount, failedHard, skippedCount, cancelledCount, pendingCount] = await Promise.all([
    OfficialCampaignShipping.count({ where: { campaignId } }),
    OfficialCampaignShipping.count({ where: { campaignId, status: "SENT" } }),
    OfficialCampaignShipping.count({ where: { campaignId, status: "FAILED" } }),
    OfficialCampaignShipping.count({ where: { campaignId, status: "SKIPPED" } }),
    OfficialCampaignShipping.count({ where: { campaignId, status: "CANCELLED" } }),
    OfficialCampaignShipping.count({
      where: {
        campaignId,
        status: { [Op.in]: ["PENDING", "PROCESSING"] }
      }
    })
  ]);

  const failedCount = failedHard + skippedCount + cancelledCount;
  const processedTargets = totalTargets - pendingCount;

  await OfficialCampaign.update(
    {
      totalTargets,
      processedTargets,
      successCount,
      failedCount
    },
    {
      where: { id: campaignId }
    }
  );

  return {
    totalTargets,
    processedTargets,
    successCount,
    failedCount,
    pendingCount
  };
};

const ensureCampaignTargets = async (campaign: OfficialCampaign) => {
  const existing = await OfficialCampaignShipping.count({
    where: { campaignId: campaign.id }
  });

  if (existing > 0) {
    return refreshCampaignCounters(campaign.id);
  }

  const contacts = await ContactListItem.findAll({
    where: {
      companyId: campaign.companyId,
      contactListId: campaign.contactListId
    },
    order: [["id", "ASC"]]
  });

  const seen = new Set<string>();

  await OfficialCampaignShipping.bulkCreate(
    contacts.map(contact => {
      const number = sanitizePhoneNumber(contact.number);
      let status = "PENDING";
      let errorMessage: string | null = null;

      if (!number) {
        status = "SKIPPED";
        errorMessage = "Contato sem número válido para a API oficial.";
      } else if (seen.has(number)) {
        status = "SKIPPED";
        errorMessage = "Número duplicado na lista.";
      } else {
        seen.add(number);
      }

      return {
        companyId: campaign.companyId,
        campaignId: campaign.id,
        contactId: contact.id,
        number,
        contactName: contact.name,
        status,
        errorMessage
      };
    })
  );

  return refreshCampaignCounters(campaign.id);
};

const getCampaignById = async (id: number, companyId: number) => {
  const campaign = await OfficialCampaign.findOne({
    where: { id, companyId },
    include: [
      { model: Whatsapp, attributes: ["id", "name", "channel", "status"] },
      { model: ContactList, attributes: ["id", "name"] },
      { model: OfficialTemplate, attributes: ["id", "name", "language", "status", "qualityScore"] }
    ]
  });

  if (!campaign) {
    throw new AppError("Campanha oficial não encontrada.", 404);
  }

  return campaign;
};

const finalizeCampaignIfNeeded = async (campaignId: number) => {
  const campaign = await OfficialCampaign.findByPk(campaignId);
  if (!campaign) return null;

  const counters = await refreshCampaignCounters(campaignId);

  if (campaign.status === "PAUSED" || campaign.status === "CANCELLED") {
    return campaign;
  }

  if (counters.pendingCount === 0) {
    await campaign.update({
      status: counters.successCount === 0 && counters.failedCount > 0 ? "FAILED" : "COMPLETED",
      completedAt: new Date(),
      failureReason:
        counters.successCount === 0 && counters.failedCount > 0
          ? "Todos os envios falharam ou foram ignorados."
          : campaign.failureReason
    });
  }

  return campaign;
};

export const listOfficialConnections = async (companyId: number): Promise<ConnectionInfo[]> => {
  return Whatsapp.findAll({
    where: {
      companyId,
      channel: "whatsapp_official"
    },
    attributes: [
      "id",
      "name",
      "status",
      "channel",
      "coexistencePhoneNumberId",
      "coexistenceWabaId",
      "lastCoexistenceSync"
    ],
    order: [["name", "ASC"]]
  });
};

export const getOfficialDispatchOverview = async (companyId: number, whatsappId?: number) => {
  const campaignWhere = whatsappId ? { companyId, whatsappId } : { companyId };
  const templateWhere = whatsappId ? { companyId, whatsappId } : { companyId };
  const campaignIds = (
    await OfficialCampaign.findAll({
      where: campaignWhere,
      attributes: ["id"]
    })
  ).map(item => item.id);

  const [
    totalTemplates,
    approvedTemplates,
    rejectedTemplates,
    totalCampaigns,
    runningCampaigns,
    scheduledCampaigns,
    sentMessages,
    failedMessages
  ] = await Promise.all([
    OfficialTemplate.count({ where: templateWhere }),
    OfficialTemplate.count({
      where: {
        ...templateWhere,
        status: { [Op.in]: ["APPROVED", "ACTIVE - QUALITY_PENDING", "IN_APPEAL"] }
      }
    }),
    OfficialTemplate.count({
      where: {
        ...templateWhere,
        status: { [Op.in]: ["REJECTED", "PAUSED", "DISABLED"] }
      }
    }),
    OfficialCampaign.count({ where: campaignWhere }),
    OfficialCampaign.count({
      where: {
        ...campaignWhere,
        status: { [Op.in]: ["RUNNING", "PAUSED"] }
      }
    }),
    OfficialCampaign.count({
      where: {
        ...campaignWhere,
        status: "SCHEDULED"
      }
    }),
    OfficialCampaignShipping.count({
      where: {
        companyId,
        ...(campaignIds.length > 0 ? { campaignId: { [Op.in]: campaignIds } } : { campaignId: null }),
        status: "SENT"
      }
    }),
    OfficialCampaignShipping.count({
      where: {
        companyId,
        ...(campaignIds.length > 0 ? { campaignId: { [Op.in]: campaignIds } } : { campaignId: null }),
        status: { [Op.in]: ["FAILED", "SKIPPED", "CANCELLED"] }
      }
    })
  ]);

  const totalProcessed = sentMessages + failedMessages;

  return {
    templates: {
      total: totalTemplates,
      approved: approvedTemplates,
      rejected: rejectedTemplates
    },
    campaigns: {
      total: totalCampaigns,
      running: runningCampaigns,
      scheduled: scheduledCampaigns
    },
    messages: {
      sent: sentMessages,
      failed: failedMessages,
      deliveryRate: totalProcessed > 0 ? Number(((sentMessages / totalProcessed) * 100).toFixed(1)) : 0
    }
  };
};

export const getOfficialConnectionVerification = async (companyId: number, whatsappId: number) => {
  const connection = await getConnection(companyId, whatsappId);
  const client = buildGraphClient(connection.coexistencePermanentToken);

  const safeRequest = async <T = any>(request: () => Promise<{ data: T }>, fallback: T | null = null): Promise<T | null> => {
    try {
      const response = await request();
      return response.data;
    } catch (_error) {
      return fallback;
    }
  };

  let phoneNumberDetails = await safeRequest(() =>
    client.get(
      `${connection.coexistencePhoneNumberId}?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status,name_status,new_name_status,platform_type`
    )
  );

  if (!phoneNumberDetails) {
    phoneNumberDetails = await safeRequest(() =>
      client.get(`${connection.coexistencePhoneNumberId}?fields=id,verified_name,display_phone_number,quality_rating`)
    );
  }

  const [phoneNumbers, businessProfile, subscribedApps, coexistenceStatus] = await Promise.all([
    safeRequest(() => client.get(`${connection.coexistenceWabaId}/phone_numbers`), { data: [] as any[] }),
    safeRequest(() => client.get(`${connection.coexistencePhoneNumberId}/whatsapp_business_profile`), null),
    safeRequest(() => client.get(`${connection.coexistenceWabaId}/subscribed_apps`), { data: [] as any[] }),
    safeRequest(() => client.get(`${connection.coexistencePhoneNumberId}/coexistence_status`), null)
  ]);

  return {
    connection: {
      id: connection.id,
      name: connection.name,
      phoneNumberId: connection.coexistencePhoneNumberId,
      wabaId: connection.coexistenceWabaId,
      status: connection.status
    },
    phoneNumber: phoneNumberDetails,
    phoneNumbers,
    businessProfile,
    subscribedApps,
    coexistenceStatus
  };
};

export const syncOfficialTemplates = async (companyId: number, whatsappId: number) => {
  const connection = await getConnection(companyId, whatsappId);
  const client = buildGraphClient(connection.coexistencePermanentToken);
  const templates: any[] = [];
  let nextUrl: string | null = `${connection.coexistenceWabaId}/message_templates?limit=100`;

  while (nextUrl) {
    const response = await client.get(nextUrl);
    const payload = response.data || {};
    templates.push(...(payload.data || []));
    nextUrl = payload.paging?.next || null;
  }

  const idsFromMeta = new Set<string>();

  for (const template of templates) {
    const externalTemplateId = String(template.id || `${template.name}:${template.language}`);
    idsFromMeta.add(externalTemplateId);

    const existing = await OfficialTemplate.findOne({
      where: {
        companyId,
        whatsappId,
        externalTemplateId
      }
    });

    const payload = {
      companyId,
      whatsappId,
      externalTemplateId,
      name: template.name,
      language: template.language,
      category: template.category,
      status: template.status,
      qualityScore:
        template.quality_score?.score ||
        template.quality_score ||
        template.quality_rating ||
        null,
      components: template.components || [],
      raw: template,
      lastSyncedAt: new Date()
    };

    if (existing) {
      await existing.update(payload);
    } else {
      await OfficialTemplate.create(payload);
    }
  }

  await OfficialTemplate.destroy({
    where: {
      companyId,
      whatsappId,
      ...(idsFromMeta.size > 0
        ? {
            externalTemplateId: {
              [Op.notIn]: Array.from(idsFromMeta)
            }
          }
        : {})
    }
  });

  return OfficialTemplate.findAll({
    where: { companyId, whatsappId },
    order: [["updatedAt", "DESC"], ["name", "ASC"]]
  });
};

export const listOfficialTemplates = async (
  companyId: number,
  whatsappId: number,
  searchParam?: string,
  status?: string
) => {
  const where: any = { companyId, whatsappId };

  if (searchParam) {
    where.name = { [Op.iLike]: `%${searchParam}%` };
  }

  if (status) {
    where.status = status;
  }

  return OfficialTemplate.findAll({
    where,
    order: [["updatedAt", "DESC"], ["name", "ASC"]]
  });
};

export const createOfficialTemplate = async (
  companyId: number,
  whatsappId: number,
  payload: Record<string, any>
) => {
  const connection = await getConnection(companyId, whatsappId);
  const client = buildGraphClient(connection.coexistencePermanentToken);

  try {
    const response = await client.post(`${connection.coexistenceWabaId}/message_templates`, payload);
    let syncedTemplates: OfficialTemplate[] = [];

    try {
      syncedTemplates = await syncOfficialTemplates(companyId, whatsappId);
    } catch (_error) {
      syncedTemplates = [];
    }

    const responseData = response.data || {};
    const templateId = responseData?.id ? String(responseData.id) : null;
    const templateName = String(payload?.name || "").trim();
    const templateLanguage = String(payload?.language || "").trim();

    let persistedTemplate =
      syncedTemplates.find(item => templateId && String(item.externalTemplateId) === templateId) ||
      syncedTemplates.find(
        item =>
          templateName &&
          templateLanguage &&
          String(item.name || "").trim() === templateName &&
          String(item.language || "").trim() === templateLanguage
      ) ||
      null;

    if (!persistedTemplate) {
      const fallbackPayload = {
        companyId,
        whatsappId,
        externalTemplateId: templateId || `${templateName}:${templateLanguage || "pending"}`,
        name: templateName || `template_${Date.now()}`,
        language: templateLanguage || "pt_BR",
        category: payload?.category || responseData?.category || null,
        status: String(responseData?.status || "PENDING"),
        qualityScore:
          responseData?.quality_score?.score ||
          responseData?.quality_score ||
          responseData?.quality_rating ||
          null,
        components: Array.isArray(payload?.components) ? payload.components : [],
        raw: {
          requestPayload: payload,
          createResponse: responseData
        },
        lastSyncedAt: new Date()
      };

      persistedTemplate =
        (await OfficialTemplate.findOne({
          where: {
            companyId,
            whatsappId,
            externalTemplateId: fallbackPayload.externalTemplateId
          }
        })) || null;

      if (persistedTemplate) {
        await persistedTemplate.update(fallbackPayload);
      } else {
        persistedTemplate = await OfficialTemplate.create(fallbackPayload);
      }
    }

    return {
      meta: responseData,
      template: persistedTemplate
    };
  } catch (error) {
    throw new AppError(`Falha ao criar template oficial: ${extractGraphError(error)}`, 400);
  }
};

export const updateOfficialTemplate = async (
  companyId: number,
  whatsappId: number,
  templateId: number,
  payload: Record<string, any>
) => {
  const connection = await getConnection(companyId, whatsappId);
  const template = await OfficialTemplate.findOne({
    where: {
      id: templateId,
      companyId,
      whatsappId
    }
  });

  if (!template) {
    throw new AppError("Template oficial não encontrado.", 404);
  }

  const client = buildGraphClient(connection.coexistencePermanentToken);

  try {
    const response = await client.post(`${template.externalTemplateId}`, payload);
    await syncOfficialTemplates(companyId, whatsappId);
    return response.data;
  } catch (error) {
    throw new AppError(`Falha ao atualizar template oficial: ${extractGraphError(error)}`, 400);
  }
};

export const deleteOfficialTemplate = async (
  companyId: number,
  whatsappId: number,
  templateId: number
) => {
  const connection = await getConnection(companyId, whatsappId);
  const template = await OfficialTemplate.findOne({
    where: {
      id: templateId,
      companyId,
      whatsappId
    }
  });

  if (!template) {
    throw new AppError("Template oficial não encontrado.", 404);
  }

  const client = buildGraphClient(connection.coexistencePermanentToken);

  try {
    await client.delete(`${connection.coexistenceWabaId}/message_templates`, {
      params: {
        hsm_id: template.externalTemplateId,
        name: template.name
      }
    });
    await template.destroy();
    return { success: true };
  } catch (error) {
    throw new AppError(`Falha ao remover template oficial: ${extractGraphError(error)}`, 400);
  }
};

export const previewOfficialCampaignPayload = async (
  companyId: number,
  payload: CampaignPayload & { sampleContactId?: number | null }
) => {
  const template =
    payload.officialTemplateId
      ? await OfficialTemplate.findOne({
          where: {
            id: payload.officialTemplateId,
            companyId,
            whatsappId: payload.whatsappId
          }
        })
      : null;

  let sampleContact: ContactListItem | null = null;

  if (payload.sampleContactId) {
    sampleContact = await ContactListItem.findOne({
      where: { id: payload.sampleContactId, companyId }
    });
  }

  if (!sampleContact && payload.contactListId) {
    sampleContact = await ContactListItem.findOne({
      where: {
        companyId,
        contactListId: payload.contactListId
      },
      order: [["id", "ASC"]]
    });
  }

  const previewNumber = sanitizePhoneNumber(payload.previewNumber || sampleContact?.number || "");

  const campaignLike: Partial<OfficialCampaign> = {
    templateName: template?.name || payload.templateName || "",
    templateLanguage: template?.language || payload.templateLanguage || "",
    templateComponents: template?.components || payload.templateComponents || [],
    variableMapping: payload.variableMapping || {},
    advancedComponents: payload.advancedComponents || null
  };

  const shippingLike: Partial<OfficialCampaignShipping> = {
    number: previewNumber,
    contactName: sampleContact?.name || "Contato de exemplo"
  };

  return {
    sampleContact,
    payload: buildTemplatePayload(campaignLike, shippingLike, sampleContact)
  };
};

export const listOfficialCampaigns = async (companyId: number, whatsappId?: number) => {
  return OfficialCampaign.findAll({
    where: {
      companyId,
      ...(whatsappId ? { whatsappId } : {})
    },
    include: [
      { model: Whatsapp, attributes: ["id", "name", "channel", "status"] },
      { model: ContactList, attributes: ["id", "name"] },
      { model: OfficialTemplate, attributes: ["id", "name", "language", "status", "qualityScore"] }
    ],
    order: [["createdAt", "DESC"]]
  });
};

export const showOfficialCampaign = async (companyId: number, id: number) => {
  const campaign = await OfficialCampaign.findOne({
    where: { companyId, id },
    include: [
      { model: Whatsapp, attributes: ["id", "name", "channel", "status"] },
      { model: ContactList, attributes: ["id", "name"] },
      { model: OfficialTemplate, attributes: ["id", "name", "language", "status", "qualityScore"] },
      {
        model: OfficialCampaignShipping,
        separate: true,
        limit: 120,
        order: [["createdAt", "DESC"]],
        include: [{ model: ContactListItem, attributes: ["id", "name", "number", "email"] }]
      }
    ]
  });

  if (!campaign) {
    throw new AppError("Campanha oficial não encontrada.", 404);
  }

  return campaign;
};

export const createOfficialCampaign = async (companyId: number, payload: CampaignPayload) => {
  const connection = await getConnection(companyId, payload.whatsappId);
  const contactList = await ContactList.findOne({
    where: {
      id: payload.contactListId,
      companyId
    }
  });

  if (!contactList) {
    throw new AppError("Lista de contatos não encontrada.", 404);
  }

  const template =
    payload.officialTemplateId
      ? await OfficialTemplate.findOne({
          where: {
            id: payload.officialTemplateId,
            companyId,
            whatsappId: payload.whatsappId
          }
        })
      : null;

  const templateName = template?.name || payload.templateName;
  const templateLanguage = template?.language || payload.templateLanguage;

  if (!templateName || !templateLanguage) {
    throw new AppError("Selecione um template oficial válido.", 400);
  }

  const campaign = await OfficialCampaign.create({
    companyId,
    whatsappId: connection.id,
    contactListId: contactList.id,
    officialTemplateId: template?.id || null,
    name: payload.name,
    status: payload.scheduledAt ? "SCHEDULED" : "DRAFT",
    templateName,
    templateLanguage,
    templateCategory: template?.category || payload.templateCategory || null,
    templateComponents: template?.components || payload.templateComponents || [],
    variableMapping: payload.variableMapping || {},
    advancedComponents: payload.advancedComponents || null,
    previewNumber: payload.previewNumber || null,
    intervalSeconds: Math.max(1, Number(payload.intervalSeconds || 4)),
    scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null
  });

  return getCampaignById(campaign.id, companyId);
};

export const updateOfficialCampaign = async (companyId: number, id: number, payload: CampaignPayload) => {
  const campaign = await getCampaignById(id, companyId);

  if (["RUNNING", "PAUSED"].includes(campaign.status)) {
    throw new AppError("Campanhas em execução ou pausadas não podem ser editadas.", 400);
  }

  const template =
    payload.officialTemplateId
      ? await OfficialTemplate.findOne({
          where: {
            id: payload.officialTemplateId,
            companyId,
            whatsappId: payload.whatsappId || campaign.whatsappId
          }
        })
      : null;

  await campaign.update({
    whatsappId: payload.whatsappId || campaign.whatsappId,
    contactListId: payload.contactListId || campaign.contactListId,
    officialTemplateId: template?.id || null,
    name: payload.name || campaign.name,
    status: payload.scheduledAt ? "SCHEDULED" : "DRAFT",
    templateName: template?.name || payload.templateName || campaign.templateName,
    templateLanguage: template?.language || payload.templateLanguage || campaign.templateLanguage,
    templateCategory: template?.category || payload.templateCategory || campaign.templateCategory,
    templateComponents: template?.components || payload.templateComponents || campaign.templateComponents,
    variableMapping: payload.variableMapping || campaign.variableMapping || {},
    advancedComponents: payload.advancedComponents ?? campaign.advancedComponents,
    previewNumber: payload.previewNumber ?? campaign.previewNumber,
    intervalSeconds: Math.max(1, Number(payload.intervalSeconds || campaign.intervalSeconds || 4)),
    scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
    startedAt: null,
    completedAt: null,
    failureReason: null
  });

  await OfficialCampaignShipping.destroy({
    where: {
      campaignId: campaign.id
    }
  });

  return getCampaignById(campaign.id, companyId);
};

export const deleteOfficialCampaign = async (companyId: number, id: number) => {
  const campaign = await getCampaignById(id, companyId);

  if (campaign.status === "RUNNING") {
    throw new AppError("Pause ou cancele a campanha antes de excluir.", 400);
  }

  await OfficialCampaignShipping.destroy({ where: { campaignId: campaign.id } });
  await campaign.destroy();

  return { success: true };
};

export const startOfficialCampaign = async (companyId: number, id: number) => {
  const campaign = await getCampaignById(id, companyId);

  await OfficialCampaignShipping.destroy({
    where: {
      campaignId: campaign.id
    }
  });

  await campaign.update({
    status: "RUNNING",
    startedAt: new Date(),
    completedAt: null,
    failureReason: null,
    scheduledAt: null,
    totalTargets: 0,
    processedTargets: 0,
    successCount: 0,
    failedCount: 0
  });

  await ensureCampaignTargets(campaign);
  processOfficialCampaign(campaign.id).catch(() => undefined);

  return getCampaignById(campaign.id, companyId);
};

export const pauseOfficialCampaign = async (companyId: number, id: number) => {
  const campaign = await getCampaignById(id, companyId);

  if (campaign.status !== "RUNNING") {
    throw new AppError("Somente campanhas em execução podem ser pausadas.", 400);
  }

  await campaign.update({ status: "PAUSED" });

  return getCampaignById(campaign.id, companyId);
};

export const resumeOfficialCampaign = async (companyId: number, id: number) => {
  const campaign = await getCampaignById(id, companyId);

  if (campaign.status !== "PAUSED") {
    throw new AppError("Somente campanhas pausadas podem ser retomadas.", 400);
  }

  await campaign.update({
    status: "RUNNING",
    failureReason: null
  });

  processOfficialCampaign(campaign.id).catch(() => undefined);

  return getCampaignById(campaign.id, companyId);
};

export const cancelOfficialCampaign = async (companyId: number, id: number) => {
  const campaign = await getCampaignById(id, companyId);

  await campaign.update({
    status: "CANCELLED",
    completedAt: new Date()
  });

  await OfficialCampaignShipping.update(
    {
      status: "CANCELLED",
      errorMessage: "Envio cancelado pelo usuário."
    },
    {
      where: {
        campaignId: campaign.id,
        status: {
          [Op.in]: ["PENDING", "PROCESSING"]
        }
      }
    }
  );

  await refreshCampaignCounters(campaign.id);

  return getCampaignById(campaign.id, companyId);
};

export const processOfficialCampaign = async (campaignId: number) => {
  if (RUNNING_CAMPAIGNS.has(campaignId)) {
    return;
  }

  RUNNING_CAMPAIGNS.add(campaignId);

  try {
    const campaign = await OfficialCampaign.findByPk(campaignId);
    if (!campaign) return;

    const connection = await getConnection(campaign.companyId, campaign.whatsappId);
    await ensureCampaignTargets(campaign);

    await OfficialCampaignShipping.update(
      { status: "PENDING" },
      {
        where: {
          campaignId,
          status: "PROCESSING"
        }
      }
    );

    const client = buildGraphClient(connection.coexistencePermanentToken);

    const pending = await OfficialCampaignShipping.findAll({
      where: {
        campaignId,
        status: "PENDING"
      },
      include: [{ model: ContactListItem, as: "contact" }],
      order: [["id", "ASC"]]
    });

    for (const shipping of pending) {
      const freshCampaign = await OfficialCampaign.findByPk(campaignId);
      if (!freshCampaign || freshCampaign.status !== "RUNNING") {
        break;
      }

      await shipping.update({ status: "PROCESSING" });

      const payload = buildTemplatePayload(freshCampaign, shipping, shipping.contact || null);

      try {
        const response = await client.post(`${connection.coexistencePhoneNumberId}/messages`, payload);

        await shipping.update({
          status: "SENT",
          messageId: response.data?.messages?.[0]?.id || null,
          payload,
          response: response.data,
          sentAt: new Date(),
          errorMessage: null
        });
      } catch (error) {
        await shipping.update({
          status: "FAILED",
          payload,
          response: null,
          failedAt: new Date(),
          errorMessage: truncate(extractGraphError(error))
        });
      }

      await refreshCampaignCounters(campaignId);

      const interval = Math.max(1, Number(freshCampaign.intervalSeconds || 4)) * 1000;
      await sleep(interval);
    }

    await finalizeCampaignIfNeeded(campaignId);
  } finally {
    RUNNING_CAMPAIGNS.delete(campaignId);
  }
};

export const runScheduledOfficialCampaigns = async () => {
  const campaigns = await OfficialCampaign.findAll({
    where: {
      status: "SCHEDULED",
      scheduledAt: {
        [Op.lte]: new Date()
      }
    },
    attributes: ["id", "companyId"]
  });

  for (const campaign of campaigns) {
    await OfficialCampaign.update(
      {
        status: "RUNNING",
        startedAt: new Date(),
        completedAt: null,
        failureReason: null
      },
      {
        where: { id: campaign.id }
      }
    );

    processOfficialCampaign(campaign.id).catch(() => undefined);
  }
};
