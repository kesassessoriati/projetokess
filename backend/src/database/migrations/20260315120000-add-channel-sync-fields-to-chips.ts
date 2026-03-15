import { DataTypes, QueryInterface } from "sequelize";

const TABLE_NAME = "chips";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const description: any = await queryInterface.describeTable(TABLE_NAME);

    if (!description.number?.allowNull) {
      await queryInterface.changeColumn(TABLE_NAME, "number", {
        type: DataTypes.STRING(30),
        allowNull: true
      });
    }

    if (!description.source_connection_name) {
      await queryInterface.addColumn(TABLE_NAME, "source_connection_name", {
        type: DataTypes.STRING(120),
        allowNull: true
      });
    }

    if (!description.source_connection_status) {
      await queryInterface.addColumn(TABLE_NAME, "source_connection_status", {
        type: DataTypes.STRING(40),
        allowNull: true
      });
    }

    if (!description.source_connection_id) {
      await queryInterface.addColumn(TABLE_NAME, "source_connection_id", {
        type: DataTypes.INTEGER,
        allowNull: true
      });
    }

    if (!description.sync_source) {
      await queryInterface.addColumn(TABLE_NAME, "sync_source", {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: "manual"
      });
    }

    if (!description.source_metadata) {
      await queryInterface.addColumn(TABLE_NAME, "source_metadata", {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      });
    }

    if (!description.last_channel_sync_at) {
      await queryInterface.addColumn(TABLE_NAME, "last_channel_sync_at", {
        type: DataTypes.DATE,
        allowNull: true
      });
    }

    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "chips_company_id_number_unique"');
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "chips_company_id_source_connection_id_unique" ON "chips" ("company_id", "source_connection_id") WHERE "source_connection_id" IS NOT NULL'
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS "chips_company_id_sync_source" ON "chips" ("company_id", "sync_source")'
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "chips_company_id_source_connection_id_unique"');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "chips_company_id_sync_source"');

    const description: any = await queryInterface.describeTable(TABLE_NAME).catch(() => null);
    if (!description) return;

    if (description.last_channel_sync_at) {
      await queryInterface.removeColumn(TABLE_NAME, "last_channel_sync_at");
    }
    if (description.source_metadata) {
      await queryInterface.removeColumn(TABLE_NAME, "source_metadata");
    }
    if (description.sync_source) {
      await queryInterface.removeColumn(TABLE_NAME, "sync_source");
    }
    if (description.source_connection_id) {
      await queryInterface.removeColumn(TABLE_NAME, "source_connection_id");
    }
    if (description.source_connection_status) {
      await queryInterface.removeColumn(TABLE_NAME, "source_connection_status");
    }
    if (description.source_connection_name) {
      await queryInterface.removeColumn(TABLE_NAME, "source_connection_name");
    }

    await queryInterface.changeColumn(TABLE_NAME, "number", {
      type: DataTypes.STRING(30),
      allowNull: false
    });

    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "chips_company_id_number_unique" ON "chips" ("company_id", "number")'
    );
  }
};
