import { QueryTypes } from "sequelize";
import sequelize from "../database";
import Company from "../models/Company";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import Opportunity from "../models/Opportunity";
import ListPipelineBoardService from "../services/PipelineServices/ListPipelineBoardService";
import GetPipelineMetricsService from "../services/PipelineServices/GetPipelineMetricsService";
import OpportunityMovement from "../models/OpportunityMovement";

describe("Pipeline Performance Tests", () => {
    let company: Company;
    let pipeline: Pipeline;
    let stages: PipelineStage[];

    beforeAll(async () => {
        // Setup: Criar empresa e pipeline
        company = await Company.create({ name: "Perf Test Corp" } as any);
        pipeline = await Pipeline.create({ name: "High Scale Sales", companyId: company.id } as any);

        stages = await Promise.all([
            PipelineStage.create({ name: "Stage 1", order: 1, probability: 10, pipelineId: pipeline.id, companyId: company.id }),
            PipelineStage.create({ name: "Stage 2", order: 2, probability: 30, pipelineId: pipeline.id, companyId: company.id }),
            PipelineStage.create({ name: "Stage 3", order: 3, probability: 50, pipelineId: pipeline.id, companyId: company.id }),
            PipelineStage.create({ name: "Stage 4", order: 4, probability: 80, pipelineId: pipeline.id, companyId: company.id }),
            PipelineStage.create({ name: "Stage 5", order: 5, probability: 100, pipelineId: pipeline.id, companyId: company.id }),
        ]);

        console.time("Seeding 10k Opportunities");
        // Criar 10.000 oportunidades em lotes
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < 10; i++) {
            const opportunities = Array.from({ length: CHUNK_SIZE }).map((_, idx) => ({
                companyId: company.id,
                pipelineId: pipeline.id,
                stageId: stages[idx % 5].id,
                contactId: 1, // Assumindo que existe pelo menos um contato
                title: `Opportunity ${i * CHUNK_SIZE + idx}`,
                value: Math.floor(Math.random() * 10000),
                status: "OPEN",
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000))
            }));
            await Opportunity.bulkCreate(opportunities as any);
        }
        console.timeEnd("Seeding 10k Opportunities");

        // Gerar alguns movimentos para testar métricas de tempo médio
        const sampleSize = 100;
        const sampleOps = await Opportunity.findAll({ limit: sampleSize, where: { companyId: company.id } });
        await OpportunityMovement.bulkCreate(sampleOps.map(op => ({
            opportunityId: op.id,
            fromStageId: stages[0].id,
            toStageId: stages[1].id,
            movedBy: "USER",
            createdAt: new Date(op.createdAt.getTime() + 86400000) // 1 dia depois
        })));
    });

    afterAll(async () => {
        // Cleanup
        await OpportunityMovement.destroy({ where: { opportunityId: { [Buffer.from('Op.id', 'utf8').toString()]: 0 } }, force: true } as any); // Simplificado
        await Opportunity.destroy({ where: { companyId: company.id }, force: true });
        await PipelineStage.destroy({ where: { companyId: company.id }, force: true });
        await Pipeline.destroy({ where: { companyId: company.id }, force: true });
        await Company.destroy({ where: { id: company.id }, force: true });
    });

    it("should load board with 10k opportunities efficiently", async () => {
        console.time("Board Load Time");
        const board = await ListPipelineBoardService({
            pipelineId: pipeline.id,
            companyId: company.id,
            limit: 50
        });
        console.timeEnd("Board Load Time");

        expect(board.stages.length).toBe(5);
        expect(board.stages[0].opportunitiesCount).toBeGreaterThan(1500);
        expect(board.stages[0].opportunities.length).toBe(50);
    });

    it("should calculate metrics for 10k opportunities efficiently", async () => {
        console.time("Metrics Calculation Time");
        const metrics = await GetPipelineMetricsService({
            pipelineId: pipeline.id,
            companyId: company.id
        });
        console.timeEnd("Metrics Calculation Time");

        expect(metrics.totalValueOpen).toBeGreaterThan(0);
        expect(metrics.forecastRevenue).toBeGreaterThan(0);
        expect(metrics.averageTimePerStage.length).toBeGreaterThan(0);
    });
});
