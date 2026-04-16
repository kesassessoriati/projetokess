import CrmClientTag from "../../../models/CrmClientTag";
import Tag from "../../../models/Tag";

interface ITagInput {
  id?: number | string;
  name: string;
  color?: string;
}

const normalizeTagsInput = (tagsInput?: string | ITagInput[] | null): ITagInput[] => {
  if (Array.isArray(tagsInput)) {
    return tagsInput.filter(tag => tag && tag.name);
  }

  if (typeof tagsInput === "string" && tagsInput.trim()) {
    return tagsInput
      .split(",")
      .map(name => name.trim())
      .filter(Boolean)
      .map(name => ({ name }));
  }

  return [];
};

export const syncCrmClientTags = async (
  clientId: number,
  companyId: number,
  tagsInput?: string | ITagInput[] | null
): Promise<void> => {
  const normalizedTags = normalizeTagsInput(tagsInput);
  const tagIdsToSync: number[] = [];

  for (const t of normalizedTags) {
    let tag: Tag | null = null;

    if (t.id) {
      tag = await Tag.findOne({
        where: { id: t.id, companyId }
      });
    }

    if (!tag && t.name) {
      tag = await Tag.findOne({
        where: { name: t.name, companyId }
      });

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

  await CrmClientTag.destroy({
    where: { clientId }
  });

  const newRelations = tagIdsToSync.map(tagId => ({
    clientId,
    tagId
  }));

  if (newRelations.length > 0) {
    await CrmClientTag.bulkCreate(newRelations);
  }
};

export const tagsToString = (tagsInput?: string | ITagInput[] | null): string => {
  const normalizedTags = normalizeTagsInput(tagsInput);
  return normalizedTags
    .map(tag => tag.name?.trim())
    .filter(Boolean)
    .join(", ");
};
