import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("MySiteBoardComments", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      cardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "MySiteBoardCards", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      message: { type: DataTypes.TEXT, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).then(() =>
      Promise.all([
        queryInterface.addIndex("MySiteBoardComments", ["companyId"]),
        queryInterface.addIndex("MySiteBoardComments", ["cardId"])
      ])
    );
  },
  down: (queryInterface: QueryInterface) => queryInterface.dropTable("MySiteBoardComments")
};

