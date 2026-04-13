import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tasks", "status", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "active",
    });

    await queryInterface.addColumn("Tasks", "completedAt", {
      type: DataTypes.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("Tasks", "completedBy", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.sequelize.query(
      "UPDATE \"Tasks\" SET \"status\" = 'active' WHERE \"status\" IS NULL;"
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tasks", "completedBy");
    await queryInterface.removeColumn("Tasks", "completedAt");
    await queryInterface.removeColumn("Tasks", "status");
  },
};
