import Produto from "../../models/Produto";

interface ProdutoData {
  companyId: number;
  tipo: string;
  nome: string;
  descricao?: string;
  valor: number;
  status?: string;
  imagem_principal?: string;
  galeria?: any;
  dados_especificos?: any;
}

const CreateService = async (data: ProdutoData): Promise<Produto> => {
  const produto = await Produto.create({
    ...data,
    status: data.status || "disponivel"
  });

  return produto;
};

export default CreateService;
