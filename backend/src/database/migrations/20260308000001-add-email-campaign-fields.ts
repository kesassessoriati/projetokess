import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDesc = await queryInterface.describeTable("Campaigns") as Record<string, any>;

    if (!tableDesc["campaignType"]) {
      await queryInterface.addColumn("Campaigns", "campaignType", {
        type: DataTypes.STRING(20),
        defaultValue: "whatsapp",
        allowNull: false
      });
    }

    if (!tableDesc["emailSubject"]) {
      await queryInterface.addColumn("Campaigns", "emailSubject", {
        type: DataTypes.STRING(255),
        allowNull: true
      });
    }

    if (!tableDesc["emailBody"]) {
      await queryInterface.addColumn("Campaigns", "emailBody", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }

    // failedAt no CampaignShipping para rastreamento de falhas por contato
    const shippingDesc = await queryInterface.describeTable("CampaignShipping") as Record<string, any>;

    if (!shippingDesc["failedAt"]) {
      await queryInterface.addColumn("CampaignShipping", "failedAt", {
        type: DataTypes.DATE,
        allowNull: true
      });
    }

    if (!shippingDesc["errorMessage"]) {
      await queryInterface.addColumn("CampaignShipping", "errorMessage", {
        type: DataTypes.STRING(500),
        allowNull: true
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Campaigns", "campaignType");
    await queryInterface.removeColumn("Campaigns", "emailSubject");
    await queryInterface.removeColumn("Campaigns", "emailBody");
    await queryInterface.removeColumn("CampaignShipping", "failedAt");
    await queryInterface.removeColumn("CampaignShipping", "errorMessage");
  }
};
