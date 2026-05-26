import { QueryInterface } from "sequelize";

const TABLE_NAME = "ai_external_n8n_chat_histories";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = '${TABLE_NAME}'
            AND column_name = 'company_id'
        ) THEN
          ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "company_id" DROP NOT NULL;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = '${TABLE_NAME}'
            AND column_name = 'companyId'
        ) THEN
          ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "companyId" DROP NOT NULL;
        END IF;
      END $$;
    `);
  },

  down: async () => {
    // Intentionally left empty: restoring NOT NULL could fail on rows created by n8n without company_id.
  }
};
