import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await (queryInterface.describeTable("Tickets") as any);
    if (!table["webhookDisabled"]) {
      await queryInterface.addColumn("Tickets", "webhookDisabled", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await (queryInterface.describeTable("Tickets") as any);
    if (table["webhookDisabled"]) {
      await queryInterface.removeColumn("Tickets", "webhookDisabled");
    }
  }
};
