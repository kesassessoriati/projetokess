import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Campaigns", "randomizedDispatch", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn("Campaigns", "dispatchMinDelaySeconds", {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("Campaigns", "dispatchMaxDelaySeconds", {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Campaigns", "dispatchMaxDelaySeconds");
    await queryInterface.removeColumn("Campaigns", "dispatchMinDelaySeconds");
    await queryInterface.removeColumn("Campaigns", "randomizedDispatch");
  }
};
