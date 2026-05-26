import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("CallProviderSettings", {
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
      defaultProvider: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "sip"
      },
      sipEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      wavoipEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      wavoipBaseUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      wavoipDeviceId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      wavoipToken: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      rejectCallsDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      callRejectMessagePt: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      callRejectMessageEn: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      businessHoursEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      settings: {
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

    await queryInterface.addIndex("CallProviderSettings", ["companyId"], {
      unique: true,
      name: "idx_call_provider_settings_company_id"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("CallProviderSettings", "idx_call_provider_settings_company_id")
      .catch(() => undefined);
    await queryInterface.dropTable("CallProviderSettings");
  }
};
