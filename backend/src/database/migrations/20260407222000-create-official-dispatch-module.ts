import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("OfficialTemplates", {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      externalTemplateId: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      language: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      category: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      qualityScore: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      components: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },
      raw: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      lastSyncedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await queryInterface.addIndex("OfficialTemplates", ["companyId", "whatsappId", "externalTemplateId"], {
      unique: true,
      name: "official_templates_company_whatsapp_external_unique"
    });

    await queryInterface.createTable("OfficialCampaigns", {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      contactListId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "ContactLists", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      officialTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "OfficialTemplates", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "DRAFT"
      },
      templateName: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      templateLanguage: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      templateCategory: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      templateComponents: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },
      variableMapping: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      advancedComponents: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      previewNumber: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      intervalSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 4
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      totalTargets: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      processedTargets: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      successCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      failedCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      failureReason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await queryInterface.addIndex("OfficialCampaigns", ["companyId", "whatsappId", "status"], {
      name: "official_campaigns_company_whatsapp_status_idx"
    });

    await queryInterface.createTable("OfficialCampaignShippings", {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      campaignId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "OfficialCampaigns", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "ContactListItems", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      number: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      contactName: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "PENDING"
      },
      messageId: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      response: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      failedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await queryInterface.addIndex("OfficialCampaignShippings", ["campaignId", "status"], {
      name: "official_campaign_shippings_campaign_status_idx"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("OfficialCampaignShippings");
    await queryInterface.dropTable("OfficialCampaigns");
    await queryInterface.dropTable("OfficialTemplates");
  }
};
