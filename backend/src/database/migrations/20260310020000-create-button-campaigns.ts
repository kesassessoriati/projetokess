import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("ButtonCampaigns", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      name: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING(20), defaultValue: "DRAFT" },
      messageType: { type: DataTypes.STRING(20), defaultValue: "buttons" },
      message: { type: DataTypes.TEXT, allowNull: true },
      footer: { type: DataTypes.STRING, allowNull: true },
      buttons: { type: DataTypes.JSONB, allowNull: true },
      listSections: { type: DataTypes.JSONB, allowNull: true },
      listButtonText: { type: DataTypes.STRING, allowNull: true },
      targetNumbers: { type: DataTypes.JSONB, allowNull: true },
      intervalSeconds: { type: DataTypes.INTEGER, defaultValue: 3 },
      totalTargets: { type: DataTypes.INTEGER, defaultValue: 0 },
      processedTargets: { type: DataTypes.INTEGER, defaultValue: 0 },
      successCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      failedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      failureReason: { type: DataTypes.TEXT, allowNull: true },
      scheduledAt: { type: DataTypes.DATE, allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("ButtonCampaigns", ["companyId", "status"]);
    await queryInterface.addIndex("ButtonCampaigns", ["scheduledAt"]);

    await queryInterface.createTable("ButtonCampaignShippings", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
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
        references: { model: "ButtonCampaigns", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      number: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING(20), defaultValue: "PENDING" },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("ButtonCampaignShippings", ["campaignId", "status"]);
    await queryInterface.addIndex("ButtonCampaignShippings", ["companyId", "number"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ButtonCampaignShippings");
    await queryInterface.dropTable("ButtonCampaigns");
  }
};
