import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // Add assignedUserId to Leads to track agent portfolio
        await queryInterface.addColumn("crm_leads", "owner_user_id", {
            type: DataTypes.INTEGER,
            references: { model: "Users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
            allowNull: true
        });

        // Add pipeline_id to Leads
        await queryInterface.addColumn("crm_leads", "pipeline_id", {
            type: DataTypes.INTEGER,
            references: { model: "Pipelines", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
            allowNull: true
        });

        // Add pipeline_stage_id to Leads
        await queryInterface.addColumn("crm_leads", "stage_id", {
            type: DataTypes.INTEGER,
            references: { model: "PipelineStages", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
            allowNull: true
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeColumn("crm_leads", "stage_id");
        await queryInterface.removeColumn("crm_leads", "pipeline_id");
        await queryInterface.removeColumn("crm_leads", "owner_user_id");
    }
};
