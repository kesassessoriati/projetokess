import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("Plans");

    if (!tableDescription.useMeetings) {
      await queryInterface.addColumn("Plans", "useMeetings", {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
    }

    if (!tableDescription.useFirecrawl) {
      await queryInterface.addColumn("Plans", "useFirecrawl", {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Plans", "useMeetings");
    await queryInterface.removeColumn("Plans", "useFirecrawl");
  }
};
