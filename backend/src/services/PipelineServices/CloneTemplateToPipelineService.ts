import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import PipelineTemplate from "../../models/PipelineTemplate";
import CreatePipelineService from "./CreatePipelineService";

interface Request {
    companyId: number;
    templateId?: number;
}

const CloneTemplateToPipelineService = async ({
    companyId,
    templateId
}: Request): Promise<Pipeline> => {
    let template: PipelineTemplate | null = null;

    if (templateId) {
        template = await PipelineTemplate.findByPk(templateId);
    } else {
        template = await PipelineTemplate.findOne({ where: { isDefault: true } });
    }

    if (!template) {
        throw new Error("ERR_NO_PIPELINE_TEMPLATE_FOUND");
    }

    const pipeline = await CreatePipelineService({
        name: template.name,
        companyId,
        isDefault: true,
        templateId: template.id,
        stages: template.stages
    });

    return pipeline;
};

export default CloneTemplateToPipelineService;
