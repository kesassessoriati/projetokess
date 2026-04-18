import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("TimerTasks", "visibility", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "team",
    });
  },

  down: async (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("TimerTasks", "visibility");
  },
};
