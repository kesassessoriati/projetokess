import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        await queryInterface.addColumn("Opportunities", "lastMovedBy", {
            type: DataTypes.STRING,
            defaultValue: "USER",
            allowNull: true
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeColumn("Opportunities", "lastMovedBy");
    }
};
