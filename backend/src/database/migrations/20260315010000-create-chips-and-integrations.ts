import { DataTypes, QueryInterface } from "sequelize";

const addIndexIfNotExists = async (queryInterface: QueryInterface, table: string, fields: string[]) => {
  const indexName = `${table}_${fields.join("_")}`;
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${table}" (${fields.map(field => `"${field}"`).join(", ")})`
  );
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableNames = await queryInterface.showAllTables();
    const normalizedTables = tableNames.map((table: any) => typeof table === "string" ? table : table.tableName);

    if (!normalizedTables.includes("chips")) {
      await queryInterface.createTable("chips", {
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
        number: {
          type: DataTypes.STRING(30),
          allowNull: false
        },
        carrier: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        plan_type: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        last_recharge_at: {
          type: DataTypes.DATEONLY,
          allowNull: true
        },
        recharge_periodicity_days: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 30
        },
        recharge_value: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        predicted_block_at: {
          type: DataTypes.DATEONLY,
          allowNull: true
        },
        whatsapp_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "Whatsapps", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        device: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        responsible: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        status: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: "inactive"
        },
        health_score: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        warmup_level: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        warmup_message_limit: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 20
        },
        warmup_min_interval: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 5
        },
        warmup_max_interval: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 15
        },
        messages_sent_today: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        total_messages_sent: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        connected_minutes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        disconnect_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        blocking_risk_level: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "low"
        },
        blocking_risk_reason: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        activation_date: {
          type: DataTypes.DATEONLY,
          allowNull: true
        },
        last_connected_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        last_disconnected_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        session_status: {
          type: DataTypes.STRING(40),
          allowNull: false,
          defaultValue: "unknown"
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true
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
    }

    if (!normalizedTables.includes("chip_activity_logs")) {
      await queryInterface.createTable("chip_activity_logs", {
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
        chip_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "chips", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        event_type: {
          type: DataTypes.STRING(40),
          allowNull: false
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        event_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {}
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
    }

    await addIndexIfNotExists(queryInterface, "chips", ["company_id"]);
    await addIndexIfNotExists(queryInterface, "chips", ["company_id", "status"]);
    await addIndexIfNotExists(queryInterface, "chips", ["company_id", "predicted_block_at"]);
    await addIndexIfNotExists(queryInterface, "chips", ["whatsapp_id"]);
    await addIndexIfNotExists(queryInterface, "chips", ["company_id", "number"]);
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "chips_company_id_number_unique" ON "chips" ("company_id", "number")'
    );
    await addIndexIfNotExists(queryInterface, "chip_activity_logs", ["company_id"]);
    await addIndexIfNotExists(queryInterface, "chip_activity_logs", ["chip_id"]);
    await addIndexIfNotExists(queryInterface, "chip_activity_logs", ["event_type"]);
    await addIndexIfNotExists(queryInterface, "chip_activity_logs", ["event_date"]);

    const warmupDescription: any = await queryInterface.describeTable("WhatsappWarmups");
    if (!warmupDescription.chipId) {
      await queryInterface.addColumn("WhatsappWarmups", "chipId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "chips", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });
      await queryInterface.addIndex("WhatsappWarmups", ["chipId"]);
    }

    const buttonCampaignDescription: any = await queryInterface.describeTable("ButtonCampaigns");
    if (!buttonCampaignDescription.dispatchMode) {
      await queryInterface.addColumn("ButtonCampaigns", "dispatchMode", {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "fixed"
      });
    }
    if (!buttonCampaignDescription.chipIds) {
      await queryInterface.addColumn("ButtonCampaigns", "chipIds", {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      });
    }
    if (!buttonCampaignDescription.rotationCursor) {
      await queryInterface.addColumn("ButtonCampaigns", "rotationCursor", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    const dispatcherDescription: any = await queryInterface.describeTable("scheduled_dispatchers");
    if (!dispatcherDescription.dispatch_mode) {
      await queryInterface.addColumn("scheduled_dispatchers", "dispatch_mode", {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "fixed"
      });
    }
    if (!dispatcherDescription.chip_ids) {
      await queryInterface.addColumn("scheduled_dispatchers", "chip_ids", {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      });
    }
    if (!dispatcherDescription.rotation_cursor) {
      await queryInterface.addColumn("scheduled_dispatchers", "rotation_cursor", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const dispatcherDescription: any = await queryInterface.describeTable("scheduled_dispatchers").catch(() => null);
    if (dispatcherDescription?.rotation_cursor) {
      await queryInterface.removeColumn("scheduled_dispatchers", "rotation_cursor");
    }
    if (dispatcherDescription?.chip_ids) {
      await queryInterface.removeColumn("scheduled_dispatchers", "chip_ids");
    }
    if (dispatcherDescription?.dispatch_mode) {
      await queryInterface.removeColumn("scheduled_dispatchers", "dispatch_mode");
    }

    const buttonCampaignDescription: any = await queryInterface.describeTable("ButtonCampaigns").catch(() => null);
    if (buttonCampaignDescription?.rotationCursor) {
      await queryInterface.removeColumn("ButtonCampaigns", "rotationCursor");
    }
    if (buttonCampaignDescription?.chipIds) {
      await queryInterface.removeColumn("ButtonCampaigns", "chipIds");
    }
    if (buttonCampaignDescription?.dispatchMode) {
      await queryInterface.removeColumn("ButtonCampaigns", "dispatchMode");
    }

    const warmupDescription: any = await queryInterface.describeTable("WhatsappWarmups").catch(() => null);
    if (warmupDescription?.chipId) {
      await queryInterface.removeColumn("WhatsappWarmups", "chipId");
    }

    await queryInterface.dropTable("chip_activity_logs").catch(() => undefined);
    await queryInterface.dropTable("chips").catch(() => undefined);
  }
};
