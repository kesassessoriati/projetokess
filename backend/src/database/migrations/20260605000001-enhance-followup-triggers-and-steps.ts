import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // FollowUpCampaigns: trigger type + config + reply behaviour
    await queryInterface.addColumn("FollowUpCampaigns", "triggerType", {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "message_sent",
    });

    await queryInterface.addColumn("FollowUpCampaigns", "triggerConfig", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    });

    await queryInterface.addColumn("FollowUpCampaigns", "stopOnReply", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn("FollowUpCampaigns", "actionOnReply", {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "none",
    });

    await queryInterface.addColumn("FollowUpCampaigns", "replyActionConfig", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    });

    // FollowUpStages: step type + step config (non-message steps)
    await queryInterface.addColumn("FollowUpStages", "stepType", {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "send_message",
    });

    await queryInterface.addColumn("FollowUpStages", "stepConfig", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("FollowUpStages", "stepConfig");
    await queryInterface.removeColumn("FollowUpStages", "stepType");
    await queryInterface.removeColumn("FollowUpCampaigns", "replyActionConfig");
    await queryInterface.removeColumn("FollowUpCampaigns", "actionOnReply");
    await queryInterface.removeColumn("FollowUpCampaigns", "stopOnReply");
    await queryInterface.removeColumn("FollowUpCampaigns", "triggerConfig");
    await queryInterface.removeColumn("FollowUpCampaigns", "triggerType");
  },
};
