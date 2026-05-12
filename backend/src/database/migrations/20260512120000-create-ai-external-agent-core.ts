import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("ai_external_agent_configs", {
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
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        defaultValue: "Agente Externo N8N"
      },
      system_prompt: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ""
      },
      active_prompt_version_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      n8n_webhook_url: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      webhook_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
      updated_by_user_id: {
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

    await queryInterface.addIndex("ai_external_agent_configs", ["company_id"], {
      unique: true,
      name: "ai_external_agent_configs_company_id_unique"
    });

    await queryInterface.createTable("ai_external_prompt_versions", {
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
        allowNull: false,
        references: { model: "ai_external_agent_configs", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      change_note: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      restored_from_version_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "ai_external_prompt_versions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    await queryInterface.addIndex("ai_external_prompt_versions", ["company_id"]);
    await queryInterface.addIndex("ai_external_prompt_versions", ["config_id", "version"], {
      unique: true,
      name: "ai_external_prompt_versions_config_version_unique"
    });
    await queryInterface.addIndex("ai_external_prompt_versions", ["config_id", "is_active"]);

    await queryInterface.createTable("ai_external_agent_events", {
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
      prompt_version_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "ai_external_prompt_versions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      event_type: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "pending"
      },
      target_url: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      response_status: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      response_body: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      attempt: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: true
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

    await queryInterface.addIndex("ai_external_agent_events", ["company_id", "event_type"]);
    await queryInterface.addIndex("ai_external_agent_events", ["company_id", "status"]);
    await queryInterface.addIndex("ai_external_agent_events", ["config_id", "created_at"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ai_external_agent_events");
    await queryInterface.dropTable("ai_external_prompt_versions");
    await queryInterface.dropTable("ai_external_agent_configs");
  }
};
