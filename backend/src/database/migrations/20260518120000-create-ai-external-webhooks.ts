import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("ai_external_webhooks", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      config_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "ai_external_agent_configs", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      event_type: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("ai_external_webhooks", ["company_id"]);
    await queryInterface.addIndex("ai_external_webhooks", ["company_id", "event_type"]);
    await queryInterface.addIndex("ai_external_webhooks", ["config_id"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ai_external_webhooks");
  }
};
