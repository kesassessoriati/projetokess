/* eslint-disable @typescript-eslint/no-var-requires */
const { DataTypes } = require("sequelize");

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable("InternalSyncRoutes", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      localServerId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      remotePeerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "InternalSyncPeers",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      localCompanyId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      localWhatsappId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      localNumber: {
        type: DataTypes.STRING,
        allowNull: false
      },
      localRemoteJid: {
        type: DataTypes.STRING,
        allowNull: true
      },
      remoteServerId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      remoteCompanyId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      remoteWhatsappId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      remoteNumber: {
        type: DataTypes.STRING,
        allowNull: false
      },
      remoteJid: {
        type: DataTypes.STRING,
        allowNull: true
      },
      direction: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "bidirectional"
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active"
      },
      allowedMessageTypes: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: ["text"]
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

    await queryInterface.addIndex(
      "InternalSyncRoutes",
      ["localServerId", "localCompanyId", "localWhatsappId", "remotePeerId"],
      {
        name: "internal_sync_routes_local_scope_idx"
      }
    );

    await queryInterface.addIndex(
      "InternalSyncRoutes",
      ["remoteServerId", "remoteCompanyId", "remoteWhatsappId"],
      {
        name: "internal_sync_routes_remote_scope_idx"
      }
    );
  },

  down: async queryInterface => {
    await queryInterface.dropTable("InternalSyncRoutes");
  }
};

export {};
