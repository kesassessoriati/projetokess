import { QueryInterface } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // ---------------------------------------------------------------
        // FIX: Remove incorrect UNIQUE constraint on company_id alone.
        //
        // The constraint "company_id must be unique" prevents creating
        // more than one lead per company, which is wrong – a company
        // (tenant) must be able to have many leads.
        //
        // Strategy:
        //   1. Query pg_indexes to find which index enforces the unique
        //      on company_id (could be named crm_leads_company_id,
        //      crm_leads_company_id_key, crm_leads_companyId, etc.).
        //   2. Drop every unique index that covers ONLY company_id.
        //   3. Keep any composite indexes that include company_id with
        //      other columns.
        // ---------------------------------------------------------------

        const [results] = await queryInterface.sequelize.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'crm_leads'
              AND indexdef ILIKE '%unique%'
              AND indexdef ILIKE '%company_id%';
        `);

        console.log("[Migration] Unique indexes containing company_id on crm_leads:", results);

        for (const row of results as any[]) {
            const indexDef: string = row.indexdef || "";
            const indexName: string = row.indexname || "";

            // Only drop indexes that are UNIQUE and reference company_id ALONE
            // (i.e., do NOT drop composite unique indexes like (company_id, phone))
            // A simple heuristic: if the index definition has only one column
            // inside the parentheses, it's a single-column index.
            const match = indexDef.match(/\(([^)]+)\)/);
            if (match) {
                const columns = match[1]
                    .split(",")
                    .map((c: string) => c.trim().replace(/"/g, "").toLowerCase());

                if (columns.length === 1 && columns[0] === "company_id") {
                    console.log(`[Migration] Dropping incorrect unique index: ${indexName}`);
                    await queryInterface.sequelize.query(
                        `DROP INDEX IF EXISTS "${indexName}";`
                    );
                    console.log(`[Migration] Dropped index: ${indexName}`);
                } else {
                    console.log(
                        `[Migration] Keeping composite unique index: ${indexName} (columns: ${columns.join(", ")})`
                    );
                }
            }
        }

        // Also try to drop a UNIQUE constraint (not just index) if it exists
        // Sequelize sometimes creates these as actual table constraints.
        try {
            await queryInterface.removeConstraint("crm_leads", "crm_leads_company_id_key");
            console.log("[Migration] Dropped constraint: crm_leads_company_id_key");
        } catch (e) {
            console.log("[Migration] Constraint crm_leads_company_id_key not found (OK).");
        }

        try {
            await queryInterface.removeConstraint("crm_leads", "crm_leads_companyId_key");
            console.log("[Migration] Dropped constraint: crm_leads_companyId_key");
        } catch (e) {
            console.log("[Migration] Constraint crm_leads_companyId_key not found (OK).");
        }

        try {
            await queryInterface.removeConstraint("crm_leads", "crm_leads_company_id_unique");
            console.log("[Migration] Dropped constraint: crm_leads_company_id_unique");
        } catch (e) {
            console.log("[Migration] Constraint crm_leads_company_id_unique not found (OK).");
        }

        // ---------------------------------------------------------------
        // OPTIONAL: Create a composite unique index on (company_id, phone)
        // so the same phone number cannot have duplicate leads within the
        // same company, but different companies can have the same phone.
        //
        // Using a partial index (WHERE phone IS NOT NULL) so that leads
        // without a phone number are always allowed.
        // ---------------------------------------------------------------
        try {
            await queryInterface.sequelize.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS "crm_leads_company_phone_unique"
                ON "crm_leads" ("company_id", "phone")
                WHERE "phone" IS NOT NULL AND "phone" <> '';
            `);
            console.log("[Migration] Created composite unique index: crm_leads_company_phone_unique");
        } catch (e) {
            console.log("[Migration] Composite index crm_leads_company_phone_unique may already exist:", e);
        }

        console.log("[Migration] ✅ Fix complete – multiple leads per company are now allowed.");
    },

    down: async (queryInterface: QueryInterface) => {
        // Reverse: drop the composite index (not recommended to re-add the broken unique)
        try {
            await queryInterface.sequelize.query(
                `DROP INDEX IF EXISTS "crm_leads_company_phone_unique";`
            );
        } catch (e) {
            console.log("[Migration] Could not drop crm_leads_company_phone_unique:", e);
        }
    }
};
