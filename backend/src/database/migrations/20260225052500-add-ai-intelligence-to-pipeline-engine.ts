import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // 1. Adicionar campos de configuração de IA em CompaniesSettings
        await queryInterface.addColumn("CompaniesSettings", "aiAutoMoveEnabled", {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        });
        await queryInterface.addColumn("CompaniesSettings", "aiConfidenceThreshold", {
            type: DataTypes.FLOAT,
            defaultValue: 0.85,
            allowNull: false
        });

        // 2. Tabela OpportunityPredictions
        await queryInterface.createTable("OpportunityPredictions", {
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
            companyId: {
                type: DataTypes.INTEGER,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            predictedCloseProbability: {
                type: DataTypes.FLOAT,
                defaultValue: 0
            },
            predictedDaysToClose: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            riskLevel: {
                type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH"),
                defaultValue: "LOW"
            },
            explanation: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            aiModelVersion: {
                type: DataTypes.STRING,
                defaultValue: "v1"
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

        // 3. Tabela AISuggestionFeedbacks
        await queryInterface.createTable("AISuggestionFeedbacks", {
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
            companyId: {
                type: DataTypes.INTEGER,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            suggestedStageId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            actualStageId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            feedback: {
                type: DataTypes.ENUM("AGREE", "DISAGREE"),
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

        await queryInterface.addIndex("OpportunityPredictions", ["opportunityId"]);
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.dropTable("AISuggestionFeedbacks");
        await queryInterface.dropTable("OpportunityPredictions");
        await queryInterface.removeColumn("CompaniesSettings", "aiAutoMoveEnabled");
        await queryInterface.removeColumn("CompaniesSettings", "aiConfidenceThreshold");
    }
};
