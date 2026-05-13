import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("ai_external_n8n_chat_histories", {
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
      crm_lead_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "crm_leads", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      access_id: {
        type: DataTypes.STRING(160),
        allowNull: false
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      context: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      messages: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    }).catch(() => undefined);

    await queryInterface.addIndex("ai_external_n8n_chat_histories", ["company_id", "access_id"]).catch(() => undefined);
    await queryInterface.addIndex("ai_external_n8n_chat_histories", ["company_id", "crm_lead_id"]).catch(() => undefined);
    await queryInterface.addIndex("ai_external_n8n_chat_histories", ["company_id", "phone"]).catch(() => undefined);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ai_external_n8n_chat_histories").catch(() => undefined);
  }
};
