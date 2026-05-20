import * as Yup from "yup";
import AppError from "../../errors/AppError";
import CrmClient from "../../models/CrmClient";
import { syncCrmClientTags, tagsToString } from "./helpers/syncCrmClientTags";
import { dispatchClientFlowTrigger } from "../FlowBuilderService/FlowTriggerPayloads";

interface ITagInput {
  id?: number | string;
  name: string;
  color?: string;
}

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
  paymentType?: string;
  purchaseType?: string;
  purchaseValue?: number;
  acquisitionDate?: Date;
  expirationDate?: Date;
  ownerUserId?: number;
  notes?: string;
  decisorName?: string;
  decisorPhone?: string;
  gmn?: string;
  site?: string;
  instagram?: string;
  linkedin?: string;
  cargo?: string;
  origem?: string;
  campanhaTag?: string;
  temperatura?: string;
  score?: number;
  tags?: string | ITagInput[];
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
  const tagsText = tagsToString(data.tags);

  const clientData = {
    ...validatedData,
    type: validatedData.type || "pf",
    status: validatedData.status || "active",
    phone: data.phone ? data.phone.replace(/\D/g, "") : undefined,
    tags: tagsText,
    acquiredProduct: data.acquiredProduct || undefined,
    paymentType: data.paymentType || undefined,
    purchaseType: data.purchaseType || undefined,
    purchaseValue: data.purchaseValue != null ? Number(data.purchaseValue) : undefined,
    acquisitionDate: data.acquisitionDate || null,
    expirationDate: data.expirationDate || null,
    gmn: data.gmn || undefined,
    site: data.site || undefined,
    instagram: data.instagram || undefined,
    linkedin: data.linkedin || undefined
  };

  const client = await CrmClient.create(clientData);
  await syncCrmClientTags(client.id, data.companyId, data.tags);
  dispatchClientFlowTrigger("client_created", client);

  return client;
};

export default CreateCrmClientService;
