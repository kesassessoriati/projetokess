import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    const hasBoardsTable = tables.includes("FollowUpBoards");

    if (!hasBoardsTable) {
      await queryInterface.createTable("FollowUpBoards", {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        companyId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        funnelName: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "Geral",
        },
        columns: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: ["Sem Categoria"],
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });

      await queryInterface.addIndex("FollowUpBoards", ["companyId"]);
      await queryInterface.addIndex("FollowUpBoards", ["companyId", "funnelName"]);
      await queryInterface.addIndex("FollowUpBoards", ["companyId", "name"]);
    }

    const tableDescription: any = await queryInterface.describeTable("FollowUpCampaigns");

    if (!tableDescription.boardId) {
      await queryInterface.addColumn("FollowUpCampaigns", "boardId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "FollowUpBoards", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });

      await queryInterface.addIndex("FollowUpCampaigns", ["companyId", "boardId"]);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDescription: any = await queryInterface.describeTable("FollowUpCampaigns");

    if (tableDescription.boardId) {
      await queryInterface.removeColumn("FollowUpCampaigns", "boardId");
    }

    const tables = await queryInterface.showAllTables();
    if (tables.includes("FollowUpBoards")) {
      await queryInterface.dropTable("FollowUpBoards");
    }
  },
};
