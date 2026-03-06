import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableExists = await queryInterface.showAllTables().then(tables => tables.includes("FollowUpLogs"));
    if (tableExists) return;

    await queryInterface.createTable("FollowUpLogs", {
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
      stageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "FollowUpStages", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      contactNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      respondedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // status: pending | sent | responded | failed | skipped
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "pending",
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
    await queryInterface.dropTable("FollowUpLogs");
  },
};
