import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("SocialContents", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      boardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "SocialBoards", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      stageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "SocialStages", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      entityName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      platform: {
        type: DataTypes.STRING,
        allowNull: true
      },
      contentType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      copyText: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      scriptText: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      publishDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      publishTime: {
        type: DataTypes.STRING,
        allowNull: true
      },
      driveLink: {
        type: DataTypes.STRING,
        allowNull: true
      },
      siteUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      responsibleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      priority: {
        type: DataTypes.STRING,
        allowNull: true
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    }).then(() =>
      Promise.all([
        queryInterface.addIndex("SocialContents", ["companyId"]),
        queryInterface.addIndex("SocialContents", ["boardId"]),
        queryInterface.addIndex("SocialContents", ["stageId"]),
        queryInterface.addIndex("SocialContents", ["boardId", "publishDate"]),
        queryInterface.addIndex("SocialContents", ["boardId", "stageId", "order"])
      ])
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("SocialContents");
  }
};

