import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        await queryInterface.addColumn("OpportunityMovements", "companyId", {
            type: DataTypes.INTEGER,
            references: { model: "Companies", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
            allowNull: true
        });

        await queryInterface.addColumn("OpportunityEvents", "companyId", {
            type: DataTypes.INTEGER,
            references: { model: "Companies", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
            allowNull: true
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeColumn("OpportunityEvents", "companyId");
        await queryInterface.removeColumn("OpportunityMovements", "companyId");
    }
};
