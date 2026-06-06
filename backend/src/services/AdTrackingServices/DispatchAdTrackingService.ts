import AdTrackingIntegration from "../../models/AdTrackingIntegration";
import AdTrackingMapping from "../../models/AdTrackingMapping";
import AdTrackingEvent from "../../models/AdTrackingEvent";
import Contact from "../../models/Contact";
import CrmLead from "../../models/CrmLead";
import logger from "../../utils/logger";
import { sendMetaConversion } from "./MetaAdsService";
import { sendGoogleAdsConversion } from "./GoogleAdsService";

interface DispatchParams {
  companyId: number;
  pipelineId: number;
  stageId: number;
  opportunityId?: number;
  leadId?: number;
  contactId?: number;
  ticketId?: number;
  value?: number;
}

const maskToken = (token: string): string =>
  token ? `${token.substring(0, 6)}...${token.slice(-4)}` : "";

const DispatchAdTrackingService = async (params: DispatchParams): Promise<void> => {
  const { companyId, pipelineId, stageId, opportunityId, leadId, contactId, ticketId, value } = params;

  try {
    const mappings = await AdTrackingMapping.findAll({
      where: { companyId, pipelineId, stageId, active: true },
      include: [{ model: AdTrackingIntegration, as: "integration", where: { active: true } }]
    }) as any[];

    if (!mappings || mappings.length === 0) return;

    let contactData: { phone?: string; email?: string; firstName?: string; lastName?: string } = {};
    let gclidValue: string | undefined;

    if (contactId) {
      const contact = await Contact.findOne({ where: { id: contactId, companyId } });
      if (contact) {
        contactData = {
          phone: (contact as any).number || "",
          email: (contact as any).email || "",
          firstName: (contact as any).name?.split(" ")[0] || "",
          lastName: (contact as any).name?.split(" ").slice(1).join(" ") || ""
        };
      }
    }

    if (leadId) {
      const lead = await CrmLead.findOne({ where: { id: leadId, companyId } }) as any;
      if (lead) {
        gclidValue = lead.gclid || lead.customFields?.gclid || undefined;
        if (!contactData.email && lead.email) contactData.email = lead.email;
        if (!contactData.phone && lead.phone) contactData.phone = lead.phone;
      }
    }

    for (const mapping of mappings) {
      const integration = mapping.integration;
      if (!integration) continue;

      const eventName = mapping.customEventName || mapping.eventName;
      const credentials = integration.credentials || {};

      let logEntry: Partial<typeof AdTrackingEvent.prototype> = {
        companyId,
        provider: integration.provider,
        integrationId: integration.id,
        mappingId: mapping.id,
        leadId,
        opportunityId,
        contactId,
        ticketId,
        pipelineId,
        stageId,
        eventName
      };

      if (integration.provider === "meta") {
        const { pixelId, accessToken } = credentials;
        if (!pixelId || !accessToken) {
          await AdTrackingEvent.create({
            ...logEntry,
            status: "skipped",
            errorMessage: "Credenciais Meta incompletas (pixelId ou accessToken ausente)."
          });
          continue;
        }

        logger.info(`[AdTracking] Disparando Meta pixel=${maskToken(pixelId)} event=${eventName} companyId=${companyId}`);

        const result = await sendMetaConversion({
          pixelId,
          accessToken,
          eventName,
          userData: contactData,
          customData: {
            lead_id: leadId,
            opportunity_id: opportunityId,
            pipeline_id: pipelineId,
            stage_id: stageId,
            value,
            currency: "BRL"
          }
        });

        await AdTrackingEvent.create({
          ...logEntry,
          payload: { eventName, pipelineId, stageId },
          response: result.response ? { ...result.response } : { error: result.error },
          status: result.success ? "success" : "failed",
          errorMessage: result.error || null
        });

      } else if (integration.provider === "google") {
        const { customerId, conversionActionId, developerToken, clientId, clientSecret, refreshToken } = credentials;
        if (!customerId || !conversionActionId || !developerToken) {
          await AdTrackingEvent.create({
            ...logEntry,
            status: "skipped",
            errorMessage: "Credenciais Google Ads incompletas."
          });
          continue;
        }

        logger.info(`[AdTracking] Disparando Google Ads customer=${customerId} event=${eventName} companyId=${companyId}`);

        const result = await sendGoogleAdsConversion({
          credentials: { customerId, conversionActionId, developerToken, clientId, clientSecret, refreshToken },
          eventName,
          userData: contactData,
          gclid: gclidValue,
          value
        });

        await AdTrackingEvent.create({
          ...logEntry,
          payload: { eventName, pipelineId, stageId, hasGclid: !!gclidValue },
          response: result.response ? { ...result.response } : { error: result.error },
          status: result.success ? "success" : "failed",
          errorMessage: result.error || null
        });
      }
    }
  } catch (err: any) {
    logger.error(`[AdTracking] Erro ao despachar conversão companyId=${companyId}: ${err.message}`);
  }
};

export default DispatchAdTrackingService;
