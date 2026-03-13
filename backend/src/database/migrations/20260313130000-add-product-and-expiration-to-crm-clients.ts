import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await Promise.all([
      queryInterface.addColumn("crm_clients", "acquired_product", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("crm_clients", "expiration_date", {
        type: DataTypes.DATEONLY,
        allowNull: true
      })
    ]);
  },

  down: async (queryInterface: QueryInterface) => {
    await Promise.all([
      queryInterface.removeColumn("crm_clients", "acquired_product"),
      queryInterface.removeColumn("crm_clients", "expiration_date")
    ]);
  }
};
