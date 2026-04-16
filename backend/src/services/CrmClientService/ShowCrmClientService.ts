import AppError from "../../errors/AppError";
import CrmClient from "../../models/CrmClient";
import Tag from "../../models/Tag";

interface Request {
  id: number | string;
  companyId: number;
}

const ShowCrmClientService = async ({
  id,
  companyId
}: Request): Promise<CrmClient> => {
  const client = await CrmClient.findOne({
    where: { id, companyId },
    include: [
      {
        model: Tag,
        as: "assignedTags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] },
        required: false
      }
    ]
  });

  if (!client) {
    throw new AppError("Cliente não encontrado.", 404);
  }

  return client;
};

export default ShowCrmClientService;
