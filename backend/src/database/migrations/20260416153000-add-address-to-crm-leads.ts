import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("crm_leads", "address", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("crm_leads", "address");
  }
};
