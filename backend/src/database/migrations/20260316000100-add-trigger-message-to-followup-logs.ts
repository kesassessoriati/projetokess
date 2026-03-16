import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDescription: any = await queryInterface.describeTable("FollowUpLogs");

    if (!tableDescription.triggerMessageId) {
      await queryInterface.addColumn("FollowUpLogs", "triggerMessageId", {
        type: DataTypes.INTEGER,
        allowNull: true
      });
    }

    if (!tableDescription.triggeredAt) {
      await queryInterface.addColumn("FollowUpLogs", "triggeredAt", {
        type: DataTypes.DATE,
        allowNull: true
      });
    }

    await queryInterface.addIndex("FollowUpLogs", ["companyId", "followUpCampaignId", "contactNumber"], {
      name: "followup_logs_company_campaign_contact_idx"
    }).catch(() => undefined);

    await queryInterface.addIndex("FollowUpLogs", ["triggerMessageId"], {
      name: "followup_logs_trigger_message_idx"
    }).catch(() => undefined);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("FollowUpLogs", "followup_logs_trigger_message_idx").catch(() => undefined);
    await queryInterface.removeIndex("FollowUpLogs", "followup_logs_company_campaign_contact_idx").catch(() => undefined);

    const tableDescription: any = await queryInterface.describeTable("FollowUpLogs");

    if (tableDescription.triggeredAt) {
      await queryInterface.removeColumn("FollowUpLogs", "triggeredAt");
    }

    if (tableDescription.triggerMessageId) {
      await queryInterface.removeColumn("FollowUpLogs", "triggerMessageId");
    }
  }
};
