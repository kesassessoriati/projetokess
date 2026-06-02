import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn("Prompts", "temperature", {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 1
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn("Prompts", "temperature", {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    });
  }
};
