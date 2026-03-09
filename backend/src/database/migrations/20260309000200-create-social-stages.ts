import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("SocialStages", {
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
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      color: {
        type: DataTypes.STRING,
        allowNull: true
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
        queryInterface.addIndex("SocialStages", ["companyId"]),
        queryInterface.addIndex("SocialStages", ["boardId"]),
        queryInterface.addIndex("SocialStages", ["boardId", "order"])
      ])
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("SocialStages");
  }
};

