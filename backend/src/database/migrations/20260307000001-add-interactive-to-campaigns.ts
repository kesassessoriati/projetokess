import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        const tableDesc = await queryInterface.describeTable("Campaigns");

        if (!tableDesc["messageType"]) {
            await queryInterface.addColumn("Campaigns", "messageType", {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "text"
            });
        }

        if (!tableDesc["buttons"]) {
            await queryInterface.addColumn("Campaigns", "buttons", {
                type: DataTypes.JSON,
                allowNull: true
            });
        }

        if (!tableDesc["carouselCards"]) {
            await queryInterface.addColumn("Campaigns", "carouselCards", {
                type: DataTypes.JSON,
                allowNull: true
            });
        }
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeColumn("Campaigns", "messageType");
        await queryInterface.removeColumn("Campaigns", "buttons");
        await queryInterface.removeColumn("Campaigns", "carouselCards");
    }
};
