import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("ai_external_appointments", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      config_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "ai_external_agent_configs", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "appointments", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      crm_lead_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "crm_leads", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      contact_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      ticket_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      pipeline_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Pipelines", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "PipelineStages", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      schedule_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "user_schedules", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "servicos", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      lead_name: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      lead_phone: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      lead_email: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      lead_document: {
        type: DataTypes.STRING(80),
        allowNull: true
      },
      start_datetime: {
        type: DataTypes.DATE,
        allowNull: false
      },
      duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "scheduled"
      },
      reminder_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      ai_paused_until: {
        type: DataTypes.DATE,
        allowNull: true
      },
      cancellation_reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      n8n_session_id: {
        type: DataTypes.STRING(160),
        allowNull: true
      },
      source: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: "crm"
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      created_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("ai_external_appointments", ["company_id", "status"]);
    await queryInterface.addIndex("ai_external_appointments", ["company_id", "start_datetime"]);
    await queryInterface.addIndex("ai_external_appointments", ["company_id", "lead_phone"]);
    await queryInterface.addIndex("ai_external_appointments", ["appointment_id"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ai_external_appointments");
  }
};
