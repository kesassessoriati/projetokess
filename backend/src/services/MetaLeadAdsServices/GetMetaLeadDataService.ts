import axios from "axios";
import logger from "../../utils/logger";

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v19.0";

export interface MetaLeadFieldData {
  name: string;
  values: string[];
}

export interface MetaLeadGraphData {
  id: string;
  created_time: number;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  field_data: MetaLeadFieldData[];
}

export const getMetaLeadData = async (
  leadgenId: string,
  accessToken: string
): Promise<MetaLeadGraphData | null> => {
  const maskedToken = accessToken.length > 10
    ? `${accessToken.substring(0, 6)}...${accessToken.slice(-4)}`
    : "••••";

  logger.info(`[META_LEAD_ADS] Consultando lead ${leadgenId} na Graph API (token: ${maskedToken})`);

  try {
    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${leadgenId}`;
    const { data } = await axios.get<MetaLeadGraphData>(url, {
      params: {
        access_token: accessToken,
        fields: "id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data"
      },
      timeout: 15000
    });

    logger.info(`[META_LEAD_ADS] Lead ${leadgenId} consultado com sucesso na Graph API`);
    return data;
  } catch (err: any) {
    const errMsg = err.response?.data?.error?.message || err.message;
    logger.warn(`[META_LEAD_ADS] Erro ao consultar leadgen_id ${leadgenId}: ${errMsg}`);
    return null;
  }
};
