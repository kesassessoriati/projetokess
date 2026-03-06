import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.createTable("WhatsappWarmups", {
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
            companyId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            messagesPerDay: {
                type: DataTypes.INTEGER,
                defaultValue: 50
            },
            minInterval: {
                type: DataTypes.INTEGER,
                defaultValue: 1
            },
            maxInterval: {
                type: DataTypes.INTEGER,
                defaultValue: 5
            },
            startTime: {
                type: DataTypes.STRING,
                defaultValue: "09:00"
            },
            endTime: {
                type: DataTypes.STRING,
                defaultValue: "21:00"
            },
            maxInteractionsPerHour: {
                type: DataTypes.INTEGER,
                defaultValue: 10
            },
            healthScore: {
                type: DataTypes.STRING,
                defaultValue: "good"
            },
            messagesSentToday: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            simulatedMessages: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            avgResponseTime: {
                type: DataTypes.STRING,
                defaultValue: "0"
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
        return queryInterface.dropTable("WhatsappWarmups");
    }
};
