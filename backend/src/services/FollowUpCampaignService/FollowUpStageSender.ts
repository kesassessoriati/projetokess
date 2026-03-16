// @ts-nocheck
import fs from "fs";
import path from "path";
import mime from "mime-types";
import { sendButtonMessage } from "../../helpers/SendInteractiveMessage";
import { getMessageOptions } from "../WbotServices/SendWhatsAppMedia";

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
const FOLLOW_UP_ALLOWED_MESSAGE_TYPE = "text";

const normalizeStageForTextOnlyDispatch = (stage: any = {}) => ({
  ...stage,
  // Follow-up media/buttons are intentionally disabled for this release.
  messageType: FOLLOW_UP_ALLOWED_MESSAGE_TYPE,
  message: stage?.message ?? stage?.mediaCaption ?? "",
  mediaUrl: null,
  mediaType: null,
  mediaCaption: null,
  buttons: [],
});

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

export const sendFollowUpStageMessage = async ({
  wbot,
  jid,
  stage,
  companyId
}) => {
  const activeStage = normalizeStageForTextOnlyDispatch(stage);

  if (activeStage.messageType === "text" || !activeStage.messageType) {
    // Keep follow-up dispatch isolated from the Message persistence pipeline.
    // The campaign engine is triggered only by outbound messages already stored
    // in the Message table, so persisting follow-up stages here would recurse.
    await wbot.sendMessage(jid, { text: activeStage.message || "" });
    return { status: "sent", resolvedPath: null, attemptedPaths: [] };
  }

  // Legacy non-text delivery paths stay below for future follow-up reactivation.
  if (stage.messageType === "buttons" && stage.buttons?.length) {
    await sendButtonMessage(wbot, jid, stage.message || "", "", stage.buttons);
    return { status: "sent", resolvedPath: null, attemptedPaths: [] };
  }

  if (stage.mediaUrl) {
    const { resolvedPath: filePath, attemptedPaths } = resolveExistingFollowUpMediaPath(stage.mediaUrl, companyId);

    if (!filePath || (!filePath.startsWith("http") && !fs.existsSync(filePath))) {
      const error: any = new Error(`Arquivo de midia nao encontrado: ${stage.mediaUrl}`);
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
      path.basename(stage.mediaUrl),
      filePath,
      String(companyId),
      stage.mediaCaption || stage.message || ""
    );

    if (!options) {
      return { status: "failed", resolvedPath: filePath, attemptedPaths };
    }

    await wbot.sendMessage(jid, { ...options });
    return { status: "sent", resolvedPath: filePath, attemptedPaths };
  }

  if (stage.message) {
    await wbot.sendMessage(jid, { text: stage.message });
    return { status: "sent", resolvedPath: null, attemptedPaths: [] };
  }

  return { status: "skipped", resolvedPath: null, attemptedPaths: [] };
};
