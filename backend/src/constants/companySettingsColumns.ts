import AppError from "../errors/AppError";

/**
 * Allowlist das colunas que podem ser lidas/atualizadas em "CompaniesSettings"
 * através das rotas de configuração da empresa.
 *
 * Espelha as colunas reais do model `CompaniesSettings`, exceto chaves de
 * controle (id, companyId, createdAt, updatedAt). Serve como única fonte de
 * verdade para impedir que nomes de coluna arbitrários vindos do front/API
 * cheguem a uma query — eliminando o vetor de SQL Injection por identificador.
 */
export const COMPANY_SETTING_COLUMNS = [
  "hoursCloseTicketsAuto",
  "chatBotType",
  "acceptCallWhatsapp",
  "userRandom",
  "sendGreetingMessageOneQueues",
  "sendSignMessage",
  "sendFarewellWaitingTicket",
  "userRating",
  "sendGreetingAccepted",
  "CheckMsgIsGroup",
  "sendQueuePosition",
  "scheduleType",
  "acceptAudioMessageContact",
  "sendMsgTransfTicket",
  "enableLGPD",
  "requiredTag",
  "lgpdDeleteMessage",
  "lgpdHideNumber",
  "lgpdConsent",
  "lgpdLink",
  "lgpdMessage",
  "DirectTicketsToWallets",
  "closeTicketOnTransfer",
  "transferMessage",
  "greetingAcceptedMessage",
  "AcceptCallWhatsappMessage",
  "sendQueuePositionMessage",
  "showNotificationPending",
  "notificameHub",
  "autoSaveContacts",
  "autoSaveContactsScore",
  "autoSaveContactsReason",
  "aiAutoMoveEnabled",
  "aiConfidenceThreshold",
  "kanbanAutomationCompilerEnabled",
  "kanbanAutomationShadowMode",
  "kanbanAutomationActiveMode",
  "kanbanAutomationLegacyFallbackEnabled",
  "autoAcceptTicketsEnabled",
  "autoAcceptTicketsMinutes",
  "autoAcceptTicketsAssignMode"
] as const;

export type CompanySettingColumn = (typeof COMPANY_SETTING_COLUMNS)[number];

const COMPANY_SETTING_COLUMN_SET = new Set<string>(COMPANY_SETTING_COLUMNS);

export const isAllowedCompanySettingColumn = (
  column: unknown
): column is CompanySettingColumn =>
  typeof column === "string" && COMPANY_SETTING_COLUMN_SET.has(column);

/**
 * Garante que `column` é uma coluna permitida. Lança erro 400 genérico
 * (sem expor detalhes de schema) caso contrário.
 */
export const assertCompanySettingColumn = (
  column: unknown
): CompanySettingColumn => {
  if (!isAllowedCompanySettingColumn(column)) {
    throw new AppError("Configuração inválida.", 400);
  }
  return column;
};
