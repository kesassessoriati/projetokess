import { DataTypes, QueryInterface } from "sequelize";

const timestamps = {
  createdAt: { type: DataTypes.DATE, allowNull: false },
  updatedAt: { type: DataTypes.DATE, allowNull: false }
};

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("MetaAdCampaigns", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      adAccountId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "MetaAdAccounts", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      crmClientId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "crm_clients", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      externalCampaignId: { type: DataTypes.STRING(64), allowNull: false },
      name: { type: DataTypes.STRING(255), allowNull: false },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "active" },
      ...timestamps
    });
    await queryInterface.createTable("MetaCampaignDailyMetrics", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      adAccountId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "MetaAdAccounts", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      campaignId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "MetaAdCampaigns", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      statDate: { type: DataTypes.DATEONLY, allowNull: false },
      spend: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      ctr: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      cpc: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      cpm: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      resultValue: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      impressions: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      reach: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      clicks: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      resultActionType: { type: DataTypes.STRING(128), allowNull: true },
      currency: { type: DataTypes.STRING(8), allowNull: false },
      timezone: { type: DataTypes.STRING(64), allowNull: false },
      attributionWindow: { type: DataTypes.STRING(128), allowNull: false },
      apiVersion: { type: DataTypes.STRING(32), allowNull: false },
      collectedAt: { type: DataTypes.DATE, allowNull: false },
      ...timestamps
    });
    await queryInterface.createTable("MetaSyncRuns", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      adAccountId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "MetaAdAccounts", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      periodStart: { type: DataTypes.DATEONLY, allowNull: false },
      periodEnd: { type: DataTypes.DATEONLY, allowNull: false },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "running" },
      attempt: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      errorCode: { type: DataTypes.STRING(96), allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: false },
      finishedAt: { type: DataTypes.DATE, allowNull: true },
      ...timestamps
    });
    await queryInterface.addIndex("MetaAdCampaigns", ["adAccountId", "externalCampaignId"], { name: "meta_ad_campaigns_account_external_unique", unique: true });
    await queryInterface.addIndex("MetaCampaignDailyMetrics", ["adAccountId", "campaignId", "statDate"], { name: "meta_campaign_daily_metrics_unique", unique: true });
    await queryInterface.addIndex("MetaSyncRuns", ["adAccountId", "periodStart", "periodEnd", "createdAt"], { name: "meta_sync_runs_account_period" });
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION "enforceMetaMarketingMetricsTenant"() RETURNS TRIGGER AS $$
      BEGIN
        IF TG_TABLE_NAME = 'MetaAdCampaigns' AND (NOT EXISTS (SELECT 1 FROM "MetaAdAccounts" WHERE id = NEW."adAccountId" AND "companyId" = NEW."companyId") OR (NEW."crmClientId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM crm_clients WHERE id = NEW."crmClientId" AND company_id = NEW."companyId"))) THEN RAISE EXCEPTION 'Meta campaign tenant mismatch'; END IF;
        IF TG_TABLE_NAME = 'MetaCampaignDailyMetrics' AND (NOT EXISTS (SELECT 1 FROM "MetaAdAccounts" WHERE id = NEW."adAccountId" AND "companyId" = NEW."companyId") OR NOT EXISTS (SELECT 1 FROM "MetaAdCampaigns" WHERE id = NEW."campaignId" AND "adAccountId" = NEW."adAccountId" AND "companyId" = NEW."companyId")) THEN RAISE EXCEPTION 'Meta metric tenant mismatch'; END IF;
        IF TG_TABLE_NAME = 'MetaSyncRuns' AND NOT EXISTS (SELECT 1 FROM "MetaAdAccounts" WHERE id = NEW."adAccountId" AND "companyId" = NEW."companyId") THEN RAISE EXCEPTION 'Meta sync tenant mismatch'; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER "metaAdCampaignsTenantTrigger" BEFORE INSERT OR UPDATE ON "MetaAdCampaigns" FOR EACH ROW EXECUTE FUNCTION "enforceMetaMarketingMetricsTenant"();
      CREATE TRIGGER "metaCampaignDailyMetricsTenantTrigger" BEFORE INSERT OR UPDATE ON "MetaCampaignDailyMetrics" FOR EACH ROW EXECUTE FUNCTION "enforceMetaMarketingMetricsTenant"();
      CREATE TRIGGER "metaSyncRunsTenantTrigger" BEFORE INSERT OR UPDATE ON "MetaSyncRuns" FOR EACH ROW EXECUTE FUNCTION "enforceMetaMarketingMetricsTenant"();
    `);
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    if (process.env.NODE_ENV === "production") throw new Error("Meta Marketing migrations are additive; disable flags instead of undoing production data.");
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS "metaSyncRunsTenantTrigger" ON "MetaSyncRuns"; DROP TRIGGER IF EXISTS "metaCampaignDailyMetricsTenantTrigger" ON "MetaCampaignDailyMetrics"; DROP TRIGGER IF EXISTS "metaAdCampaignsTenantTrigger" ON "MetaAdCampaigns"; DROP FUNCTION IF EXISTS "enforceMetaMarketingMetricsTenant"();');
    await queryInterface.dropTable("MetaSyncRuns");
    await queryInterface.dropTable("MetaCampaignDailyMetrics");
    await queryInterface.dropTable("MetaAdCampaigns");
  }
};
