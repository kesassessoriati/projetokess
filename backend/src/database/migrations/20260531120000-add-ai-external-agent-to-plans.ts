import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const plansDesc = await queryInterface.describeTable("Plans") as any;
    if (!plansDesc.aiExternalAgentEnabled) {
      await queryInterface.addColumn("Plans", "aiExternalAgentEnabled", {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Plans", "aiExternalAgentEnabled").catch(() => {});
  },
};
