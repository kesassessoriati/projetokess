import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { head } from "lodash";
import fs from "fs";
import path from "path";
import { Op } from "sequelize";

import ListService from "../services/CampaignService/ListService";
import CreateService from "../services/CampaignService/CreateService";
import ShowService from "../services/CampaignService/ShowService";
import UpdateService from "../services/CampaignService/UpdateService";
import DeleteService from "../services/CampaignService/DeleteService";
import FindService from "../services/CampaignService/FindService";
import GetAnalyticsOverviewService from "../services/CampaignService/GetAnalyticsOverviewService";
import logger from "../utils/logger";

import Campaign from "../models/Campaign";

import ContactTag from "../models/ContactTag";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";

import AppError from "../errors/AppError";
import { CancelService } from "../services/CampaignService/CancelService";
import { RestartService } from "../services/CampaignService/RestartService";
import { assertTagBelongsToCompany } from "../services/CampaignService/ValidateCampaignOwnershipService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  companyId: string | number;
};

type StoreData = {
  name: string;
  status: string;
  confirmation: boolean;
  scheduledAt: string;
  companyId: number;
  contactListId: number;
  tagListId: number | string;
  tagKanbanId: number | string;
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
};

const createContactListFromTag = async ({
  tagId,
  campaignName,
  companyId,
  label
}: {
  tagId: number;
  campaignName: string;
  companyId: number;
  label: string;
}): Promise<number> => {
  await assertTagBelongsToCompany(tagId, companyId);

  const contactTags = await ContactTag.findAll({ where: { tagId } });
  const contactIds = contactTags.map(contactTag => contactTag.contactId);

  const contacts = contactIds.length
    ? await Contact.findAll({
      where: {
        id: { [Op.in]: contactIds },
        companyId
      }
    })
    : [];

  const formattedDate = new Date().toISOString();
  const contactList = await ContactList.create({
    name: `${campaignName} | ${label}: ${tagId} - ${formattedDate}`,
    companyId
  });

  const contactListItems = contacts.map(contact => ({
    name: contact.name,
    number: contact.number,
    email: contact.email,
    contactListId: contactList.id,
    companyId,
    isWhatsappValid: true,
    isGroup: contact.isGroup
  }));

  if (contactListItems.length) {
    await ContactListItem.bulkCreate(contactListItems);
  }

  return contactList.id;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { records, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ records, count, hasMore });
};

export const analyticsOverview = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  try {
    const analytics = await GetAnalyticsOverviewService(companyId);
    return res.status(200).json(analytics);
  } catch (err: any) {
    logger.error(`[analyticsOverview] Erro companyId=${companyId}: ${err?.message || err}`);
    return res.status(500).json({ error: "Erro ao carregar analytics" });
  }
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body as StoreData;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const tagListId = Number(data.tagListId);
  const tagKanbanId = Number(data.tagKanbanId);

  if (Number.isFinite(tagListId) && tagListId > 0) {
    const contactListId = await createContactListFromTag({
      tagId: tagListId,
      campaignName: data.name,
      companyId,
      label: "TAG"
    });

    const record = await CreateService({
      ...data,
      companyId,
      contactListId
    });
    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-campaign`, {
        action: "create",
        record
      });
    return res.status(200).json(record);

  } else if (Number.isFinite(tagKanbanId) && tagKanbanId > 0) {
    const contactListId = await createContactListFromTag({
      tagId: tagKanbanId,
      campaignName: data.name,
      companyId,
      label: "TAGKANBAN"
    });

    const record = await CreateService({
      ...data,
      companyId,
      contactListId
    });
    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-campaign`, {
        action: "create",
        record
      });
    return res.status(200).json(record);

  } else { // SAI DO CHECK DE TAG


    const record = await CreateService({
      ...data,
      companyId
    });

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-campaign`, {
        action: "create",
        record
      });

    return res.status(200).json(record);
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const record = await ShowService({ id, companyId });

  return res.status(200).json(record);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body as StoreData;

  const { companyId } = req.user;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { id } = req.params;

  const record = await UpdateService({
    ...data,
    id,
    companyId
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-campaign`, {
      action: "update",
      record
    });

  return res.status(200).json(record);
};

export const cancel = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await CancelService(+id, companyId);

  return res.status(204).json({ message: "Cancelamento realizado" });
};

export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await RestartService(+id, companyId);

  return res.status(204).json({ message: "Reinício dos disparos" });
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteService(id, companyId);

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-campaign`, {
      action: "delete",
      id
    });

  return res.status(200).json({ message: "Campaign deleted" });
};

export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const records: Campaign[] = await FindService({ companyId });

  return res.status(200).json(records);
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  try {
    const campaign = await Campaign.findOne({ where: { id, companyId } });
    if (!campaign || !file) {
      throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
    }
    campaign.mediaPath = file.filename;
    campaign.mediaName = file.originalname;
    await campaign.save();
    return res.send({ mensagem: "Mensagem enviada" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  try {
    const campaign = await Campaign.findOne({ where: { id, companyId } });
    if (!campaign) {
      throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
    }
    const filePath = path.resolve("public", `company${companyId}`, campaign.mediaPath);
    const fileExists = fs.existsSync(filePath);
    if (fileExists) {
      fs.unlinkSync(filePath);
    }

    campaign.mediaPath = null;
    campaign.mediaName = null;
    await campaign.save();
    return res.send({ mensagem: "Arquivo excluído" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};
