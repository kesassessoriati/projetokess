import { QueryInterface, DataTypes } from "sequelize";

const ensureColumn = async (
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  definition: any
) => {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

const dropColumnIfExists = async (
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string
) => {
  const table = await queryInterface.describeTable(tableName);
  if (table[columnName]) {
    await queryInterface.removeColumn(tableName, columnName);
  }
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await ensureColumn(queryInterface, "GroupTemplates", "listButtonText", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await ensureColumn(queryInterface, "GroupTemplates", "listFooter", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await ensureColumn(queryInterface, "GroupTemplates", "carouselCards", {
      type: DataTypes.JSONB,
      allowNull: true
    });
    await ensureColumn(queryInterface, "GroupTemplates", "pollName", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await ensureColumn(queryInterface, "GroupTemplates", "pollOptions", {
      type: DataTypes.JSONB,
      allowNull: true
    });
    await ensureColumn(queryInterface, "GroupTemplates", "pollSelectableCount", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    });

    await ensureColumn(queryInterface, "GroupCampaigns", "listButtonText", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await ensureColumn(queryInterface, "GroupCampaigns", "listFooter", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await ensureColumn(queryInterface, "GroupCampaigns", "carouselCards", {
      type: DataTypes.JSONB,
      allowNull: true
    });
    await ensureColumn(queryInterface, "GroupCampaigns", "pollName", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await ensureColumn(queryInterface, "GroupCampaigns", "pollOptions", {
      type: DataTypes.JSONB,
      allowNull: true
    });
    await ensureColumn(queryInterface, "GroupCampaigns", "pollSelectableCount", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
    await ensureColumn(queryInterface, "GroupCampaigns", "responseEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await ensureColumn(queryInterface, "GroupCampaigns", "responseKeyword", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await ensureColumn(queryInterface, "GroupCampaigns", "responseMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await dropColumnIfExists(queryInterface, "GroupCampaigns", "responseMessage");
    await dropColumnIfExists(queryInterface, "GroupCampaigns", "responseKeyword");
    await dropColumnIfExists(queryInterface, "GroupCampaigns", "responseEnabled");
    await dropColumnIfExists(queryInterface, "GroupCampaigns", "pollSelectableCount");
    await dropColumnIfExists(queryInterface, "GroupCampaigns", "pollOptions");
    await dropColumnIfExists(queryInterface, "GroupCampaigns", "pollName");
    await dropColumnIfExists(queryInterface, "GroupCampaigns", "carouselCards");
    await dropColumnIfExists(queryInterface, "GroupCampaigns", "listFooter");
    await dropColumnIfExists(queryInterface, "GroupCampaigns", "listButtonText");

    await dropColumnIfExists(queryInterface, "GroupTemplates", "pollSelectableCount");
    await dropColumnIfExists(queryInterface, "GroupTemplates", "pollOptions");
    await dropColumnIfExists(queryInterface, "GroupTemplates", "pollName");
    await dropColumnIfExists(queryInterface, "GroupTemplates", "carouselCards");
    await dropColumnIfExists(queryInterface, "GroupTemplates", "listFooter");
    await dropColumnIfExists(queryInterface, "GroupTemplates", "listButtonText");
  }
};
