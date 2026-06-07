import logger from "../../utils/logger";

export interface SplitMessagesConfig {
  splitMessagesEnabled: boolean;
  maxMessagesPerReply: number;
  maxCharsPerMessage: number;
  typingSimulationEnabled: boolean;
  typingDelayMinMs: number;
  typingDelayMaxMs: number;
  breakStrategy: "sentence" | "paragraph" | "smart";
}

export const DEFAULT_SPLIT_CONFIG: SplitMessagesConfig = {
  splitMessagesEnabled: false,
  maxMessagesPerReply: 4,
  maxCharsPerMessage: 300,
  typingSimulationEnabled: true,
  typingDelayMinMs: 800,
  typingDelayMaxMs: 2000,
  breakStrategy: "smart",
};

const URL_PATTERN = /https?:\/\/[^\s]+/g;
const PRICE_PATTERN = /R\$\s*[\d.,]+/g;
const DATE_PATTERN = /\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g;
const TIME_PATTERN = /\d{1,2}h(?:\d{2})?|\d{1,2}:\d{2}/g;

const preservedTokens: Map<string, string> = new Map();
let tokenCounter = 0;

function tokenizePreserved(text: string): string {
  preservedTokens.clear();
  tokenCounter = 0;

  const patterns = [URL_PATTERN, PRICE_PATTERN, DATE_PATTERN, TIME_PATTERN];
  let result = text;

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, (match) => {
      const token = `__TOKEN_${tokenCounter++}__`;
      preservedTokens.set(token, match);
      return token;
    });
  }

  return result;
}

function restoreTokens(text: string): string {
  let result = text;
  preservedTokens.forEach((original, token) => {
    result = result.split(token).join(original);
  });
  return result;
}

function splitBySentence(text: string, maxChars: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [text];
  const parts: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence.trim()}` : sentence.trim();
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) parts.push(current.trim());
      current = sentence.trim();
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

function splitByParagraph(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const parts: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= maxChars) {
      parts.push(para);
    } else {
      const sentences = splitBySentence(para, maxChars);
      parts.push(...sentences);
    }
  }

  return parts;
}

function splitSmart(text: string, maxChars: number): string[] {
  // Try paragraph first, then sentence
  const paraBreaks = text.split(/\n{2,}/);
  if (paraBreaks.length > 1) {
    return splitByParagraph(text, maxChars);
  }
  return splitBySentence(text, maxChars);
}

export function splitAgentReply(
  text: string,
  config: Partial<SplitMessagesConfig> = {}
): string[] {
  const merged: SplitMessagesConfig = { ...DEFAULT_SPLIT_CONFIG, ...config };

  if (!merged.splitMessagesEnabled || !text || text.trim().length === 0) {
    return [text];
  }

  // If short enough, send as one
  if (text.length <= merged.maxCharsPerMessage) {
    return [text];
  }

  try {
    const tokenized = tokenizePreserved(text);

    let parts: string[];
    switch (merged.breakStrategy) {
      case "paragraph":
        parts = splitByParagraph(tokenized, merged.maxCharsPerMessage);
        break;
      case "sentence":
        parts = splitBySentence(tokenized, merged.maxCharsPerMessage);
        break;
      default:
        parts = splitSmart(tokenized, merged.maxCharsPerMessage);
    }

    const restored = parts.map(restoreTokens).filter(p => p.trim().length > 0);

    // Cap at maxMessagesPerReply
    if (restored.length > merged.maxMessagesPerReply) {
      const capped = restored.slice(0, merged.maxMessagesPerReply - 1);
      const remainder = restored.slice(merged.maxMessagesPerReply - 1).join(" ");
      capped.push(remainder);
      return capped;
    }

    return restored.length > 0 ? restored : [text];
  } catch (err) {
    logger.error("[InternalAgentMessageSplitter] Erro ao dividir mensagem:", err);
    return [text];
  }
}

export function getTypingDelay(config: Partial<SplitMessagesConfig> = {}): number {
  const merged: SplitMessagesConfig = { ...DEFAULT_SPLIT_CONFIG, ...config };
  if (!merged.typingSimulationEnabled) return 0;
  const min = merged.typingDelayMinMs;
  const max = merged.typingDelayMaxMs;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default { splitAgentReply, getTypingDelay, DEFAULT_SPLIT_CONFIG };
