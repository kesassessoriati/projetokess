import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addColumn("MetaCampaignCreationRequests", "executionLeaseToken", {
      type: DataTypes.STRING(64), allowNull: true
    });
    await queryInterface.addColumn("MetaCampaignCreationRequests", "executionLeaseExpiresAt", {
      type: DataTypes.DATE, allowNull: true
    });
    await queryInterface.addIndex("MetaCampaignCreationRequests", ["companyId", "executionLeaseExpiresAt"], {
      name: "meta_campaign_creation_request_company_lease"
    });
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Meta Marketing migrations are additive; disable flags instead of undoing production data.");
    }
    await queryInterface.removeColumn("MetaCampaignCreationRequests", "executionLeaseExpiresAt");
    await queryInterface.removeColumn("MetaCampaignCreationRequests", "executionLeaseToken");
  }
};
