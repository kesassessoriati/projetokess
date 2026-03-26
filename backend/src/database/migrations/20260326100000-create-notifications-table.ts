import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableExists = await queryInterface
      .describeTable("Notifications")
      .then(() => true)
      .catch(() => false);

    if (tableExists) return;

    await queryInterface.createTable("Notifications", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "system",
        comment: "task_due, task_overdue, task_created, message, system, appointment",
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("unread", "read"),
        allowNull: false,
        defaultValue: "unread",
      },
      channel: {
        type: DataTypes.ENUM("in_app", "email", "whatsapp"),
        allowNull: false,
        defaultValue: "in_app",
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Flexible payload: taskId, ticketId, leadId, etc.",
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("Notifications", ["userId", "status"], {
      name: "idx_notifications_user_status",
    });
    await queryInterface.addIndex("Notifications", ["companyId"], {
      name: "idx_notifications_company",
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("Notifications");
  },
};
