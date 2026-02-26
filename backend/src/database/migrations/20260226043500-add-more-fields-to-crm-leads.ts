import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        try {
            await queryInterface.addColumn("crm_leads", "decision_maker_name", {
                type: DataTypes.STRING,
                allowNull: true
            });
        } catch (e) {
            console.log("Column decision_maker_name already exists.");
        }

        try {
            await queryInterface.addColumn("crm_leads", "decision_maker_phone", {
                type: DataTypes.STRING,
                allowNull: true
            });
        } catch (e) {
            console.log("Column decision_maker_phone already exists.");
        }

        try {
            await queryInterface.addColumn("crm_leads", "gmn", {
                type: DataTypes.STRING,
                allowNull: true
            });
        } catch (e) {
            console.log("Column gmn already exists.");
        }

        try {
            await queryInterface.addColumn("crm_leads", "website", {
                type: DataTypes.STRING,
                allowNull: true
            });
        } catch (e) {
            console.log("Column website already exists.");
        }

        try {
            await queryInterface.addColumn("crm_leads", "instagram", {
                type: DataTypes.STRING,
                allowNull: true
            });
        } catch (e) {
            console.log("Column instagram already exists.");
        }

        try {
            await queryInterface.addColumn("crm_leads", "linkedin", {
                type: DataTypes.STRING,
                allowNull: true
            });
        } catch (e) {
            console.log("Column linkedin already exists.");
        }
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeColumn("crm_leads", "linkedin");
        await queryInterface.removeColumn("crm_leads", "instagram");
        await queryInterface.removeColumn("crm_leads", "website");
        await queryInterface.removeColumn("crm_leads", "gmn");
        await queryInterface.removeColumn("crm_leads", "decision_maker_phone");
        await queryInterface.removeColumn("crm_leads", "decision_maker_name");
    }
};
