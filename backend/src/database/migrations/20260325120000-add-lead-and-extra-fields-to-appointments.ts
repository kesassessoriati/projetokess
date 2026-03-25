import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("appointments");

    if (!tableDescription["lead_name"]) {
      await queryInterface.addColumn("appointments", "lead_name", {
        type: DataTypes.STRING(200),
        allowNull: true,
        defaultValue: null
      });
    }

    if (!tableDescription["lead_phone"]) {
      await queryInterface.addColumn("appointments", "lead_phone", {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: null
      });
    }

    if (!tableDescription["participant_emails"]) {
      await queryInterface.addColumn("appointments", "participant_emails", {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null
      });
    }

    if (!tableDescription["meeting_link"]) {
      await queryInterface.addColumn("appointments", "meeting_link", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
      });
    }

    if (!tableDescription["operational_note"]) {
      await queryInterface.addColumn("appointments", "operational_note", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
      });
    }

    if (!tableDescription["created_by_user_id"]) {
      await queryInterface.addColumn("appointments", "created_by_user_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("appointments");

    if (tableDescription["lead_name"]) await queryInterface.removeColumn("appointments", "lead_name");
    if (tableDescription["lead_phone"]) await queryInterface.removeColumn("appointments", "lead_phone");
    if (tableDescription["participant_emails"]) await queryInterface.removeColumn("appointments", "participant_emails");
    if (tableDescription["meeting_link"]) await queryInterface.removeColumn("appointments", "meeting_link");
    if (tableDescription["operational_note"]) await queryInterface.removeColumn("appointments", "operational_note");
    if (tableDescription["created_by_user_id"]) await queryInterface.removeColumn("appointments", "created_by_user_id");
  }
};
