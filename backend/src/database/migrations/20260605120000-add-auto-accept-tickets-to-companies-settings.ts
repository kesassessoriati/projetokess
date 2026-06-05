import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDesc = await queryInterface.describeTable("CompaniesSettings") as Record<string, any>;

    if (!tableDesc.autoAcceptTicketsEnabled) {
      await queryInterface.addColumn("CompaniesSettings", "autoAcceptTicketsEnabled", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "false",
      });
    }

    if (!tableDesc.autoAcceptTicketsMinutes) {
      await queryInterface.addColumn("CompaniesSettings", "autoAcceptTicketsMinutes", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "0",
      });
    }

    if (!tableDesc.autoAcceptTicketsAssignMode) {
      await queryInterface.addColumn("CompaniesSettings", "autoAcceptTicketsAssignMode", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "keep",
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDesc = await queryInterface.describeTable("CompaniesSettings") as Record<string, any>;

    if (tableDesc.autoAcceptTicketsEnabled) {
      await queryInterface.removeColumn("CompaniesSettings", "autoAcceptTicketsEnabled");
    }
    if (tableDesc.autoAcceptTicketsMinutes) {
      await queryInterface.removeColumn("CompaniesSettings", "autoAcceptTicketsMinutes");
    }
    if (tableDesc.autoAcceptTicketsAssignMode) {
      await queryInterface.removeColumn("CompaniesSettings", "autoAcceptTicketsAssignMode");
    }
  },
};
