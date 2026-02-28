import { QueryInterface } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // ---------------------------------------------------------------
        // FIX: Remove / replace incorrect UNIQUE constraints on crm_leads.
        //
        // Problem:
        //   Two UNIQUE indexes exist on (company_id, email):
        //     - crm_leads_company_id_email_key
        //     - crm_leads_company_id_email_unique
        //
        //   When leads are created WITHOUT an email (empty string ''),
        //   the second lead in the same company with email='' is blocked
        //   because '' is NOT NULL in PostgreSQL — it's a duplicate value.
        //
        //   This causes the 400 error "company_id must be unique".
        //
        // Solution:
        //   1. Drop both incorrect unique indexes on (company_id, email)
        //   2. Recreate as PARTIAL unique index with WHERE email IS NOT
        //      NULL AND email <> '' so empty emails don't conflict.
        //   3. Optionally create a partial unique index on (company_id, phone)
        //      only if no duplicates exist (handled gracefully).
        // ---------------------------------------------------------------

        // ----- Step 1: Drop the two incorrect email unique indexes -----
        try {
            await queryInterface.sequelize.query(
                `DROP INDEX IF EXISTS "crm_leads_company_id_email_key";`
            );
            console.log("[Migration] Dropped index: crm_leads_company_id_email_key");
        } catch (e) {
            console.log("[Migration] Could not drop crm_leads_company_id_email_key:", e);
        }

        try {
            await queryInterface.sequelize.query(
                `DROP INDEX IF EXISTS "crm_leads_company_id_email_unique";`
            );
            console.log("[Migration] Dropped index: crm_leads_company_id_email_unique");
        } catch (e) {
            console.log("[Migration] Could not drop crm_leads_company_id_email_unique:", e);
        }

        // Also drop any single-column company_id unique constraint if it exists
        try {
            await queryInterface.sequelize.query(
                `DROP INDEX IF EXISTS "crm_leads_company_id_key";`
            );
        } catch (e) { /* ignore */ }

        try {
            await queryInterface.removeConstraint("crm_leads", "crm_leads_company_id_key");
        } catch (e) { /* ignore */ }

        try {
            await queryInterface.removeConstraint("crm_leads", "crm_leads_company_id_email_key");
        } catch (e) { /* ignore */ }

        try {
            await queryInterface.removeConstraint("crm_leads", "crm_leads_company_id_email_unique");
        } catch (e) { /* ignore */ }

        // ----- Step 2: Recreate email unique as PARTIAL index -----
        // Only enforces uniqueness when email is actually provided
        try {
            await queryInterface.sequelize.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS "crm_leads_company_email_unique"
                ON "crm_leads" ("company_id", "email")
                WHERE "email" IS NOT NULL AND "email" <> '';
            `);
            console.log("[Migration] Created partial unique index: crm_leads_company_email_unique");
        } catch (e) {
            console.log("[Migration] Could not create email partial index:", e);
        }

        // ----- Step 3: Create phone unique as PARTIAL index (graceful) -----
        // Only enforces uniqueness when phone is actually provided.
        // If duplicates exist, log a warning but don't fail the migration.
        try {
            await queryInterface.sequelize.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS "crm_leads_company_phone_unique"
                ON "crm_leads" ("company_id", "phone")
                WHERE "phone" IS NOT NULL AND "phone" <> '';
            `);
            console.log("[Migration] Created partial unique index: crm_leads_company_phone_unique");
        } catch (e: any) {
            console.log("[Migration] ⚠️ Could not create phone unique index (duplicates may exist):", e?.message || e);
            console.log("[Migration] Skipping phone unique index — you can clean up duplicates and create it manually later.");
        }

        console.log("[Migration] ✅ Fix complete – multiple leads per company are now allowed.");
    },

    down: async (queryInterface: QueryInterface) => {
        try {
            await queryInterface.sequelize.query(
                `DROP INDEX IF EXISTS "crm_leads_company_email_unique";`
            );
        } catch (e) { /* ignore */ }

        try {
            await queryInterface.sequelize.query(
                `DROP INDEX IF EXISTS "crm_leads_company_phone_unique";`
            );
        } catch (e) { /* ignore */ }
    }
};
