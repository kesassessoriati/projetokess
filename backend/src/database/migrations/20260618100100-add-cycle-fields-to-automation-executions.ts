import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("AutomationExecutions", "cycleId", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("AutomationExecutions", "actionUid", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addIndex("AutomationExecutions", ["cycleId"]);
    await queryInterface.addIndex("AutomationExecutions", ["cycleId", "actionUid"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("AutomationExecutions", ["cycleId", "actionUid"]);
    await queryInterface.removeIndex("AutomationExecutions", ["cycleId"]);
    await queryInterface.removeColumn("AutomationExecutions", "actionUid");
    await queryInterface.removeColumn("AutomationExecutions", "cycleId");
  }
};
