import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("appointments", "lead_name", {
      type: DataTypes.STRING(200),
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("appointments", "lead_phone", {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("appointments", "participant_emails", {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("appointments", "meeting_link", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("appointments", "operational_note", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("appointments", "created_by_user_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: "users",
        key: "id"
      },
      onDelete: "SET NULL"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("appointments", "lead_name");
    await queryInterface.removeColumn("appointments", "lead_phone");
    await queryInterface.removeColumn("appointments", "participant_emails");
    await queryInterface.removeColumn("appointments", "meeting_link");
    await queryInterface.removeColumn("appointments", "operational_note");
    await queryInterface.removeColumn("appointments", "created_by_user_id");
  }
};
