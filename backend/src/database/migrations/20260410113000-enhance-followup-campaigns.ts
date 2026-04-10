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

const ensureReference = async (
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  referenceTable: string
) => {
  await ensureColumn(queryInterface, tableName, columnName, {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: referenceTable, key: "id" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL"
  });
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await ensureColumn(queryInterface, "FollowUpCampaigns", "description", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await ensureColumn(queryInterface, "FollowUpCampaigns", "targetMode", {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "all"
    });

    await ensureColumn(queryInterface, "FollowUpCampaigns", "tagIds", {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    });

    await ensureReference(queryInterface, "FollowUpCampaigns", "pipelineId", "Pipelines");
    await ensureReference(queryInterface, "FollowUpCampaigns", "pipelineStageId", "PipelineStages");

    await ensureColumn(queryInterface, "FollowUpCampaigns", "smartMode", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await ensureColumn(queryInterface, "FollowUpCampaigns", "aiEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await ensureColumn(queryInterface, "FollowUpCampaigns", "recoveryInstruction", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await ensureColumn(queryInterface, "FollowUpCampaigns", "successKeywords", {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    });

    await ensureColumn(queryInterface, "FollowUpCampaigns", "stopKeywords", {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    });

    await ensureColumn(queryInterface, "FollowUpStages", "title", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await ensureColumn(queryInterface, "FollowUpStages", "useAiRewrite", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface: QueryInterface) => {
    const campaignTable = await queryInterface.describeTable("FollowUpCampaigns");
    const stageTable = await queryInterface.describeTable("FollowUpStages");

    const removeIfExists = async (tableName: string, columnName: string, tableDef: any) => {
      if (tableDef[columnName]) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    };

    await removeIfExists("FollowUpStages", "useAiRewrite", stageTable);
    await removeIfExists("FollowUpStages", "title", stageTable);

    await removeIfExists("FollowUpCampaigns", "stopKeywords", campaignTable);
    await removeIfExists("FollowUpCampaigns", "successKeywords", campaignTable);
    await removeIfExists("FollowUpCampaigns", "recoveryInstruction", campaignTable);
    await removeIfExists("FollowUpCampaigns", "aiEnabled", campaignTable);
    await removeIfExists("FollowUpCampaigns", "smartMode", campaignTable);
    await removeIfExists("FollowUpCampaigns", "pipelineStageId", campaignTable);
    await removeIfExists("FollowUpCampaigns", "pipelineId", campaignTable);
    await removeIfExists("FollowUpCampaigns", "tagIds", campaignTable);
    await removeIfExists("FollowUpCampaigns", "targetMode", campaignTable);
    await removeIfExists("FollowUpCampaigns", "description", campaignTable);
  }
};
