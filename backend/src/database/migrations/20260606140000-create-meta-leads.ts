import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("meta_leads", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "company_id",
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      integrationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "integration_id",
        references: { model: "meta_lead_integrations", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "contact_id",
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      crmLeadId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "crm_lead_id",
        references: { model: "crm_leads", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      leadgenId: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: "leadgen_id"
      },
      formId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: "form_id"
      },
      pageId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: "page_id"
      },
      adId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: "ad_id"
      },
      campaignId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: "campaign_id"
      },
      adsetId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: "adset_id"
      },
      leadName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "lead_name"
      },
      leadPhone: {
        type: DataTypes.STRING(32),
        allowNull: true,
        field: "lead_phone"
      },
      leadEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "lead_email"
      },
      rawPayload: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "raw_payload"
      },
      normalizedPayload: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "normalized_payload"
      },
      status: {
        type: DataTypes.ENUM("received", "processing", "processed", "duplicate", "error"),
        allowNull: false,
        defaultValue: "received"
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "error_message"
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at"
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "updated_at"
      }
    });

    await queryInterface.addIndex("meta_leads", ["company_id", "leadgen_id"], {
      name: "meta_leads_company_leadgen_unique",
      unique: true
    });

    await queryInterface.addIndex("meta_leads", ["company_id", "status"], {
      name: "meta_leads_company_status_idx"
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("meta_leads");
  }
};
