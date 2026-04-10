import { DataTypes } from "sequelize";

export = {
  up: async (queryInterface: any) => {
    await queryInterface.addColumn("quick_reply_groups", "sortOrder", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn("quick_replies", "mediaName", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("quick_replies", "mediaSource", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("quick_replies", "mediaFileId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn("quick_replies", "sortOrder", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.sequelize.query(
      `UPDATE "quick_reply_groups" SET "sortOrder" = "id" WHERE "sortOrder" = 0`
    );
    await queryInterface.sequelize.query(
      `UPDATE "quick_replies" SET "sortOrder" = "id" WHERE "sortOrder" = 0`
    );
  },

  down: async (queryInterface: any) => {
    await queryInterface.removeColumn("quick_replies", "sortOrder");
    await queryInterface.removeColumn("quick_replies", "mediaFileId");
    await queryInterface.removeColumn("quick_replies", "mediaSource");
    await queryInterface.removeColumn("quick_replies", "mediaName");
    await queryInterface.removeColumn("quick_reply_groups", "sortOrder");
  }
};
