import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // 1. Adicionar coluna version para Optimistic Locking em Opportunities
        await queryInterface.addColumn("Opportunities", "version", {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false
        });

        // 2. Adicionar índices otimizados para performance do Board e Metrics
        // Índice composto para busca por pipeline e estágio com status (frequente no board)
        await queryInterface.addIndex("Opportunities", ["companyId", "pipelineId", "stageId", "status", "createdAt"], {
            name: "idx_opportunities_board_lookup"
        });

        // Índice para busca de histórico de movimentos por oportunidade (frequente em métricas)
        await queryInterface.addIndex("OpportunityMovements", ["opportunityId", "createdAt"], {
            name: "idx_movements_history"
        });

        // Índice para busca de eventos por oportunidade
        await queryInterface.addIndex("OpportunityEvents", ["opportunityId", "type", "createdAt"], {
            name: "idx_events_lookup"
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeIndex("Opportunities", "idx_opportunities_board_lookup");
        await queryInterface.removeIndex("OpportunityMovements", "idx_movements_history");
        await queryInterface.removeIndex("OpportunityEvents", "idx_events_lookup");
        await queryInterface.removeColumn("Opportunities", "version");
    }
};
