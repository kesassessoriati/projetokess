import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.createTable("SlowQueries", {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            query: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            duration: {
                type: DataTypes.FLOAT,
                allowNull: false
            },
            severity: {
                type: DataTypes.STRING, // 'HIGH', 'CRITICAL', 'LOW'
                allowNull: false
            },
            route: {
                type: DataTypes.STRING,
                allowNull: true
            },
            companyId: {
                type: DataTypes.INTEGER,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
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
                queryInterface.addIndex("SlowQueries", ["companyId"]),
                queryInterface.addIndex("SlowQueries", ["createdAt"]),
                queryInterface.addIndex("SlowQueries", ["severity"])
            ]);
        });
    },

    down: (queryInterface: QueryInterface) => {
        return queryInterface.dropTable("SlowQueries");
    }
};
