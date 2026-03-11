import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("appointments", "google_meet_link", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("appointments", "organizer_email", {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("appointments", "organizer_name", {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("appointments", "participants", {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("appointments", "google_meet_link");
    await queryInterface.removeColumn("appointments", "organizer_email");
    await queryInterface.removeColumn("appointments", "organizer_name");
    await queryInterface.removeColumn("appointments", "participants");
  }
};
