import * as Sentry from "@sentry/node";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";
import ShowBaileysService from "../BaileysServices/ShowBaileysService";
import CreateContactService from "../ContactServices/CreateContactService";
import { isString, isArray } from "lodash";
import path from "path";
import fs from 'fs';
import resolveWhatsAppContactName from "../../helpers/resolveWhatsAppContactName";

const ImportContactsService = async (companyId?: number, whatsappId?: number): Promise<void> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(whatsappId, companyId);
  const wbot = getWbot(defaultWhatsapp.id);

  let phoneContacts;

  try {
    const contactsString = await ShowBaileysService(wbot.id);
    phoneContacts = JSON.parse(JSON.stringify(contactsString.contacts));

    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const beforeFilePath = path.join(publicFolder,`company${companyId}`, 'contatos_antes.txt');
    fs.writeFile(beforeFilePath, JSON.stringify(phoneContacts, null, 2), (err) => {
      if (err) {
        logger.error(`Failed to write contacts to file: ${err}`);
        throw err;
      }
      // console.log('O arquivo contatos_antes.txt foi criado!');
    });

  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Could not get whatsapp contacts from phone. Err: ${err}`);
  }

  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const afterFilePath = path.join(publicFolder,`company${companyId}`, 'contatos_depois.txt');
  fs.writeFile(afterFilePath, JSON.stringify(phoneContacts, null, 2), (err) => {
    if (err) {
      logger.error(`Failed to write contacts to file: ${err}`);
      throw err;
    }
    // console.log('O arquivo contatos_depois.txt foi criado!');
  });

  const phoneContactsList = isString(phoneContacts)
    ? JSON.parse(phoneContacts)
    : phoneContacts;

  if (isArray(phoneContactsList)) {
    for (const contactData of phoneContactsList) {
      const { id } = contactData;
      if (id === "status@broadcast" || id.includes("g.us")) continue;
      const number = id.replace(/\D/g, "");
      const resolvedName = resolveWhatsAppContactName(contactData, id);

      const existingContact = await Contact.findOne({
        where: { number, companyId }
      });

      if (existingContact) {
        if (resolvedName && existingContact.name !== resolvedName) {
          existingContact.name = resolvedName;
          await existingContact.save();
        }
      } else {
        try {
          await CreateContactService({
            number,
            name: resolvedName || "",
            companyId
          });
        } catch (error) {
          Sentry.captureException(error);
          logger.warn(
            `Could not get whatsapp contacts from phone. Err: ${error}`
          );
        }
      }
    }
  }
};

export default ImportContactsService;
