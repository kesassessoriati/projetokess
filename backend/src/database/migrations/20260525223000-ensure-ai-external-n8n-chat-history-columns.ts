import { QueryInterface, DataTypes } from "sequelize";

const TABLE_NAME = "ai_external_n8n_chat_histories";

const INDEXES = {
  sessionId: "idx_ai_external_n8n_chat_histories_session_id",
  createdAt: "idx_ai_external_n8n_chat_histories_created_at",
  sessionCreatedAt: "idx_ai_external_n8n_chat_histories_session_created_at"
};

const describeTable = async (queryInterface: QueryInterface): Promise<any | null> => {
  try {
    return await queryInterface.describeTable(TABLE_NAME);
  } catch {
    return null;
  }
};

const hasIndex = (indexes: any[], name: string): boolean =>
  indexes.some(index => index.name === name);

const addIndexIfMissing = async (
  queryInterface: QueryInterface,
  indexes: any[],
  fields: string[],
  name: string
) => {
  if (!hasIndex(indexes, name)) {
    await queryInterface.addIndex(TABLE_NAME, fields, { name }).catch(() => undefined);
  }
};

const backfillCreatedAt = async (queryInterface: QueryInterface) => {
  await queryInterface.sequelize.query(`
    UPDATE ${TABLE_NAME}
    SET created_at = NOW()
    WHERE created_at IS NULL
  `);
};

const backfillUpdatedAt = async (queryInterface: QueryInterface) => {
  await queryInterface.sequelize.query(`
    UPDATE ${TABLE_NAME}
    SET updated_at = COALESCE(created_at, NOW())
    WHERE updated_at IS NULL
  `);
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    let table = await describeTable(queryInterface);

    if (!table) {
      await queryInterface.createTable(TABLE_NAME, {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        session_id: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        message: {
          type: DataTypes.JSONB,
          allowNull: true
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: DataTypes.NOW
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: DataTypes.NOW
        }
      });

      table = await describeTable(queryInterface);
    }

    if (!table.session_id) {
      await queryInterface.addColumn(TABLE_NAME, "session_id", {
        type: DataTypes.TEXT,
        allowNull: true
      });
      table = await describeTable(queryInterface);
    }

    if (!table.message) {
      await queryInterface.addColumn(TABLE_NAME, "message", {
        type: DataTypes.JSONB,
        allowNull: true
      });
      table = await describeTable(queryInterface);
    }

    if (!table.created_at) {
      await queryInterface.addColumn(TABLE_NAME, "created_at", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
      });
      table = await describeTable(queryInterface);
    }

    await backfillCreatedAt(queryInterface);

    if (!table.updated_at) {
      await queryInterface.addColumn(TABLE_NAME, "updated_at", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
      });
      table = await describeTable(queryInterface);
    }

    await backfillUpdatedAt(queryInterface);

    const indexes = await queryInterface.showIndex(TABLE_NAME).catch(() => []);
    await addIndexIfMissing(queryInterface, indexes as any[], ["session_id"], INDEXES.sessionId);
    await addIndexIfMissing(queryInterface, indexes as any[], ["created_at"], INDEXES.createdAt);
    await addIndexIfMissing(
      queryInterface,
      indexes as any[],
      ["session_id", "created_at"],
      INDEXES.sessionCreatedAt
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex(TABLE_NAME, INDEXES.sessionCreatedAt).catch(() => undefined);
    await queryInterface.removeIndex(TABLE_NAME, INDEXES.createdAt).catch(() => undefined);
    await queryInterface.removeIndex(TABLE_NAME, INDEXES.sessionId).catch(() => undefined);
  }
};
