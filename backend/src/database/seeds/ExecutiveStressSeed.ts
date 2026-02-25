import { Sequelize } from "sequelize";
import Opportunity from "../../models/Opportunity";
import OpportunityPrediction from "../../models/OpportunityPrediction";
import OpportunityMovement from "../../models/OpportunityMovement";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import Contact from "../../models/Contact";
import User from "../../models/User";
import AISuggestionFeedback from "../../models/AISuggestionFeedback";

export const seedExecutiveData = async (companyId: number) => {
    console.log(`[Seed] Instando 20k oportunidades para empresa ${companyId}...`);

    // 1. Setup Base
    const pipeline = await Pipeline.findOne({ where: { companyId } });
    if (!pipeline) throw new Error("Pipeline não encontrado");

    const stages = await PipelineStage.findAll({ where: { pipelineId: pipeline.id }, order: [['order', 'ASC']] });
    const user = await User.findOne({ where: { companyId } });
    const contacts = await Contact.findAll({ where: { companyId }, limit: 100 });

    if (contacts.length === 0) throw new Error("Crie alguns contatos antes de rodar o seed");

    const batchSize = 1000;
    const total = 20000;

    for (let i = 0; i < total; i += batchSize) {
        const opsBatch = [];
        for (let j = 0; j < batchSize; j++) {
            const status = Math.random() > 0.3 ? "OPEN" : (Math.random() > 0.5 ? "WON" : "LOST");
            const stage = stages[Math.floor(Math.random() * stages.length)];
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 90)); // últimos 90 dias

            opsBatch.push({
                companyId,
                pipelineId: pipeline.id,
                stageId: stage.id,
                contactId: contacts[Math.floor(Math.random() * contacts.length)].id,
                title: `Oportunidade Escalar ${i + j}`,
                value: Math.floor(Math.random() * 5000) + 500,
                status,
                assignedUserId: user.id,
                createdAt,
                updatedAt: status !== "OPEN" ? new Date() : createdAt
            });
        }

        const createdOps = await Opportunity.bulkCreate(opsBatch as any, { returning: true });

        // Predições e Feedbacks para uma parte do batch
        const predictions = [];
        const feedbacks = [];
        const movements = [];

        for (const op of createdOps) {
            const prob = Math.random();
            predictions.push({
                opportunityId: op.id,
                companyId,
                predictedCloseProbability: prob,
                riskLevel: prob < 0.3 ? "HIGH" : (prob < 0.7 ? "MEDIUM" : "LOW"),
                explanation: "Análise baseada em volume histórico e engajamento via WhatsApp."
            });

            if (Math.random() > 0.8) {
                feedbacks.push({
                    opportunityId: op.id,
                    companyId,
                    feedback: Math.random() > 0.2 ? "AGREE" : "DISAGREE",
                    suggestedStageId: stages[0].id,
                    actualStageId: stages[0].id
                });
            }

            if (Math.random() > 0.7) {
                movements.push({
                    opportunityId: op.id,
                    companyId,
                    fromStageId: stages[0].id,
                    toStageId: op.stageId,
                    movedBy: Math.random() > 0.5 ? "AI" : "USER"
                });
            }
        }

        await OpportunityPrediction.bulkCreate(predictions as any);
        await AISuggestionFeedback.bulkCreate(feedbacks as any);
        await OpportunityMovement.bulkCreate(movements as any);

        console.log(`[Seed] Progresso: ${i + batchSize}/${total}`);
    }

    console.log("[Seed] Concluído com sucesso.");
};
