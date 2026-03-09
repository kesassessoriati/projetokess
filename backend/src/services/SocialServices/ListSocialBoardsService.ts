import SocialBoard from "../../models/SocialBoard";
import SocialStage from "../../models/SocialStage";
import SocialContent from "../../models/SocialContent";

interface Request {
  companyId: number;
}

const ListSocialBoardsService = async ({ companyId }: Request): Promise<SocialBoard[]> => {
  const boards = await SocialBoard.findAll({
    where: { companyId },
    include: [
      {
        model: SocialStage,
        as: "stages",
        attributes: ["id", "name", "order", "color"]
      },
      {
        model: SocialContent,
        as: "contents",
        attributes: ["id"]
      }
    ],
    order: [
      ["createdAt", "ASC"],
      [{ model: SocialStage, as: "stages" }, "order", "ASC"]
    ]
  });

  return boards;
};

export default ListSocialBoardsService;

