import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("user_workspace_preferences", {
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
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      menu_key: {
        type: DataTypes.STRING,
        allowNull: false
      },
      visible: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex("user_workspace_preferences", ["company_id", "user_id", "menu_key"], {
      unique: true,
      name: "user_workspace_preferences_company_user_menu_unique"
    });

    await queryInterface.createTable("company_lead_field_settings", {
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
      field_key: {
        type: DataTypes.STRING,
        allowNull: false
      },
      label: {
        type: DataTypes.STRING,
        allowNull: false
      },
      field_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "text"
      },
      visible: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      is_custom: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
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

    await queryInterface.addIndex("company_lead_field_settings", ["company_id", "field_key"], {
      unique: true,
      name: "company_lead_field_settings_company_field_unique"
    });

    await queryInterface.createTable("crm_lead_custom_field_values", {
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
      lead_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "crm_leads", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      field_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "company_lead_field_settings", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      value: {
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

    await queryInterface.addIndex("crm_lead_custom_field_values", ["company_id", "lead_id", "field_id"], {
      unique: true,
      name: "crm_lead_custom_values_company_lead_field_unique"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("crm_lead_custom_field_values");
    await queryInterface.dropTable("company_lead_field_settings");
    await queryInterface.dropTable("user_workspace_preferences");
  }
};
