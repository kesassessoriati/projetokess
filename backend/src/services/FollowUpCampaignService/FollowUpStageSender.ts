// @ts-nocheck
import fs from "fs";
import path from "path";
import mime from "mime-types";
import { sendButtonMessage } from "../../helpers/SendInteractiveMessage";
import { getMessageOptions } from "../WbotServices/SendWhatsAppMedia";
import MediaFile from "../../models/MediaFile";
import buildSmartFollowUpMessageService from "./BuildSmartFollowUpMessageService";

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

const resolveExistingFollowUpMediaPath = (mediaUrl: string, companyId: string | number) => {
  const directPath = resolveFollowUpMediaPath(mediaUrl);
  const attemptedPaths: string[] = [];

  if (directPath) {
    attemptedPaths.push(directPath);
  }

  if (directPath && (directPath.startsWith("http") || fs.existsSync(directPath))) {
    return { resolvedPath: directPath, attemptedPaths };
  }

  const baseName = path.basename(mediaUrl);
  const companyFolder = path.resolve(publicFolder, `company${companyId}`);
  const candidates = [
    path.resolve(companyFolder, "followups", baseName),
    path.resolve(companyFolder, baseName),
    path.resolve(publicFolder, baseName),
  ];

  for (const candidate of candidates) {
    attemptedPaths.push(candidate);
    if (fs.existsSync(candidate)) {
      return { resolvedPath: candidate, attemptedPaths };
    }
  }

  return { resolvedPath: directPath, attemptedPaths };
};

const resolveStageMedia = async (stage: any, companyId: string | number) => {
  if (stage?.mediaId) {
    const media = await MediaFile.findOne({
      where: { id: stage.mediaId, companyId }
    });

    if (media?.storagePath) {
      return resolveExistingFollowUpMediaPath(media.storagePath, companyId);
    }
  }

  if (stage?.mediaUrl) {
    return resolveExistingFollowUpMediaPath(stage.mediaUrl, companyId);
  }

  return { resolvedPath: null, attemptedPaths: [] };
};

export const sendFollowUpStageMessage = async ({
  wbot,
  jid,
  stage,
  companyId,
  campaign,
  ticket,
  latestInboundMessage,
  triggerMessage
}) => {
  const resolvedMessage = await buildSmartFollowUpMessageService({
    companyId: Number(companyId),
    campaign,
    stage,
    ticket,
    latestInboundMessage,
    triggerMessage
  });

  if (stage.messageType === "text" || !stage.messageType) {
    // Keep follow-up dispatch isolated from the Message persistence pipeline.
    // The campaign engine is triggered only by outbound messages already stored
    // in the Message table, so persisting follow-up stages here would recurse.
    await wbot.sendMessage(jid, { text: resolvedMessage || stage.message || "" });
    return { status: "sent", resolvedPath: null, attemptedPaths: [] };
  }

  if (stage.messageType === "buttons" && stage.buttons?.length) {
    await sendButtonMessage(wbot, jid, resolvedMessage || stage.message || "", "", stage.buttons);
    return { status: "sent", resolvedPath: null, attemptedPaths: [] };
  }

  if (stage.mediaUrl || stage.mediaId) {
    const { resolvedPath: filePath, attemptedPaths } = await resolveStageMedia(stage, companyId);

    if (!filePath || (!filePath.startsWith("http") && !fs.existsSync(filePath))) {
      const error: any = new Error(`Arquivo de midia nao encontrado: ${stage.mediaUrl || stage.mediaId}`);
      error.resolvedPath = filePath || null;
      error.attemptedPaths = attemptedPaths;
      throw error;
    }

    if (stage.messageType === "audio") {
      const mimeType = String(mime.lookup(filePath) || stage.mediaType || "audio/ogg");
      const isPtt = mimeType.includes("ogg") || mimeType.includes("opus");

      await wbot.sendMessage(jid, {
        audio: fs.readFileSync(filePath),
        mimetype: mimeType,
        ptt: isPtt
      });
      return { status: "sent", resolvedPath: filePath, attemptedPaths };
    }

    const options = await getMessageOptions(
      path.basename(stage.mediaUrl || filePath),
      filePath,
      String(companyId),
      stage.mediaCaption || resolvedMessage || stage.message || ""
    );

    if (!options) {
      return { status: "failed", resolvedPath: filePath, attemptedPaths };
    }

    await wbot.sendMessage(jid, { ...options });
    return { status: "sent", resolvedPath: filePath, attemptedPaths };
  }

  if (resolvedMessage || stage.message) {
    await wbot.sendMessage(jid, { text: resolvedMessage || stage.message });
    return { status: "sent", resolvedPath: null, attemptedPaths: [] };
  }

  return { status: "skipped", resolvedPath: null, attemptedPaths: [] };
};
