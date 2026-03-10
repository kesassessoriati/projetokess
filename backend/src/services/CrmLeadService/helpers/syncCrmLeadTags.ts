import CrmLead from "../../../models/CrmLead";
import LeadTag from "../../../models/LeadTag";
import Tag from "../../../models/Tag";

interface ITagInput {
  id?: number | string;
  name: string;
  color?: string;
}

export const syncCrmLeadTags = async (
  leadId: number,
  companyId: number,
  tagsInput: ITagInput[]
): Promise<void> => {
  if (!tagsInput || !Array.isArray(tagsInput)) {
    return;
  }

  const tagIdsToSync: number[] = [];

  for (const t of tagsInput) {
    let tag: Tag | null = null;

    if (t.id) {
      tag = await Tag.findOne({
        where: { id: t.id, companyId }
      });
    }

    if (!tag && t.name) {
      // Procura primeiro pelo nome
      tag = await Tag.findOne({
        where: { name: t.name, companyId }
      });

      // Se não achar, criar nova
      if (!tag) {
        tag = await Tag.create({
          name: t.name,
          color: t.color || "#A4CCCC",
          companyId
        });
      }
    }

    if (tag) {
      tagIdsToSync.push(tag.id);
    }
  }

  const lead = await CrmLead.findByPk(leadId);
  if (lead) {
    // Para simplificar, usamos a destruição em massa na tabela pivot e depois a recriação
    await LeadTag.destroy({
      where: { leadId }
    });

    const newRelations = tagIdsToSync.map(tagId => ({
      leadId,
      tagId
    }));

    if (newRelations.length > 0) {
      await LeadTag.bulkCreate(newRelations);
    }
  }
};
