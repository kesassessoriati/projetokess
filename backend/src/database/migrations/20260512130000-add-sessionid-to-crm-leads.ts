import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    try {
      await queryInterface.addColumn("crm_leads", "sessionid", {
        type: DataTypes.STRING(255),
        allowNull: true
      });
    } catch (error) {
      console.log("Column sessionid already exists in crm_leads.");
    }
  },

  down: async (queryInterface: QueryInterface) => {
    try {
      await queryInterface.removeColumn("crm_leads", "sessionid");
    } catch (error) {}
  }
};
