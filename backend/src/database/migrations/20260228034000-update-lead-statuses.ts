import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        const mappings: { [key: string]: string } = {
            new: "novo",
            contacted: "contactado",
            qualified: "qualificado",
            scheduled: "reuniao_agendada",
            unqualified: "nao_qualificado",
            converted: "convertido",
            lost: "perdido"
        };

        for (const [oldStatus, newStatus] of Object.entries(mappings)) {
            await queryInterface.sequelize.query(
                `UPDATE "crm_leads" SET status = '${newStatus}' WHERE status = '${oldStatus}';` // Changed single quotes just in case, postgres accepts "crm_leads"
            );
        }
    },

    down: async (queryInterface: QueryInterface) => {
        const mappings: { [key: string]: string } = {
            novo: "new",
            contactado: "contacted",
            qualificado: "qualified",
            reuniao_agendada: "scheduled",
            nao_qualificado: "unqualified",
            convertido: "converted",
            perdido: "lost"
        };

        for (const [oldStatus, newStatus] of Object.entries(mappings)) {
            await queryInterface.sequelize.query(
                `UPDATE "crm_leads" SET status = '${newStatus}' WHERE status = '${oldStatus}';`
            );
        }
    }
};
