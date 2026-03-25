import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tasks", "leadId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "CrmLeads", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tasks", "leadId");
  },
};
