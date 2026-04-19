import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("CallRecords", "leadId", {
      type: DataTypes.INTEGER,
      references: { model: "crm_leads", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true
    });

    await queryInterface.addColumn("CallRecords", "opportunityId", {
      type: DataTypes.INTEGER,
      references: { model: "Opportunities", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true
    });

    await queryInterface.addColumn("CallRecords", "pipelineId", {
      type: DataTypes.INTEGER,
      references: { model: "Pipelines", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true
    });

    await queryInterface.addColumn("CallRecords", "stageId", {
      type: DataTypes.INTEGER,
      references: { model: "PipelineStages", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true
    });

    await queryInterface.addColumn("CallRecords", "sequenceId", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addIndex("CallRecords", ["leadId"], {
      name: "idx_call_records_lead_id"
    });

    await queryInterface.addIndex("CallRecords", ["opportunityId"], {
      name: "idx_call_records_opportunity_id"
    });

    await queryInterface.addIndex("CallRecords", ["pipelineId"], {
      name: "idx_call_records_pipeline_id"
    });

    await queryInterface.addIndex("CallRecords", ["stageId"], {
      name: "idx_call_records_stage_id"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("CallRecords", "idx_call_records_stage_id");
    await queryInterface.removeIndex("CallRecords", "idx_call_records_pipeline_id");
    await queryInterface.removeIndex("CallRecords", "idx_call_records_opportunity_id");
    await queryInterface.removeIndex("CallRecords", "idx_call_records_lead_id");

    await queryInterface.removeColumn("CallRecords", "leadId");
    await queryInterface.removeColumn("CallRecords", "opportunityId");
    await queryInterface.removeColumn("CallRecords", "pipelineId");
    await queryInterface.removeColumn("CallRecords", "stageId");
    await queryInterface.removeColumn("CallRecords", "sequenceId");
  }
};
