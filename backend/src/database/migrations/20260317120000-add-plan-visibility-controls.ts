import { QueryInterface, DataTypes } from "sequelize";

const planColumns = [
  "notifica_mehub",
  "whatsapp_whatsmeow",
  "whatsapp_whaleys",
  "email",
  "gestor_financas",
  "gestor_financeiro_ia"
] as const;

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const plansDesc = await queryInterface.describeTable("Plans") as Record<string, any>;

    for (const column of planColumns) {
      if (!plansDesc[column]) {
        await queryInterface.addColumn("Plans", column, {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        });
      }
    }
  },

  down: async (queryInterface: QueryInterface) => {
    for (const column of planColumns) {
      await queryInterface.removeColumn("Plans", column).catch(() => {});
    }
  }
};
