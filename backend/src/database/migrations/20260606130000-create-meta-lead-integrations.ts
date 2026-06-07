import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("meta_lead_integrations", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "company_id",
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      pageId: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: "page_id"
      },
      pageName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "page_name"
      },
      formId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: "form_id"
      },
      formName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "form_name"
      },
      accessToken: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "access_token"
      },
      verifyToken: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: "verify_token"
      },
      pipelineId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "pipeline_id",
        references: { model: "Pipelines", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      stageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "stage_id",
        references: { model: "PipelineStages", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      defaultWhatsappId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "default_whatsapp_id"
      },
      defaultTagName: {
        type: DataTypes.STRING(128),
        allowNull: true,
        field: "default_tag_name",
        defaultValue: "Meta Ads"
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: "is_active",
        defaultValue: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at"
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "updated_at"
      }
    });

    await queryInterface.addIndex("meta_lead_integrations", ["company_id", "page_id"], {
      name: "meta_lead_integrations_company_page_idx"
    });

    await queryInterface.addIndex("meta_lead_integrations", ["company_id", "page_id", "form_id"], {
      name: "meta_lead_integrations_company_page_form_idx"
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("meta_lead_integrations");
  }
};
