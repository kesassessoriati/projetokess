import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.createTable("FrontendErrors", {
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
            componentStack: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            url: {
                type: DataTypes.STRING,
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
            userAgent: {
                type: DataTypes.STRING,
                allowNull: true
            },
            severity: {
                type: DataTypes.STRING, // Using STRING to avoid ENUM issues in some DBs, or I can use ENUM if preferred. 
                allowNull: false,
                defaultValue: "MEDIUM"
            },
            occurrences: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
                allowNull: false
            },
            status: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: "NEW"
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
                queryInterface.addIndex("FrontendErrors", ["companyId"]),
                queryInterface.addIndex("FrontendErrors", ["severity"]),
                queryInterface.addIndex("FrontendErrors", ["status"]),
                queryInterface.addIndex("FrontendErrors", ["createdAt"])
            ]);
        });
    },

    down: (queryInterface: QueryInterface) => {
        return queryInterface.dropTable("FrontendErrors");
    }
};
