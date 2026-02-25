import PipelineAutomation from "../../models/PipelineAutomation";
import PipelineAutomationLog from "../../models/PipelineAutomationLog";
import Opportunity from "../../models/Opportunity";
import EventBus, { EventData } from "../../libs/EventBus";
import MoveOpportunityService from "../OpportunityServices/MoveOpportunityService";

class AutomationEngineService {
    public static init() {
        // Registrar triggers
        EventBus.subscribe("OPPORTUNITY_MOVED", this.handleEvent.bind(this));
        EventBus.subscribe("OPPORTUNITY_CREATED", this.handleEvent.bind(this));
        EventBus.subscribe("SLA_EXPIRED", this.handleEvent.bind(this));
    }

    private static async handleEvent(event: EventData) {
        const { type, payload, companyId, id: eventId } = event;
        const trigger = this.mapEventToTrigger(type);

        if (!trigger) return;

        // Buscar automações ativas para este trigger
        const automations = await PipelineAutomation.findAll({
            where: {
                companyId,
                trigger,
                isActive: true,
                pipelineId: payload.pipelineId
            }
        });

        for (const automation of automations) {
            // Verificar se a automação é específica para um estágio
            if (automation.stageId && automation.stageId !== payload.stageId) {
                continue;
            }

            // Executar automação (com log e idempotência)
            await this.runAutomation(automation, payload, eventId);
        }
    }

    private static mapEventToTrigger(eventType: string): string | null {
        switch (eventType) {
            case "OPPORTUNITY_MOVED": return "ON_ENTER_STAGE"; // Ou ON_EXIT_STAGE conforme lógica
            case "OPPORTUNITY_CREATED": return "ON_OPPORTUNITY_CREATED";
            case "SLA_EXPIRED": return "ON_SLA_EXPIRED";
            default: return null;
        }
    }

    private static async runAutomation(automation: PipelineAutomation, payload: any, eventId: string) {
        const startTime = Date.now();

        // Verificar idempotência
        const existingLog = await PipelineAutomationLog.findOne({
            where: { automationId: automation.id, eventId }
        });

        if (existingLog) return;

        try {
            // 1. Avaliar Condições (Simple JSON Rule Engine)
            const isMet = this.evaluateConditions(automation.condition, payload);
            if (!isMet) return;

            // 2. Executar Ação
            await this.executeAction(automation, payload);

            // 3. Log de Sucesso
            await PipelineAutomationLog.create({
                companyId: automation.companyId,
                automationId: automation.id,
                opportunityId: payload.opportunityId,
                eventId,
                status: "SUCCESS",
                executionTime: Date.now() - startTime
            });

        } catch (err) {
            console.error(`[AutomationEngine] Execution failed for ID ${automation.id}:`, err);

            // Log de Falha
            await PipelineAutomationLog.create({
                companyId: automation.companyId,
                automationId: automation.id,
                opportunityId: payload.opportunityId,
                eventId,
                status: "FAILED",
                error: err.message,
                executionTime: Date.now() - startTime
            });
        }
    }

    private static evaluateConditions(condition: any, payload: any): boolean {
        // Se não houver condição, sempre roda
        if (!condition || Object.keys(condition).length === 0) return true;

        // Implementação simplificada de rule engine
        // Ex: { "value": { "gt": 1000 } }
        for (const [field, rule] of Object.entries(condition)) {
            const fieldValue = payload[field];
            const r = rule as any;
            if (r.gt && !(fieldValue > r.gt)) return false;
            if (r.lt && !(fieldValue < r.lt)) return false;
            if (r.eq && !(fieldValue == r.eq)) return false;
        }

        return true;
    }

    private static async executeAction(automation: PipelineAutomation, payload: any) {
        const { actionType, actionConfig, companyId } = automation;

        switch (actionType) {
            case "MOVE_STAGE":
                await MoveOpportunityService({
                    opportunityId: payload.opportunityId,
                    toStageId: actionConfig.toStageId,
                    companyId,
                    movedBy: "AUTOMATION",
                    reason: `Automação: ${automation.name}`
                });
                break;

            case "SEND_WHATSAPP":
                // Integrar com MessageService no futuro
                console.log(`[Automation] Enviando WhatsApp para oportunidade ${payload.opportunityId}`);
                break;

            case "ASSIGN_USER":
                await Opportunity.update(
                    { assignedUserId: actionConfig.userId },
                    { where: { id: payload.opportunityId, companyId } }
                );
                break;

            default:
                throw new Error(`Action type ${actionType} not implemented.`);
        }
    }
}

export default AutomationEngineService;
