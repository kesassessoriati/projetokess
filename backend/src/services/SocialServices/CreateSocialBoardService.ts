import * as Yup from "yup";
import SocialBoard from "../../models/SocialBoard";
import SocialStage from "../../models/SocialStage";

interface Request {
  companyId: number;
  name: string;
  description?: string;
  color?: string;
  relatedType?: string;
  relatedId?: number;
  relatedName?: string;
}

const DEFAULT_STAGES = [
  { name: "Ideias / Planejamento", color: "#4CAF50" },
  { name: "Em Produção", color: "#2E7D32" },
  { name: "Em Revisão", color: "#00A86B" },
  { name: "Agendado", color: "#1B8A5A" },
  { name: "Publicado", color: "#0E6B45" }
];

const CreateSocialBoardService = async (data: Request): Promise<SocialBoard> => {
  const schema = Yup.object().shape({
    companyId: Yup.number().required(),
    name: Yup.string().required().min(2)
  });

  await schema.validate(data);

  const board = await SocialBoard.create({
    companyId: data.companyId,
    name: data.name,
    description: data.description,
    color: data.color || "#1B8A5A",
    relatedType: data.relatedType,
    relatedId: data.relatedId,
    relatedName: data.relatedName
  });

  await Promise.all(
    DEFAULT_STAGES.map((stage, index) =>
      SocialStage.create({
        companyId: data.companyId,
        boardId: board.id,
        name: stage.name,
        color: stage.color,
        order: index
      })
    )
  );

  return board;
};

export default CreateSocialBoardService;

