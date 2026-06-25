import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import ContactList from "../../models/ContactList";
import Whatsapp from "../../models/Whatsapp";
import User from "../../models/User";
import Queue from "../../models/Queue";
import { assertCampaignRelationshipsBelongToCompany } from "./ValidateCampaignOwnershipService";

interface Data {
  name: string;
  status: string;
  confirmation: boolean;
  scheduledAt: string;
  companyId: number;
  contactListId: number;
  message1?: string;
  message2?: string;
  message3?: string;
  message4?: string;
  message5?: string;
  confirmationMessage1?: string;
  confirmationMessage2?: string;
  confirmationMessage3?: string;
  confirmationMessage4?: string;
  confirmationMessage5?: string;
  userId: number | string;
  queueId: number | string;
  statusTicket: string;
  openTicket: string;
  messageType?: string;
  buttons?: object[];
  carouselCards?: object[];
  listSections?: object[];
  listButtonText?: string;
  listFooter?: string;
  campaignType?: string;
  emailSubject?: string;
  emailBody?: string;
  randomizedDispatch?: boolean;
  dispatchMinDelaySeconds?: number | null;
  dispatchMaxDelaySeconds?: number | null;
  dailyLimit?: number | null;
  enableTypingIndicator?: boolean;
  typingDurationSeconds?: number;
  enableAiMessageVariation?: boolean;
}

const CreateService = async (data: Data): Promise<Campaign> => {
  const { name, companyId } = data;

  const ticketnoteSchema = Yup.object().shape({
    name: Yup.string()
      .min(3, "ERR_CAMPAIGN_INVALID_NAME")
      .required("ERR_CAMPAIGN_REQUIRED")
  });

  try {
    await ticketnoteSchema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  if (data.scheduledAt != null && data.scheduledAt !== "") {
    const parsedScheduledAt = new Date(data.scheduledAt);
    if (Number.isNaN(parsedScheduledAt.getTime())) {
      data.scheduledAt = null as any;
    } else {
      data.scheduledAt = parsedScheduledAt.toISOString() as any;
    }
  }

  if (data.scheduledAt != null && data.scheduledAt !== "") {
    data.status = "PROGRAMADA";
  }

  await assertCampaignRelationshipsBelongToCompany(data, companyId);

  const record = await Campaign.create(data);

  await record.reload({
    include: [
      { model: ContactList },
      { model: Whatsapp, attributes: ["id", "name"] },
      { model: User, attributes: ["id", "name"] },
      { model: Queue, attributes: ["id", "name"] }
    ]
  });

  return record;
};

export default CreateService;
