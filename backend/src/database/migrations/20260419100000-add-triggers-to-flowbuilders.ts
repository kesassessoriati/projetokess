import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("FlowBuilders", "triggers", {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: true,
    });
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("FlowBuilders", "triggers");
  },
};
