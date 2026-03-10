import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("crm_clients", "decisor_name", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("crm_clients", "decisor_phone", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("crm_clients", "site", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("crm_clients", "instagram", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("crm_clients", "linkedin", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("crm_clients", "cargo", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("crm_clients", "origem", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("crm_clients", "campanha_tag", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("crm_clients", "temperatura", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("crm_clients", "score", {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: true
      }),
      queryInterface.addColumn("crm_clients", "tags", {
        type: DataTypes.TEXT,
        allowNull: true
      })
    ]);
  },

  down: async (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("crm_clients", "decisor_name"),
      queryInterface.removeColumn("crm_clients", "decisor_phone"),
      queryInterface.removeColumn("crm_clients", "site"),
      queryInterface.removeColumn("crm_clients", "instagram"),
      queryInterface.removeColumn("crm_clients", "linkedin"),
      queryInterface.removeColumn("crm_clients", "cargo"),
      queryInterface.removeColumn("crm_clients", "origem"),
      queryInterface.removeColumn("crm_clients", "campanha_tag"),
      queryInterface.removeColumn("crm_clients", "temperatura"),
      queryInterface.removeColumn("crm_clients", "score"),
      queryInterface.removeColumn("crm_clients", "tags")
    ]);
  }
};
