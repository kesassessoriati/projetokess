import { Op } from "sequelize";
import Prompt from "../../models/Prompt";
import Queue from "../../models/Queue";
import PromptToolSetting from "../../models/PromptToolSetting";
import PromptChannelBinding from "../../models/PromptChannelBinding";

interface Request {
  searchParam?: string;
  pageNumber?: string | number;
  companyId: string | number;
}

interface Response {
  prompts: Prompt[];
  count: number;
  hasMore: boolean;
}

const ListPromptsService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId
}: Request): Promise<Response> => {
  let whereCondition = {};
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  if (searchParam) {
    whereCondition = {
      [Op.or]: [
        { name: { [Op.like]: `%${searchParam}%` } }
      ]
    }
  }

  const { count, rows: prompts } = await Prompt.findAndCountAll({
    where: { ...whereCondition, companyId },
    include: [
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name"]
      },
      {
        model: PromptToolSetting,
        as: "toolSettings"
      },
      {
        model: PromptChannelBinding,
        as: "channelBindings",
        required: false
      }
    ],
    limit,
    offset,
    order: [["name", "ASC"]],
  });
  prompts.forEach(prompt => {
    const toolsEnabled =
      (prompt as any).toolSettings
        ?.filter((tool: PromptToolSetting) => tool?.enabled)
        .map((tool: PromptToolSetting) => tool.toolName) || [];
    (prompt as any).setDataValue("toolsEnabled", toolsEnabled);
    (prompt as any).setDataValue("channelBindings", (prompt as any).channelBindings || []);
  });
  const hasMore = count > offset + prompts.length;

  return {
    prompts,
    count,
    hasMore
  };
};

export default ListPromptsService;
