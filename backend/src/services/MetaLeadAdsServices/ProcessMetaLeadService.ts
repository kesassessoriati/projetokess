import { UniqueConstraintError } from "sequelize";
import logger from "../../utils/logger";
import MetaLead from "../../models/MetaLead";
import MetaLeadIntegration from "../../models/MetaLeadIntegration";
import Contact from "../../models/Contact";
import { getMetaLeadData } from "./GetMetaLeadDataService";
import { normalizeMetaLead } from "./NormalizeMetaLeadService";
import CreateCrmLeadService from "../CrmLeadService/CreateCrmLeadService";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import Tag from "../../models/Tag";
import { Op } from "sequelize";

interface WebhookLeadgenEntry {
  leadgen_id: string;
  form_id?: string;
  page_id?: string;
  ad_id?: string;
  created_time?: number;
}

const findIntegration = async (
  companyId: number,
  pageId: string,
  formId?: string
): Promise<MetaLeadIntegration | null> => {
  // Tenta match exato page_id + form_id primeiro
  if (formId) {
    const exact = await MetaLeadIntegration.findOne({
      where: { companyId, pageId, formId, isActive: true }
    });
    if (exact) return exact;
  }

  // Fallback: match apenas por page_id (sem form_id configurado)
  return MetaLeadIntegration.findOne({
    where: {
      companyId,
      pageId,
      isActive: true,
      [Op.or]: [{ formId: null }, { formId: "" }]
    }
  });
};

const findOrCreateContact = async (
  companyId: number,
  name: string,
  phone: string | null,
  email: string | null
): Promise<Contact | null> => {
  if (!phone && !email) return null;

  if (phone) {
    const existing = await Contact.findOne({ where: { number: phone, companyId } });
    if (existing) return existing;
  }

  if (!phone) return null;

  try {
    return await CreateOrUpdateContactService({
      name: name || "Lead Meta Ads",
      number: phone,
      email: email || "",
      isGroup: false,
      companyId
    });
  } catch (err: any) {
    logger.warn(`[META_LEAD_ADS] Não foi possível criar contato: ${err.message}`);
    return null;
  }
};

const findOrCreateTag = async (
  companyId: number,
  tagName: string
): Promise<Tag | null> => {
  if (!tagName) return null;
  try {
    const [tag] = await Tag.findOrCreate({
      where: { companyId, name: tagName },
      defaults: { companyId, name: tagName, color: "#1877F2" } as any
    });
    return tag;
  } catch {
    return null;
  }
};

export const processMetaLeadEntry = async (
  companyId: number,
  entry: WebhookLeadgenEntry
): Promise<void> => {
  const { leadgen_id, form_id, page_id, ad_id, created_time } = entry;

  logger.info(`[META_LEAD_ADS] Iniciando processamento de leadgen_id=${leadgen_id} company=${companyId}`);

  // Verificar duplicidade
  const existing = await MetaLead.findOne({ where: { companyId, leadgenId: leadgen_id } });
  if (existing) {
    logger.info(`[META_LEAD_ADS] leadgen_id=${leadgen_id} já processado anteriormente (status=${existing.status})`);
    return;
  }

  // Criar registro inicial
  let metaLeadRecord = await MetaLead.create({
    companyId,
    leadgenId: leadgen_id,
    formId: form_id || null,
    pageId: page_id || null,
    adId: ad_id || null,
    status: "processing",
    rawPayload: entry as any
  } as any);

  try {
    // Localizar integração ativa
    const integration = page_id
      ? await findIntegration(companyId, page_id, form_id)
      : null;

    if (!integration) {
      logger.warn(`[META_LEAD_ADS] Nenhuma integração ativa encontrada para page_id=${page_id} company=${companyId}`);
      await metaLeadRecord.update({ status: "error", errorMessage: `Nenhuma integração ativa para page_id=${page_id}` });
      return;
    }

    logger.info(`[META_LEAD_ADS] Integração encontrada: id=${integration.id} page=${integration.pageName || page_id}`);
    await metaLeadRecord.update({ integrationId: integration.id });

    // Buscar dados completos na Graph API
    const graphData = await getMetaLeadData(leadgen_id, integration.accessToken);
    if (!graphData) {
      await metaLeadRecord.update({
        status: "error",
        errorMessage: "Falha ao consultar dados na Graph API da Meta"
      });
      return;
    }

    await metaLeadRecord.update({
      rawPayload: graphData as any,
      campaignId: graphData.campaign_id || null,
      adsetId: graphData.adset_id || null
    });

    // Normalizar dados
    const normalized = normalizeMetaLead(graphData.field_data || []);
    logger.info(`[META_LEAD_ADS] Lead normalizado: name="${normalized.name}" phone="${normalized.phone}" email="${normalized.email}"`);

    if (!normalized.name && !normalized.phone && !normalized.email) {
      await metaLeadRecord.update({
        status: "error",
        errorMessage: "Nenhum dado válido encontrado no formulário (sem nome, telefone ou email)",
        normalizedPayload: normalized.rawFields as any
      });
      return;
    }

    await metaLeadRecord.update({
      leadName: normalized.name || null,
      leadPhone: normalized.phone || null,
      leadEmail: normalized.email || null,
      normalizedPayload: normalized.rawFields as any
    });

    // Criar ou localizar contato
    const contact = await findOrCreateContact(
      companyId,
      normalized.name || "Lead Meta Ads",
      normalized.phone,
      normalized.email
    );

    if (contact) {
      logger.info(`[META_LEAD_ADS] Contato criado/encontrado: id=${contact.id}`);
      await metaLeadRecord.update({ contactId: contact.id });
    }

    // Criar lead no CRM
    const tag = integration.defaultTagName
      ? await findOrCreateTag(companyId, integration.defaultTagName)
      : null;

    const crmLead = await CreateCrmLeadService({
      companyId,
      name: normalized.name || normalized.email || `Lead Meta #${leadgen_id}`,
      email: normalized.email || undefined,
      phone: normalized.phone || undefined,
      source: "Meta Ads",
      campaign: graphData.campaign_name || graphData.campaign_id || undefined,
      contactId: contact?.id,
      pipelineId: integration.pipelineId || undefined,
      stageId: integration.stageId || undefined,
      status: "novo",
      tags: tag ? [{ id: tag.id }] : [],
      adMetadata: {
        platform: "meta",
        adTitle: graphData.ad_name || "",
        adDescription: graphData.adset_name || "",
        trackingUrl: "",
        trackingId: leadgen_id
      }
    });

    logger.info(`[META_LEAD_ADS] Lead CRM criado/encontrado: id=${crmLead.id}`);
    await metaLeadRecord.update({ crmLeadId: crmLead.id, status: "processed" });
    logger.info(`[META_LEAD_ADS] Processamento concluído: leadgen_id=${leadgen_id} crmLead=${crmLead.id}`);
  } catch (err: any) {
    if (err instanceof UniqueConstraintError) {
      logger.info(`[META_LEAD_ADS] Duplicata ignorada para leadgen_id=${leadgen_id}`);
      await metaLeadRecord.update({ status: "duplicate" });
      return;
    }
    const msg = err?.message || "Erro desconhecido";
    logger.error(`[META_LEAD_ADS] Erro controlado ao processar leadgen_id=${leadgen_id}: ${msg}`);
    await metaLeadRecord.update({ status: "error", errorMessage: msg.substring(0, 500) });
  }
};
