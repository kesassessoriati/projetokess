import { QueryInterface } from "sequelize";

/**
 * Reinforces the Kanban product rule after duplicate OPEN cards are consolidated:
 * one OPEN card per contact/lead in the same pipeline.
 *
 * Do not run this before cleaning existing duplicates, otherwise PostgreSQL will
 * reject the unique indexes.
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS opportunities_unique_open_contact_per_pipeline
      ON "Opportunities" ("companyId", "pipelineId", "contactId")
      WHERE "contactId" IS NOT NULL AND "status" = 'OPEN';
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS opportunities_unique_open_lead_per_pipeline
      ON "Opportunities" ("companyId", "pipelineId", "leadId")
      WHERE "leadId" IS NOT NULL AND "status" = 'OPEN';
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS opportunities_unique_open_contact_per_pipeline;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS opportunities_unique_open_lead_per_pipeline;
    `);
  }
};
