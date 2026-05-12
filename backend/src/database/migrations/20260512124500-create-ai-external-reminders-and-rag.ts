import { QueryInterface, DataTypes } from "sequelize";

const ragTables = ["rag_empresa", "rag_produtos", "rag_suporte", "rag_comercial"];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("ai_external_reminders", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      ai_appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "ai_external_appointments", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      contact_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      ticket_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      lead_name: { type: DataTypes.STRING(200), allowNull: true },
      lead_phone: { type: DataTypes.STRING(50), allowNull: true },
      message: { type: DataTypes.TEXT, allowNull: true },
      scheduled_at: { type: DataTypes.DATE, allowNull: false },
      sent_at: { type: DataTypes.DATE, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "pending" },
      ai_paused_until: { type: DataTypes.DATE, allowNull: true },
      n8n_session_id: { type: DataTypes.STRING(160), allowNull: true },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      created_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("ai_external_reminders", ["company_id", "status"]);
    await queryInterface.addIndex("ai_external_reminders", ["company_id", "scheduled_at"]);

    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');

    for (const table of ragTables) {
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS ${table} (
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
        CREATE INDEX IF NOT EXISTS ${table}_embedding_idx
        ON ${table}
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `);
      await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS ${table}_metadata_idx ON ${table} USING gin (metadata);`);
      await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS ${table}_company_idx ON ${table} (company_id);`);
      await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS ${table}_cliente_idx ON ${table} ((metadata->>'cliente_id'));`);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ai_external_reminders");
    for (const table of ragTables) {
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS ${table};`);
    }
  }
};
