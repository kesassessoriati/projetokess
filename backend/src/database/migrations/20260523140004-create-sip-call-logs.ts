import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("SipCallLogs", {
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
      callId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      providerCallId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      direction: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "inbound"
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "created"
      },
      fromNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      toNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      didId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "SipDids", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      extensionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "SipExtensions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      queueId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Queues", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      channelId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
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
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      answeredAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      endedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      recordingUrl: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
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

    await queryInterface.addIndex("SipCallLogs", ["companyId"], { name: "idx_sip_logs_company_id" });
    await queryInterface.addIndex("SipCallLogs", ["companyId", "callId"], { name: "idx_sip_logs_company_call" });
    await queryInterface.addIndex("SipCallLogs", ["companyId", "providerCallId"], { name: "idx_sip_logs_company_provider" });
    await queryInterface.addIndex("SipCallLogs", ["companyId", "direction"], { name: "idx_sip_logs_company_dir" });
    await queryInterface.addIndex("SipCallLogs", ["companyId", "status"], { name: "idx_sip_logs_company_status" });
    await queryInterface.addIndex("SipCallLogs", ["companyId", "userId"], { name: "idx_sip_logs_company_user" });
    await queryInterface.addIndex("SipCallLogs", ["companyId", "contactId"], { name: "idx_sip_logs_company_contact" });
    await queryInterface.addIndex("SipCallLogs", ["companyId", "ticketId"], { name: "idx_sip_logs_company_ticket" });
    await queryInterface.addIndex("SipCallLogs", ["companyId", "createdAt"], { name: "idx_sip_logs_company_created" });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("SipCallLogs", "idx_sip_logs_company_created");
    await queryInterface.removeIndex("SipCallLogs", "idx_sip_logs_company_ticket");
    await queryInterface.removeIndex("SipCallLogs", "idx_sip_logs_company_contact");
    await queryInterface.removeIndex("SipCallLogs", "idx_sip_logs_company_user");
    await queryInterface.removeIndex("SipCallLogs", "idx_sip_logs_company_status");
    await queryInterface.removeIndex("SipCallLogs", "idx_sip_logs_company_dir");
    await queryInterface.removeIndex("SipCallLogs", "idx_sip_logs_company_provider");
    await queryInterface.removeIndex("SipCallLogs", "idx_sip_logs_company_call");
    await queryInterface.removeIndex("SipCallLogs", "idx_sip_logs_company_id");
    await queryInterface.dropTable("SipCallLogs");
  }
};