import { QueryInterface, DataTypes } from "sequelize";

const menuOptions = [
  ["dashboard", true, false],
  ["relatorios", true, false],
  ["disparos", true, false],
  ["campanhas", true, false],
  ["chat-interno", true, false],
  ["aquecimento", true, false],
  ["chips", true, false],
  ["agente-ia", true, false],
  ["construtor-fluxo", true, false],
  ["automacoes", true, false],
  ["chat-agendamento", true, false],
  ["compromissos", true, false],
  ["tutoriais", true, false],
  ["conversas", true, false],
  ["chamadas", true, false],
  ["crm-kanban", true, false],
  ["etiquetas", true, false],
  ["contatos", true, false],
  ["leads", true, false],
  ["clientes", true, false],
  ["usuarios", true, false],
  ["gestao-grupos", true, false],
  ["follow-ups", true, false],
  ["canais", true, false],
  ["respostas-rapidas", true, false],
  ["biblioteca-midia", true, false],
  ["produtos", true, false],
  ["servicos", true, false],
  ["propostas", true, false],
  ["agenda", true, false],
  ["projetos", true, false],
  ["tarefas", true, false],
  ["departamentos", true, false],
  ["gestor-financeiro-ia", true, false],
  ["faturas", true, false],
  ["financeiro", true, false],
  ["gateways-pagamento", true, false],
  ["documentacao", true, false],
  ["integracoes", true, false],
  ["ferramentas", true, false],
  ["meta-ads", true, false],
  ["google-ads", true, false],
  ["configuracoes", true, true],
  ["smtp", true, false],
  ["sip-webphone", true, false],
  ["banners", true, false],
  ["video-tutorial", true, false],
  ["personalizacao-menus", true, true],
  ["personalizacao-lead", true, false],
  ["reunioes", true, false],
  ["pipeline-inteligente", true, false],
  ["meus-sites", true, false],
  ["redes-sociais", true, false],
  ["ia-workflows", true, false]
];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("company_workspace_menu_preferences", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      menu_key: {
        type: DataTypes.STRING,
        allowNull: false
      },
      visible: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex("company_workspace_menu_preferences", ["company_id", "menu_key"], {
      unique: true,
      name: "company_workspace_menu_preferences_company_menu_unique"
    });

    const valuesSql = menuOptions
      .map(([menuKey, defaultVisible, protectedMenu]) => `('${menuKey}', ${defaultVisible}, ${protectedMenu})`)
      .join(",\n        ");

    await queryInterface.sequelize.query(`
      WITH canonical_menu(menu_key, default_visible, protected_menu) AS (
        VALUES
        ${valuesSql}
      ),
      ranked_legacy AS (
        SELECT
          uwp.company_id,
          uwp.menu_key,
          uwp.visible,
          ROW_NUMBER() OVER (
            PARTITION BY uwp.company_id, uwp.menu_key
            ORDER BY
              CASE WHEN u.profile IN ('admin', 'super') THEN 0 ELSE 1 END,
              uwp.updated_at DESC,
              uwp.id DESC
          ) AS rn
        FROM user_workspace_preferences uwp
        INNER JOIN "Users" u ON u.id = uwp.user_id
        INNER JOIN canonical_menu cm ON cm.menu_key = uwp.menu_key
      )
      INSERT INTO company_workspace_menu_preferences
        (company_id, menu_key, visible, created_at, updated_at)
      SELECT
        c.id,
        cm.menu_key,
        CASE
          WHEN cm.protected_menu THEN TRUE
          ELSE COALESCE(rl.visible, cm.default_visible)
        END AS visible,
        NOW(),
        NOW()
      FROM "Companies" c
      CROSS JOIN canonical_menu cm
      LEFT JOIN ranked_legacy rl
        ON rl.company_id = c.id
       AND rl.menu_key = cm.menu_key
       AND rl.rn = 1
      ON CONFLICT (company_id, menu_key)
      DO UPDATE SET
        visible = EXCLUDED.visible,
        updated_at = NOW();
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("company_workspace_menu_preferences");
  }
};
