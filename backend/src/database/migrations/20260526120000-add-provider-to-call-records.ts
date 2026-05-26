import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable("CallRecords") as Record<string, unknown>;

    if (!table.provider) {
      await queryInterface.addColumn("CallRecords", "provider", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "manual"
      });
    }

    await queryInterface.addIndex("CallRecords", ["companyId", "provider"], {
      name: "idx_call_records_company_provider"
    }).catch(() => undefined);
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable("CallRecords") as Record<string, unknown>;

    await queryInterface.removeIndex("CallRecords", "idx_call_records_company_provider")
      .catch(() => undefined);

    if (table.provider) {
      await queryInterface.removeColumn("CallRecords", "provider");
    }
  }
};
