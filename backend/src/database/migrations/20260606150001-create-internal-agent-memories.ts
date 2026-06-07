import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("InternalAgentMemories", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
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
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      promptId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Prompts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      sourceTicketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      memoryType: {
        type: DataTypes.ENUM("summary", "preference", "fact", "goal"),
        allowNull: false,
        defaultValue: "summary"
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      relevanceScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1.0
      },
      expiresAt: {
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
      "InternalAgentMemories",
      ["companyId", "contactId", "memoryType"],
      { name: "iam_company_contact_type_idx" }
    );

    await queryInterface.addIndex(
      "InternalAgentMemories",
      ["companyId", "contactId", "promptId"],
      { name: "iam_company_contact_prompt_idx" }
    );
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("InternalAgentMemories");
  }
};
