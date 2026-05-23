import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("SipExtensions", {
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
      sipSettingId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "SipSettings", key: "id" },
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
      extension: {
        type: DataTypes.STRING,
        allowNull: false
      },
      authUser: {
        type: DataTypes.STRING,
        allowNull: true
      },
      displayName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      secret: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      canMakeOutbound: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      canReceiveInbound: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      autoRegister: {
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

    await queryInterface.addIndex("SipExtensions", ["companyId"], { name: "idx_sip_extensions_company_id" });
    await queryInterface.addIndex("SipExtensions", ["companyId", "userId"], { name: "idx_sip_extensions_company_user" });
    await queryInterface.addIndex("SipExtensions", ["companyId", "extension"], { name: "idx_sip_extensions_company_extension" });
    await queryInterface.addIndex("SipExtensions", ["companyId", "isActive"], { name: "idx_sip_extensions_company_active" });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("SipExtensions", "idx_sip_extensions_company_active");
    await queryInterface.removeIndex("SipExtensions", "idx_sip_extensions_company_extension");
    await queryInterface.removeIndex("SipExtensions", "idx_sip_extensions_company_user");
    await queryInterface.removeIndex("SipExtensions", "idx_sip_extensions_company_id");
    await queryInterface.dropTable("SipExtensions");
  }
};