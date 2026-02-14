import Produto from "../../models/Produto";
import AppError from "../../errors/AppError";

const ShowService = async (
  id: string | number,
  companyId: number
): Promise<Produto> => {
  const produto = await Produto.findOne({
    where: {
      id,
      companyId
    }
  });

  if (!produto) {
    throw new AppError("ERR_PRODUTO_NOT_FOUND", 404);
  }

  return produto;
};

export default ShowService;
