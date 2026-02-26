import { QueryInterface } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        await queryInterface.addIndex("ChatMessages", ["companyId", "chatId", "createdAt"], {
            name: "idx_chat_messages_composite",
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeIndex("ChatMessages", "idx_chat_messages_composite");
    }
};
