import Contact from "../../models/Contact";
import logger from "../../utils/logger";
import { Op } from "sequelize";
import { getBrazilianPhoneVariants } from "../../helpers/normalizeContactNumber";

interface FindDuplicateParams {
  number?: string;
  lid?: string;
  remoteJid?: string;
  companyId: number;
  excludeId?: number;
}

interface MergeContactsParams {
  originalContact: Contact;
  duplicateContact: Contact;
  companyId: number;
}

export const FindDuplicateContact = async ({
  number,
  lid,
  remoteJid,
  companyId,
  excludeId
}: FindDuplicateParams): Promise<Contact | null> => {
  try {
    logger.info(`Finding duplicate contact - number: ${number}, lid: ${lid}, companyId: ${companyId}`);
    
    const orConditions: any[] = [];
    
    // Busca por número incluindo variantes com e sem o nono dígito brasileiro
    if (number) {
      const variants = getBrazilianPhoneVariants(number);
      if (variants.length > 0) {
        orConditions.push({ number: { [Op.in]: variants } });
      } else {
        orConditions.push({ number });
      }
    }
    
    // Busca por LID
    if (lid) {
      orConditions.push({ lid });
    }
    
    // Busca por remoteJid (se não for @lid)
    if (remoteJid && !remoteJid.includes("@lid")) {
      orConditions.push({ remoteJid });
    }
    
    if (orConditions.length === 0) {
      logger.warn("No search criteria provided for duplicate contact search");
      return null;
    }
    
    const whereClause: any = {
      companyId,
      [Op.or]: orConditions
    };
    
    // Excluir ID específico se fornecido
    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }
    
    const duplicate = await Contact.findOne({
      where: whereClause,
      order: [["updatedAt", "DESC"]] // Pega o mais recente
    });
    
    if (duplicate) {
      logger.info(`Duplicate contact found: ${duplicate.id} (${duplicate.name})`);
    } else {
      logger.info("No duplicate contact found");
    }
    
    return duplicate;
    
  } catch (error) {
    logger.error("Error finding duplicate contact:", error);
    return null;
  }
};

export const MergeContacts = async ({
  originalContact,
  duplicateContact,
  companyId
}: MergeContactsParams): Promise<Contact> => {
  try {
    logger.info(`Merging contact ${duplicateContact.id} into ${originalContact.id}`);
    
    // Determinar quais dados são melhores
    const mergedData: any = {
      companyId
    };
    
    // Nome: usar o mais significativo
    if (originalContact.name && originalContact.name !== originalContact.number) {
      mergedData.name = originalContact.name;
    } else if (duplicateContact.name && duplicateContact.name !== duplicateContact.number) {
      mergedData.name = duplicateContact.name;
    } else {
      mergedData.name = originalContact.name || duplicateContact.name;
    }
    
    // Número: sempre preferir número real sobre @lid / temp
    const originalIsReal = originalContact.number &&
      !originalContact.number.includes("@lid") &&
      !originalContact.number.startsWith("lid-") &&
      !originalContact.number.startsWith("temp-");
    const duplicateIsReal = duplicateContact.number &&
      !duplicateContact.number.includes("@lid") &&
      !duplicateContact.number.startsWith("lid-") &&
      !duplicateContact.number.startsWith("temp-");

    // Quando originalContact tem número LID/temp e duplicateContact tem número real,
    // NÃO tentamos mover o número real para originalContact (causaria constraint violation
    // já que duplicateContact ainda existe na DB com esse número).
    // Em vez disso: enriquecemos duplicateContact com os dados do original e o retornamos.
    if (!originalIsReal && duplicateIsReal) {
      logger.info(
        `MergeContacts: originalContact ${originalContact.id} has LID/temp number, duplicateContact ${duplicateContact.id} has real number — enriching duplicate and returning it`
      );

      const enrichData: any = { companyId };
      // Nome: enriquecer apenas se duplicateContact não tem nome significativo
      if (
        originalContact.name &&
        originalContact.name !== originalContact.number &&
        (!duplicateContact.name || duplicateContact.name === duplicateContact.number)
      ) {
        enrichData.name = originalContact.name;
      }
      enrichData.lid = duplicateContact.lid || originalContact.lid;
      enrichData.isLid = false;
      enrichData.savedToPhone = originalContact.savedToPhone || duplicateContact.savedToPhone;
      enrichData.potentialScore = Math.max(originalContact.potentialScore || 0, duplicateContact.potentialScore || 0);
      enrichData.isPotential = enrichData.potentialScore >= 5;

      await duplicateContact.update(enrichData);
      logger.info(`Contact merged (duplicate wins) — Original: ${originalContact.id}, Duplicate: ${duplicateContact.id}`);
      return duplicateContact;
    }

    // Caminho normal: originalContact tem número real ou ambos têm LID
    // Mantemos o número do originalContact — não tentamos mudar para evitar constraint
    mergedData.number = originalContact.number;

    // LID: usar o que existir
    mergedData.lid = originalContact.lid || duplicateContact.lid;

    // RemoteJid: usar o mais recente
    mergedData.remoteJid = originalContact.remoteJid || duplicateContact.remoteJid;

    // ProfilePicUrl: usar o que existir
    mergedData.profilePicUrl = originalContact.profilePicUrl || duplicateContact.profilePicUrl;

    // Email: usar o que existir
    mergedData.email = originalContact.email || duplicateContact.email;

    // Campos booleanos: usar valores mais significativos
    mergedData.isLid = originalContact.isLid && duplicateContact.isLid;
    mergedData.savedToPhone = originalContact.savedToPhone || duplicateContact.savedToPhone;
    mergedData.savedToPhoneAt = originalContact.savedToPhoneAt || duplicateContact.savedToPhoneAt;
    mergedData.savedToPhoneReason = originalContact.savedToPhoneReason || duplicateContact.savedToPhoneReason;

    // Score: usar o maior
    mergedData.potentialScore = Math.max(
      originalContact.potentialScore || 0,
      duplicateContact.potentialScore || 0
    );

    mergedData.isPotential = mergedData.potentialScore >= 5;

    // LidStability: usar o mais confiável
    if (originalContact.lidStability === "high" || duplicateContact.lidStability === "high") {
      mergedData.lidStability = "high";
    } else if (originalContact.lidStability === "medium" || duplicateContact.lidStability === "medium") {
      mergedData.lidStability = "medium";
    } else {
      mergedData.lidStability = originalContact.lidStability || duplicateContact.lidStability;
    }

    // Atualizar contato original com dados mergeados
    await originalContact.update(mergedData);

    logger.info(`Contact merged successfully - Original: ${originalContact.id}, Duplicate: ${duplicateContact.id}`);

    return originalContact;
    
  } catch (error) {
    logger.error("Error merging contacts:", error);
    throw error;
  }
};

export const DeduplicateContact = async (
  contactData: any,
  companyId: number
): Promise<Contact> => {
  try {
    const { number, lid, remoteJid, ...otherData } = contactData;
    
    // Primeiro, buscar duplicados
    const duplicate = await FindDuplicateContact({
      number,
      lid,
      remoteJid,
      companyId
    });
    
    if (duplicate) {
      // Se encontrou duplicado, fazer merge
      const mergedContact = await MergeContacts({
        originalContact: duplicate,
        duplicateContact: contactData as Contact,
        companyId
      });
      
      return mergedContact;
    } else {
      // Se não encontrou, criar novo contato
      const newContact = await Contact.create({
        ...otherData,
        number,
        lid,
        remoteJid,
        companyId,
        potentialScore: 0,
        isPotential: false,
        savedToPhone: false,
        lidStability: "unknown"
      });
      
      logger.info(`New contact created: ${newContact.id}`);
      return newContact;
    }
    
  } catch (error) {
    logger.error("Error in contact deduplication:", error);
    throw error;
  }
};

export const UpdateContactLidStability = async (
  contactId: number,
  companyId: number
): Promise<void> => {
  try {
    const contact = await Contact.findByPk(contactId);
    
    if (!contact) {
      logger.warn(`Contact ${contactId} not found for stability update`);
      return;
    }
    
    // Verificar histórico de LIDs para determinar estabilidade
    const relatedContacts = await Contact.findAll({
      where: {
        companyId,
        [Op.or]: [
          { number: contact.number },
          { lid: contact.lid }
        ],
        id: { [Op.ne]: contactId }
      }
    });
    
    let stability = "unknown";
    
    if (relatedContacts.length === 0) {
      stability = "high"; // Sem duplicados = estável
    } else if (relatedContacts.length <= 2) {
      stability = "medium"; // Poucos duplicados = médio
    } else {
      stability = "low"; // Muitos duplicados = instável
    }
    
    await contact.update({ lidStability: stability });
    
    logger.info(`Contact ${contactId} lid stability updated: ${stability}`);
    
  } catch (error) {
    logger.error("Error updating contact lid stability:", error);
  }
};
