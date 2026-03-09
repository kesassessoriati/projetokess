import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("GroupCampaigns", {
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
      templateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "GroupTemplates", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      name: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING(20), defaultValue: "DRAFT" },
      messageType: { type: DataTypes.STRING(30), defaultValue: "text" },
      mentionsMode: { type: DataTypes.STRING(20), defaultValue: "none" },
      message: { type: DataTypes.TEXT, allowNull: true },
      buttons: { type: DataTypes.JSONB, allowNull: true },
      listItems: { type: DataTypes.JSONB, allowNull: true },
      segmentedMentions: { type: DataTypes.JSONB, allowNull: true },
      filters: { type: DataTypes.JSONB, allowNull: true },
      groupIds: { type: DataTypes.JSONB, allowNull: true },
      mediaPath: { type: DataTypes.STRING, allowNull: true },
      mediaName: { type: DataTypes.STRING, allowNull: true },
      scheduledAt: { type: DataTypes.DATE, allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      recurrenceRule: { type: DataTypes.STRING(30), defaultValue: "none" },
      windowStart: { type: DataTypes.STRING(5), allowNull: true },
      windowEnd: { type: DataTypes.STRING(5), allowNull: true },
      intervalSeconds: { type: DataTypes.INTEGER, defaultValue: 0 },
      totalGroups: { type: DataTypes.INTEGER, defaultValue: 0 },
      processedGroups: { type: DataTypes.INTEGER, defaultValue: 0 },
      successCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      failedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      failureReason: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("GroupCampaigns", ["companyId", "status"]);
    await queryInterface.addIndex("GroupCampaigns", ["scheduledAt"]);

    await queryInterface.createTable("GroupCampaignTargets", {
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
        references: { model: "GroupCampaigns", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "GroupDirectories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      groupJid: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING(20), defaultValue: "PENDING" },
      scheduledAt: { type: DataTypes.DATE, allowNull: true },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      lastAttemptAt: { type: DataTypes.DATE, allowNull: true },
      attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("GroupCampaignTargets", ["campaignId", "status"]);
    await queryInterface.addIndex("GroupCampaignTargets", ["companyId", "groupJid"]);

    await queryInterface.createTable("GroupCampaignLogs", {
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
        references: { model: "GroupCampaigns", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      type: { type: DataTypes.STRING(30), allowNull: false },
      groupJid: { type: DataTypes.STRING, allowNull: true },
      message: { type: DataTypes.TEXT, allowNull: true },
      payload: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("GroupCampaignLogs", ["campaignId", "createdAt"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("GroupCampaignLogs");
    await queryInterface.dropTable("GroupCampaignTargets");
    await queryInterface.dropTable("GroupCampaigns");
  }
};
