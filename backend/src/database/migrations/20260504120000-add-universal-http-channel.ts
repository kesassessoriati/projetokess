import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const whatsappTable = (await queryInterface.describeTable("Whatsapps")) as any;

    if (!whatsappTable.universalConfig) {
      await queryInterface.addColumn("Whatsapps", "universalConfig", {
        type: DataTypes.JSONB,
        allowNull: true
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Whatsapps", "universalConfig").catch(() => undefined);
  }
};
