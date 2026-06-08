import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("AiExternalFollowUpLogs", {
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
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      sessionId: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      messageId: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM("pending", "processing", "sent", "skipped", "failed"),
        allowNull: false,
        defaultValue: "pending"
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      detectedIntent: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      detectedStage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      lastUserMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      lastAgentMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      conversationSummary: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      generatedMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      sentAt: {
        type: DataTypes.DATE(6),
        allowNull: true
      },
      scheduledAt: {
        type: DataTypes.DATE(6),
        allowNull: true
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
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

    await queryInterface.addIndex("AiExternalFollowUpLogs", ["companyId"]);
    await queryInterface.addIndex("AiExternalFollowUpLogs", ["contactId"]);
    await queryInterface.addIndex("AiExternalFollowUpLogs", ["ticketId"]);
    await queryInterface.addIndex("AiExternalFollowUpLogs", ["status"]);
    await queryInterface.addIndex("AiExternalFollowUpLogs", ["scheduledAt"]);
    await queryInterface.addIndex("AiExternalFollowUpLogs", ["sentAt"]);
    await queryInterface.addIndex("AiExternalFollowUpLogs", ["companyId", "contactId", "createdAt"]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("AiExternalFollowUpLogs");
  }
};
