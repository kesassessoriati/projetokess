import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable("crm_clients") as Record<string, unknown>;

    if (!table.gmn) {
      await queryInterface.addColumn("crm_clients", "gmn", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable("crm_clients") as Record<string, unknown>;

    if (table.gmn) {
      await queryInterface.removeColumn("crm_clients", "gmn");
    }
  }
};
