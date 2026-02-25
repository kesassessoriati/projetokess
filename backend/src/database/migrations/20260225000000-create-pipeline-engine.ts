import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // 1. Pipelines
        await queryInterface.createTable("Pipelines", {
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
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            isDefault: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
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

        // 2. PipelineStages
        await queryInterface.createTable("PipelineStages", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            pipelineId: {
                type: DataTypes.INTEGER,
                references: { model: "Pipelines", key: "id" },
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
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            order: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            color: {
                type: DataTypes.STRING,
                defaultValue: "#FFFFFF"
            },
            probability: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            isLocked: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
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

        // 3. Opportunities
        await queryInterface.createTable("Opportunities", {
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
            stageId: {
                type: DataTypes.INTEGER,
                references: { model: "PipelineStages", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            contactId: {
                type: DataTypes.INTEGER,
                references: { model: "Contacts", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            title: {
                type: DataTypes.STRING,
                allowNull: false
            },
            value: {
                type: DataTypes.DECIMAL(12, 2),
                defaultValue: 0
            },
            score: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            temperature: {
                type: DataTypes.ENUM("COLD", "WARM", "HOT"),
                defaultValue: "COLD"
            },
            slaDeadline: {
                type: DataTypes.DATE,
                allowNull: true
            },
            assignedUserId: {
                type: DataTypes.INTEGER,
                references: { model: "Users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
                allowNull: true
            },
            status: {
                type: DataTypes.ENUM("OPEN", "WON", "LOST"),
                defaultValue: "OPEN"
            },
            aiSuggestedStageId: {
                type: DataTypes.INTEGER,
                references: { model: "PipelineStages", key: "id" },
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
        });

        // 4. OpportunityMovements
        await queryInterface.createTable("OpportunityMovements", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            opportunityId: {
                type: DataTypes.INTEGER,
                references: { model: "Opportunities", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            fromStageId: {
                type: DataTypes.INTEGER,
                references: { model: "PipelineStages", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
                allowNull: true
            },
            toStageId: {
                type: DataTypes.INTEGER,
                references: { model: "PipelineStages", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
                allowNull: true
            },
            movedBy: {
                type: DataTypes.ENUM("USER", "AI", "AUTOMATION"),
                defaultValue: "USER"
            },
            reason: {
                type: DataTypes.TEXT,
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

        // 5. OpportunityEvents
        await queryInterface.createTable("OpportunityEvents", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            opportunityId: {
                type: DataTypes.INTEGER,
                references: { model: "Opportunities", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            type: {
                type: DataTypes.STRING,
                allowNull: false
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {}
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
        await queryInterface.dropTable("OpportunityEvents");
        await queryInterface.dropTable("OpportunityMovements");
        await queryInterface.dropTable("Opportunities");
        await queryInterface.dropTable("PipelineStages");
        await queryInterface.dropTable("Pipelines");
    }
};
