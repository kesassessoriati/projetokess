// @ts-nocheck
import fs from "fs";
import path from "path";
import { sendButtonMessage } from "../../helpers/SendInteractiveMessage";
import { getMessageOptions } from "../WbotServices/SendWhatsAppMedia";

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

export const resolveFollowUpMediaPath = (mediaUrl?: string | null): string | null => {
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith("http")) return mediaUrl;

  const normalized = mediaUrl.replace(/^\/+/, "");
  const relative = normalized.startsWith("public/") ? normalized.replace(/^public\//, "") : normalized;
  const fullPath = path.resolve(publicFolder, relative);

  if (fs.existsSync(fullPath)) {
    return fullPath;
  }

  const fallbackPath = path.resolve(publicFolder, normalized.replace(/^company/, "company"));
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }

  return fullPath;
};

export const sendFollowUpStageMessage = async ({
  wbot,
  jid,
  stage,
  companyId
}) => {
  if (stage.messageType === "buttons" && stage.buttons?.length) {
    await sendButtonMessage(wbot, jid, stage.message || "", "", stage.buttons);
    return { status: "sent" };
  }

  if (stage.messageType === "text" || !stage.messageType) {
    await wbot.sendMessage(jid, { text: stage.message || "" });
    return { status: "sent" };
  }

  if (stage.mediaUrl) {
    const filePath = resolveFollowUpMediaPath(stage.mediaUrl);
    const options = await getMessageOptions(
      path.basename(stage.mediaUrl),
      filePath,
      String(companyId),
      stage.mediaCaption || stage.message || ""
    );

    if (!options) {
      return { status: "failed" };
    }

    await wbot.sendMessage(jid, { ...options });
    return { status: "sent" };
  }

  if (stage.message) {
    await wbot.sendMessage(jid, { text: stage.message });
    return { status: "sent" };
  }

  return { status: "skipped" };
};
