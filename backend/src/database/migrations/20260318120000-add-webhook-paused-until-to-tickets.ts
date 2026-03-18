import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await (queryInterface.describeTable("Tickets") as any);
    if (!table["webhookPausedUntil"]) {
      await queryInterface.addColumn("Tickets", "webhookPausedUntil", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await (queryInterface.describeTable("Tickets") as any);
    if (table["webhookPausedUntil"]) {
      await queryInterface.removeColumn("Tickets", "webhookPausedUntil");
    }
  }
};
