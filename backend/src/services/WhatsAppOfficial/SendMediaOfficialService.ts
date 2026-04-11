import Whatsapp from "../../models/Whatsapp";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { graphRequest, extractGraphError } from "../WhatsappCoexistence/graphApiHelper";
import fileType from "file-type";
import { rename } from "fs/promises";
import { join } from "path";
import { dispatch as webhookDispatch } from "../WebhookDispatch/WebhookDispatchService";

const verifyExtensionFile = async (media: Express.Multer.File) => {
	const resultFile = await fileType.fromFile(media.path);
	const havePoint = media.filename.includes(".");
	const actualExtension = media.filename.split(".").pop();
	const extension = resultFile?.ext || havePoint ? actualExtension : "withoutExtension";

	let newFilename = media.filename;

	if (actualExtension && actualExtension !== extension && havePoint) {
		newFilename = media.filename.replace(actualExtension, extension);
		const newPath = join(media.destination, newFilename);
		await rename(media.path, newPath);
	} else if (!havePoint) {
		newFilename = `${media.filename}.${extension}`;
		const newPath = join(media.destination, newFilename);
		await rename(media.path, newPath);
	}

	media.filename = newFilename;
	media.originalname = newFilename;
};

interface SendMediaOfficialParams {
  media: Express.Multer.File;
  body: string;
  ticketId: number;
  contact: Contact;
  connection: Whatsapp;
  passVerification?: boolean;
}

export const SendMediaOfficialService = async ({
  media,
  body,
  ticketId,
  contact,
  connection,
  passVerification = false
}: SendMediaOfficialParams) => {
  if (!passVerification) await verifyExtensionFile(media);

  if (!connection.coexistencePhoneNumberId || !connection.coexistencePermanentToken) {
    throw new Error("ERR_OFFICIAL_MISSING_CREDENTIALS");
  }

  console.log("[WhatsAppOfficial][SendMediaOfficial] connection", {
    whatsappId: connection.id,
    phoneNumberId: connection.coexistencePhoneNumberId,
    wabaId: connection.coexistenceWabaId,
    companyId: connection.companyId
  });

  // Upload media to Graph API first
  const uploadPayload = {
    file: media.path,
    type: media.mimetype
  };

  let mediaId: string;
  try {
    const uploadRes = await graphRequest(
      connection.coexistencePermanentToken,
      "post",
      `${connection.coexistencePhoneNumberId}/media`,
      uploadPayload
    );
    mediaId = uploadRes.id;
  } catch (error) {
    const graphError = extractGraphError(error);
    console.error("[WhatsAppOfficial][SendMediaOfficial] graphError", {
      status: "error",
      message: graphError,
      payload: uploadPayload
    });
    throw new Error(`ERR_OFFICIAL_MEDIA_UPLOAD: ${graphError}`);
  }

  // Determine message type based on mime
  const mediaType = media.mimetype.split("/")[0]; // image, video, audio, document

  const messagePayload: any = {
    messaging_product: "whatsapp",
    to: contact.number,
    type: mediaType,
    [mediaType]: {
      id: mediaId
    }
  };

  if (body) {
    messagePayload[mediaType].caption = body;
  }

  try {
    const response = await graphRequest(
      connection.coexistencePermanentToken,
      "post",
      `${connection.coexistencePhoneNumberId}/messages`,
      messagePayload
    );

    console.log("[WhatsAppOfficial][SendMediaOfficial] graphResponse", {
      status: "success",
      mediaType,
      messageId: response?.messages?.[0]?.id,
      raw: response
    });

    const messageId = response?.messages?.[0]?.id;
    if (!messageId) {
      throw new Error("ERR_OFFICIAL_NO_MESSAGE_ID");
    }

    const newMessage = await CreateMessageService({
      messageData: {
        wid: messageId,
        ticketId,
        body,
        fromMe: true,
        read: true,
        mediaType: media.mimetype.split("/")[0],
        mediaUrl: mediaId
      },
      companyId: connection.companyId
    });

    const ticket = await Ticket.findOne({
      where: { id: ticketId, companyId: connection.companyId },
      attributes: ["id", "status", "contactId", "queueId", "userId", "whatsappId", "channel"]
    });

    if (ticket) {
      webhookDispatch("MESSAGE_SENT", connection.companyId, {
        ticket: {
          id: ticket.id,
          status: ticket.status,
          contactId: ticket.contactId,
          queueId: ticket.queueId,
          userId: ticket.userId,
          whatsappId: ticket.whatsappId
        },
        contact: {
          id: contact.id,
          name: contact.name,
          number: contact.number,
          email: contact.email
        },
        message: {
          id: messageId,
          body,
          type: mediaType,
          timestamp: new Date().toISOString(),
          fromMe: true,
          fromAgent: true,
          userId: ticket.userId ?? null,
          source: "system",
          fromExternalDevice: false,
          fromCellphone: false,
          fromCompanion: false,
          deviceOrigin: "system",
          mediaUrl: mediaId,
          mimeType: media.mimetype,
          filename: media.originalname
        },
        whatsapp: {
          id: connection.id,
          name: connection.name,
          number: connection.number,
          token: connection.token,
          channel: connection.channel
        }
      });
    }

    return newMessage;
  } catch (error) {
    const graphError = extractGraphError(error);
    console.error("[WhatsAppOfficial][SendMediaOfficial] graphError", {
      status: "error",
      message: graphError,
      payload: messagePayload
    });
    throw new Error(`ERR_OFFICIAL_SEND_MEDIA: ${graphError}`);
  }
};
