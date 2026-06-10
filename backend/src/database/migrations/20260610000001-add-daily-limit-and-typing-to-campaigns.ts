import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Campaigns", "dailyLimit", {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("Campaigns", "dailySentCount", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn("Campaigns", "currentBatchDate", {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("Campaigns", "nextResumeAt", {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("Campaigns", "estimatedDays", {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("Campaigns", "enableTypingIndicator", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn("Campaigns", "typingDurationSeconds", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Campaigns", "typingDurationSeconds");
    await queryInterface.removeColumn("Campaigns", "enableTypingIndicator");
    await queryInterface.removeColumn("Campaigns", "estimatedDays");
    await queryInterface.removeColumn("Campaigns", "nextResumeAt");
    await queryInterface.removeColumn("Campaigns", "currentBatchDate");
    await queryInterface.removeColumn("Campaigns", "dailySentCount");
    await queryInterface.removeColumn("Campaigns", "dailyLimit");
  }
};
