import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.createTable("BackendErrors", {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            message: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            stack: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            route: {
                type: DataTypes.STRING,
                allowNull: true
            },
            method: {
                type: DataTypes.STRING,
                allowNull: true
            },
            statusCode: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            userId: {
                type: DataTypes.INTEGER,
                references: { model: "Users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
                allowNull: true
            },
            companyId: {
                type: DataTypes.INTEGER,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: true
            },
            severity: {
                type: DataTypes.STRING,
                defaultValue: "MEDIUM",
                allowNull: false
            },
            occurrences: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
                allowNull: false
            },
            status: {
                type: DataTypes.STRING,
                defaultValue: "NEW",
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
        }).then(() => {
            return Promise.all([
                queryInterface.addIndex("BackendErrors", ["companyId"]),
                queryInterface.addIndex("BackendErrors", ["severity"]),
                queryInterface.addIndex("BackendErrors", ["status"]),
                queryInterface.addIndex("BackendErrors", ["route"]),
                queryInterface.addIndex("BackendErrors", ["createdAt"])
            ]);
        });
    },

    down: (queryInterface: QueryInterface) => {
        return queryInterface.dropTable("BackendErrors");
    }
};
