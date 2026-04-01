import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await (queryInterface.describeTable("Whatsapps") as any);

    if (!table["messageIntegrationId"]) {
      await queryInterface.addColumn("Whatsapps", "messageIntegrationId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "QueueIntegrations",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await (queryInterface.describeTable("Whatsapps") as any);

    if (table["messageIntegrationId"]) {
      await queryInterface.removeColumn("Whatsapps", "messageIntegrationId");
    }
  }
};
