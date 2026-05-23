/* eslint-disable @typescript-eslint/no-var-requires */
const { DataTypes } = require("sequelize");

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable("InternalMessageSyncEvents", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      wid: {
        type: DataTypes.STRING,
        allowNull: false
      },
      sourceServerId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      targetServerId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      sourceCompanyId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      targetCompanyId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      sourceWhatsappId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      targetWhatsappId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      sourceRemoteJid: {
        type: DataTypes.STRING,
        allowNull: true
      },
      targetRemoteJid: {
        type: DataTypes.STRING,
        allowNull: true
      },
      messageType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      direction: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending"
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lastError: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      payloadHash: {
        type: DataTypes.STRING,
        allowNull: true
      },
      nonce: {
        type: DataTypes.STRING,
        allowNull: true
      },
      receivedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      processedAt: {
        type: DataTypes.DATE,
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

    await queryInterface.addIndex(
      "InternalMessageSyncEvents",
      ["wid", "targetCompanyId", "targetWhatsappId", "sourceServerId"],
      {
        unique: true,
        name: "internal_message_sync_events_dedupe_unique"
      }
    );

    await queryInterface.addIndex(
      "InternalMessageSyncEvents",
      ["sourceServerId", "nonce", "direction"],
      {
        name: "internal_message_sync_events_nonce_idx"
      }
    );
  },

  down: async queryInterface => {
    await queryInterface.dropTable("InternalMessageSyncEvents");
  }
};

export {};
