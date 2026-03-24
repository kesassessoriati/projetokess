import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addColumn("crm_leads", "payment_type", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn("crm_leads", "purchase_type", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("crm_leads", "payment_type");
    await queryInterface.removeColumn("crm_leads", "purchase_type");
  }
};
