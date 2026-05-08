import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable("Users");

    if (!(table as any).username) {
      await queryInterface.addColumn("Users", "username", {
        type: DataTypes.STRING(80),
        allowNull: true
      });
    }

    if (!(table as any).phone) {
      await queryInterface.addColumn("Users", "phone", {
        type: DataTypes.STRING(30),
        allowNull: true
      });
    }

    const indexes = (await queryInterface.showIndex("Users")) as any[];

    if (!indexes.some(index => index.name === "idx_users_company_username")) {
      await queryInterface.addIndex("Users", ["companyId", "username"], {
        name: "idx_users_company_username",
        unique: true
      });
    }

    if (!indexes.some(index => index.name === "idx_users_company_phone")) {
      await queryInterface.addIndex("Users", ["companyId", "phone"], {
        name: "idx_users_company_phone",
        unique: true
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const indexes = (await queryInterface.showIndex("Users")) as any[];

    if (indexes.some(index => index.name === "idx_users_company_phone")) {
      await queryInterface.removeIndex("Users", "idx_users_company_phone");
    }

    if (indexes.some(index => index.name === "idx_users_company_username")) {
      await queryInterface.removeIndex("Users", "idx_users_company_username");
    }

    const table = await queryInterface.describeTable("Users");

    if ((table as any).phone) {
      await queryInterface.removeColumn("Users", "phone");
    }

    if ((table as any).username) {
      await queryInterface.removeColumn("Users", "username");
    }
  }
};
