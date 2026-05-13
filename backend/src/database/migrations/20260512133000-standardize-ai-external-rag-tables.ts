import { QueryInterface, QueryTypes } from "sequelize";

const bases = ["empresa", "produtos", "suporte", "comercial"];

const tableExists = async (queryInterface: QueryInterface, tableName: string): Promise<boolean> => {
  const rows = await queryInterface.sequelize.query(
    `SELECT to_regclass('public.${tableName}') AS name;`,
    { type: QueryTypes.SELECT }
  ) as Array<{ name: string | null }>;

  return Boolean(rows[0]?.name);
};

const ensureRagTable = async (queryInterface: QueryInterface, tableName: string) => {
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id bigserial PRIMARY KEY,
      company_id integer NOT NULL REFERENCES "Companies"(id) ON UPDATE CASCADE ON DELETE CASCADE,
      content text NOT NULL,
      metadata jsonb DEFAULT '{}',
      embedding vector(1536),
      created_by_user_id integer NULL REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE SET NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  `);
  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS ${tableName}_embedding_idx
    ON ${tableName}
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
  `);
  await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS ${tableName}_metadata_idx ON ${tableName} USING gin (metadata);`);
  await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS ${tableName}_company_idx ON ${tableName} (company_id);`);
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query("CREATE EXTENSION IF NOT EXISTS vector;");

    for (const base of bases) {
      const oldTable = `rag_${base}`;
      const newTable = `ai_external_rag_${base}`;
      const oldExists = await tableExists(queryInterface, oldTable);
      const newExists = await tableExists(queryInterface, newTable);

      if (oldExists && !newExists) {
        await queryInterface.sequelize.query(`ALTER TABLE ${oldTable} RENAME TO ${newTable};`);
      } else {
        await ensureRagTable(queryInterface, newTable);
        if (oldExists && newExists) {
          await queryInterface.sequelize.query(`
            INSERT INTO ${newTable} (company_id, content, metadata, embedding, created_by_user_id, created_at, updated_at)
            SELECT company_id, content, metadata, embedding, created_by_user_id, created_at, updated_at
            FROM ${oldTable}
            ON CONFLICT DO NOTHING;
          `);
        }
      }

      await ensureRagTable(queryInterface, newTable);
      await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS ${newTable}_cliente_idx ON ${newTable} ((metadata->>'cliente_id'));`);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    for (const base of bases) {
      const oldTable = `rag_${base}`;
      const newTable = `ai_external_rag_${base}`;
      const oldExists = await tableExists(queryInterface, oldTable);
      const newExists = await tableExists(queryInterface, newTable);

      if (newExists && !oldExists) {
        await queryInterface.sequelize.query(`ALTER TABLE ${newTable} RENAME TO ${oldTable};`);
      }
    }
  }
};
