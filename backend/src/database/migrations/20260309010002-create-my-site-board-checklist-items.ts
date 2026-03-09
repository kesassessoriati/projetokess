import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("MySiteBoardChecklistItems", {
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
      title: { type: DataTypes.STRING, allowNull: false },
      completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).then(() =>
      Promise.all([
        queryInterface.addIndex("MySiteBoardChecklistItems", ["companyId"]),
        queryInterface.addIndex("MySiteBoardChecklistItems", ["cardId"])
      ])
    );
  },
  down: (queryInterface: QueryInterface) => queryInterface.dropTable("MySiteBoardChecklistItems")
};

