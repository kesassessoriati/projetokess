// @ts-nocheck
/**
 * ExecuteFollowUpCampaignService
 *
 * Runs every 5 minutes via cron. For each active FollowUpCampaign:
 * 1. Finds tickets in the company with outgoing messages in the last 48h
 * 2. Checks if the contact replied after the last outgoing message
 * 3. Sends the next pending stage message if enough time elapsed and no reply
 * 4. Logs activity in FollowUpLogs
 */
import { Op } from "sequelize";
import FollowUpCampaign from "../../models/FollowUpCampaign";
import FollowUpStage from "../../models/FollowUpStage";
import FollowUpLog from "../../models/FollowUpLog";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { getWbot } from "../../libs/wbot";
import { sendButtonMessage } from "../../helpers/SendInteractiveMessage";

const LOOKBACK_HOURS = 48;

const executeFollowUpCampaigns = async () => {
  try {
    const campaigns = await FollowUpCampaign.findAll({
      where: { isActive: true },
      include: [
        {
          model: FollowUpStage,
          as: "stages",
          where: { isActive: true },
          required: false,
          order: [["order", "ASC"]],
        },
      ],
    });

    for (const campaign of campaigns) {
      try {
        await processCampaign(campaign);
      } catch (err) {
        console.error(`[FollowUpCampaign] Error processing campaign ${campaign.id}:`, err?.message);
      }
    }
  } catch (err) {
    console.error("[FollowUpCampaign] Fatal error:", err?.message);
  }
};

async function resolveWbot(campaign) {
  let whatsappId = campaign.whatsappId;
  if (!whatsappId) {
    const fallback = await Whatsapp.findOne({
      where: { companyId: campaign.companyId, status: "CONNECTED" },
      attributes: ["id"],
    });
    whatsappId = fallback?.id ?? null;
  }
  if (!whatsappId) return null;
  try {
    return getWbot(whatsappId);
  } catch {
    return null;
  }
}

async function processCampaign(campaign) {
  const stages = campaign.stages || [];
  if (!stages.length) return;

  const cutoffDate = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

  const recentTickets = await Ticket.findAll({
    where: { companyId: campaign.companyId, status: { [Op.ne]: "closed" } },
    include: [
      {
        model: Message,
        as: "messages",
        where: { fromMe: true, createdAt: { [Op.gte]: cutoffDate } },
        required: true,
        separate: true,
        order: [["createdAt", "DESC"]],
        limit: 1,
      },
      {
        model: Contact,
        as: "contact",
        required: true,
      },
    ],
  });

  for (const ticket of recentTickets) {
    try {
      await processContact(campaign, stages, ticket);
    } catch (err) {
      console.error(`[FollowUpCampaign] Error on ticket ${ticket.id}:`, err?.message);
    }
  }
}

async function processContact(campaign, stages, ticket) {
  const contact = ticket.contact;
  if (!contact) return;

  const contactNumber = contact.number;
  const messages = ticket.messages || [];

  const firstOutgoingMs = messages.reduce((earliest, m) => {
    const t = new Date(m.createdAt).getTime();
    return !earliest || t < earliest ? t : earliest;
  }, null);

  if (!firstOutgoingMs) return;

  // Check if contact replied after the first outgoing message
  const replied = await Message.findOne({
    where: {
      ticketId: ticket.id,
      fromMe: false,
      createdAt: { [Op.gt]: new Date(firstOutgoingMs) },
    },
  });

  if (replied) {
    await FollowUpLog.update(
      { respondedAt: replied.createdAt, status: "responded" },
      {
        where: {
          followUpCampaignId: campaign.id,
          contactNumber,
          companyId: campaign.companyId,
          status: { [Op.in]: ["pending", "sent"] },
        },
      }
    );
    return;
  }

  const elapsedMinutes = Math.floor((Date.now() - firstOutgoingMs) / 60000);

  for (const stage of stages) {
    if (elapsedMinutes < stage.delayMinutes) continue;

    const existingLog = await FollowUpLog.findOne({
      where: {
        followUpCampaignId: campaign.id,
        stageId: stage.id,
        contactNumber,
        companyId: campaign.companyId,
        status: { [Op.in]: ["sent", "responded"] },
      },
    });

    if (existingLog) continue;

    let status = "sent";
    try {
      const wbot = await resolveWbot(campaign);
      if (!wbot) {
        status = "skipped";
      } else {
        const jid = `${contactNumber}@s.whatsapp.net`;
        if (stage.messageType === "buttons" && stage.buttons?.length) {
          await sendButtonMessage(wbot, jid, stage.message || "", "", stage.buttons);
        } else if (stage.messageType === "text" || !stage.messageType) {
          await wbot.sendMessage(jid, { text: stage.message || "" });
        } else if (stage.mediaUrl) {
          const path = require("path");
          const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
          const filePath = stage.mediaUrl.startsWith("http") ? stage.mediaUrl : path.join(publicFolder, stage.mediaUrl.replace("/public", ""));
          const { getMessageOptions } = require("../WbotServices/SendWhatsAppMedia");
          const options = await getMessageOptions(
            path.basename(stage.mediaUrl),
            filePath,
            campaign.companyId.toString(),
            stage.mediaCaption || stage.message || ""
          );
          if (options) {
            await wbot.sendMessage(jid, { ...options });
          } else {
            status = "failed";
          }
        } else {
          if (stage.message) await wbot.sendMessage(jid, { text: stage.message });
        }
      }
    } catch (sendErr) {
      console.error(`[FollowUpCampaign] Send error stage ${stage.id}:`, sendErr?.message);
      status = "failed";
    }

    await FollowUpLog.create({
      followUpCampaignId: campaign.id,
      stageId: stage.id,
      contactNumber,
      companyId: campaign.companyId,
      sentAt: status === "sent" ? new Date() : null,
      status,
    });

    // One stage per contact per run
    break;
  }
}

export default executeFollowUpCampaigns;
