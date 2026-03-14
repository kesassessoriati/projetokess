import { DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: any) => {
    await queryInterface.createTable("media_folders", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "media_folders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.createTable("media_files", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      folder_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "media_folders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      original_name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      custom_name: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      mime_type: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      size: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      storage_path: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("media_folders", ["company_id"]);
    await queryInterface.addIndex("media_folders", ["parent_id"]);
    await queryInterface.addIndex("media_files", ["company_id"]);
    await queryInterface.addIndex("media_files", ["folder_id"]);
  },

  down: async (queryInterface: any) => {
    await queryInterface.dropTable("media_files");
    await queryInterface.dropTable("media_folders");
  }
};
