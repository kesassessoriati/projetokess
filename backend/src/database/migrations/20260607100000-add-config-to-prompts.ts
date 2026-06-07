import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("Prompts") as Record<string, unknown>;

    if (!tableDescription["config"]) {
      await queryInterface.addColumn("Prompts", "config", {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("Prompts") as Record<string, unknown>;
    if (tableDescription["config"]) {
      await queryInterface.removeColumn("Prompts", "config");
    }
  }
};
