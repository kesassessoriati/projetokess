import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("AdTrackingIntegrations", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      provider: {
        type: DataTypes.ENUM("meta", "google"),
        allowNull: false
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      credentials: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.createTable("AdTrackingMappings", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      provider: {
        type: DataTypes.ENUM("meta", "google"),
        allowNull: false
      },
      integrationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "AdTrackingIntegrations", key: "id" },
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
      eventName: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      customEventName: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.createTable("AdTrackingEvents", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      provider: {
        type: DataTypes.ENUM("meta", "google"),
        allowNull: false
      },
      integrationId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      mappingId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      leadId: {
        type: DataTypes.INTEGER,
        allowNull: true
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
      pipelineId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      stageId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      eventName: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      response: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM("success", "failed", "skipped"),
        allowNull: false,
        defaultValue: "skipped"
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("AdTrackingIntegrations", ["companyId", "provider"], {
      name: "ad_tracking_integrations_company_provider"
    });
    await queryInterface.addIndex("AdTrackingMappings", ["companyId", "pipelineId", "stageId"], {
      name: "ad_tracking_mappings_company_pipeline_stage"
    });
    await queryInterface.addIndex("AdTrackingEvents", ["companyId", "createdAt"], {
      name: "ad_tracking_events_company_created"
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("AdTrackingEvents");
    await queryInterface.dropTable("AdTrackingMappings");
    await queryInterface.dropTable("AdTrackingIntegrations");
  }
};
