import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    try {
      await queryInterface.addColumn("crm_leads", "product", {
        type: DataTypes.STRING,
        allowNull: true
      });
    } catch (error) {
      console.log("Column product already exists.");
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("crm_leads", "product");
  }
};
