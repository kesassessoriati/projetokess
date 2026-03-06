import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Add aiCredits to Plans
    const plansDesc = await queryInterface.describeTable("Plans") as any;
    if (!plansDesc.aiCredits) {
      await queryInterface.addColumn("Plans", "aiCredits", {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      });
    }

    // Add aiCreditsUsed and aiCreditsLastReset to Companies
    const companiesDesc = await queryInterface.describeTable("Companies") as any;
    if (!companiesDesc.aiCreditsUsed) {
      await queryInterface.addColumn("Companies", "aiCreditsUsed", {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      });
    }
    if (!companiesDesc.aiCreditsLastReset) {
      await queryInterface.addColumn("Companies", "aiCreditsLastReset", {
        type: DataTypes.DATEONLY,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Plans", "aiCredits").catch(() => {});
    await queryInterface.removeColumn("Companies", "aiCreditsUsed").catch(() => {});
    await queryInterface.removeColumn("Companies", "aiCreditsLastReset").catch(() => {});
  },
};
