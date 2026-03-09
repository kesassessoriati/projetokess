import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("MySiteBoardColumns", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      color: { type: DataTypes.STRING, allowNull: true },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).then(() =>
      Promise.all([
        queryInterface.addIndex("MySiteBoardColumns", ["companyId"]),
        queryInterface.addIndex("MySiteBoardColumns", ["companyId", "order"])
      ])
    );
  },
  down: (queryInterface: QueryInterface) => queryInterface.dropTable("MySiteBoardColumns")
};

