import * as Yup from "yup";
import AppError from "../../errors/AppError";
import ContactListItem from "../../models/ContactListItem";
import logger from "../../utils/logger";
import CheckContactNumber from "../WbotServices/CheckNumber";

interface Data {
  name: string;
  number: string;
  contactListId: number;
  companyId: number;
  email?: string;
}

const CreateService = async (data: Data): Promise<ContactListItem> => {
  const { name } = data;

  const contactListItemSchema = Yup.object().shape({
    name: Yup.string()
      .min(3, "ERR_CONTACTLISTITEM_INVALID_NAME")
      .required("ERR_CONTACTLISTITEM_REQUIRED")
  });

  try {
    await contactListItemSchema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // number é opcional: contatos podem ser apenas email (ex: campanhas de e-mail)
  const number = data.number ? String(data.number).trim() : "";

  // Para findOrCreate: se não tem número, usar email como chave única; se não tem email, usar nome
  const whereClause: any = {
    companyId: data.companyId,
    contactListId: data.contactListId
  };
  if (number) {
    whereClause.number = number;
  } else if (data.email) {
    whereClause.email = data.email;
  } else {
    whereClause.name = name;
  }

  const [record] = await ContactListItem.findOrCreate({
    where: whereClause,
    defaults: { ...data, number }
  });

  // Validar WhatsApp apenas se houver número
  if (number) {
    try {
      const response = await CheckContactNumber(number, record.companyId);
      record.isWhatsappValid = response ? true : false;
      if (response) record.number = response;
      await record.save();
    } catch (e) {
      logger.warn(`Número de WhatsApp inválido ou não encontrado: ${number}`);
      record.isWhatsappValid = false;
      await record.save();
    }
  } else {
    record.isWhatsappValid = false;
  }

  return record;
};

export default CreateService;
