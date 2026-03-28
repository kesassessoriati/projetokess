import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        const tableDesc = await queryInterface.describeTable("Campaigns");

        if (!tableDesc["listSections"]) {
            await queryInterface.addColumn("Campaigns", "listSections", {
                type: DataTypes.JSON,
                allowNull: true
            });
        }

        if (!tableDesc["listButtonText"]) {
            await queryInterface.addColumn("Campaigns", "listButtonText", {
                type: DataTypes.STRING,
                allowNull: true
            });
        }

        if (!tableDesc["listFooter"]) {
            await queryInterface.addColumn("Campaigns", "listFooter", {
                type: DataTypes.TEXT,
                allowNull: true
            });
        }
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeColumn("Campaigns", "listFooter");
        await queryInterface.removeColumn("Campaigns", "listButtonText");
        await queryInterface.removeColumn("Campaigns", "listSections");
    }
};
