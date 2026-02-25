import { Op } from "sequelize";
import EventBus, { EventData } from "../../libs/EventBus";
import Opportunity from "../../models/Opportunity";
import OpportunityMovement from "../../models/OpportunityMovement";
import OpportunityPrediction from "../../models/OpportunityPrediction";
import PipelineStage from "../../models/PipelineStage";
import CompaniesSettings from "../../models/CompaniesSettings";
import MoveOpportunityService from "../OpportunityServices/MoveOpportunityService";

class AIAnalyzerService {
    public static init() {
        const events = ["OPPORTUNITY_CREATED", "OPPORTUNITY_MOVED", "SLA_EXPIRED"];
        events.forEach(event => {
            EventBus.subscribe(event, this.handleEvent.bind(this));
        });
        console.log("[AIAnalyzerService] Initialized and listening to CRM events.");
    }

    private static async handleEvent(event: EventData) {
        const { type, payload, companyId } = event;
        const opportunityId = payload.opportunityId;

        try {
            // 1. Analisar Inteligência
            const analysis = await this.analyze(opportunityId, companyId);

            // 2. Persistir Predição
            await OpportunityPrediction.upsert({
                opportunityId,
                companyId,
                predictedCloseProbability: analysis.probability,
                predictedDaysToClose: analysis.daysToClose,
                riskLevel: analysis.riskLevel,
                explanation: analysis.explanation,
                aiModelVersion: "v1-heuristic"
            } as any);

            // 3. Atualizar Sugestão na Oportunidade
            await Opportunity.update(
                { aiSuggestedStageId: analysis.suggestedStageId },
                { where: { id: opportunityId } }
            );

            // 4. Verificar Auto-Move se configurado
            await this.checkAutoMove(opportunityId, companyId, analysis);

        } catch (err) {
            console.error(`[AIAnalyzerService] Analysis failed for Opportunity ${opportunityId}:`, err);
        }
    }

    private static async analyze(opportunityId: number, companyId: number) {
        const opportunity = await Opportunity.findByPk(opportunityId, {
            include: [{ model: PipelineStage, as: "stage" }]
        });

        if (!opportunity) throw new Error("Opportunity not found");

        // Heurística Simples (Simulando uma IA)
        // Em um cenário real, aqui chamaríamos um modelo (TensorFlow/Python/OpenAI)

        // Buscar histórico da empresa para padrão de conversão
        const historicalMovements = await OpportunityMovement.findAll({
            where: { fromStageId: opportunity.stageId },
            limit: 100,
            order: [["createdAt", "DESC"]]
        });

        // Calcular qual o destino mais frequente a partir do estágio atual
        const destinations = historicalMovements.reduce((acc: any, mov) => {
            acc[mov.toStageId] = (acc[mov.toStageId] || 0) + 1;
            return acc;
        }, {});

        let suggestedStageId = opportunity.stageId;
        let confidence = 0.5;

        const stageIds = Object.keys(destinations);
        if (stageIds.length > 0) {
            const bestStage = stageIds.reduce((a, b) => destinations[a] > destinations[b] ? a : b);
            suggestedStageId = parseInt(bestStage);
            confidence = destinations[bestStage] / historicalMovements.length;
        }

        // Análise de Risco baseada em SLA
        let riskLevel = "LOW";
        let explanation = "Oportunidade progredindo conforme fluxo padrão.";

        if (opportunity.slaDeadline && new Date() > opportunity.slaDeadline) {
            riskLevel = "HIGH";
            explanation = "ALERTA: SLA expirado. Risco alto de perda do lead.";
            confidence -= 0.2;
        }

        // Métrica de fechamento
        const probability = confidence * 0.8; // Simulação simplify

        return {
            suggestedStageId,
            confidence: Math.max(0, Math.min(1, confidence)),
            probability,
            daysToClose: 5, // Mock
            riskLevel,
            explanation
        };
    }

    private static async checkAutoMove(opportunityId: number, companyId: number, analysis: any) {
        const settings = await CompaniesSettings.findOne({ where: { companyId } });

        if (settings?.aiAutoMoveEnabled && analysis.confidence >= settings.aiConfidenceThreshold) {
            const opportunity = await Opportunity.findByPk(opportunityId);

            if (opportunity && opportunity.stageId !== analysis.suggestedStageId) {
                console.log(`[AIAnalyzerService] Auto-moving Opportunity ${opportunityId} to stage ${analysis.suggestedStageId} (Confidence: ${analysis.confidence})`);

                await MoveOpportunityService({
                    opportunityId,
                    toStageId: analysis.suggestedStageId,
                    companyId,
                    movedBy: "AI",
                    reason: `IA detectou alta probabilidade (${(analysis.confidence * 100).toFixed(1)}%): ${analysis.explanation}`
                });
            }
        }
    }
}

export default AIAnalyzerService;
