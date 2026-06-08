import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addColumn("AiExternalFollowUpConfigs", "timezone", {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "America/Sao_Paulo"
    });
    await queryInterface.addColumn("AiExternalFollowUpConfigs", "executionTimes", {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: ["08:00", "12:00", "17:30"]
    });
    await queryInterface.addColumn("AiExternalFollowUpConfigs", "lookbackHours", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 12
    });
    await queryInterface.addColumn("AiExternalFollowUpConfigs", "ignoreResolvedTickets", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn("AiExternalFollowUpConfigs", "ignoreClosedTickets", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn("AiExternalFollowUpConfigs", "typingSimulationEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("AiExternalFollowUpConfigs", "timezone");
    await queryInterface.removeColumn("AiExternalFollowUpConfigs", "executionTimes");
    await queryInterface.removeColumn("AiExternalFollowUpConfigs", "lookbackHours");
    await queryInterface.removeColumn("AiExternalFollowUpConfigs", "ignoreResolvedTickets");
    await queryInterface.removeColumn("AiExternalFollowUpConfigs", "ignoreClosedTickets");
    await queryInterface.removeColumn("AiExternalFollowUpConfigs", "typingSimulationEnabled");
  }
};
