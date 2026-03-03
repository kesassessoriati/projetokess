import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        try {
            await queryInterface.addColumn("crm_leads", "cnpj", {
                type: DataTypes.STRING,
                allowNull: true
            });
        } catch (e) {
            console.log("Column cnpj already exists.");
        }
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeColumn("crm_leads", "cnpj");
    }
};
