import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("GroupDirectories", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      groupJid: { type: DataTypes.STRING, allowNull: false },
      subject: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      owner: { type: DataTypes.STRING, allowNull: true },
      memberCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      adminCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      lastSyncAt: { type: DataTypes.DATE, allowNull: true },
      isFavorite: { type: DataTypes.BOOLEAN, defaultValue: false },
      tags: { type: DataTypes.JSONB, defaultValue: [] },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("GroupDirectories", ["companyId", "whatsappId"]);
    await queryInterface.addIndex("GroupDirectories", ["companyId", "groupJid"], {
      unique: true,
      name: "groupdirectories_company_groupjid_unique"
    });

    await queryInterface.createTable("GroupMembers", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "GroupDirectories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      memberJid: { type: DataTypes.STRING, allowNull: false },
      isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
      isSuperAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("GroupMembers", ["companyId", "groupId"]);
    await queryInterface.addIndex("GroupMembers", ["groupId", "memberJid"], {
      unique: true,
      name: "groupmembers_group_member_unique"
    });

    await queryInterface.createTable("GroupTemplates", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      name: { type: DataTypes.STRING, allowNull: false },
      messageType: { type: DataTypes.STRING(20), defaultValue: "text" },
      message: { type: DataTypes.TEXT, allowNull: true },
      buttons: { type: DataTypes.JSONB, allowNull: true },
      listItems: { type: DataTypes.JSONB, allowNull: true },
      segmentedMentions: { type: DataTypes.JSONB, allowNull: true },
      mediaPath: { type: DataTypes.STRING, allowNull: true },
      mediaName: { type: DataTypes.STRING, allowNull: true },
      isFavorite: { type: DataTypes.BOOLEAN, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("GroupTemplates", ["companyId"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("GroupTemplates");
    await queryInterface.dropTable("GroupMembers");
    await queryInterface.dropTable("GroupDirectories");
  }
};
