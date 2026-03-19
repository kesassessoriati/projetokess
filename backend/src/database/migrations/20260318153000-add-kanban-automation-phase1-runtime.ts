import { QueryInterface, DataTypes } from "sequelize";

const KANBAN_AUTOMATION_PLAN_STATUS = [
  "STALE",
  "VALID",
  "PARTIAL",
  "INVALID"
];

const KANBAN_AUTOMATION_RUN_MODE = ["shadow", "active"];
const KANBAN_AUTOMATION_RUN_STATUS = [
  "planned",
  "running",
  "completed",
  "failed",
  "cancelled",
  "skipped"
];
const KANBAN_AUTOMATION_ACTION_KIND = [
  "send_message",
  "create_task",
  "move_card",
  "assign_user",
  "add_tag",
  "remove_tag",
  "notify_internal_users",
  "schedule_follow_up"
];
const KANBAN_AUTOMATION_ACTION_STATUS = [
  "scheduled",
  "running",
  "completed",
  "failed",
  "cancelled",
  "shadowed"
];
const KANBAN_AUTOMATION_TIMER_TRIGGER_KIND = [
  "card.in_stage_for",
  "card.inactive_for"
];
const KANBAN_AUTOMATION_TIMER_STATUS = ["scheduled", "fired", "cancelled"];

async function addColumnIfMissing(
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  definition: any
) {
  const table = await queryInterface.describeTable(tableName) as Record<string, any>;
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function addIndexIfMissing(
  queryInterface: QueryInterface,
  tableName: string,
  fields: string[],
  options: any
) {
  try {
    await queryInterface.addIndex(tableName, fields, options);
  } catch (error) {
    // Index already exists or database-specific duplicate guard.
  }
}

async function tableExists(queryInterface: QueryInterface, tableName: string) {
  const tableNames = await queryInterface.showAllTables();
  const normalizedTables = tableNames.map((table: any) =>
    typeof table === "string" ? table : table.tableName
  );
  return normalizedTables.includes(tableName);
}

async function dropEnumIfExists(queryInterface: QueryInterface, enumName: string) {
  try {
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${enumName}";`);
  } catch (error) {
    // Postgres-only cleanup; safe to ignore on unsupported dialects.
  }
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await addColumnIfMissing(queryInterface, "CompaniesSettings", "kanbanAutomationCompilerEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, "CompaniesSettings", "kanbanAutomationShadowMode", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await addColumnIfMissing(queryInterface, "CompaniesSettings", "kanbanAutomationActiveMode", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, "CompaniesSettings", "kanbanAutomationLegacyFallbackEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await addColumnIfMissing(queryInterface, "kanban_automations", "runtime_plan", {
      type: DataTypes.JSONB,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "kanban_automations", "runtime_plan_version", {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "kanban_automations", "runtime_plan_compiler_version", {
      type: DataTypes.STRING(32),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "kanban_automations", "runtime_plan_source_hash", {
      type: DataTypes.STRING(64),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "kanban_automations", "runtime_plan_status", {
      type: DataTypes.ENUM(...KANBAN_AUTOMATION_PLAN_STATUS),
      allowNull: false,
      defaultValue: "STALE"
    });

    await addColumnIfMissing(queryInterface, "kanban_automations", "runtime_plan_diagnostics", {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    });

    await addColumnIfMissing(queryInterface, "kanban_automations", "last_compiled_at", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addIndexIfMissing(queryInterface, "kanban_automations", ["company_id", "status"], {
      name: "idx_kanban_automations_company_status"
    });
    await addIndexIfMissing(queryInterface, "kanban_automations", ["company_id", "runtime_plan_status"], {
      name: "idx_kanban_automations_company_plan_status"
    });
    await addIndexIfMissing(queryInterface, "kanban_automations", ["company_id", "updatedAt"], {
      name: "idx_kanban_automations_company_updated"
    });

    if (!(await tableExists(queryInterface, "kanban_automation_runs"))) {
      await queryInterface.createTable("kanban_automation_runs", {
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
        automation_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "kanban_automations", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        opportunity_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "Opportunities", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        source_event_type: {
          type: DataTypes.STRING(64),
          allowNull: false
        },
        source_event_id: {
          type: DataTypes.STRING(64),
          allowNull: false
        },
        source_idempotency_key: {
          type: DataTypes.STRING(191),
          allowNull: false
        },
        correlation_id: {
          type: DataTypes.STRING(64),
          allowNull: false
        },
        causation_id: {
          type: DataTypes.STRING(64),
          allowNull: true
        },
        mode: {
          type: DataTypes.ENUM(...KANBAN_AUTOMATION_RUN_MODE),
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM(...KANBAN_AUTOMATION_RUN_STATUS),
          allowNull: false,
          defaultValue: "planned"
        },
        trigger_match: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        conditions_match: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        runtime_plan_version: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        runtime_plan_compiler_version: {
          type: DataTypes.STRING(32),
          allowNull: false
        },
        runtime_plan_source_hash: {
          type: DataTypes.STRING(64),
          allowNull: false
        },
        diagnostics: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: []
        },
        summary: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {}
        },
        error_class: {
          type: DataTypes.STRING(64),
          allowNull: true
        },
        error_message: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        started_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        completed_at: {
          type: DataTypes.DATE,
          allowNull: true
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
    }

    await addIndexIfMissing(queryInterface, "kanban_automation_runs", ["company_id", "automation_id", "source_idempotency_key", "mode"], {
      unique: true,
      name: "uq_kanban_automation_runs_dedupe"
    });
    await addIndexIfMissing(queryInterface, "kanban_automation_runs", ["company_id", "automation_id", "createdAt"], {
      name: "idx_kanban_automation_runs_lookup"
    });
    await addIndexIfMissing(queryInterface, "kanban_automation_runs", ["company_id", "opportunity_id", "createdAt"], {
      name: "idx_kanban_automation_runs_opportunity"
    });
    await addIndexIfMissing(queryInterface, "kanban_automation_runs", ["company_id", "mode", "status", "createdAt"], {
      name: "idx_kanban_automation_runs_mode_status"
    });

    if (!(await tableExists(queryInterface, "kanban_automation_run_actions"))) {
      await queryInterface.createTable("kanban_automation_run_actions", {
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
        run_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "kanban_automation_runs", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        opportunity_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "Opportunities", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        action_node_id: {
          type: DataTypes.STRING(128),
          allowNull: false
        },
        action_kind: {
          type: DataTypes.ENUM(...KANBAN_AUTOMATION_ACTION_KIND),
          allowNull: false
        },
        sequence_no: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        delay_minutes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        scheduled_for: {
          type: DataTypes.DATE,
          allowNull: false
        },
        started_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        completed_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        cancelled_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        last_attempt_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        status: {
          type: DataTypes.ENUM(...KANBAN_AUTOMATION_ACTION_STATUS),
          allowNull: false,
          defaultValue: "scheduled"
        },
        idempotency_key: {
          type: DataTypes.STRING(191),
          allowNull: false
        },
        payload_snapshot: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {}
        },
        result_snapshot: {
          type: DataTypes.JSONB,
          allowNull: true
        },
        error_class: {
          type: DataTypes.STRING(64),
          allowNull: true
        },
        error_message: {
          type: DataTypes.TEXT,
          allowNull: true
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
    }

    await addIndexIfMissing(queryInterface, "kanban_automation_run_actions", ["company_id", "idempotency_key"], {
      unique: true,
      name: "uq_kanban_automation_run_actions_idempotency"
    });
    await addIndexIfMissing(queryInterface, "kanban_automation_run_actions", ["run_id", "sequence_no"], {
      unique: true,
      name: "uq_kanban_automation_run_actions_run_sequence"
    });
    await addIndexIfMissing(queryInterface, "kanban_automation_run_actions", ["company_id", "status", "scheduled_for"], {
      name: "idx_kanban_automation_run_actions_schedule"
    });
    await addIndexIfMissing(queryInterface, "kanban_automation_run_actions", ["run_id", "status"], {
      name: "idx_kanban_automation_run_actions_run"
    });

    if (!(await tableExists(queryInterface, "kanban_automation_timers"))) {
      await queryInterface.createTable("kanban_automation_timers", {
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
        automation_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "kanban_automations", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        opportunity_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "Opportunities", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
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
        mode: {
          type: DataTypes.ENUM(...KANBAN_AUTOMATION_RUN_MODE),
          allowNull: false
        },
        trigger_kind: {
          type: DataTypes.ENUM(...KANBAN_AUTOMATION_TIMER_TRIGGER_KIND),
          allowNull: false
        },
        threshold_minutes: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        timer_key: {
          type: DataTypes.STRING(191),
          allowNull: false
        },
        baseline_at: {
          type: DataTypes.DATE,
          allowNull: false
        },
        due_at: {
          type: DataTypes.DATE,
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM(...KANBAN_AUTOMATION_TIMER_STATUS),
          allowNull: false,
          defaultValue: "scheduled"
        },
        cancel_reason: {
          type: DataTypes.STRING(64),
          allowNull: true
        },
        source_event_id: {
          type: DataTypes.STRING(64),
          allowNull: false
        },
        source_idempotency_key: {
          type: DataTypes.STRING(191),
          allowNull: false
        },
        correlation_id: {
          type: DataTypes.STRING(64),
          allowNull: false
        },
        payload: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {}
        },
        fired_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        cancelled_at: {
          type: DataTypes.DATE,
          allowNull: true
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
    }

    await addIndexIfMissing(queryInterface, "kanban_automation_timers", ["company_id", "mode", "timer_key"], {
      unique: true,
      name: "uq_kanban_automation_timers_mode_timer_key"
    });
    await addIndexIfMissing(queryInterface, "kanban_automation_timers", ["company_id", "mode", "status", "due_at"], {
      name: "idx_kanban_automation_timers_due"
    });
    await addIndexIfMissing(queryInterface, "kanban_automation_timers", ["company_id", "opportunity_id", "status"], {
      name: "idx_kanban_automation_timers_opportunity"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("kanban_automation_timers", "idx_kanban_automation_timers_opportunity").catch(() => undefined);
    await queryInterface.removeIndex("kanban_automation_timers", "idx_kanban_automation_timers_due").catch(() => undefined);
    await queryInterface.removeIndex("kanban_automation_timers", "uq_kanban_automation_timers_mode_timer_key").catch(() => undefined);
    await queryInterface.dropTable("kanban_automation_timers").catch(() => undefined);

    await queryInterface.removeIndex("kanban_automation_run_actions", "idx_kanban_automation_run_actions_run").catch(() => undefined);
    await queryInterface.removeIndex("kanban_automation_run_actions", "idx_kanban_automation_run_actions_schedule").catch(() => undefined);
    await queryInterface.removeIndex("kanban_automation_run_actions", "uq_kanban_automation_run_actions_run_sequence").catch(() => undefined);
    await queryInterface.removeIndex("kanban_automation_run_actions", "uq_kanban_automation_run_actions_idempotency").catch(() => undefined);
    await queryInterface.dropTable("kanban_automation_run_actions").catch(() => undefined);

    await queryInterface.removeIndex("kanban_automation_runs", "idx_kanban_automation_runs_mode_status").catch(() => undefined);
    await queryInterface.removeIndex("kanban_automation_runs", "idx_kanban_automation_runs_opportunity").catch(() => undefined);
    await queryInterface.removeIndex("kanban_automation_runs", "idx_kanban_automation_runs_lookup").catch(() => undefined);
    await queryInterface.removeIndex("kanban_automation_runs", "uq_kanban_automation_runs_dedupe").catch(() => undefined);
    await queryInterface.dropTable("kanban_automation_runs").catch(() => undefined);

    await queryInterface.removeIndex("kanban_automations", "idx_kanban_automations_company_updated").catch(() => undefined);
    await queryInterface.removeIndex("kanban_automations", "idx_kanban_automations_company_plan_status").catch(() => undefined);
    await queryInterface.removeIndex("kanban_automations", "idx_kanban_automations_company_status").catch(() => undefined);

    await queryInterface.removeColumn("kanban_automations", "last_compiled_at").catch(() => undefined);
    await queryInterface.removeColumn("kanban_automations", "runtime_plan_diagnostics").catch(() => undefined);
    await queryInterface.removeColumn("kanban_automations", "runtime_plan_status").catch(() => undefined);
    await queryInterface.removeColumn("kanban_automations", "runtime_plan_source_hash").catch(() => undefined);
    await queryInterface.removeColumn("kanban_automations", "runtime_plan_compiler_version").catch(() => undefined);
    await queryInterface.removeColumn("kanban_automations", "runtime_plan_version").catch(() => undefined);
    await queryInterface.removeColumn("kanban_automations", "runtime_plan").catch(() => undefined);

    await queryInterface.removeColumn("CompaniesSettings", "kanbanAutomationLegacyFallbackEnabled").catch(() => undefined);
    await queryInterface.removeColumn("CompaniesSettings", "kanbanAutomationActiveMode").catch(() => undefined);
    await queryInterface.removeColumn("CompaniesSettings", "kanbanAutomationShadowMode").catch(() => undefined);
    await queryInterface.removeColumn("CompaniesSettings", "kanbanAutomationCompilerEnabled").catch(() => undefined);

    await dropEnumIfExists(queryInterface, "enum_kanban_automation_timers_status");
    await dropEnumIfExists(queryInterface, "enum_kanban_automation_timers_trigger_kind");
    await dropEnumIfExists(queryInterface, "enum_kanban_automation_timers_mode");
    await dropEnumIfExists(queryInterface, "enum_kanban_automation_run_actions_status");
    await dropEnumIfExists(queryInterface, "enum_kanban_automation_run_actions_action_kind");
    await dropEnumIfExists(queryInterface, "enum_kanban_automation_runs_status");
    await dropEnumIfExists(queryInterface, "enum_kanban_automation_runs_mode");
    await dropEnumIfExists(queryInterface, "enum_kanban_automations_runtime_plan_status");
  }
};
