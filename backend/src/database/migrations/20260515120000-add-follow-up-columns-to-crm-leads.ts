import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    try {
      await queryInterface.addColumn("crm_leads", "follow_up", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: "false"
      });
    } catch (error) {
      console.log("Column follow_up already exists in crm_leads.");
    }

    try {
      await queryInterface.addColumn("crm_leads", "follow_up2", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: "false"
      });
    } catch (error) {
      console.log("Column follow_up2 already exists in crm_leads.");
    }
  },

  down: async (queryInterface: QueryInterface) => {
    try {
      await queryInterface.removeColumn("crm_leads", "follow_up2");
    } catch (error) {}

    try {
      await queryInterface.removeColumn("crm_leads", "follow_up");
    } catch (error) {}
  }
};
