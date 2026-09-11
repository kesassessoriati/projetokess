import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("MetaMarketingConnections", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      authorizedByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      metaUserIdHash: { type: DataTypes.STRING(128), allowNull: false },
      accessTokenCiphertext: { type: DataTypes.TEXT, allowNull: false },
      keyVersion: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "v1" },
      tokenExpiresAt: { type: DataTypes.DATE, allowNull: true },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "connected" },
      scopes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.createTable("MetaOAuthStates", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      generatedByUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      stateHash: { type: DataTypes.STRING(128), allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      consumedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.createTable("MetaAdAccounts", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      connectionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "MetaMarketingConnections", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      crmClientId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "crm_clients", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      externalAccountId: { type: DataTypes.STRING(64), allowNull: false },
      name: { type: DataTypes.STRING(255), allowNull: false },
      currency: { type: DataTypes.STRING(8), allowNull: false },
      timezone: { type: DataTypes.STRING(64), allowNull: false },
      permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "active" },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.createTable("MetaMarketingUserPermissions", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      canManageConnection: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      canCreateCampaign: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.createTable("MetaMarketingAuditLogs", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      actorUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      action: { type: DataTypes.STRING(96), allowNull: false },
      targetType: { type: DataTypes.STRING(96), allowNull: false },
      targetRef: { type: DataTypes.STRING(255), allowNull: false },
      payloadHash: { type: DataTypes.STRING(128), allowNull: false },
      metaRequestId: { type: DataTypes.STRING(255), allowNull: true },
      metaStatus: { type: DataTypes.STRING(32), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.createTable("MetaMarketingDataDeletionRequests", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      metaUserIdHash: { type: DataTypes.STRING(128), allowNull: false },
      confirmationCodeHash: { type: DataTypes.STRING(128), allowNull: false },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "completed" },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("MetaMarketingConnections", ["companyId", "status"], {
      name: "meta_marketing_connections_company_status"
    });
    await queryInterface.addIndex("MetaMarketingConnections", ["companyId", "metaUserIdHash"], {
      name: "meta_marketing_connections_company_meta_user_unique",
      unique: true
    });
    await queryInterface.addIndex("MetaOAuthStates", ["stateHash"], {
      name: "meta_oauth_states_state_hash_unique",
      unique: true
    });
    await queryInterface.addIndex("MetaOAuthStates", ["companyId", "expiresAt"], {
      name: "meta_oauth_states_company_expiry"
    });
    await queryInterface.addIndex("MetaAdAccounts", ["companyId", "externalAccountId"], {
      name: "meta_ad_accounts_company_external_unique",
      unique: true
    });
    await queryInterface.addIndex("MetaMarketingUserPermissions", ["companyId", "userId"], {
      name: "meta_marketing_permissions_company_user_unique",
      unique: true
    });
    await queryInterface.addIndex("MetaMarketingAuditLogs", ["companyId", "createdAt"], {
      name: "meta_marketing_audit_company_created"
    });
    await queryInterface.addIndex("MetaMarketingDataDeletionRequests", ["confirmationCodeHash"], {
      name: "meta_marketing_data_deletion_confirmation_unique",
      unique: true
    });

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION "enforceMetaAdAccountTenant"()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM "MetaMarketingConnections"
          WHERE id = NEW."connectionId" AND "companyId" = NEW."companyId"
        ) THEN
          RAISE EXCEPTION 'Meta ad account connection must belong to the same company';
        END IF;

        IF NEW."crmClientId" IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM crm_clients
          WHERE id = NEW."crmClientId" AND company_id = NEW."companyId"
        ) THEN
          RAISE EXCEPTION 'Meta ad account CRM client must belong to the same company';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER "metaAdAccountsTenantTrigger"
      BEFORE INSERT OR UPDATE OF "companyId", "connectionId", "crmClientId"
      ON "MetaAdAccounts"
      FOR EACH ROW EXECUTE FUNCTION "enforceMetaAdAccountTenant"();

      CREATE OR REPLACE FUNCTION "enforceMetaMarketingUserTenant"()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_TABLE_NAME = 'MetaMarketingConnections' AND NEW."authorizedByUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Users" WHERE id = NEW."authorizedByUserId" AND "companyId" = NEW."companyId") THEN RAISE EXCEPTION 'Meta connection user must belong to the same company'; END IF;
        IF TG_TABLE_NAME = 'MetaOAuthStates' AND NOT EXISTS (SELECT 1 FROM "Users" WHERE id = NEW."generatedByUserId" AND "companyId" = NEW."companyId") THEN RAISE EXCEPTION 'Meta OAuth state user must belong to the same company'; END IF;
        IF TG_TABLE_NAME = 'MetaMarketingUserPermissions' AND NOT EXISTS (SELECT 1 FROM "Users" WHERE id = NEW."userId" AND "companyId" = NEW."companyId") THEN RAISE EXCEPTION 'Meta Marketing permission user must belong to the same company'; END IF;
        IF TG_TABLE_NAME = 'MetaMarketingAuditLogs' AND NEW."actorUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Users" WHERE id = NEW."actorUserId" AND "companyId" = NEW."companyId") THEN RAISE EXCEPTION 'Meta Marketing audit user must belong to the same company'; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER "metaMarketingConnectionsUserTenantTrigger" BEFORE INSERT OR UPDATE OF "companyId", "authorizedByUserId" ON "MetaMarketingConnections" FOR EACH ROW EXECUTE FUNCTION "enforceMetaMarketingUserTenant"();
      CREATE TRIGGER "metaOAuthStatesUserTenantTrigger" BEFORE INSERT OR UPDATE OF "companyId", "generatedByUserId" ON "MetaOAuthStates" FOR EACH ROW EXECUTE FUNCTION "enforceMetaMarketingUserTenant"();
      CREATE TRIGGER "metaMarketingPermissionsUserTenantTrigger" BEFORE INSERT OR UPDATE OF "companyId", "userId" ON "MetaMarketingUserPermissions" FOR EACH ROW EXECUTE FUNCTION "enforceMetaMarketingUserTenant"();
      CREATE TRIGGER "metaMarketingAuditLogsUserTenantTrigger" BEFORE INSERT OR UPDATE OF "companyId", "actorUserId" ON "MetaMarketingAuditLogs" FOR EACH ROW EXECUTE FUNCTION "enforceMetaMarketingUserTenant"();
    `);

    await queryInterface.addColumn("CompaniesSettings", "metaMarketingReadEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn("CompaniesSettings", "metaMarketingWriteEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Meta Marketing migrations are additive; disable flags instead of undoing production data.");
    }

    await queryInterface.removeColumn("CompaniesSettings", "metaMarketingWriteEnabled");
    await queryInterface.removeColumn("CompaniesSettings", "metaMarketingReadEnabled");
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS "metaMarketingAuditLogsUserTenantTrigger" ON "MetaMarketingAuditLogs"; DROP TRIGGER IF EXISTS "metaMarketingPermissionsUserTenantTrigger" ON "MetaMarketingUserPermissions"; DROP TRIGGER IF EXISTS "metaOAuthStatesUserTenantTrigger" ON "MetaOAuthStates"; DROP TRIGGER IF EXISTS "metaMarketingConnectionsUserTenantTrigger" ON "MetaMarketingConnections"; DROP FUNCTION IF EXISTS "enforceMetaMarketingUserTenant"(); DROP TRIGGER IF EXISTS "metaAdAccountsTenantTrigger" ON "MetaAdAccounts";');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "enforceMetaAdAccountTenant"();');
    await queryInterface.dropTable("MetaMarketingAuditLogs");
    await queryInterface.dropTable("MetaMarketingDataDeletionRequests");
    await queryInterface.dropTable("MetaMarketingUserPermissions");
    await queryInterface.dropTable("MetaAdAccounts");
    await queryInterface.dropTable("MetaOAuthStates");
    await queryInterface.dropTable("MetaMarketingConnections");
  }
};
