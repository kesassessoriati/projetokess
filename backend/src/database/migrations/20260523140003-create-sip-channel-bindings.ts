import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("SipChannelBindings", {
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
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Whatsapps", key: "id" },
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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
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
      didId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "SipDids", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex("SipChannelBindings", ["companyId"], { name: "idx_sip_bindings_company_id" });
    await queryInterface.addIndex("SipChannelBindings", ["companyId", "whatsappId"], { name: "idx_sip_bindings_company_channel" });
    await queryInterface.addIndex("SipChannelBindings", ["companyId", "queueId"], { name: "idx_sip_bindings_company_queue" });
    await queryInterface.addIndex("SipChannelBindings", ["companyId", "userId"], { name: "idx_sip_bindings_company_user" });
    await queryInterface.addIndex("SipChannelBindings", ["companyId", "extensionId"], { name: "idx_sip_bindings_company_ext" });
    await queryInterface.addIndex("SipChannelBindings", ["companyId", "didId"], { name: "idx_sip_bindings_company_did" });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("SipChannelBindings", "idx_sip_bindings_company_did");
    await queryInterface.removeIndex("SipChannelBindings", "idx_sip_bindings_company_ext");
    await queryInterface.removeIndex("SipChannelBindings", "idx_sip_bindings_company_user");
    await queryInterface.removeIndex("SipChannelBindings", "idx_sip_bindings_company_queue");
    await queryInterface.removeIndex("SipChannelBindings", "idx_sip_bindings_company_channel");
    await queryInterface.removeIndex("SipChannelBindings", "idx_sip_bindings_company_id");
    await queryInterface.dropTable("SipChannelBindings");
  }
};