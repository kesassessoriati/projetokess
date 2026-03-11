import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import CrmClient from "../../models/CrmClient";
import CrmLead from "../../models/CrmLead";
import CrmClientContact from "../../models/CrmClientContact";
import sequelize from "../../database";

interface Request {
  id: number | string;
  companyId: number;
}

const DeleteCrmClientService = async ({
  id,
  companyId
}: Request): Promise<void> => {
  const client = await CrmClient.findOne({
    where: { id, companyId }
  });

  if (!client) {
    throw new AppError("Cliente não encontrado.", 404);
  }

  const transaction = await sequelize.transaction();

  try {
    const pivotContacts = await CrmClientContact.findAll({
      where: { clientId: client.id },
      transaction
    });

    if (pivotContacts.length) {
      await CrmClientContact.destroy({
        where: { clientId: client.id },
        transaction
      });
    }

    // Unlink associated Lead and revert its status to 'Novo'
    const lead = await CrmLead.findOne({
      where: {
        companyId,
        convertedClientId: client.id
      },
      transaction
    });

    if (lead) {
      await lead.update({
        convertedClientId: null,
        leadStatus: "novo",
        status: "novo" // User wants 'Lead Novo', code uses 'novo'
      }, { transaction, hooks: false } as any);
      console.log("Lead reverted:", lead.id);
    }

    await client.destroy({ transaction, hooks: false } as any);
    console.log("Client removed:", id);
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export default DeleteCrmClientService;
