import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("SipSettings", {
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
      label: {
        type: DataTypes.STRING,
        allowNull: true
      },
      host: {
        type: DataTypes.STRING,
        allowNull: false
      },
      port: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 7443
      },
      websocketProtocol: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "wss"
      },
      wsPath: {
        type: DataTypes.STRING,
        allowNull: true
      },
      sipDomain: {
        type: DataTypes.STRING,
        allowNull: true
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false
      },
      authUser: {
        type: DataTypes.STRING,
        allowNull: true
      },
      password: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      displayName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      outboundProxy: {
        type: DataTypes.STRING,
        allowNull: true
      },
      stunServer: {
        type: DataTypes.STRING,
        allowNull: true
      },
      registerOnStartup: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    await queryInterface.addIndex("SipSettings", ["companyId"], {
      unique: true,
      name: "idx_sip_settings_company_id"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("SipSettings", "idx_sip_settings_company_id");
    await queryInterface.dropTable("SipSettings");
  }
};
