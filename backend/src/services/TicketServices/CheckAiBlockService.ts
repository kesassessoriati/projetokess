import Contact from "../../models/Contact";
import logger from "../../utils/logger";

interface AiBlockResult {
  blocked: boolean;
  reason: string;
  blockedUntil?: Date | null;
}

const CheckAiBlockService = async (
  contactId: number,
  companyId: number
): Promise<AiBlockResult> => {
  try {
    const contact = await Contact.findOne({
      where: { id: contactId, companyId },
      attributes: ["id", "aiBlockedUntil", "aiBlockMode", "aiBlockedByStageId"],
    });

    if (!contact) return { blocked: false, reason: "" };

    const { aiBlockMode, aiBlockedUntil } = contact;

    if (!aiBlockMode) return { blocked: false, reason: "" };

    if (aiBlockMode === "pause_until") {
      if (!aiBlockedUntil) return { blocked: false, reason: "" };
      const now = new Date();
      if (aiBlockedUntil > now) {
        return { blocked: true, reason: "pause_until", blockedUntil: aiBlockedUntil };
      }
      // Block expired — auto-clear
      await contact.update({ aiBlockedUntil: null, aiBlockMode: null, aiBlockedByStageId: null });
      return { blocked: false, reason: "" };
    }

    if (aiBlockMode === "disabled_in_stage") {
      return { blocked: true, reason: "disabled_in_stage" };
    }

    if (aiBlockMode === "disabled_manual") {
      return { blocked: true, reason: "disabled_manual" };
    }

    return { blocked: false, reason: "" };
  } catch (err: any) {
    logger.warn(`[CheckAiBlock] Error checking block for contactId=${contactId}: ${err?.message}`);
    return { blocked: false, reason: "" };
  }
};

export default CheckAiBlockService;
