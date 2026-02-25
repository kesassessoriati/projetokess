import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        await queryInterface.createTable("PipelineAutomations", {
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
                allowNull: false
            },
            pipelineId: {
                type: DataTypes.INTEGER,
                references: { model: "Pipelines", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            trigger: {
                type: DataTypes.ENUM(
                    "ON_ENTER_STAGE",
                    "ON_EXIT_STAGE",
                    "ON_SLA_EXPIRED",
                    "ON_OPPORTUNITY_CREATED"
                ),
                allowNull: false
            },
            stageId: {
                type: DataTypes.INTEGER,
                references: { model: "PipelineStages", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
                allowNull: true
            },
            condition: {
                type: DataTypes.JSONB,
                defaultValue: {}
            },
            actionType: {
                type: DataTypes.STRING, // Ex: "MOVE_STAGE", "SEND_WHATSAPP", "ASSIGN_USER"
                allowNull: false
            },
            actionConfig: {
                type: DataTypes.JSONB,
                defaultValue: {}
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

        // Tabela para log de execuções de automação (Idempotência e Error Log)
        await queryInterface.createTable("PipelineAutomationLogs", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            companyId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            automationId: {
                type: DataTypes.INTEGER,
                references: { model: "PipelineAutomations", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            opportunityId: {
                type: DataTypes.INTEGER,
                references: { model: "Opportunities", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            eventId: {
                type: DataTypes.STRING, // Para idempotência
                allowNull: false
            },
            status: {
                type: DataTypes.ENUM("SUCCESS", "FAILED"),
                allowNull: false
            },
            error: {
                type: DataTypes.TEXT,
                allowNull: true
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

        await queryInterface.addIndex("PipelineAutomationLogs", ["eventId", "automationId"], {
            unique: true,
            name: "idx_automation_idempotency"
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.dropTable("PipelineAutomationLogs");
        await queryInterface.dropTable("PipelineAutomations");
    }
};
