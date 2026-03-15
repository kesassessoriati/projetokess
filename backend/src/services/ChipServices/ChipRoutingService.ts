import Chip from "../../models/Chip";
import { getAvailableDispatchChips } from "./ChipMonitoringService";

const normalizeChipIds = (chipIds?: number[] | null) =>
  Array.isArray(chipIds) ? chipIds.map(Number).filter(Boolean) : [];

export const resolveDispatchWhatsapp = async ({
  companyId,
  dispatchMode,
  chipIds,
  fallbackWhatsappId,
  rotationCursor = 0
}: {
  companyId: number;
  dispatchMode?: string;
  chipIds?: number[] | null;
  fallbackWhatsappId?: number | null;
  rotationCursor?: number;
}) => {
  const normalizedChipIds = normalizeChipIds(chipIds);

  if (normalizedChipIds.length === 0) {
    return {
      whatsappId: fallbackWhatsappId ?? null,
      chip: null as Chip | null,
      nextCursor: rotationCursor || 0
    };
  }

  const chips = await getAvailableDispatchChips(companyId, normalizedChipIds);
  if (chips.length === 0) {
    return {
      whatsappId: fallbackWhatsappId ?? null,
      chip: null as Chip | null,
      nextCursor: rotationCursor || 0
    };
  }

  if (dispatchMode !== "round_robin") {
    return {
      whatsappId: chips[0].whatsappId ?? fallbackWhatsappId ?? null,
      chip: chips[0],
      nextCursor: rotationCursor || 0
    };
  }

  const currentCursor = Number(rotationCursor) || 0;
  const index = Math.abs(currentCursor) % chips.length;
  const chip = chips[index];

  return {
    whatsappId: chip.whatsappId ?? fallbackWhatsappId ?? null,
    chip,
    nextCursor: (index + 1) % chips.length
  };
};
