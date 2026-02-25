import Company from "../models/Company";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import Opportunity from "../models/Opportunity";
import PipelineAutomation from "../models/PipelineAutomation";
import PipelineAutomationLog from "../models/PipelineAutomationLog";
import AutomationEngineService from "../services/PipelineServices/AutomationEngineService";
import MoveOpportunityService from "../services/OpportunityServices/MoveOpportunityService";
import User from "../models/User";

describe("Automation Engine Integration Tests", () => {
    let company: Company;
    let pipeline: Pipeline;
    let stages: PipelineStage[];
    let user: User;

    beforeAll(async () => {
        // Inicializar engine
        AutomationEngineService.init();

        // Setup base
        company = await Company.create({ name: "Automation Test Corp" } as any);
        user = await User.create({ name: "Assignee User", email: "test@auto.com", password: "123", companyId: company.id } as any);
        pipeline = await Pipeline.create({ name: "Automation Pipeline", companyId: company.id } as any);

        stages = await Promise.all([
            PipelineStage.create({ name: "Stage 1", order: 1, pipelineId: pipeline.id, companyId: company.id }),
            PipelineStage.create({ name: "Stage 2", order: 2, pipelineId: pipeline.id, companyId: company.id }),
        ]);

        // Criar Automação: AO ENTRAR NO ESTÁGIO 2 -> ATRIBUIR USUÁRIO
        await PipelineAutomation.create({
            companyId: company.id,
            pipelineId: pipeline.id,
            name: "Auto Assign on Stage 2",
            trigger: "ON_ENTER_STAGE",
            stageId: stages[1].id,
            actionType: "ASSIGN_USER",
            actionConfig: { userId: user.id },
            isActive: true
        } as any);
    });

    it("should trigger automation when moving opportunity stage", async () => {
        // 1. Criar Oportunidade no Estágio 1
        const opportunity = await Opportunity.create({
            companyId: company.id,
            pipelineId: pipeline.id,
            stageId: stages[0].id,
            title: "Test Automation Opp",
            contactId: 1,
            status: "OPEN"
        } as any);

        expect(opportunity.assignedUserId).toBeNull();

        // 2. Mover para Estágio 2
        await MoveOpportunityService({
            opportunityId: opportunity.id,
            toStageId: stages[1].id,
            companyId: company.id,
            movedBy: "USER"
        });

        // 3. Aguardar execução assíncrona do EventBus/AutomationEngine
        // Em testes, podemos usar um pequeno delay ou simular a execução
        await new Promise(resolve => setTimeout(resolve, 500));

        // 4. Verificar resultado
        const updatedOpp = await Opportunity.findByPk(opportunity.id);
        expect(updatedOpp?.assignedUserId).toBe(user.id);

        // 5. Verificar Log
        const log = await PipelineAutomationLog.findOne({
            where: { opportunityId: opportunity.id, status: "SUCCESS" }
        });
        expect(log).toBeDefined();
    });

    it("should obey conditions", async () => {
        // Criar automação com condição: Value > 5000
        await PipelineAutomation.create({
            companyId: company.id,
            pipelineId: pipeline.id,
            name: "High Value Auto Assign",
            trigger: "ON_ENTER_STAGE",
            stageId: stages[1].id,
            condition: { value: { gt: 5000 } },
            actionType: "ASSIGN_USER",
            actionConfig: { userId: user.id },
            isActive: true
        } as any);

        // Criar oportunidade de baixo valor
        subterranean_opp:
        const oppLow = await Opportunity.create({
            companyId: company.id,
            pipelineId: pipeline.id,
            stageId: stages[0].id,
            title: "Low Value Opp",
            value: 100,
            contactId: 1,
            status: "OPEN"
        } as any);

        await MoveOpportunityService({
            opportunityId: oppLow.id,
            toStageId: stages[1].id,
            companyId: company.id,
            movedBy: "USER"
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        const updatedOppLow = await Opportunity.findByPk(oppLow.id);
        // Não deve ter sido atribuído pela automação de High Value (embora a anterior possa rodar se não deletarmos)
        // Para este teste, vamos assumir que apenas a high value importa ou medir se rodou
        const logs = await PipelineAutomationLog.findAll({
            where: { opportunityId: oppLow.id }
        });

        // Deve ter rodado a primeira (sem condição) mas não a segunda
        expect(logs.length).toBe(1);
    });
});
