import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("MetaCampaignCreationRequests", {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
      companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      adAccountId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "MetaAdAccounts", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
      requestedByUserId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Users", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
      templateVersion: { type: DataTypes.STRING(32), allowNull: false },
      idempotencyKey: { type: DataTypes.UUID, allowNull: false },
      payloadHash: { type: DataTypes.STRING(128), allowNull: false },
      payload: { type: DataTypes.JSONB, allowNull: false },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "requested" },
      idempotencyMarker: { type: DataTypes.STRING(64), allowNull: false },
      externalCampaignId: { type: DataTypes.STRING(64), allowNull: true },
      externalAdSetId: { type: DataTypes.STRING(64), allowNull: true },
      externalAdId: { type: DataTypes.STRING(64), allowNull: true },
      errorCode: { type: DataTypes.STRING(96), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("MetaCampaignCreationRequests", ["companyId", "idempotencyKey"], {
      name: "meta_campaign_creation_request_company_key_unique", unique: true
    });
    await queryInterface.addIndex("MetaCampaignCreationRequests", ["companyId", "adAccountId", "status"], {
      name: "meta_campaign_creation_request_company_account_status"
    });
    await queryInterface.addIndex("MetaCampaignCreationRequests", ["companyId", "idempotencyMarker"], {
      name: "meta_campaign_creation_request_company_marker_unique", unique: true
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE "MetaCampaignCreationRequests"
      ADD CONSTRAINT "meta_campaign_creation_request_status_check"
      CHECK ("status" IN ('requested', 'validating', 'creating_campaign', 'creating_adset', 'creating_ad', 'completed', 'unknown', 'failed'));
      CREATE OR REPLACE FUNCTION "enforceMetaCampaignCreationRequestTenant"()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM "MetaAdAccounts" WHERE id = NEW."adAccountId" AND "companyId" = NEW."companyId") THEN
          RAISE EXCEPTION 'Meta campaign creation request account must belong to the same company';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM "Users" WHERE id = NEW."requestedByUserId" AND "companyId" = NEW."companyId") THEN
          RAISE EXCEPTION 'Meta campaign creation request user must belong to the same company';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER "metaCampaignCreationRequestsTenantTrigger"
      BEFORE INSERT OR UPDATE OF "companyId", "adAccountId", "requestedByUserId"
      ON "MetaCampaignCreationRequests"
      FOR EACH ROW EXECUTE FUNCTION "enforceMetaCampaignCreationRequestTenant"();
    `);
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Meta Marketing migrations are additive; disable flags instead of undoing production data.");
    }
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS "metaCampaignCreationRequestsTenantTrigger" ON "MetaCampaignCreationRequests"; DROP FUNCTION IF EXISTS "enforceMetaCampaignCreationRequestTenant"();');
    await queryInterface.dropTable("MetaCampaignCreationRequests");
  }
};
