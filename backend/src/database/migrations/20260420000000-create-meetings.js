"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Meetings", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      companyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      contactId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      leadId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "CrmLeads", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      opportunityId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Opportunities", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM("pending", "processing", "completed", "failed"),
        defaultValue: "pending",
        allowNull: false
      },
      videoFilename: {
        type: Sequelize.STRING,
        allowNull: true
      },
      audioFilename: {
        type: Sequelize.STRING,
        allowNull: true
      },
      transcription: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      insights: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Duration in seconds"
      },
      errorMessage: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("Meetings", ["companyId"]);
    await queryInterface.addIndex("Meetings", ["companyId", "userId"]);
    await queryInterface.addIndex("Meetings", ["leadId"]);
    await queryInterface.addIndex("Meetings", ["opportunityId"]);
    await queryInterface.addIndex("Meetings", ["status"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Meetings");
  }
};
