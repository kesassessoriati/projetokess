import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Tenta adicionar em leads e crm_leads para cobrir ambas possibilidades
    try {
      await queryInterface.addColumn("crm_leads", "card_color", {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null
      });
    } catch (e) {
      console.log("Erro ao adicionar card_color em crm_leads", e);
    }
    
    try {
      await queryInterface.addColumn("leads", "card_color", {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null
      });
    } catch (e) {
      console.log("Erro ao adicionar card_color em leads", e);
    }

    try {
      await queryInterface.addColumn("funnel_stages", "color", {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null
      });
    } catch (e) {
      console.log("Erro ao adicionar color em funnel_stages", e);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    try {
      await queryInterface.removeColumn("crm_leads", "card_color");
    } catch (e) {}
    try {
      await queryInterface.removeColumn("leads", "card_color");
    } catch (e) {}
    try {
      await queryInterface.removeColumn("funnel_stages", "color");
    } catch (e) {}
  }
};
