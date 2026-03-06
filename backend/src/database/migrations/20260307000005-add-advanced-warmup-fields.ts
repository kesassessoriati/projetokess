import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDesc = await queryInterface.describeTable("WhatsappWarmups") as any;

    if (!tableDesc.warmupMode) {
      await queryInterface.addColumn("WhatsappWarmups", "warmupMode", {
        type: DataTypes.STRING(20),
        defaultValue: "private",
        allowNull: false,
      });
    }
    if (!tableDesc.useGroupsMode) {
      await queryInterface.addColumn("WhatsappWarmups", "useGroupsMode", {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      });
    }
    if (!tableDesc.useCrossMode) {
      await queryInterface.addColumn("WhatsappWarmups", "useCrossMode", {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      });
    }
    if (!tableDesc.scriptTemplates) {
      await queryInterface.addColumn("WhatsappWarmups", "scriptTemplates", {
        type: DataTypes.JSON,
        allowNull: true,
      });
    }
    if (!tableDesc.dailyRampUp) {
      await queryInterface.addColumn("WhatsappWarmups", "dailyRampUp", {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      });
    }
    if (!tableDesc.rampUpDay) {
      await queryInterface.addColumn("WhatsappWarmups", "rampUpDay", {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      });
    }
    if (!tableDesc.rampUpStartMessages) {
      await queryInterface.addColumn("WhatsappWarmups", "rampUpStartMessages", {
        type: DataTypes.INTEGER,
        defaultValue: 5,
      });
    }
    if (!tableDesc.lastResetDate) {
      await queryInterface.addColumn("WhatsappWarmups", "lastResetDate", {
        type: DataTypes.DATEONLY,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    for (const col of ["warmupMode","useGroupsMode","useCrossMode","scriptTemplates","dailyRampUp","rampUpDay","rampUpStartMessages","lastResetDate"]) {
      await queryInterface.removeColumn("WhatsappWarmups", col).catch(() => {});
    }
  },
};
