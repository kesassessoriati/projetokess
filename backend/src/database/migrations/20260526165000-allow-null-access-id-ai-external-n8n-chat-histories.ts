import { QueryInterface } from "sequelize";

const TABLE_NAME = "ai_external_n8n_chat_histories";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF to_regclass('public.${TABLE_NAME}') IS NOT NULL THEN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = '${TABLE_NAME}'
              AND column_name = 'access_id'
          ) THEN
            ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "access_id" DROP NOT NULL;
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = '${TABLE_NAME}'
              AND column_name = 'created_at'
          ) THEN
            ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "created_at" SET DEFAULT NOW();

            UPDATE "${TABLE_NAME}"
            SET "created_at" = NOW()
            WHERE "created_at" IS NULL;
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = '${TABLE_NAME}'
              AND column_name = 'updated_at'
          ) THEN
            ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "updated_at" SET DEFAULT NOW();

            UPDATE "${TABLE_NAME}"
            SET "updated_at" = COALESCE("created_at", NOW())
            WHERE "updated_at" IS NULL;
          END IF;
        END IF;
      END $$;
    `);
  },

  down: async () => {
    // Intentionally empty: restoring NOT NULL/defaults could break rows created by n8n.
  }
};
