import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // ─── 1. Adicionar companyId em ChatMessages ────────────────────────────
        const tableMsgs = await queryInterface.describeTable("ChatMessages");
        if (!(tableMsgs as any).companyId) {
            await queryInterface.addColumn("ChatMessages", "companyId", {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            });

            // Backfill companyId das mensagens baseado no Chat pai
            await queryInterface.sequelize.query(`
        UPDATE "ChatMessages" cm
        SET "companyId" = c."companyId"
        FROM "Chats" c
        WHERE cm."chatId" = c.id
      `);

            await queryInterface.changeColumn("ChatMessages", "companyId", {
                type: DataTypes.INTEGER,
                allowNull: false
            });
        }

        // ─── 2. Adicionar companyId em ChatUsers ───────────────────────────────
        const tableUsers = await queryInterface.describeTable("ChatUsers");
        if (!(tableUsers as any).companyId) {
            await queryInterface.addColumn("ChatUsers", "companyId", {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            });

            // Backfill companyId baseado no Chat pai
            await queryInterface.sequelize.query(`
        UPDATE "ChatUsers" cu
        SET "companyId" = c."companyId"
        FROM "Chats" c
        WHERE cu."chatId" = c.id
      `);

            await queryInterface.changeColumn("ChatUsers", "companyId", {
                type: DataTypes.INTEGER,
                allowNull: false
            });
        }

        // ─── 3. Índices para performance ───────────────────────────────────────
        const indexesMsgs = await queryInterface.showIndex("ChatMessages") as any[];
        if (!indexesMsgs.some(i => i.name === "idx_chatmessages_company_chat")) {
            await queryInterface.addIndex("ChatMessages", ["companyId", "chatId"], {
                name: "idx_chatmessages_company_chat"
            });
        }

        const indexesUsers = await queryInterface.showIndex("ChatUsers") as any[];
        if (!indexesUsers.some(i => i.name === "idx_chatusers_company_user")) {
            await queryInterface.addIndex("ChatUsers", ["companyId", "userId"], {
                name: "idx_chatusers_company_user"
            });
        }
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeColumn("ChatMessages", "companyId");
        await queryInterface.removeColumn("ChatUsers", "companyId");
    }
};
