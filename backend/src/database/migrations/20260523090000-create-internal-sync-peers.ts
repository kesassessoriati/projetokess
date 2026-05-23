/* eslint-disable @typescript-eslint/no-var-requires */
const { DataTypes } = require("sequelize");

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable("InternalSyncPeers", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      serverName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      publicId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      baseUrl: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      secretRef: {
        type: DataTypes.STRING,
        allowNull: false
      },
      secretHash: {
        type: DataTypes.STRING,
        allowNull: true
      },
      allowedIpCidrs: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "inactive"
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

    await queryInterface.addIndex("InternalSyncPeers", ["publicId"], {
      unique: true,
      name: "internal_sync_peers_public_id_unique"
    });
  },

  down: async queryInterface => {
    await queryInterface.dropTable("InternalSyncPeers");
  }
};

export {};
