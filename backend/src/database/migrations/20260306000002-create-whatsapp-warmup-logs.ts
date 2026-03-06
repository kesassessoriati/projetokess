import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.createTable("WhatsappWarmupLogs", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            whatsappId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: "Whatsapps", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            warmupId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: "WhatsappWarmups", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            type: {
                type: DataTypes.STRING,
                allowNull: false
            },
            message: {
                type: DataTypes.STRING,
                allowNull: false
            },
            companyId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false
            }
        });
    },

    down: (queryInterface: QueryInterface) => {
        return queryInterface.dropTable("WhatsappWarmupLogs");
    }
};
