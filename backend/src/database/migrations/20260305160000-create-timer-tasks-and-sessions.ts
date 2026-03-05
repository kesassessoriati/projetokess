import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        await queryInterface.createTable("TimerTasks", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            defaultTime: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 10
            },
            category: {
                type: DataTypes.STRING,
                allowNull: true
            },
            userId: {
                type: DataTypes.INTEGER,
                references: { model: "Users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            companyId: {
                type: DataTypes.INTEGER,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
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

        await queryInterface.createTable("TimerSessions", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            taskId: {
                type: DataTypes.INTEGER,
                references: { model: "TimerTasks", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: true
            },
            userId: {
                type: DataTypes.INTEGER,
                references: { model: "Users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            companyId: {
                type: DataTypes.INTEGER,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            ticketId: {
                type: DataTypes.INTEGER,
                allowNull: true // references Tickets if we want to bind
            },
            startTime: {
                type: DataTypes.DATE,
                allowNull: false
            },
            endTime: {
                type: DataTypes.DATE,
                allowNull: true
            },
            timeSpent: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0 // in seconds
            },
            status: {
                type: DataTypes.STRING, // active, paused, completed
                allowNull: false,
                defaultValue: "active"
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

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.dropTable("TimerSessions");
        await queryInterface.dropTable("TimerTasks");
    }
};
