import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        return queryInterface.changeColumn("Opportunities", "contactId", {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "Contacts", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        });
    },

    down: async (queryInterface: QueryInterface) => {
        return queryInterface.changeColumn("Opportunities", "contactId", {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "Contacts", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        });
    }
};
