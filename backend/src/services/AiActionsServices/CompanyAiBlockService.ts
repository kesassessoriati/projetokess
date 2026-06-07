import logger from "../../utils/logger";
import GetOrCreateExternalAgentConfigService from "../AiExternalAgentServices/GetOrCreateExternalAgentConfigService";
import AiExternalAgentConfig from "../../models/AiExternalAgentConfig";

export interface CompanyAiBlockResult {
  blocked: boolean;
  reason: "company_paused" | "company_disabled" | null;
  pausedUntil?: Date;
  disabledReason?: string;
  pauseReason?: string;
}

export interface CompanyAiStatus {
  status: "active" | "paused" | "disabled";
  pausedUntil?: Date;
  pauseReason?: string;
  disabledReason?: string;
  pausedByUserId?: number;
  disabledByUserId?: number;
  disabledAt?: string;
}

async function getConfig(companyId: number): Promise<AiExternalAgentConfig> {
  return GetOrCreateExternalAgentConfigService({ companyId, userId: 0 });
}

export async function checkCompanyAiBlock(companyId: number): Promise<CompanyAiBlockResult> {
  try {
    const config = await getConfig(companyId);
    const meta = (config.metadata as any) || {};

    if (meta.companyAiDisabled === true) {
      return { blocked: true, reason: "company_disabled", disabledReason: meta.companyAiDisabledReason };
    }

    if (meta.companyAiPausedUntil) {
      const pausedUntil = new Date(meta.companyAiPausedUntil);
      if (pausedUntil > new Date()) {
        return { blocked: true, reason: "company_paused", pausedUntil, pauseReason: meta.companyAiPauseReason };
      }
      // Pausa expirada — limpar automaticamente
      await clearExpiredPause(config);
    }

    return { blocked: false, reason: null };
  } catch (err) {
    logger.error(`[CompanyAiBlock] Erro ao verificar bloqueio companyId=${companyId}: ${err}`);
    return { blocked: false, reason: null };
  }
}

async function clearExpiredPause(config: AiExternalAgentConfig): Promise<void> {
  const meta = { ...(config.metadata as any) };
  delete meta.companyAiPausedUntil;
  delete meta.companyAiPauseReason;
  delete meta.companyAiPausedByUserId;
  await config.update({ metadata: meta });
}

export async function getCompanyAiStatus(companyId: number): Promise<CompanyAiStatus> {
  const config = await getConfig(companyId);
  const meta = (config.metadata as any) || {};

  if (meta.companyAiDisabled === true) {
    return {
      status: "disabled",
      disabledReason: meta.companyAiDisabledReason || null,
      disabledByUserId: meta.companyAiDisabledByUserId || null,
      disabledAt: meta.companyAiDisabledAt || null,
    };
  }

  if (meta.companyAiPausedUntil) {
    const pausedUntil = new Date(meta.companyAiPausedUntil);
    if (pausedUntil > new Date()) {
      return {
        status: "paused",
        pausedUntil,
        pauseReason: meta.companyAiPauseReason || null,
        pausedByUserId: meta.companyAiPausedByUserId || null,
      };
    }
    await clearExpiredPause(config);
  }

  return { status: "active" };
}

export async function pauseCompanyAiUntil(
  companyId: number,
  pauseUntil: Date,
  reason: string | null,
  userId: number
): Promise<void> {
  const config = await getConfig(companyId);
  await config.update({
    metadata: {
      ...(config.metadata as any),
      companyAiDisabled: false,
      companyAiPausedUntil: pauseUntil.toISOString(),
      companyAiPauseReason: reason || null,
      companyAiPausedByUserId: userId,
    },
  });
  logger.info(`[CompanyAiBlock] IA pausada companyId=${companyId} until=${pauseUntil.toISOString()} userId=${userId}`);
}

export async function disableCompanyAi(
  companyId: number,
  reason: string | null,
  userId: number
): Promise<void> {
  const config = await getConfig(companyId);
  await config.update({
    metadata: {
      ...(config.metadata as any),
      companyAiDisabled: true,
      companyAiDisabledReason: reason || null,
      companyAiDisabledByUserId: userId,
      companyAiDisabledAt: new Date().toISOString(),
      companyAiPausedUntil: null,
    },
  });
  logger.info(`[CompanyAiBlock] IA desligada companyId=${companyId} userId=${userId}`);
}

export async function resumeCompanyAi(companyId: number, userId: number): Promise<void> {
  const config = await getConfig(companyId);
  const meta = { ...(config.metadata as any) };
  delete meta.companyAiDisabled;
  delete meta.companyAiDisabledReason;
  delete meta.companyAiDisabledByUserId;
  delete meta.companyAiDisabledAt;
  delete meta.companyAiPausedUntil;
  delete meta.companyAiPauseReason;
  delete meta.companyAiPausedByUserId;
  await config.update({ metadata: meta });
  logger.info(`[CompanyAiBlock] IA reativada companyId=${companyId} userId=${userId}`);
}
