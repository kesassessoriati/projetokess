import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.createTable("SystemProcessMetrics", {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            cpuUser: {
                type: DataTypes.BIGINT,
                allowNull: false
            },
            cpuSystem: {
                type: DataTypes.BIGINT,
                allowNull: false
            },
            memoryRss: {
                type: DataTypes.BIGINT,
                allowNull: false
            },
            memoryHeapUsed: {
                type: DataTypes.BIGINT,
                allowNull: false
            },
            memoryHeapTotal: {
                type: DataTypes.BIGINT,
                allowNull: false
            },
            eventLoopDelay: {
                type: DataTypes.FLOAT,
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
            return queryInterface.addIndex("SystemProcessMetrics", ["createdAt"]);
        });
    },

    down: (queryInterface: QueryInterface) => {
        return queryInterface.dropTable("SystemProcessMetrics");
    }
};
