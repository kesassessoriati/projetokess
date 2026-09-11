import axios from "axios";
import { Op } from "sequelize";
import sequelize from "../../database";
import AppError from "../../errors/AppError";
import { decryptMetaMarketingSecret, encryptMetaMarketingSecret } from "../../helpers/metaMarketingCrypto";
import MetaAdAccount from "../../models/MetaAdAccount";
import MetaMarketingConnection from "../../models/MetaMarketingConnection";
import {
  assertCanManageMetaMarketingConnection,
  createMetaMarketingAuditLog,
  hasMetaMarketingReadScope
} from "./MetaMarketingOAuthService";
import { classifyMetaMarketingGraphError } from "./MetaMarketingGraphClient";
import { assertMetaMarketingSyncQueueConfigured, enqueueMetaMarketingInitialBackfill } from "./MetaMarketingSyncQueue";

type GraphAdAccount = {
  id?: string;
  name?: string;
  currency?: string;
  timezone_name?: string;
  permitted_tasks?: string[];
  account_status?: number;
};

type GraphAdAccountsResponse = {
  data?: GraphAdAccount[];
  paging?: { cursors?: { after?: string } };
};

type AccountCandidate = {
  externalAccountId: string;
  name: string;
  currency: string;
  timezone: string;
  permissions: string[];
  status: string;
  selected?: boolean;
};

const getConnection = async (companyId: number, connectionId: number): Promise<MetaMarketingConnection> => {
  const connection = await MetaMarketingConnection.findOne({
    where: { id: connectionId, companyId }
  });
  if (!connection) {
    throw new AppError("META_MARKETING_CONNECTION_NOT_FOUND", 404);
  }
  return connection;
};

const listGraphAccounts = async (connection: MetaMarketingConnection): Promise<AccountCandidate[]> => {
  if (connection.status !== "connected") {
    throw new AppError("META_MARKETING_REAUTHORIZATION_REQUIRED", 409);
  }
  if (!hasMetaMarketingReadScope(connection.scopes)) {
    throw new AppError("META_MARKETING_REAUTHORIZATION_REQUIRED", 409);
  }

  const graphVersion = process.env.META_MARKETING_GRAPH_VERSION;
  if (!graphVersion) throw new AppError("META_MARKETING_GRAPH_VERSION_INVALID", 503);
  let accessToken: string;
  try {
    accessToken = decryptMetaMarketingSecret(connection.accessTokenCiphertext);
  } catch (_) {
    throw new AppError("META_MARKETING_REAUTHORIZATION_REQUIRED", 409);
  }

  const url = `https://graph.facebook.com/${graphVersion}/me/adaccounts`;
  let after: string | undefined;
  let page = 0;
  const accounts: AccountCandidate[] = [];

  try {
    do {
      if (++page > 100) throw new Error("pagination limit");
      const response = await axios.get<GraphAdAccountsResponse>(url, {
        timeout: 15000,
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { fields: "id,name,currency,timezone_name,permitted_tasks,account_status", limit: "500", ...(after ? { after } : {}) }
      });
      (response.data.data || []).forEach(account => {
        if (!account.id || !account.name || !account.currency || !account.timezone_name) {
          return;
        }
        accounts.push({
          externalAccountId: String(account.id),
          name: account.name,
          currency: account.currency,
          timezone: account.timezone_name,
          permissions: Array.isArray(account.permitted_tasks) ? account.permitted_tasks : [],
          status: account.account_status === 1 ? "active" : "inactive"
        });
      });
      after = response.data.paging?.cursors?.after;
    } while (after);
  } catch (error) {
    const classified = classifyMetaMarketingGraphError(error);
    if (classified.kind === "reauthorization_required") {
      await connection.update({ status: "reauthorization_required" });
    }
    throw classified;
  }

  return accounts;
};

export const listMetaMarketingConnections = async (input: {
  companyId: number;
  userId: number;
}): Promise<Array<Record<string, unknown>>> => {
  await assertCanManageMetaMarketingConnection(input.companyId, input.userId);
  const connections = await MetaMarketingConnection.findAll({
    where: { companyId: input.companyId },
    attributes: ["id", "tokenExpiresAt", "status", "scopes", "createdAt", "updatedAt"],
    order: [["createdAt", "DESC"]]
  });
  const accounts = await MetaAdAccount.findAll({
    where: { companyId: input.companyId, status: "active" },
    attributes: ["connectionId", "externalAccountId", "name", "currency", "timezone", "status"]
  });
  const accountsByConnection = accounts.reduce<Record<number, Record<string, unknown>[]>>((result, account) => {
    const connectionId = account.connectionId;
    result[connectionId] = result[connectionId] || [];
    result[connectionId].push(account.toJSON());
    return result;
  }, {});

  return connections.map(connection => {
    const selectedAccounts = accountsByConnection[connection.id] || [];
    return { ...connection.toJSON(), selectedAccountCount: selectedAccounts.length, selectedAccounts };
  });
};

export const listMetaMarketingAvailableAccounts = async (input: {
  companyId: number;
  userId: number;
  connectionId: number;
}): Promise<AccountCandidate[]> => {
  await assertCanManageMetaMarketingConnection(input.companyId, input.userId);
  const connection = await getConnection(input.companyId, input.connectionId);
  const [available, selectedAccounts] = await Promise.all([
    listGraphAccounts(connection),
    MetaAdAccount.findAll({ where: { companyId: input.companyId, connectionId: input.connectionId, status: "active" }, attributes: ["externalAccountId"] })
  ]);
  const selectedIds = new Set(selectedAccounts.map(account => account.externalAccountId));
  return available.map(account => ({ ...account, selected: selectedIds.has(account.externalAccountId) }));
};

export const confirmMetaMarketingAccounts = async (input: {
  companyId: number;
  userId: number;
  connectionId: number;
  accountIds: unknown;
}): Promise<MetaAdAccount[]> => {
  await assertCanManageMetaMarketingConnection(input.companyId, input.userId);
  if (!Array.isArray(input.accountIds) || !input.accountIds.length || input.accountIds.some(id => typeof id !== "string")) {
    throw new AppError("META_MARKETING_ACCOUNT_SELECTION_INVALID", 400);
  }
  const accountIds = Array.from(new Set(input.accountIds));
  const connection = await getConnection(input.companyId, input.connectionId);
  const available = await listGraphAccounts(connection);
  assertMetaMarketingSyncQueueConfigured();
  const selected = available.filter(account => accountIds.includes(account.externalAccountId));
  if (selected.length !== accountIds.length) {
    throw new AppError("META_MARKETING_ACCOUNT_SELECTION_INVALID", 400);
  }

  const saved: MetaAdAccount[] = [];
  await sequelize.transaction(async transaction => {
    await MetaAdAccount.update(
      { status: "inactive" },
      { where: { companyId: input.companyId, connectionId: connection.id, externalAccountId: { [Op.notIn]: accountIds }, status: "active" }, transaction }
    );
    for (const account of selected) {
      const existing = await MetaAdAccount.findOne({
        where: { companyId: input.companyId, externalAccountId: account.externalAccountId },
        transaction
      });
      const values = { connectionId: connection.id, ...account };
      if (existing) {
        await existing.update(values, { transaction });
        saved.push(existing);
      } else {
        saved.push(await MetaAdAccount.create({ companyId: input.companyId, ...values }, { transaction }));
      }
    }
  });

  await createMetaMarketingAuditLog({
    companyId: input.companyId,
    actorUserId: input.userId,
    action: "meta_ad_accounts_confirmed",
    targetType: "meta_marketing_connection",
    targetRef: String(connection.id),
    metaStatus: "connected"
  });
  await Promise.all(saved.map(account => enqueueMetaMarketingInitialBackfill(input.companyId, account.id)));
  return saved;
};

export const disconnectMetaMarketingConnection = async (input: {
  companyId: number;
  userId: number;
  connectionId: number;
}): Promise<void> => {
  await assertCanManageMetaMarketingConnection(input.companyId, input.userId);
  const connection = await getConnection(input.companyId, input.connectionId);
  if (connection.status === "revoked") {
    return;
  }

  await connection.update({ status: "revoked", accessTokenCiphertext: encryptMetaMarketingSecret("") });
  await MetaAdAccount.update({ status: "inactive" }, { where: { companyId: input.companyId, connectionId: connection.id, status: "active" } });
  await createMetaMarketingAuditLog({
    companyId: input.companyId,
    actorUserId: input.userId,
    action: "meta_connection_disconnected",
    targetType: "meta_marketing_connection",
    targetRef: String(connection.id),
    metaStatus: "revoked"
  });
};
