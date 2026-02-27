import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.createTable("SmtpSettings", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            host: {
                type: DataTypes.STRING,
                allowNull: false
            },
            port: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            user: {
                type: DataTypes.STRING,
                allowNull: false
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false
            },
            secure: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            senderName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            senderEmail: {
                type: DataTypes.STRING,
                allowNull: false
            },
            companyId: {
                type: DataTypes.INTEGER,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
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
    },

    down: (queryInterface: QueryInterface) => {
        return queryInterface.dropTable("SmtpSettings");
    }
};
