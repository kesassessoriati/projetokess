import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";

interface Request {
    name: string;
    companyId: number;
    isDefault?: boolean;
    templateId?: number;
    stages?: Array<{
        name: string;
        order: number;
        color: string;
        probability: number;
    }>;
}

const CreatePipelineService = async ({
    name,
    companyId,
    isDefault = false,
    templateId,
    stages
}: Request): Promise<Pipeline> => {
    const pipeline = await Pipeline.create({
        name,
        companyId,
        isDefault,
        templateId
    });

    // Create custom stages if provided, otherwise use default stages
    const stagesToCreate = stages && stages.length > 0 ? stages : [
        { name: "Lead", order: 0, color: "#E3E3E3", probability: 10 },
        { name: "Contato", order: 1, color: "#40BFFF", probability: 30 },
        { name: "Proposta", order: 2, color: "#FFA500", probability: 60 },
        { name: "Negociação", order: 3, color: "#7F00FF", probability: 80 },
        { name: "Fechado", order: 4, color: "#4EC24E", probability: 100 }
    ];

    await Promise.all(
        stagesToCreate.map(stage =>
            PipelineStage.create({
                ...stage,
                pipelineId: pipeline.id,
                companyId
            })
        )
    );

    await pipeline.reload({
        include: [{ model: PipelineStage, as: "stages" }]
    });

    return pipeline;
};

export default CreatePipelineService;
