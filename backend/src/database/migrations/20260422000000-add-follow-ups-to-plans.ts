import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("Plans") as Record<string, any>;

    if (!tableDescription.useFollowUps) {
      await queryInterface.addColumn("Plans", "useFollowUps", {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Plans", "useFollowUps");
  }
};
