import { QueryInterface, DataTypes, Sequelize } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("PromptChannelBindings", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Companies",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      promptId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Prompts",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      channelType: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      channelId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Whatsapps",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      events: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: ["message_received"]
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW")
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW")
      }
    });

    await queryInterface.addIndex(
      "PromptChannelBindings",
      ["companyId", "channelType", "whatsappId", "isActive"],
      {
        name: "idx_prompt_channel_bindings_company_channel_whatsapp_active"
      }
    );

    await queryInterface.addIndex(
      "PromptChannelBindings",
      ["companyId", "promptId"],
      {
        name: "idx_prompt_channel_bindings_company_prompt"
      }
    );

    await queryInterface.addIndex(
      "PromptChannelBindings",
      ["companyId", "channelType", "channelId"],
      {
        name: "idx_prompt_channel_bindings_company_channel_channel_id"
      }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface
      .removeIndex(
        "PromptChannelBindings",
        "idx_prompt_channel_bindings_company_channel_channel_id"
      )
      .catch(() => undefined);
    await queryInterface
      .removeIndex(
        "PromptChannelBindings",
        "idx_prompt_channel_bindings_company_prompt"
      )
      .catch(() => undefined);
    await queryInterface
      .removeIndex(
        "PromptChannelBindings",
        "idx_prompt_channel_bindings_company_channel_whatsapp_active"
      )
      .catch(() => undefined);
    await queryInterface.dropTable("PromptChannelBindings");
  }
};
