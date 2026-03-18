import { QueryInterface, DataTypes, Sequelize } from "sequelize";

const ensureColumn = async (
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  definition: any
) => {
  const table = await queryInterface.describeTable(tableName) as Record<string, any>;
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await ensureColumn(queryInterface, "Plans", "aiEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await ensureColumn(queryInterface, "Plans", "aiDailyCredits", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await ensureColumn(queryInterface, "Plans", "aiAgentEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.sequelize.query(`
      UPDATE "Plans"
      SET "aiEnabled" = COALESCE("useOpenAi", false)
      WHERE "aiEnabled" IS DISTINCT FROM COALESCE("useOpenAi", false)
    `);

    await queryInterface.sequelize.query(`
      UPDATE "Plans"
      SET "aiAgentEnabled" = COALESCE("useOpenAi", false)
      WHERE "aiAgentEnabled" IS DISTINCT FROM COALESCE("useOpenAi", false)
    `);

    await queryInterface.sequelize.query(`
      UPDATE "Plans"
      SET "aiDailyCredits" = COALESCE("aiCredits", 0)
      WHERE "aiDailyCredits" IS DISTINCT FROM COALESCE("aiCredits", 0)
    `);

    await ensureColumn(queryInterface, "Companies", "aiUsageMode", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "system"
    });

    await ensureColumn(queryInterface, "Companies", "aiPreferredProvider", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "openai"
    });

    await ensureColumn(queryInterface, "Prompts", "aiUsageMode", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "company_default"
    });

    await ensureColumn(queryInterface, "Prompts", "templateKey", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await ensureColumn(queryInterface, "Prompts", "description", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.changeColumn("Prompts", "apiKey", {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ""
    }).catch((err: any) => {
      console.warn("[Migration] changeColumn Prompts.apiKey ignorado:", err?.message);
    });

    await queryInterface.createTable("AIUsageLogs", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Companies",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      promptId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Prompts",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      provider: {
        type: DataTypes.STRING,
        allowNull: false
      },
      usageMode: {
        type: DataTypes.STRING,
        allowNull: false
      },
      requestType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "agent"
      },
      model: {
        type: DataTypes.STRING,
        allowNull: true
      },
      creditsConsumed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "success"
      },
      errorCode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW")
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW")
      }
    }).catch(() => undefined);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("AIUsageLogs").catch(() => undefined);
    await queryInterface.removeColumn("Prompts", "description").catch(() => undefined);
    await queryInterface.removeColumn("Prompts", "templateKey").catch(() => undefined);
    await queryInterface.removeColumn("Prompts", "aiUsageMode").catch(() => undefined);
    await queryInterface.removeColumn("Companies", "aiPreferredProvider").catch(() => undefined);
    await queryInterface.removeColumn("Companies", "aiUsageMode").catch(() => undefined);
    await queryInterface.removeColumn("Plans", "aiAgentEnabled").catch(() => undefined);
    await queryInterface.removeColumn("Plans", "aiDailyCredits").catch(() => undefined);
    await queryInterface.removeColumn("Plans", "aiEnabled").catch(() => undefined);
  }
};
