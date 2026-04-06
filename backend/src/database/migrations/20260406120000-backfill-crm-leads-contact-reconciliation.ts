import { QueryInterface, QueryTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1) Link old leads to the correct contacts when there is a single safe
    // phone match inside the same company.
    await queryInterface.sequelize.query(
      `
      WITH lead_base AS (
        SELECT
          l.id AS lead_id,
          l.company_id,
          regexp_replace(COALESCE(l.phone, ''), '\\D', '', 'g') AS lead_digits,
          CASE
            WHEN regexp_replace(COALESCE(l.phone, ''), '\\D', '', 'g') ~ '^55\\d{2}9\\d{8}$'
              THEN '55' || substring(regexp_replace(COALESCE(l.phone, ''), '\\D', '', 'g') FROM 3 FOR 2) || substring(regexp_replace(COALESCE(l.phone, ''), '\\D', '', 'g') FROM 6)
            WHEN regexp_replace(COALESCE(l.phone, ''), '\\D', '', 'g') ~ '^\\d{2}9\\d{8}$'
              THEN substring(regexp_replace(COALESCE(l.phone, ''), '\\D', '', 'g') FROM 1 FOR 2) || substring(regexp_replace(COALESCE(l.phone, ''), '\\D', '', 'g') FROM 4)
            ELSE regexp_replace(COALESCE(l.phone, ''), '\\D', '', 'g')
          END AS lead_canonical
        FROM crm_leads l
        WHERE l.contact_id IS NULL
          AND COALESCE(l.phone, '') <> ''
      ),
      contact_base AS (
        SELECT
          c.id AS contact_id,
          c."companyId" AS company_id,
          c.number,
          c.name,
          c."updatedAt" AS updated_at,
          CASE
            WHEN regexp_replace(COALESCE(c.number, ''), '\\D', '', 'g') ~ '^55\\d{2}9\\d{8}$'
              THEN '55' || substring(regexp_replace(COALESCE(c.number, ''), '\\D', '', 'g') FROM 3 FOR 2) || substring(regexp_replace(COALESCE(c.number, ''), '\\D', '', 'g') FROM 6)
            WHEN regexp_replace(COALESCE(c.number, ''), '\\D', '', 'g') ~ '^\\d{2}9\\d{8}$'
              THEN substring(regexp_replace(COALESCE(c.number, ''), '\\D', '', 'g') FROM 1 FOR 2) || substring(regexp_replace(COALESCE(c.number, ''), '\\D', '', 'g') FROM 4)
            ELSE regexp_replace(COALESCE(c.number, ''), '\\D', '', 'g')
          END AS contact_canonical
        FROM "Contacts" c
        WHERE COALESCE(c."isGroup", false) = false
          AND COALESCE(c.number, '') <> ''
      ),
      matches AS (
        SELECT
          lb.lead_id,
          cb.contact_id,
          row_number() OVER (
            PARTITION BY lb.lead_id
            ORDER BY
              CASE WHEN cb.number = lb.lead_digits THEN 0 ELSE 1 END,
              cb.updated_at DESC,
              cb.contact_id DESC
          ) AS rn,
          count(*) OVER (PARTITION BY lb.lead_id) AS match_count
        FROM lead_base lb
        INNER JOIN contact_base cb
          ON cb.company_id = lb.company_id
         AND cb.contact_canonical <> ''
         AND cb.contact_canonical = lb.lead_canonical
      )
      UPDATE crm_leads l
      SET contact_id = m.contact_id
      FROM matches m
      WHERE l.id = m.lead_id
        AND m.rn = 1
        AND m.match_count = 1;
      `,
      { type: QueryTypes.UPDATE }
    );

    // 2) Fill lead name/phone from the linked contact when the lead is still
    // empty or stuck with the fallback "Contato sem nome".
    await queryInterface.sequelize.query(
      `
      UPDATE crm_leads l
      SET
        phone = CASE
          WHEN COALESCE(NULLIF(l.phone, ''), '') = '' AND COALESCE(c.number, '') <> ''
            THEN c.number
          ELSE l.phone
        END,
        name = CASE
          WHEN (
            l.name IS NULL
            OR btrim(l.name) = ''
            OR l.name ~* '^Contato sem nome(?:\\s+\\d+)?$'
          )
          AND COALESCE(c.name, '') <> ''
          AND c.name !~* '^Contato sem nome(?:\\s+\\d+)?$'
          AND regexp_replace(c.name, '\\s+', '', 'g') !~ '^\\+?\\d+$'
            THEN c.name
          ELSE l.name
        END
      FROM "Contacts" c
      WHERE l.contact_id = c.id
        AND l.company_id = c."companyId"
        AND (
          (COALESCE(NULLIF(l.phone, ''), '') = '' AND COALESCE(c.number, '') <> '')
          OR (
            (l.name IS NULL OR btrim(l.name) = '' OR l.name ~* '^Contato sem nome(?:\\s+\\d+)?$')
            AND COALESCE(c.name, '') <> ''
            AND c.name !~* '^Contato sem nome(?:\\s+\\d+)?$'
            AND regexp_replace(c.name, '\\s+', '', 'g') !~ '^\\+?\\d+$'
          )
        );
      `,
      { type: QueryTypes.UPDATE }
    );
  },

  down: async () => {
    // Reconciliation backfill cannot be reverted safely.
  }
};
