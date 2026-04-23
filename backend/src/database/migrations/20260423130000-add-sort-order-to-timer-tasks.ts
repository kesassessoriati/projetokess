import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("TimerTasks") as Record<string, unknown>;

    if (!tableDescription.sortOrder) {
      await queryInterface.addColumn("TimerTasks", "sortOrder", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("TimerTasks") as Record<string, unknown>;

    if (tableDescription.sortOrder) {
      await queryInterface.removeColumn("TimerTasks", "sortOrder");
    }
  }
};
