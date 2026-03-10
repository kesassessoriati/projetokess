import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.changeColumn("SmtpSettings", "password", {
            type: DataTypes.TEXT,
            allowNull: false
        });
    },

    down: (queryInterface: QueryInterface) => {
        return queryInterface.changeColumn("SmtpSettings", "password", {
            type: DataTypes.STRING,
            allowNull: false
        });
    }
};
