import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("AiExternalFollowUpConfigs", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      prompt: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      abandonmentMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 120
      },
      cooldownHours: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 24
      },
      maxPerRun: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      maxPerDay: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      minDelaySeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60
      },
      maxDelaySeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 180
      },
      ignoreCompanyAiPaused: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("AiExternalFollowUpConfigs");
  }
};
