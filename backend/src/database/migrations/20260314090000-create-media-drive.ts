import { DataTypes } from "sequelize";

const addIndexIfNotExists = async (queryInterface: any, table: string, fields: string[]) => {
  const indexName = `${table}_${fields.join("_")}`;
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${table}" (${fields.map(f => `"${f}"`).join(", ")})`
  );
};

module.exports = {
  up: async (queryInterface: any) => {
    const tableNames: string[] = await queryInterface.showAllTables();

    if (!tableNames.includes("media_folders")) {
      await queryInterface.createTable("media_folders", {
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
        parent_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "media_folders", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        description: {
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

    if (!tableNames.includes("media_files")) {
      await queryInterface.createTable("media_files", {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        folder_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "media_folders", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        original_name: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        custom_name: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        mime_type: {
          type: DataTypes.STRING(128),
          allowNull: false
        },
        size: {
          type: DataTypes.BIGINT,
          allowNull: false
        },
        storage_path: {
          type: DataTypes.TEXT,
          allowNull: false
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

    // Ensure parent_id column exists before indexing (table may have been created without it)
    const [[{ count: parentIdCount }]]: any = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS count FROM information_schema.columns
       WHERE table_name = 'media_folders' AND column_name = 'parent_id'`
    );
    if (Number(parentIdCount) === 0) {
      await queryInterface.addColumn("media_folders", "parent_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "media_folders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      });
    }

    await addIndexIfNotExists(queryInterface, "media_folders", ["company_id"]);
    await addIndexIfNotExists(queryInterface, "media_folders", ["parent_id"]);
    await addIndexIfNotExists(queryInterface, "media_files", ["company_id"]);
    await addIndexIfNotExists(queryInterface, "media_files", ["folder_id"]);
  },

  down: async (queryInterface: any) => {
    await queryInterface.dropTable("media_files");
    await queryInterface.dropTable("media_folders");
  }
};
