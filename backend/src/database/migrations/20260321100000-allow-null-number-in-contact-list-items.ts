import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn("ContactListItems", "number", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // Preencher nulos antes de reverter
    await queryInterface.sequelize.query(
      `UPDATE "ContactListItems" SET number = '' WHERE number IS NULL`
    );
    await queryInterface.changeColumn("ContactListItems", "number", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ""
    });
  }
};
