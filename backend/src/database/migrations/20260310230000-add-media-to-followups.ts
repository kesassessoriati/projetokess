import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("FollowUpStages", "mediaUrl", {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("FollowUpStages", "mediaType", {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("FollowUpStages", "mediaCaption", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("FollowUpCampaigns", "boardColumn", {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("FollowUpStages", "mediaUrl");
    await queryInterface.removeColumn("FollowUpStages", "mediaType");
    await queryInterface.removeColumn("FollowUpStages", "mediaCaption");
    await queryInterface.removeColumn("FollowUpCampaigns", "boardColumn");
  },
};
