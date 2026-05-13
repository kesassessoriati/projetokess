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
      session_id: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      message: {
        type: DataTypes.JSONB,
        allowNull: true
      }
    }).catch(() => undefined);

    await queryInterface.addIndex("ai_external_n8n_chat_histories", ["session_id"]).catch(() => undefined);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ai_external_n8n_chat_histories").catch(() => undefined);
  }
};
