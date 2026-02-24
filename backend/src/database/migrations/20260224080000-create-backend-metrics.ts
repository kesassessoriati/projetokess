import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.createTable("BackendMetrics", {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            companyId: {
                type: DataTypes.INTEGER,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: true
            },
            route: {
                type: DataTypes.STRING,
                allowNull: false
            },
            method: {
                type: DataTypes.STRING,
                allowNull: false
            },
            statusCode: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            durationMs: {
                type: DataTypes.FLOAT,
                allowNull: false
            },
            requestId: {
                type: DataTypes.STRING,
                allowNull: true
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
                queryInterface.addIndex("BackendMetrics", ["route"]),
                queryInterface.addIndex("BackendMetrics", ["companyId"]),
                queryInterface.addIndex("BackendMetrics", ["createdAt"]),
                queryInterface.addIndex("BackendMetrics", ["method"])
            ]);
        });
    },

    down: (queryInterface: QueryInterface) => {
        return queryInterface.dropTable("BackendMetrics");
    }
};
