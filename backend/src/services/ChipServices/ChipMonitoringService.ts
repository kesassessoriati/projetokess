import { Op } from "sequelize";
import Chip from "../../models/Chip";
import ChipActivityLog from "../../models/ChipActivityLog";
import Whatsapp from "../../models/Whatsapp";
import WhatsappWarmup from "../../models/WhatsappWarmup";
import AppError from "../../errors/AppError";

export const CHIP_EVENT_TYPES = {
  RECHARGE: "recarga",
  CONNECTION: "conexao",
  DISCONNECTION: "desconexao",
  WARMUP_START: "inicio_aquecimento",
  WARMUP_PAUSE: "pausa",
  RISK_DETECTED: "risco_detectado"
} as const;

export const CHIP_LEVEL_PRESETS: Record<number, { messageLimit: number; minInterval: number; maxInterval: number; label: string }> = {
  1: { messageLimit: 15, minInterval: 12, maxInterval: 20, label: "Novo" },
  2: { messageLimit: 30, minInterval: 10, maxInterval: 18, label: "Aquecendo" },
  3: { messageLimit: 55, minInterval: 8, maxInterval: 15, label: "Intermediario" },
  4: { messageLimit: 80, minInterval: 6, maxInterval: 12, label: "Maduro" },
  5: { messageLimit: 120, minInterval: 4, maxInterval: 10, label: "Estavel" }
};

export const normalizeChipLevel = (value?: number | null) => {
  const parsed = Number(value) || 1;
  return Math.min(5, Math.max(1, parsed));
};

export const getChipLevelPreset = (level?: number | null) => {
  const normalized = normalizeChipLevel(level);
  return CHIP_LEVEL_PRESETS[normalized];
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const WHATSAPP_CHANNEL_PREFIX = "whatsapp";

export const isWhatsAppChannel = (channel?: string | null) =>
  !channel || String(channel).toLowerCase().includes(WHATSAPP_CHANNEL_PREFIX);

export const normalizeConnectionNumber = (value?: string | null) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || null;
};

export const getChipDisplayLabel = (chip: Partial<Chip>) =>
  chip.number ||
  chip.sourceConnectionName ||
  (chip.sourceConnectionId ? `Conexao #${chip.sourceConnectionId}` : "Chip sem numero");

const buildChannelMetadata = (whatsapp: Whatsapp) => ({
  channel: whatsapp.channel || "whatsapp",
  provider: whatsapp.provider || null,
  isDefault: Boolean(whatsapp.isDefault),
  allowGroup: Boolean(whatsapp.allowGroup),
  battery: whatsapp.battery || null,
  plugged: whatsapp.plugged ?? null
});

const buildChannelSyncPayload = (whatsapp: Whatsapp) => ({
  number: whatsapp.number || null,
  whatsappId: whatsapp.id,
  sourceConnectionId: whatsapp.id,
  sourceConnectionName: whatsapp.name || null,
  sourceConnectionStatus: whatsapp.status || null,
  syncSource: "whatsapp_channel",
  sourceMetadata: buildChannelMetadata(whatsapp),
  lastChannelSyncAt: new Date()
});

const daysBetween = (date?: string | Date | null) => {
  if (!date) return 0;
  const base = new Date(date);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - base.getTime()) / (24 * 60 * 60 * 1000)));
};

const daysUntil = (date?: string | Date | null) => {
  if (!date) return null;
  const base = new Date(date);
  const now = new Date();
  return Math.ceil((base.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
};

export const createChipActivityLog = async ({
  chipId,
  companyId,
  eventType,
  description,
  metadata = {},
  eventDate = new Date()
}: {
  chipId: number;
  companyId: number;
  eventType: string;
  description: string;
  metadata?: Record<string, any>;
  eventDate?: Date;
}) => ChipActivityLog.create({
  chipId,
  companyId,
  eventType,
  description,
  metadata,
  eventDate
});

export const calculatePredictedBlockAt = (
  lastRechargeAt?: string | null,
  rechargePeriodicityDays?: number | null
) => {
  if (!lastRechargeAt || !rechargePeriodicityDays) return null;
  const base = new Date(lastRechargeAt);
  base.setDate(base.getDate() + Number(rechargePeriodicityDays));
  return base.toISOString().slice(0, 10);
};

export const calculateChipHealth = (chip: Chip, whatsapp?: Whatsapp | null) => {
  const now = new Date();
  const isConnected = whatsapp?.status === "CONNECTED";
  const sessionStatus = whatsapp?.status || chip.sessionStatus || "unknown";
  const ageDays = daysBetween(chip.activationDate || chip.createdAt);
  const daysToBlock = daysUntil(chip.predictedBlockAt);
  const currentConnectedMinutes = isConnected && chip.lastConnectedAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(chip.lastConnectedAt).getTime()) / (60 * 1000)))
    : 0;

  const connectionScore = isConnected ? 28 : chip.whatsappId ? 10 : 6;
  const activityRatio = Math.min(1, (Number(chip.messagesSentToday) || 0) / Math.max(1, Number(chip.warmupMessageLimit) || 1));
  const messageScore = Math.round(activityRatio * 18);
  const stabilityPenalty = Math.min(24, (Number(chip.disconnectCount) || 0) * 4);
  const ageScore = ageDays >= 180 ? 20 : ageDays >= 90 ? 16 : ageDays >= 30 ? 11 : ageDays >= 7 ? 6 : 2;
  const uptimeScore = Math.min(14, Math.floor(currentConnectedMinutes / 30));

  let riskPenalty = 0;
  let blockingRiskLevel = "low";
  let blockingRiskReason = "Sem indicios relevantes de bloqueio.";

  if (sessionStatus === "BLOCKED" || chip.status === "blocked") {
    blockingRiskLevel = "critical";
    blockingRiskReason = "Numero bloqueado ou indisponivel na sessao.";
    riskPenalty = 40;
  } else if (daysToBlock !== null && daysToBlock <= 2) {
    blockingRiskLevel = "high";
    blockingRiskReason = `Recarga expira em ${daysToBlock} dia(s).`;
    riskPenalty = 24;
  } else if (daysToBlock !== null && daysToBlock <= 5) {
    blockingRiskLevel = "medium";
    blockingRiskReason = `Recarga proxima do vencimento em ${daysToBlock} dia(s).`;
    riskPenalty = 12;
  } else if (!isConnected && chip.whatsappId) {
    blockingRiskLevel = "medium";
    blockingRiskReason = "Sessao WhatsApp desconectada.";
    riskPenalty = 10;
  } else if ((Number(chip.disconnectCount) || 0) >= 4) {
    blockingRiskLevel = "medium";
    blockingRiskReason = "Numero com reincidencia de desconexoes.";
    riskPenalty = 10;
  }

  const rawScore = connectionScore + messageScore + ageScore + uptimeScore + 20 - stabilityPenalty - riskPenalty;
  const healthScore = clamp(rawScore);
  const healthStatus =
    healthScore >= 80 ? "saudavel" :
    healthScore >= 60 ? "atencao" :
    healthScore >= 40 ? "risco" :
    "critico";

  return {
    healthScore,
    healthStatus,
    blockingRiskLevel,
    blockingRiskReason,
    sessionStatus
  };
};

export const applyChipLevelPreset = (chipLike: Partial<Chip>) => {
  const level = normalizeChipLevel(chipLike.warmupLevel);
  const preset = getChipLevelPreset(level);
  return {
    warmupLevel: level,
    warmupMessageLimit: preset.messageLimit,
    warmupMinInterval: preset.minInterval,
    warmupMaxInterval: preset.maxInterval
  };
};

export const syncChipHealth = async (chip: Chip) => {
  const whatsapp = chip.whatsappId ? await Whatsapp.findByPk(chip.whatsappId) : null;
  const previousSessionStatus = chip.sessionStatus || "unknown";
  const previousRisk = chip.blockingRiskLevel || "low";
  const predictedBlockAt = calculatePredictedBlockAt(chip.lastRechargeAt, chip.rechargePeriodicityDays);
  const health = calculateChipHealth({ ...chip, predictedBlockAt } as Chip, whatsapp);

  const updates: Partial<Chip> = {
    predictedBlockAt,
    healthScore: health.healthScore,
    blockingRiskLevel: health.blockingRiskLevel,
    blockingRiskReason: health.blockingRiskReason,
    sessionStatus: health.sessionStatus,
    status: chip.whatsappId
      ? health.sessionStatus === "CONNECTED"
        ? health.blockingRiskLevel === "high" || health.blockingRiskLevel === "critical"
          ? "risk"
          : "active"
        : health.sessionStatus === "BLOCKED"
          ? "blocked"
          : "disconnected"
      : chip.status || "inactive"
  };

  if (whatsapp?.status === "CONNECTED") {
    if (previousSessionStatus !== "CONNECTED") {
      updates.lastConnectedAt = new Date();
      updates.connectedMinutes = 0;
      await createChipActivityLog({
        chipId: chip.id,
        companyId: chip.companyId,
        eventType: CHIP_EVENT_TYPES.CONNECTION,
        description: `Chip ${getChipDisplayLabel(chip)} reconectado a sessao ${whatsapp.name || whatsapp.id}.`,
        metadata: { whatsappId: whatsapp.id, status: whatsapp.status }
      });
    } else if (chip.lastConnectedAt) {
      updates.connectedMinutes = Math.max(0, Math.floor((Date.now() - new Date(chip.lastConnectedAt).getTime()) / 60000));
    }
  } else if (chip.whatsappId && previousSessionStatus === "CONNECTED") {
    updates.lastDisconnectedAt = new Date();
    updates.connectedMinutes = 0;
    updates.disconnectCount = (Number(chip.disconnectCount) || 0) + 1;
    await createChipActivityLog({
      chipId: chip.id,
      companyId: chip.companyId,
      eventType: CHIP_EVENT_TYPES.DISCONNECTION,
      description: `Chip ${getChipDisplayLabel(chip)} desconectado da sessao ${whatsapp?.name || chip.whatsappId}.`,
      metadata: { whatsappId: chip.whatsappId, status: whatsapp?.status || "DISCONNECTED" }
    });
  }

  if (health.blockingRiskLevel !== previousRisk && ["high", "critical"].includes(health.blockingRiskLevel)) {
    await createChipActivityLog({
      chipId: chip.id,
      companyId: chip.companyId,
      eventType: CHIP_EVENT_TYPES.RISK_DETECTED,
      description: health.blockingRiskReason,
      metadata: { blockingRiskLevel: health.blockingRiskLevel }
    });
  }

  await chip.update(updates);
  await chip.reload();
  return chip;
};

export const syncWhatsAppChannelsIntoChips = async (companyId: number) => {
  const [whatsapps, chips] = await Promise.all([
    Whatsapp.findAll({
      where: { companyId },
      order: [["id", "ASC"]]
    }),
    Chip.findAll({
      where: { companyId },
      order: [["id", "ASC"]]
    })
  ]);

  const channelSessions = whatsapps.filter(whatsapp => isWhatsAppChannel(whatsapp.channel));
  const byWhatsappId = new Map<number, Chip>();
  const bySourceConnectionId = new Map<number, Chip>();
  const byNormalizedNumber = new Map<string, Chip[]>();

  chips.forEach(chip => {
    if (chip.whatsappId) {
      byWhatsappId.set(Number(chip.whatsappId), chip);
    }
    if (chip.sourceConnectionId) {
      bySourceConnectionId.set(Number(chip.sourceConnectionId), chip);
    }
    const normalizedNumber = normalizeConnectionNumber(chip.number);
    if (normalizedNumber) {
      const records = byNormalizedNumber.get(normalizedNumber) || [];
      records.push(chip);
      byNormalizedNumber.set(normalizedNumber, records);
    }
  });

  const touchedChipIds = new Set<number>();
  const syncedConnectionIds = new Set<number>();

  for (const whatsapp of channelSessions) {
    syncedConnectionIds.add(whatsapp.id);
    const normalizedNumber = normalizeConnectionNumber(whatsapp.number);
    const eligibleNumberMatches = normalizedNumber
      ? (byNormalizedNumber.get(normalizedNumber) || []).filter(candidate =>
          !candidate.sourceConnectionId || Number(candidate.sourceConnectionId) === Number(whatsapp.id)
        )
      : [];
    const safeNumberMatch = eligibleNumberMatches.length === 1 ? eligibleNumberMatches[0] : undefined;
    const matchedChip =
      byWhatsappId.get(whatsapp.id) ||
      bySourceConnectionId.get(whatsapp.id) ||
      safeNumberMatch;

    const payload = buildChannelSyncPayload(whatsapp);

    if (matchedChip) {
      await matchedChip.update(payload);
      touchedChipIds.add(matchedChip.id);
      byWhatsappId.set(whatsapp.id, matchedChip);
      bySourceConnectionId.set(whatsapp.id, matchedChip);
      if (normalizedNumber) {
        const records = byNormalizedNumber.get(normalizedNumber) || [];
        if (!records.some(candidate => candidate.id === matchedChip.id)) {
          records.push(matchedChip);
          byNormalizedNumber.set(normalizedNumber, records);
        }
      }
      continue;
    }

    const createdChip = await Chip.create({
      companyId,
      ...payload,
      status: whatsapp.status === "CONNECTED" ? "active" : "disconnected"
    });

    touchedChipIds.add(createdChip.id);
    byWhatsappId.set(whatsapp.id, createdChip);
    bySourceConnectionId.set(whatsapp.id, createdChip);
    if (normalizedNumber) {
      const records = byNormalizedNumber.get(normalizedNumber) || [];
      records.push(createdChip);
      byNormalizedNumber.set(normalizedNumber, records);
    }

    await createChipActivityLog({
      chipId: createdChip.id,
      companyId,
      eventType: CHIP_EVENT_TYPES.CONNECTION,
      description: `Chip sincronizado automaticamente a partir do canal ${getChipDisplayLabel(createdChip)}.`,
      metadata: { whatsappId: whatsapp.id, syncSource: "whatsapp_channel" }
    });
  }

  const orphanedSyncedChips = chips.filter(chip =>
    chip.syncSource === "whatsapp_channel" &&
    chip.sourceConnectionId &&
    !syncedConnectionIds.has(Number(chip.sourceConnectionId))
  );

  for (const chip of orphanedSyncedChips) {
    await chip.update({
      whatsappId: null,
      sourceConnectionStatus: "REMOVED",
      lastChannelSyncAt: new Date()
    });
    touchedChipIds.add(chip.id);
  }

  return Array.from(touchedChipIds);
};

export const syncCompanyChips = async (companyId: number, options?: { syncChannels?: boolean }) => {
  if (options?.syncChannels) {
    await syncWhatsAppChannelsIntoChips(companyId);
  }

  const chips = await Chip.findAll({
    where: { companyId },
    include: [{ model: Whatsapp }]
  });

  const updated: Chip[] = [];
  for (const chip of chips) {
    updated.push(await syncChipHealth(chip));
  }
  return updated;
};

export const syncAllChips = async () => {
  const BATCH_SIZE = 50;
  let offset = 0;
  while (true) {
    const chips = await Chip.findAll({ limit: BATCH_SIZE, offset, order: [["id", "ASC"]] });
    if (chips.length === 0) break;
    for (const chip of chips) {
      try {
        await syncChipHealth(chip);
      } catch (err) {
        // log individual failure without aborting the rest
        console.error(`[syncAllChips] Erro no chip ${chip.id}:`, err);
      }
    }
    offset += BATCH_SIZE;
  }
};

export const getChipByIdOrThrow = async (id: number, companyId: number) => {
  const chip = await Chip.findOne({
    where: { id, companyId },
    include: [{ model: Whatsapp }]
  });
  if (!chip) {
    throw new AppError("Chip nao encontrado.", 404);
  }
  return chip;
};

export const buildChipDashboard = async (companyId: number) => {
  const chips = await syncCompanyChips(companyId, { syncChannels: true });
  const now = new Date();
  const alerts = chips
    .filter(chip => {
      const daysToBlock = chip.predictedBlockAt ? Math.ceil((new Date(chip.predictedBlockAt).getTime() - now.getTime()) / 86400000) : null;
      return daysToBlock !== null && daysToBlock < 5;
    })
    .map(chip => ({
      chipId: chip.id,
      number: getChipDisplayLabel(chip),
      type: "recharge",
      severity: chip.blockingRiskLevel,
      message: chip.blockingRiskReason,
      predictedBlockAt: chip.predictedBlockAt
    }));

  const summary = {
    totalChips: chips.length,
    activeChips: chips.filter(chip => chip.status === "active").length,
    nearBlockChips: chips.filter(chip => alerts.some(alert => alert.chipId === chip.id)).length,
    disconnectedChips: chips.filter(chip => chip.sessionStatus !== "CONNECTED").length,
    warmingChips: chips.filter(chip => chip.status === "active" && chip.whatsappId).length
  };

  return {
    summary,
    alerts,
    chips,
    levelPresets: CHIP_LEVEL_PRESETS
  };
};

export const getChipLogs = async (chipId: number, companyId: number, limit = 100) => {
  return ChipActivityLog.findAll({
    where: { chipId, companyId },
    order: [["eventDate", "DESC"]],
    limit: Math.min(limit, 300)
  });
};

export const getAvailableDispatchChips = async (companyId: number, chipIds: number[]) => {
  if (!Array.isArray(chipIds) || chipIds.length === 0) return [];
  return Chip.findAll({
    where: {
      id: { [Op.in]: chipIds.map(Number).filter(Boolean) },
      companyId,
      whatsappId: { [Op.ne]: null },
      status: { [Op.notIn]: ["blocked", "inactive"] }
    },
    include: [{
      model: Whatsapp,
      required: true,
      where: { status: "CONNECTED" }
    }],
    order: [["healthScore", "DESC"], ["updatedAt", "ASC"]]
  });
};

export const attachChipToWhatsapp = async (chip: Chip, whatsappId?: number | null) => {
  const whatsapp = whatsappId ? await Whatsapp.findByPk(whatsappId) : null;

  chip.whatsappId = whatsappId ?? null;
  if (whatsapp && isWhatsAppChannel(whatsapp.channel)) {
    Object.assign(chip, buildChannelSyncPayload(whatsapp));
  } else if (!whatsappId) {
    chip.sourceConnectionStatus = chip.syncSource === "whatsapp_channel" ? "REMOVED" : chip.sourceConnectionStatus || null;
  }
  await chip.save();

  const warmup = whatsappId
    ? await WhatsappWarmup.findOne({ where: { whatsappId, companyId: chip.companyId } })
    : null;

  if (warmup && warmup.chipId !== chip.id) {
    await warmup.update({
      chipId: chip.id,
      messagesPerDay: chip.warmupMessageLimit,
      minInterval: chip.warmupMinInterval,
      maxInterval: chip.warmupMaxInterval
    });
  }

  return chip.reload();
};
