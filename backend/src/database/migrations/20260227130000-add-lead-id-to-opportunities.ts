import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        await queryInterface.addColumn("Opportunities", "leadId", {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "crm_leads", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        });

    },

    down: async (queryInterface: QueryInterface) => {
        return queryInterface.removeColumn("Opportunities", "leadId");
    }
};
