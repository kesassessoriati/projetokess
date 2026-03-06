import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableExists = await queryInterface.showAllTables().then(tables => tables.includes("FollowUpCampaigns"));
    if (tableExists) return;

    await queryInterface.createTable("FollowUpCampaigns", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      // sourceType: which kind of originating event triggers this follow-up
      // 'campaign' = sent via Campaign dispatcher; 'manual' = any outgoing message
      sourceType: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "manual",
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
    await queryInterface.dropTable("FollowUpCampaigns");
  },
};
