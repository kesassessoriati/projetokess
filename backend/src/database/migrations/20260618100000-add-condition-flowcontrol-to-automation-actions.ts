import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("AutomationActions", "actionUid", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("AutomationActions", "condition", {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("AutomationActions", "flowControl", {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addIndex("AutomationActions", ["actionUid"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("AutomationActions", ["actionUid"]);
    await queryInterface.removeColumn("AutomationActions", "flowControl");
    await queryInterface.removeColumn("AutomationActions", "condition");
    await queryInterface.removeColumn("AutomationActions", "actionUid");
  }
};
