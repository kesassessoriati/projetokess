import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("SipDidRoutes", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
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
      didId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "SipDids", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      routeType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      queueId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Queues", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      extensionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "SipExtensions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      channelId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      businessHoursRule: {
        type: DataTypes.STRING,
        allowNull: true
      },
      fallbackRouteId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "SipDidRoutes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
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

    await queryInterface.addIndex("SipDidRoutes", ["companyId"], { name: "idx_sip_routes_company_id" });
    await queryInterface.addIndex("SipDidRoutes", ["companyId", "didId"], { name: "idx_sip_routes_company_did" });
    await queryInterface.addIndex("SipDidRoutes", ["companyId", "routeType"], { name: "idx_sip_routes_company_type" });
    await queryInterface.addIndex("SipDidRoutes", ["companyId", "isActive"], { name: "idx_sip_routes_company_active" });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("SipDidRoutes", "idx_sip_routes_company_active");
    await queryInterface.removeIndex("SipDidRoutes", "idx_sip_routes_company_type");
    await queryInterface.removeIndex("SipDidRoutes", "idx_sip_routes_company_did");
    await queryInterface.removeIndex("SipDidRoutes", "idx_sip_routes_company_id");
    await queryInterface.dropTable("SipDidRoutes");
  }
};