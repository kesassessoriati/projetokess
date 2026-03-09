import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("WhatsappWarmupSessions", {
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
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "draft"
      },
      scriptMode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "manual"
      },
      connectionIds: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },
      starterWhatsappId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      turns: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3
      },
      minIntervalSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 8
      },
      maxIntervalSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      endedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      currentTurn: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      currentStep: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      messagesSent: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      failureReason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      aiConfig: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      scriptSteps: {
        type: DataTypes.JSONB,
        allowNull: false,
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
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("WhatsappWarmupSessions");
  }
};
