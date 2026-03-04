import Whatsapp from "../../models/Whatsapp";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import CreateOrUpdateTicketService from "../../HubEcosystem/services/CreateOrUpdateTicketService";
import FindOrCreateContactService from "../../HubEcosystem/services/FindOrCreateContactService";
import { graphRequest } from "../WhatsappCoexistence/graphApiHelper";

interface OfficialWebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

interface OfficialWebhookMessage {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: "messages";
      value: {
        messaging_product: "whatsapp";
        metadata: {
          phone_number_id: string;
          display_phone_number: string;
        };
        contacts?: OfficialWebhookContact[];
        messages: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: "text" | "image" | "video" | "audio" | "document";
          text?: { body: string };
          image?: { id: string; caption?: string };
          video?: { id: string; caption?: string };
          audio?: { id: string };
          document?: { id: string; caption?: string; filename?: string };
        }>;
      };
    }>;
  }>;
}

/**
 * Tenta buscar a foto de perfil do contato via WABA Contacts API.
 * A Meta não garante que o endpoint retorne foto para todos os contatos —
 * retorna string vazia em caso de falha.
 */
const fetchContactProfilePicture = async (
  waId: string,
  connection: Whatsapp
): Promise<string> => {
  try {
    const wabaId = connection.coexistenceWabaId;
    const token = connection.coexistencePermanentToken;
    if (!wabaId || !token) return "";

    const data = await graphRequest<{ profile_picture_url?: string }>(
      token,
      "get",
      `${wabaId}/contacts/${waId}?fields=profile_picture_url`
    );

    return data?.profile_picture_url || "";
  } catch {
    return "";
  }
};

export const OfficialMessageListener = async (body: OfficialWebhookMessage) => {
  if (!body.entry || !Array.isArray(body.entry)) return;

  for (const entryItem of body.entry) {
    const { changes } = entryItem;
    if (!changes || !Array.isArray(changes)) continue;

    for (const change of changes) {
      if (change.field !== "messages") continue;

      const { value } = change;
      if (!value.messages || !Array.isArray(value.messages)) continue;

      // Find connection by phone number ID
      const connection = await Whatsapp.findOne({
        where: {
          coexistencePhoneNumberId: value.metadata.phone_number_id,
          channel: "whatsapp_official"
        }
      });

      if (!connection) {
        console.warn("Connection not found for phone number ID:", value.metadata.phone_number_id);
        continue;
      }

      // Monta mapa wa_id → nome usando o array contacts que a Meta envia no webhook
      const contactsNameMap = new Map<string, string>();
      if (value.contacts && Array.isArray(value.contacts)) {
        for (const c of value.contacts) {
          if (c.wa_id && c.profile?.name) {
            contactsNameMap.set(c.wa_id, c.profile.name);
          }
        }
      }

      for (const message of value.messages) {
        // Ignore outgoing messages
        if (!message.from) continue;

        const from = message.from;
        const messageId = message.id;
        const timestamp = new Date(parseInt(message.timestamp) * 1000);

        // Nome do contato vindo do array contacts do webhook
        const contactName = contactsNameMap.get(from) || "";

        // Extract content based on type
        let body = "";
        let mediaUrl = "";
        let mediaType = "";
        let fileName = "";

        switch (message.type) {
          case "text":
            body = message.text?.body || "";
            break;
          case "image":
            body = message.image?.caption || "";
            mediaUrl = message.image?.id || "";
            mediaType = "image";
            break;
          case "video":
            body = message.video?.caption || "";
            mediaUrl = message.video?.id || "";
            mediaType = "video";
            break;
          case "audio":
            mediaUrl = message.audio?.id || "";
            mediaType = "audio";
            break;
          case "document":
            body = message.document?.caption || "";
            mediaUrl = message.document?.id || "";
            mediaType = "document";
            fileName = message.document?.filename || "";
            break;
        }

        try {
          // Tenta buscar foto de perfil de forma assíncrona (best-effort — falha silenciosa)
          const profilePicUrl = await fetchContactProfilePicture(from, connection);

          // Find or create contact com nome e foto quando disponíveis
          const contact = await FindOrCreateContactService({
            name: contactName,
            firstName: contactName,
            lastName: "",
            picture: profilePicUrl,
            from,
            connection
          });

          // Se o contato já existia sem nome e agora temos o nome, atualiza
          if (contact && !contact.name && contactName) {
            await contact.update({ name: contactName });
          }

          // Se o contato já existia sem foto e conseguimos uma, atualiza
          if (contact && !contact.profilePicUrl && profilePicUrl) {
            await contact.update({ profilePicUrl });
          }

          // Create or update ticket
          const ticket = await CreateOrUpdateTicketService({
            contactId: contact.id,
            channel: "whatsapp_official",
            contents: [{ type: message.type as any, text: body }],
            connection
          });

          // Create message record
          const messageData: any = {
            wid: messageId,
            contactId: contact.id,
            body: body || `Mídia ${message.type}`,
            ticketId: ticket.id,
            fromMe: false,
            ack: 1,
            read: false
          };

          if (mediaUrl) {
            messageData.mediaUrl = mediaUrl;
            messageData.mediaType = mediaType;
            if (fileName) messageData.fileName = fileName;
          }

          await CreateMessageService({ messageData, companyId: connection.companyId });

          console.log("Official message processed:", { from, contactName, messageId, ticketId: ticket.id });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
          console.error("Error processing official message:", errMsg);
        }
      }
    }
  }
};
