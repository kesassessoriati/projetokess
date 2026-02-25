import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // 1. Add ticketId to Opportunities
        await queryInterface.addColumn("Opportunities", "ticketId", {
            type: DataTypes.INTEGER,
            references: { model: "Tickets", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
            allowNull: true
        });

        // 2. Tabela PipelineTemplates
        await queryInterface.createTable("PipelineTemplates", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            segment: {
                type: DataTypes.STRING, // e.g., "sales", "medical", "real_estate"
                allowNull: false
            },
            isDefault: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            stages: {
                type: DataTypes.JSONB,
                defaultValue: []
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

        // 3. Add templateId to Pipelines (to track which template it came from)
        await queryInterface.addColumn("Pipelines", "templateId", {
            type: DataTypes.INTEGER,
            references: { model: "PipelineTemplates", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
            allowNull: true
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeColumn("Pipelines", "templateId");
        await queryInterface.dropTable("PipelineTemplates");
        await queryInterface.removeColumn("Opportunities", "ticketId");
    }
};
