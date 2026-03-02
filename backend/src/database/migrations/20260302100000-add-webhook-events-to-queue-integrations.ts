import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addColumn("QueueIntegrations", "webhookEvents", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("QueueIntegrations", "webhookEvents");
  }
};
