import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("PipelineStages");

    if (!tableDescription.linkedStatus) {
      await queryInterface.addColumn("PipelineStages", "linkedStatus", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
        comment: "Lead status that is automatically applied when a card is moved to this stage"
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("PipelineStages");

    if (tableDescription.linkedStatus) {
      await queryInterface.removeColumn("PipelineStages", "linkedStatus");
    }
  }
};
