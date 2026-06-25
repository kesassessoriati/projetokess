import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import ContactList from "../../models/ContactList";
import Queue from "../../models/Queue";
import Tag from "../../models/Tag";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";

type RelationshipData = {
  contactListId?: number | string | null;
  whatsappId?: number | string | null;
  userId?: number | string | null;
  queueId?: number | string | null;
  tagListId?: number | string | null;
  tagKanbanId?: number | string | null;
};

const normalizeId = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "" || value === "Nenhuma") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const assertCampaignBelongsToCompany = async (
  id: number | string,
  companyId: number | string
): Promise<Campaign> => {
  const record = await Campaign.findOne({
    where: {
      id,
      companyId
    }
  });

  if (!record) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  return record;
};

export const assertTagBelongsToCompany = async (
  tagId: number | string,
  companyId: number | string
): Promise<Tag> => {
  const tag = await Tag.findOne({
    where: {
      id: tagId,
      companyId
    }
  });

  if (!tag) {
    throw new AppError("ERR_INVALID_CAMPAIGN_RELATIONSHIP", 403);
  }

  return tag;
};

export const assertCampaignRelationshipsBelongToCompany = async (
  data: RelationshipData,
  companyId: number | string
): Promise<void> => {
  const contactListId = normalizeId(data.contactListId);
  const whatsappId = normalizeId(data.whatsappId);
  const userId = normalizeId(data.userId);
  const queueId = normalizeId(data.queueId);
  const tagListId = normalizeId(data.tagListId);
  const tagKanbanId = normalizeId(data.tagKanbanId);

  if (contactListId) {
    const contactList = await ContactList.findOne({
      where: { id: contactListId, companyId }
    });

    if (!contactList) {
      throw new AppError("ERR_INVALID_CAMPAIGN_RELATIONSHIP", 403);
    }
  }

  if (whatsappId) {
    const whatsapp = await Whatsapp.findOne({
      where: { id: whatsappId, companyId }
    });

    if (!whatsapp) {
      throw new AppError("ERR_INVALID_CAMPAIGN_RELATIONSHIP", 403);
    }
  }

  if (userId) {
    const user = await User.findOne({
      where: { id: userId, companyId }
    });

    if (!user) {
      throw new AppError("ERR_INVALID_CAMPAIGN_RELATIONSHIP", 403);
    }
  }

  if (queueId) {
    const queue = await Queue.findOne({
      where: { id: queueId, companyId }
    });

    if (!queue) {
      throw new AppError("ERR_INVALID_CAMPAIGN_RELATIONSHIP", 403);
    }
  }

  if (tagListId) {
    await assertTagBelongsToCompany(tagListId, companyId);
  }

  if (tagKanbanId) {
    await assertTagBelongsToCompany(tagKanbanId, companyId);
  }
};
