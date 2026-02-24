import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        const tableDescription = await queryInterface.describeTable("TicketNotes");

        // ─── 1. Adiciona companyId (isolamento multi-tenant) ───────────────────
        if (!(tableDescription as any).companyId) {
            await queryInterface.addColumn("TicketNotes", "companyId", {
                type: DataTypes.INTEGER,
                allowNull: true, // Temporariamente nullable para backfill
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            });

            // Backfill: preenche companyId a partir do Ticket associado
            await queryInterface.sequelize.query(`
        UPDATE "TicketNotes" tn
        SET "companyId" = t."companyId"
        FROM "Tickets" t
        WHERE tn."ticketId" = t.id
          AND tn."companyId" IS NULL
      `);

            // Torna NOT NULL após backfill
            await queryInterface.changeColumn("TicketNotes", "companyId", {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            });
        }

        // ─── 2. Adiciona isPrivate (visibilidade da nota) ──────────────────────
        if (!(tableDescription as any).isPrivate) {
            await queryInterface.addColumn("TicketNotes", "isPrivate", {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true // Novas notas são privadas por padrão
            });
        }

        // ─── 3. Índices compostos para performance e isolamento ─────────────────
        const indexes = await queryInterface.showIndex("TicketNotes") as any[];
        const indexNames = indexes.map((i: any) => i.name);

        if (!indexNames.includes("idx_ticketnotes_company")) {
            await queryInterface.addIndex("TicketNotes", ["companyId"], {
                name: "idx_ticketnotes_company"
            });
        }

        if (!indexNames.includes("idx_ticketnotes_ticket_company")) {
            await queryInterface.addIndex("TicketNotes", ["ticketId", "companyId"], {
                name: "idx_ticketnotes_ticket_company"
            });
        }

        if (!indexNames.includes("idx_ticketnotes_company_private")) {
            await queryInterface.addIndex("TicketNotes", ["companyId", "isPrivate"], {
                name: "idx_ticketnotes_company_private"
            });
        }
    },

    down: async (queryInterface: QueryInterface) => {
        const indexes = await queryInterface.showIndex("TicketNotes") as any[];
        const indexNames = indexes.map((i: any) => i.name);

        if (indexNames.includes("idx_ticketnotes_company_private")) {
            await queryInterface.removeIndex("TicketNotes", "idx_ticketnotes_company_private");
        }
        if (indexNames.includes("idx_ticketnotes_ticket_company")) {
            await queryInterface.removeIndex("TicketNotes", "idx_ticketnotes_ticket_company");
        }
        if (indexNames.includes("idx_ticketnotes_company")) {
            await queryInterface.removeIndex("TicketNotes", "idx_ticketnotes_company");
        }

        const tableDescription = await queryInterface.describeTable("TicketNotes");
        if ((tableDescription as any).isPrivate) {
            await queryInterface.removeColumn("TicketNotes", "isPrivate");
        }
        if ((tableDescription as any).companyId) {
            await queryInterface.removeColumn("TicketNotes", "companyId");
        }
    }
};
