import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("CallRecordings", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      callRecordId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "CallRecords", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      leadId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "crm_leads", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      opportunityId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Opportunities", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      pipelineId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Pipelines", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      stageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "PipelineStages", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      source: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "browser"
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "ready"
      },
      originalName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: true
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      publicUrl: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      size: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
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

    await queryInterface.addIndex("CallRecordings", ["companyId", "userId"], {
      name: "idx_call_recordings_company_user"
    });
    await queryInterface.addIndex("CallRecordings", ["leadId"], {
      name: "idx_call_recordings_lead_id"
    });
    await queryInterface.addIndex("CallRecordings", ["callRecordId"], {
      name: "idx_call_recordings_call_record_id"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("CallRecordings", "idx_call_recordings_call_record_id");
    await queryInterface.removeIndex("CallRecordings", "idx_call_recordings_lead_id");
    await queryInterface.removeIndex("CallRecordings", "idx_call_recordings_company_user");
    await queryInterface.dropTable("CallRecordings");
  }
};
