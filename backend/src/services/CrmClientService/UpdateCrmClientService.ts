import { Op } from "sequelize";
import * as Yup from "yup";
import AppError from "../../errors/AppError";
import CrmClient from "../../models/CrmClient";

interface Request {
  id: number | string;
  companyId: number;
  type?: "pf" | "pj";
  name?: string;
  companyName?: string;
  document?: string;
  birthDate?: Date;
  email?: string;
  phone?: string;
  zipCode?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  status?: "active" | "inactive" | "blocked";
  clientSince?: Date;
  ownerUserId?: number;
  notes?: string;
  decisorName?: string;
  decisorPhone?: string;
  site?: string;
  instagram?: string;
  linkedin?: string;
  cargo?: string;
  origem?: string;
  campanhaTag?: string;
  temperatura?: string;
  score?: number;
  tags?: string;
}

const UpdateCrmClientService = async ({
  id,
  companyId,
  ...data
}: Request): Promise<CrmClient> => {
  const client = await CrmClient.findOne({
    where: { id, companyId }
  });

  if (!client) {
    throw new AppError("Cliente não encontrado.", 404);
  }

  const schema = Yup.object().shape({
    type: Yup.string().oneOf(["pf", "pj"]),
    name: Yup.string().min(2),
    email: Yup.string()
      .transform(v => (!v || String(v).trim() === "" ? null : String(v).trim()))
      .email()
      .nullable(),
    status: Yup.string().oneOf(["active", "inactive", "blocked"]).nullable(),
    state: Yup.string()
      .transform(v => (!v || String(v).trim() === "" ? null : String(v).trim()))
      .length(2)
      .nullable()
  });

  const validatedData = await schema.validate(data);

  // Verificação de duplicatas por documento, email ou telefone
  const duplicateConditions: any[] = [];

  if (data.document) {
    duplicateConditions.push({ document: data.document });
  }

  if (validatedData.email) {
    duplicateConditions.push({ email: validatedData.email });
  }

  if (data.phone) {
    const sanitizedPhone = data.phone.replace(/\D/g, "");
    if (sanitizedPhone) {
      duplicateConditions.push({ phone: sanitizedPhone });
    }
  }

  if (duplicateConditions.length > 0) {
    const existingClient = await CrmClient.findOne({
      where: {
        companyId,
        id: { [Op.ne]: id },
        [Op.or]: duplicateConditions
      }
    });

    if (existingClient) {
      let duplicateField = "";
      if (data.document && existingClient.document === data.document) {
        duplicateField = "documento";
      } else if (validatedData.email && existingClient.email === validatedData.email) {
        duplicateField = "email";
      } else if (data.phone) {
        const sanitizedPhone = data.phone.replace(/\D/g, "");
        if (existingClient.phone === sanitizedPhone) {
          duplicateField = "telefone";
        }
      }
      throw new AppError(`Outro cliente já usa este ${duplicateField} nesta empresa.`);
    }
  }

  // Sanitiza o telefone antes de atualizar
  const updateData = {
    ...validatedData,
    phone: data.phone ? data.phone.replace(/\D/g, "") : data.phone
  };

  await client.update(updateData);

  return client;
};

export default UpdateCrmClientService;
