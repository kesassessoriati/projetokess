import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("MySiteBoardAttachments", {
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
      name: { type: DataTypes.STRING, allowNull: false },
      originalName: { type: DataTypes.STRING, allowNull: true },
      filename: { type: DataTypes.STRING, allowNull: true },
      mimeType: { type: DataTypes.STRING, allowNull: true },
      size: { type: DataTypes.INTEGER, allowNull: true },
      path: { type: DataTypes.STRING, allowNull: true },
      url: { type: DataTypes.STRING, allowNull: true },
      type: { type: DataTypes.STRING, allowNull: false, defaultValue: "file" },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).then(() =>
      Promise.all([
        queryInterface.addIndex("MySiteBoardAttachments", ["companyId"]),
        queryInterface.addIndex("MySiteBoardAttachments", ["cardId"])
      ])
    );
  },
  down: (queryInterface: QueryInterface) => queryInterface.dropTable("MySiteBoardAttachments")
};

