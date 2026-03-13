import * as Yup from "yup";
import AppError from "../../errors/AppError";
import CrmClient from "../../models/CrmClient";

export interface CreateCrmClientRequest {
  companyId: number;
  type?: "pf" | "pj";
  name: string;
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
  acquiredProduct?: string;
  expirationDate?: Date;
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

const CreateCrmClientService = async (
  data: CreateCrmClientRequest
): Promise<CrmClient> => {
  const schema = Yup.object().shape({
    companyId: Yup.number().required(),
    type: Yup.string().oneOf(["pf", "pj"]).default("pf"),
    name: Yup.string().required().min(2),
    email: Yup.string()
      .transform(v => (!v || String(v).trim() === "" ? null : String(v).trim()))
      .email()
      .nullable(),
    status: Yup.string()
      .oneOf(["active", "inactive", "blocked"])
      .default("active"),
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
    const { Op } = require("sequelize");
    const existingClient = await CrmClient.findOne({
      where: {
        companyId: data.companyId,
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
      throw new AppError(`Cliente já cadastrado com este ${duplicateField} nesta empresa.`);
    }
  }

  // Sanitiza o telefone antes de criar
  const clientData = {
    ...validatedData,
    type: validatedData.type || "pf",
    status: validatedData.status || "active",
    phone: data.phone ? data.phone.replace(/\D/g, "") : undefined,
    acquiredProduct: data.acquiredProduct || undefined,
    expirationDate: data.expirationDate || null
  };

  const client = await CrmClient.create(clientData);

  return client;
};

export default CreateCrmClientService;
