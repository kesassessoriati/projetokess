import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableExists = await queryInterface.showAllTables().then(tables => tables.includes("FollowUpStages"));
    if (tableExists) return;

    await queryInterface.createTable("FollowUpStages", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      followUpCampaignId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "FollowUpCampaigns", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      delayMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60,
      },
      messageType: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "text",
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      buttons: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("FollowUpStages");
  },
};
