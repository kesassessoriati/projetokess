import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("StageAutomationExecutionLogs", {
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
      automationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Automations", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      actionUid: {
        type: DataTypes.STRING,
        allowNull: true
      },
      cycleId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      opportunityId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      stageId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM("executed", "skipped", "stopped", "failed"),
        allowNull: false
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      executedAt: {
        type: DataTypes.DATE(6),
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE(6),
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE(6),
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await queryInterface.addIndex("StageAutomationExecutionLogs", ["companyId"]);
    await queryInterface.addIndex("StageAutomationExecutionLogs", [
      "companyId",
      "automationId",
      "cycleId"
    ]);
    await queryInterface.addIndex("StageAutomationExecutionLogs", [
      "cycleId",
      "actionUid"
    ]);
    await queryInterface.addIndex("StageAutomationExecutionLogs", ["opportunityId"]);
    await queryInterface.addIndex("StageAutomationExecutionLogs", ["status"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("StageAutomationExecutionLogs");
  }
};
