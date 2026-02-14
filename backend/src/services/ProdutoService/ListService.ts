import Produto from "../../models/Produto";
import { Op } from "sequelize";

const ListService = async (
  companyId: number,
  tipo?: string
): Promise<Produto[]> => {
  const whereCondition: any = {
    companyId
  };

  if (tipo) {
    whereCondition.tipo = tipo;
  }

  const produtos = await Produto.findAll({
    where: whereCondition,
    order: [["nome", "ASC"]]
  });

  return produtos;
};

export default ListService;
