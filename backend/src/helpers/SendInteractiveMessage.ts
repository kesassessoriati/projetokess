/**
 * SendInteractiveMessage.ts
 *
 * Helper para envio de mensagens interativas via WhatsApp (botões, listas, carrossel).
 * Usa o padrão relayMessage + interactiveMessage habilitado pelo whaileys (canove/whaileys).
 *
 * Compatível com o WASocket existente — faz cast para `any` no relayMessage
 * para contornar diferenças de tipos entre @whiskeysockets/baileys e whaileys.
 */

import axios from "axios";
import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import logger from "../utils/logger";

// ─── Tipos Públicos ────────────────────────────────────────────────────────

export interface InteractiveButton {
  displayText: string;
  /** Tipo do botão: url, call, reply (quick_reply) ou copy */
  type: "url" | "call" | "reply" | "copy";
  /** Valor associado: URL, telefone, id de reply ou código para copiar */
  value: string;
}

export interface ListRow {
  title: string;
  rowId: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

interface LegacyListItem {
  displayText?: string;
  value?: string;
  description?: string;
  title?: string;
  rowId?: string;
}

export interface CarouselCard {
  headerTitle?: string;
  /** URL externa da imagem do header */
  imageUrl?: string;
  body: string;
  footer?: string;
  buttons: InteractiveButton[];
}

// ─── Helpers internos ──────────────────────────────────────────────────────

function mapButtonsToNative(buttons: InteractiveButton[]): any[] {
  const baseId = Date.now();
  return buttons.map((btn, index) => {
    switch (btn.type) {
      case "url":
        return {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: btn.displayText,
            url: btn.value,
            merchant_url: btn.value
          })
        };
      case "call":
        return {
          name: "cta_call",
          buttonParamsJson: JSON.stringify({
            display_text: btn.displayText,
            phone_number: btn.value
          })
        };
      case "copy":
        return {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: btn.displayText,
            copy_code: btn.value
          })
        };
      default: // reply
        return {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: btn.displayText,
            id: btn.value?.trim() || `btn_${baseId}_${index + 1}`
          })
        };
    }
  });
}

function normalizeListSections(input: any): ListSection[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [];
  }

  const hasRows = input.every(section => section && Array.isArray(section.rows));
  if (hasRows) {
    return input
      .map((section: any, sectionIndex: number) => {
        const title =
          typeof section?.title === "string" && section.title.trim()
            ? section.title.trim()
            : `Opções ${sectionIndex + 1}`;

        const rows = (section.rows || [])
          .map((row: any, rowIndex: number) => {
            const rowTitle =
              typeof row?.title === "string" && row.title.trim()
                ? row.title.trim()
                : `Opção ${rowIndex + 1}`;
            const rowId =
              typeof row?.rowId === "string" && row.rowId.trim()
                ? row.rowId.trim()
                : `row_${sectionIndex + 1}_${rowIndex + 1}`;
            const description =
              typeof row?.description === "string" && row.description.trim()
                ? row.description.trim()
                : undefined;

            return { title: rowTitle, rowId, description };
          })
          .filter(Boolean);

        return { title, rows };
      })
      .filter(section => section.rows.length > 0);
  }

  const legacyRows = input
    .map((item: LegacyListItem, index: number) => {
      const title =
        typeof item?.title === "string" && item.title.trim()
          ? item.title.trim()
          : typeof item?.displayText === "string" && item.displayText.trim()
            ? item.displayText.trim()
            : `Opção ${index + 1}`;

      const rowId =
        typeof item?.rowId === "string" && item.rowId.trim()
          ? item.rowId.trim()
          : typeof item?.value === "string" && item.value.trim()
            ? item.value.trim()
            : `row_${index + 1}`;

      const description =
        typeof item?.description === "string" && item.description.trim()
          ? item.description.trim()
          : undefined;

      return { title, rowId, description };
    })
    .filter(Boolean);

  if (legacyRows.length === 0) {
    return [];
  }

  return [{ title: "Opções", rows: legacyRows }];
}

async function downloadMediaBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000
    });
    const contentType = response.headers["content-type"] || "";
    if (contentType.includes("text/html") || contentType.includes("application/json")) {
      logger.warn(`[SendInteractiveMessage] URL retornou conteúdo inválido (${contentType}): ${url}`);
      return null;
    }
    return Buffer.from(response.data);
  } catch (err) {
    logger.error(`[SendInteractiveMessage] Erro ao baixar mídia: ${url}`, err);
    return null;
  }
}

// ─── Funções Públicas ──────────────────────────────────────────────────────

/**
 * Envia mensagem com botões de ação (URL, Call, Reply, Copy).
 * Suporta até 4 botões por mensagem.
 */
export async function sendButtonMessage(
  wbot: any,
  jid: string,
  text: string,
  footer: string,
  buttons: InteractiveButton[]
): Promise<void> {
  try {
    const nativeButtons = mapButtonsToNative(buttons);

    const interactiveMsg: any = {
      body: { text },
      nativeFlowMessage: { buttons: nativeButtons }
    };

    if (footer) {
      interactiveMsg.footer = { text: footer };
    }

    const userJid = wbot.user?.id || jid;
    let newMsg: any;

    try {
      const wrappedContent = {
        viewOnceMessage: {
          message: {
            interactiveMessage: interactiveMsg
          }
        }
      };
      newMsg = generateWAMessageFromContent(jid, wrappedContent, { userJid });
      await wbot.relayMessage(jid, newMsg.message!, { messageId: newMsg.key.id });
    } catch (_) {
      newMsg = generateWAMessageFromContent(jid, { interactiveMessage: interactiveMsg }, { userJid });
      await wbot.relayMessage(jid, newMsg.message!, { messageId: newMsg.key.id });
    }

    await wbot.upsertMessage(newMsg, "notify");
    logger.info(`[SendInteractiveMessage] Botões enviados para ${jid}`);
  } catch (err) {
    logger.error(`[SendInteractiveMessage] Erro ao enviar botões para ${jid}:`, err);
    // Fallback: envia como texto simples com botões listados
    let fallbackText = text + "\n\n";
    buttons.forEach((btn, i) => {
      fallbackText += `${i + 1}. ${btn.displayText}`;
      if (btn.type === "url") fallbackText += ` → ${btn.value}`;
      else if (btn.type === "call") fallbackText += ` → 📞 ${btn.value}`;
      fallbackText += "\n";
    });
    if (footer) fallbackText += `\n_${footer}_`;
    await wbot.sendMessage(jid, { text: fallbackText });
  }
}

/**
 * Envia mensagem de lista selecionável (menu de opções).
 */
export async function sendListMessage(
  wbot: any,
  jid: string,
  text: string,
  buttonText: string,
  sections: any[],
  footer?: string
): Promise<void> {
  const normalizedSections = normalizeListSections(sections);

  if (normalizedSections.length === 0) {
    logger.warn(`[SendInteractiveMessage] Lista invalida para ${jid}. Enviando apenas texto.`);
    await wbot.sendMessage(jid, { text });
    return;
  }

  try {
    const listMsg: any = {
      text,
      buttonText: buttonText || "Ver opções",
      sections: normalizedSections,
      footer: footer || ""
    };

    await wbot.sendMessage(jid, listMsg);
    logger.info(`[SendInteractiveMessage] Lista enviada para ${jid}`);
  } catch (err) {
    logger.error(`[SendInteractiveMessage] Erro ao enviar lista para ${jid}:`, err);
    // Fallback: envia opções como texto numerado
    let fallbackText = text + "\n\n";
    normalizedSections.forEach(sec => {
      fallbackText += `*${sec.title}*\n`;
      sec.rows.forEach((row, i) => {
        fallbackText += `${i + 1}. ${row.title}`;
        if (row.description) fallbackText += ` — ${row.description}`;
        fallbackText += "\n";
      });
      fallbackText += "\n";
    });
    await wbot.sendMessage(jid, { text: fallbackText });
  }
}

/**
 * Envia mensagem de carrossel (cards com imagem, texto e botões).
 * Tenta enviar nativo via relayMessage; em caso de falha envia como
 * mensagens de texto separadas (fallback).
 */
export async function sendCarouselMessage(
  wbot: any,
  jid: string,
  cards: CarouselCard[]
): Promise<void> {
  try {
    // Pré-carrega imagens se houver URLs
    const preparedCards: any[] = [];
    for (const card of cards) {
      const nativeButtons = mapButtonsToNative(card.buttons);
      const cardEntry: any = {
        header: {
          title: card.headerTitle || "",
          hasMediaAttachment: false
        },
        body: { text: card.body },
        nativeFlowMessage: { buttons: nativeButtons }
      };

      if (card.footer) {
        cardEntry.footer = { text: card.footer };
      }

      if (card.imageUrl) {
        const imgBuffer = await downloadMediaBuffer(card.imageUrl);
        if (imgBuffer) {
          try {
            // Envia para si mesmo para obter imageMessage referenciável
            const uploaded = await wbot.sendMessage(
              wbot.user?.id || jid,
              { image: imgBuffer, mimetype: "image/jpeg" }
            );
            if (uploaded?.message?.imageMessage) {
              cardEntry.header.hasMediaAttachment = true;
              cardEntry.header.imageMessage = uploaded.message.imageMessage;
            }
          } catch (_) {
            // Ignora falha no upload de imagem, envia card sem imagem
          }
        }
      }

      preparedCards.push(cardEntry);
    }

    const userJid = wbot.user?.id || jid;
    const carouselContent = { interactiveMessage: { carouselMessage: { cards: preparedCards } } };
    const newMsg = generateWAMessageFromContent(jid, carouselContent, { userJid });
    await wbot.relayMessage(jid, newMsg.message!, { messageId: newMsg.key.id });
    await wbot.upsertMessage(newMsg, "notify");
    logger.info(`[SendInteractiveMessage] Carrossel enviado para ${jid} (${cards.length} cards)`);
  } catch (err) {
    logger.warn(`[SendInteractiveMessage] Falha no carrossel nativo para ${jid}, usando fallback`);
    // Fallback: envia cada card como mensagem de texto
    for (const [i, card] of cards.entries()) {
      let msg = card.headerTitle ? `*${card.headerTitle}*\n\n` : "";
      msg += card.body;
      if (card.buttons.length > 0) {
        msg += "\n\n";
        card.buttons.forEach(btn => {
          if (btn.type === "url") msg += `🔗 ${btn.displayText}: ${btn.value}\n`;
          else if (btn.type === "call") msg += `📞 ${btn.displayText}: ${btn.value}\n`;
          else msg += `• ${btn.displayText}\n`;
        });
      }
      if (card.footer) msg += `\n_${card.footer}_`;

      await wbot.sendMessage(jid, { text: msg });
      // Pequeno delay entre cards para não parecer spam
      if (i < cards.length - 1) {
        await new Promise(r => setTimeout(r, 800));
      }
    }
  }
}
