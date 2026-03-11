import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("crm_leads", "client_since", {
        type: DataTypes.DATEONLY,
        allowNull: true
      })
    ]);
  },

  down: async (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("crm_leads", "client_since")
    ]);
  }
};
