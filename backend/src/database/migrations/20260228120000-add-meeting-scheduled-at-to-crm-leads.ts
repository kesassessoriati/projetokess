import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        return Promise.all([
            queryInterface.addColumn("crm_leads", "meeting_scheduled_at", {
                type: DataTypes.DATE,
                allowNull: true,
            }),
        ]);
    },

    down: async (queryInterface: QueryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("crm_leads", "meeting_scheduled_at"),
        ]);
    }
};
