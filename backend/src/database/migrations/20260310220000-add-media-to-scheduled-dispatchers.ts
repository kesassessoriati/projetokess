import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDesc = await queryInterface.describeTable("scheduled_dispatchers");

    if (!tableDesc.media_url) {
      await queryInterface.addColumn("scheduled_dispatchers", "media_url", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
      });
    }

    if (!tableDesc.media_type) {
      await queryInterface.addColumn("scheduled_dispatchers", "media_type", {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: null
      });
    }

    if (!tableDesc.media_caption) {
      await queryInterface.addColumn("scheduled_dispatchers", "media_caption", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDesc = await queryInterface.describeTable("scheduled_dispatchers");

    if (tableDesc.media_caption) {
      await queryInterface.removeColumn("scheduled_dispatchers", "media_caption");
    }
    if (tableDesc.media_type) {
      await queryInterface.removeColumn("scheduled_dispatchers", "media_type");
    }
    if (tableDesc.media_url) {
      await queryInterface.removeColumn("scheduled_dispatchers", "media_url");
    }
  }
};
