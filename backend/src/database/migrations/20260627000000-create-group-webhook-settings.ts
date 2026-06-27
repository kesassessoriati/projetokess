import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("GroupWebhookSettings", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false
      },
      secret: {
        type: DataTypes.STRING,
        allowNull: true
      },
      events: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },
      selectedGroups: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      lastStatus: {
        type: DataTypes.STRING,
        allowNull: true
      },
      lastError: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      lastSentAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("GroupWebhookSettings", ["companyId"]);
    await queryInterface.addIndex("GroupWebhookSettings", ["companyId", "enabled"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("GroupWebhookSettings");
  }
};
