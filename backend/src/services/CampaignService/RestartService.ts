import Campaign from "../../models/Campaign";
import { campaignQueue } from "../../queues";

export async function RestartService(id: number) {
  const campaign = await Campaign.findByPk(id);
  await campaign.update({ status: "EM_ANDAMENTO" });

  await campaignQueue.add("ProcessCampaign", {
    id: campaign.id,
    companyId: campaign.companyId,
    delay: 3000
  });
}
