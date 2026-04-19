import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("CallRecords", "source", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "manual"
    });

    await queryInterface.addColumn("CallRecords", "disposition", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("CallRecords", "metadata", {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    });

    await queryInterface.addColumn("CallRecords", "answeredAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addIndex("CallRecords", ["source"], {
      name: "idx_call_records_source"
    });

    await queryInterface.addIndex("CallRecords", ["sequenceId"], {
      name: "idx_call_records_sequence_id"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("CallRecords", "idx_call_records_sequence_id");
    await queryInterface.removeIndex("CallRecords", "idx_call_records_source");
    await queryInterface.removeColumn("CallRecords", "answeredAt");
    await queryInterface.removeColumn("CallRecords", "metadata");
    await queryInterface.removeColumn("CallRecords", "disposition");
    await queryInterface.removeColumn("CallRecords", "source");
  }
};
