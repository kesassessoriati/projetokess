import { fn, col } from "sequelize";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";
import AppError from "../../errors/AppError";

const ShowService = async (id: string | number): Promise<ContactList> => {
  const record = await ContactList.findOne({
    where: { id },
    include: [
      {
        model: ContactListItem,
        as: "contacts",
        attributes: [],
        required: false
      }
    ],
    attributes: [
      "id",
      "name",
      [fn("count", col("contacts.id")), "contactsCount"]
    ],
    group: ["ContactList.id"]
  });

  if (!record) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  return record;
};

export default ShowService;
