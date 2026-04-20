import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableExists = await queryInterface.describeTable("Meetings").catch(() => null);
    if (tableExists) return;

    await queryInterface.createTable("Meetings", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      leadId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "CrmLeads", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      opportunityId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Opportunities", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM("pending", "processing", "completed", "failed"),
        defaultValue: "pending",
        allowNull: false
      },
      videoFilename: {
        type: DataTypes.STRING,
        allowNull: true
      },
      audioFilename: {
        type: DataTypes.STRING,
        allowNull: true
      },
      transcription: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      insights: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      errorMessage: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("Meetings", ["companyId"]);
    await queryInterface.addIndex("Meetings", ["companyId", "userId"]);
    await queryInterface.addIndex("Meetings", ["leadId"]);
    await queryInterface.addIndex("Meetings", ["opportunityId"]);
    await queryInterface.addIndex("Meetings", ["status"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("Meetings");
  }
};
