import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        return queryInterface.createTable("lead_attachments", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            leadId: {
                type: DataTypes.INTEGER,
                field: "lead_id",
                references: { model: "crm_leads", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            companyId: {
                type: DataTypes.INTEGER,
                field: "company_id",
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            originalName: {
                type: DataTypes.STRING,
                field: "original_name",
                allowNull: false
            },
            filename: {
                type: DataTypes.STRING,
                allowNull: false
            },
            mimetype: {
                type: DataTypes.STRING,
                allowNull: true
            },
            size: {
                type: DataTypes.INTEGER,
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
    },

    down: async (queryInterface: QueryInterface) => {
        return queryInterface.dropTable("lead_attachments");
    }
};
