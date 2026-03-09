import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("MySiteBoardCards", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      columnId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "MySiteBoardColumns", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      url: { type: DataTypes.STRING, allowNull: true },
      responsible: { type: DataTypes.STRING, allowNull: true },
      priority: { type: DataTypes.STRING, allowNull: true },
      dueDate: { type: DataTypes.DATEONLY, allowNull: true },
      tags: { type: DataTypes.JSON, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      color: { type: DataTypes.STRING, allowNull: true },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).then(() =>
      Promise.all([
        queryInterface.addIndex("MySiteBoardCards", ["companyId"]),
        queryInterface.addIndex("MySiteBoardCards", ["columnId"]),
        queryInterface.addIndex("MySiteBoardCards", ["columnId", "order"])
      ])
    );
  },
  down: (queryInterface: QueryInterface) => queryInterface.dropTable("MySiteBoardCards")
};

