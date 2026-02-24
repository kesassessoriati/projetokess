import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.createTable("SystemMetrics", {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            type: {
                type: DataTypes.STRING,
                allowNull: false // e.g., 'PERFORMANCE', 'PRODUCT_EVENT'
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false // e.g., 'API_RESPONSE_TIME', 'TICKET_CREATED'
            },
            value: {
                type: DataTypes.FLOAT,
                allowNull: true
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: true
            },
            companyId: {
                type: DataTypes.INTEGER,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: true
            },
            userId: {
                type: DataTypes.INTEGER,
                references: { model: "Users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
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
                queryInterface.addIndex("SystemMetrics", ["type"]),
                queryInterface.addIndex("SystemMetrics", ["name"]),
                queryInterface.addIndex("SystemMetrics", ["companyId"]),
                queryInterface.addIndex("SystemMetrics", ["createdAt"])
            ]);
        });
    },

    down: (queryInterface: QueryInterface) => {
        return queryInterface.dropTable("SystemMetrics");
    }
};
