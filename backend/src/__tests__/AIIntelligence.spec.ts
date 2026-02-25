import Company from "../models/Company";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import Opportunity from "../models/Opportunity";
import OpportunityMovement from "../models/OpportunityMovement";
import OpportunityPrediction from "../models/OpportunityPrediction";
import CompaniesSettings from "../models/CompaniesSettings";
import AIAnalyzerService from "../services/PipelineServices/AIAnalyzerService";
import EventBus from "../libs/EventBus";

describe("AI Intelligence Integration Tests", () => {
    let company: Company;
    let pipeline: Pipeline;
    let stages: PipelineStage[];

    beforeAll(async () => {
        AIAnalyzerService.init();
        company = await Company.create({ name: "AI Tech Corp" } as any);

        // Ativar Auto-move
        await CompaniesSettings.create({
            companyId: company.id,
            aiAutoMoveEnabled: true,
            aiConfidenceThreshold: 0.7
        } as any);

        pipeline = await Pipeline.create({ name: "AI Pipeline", companyId: company.id } as any);
        stages = await Promise.all([
            PipelineStage.create({ name: "Lead", order: 1, pipelineId: pipeline.id, companyId: company.id }),
            PipelineStage.create({ name: "Qualified", order: 2, pipelineId: pipeline.id, companyId: company.id }),
            PipelineStage.create({ name: "Lost", order: 3, pipelineId: pipeline.id, companyId: company.id }),
        ]);
    });

    it("should learn from history and suggest the most frequent next stage", async () => {
        // 1. Simular 100 movimentos históricos: 80 para 'Qualified', 20 para 'Lost'
        const movements = [];
        for (let i = 0; i < 80; i++) {
            movements.push({
                opportunityId: 1, // Dummy
                fromStageId: stages[0].id,
                toStageId: stages[1].id,
                movedBy: "USER",
                companyId: company.id
            });
        }
        for (let i = 0; i < 20; i++) {
            movements.push({
                opportunityId: 1,
                fromStageId: stages[0].id,
                toStageId: stages[2].id,
                movedBy: "USER",
                companyId: company.id
            });
        }
        await OpportunityMovement.bulkCreate(movements as any);

        // 2. Criar nova oportunidade
        const opportunity = await Opportunity.create({
            companyId: company.id,
            pipelineId: pipeline.id,
            stageId: stages[0].id,
            title: "New AI Lead",
            contactId: 1,
            status: "OPEN"
        } as any);

        // 3. Simular evento de criação para disparar análise
        await EventBus.publish("OPPORTUNITY_CREATED", {
            opportunityId: opportunity.id,
            pipelineId: opportunity.pipelineId,
            stageId: opportunity.stageId
        }, company.id);

        // 4. Aguardar IA processar
        await new Promise(resolve => setTimeout(resolve, 800));

        // 5. Verificar Predição
        const prediction = await OpportunityPrediction.findOne({
            where: { opportunityId: opportunity.id }
        });

        expect(prediction).toBeDefined();
        // 80/100 = 0.8 de probabilidade base
        expect(prediction?.predictedCloseProbability).toBeGreaterThan(0.5);

        // 6. Verificar Sugestão (Deve ser o estágio 1 - Qualified)
        const updatedOpp = await Opportunity.findByPk(opportunity.id);
        expect(updatedOpp?.aiSuggestedStageId).toBe(stages[1].id);

        // 7. Verificar Auto-Move (Confiança 0.8 >= Threshold 0.7)
        // O estágio atual deve ter mudado automaticamente
        expect(updatedOpp?.stageId).toBe(stages[1].id);
    });

    it("should increase risk if SLA is expired", async () => {
        const opportunity = await Opportunity.create({
            companyId: company.id,
            pipelineId: pipeline.id,
            stageId: stages[0].id,
            title: "Expired Lead",
            contactId: 1,
            status: "OPEN",
            slaDeadline: new Date(Date.now() - 10000) // 10s atrás
        } as any);

        await EventBus.publish("SLA_EXPIRED", {
            opportunityId: opportunity.id,
            pipelineId: pipeline.id,
            stageId: opportunity.stageId
        }, company.id);

        await new Promise(resolve => setTimeout(resolve, 800));

        const prediction = await OpportunityPrediction.findOne({
            where: { opportunityId: opportunity.id }
        });

        expect(prediction?.riskLevel).toBe("HIGH");
        expect(prediction?.explanation).toContain("SLA expirado");
    });
});
