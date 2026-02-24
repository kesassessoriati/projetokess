
'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn('QueueIntegrations', 'promptId', {
            type: Sequelize.INTEGER,
            references: { model: 'Prompts', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });
    },

    down: (queryInterface) => {
        return queryInterface.removeColumn('QueueIntegrations', 'promptId');
    }
};
