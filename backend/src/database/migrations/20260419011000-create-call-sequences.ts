import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("CallSequences", {
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
      pipelineId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Pipelines", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      stageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "PipelineStages", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      nextStageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "PipelineStages", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "ACTIVE"
      },
      maxAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3
      },
      intervalSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      onMaxAttempts: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "move_stage"
      },
      totalTargets: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      completedTargets: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      answeredTargets: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      failedTargets: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      pausedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true
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

    await queryInterface.createTable("CallSequenceTargets", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      sequenceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "CallSequences", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
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
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      contactName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      orderIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "PENDING"
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lastCallRecordId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      lastCallStatus: {
        type: DataTypes.STRING,
        allowNull: true
      },
      lastOutcomeAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true
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

    await queryInterface.addIndex("CallSequences", ["companyId", "userId"], {
      name: "idx_call_sequences_company_user"
    });
    await queryInterface.addIndex("CallSequences", ["status"], {
      name: "idx_call_sequences_status"
    });
    await queryInterface.addIndex("CallSequenceTargets", ["sequenceId", "status"], {
      name: "idx_call_sequence_targets_sequence_status"
    });
    await queryInterface.addIndex("CallSequenceTargets", ["leadId"], {
      name: "idx_call_sequence_targets_lead"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("CallSequenceTargets", "idx_call_sequence_targets_lead");
    await queryInterface.removeIndex("CallSequenceTargets", "idx_call_sequence_targets_sequence_status");
    await queryInterface.removeIndex("CallSequences", "idx_call_sequences_status");
    await queryInterface.removeIndex("CallSequences", "idx_call_sequences_company_user");
    await queryInterface.dropTable("CallSequenceTargets");
    await queryInterface.dropTable("CallSequences");
  }
};
