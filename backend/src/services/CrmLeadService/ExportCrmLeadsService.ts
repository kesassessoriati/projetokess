import { Op, WhereOptions } from "sequelize";
import * as XLSX from "xlsx";
import CrmLead from "../../models/CrmLead";
import Tag from "../../models/Tag";
import serializeCrmLead from "./helpers/serializeCrmLead";

interface Request {
  companyId: number;
  searchParam?: string;
  status?: string;
  product?: string;
  ownerUserId?: number;
  profile: string;
  userId: number;
}

const ExportCrmLeadsService = async ({
  companyId,
  searchParam,
  status,
  product,
  ownerUserId,
  profile,
  userId
}: Request): Promise<Buffer> => {
  const conditions: any[] = [{ companyId }];

  if (profile !== "admin") {
    conditions.push({
      [Op.or]: [{ ownerUserId: userId }, { ownerUserId: null }]
    });
  } else if (ownerUserId) {
    conditions.push({ ownerUserId });
  }

  if (status) {
    conditions.push({ status });
  }

  if (product) {
    conditions.push({
      product: { [Op.iLike]: `%${product.trim()}%` }
    });
  }

  if (searchParam) {
    const like = { [Op.iLike]: `%${searchParam}%` };
    conditions.push({
      [Op.or]: [
        { name: like },
        { email: like },
        { phone: like },
        { companyName: like }
      ]
    });
  }

  const where = { [Op.and]: conditions } as WhereOptions;

  const leads = await CrmLead.findAll({
    where,
    order: [["updatedAt", "DESC"]],
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] }
      }
    ]
  });

  const serializedLeads = leads.map(serializeCrmLead);

  const data = serializedLeads.map(lead => ({
    ID: lead.id,
    Nome: lead.name,
    Email: lead.email,
    Telefone: lead.phone,
    Empresa: lead.companyName,
    Status: lead.status,
    Origem: lead.source,
    Campanha: lead.campaign,
    Meio: lead.medium,
    Score: lead.score,
    Temperatura: lead.temperature,
    Responsável: lead.ownerUserId || "Não atribuído",
    DataCriacao: lead.createdAt
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return buffer;
};

export default ExportCrmLeadsService;
