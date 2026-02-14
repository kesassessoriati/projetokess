import Produto from "../../models/Produto";
import AppError from "../../errors/AppError";

interface ProdutoData {
  tipo?: string;
  nome?: string;
  descricao?: string;
  valor?: number;
  status?: string;
  imagem_principal?: string;
  galeria?: any;
  dados_especificos?: any;
}

const UpdateService = async (
  id: string | number,
  companyId: number,
  data: ProdutoData
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

  await produto.update(data);

  return produto;
};

export default UpdateService;
