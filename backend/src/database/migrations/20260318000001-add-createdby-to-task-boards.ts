import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        await queryInterface.addColumn("TaskBoards", "createdBy", {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "Users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL"
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeColumn("TaskBoards", "createdBy");
    }
};
