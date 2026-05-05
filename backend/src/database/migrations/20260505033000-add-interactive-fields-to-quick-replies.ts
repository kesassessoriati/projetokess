import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("quick_replies", "interactiveType", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("quick_replies", "interactiveConfig", {
      type: DataTypes.JSON,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("quick_replies", "interactiveConfig");
    await queryInterface.removeColumn("quick_replies", "interactiveType");
  }
};
