import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("SocialBoards", {
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
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      color: {
        type: DataTypes.STRING,
        allowNull: true
      },
      relatedType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      relatedId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      relatedName: {
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
        queryInterface.addIndex("SocialBoards", ["companyId"]),
        queryInterface.addIndex("SocialBoards", ["companyId", "name"])
      ])
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("SocialBoards");
  }
};

