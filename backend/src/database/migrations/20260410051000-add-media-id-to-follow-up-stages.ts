import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("FollowUpStages", "mediaId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "media_files",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("FollowUpStages", "mediaId");
  }
};
