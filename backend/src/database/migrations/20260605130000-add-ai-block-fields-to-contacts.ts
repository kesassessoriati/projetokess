import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface, Sequelize: typeof DataTypes) => {
    const cols = await queryInterface.describeTable("Contacts") as Record<string, any>;

    if (!cols.aiBlockedUntil) {
      await queryInterface.addColumn("Contacts", "aiBlockedUntil", {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!cols.aiBlockMode) {
      await queryInterface.addColumn("Contacts", "aiBlockMode", {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!cols.aiBlockedByStageId) {
      await queryInterface.addColumn("Contacts", "aiBlockedByStageId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const cols = await queryInterface.describeTable("Contacts") as Record<string, any>;

    if (cols.aiBlockedByStageId) {
      await queryInterface.removeColumn("Contacts", "aiBlockedByStageId");
    }
    if (cols.aiBlockMode) {
      await queryInterface.removeColumn("Contacts", "aiBlockMode");
    }
    if (cols.aiBlockedUntil) {
      await queryInterface.removeColumn("Contacts", "aiBlockedUntil");
    }
  },
};
