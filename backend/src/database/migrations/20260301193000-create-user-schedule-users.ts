import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        try {
            await queryInterface.removeConstraint("user_schedules", "user_schedules_user_id_key");
        } catch (e) { /* ignore */ }

        await queryInterface.createTable("user_schedule_users", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            user_id: {
                type: DataTypes.INTEGER,
                references: { model: "Users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            user_schedule_id: {
                type: DataTypes.INTEGER,
                references: { model: "user_schedules", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false
            }
        });

        try {
            const schedules = await queryInterface.sequelize.query(`SELECT id, user_id FROM user_schedules WHERE user_id IS NOT NULL;`);
            const records = schedules[0] as any[];
            for (const record of records) {
                await queryInterface.sequelize.query(`INSERT INTO user_schedule_users (user_id, user_schedule_id, created_at, updated_at) VALUES (${record.user_id}, ${record.id}, NOW(), NOW()) ON CONFLICT DO NOTHING;`);
            }
        } catch (err) {
            console.log("Could not migrate existing schedule users", err);
        }
    },
    down: async (queryInterface: QueryInterface) => {
        await queryInterface.dropTable("user_schedule_users");
    }
};
