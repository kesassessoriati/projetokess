import { QueryInterface, QueryTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Reativar empresas com plano ilimitado que foram indevidamente desativadas pelo cron
    await queryInterface.sequelize.query(
      `UPDATE "Companies"
       SET status = true
       WHERE (billing_cycle = 'unlimited' OR recurrence = 'Ilimitado')
         AND status = false`,
      { type: QueryTypes.UPDATE }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    // Não é possível reverter com segurança — não sabemos quais estavam inativas por motivos legítimos
  },
};
