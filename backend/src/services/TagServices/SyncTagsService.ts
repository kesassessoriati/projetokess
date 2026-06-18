import Tag from "../../models/Tag";
import Contact from "../../models/Contact";
import ContactTag from "../../models/ContactTag";

interface TagInput {
  id?: number | string;
  name?: string;
  color?: string;
}

interface Request {
  tags: TagInput[];
  contactId: number;
  companyId?: number;
}

const SyncTags = async ({
  tags,
  contactId,
  companyId
}: Request): Promise<Contact | null> => {
  const contact = companyId
    ? await Contact.findOne({ where: { id: contactId, companyId } })
    : await Contact.findByPk(contactId);

  if (!contact) return null;

  const tagIds: number[] = [];
  for (const item of tags || []) {
    let tag: Tag | null = null;

    if (item.id) {
      tag = await Tag.findOne({
        where: companyId ? { id: item.id, companyId } : { id: item.id }
      });
    }

    const tagName = String(item.name || "").trim();
    if (!tag && tagName && companyId) {
      [tag] = await Tag.findOrCreate({
        where: { name: tagName, companyId },
        defaults: {
          name: tagName,
          color: item.color || "#A4CCCC",
          companyId
        } as any
      });
    }

    if (tag && !tagIds.includes(tag.id)) {
      tagIds.push(tag.id);
    }
  }

  const tagList = tagIds.map(tagId => ({ tagId, contactId }));

  await ContactTag.destroy({ where: { contactId } });
  if (tagList.length > 0) {
    await ContactTag.bulkCreate(tagList);
  }

  await contact.reload({
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] }
      }
    ]
  });

  return contact;
};

export default SyncTags;
