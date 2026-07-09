import { FlowBuilderModel } from "../../models/FlowBuilder";
import CrmLead from "../../models/CrmLead";
import logger from "../../utils/logger";
import {
  executeFlowForTrigger,
  isActiveValue,
  isTriggerEnabled
} from "./FlowTriggerDispatchService";

const LOG = "[FLOWBUILDER_SCHEDULE]";

// Trava de segurança do "envio em massa": um disparo agendado executa o fluxo
// para no máximo N leads do público configurado.
const MAX_LEADS_PER_RUN = 500;

// Intervalo do relógio interno. O dedupe por lastRunKey (data+hora) garante
// que o mesmo agendamento não roda duas vezes no mesmo minuto.
const TICK_MS = 60 * 1000;

let tickTimer: NodeJS.Timeout | null = null;
let running = false;

// Horário de referência do produto (Brasil). O container costuma rodar em UTC;
// usar o clock local quebraria os horários configurados na UI.
const TIMEZONE = "America/Sao_Paulo";

interface NowParts {
  dateKey: string; // "2026-07-09"
  timeKey: string; // "14:30"
  dayOfWeek: number; // 0=Dom ... 6=Sáb
}

const getNowParts = (): NowParts => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short"
  }).formatToParts(new Date());

  const get = (type: string) => parts.find(p => p.type === type)?.value || "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  };
  // Intl pode devolver "24" para meia-noite dependendo do runtime.
  const hour = get("hour") === "24" ? "00" : get("hour");

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    timeKey: `${hour}:${get("minute")}`,
    dayOfWeek: weekdayMap[get("weekday")] ?? new Date().getDay()
  };
};

const shouldFire = (config: any, now: NowParts): boolean => {
  if (!config?.time || config.time !== now.timeKey) return false;

  const frequency = config.frequency || "daily";
  if (frequency === "once") {
    return config.date === now.dateKey;
  }
  if (frequency === "weekly") {
    const days = Array.isArray(config.daysOfWeek) ? config.daysOfWeek : [];
    return days.map(Number).includes(now.dayOfWeek);
  }
  return true; // daily
};

const runTick = async (): Promise<void> => {
  const now = getNowParts();
  const flows = await FlowBuilderModel.findAll();

  for (const flow of flows) {
    if (!isActiveValue(flow.active)) continue;

    const triggers = Array.isArray(flow.triggers) ? flow.triggers : [];
    const scheduled = triggers.filter(
      (t: any) => t?.type === "scheduled" && isTriggerEnabled(t)
    );
    if (!scheduled.length) continue;

    let triggersChanged = false;

    for (const trigger of scheduled) {
      const config = trigger.config || {};
      const runKey = `${now.dateKey} ${now.timeKey}`;

      if (!shouldFire(config, now)) continue;
      if (config.lastRunKey === runKey) continue; // já disparou neste minuto

      // Marca ANTES de executar: se o fan-out demorar mais de um tick, o
      // próximo tick não re-dispara o mesmo agendamento.
      trigger.config = { ...config, lastRunKey: runKey };
      triggersChanged = true;

      if (!config.pipelineId) {
        logger.warn(
          `${LOG} schedule_skipped_no_audience companyId=${flow.company_id} flowId=${flow.id} reason=pipeline_not_configured`
        );
        continue;
      }

      try {
        const where: any = {
          companyId: flow.company_id,
          pipelineId: Number(config.pipelineId)
        };
        if (config.stageId) where.stageId = Number(config.stageId);

        const leads = await CrmLead.findAll({
          where,
          limit: MAX_LEADS_PER_RUN,
          order: [["updatedAt", "DESC"]]
        });

        logger.info(
          `${LOG} schedule_fired companyId=${flow.company_id} flowId=${flow.id} runKey=${runKey} pipelineId=${config.pipelineId} stageId=${config.stageId || "all"} leads=${leads.length}`
        );

        let dispatched = 0;
        for (const lead of leads) {
          if (!lead.phone) continue;
          try {
            await executeFlowForTrigger(flow, flow.company_id, {
              ticketId: lead.primaryTicketId || undefined,
              contactNumber: lead.phone,
              contactName: lead.name || "",
              whatsappId: config.whatsappId
                ? Number(config.whatsappId)
                : undefined,
              metadata: {
                scheduled: true,
                runKey,
                leadId: lead.id,
                pipelineId: lead.pipelineId,
                stageId: lead.stageId
              }
            }, trigger);
            dispatched += 1;
          } catch (err) {
            logger.warn(
              `${LOG} schedule_lead_failed companyId=${flow.company_id} flowId=${flow.id} leadId=${lead.id} reason=${err?.message || err}`
            );
          }
        }

        logger.info(
          `${LOG} schedule_finished companyId=${flow.company_id} flowId=${flow.id} runKey=${runKey} dispatched=${dispatched}/${leads.length}`
        );
      } catch (err) {
        logger.error(
          `${LOG} schedule_failed companyId=${flow.company_id} flowId=${flow.id} reason=${err?.message || err}`
        );
      }
    }

    if (triggersChanged) {
      try {
        // triggers é coluna JSON: reatribuir o array força o Sequelize a
        // detectar a mudança (mutação interna não marca o campo como dirty).
        await flow.update({ triggers: [...triggers] });
      } catch (err) {
        logger.warn(
          `${LOG} schedule_persist_failed flowId=${flow.id} reason=${err?.message || err}`
        );
      }
    }
  }
};

export const startScheduledFlowTriggers = (): void => {
  if (tickTimer) return; // singleton: bootstrap chama em mais de um caminho

  logger.info(`${LOG} scheduler_started tickMs=${TICK_MS} timezone=${TIMEZONE}`);

  tickTimer = setInterval(async () => {
    if (running) return; // tick anterior ainda em fan-out
    running = true;
    try {
      await runTick();
    } catch (err) {
      logger.error(`${LOG} scheduler_tick_failed reason=${err?.message || err}`);
    } finally {
      running = false;
    }
  }, TICK_MS);
};

export default startScheduledFlowTriggers;
