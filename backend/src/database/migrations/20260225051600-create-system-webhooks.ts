import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // 1. Tabela SystemWebhooks
        await queryInterface.createTable("SystemWebhooks", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            companyId: {
                type: DataTypes.INTEGER,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: true // Se for null, pode ser um webhook global do sistema
            },
            eventType: {
                type: DataTypes.STRING, // Ex: "OPPORTUNITY_MOVED", "OPPORTUNITY_CREATED", "SLA_EXPIRED"
                allowNull: false
            },
            url: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            secret: {
                type: DataTypes.STRING,
                allowNull: true // Para assinatura HMAC
            },
            retryPolicy: {
                type: DataTypes.JSONB,
                defaultValue: { maxRetries: 3, backoff: "exponential" }
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
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

        // 2. Tabela WebhookDeliveryLogs
        await queryInterface.createTable("WebhookDeliveryLogs", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            webhookId: {
                type: DataTypes.INTEGER,
                references: { model: "SystemWebhooks", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            eventId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            status: {
                type: DataTypes.ENUM("SUCCESS", "FAILED"),
                allowNull: false
            },
            responseCode: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            responseBody: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            attempt: {
                type: DataTypes.INTEGER,
                defaultValue: 1
            },
            executionTime: {
                type: DataTypes.INTEGER, // ms
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
        });

        await queryInterface.addIndex("WebhookDeliveryLogs", ["eventId", "webhookId"], {
            name: "idx_webhook_idempotency"
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.dropTable("WebhookDeliveryLogs");
        await queryInterface.dropTable("SystemWebhooks");
    }
};
