import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("FlowExecutions", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      flowId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "FlowBuilders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      contactNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      trigger: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "campaign" // campaign | welcome | notPhrase | webhook
      },
      triggerPhrase: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "started" // started | completed | stopped | error
      },
      stoppedReason: {
        type: DataTypes.STRING,
        allowNull: true
      },
      lastNodeId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      lastNodeType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      nodesExecuted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      durationMs: {
        type: DataTypes.INTEGER,
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
  },
  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("FlowExecutions");
  }
};
