
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Companies", "expiration_date", {
        type: DataTypes.DATE,
        allowNull: true,
      }),
      queryInterface.addColumn("Companies", "billing_cycle", {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "monthly",
      }),
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Companies", "expiration_date"),
      queryInterface.removeColumn("Companies", "billing_cycle"),
    ]);
  },
};
