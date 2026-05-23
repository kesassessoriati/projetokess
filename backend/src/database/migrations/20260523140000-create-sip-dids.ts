import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("SipDids", {
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
      name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      number: {
        type: DataTypes.STRING,
        allowNull: false
      },
      normalizedNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      countryCode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      areaCode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      state: {
        type: DataTypes.STRING,
        allowNull: true
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "both"
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      allowedForOutbound: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      allowedForInbound: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      providerRef: {
        type: DataTypes.STRING,
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

    await queryInterface.addIndex("SipDids", ["companyId"], { name: "idx_sip_dids_company_id" });
    await queryInterface.addIndex("SipDids", ["companyId", "normalizedNumber"], { name: "idx_sip_dids_company_normalized" });
    await queryInterface.addIndex("SipDids", ["companyId", "areaCode"], { name: "idx_sip_dids_company_area_code" });
    await queryInterface.addIndex("SipDids", ["companyId", "isActive"], { name: "idx_sip_dids_company_active" });
    await queryInterface.addIndex("SipDids", ["companyId", "isDefault"], { name: "idx_sip_dids_company_default" });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("SipDids", "idx_sip_dids_company_default");
    await queryInterface.removeIndex("SipDids", "idx_sip_dids_company_active");
    await queryInterface.removeIndex("SipDids", "idx_sip_dids_company_area_code");
    await queryInterface.removeIndex("SipDids", "idx_sip_dids_company_normalized");
    await queryInterface.removeIndex("SipDids", "idx_sip_dids_company_id");
    await queryInterface.dropTable("SipDids");
  }
};