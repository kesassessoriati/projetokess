"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable("Plans");

    if (!tableDescription.useMeetings) {
      await queryInterface.addColumn("Plans", "useMeetings", {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
    }

    if (!tableDescription.useFirecrawl) {
      await queryInterface.addColumn("Plans", "useFirecrawl", {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("Plans", "useMeetings");
    await queryInterface.removeColumn("Plans", "useFirecrawl");
  },
};
