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
      // Use hooks: false to avoid unnecessary syncs during deletion
      await lead.update({
        convertedClientId: null,
        leadStatus: "novo",
        status: "new"
      }, { transaction, hooks: false } as any);
    }

    await client.destroy({ transaction, hooks: false });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export default DeleteCrmClientService;
