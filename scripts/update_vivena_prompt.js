/**
 * Script: update_vivena_prompt.js
 * Objetivo: Criar nova versão do prompt da Yumi (Clínica Vivena, company_id=176)
 * com foco em acolhimento e humanização antes de revelar preços.
 *
 * COMO RODAR (no servidor onde o banco está acessível):
 *   cd /caminho/do/backend
 *   node scripts/update_vivena_prompt.js
 */

require("dotenv").config({ path: ".env" });
const { Sequelize, DataTypes } = require("sequelize");

const COMPANY_ID = 176;

const seq = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 5432,
    dialect: "postgres",
    logging: false,
  }
);

const PromptVersion = seq.define(
  "AiExternalPromptVersion",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: DataTypes.INTEGER,
    config_id: DataTypes.INTEGER,
    version: DataTypes.INTEGER,
    content: DataTypes.TEXT,
    change_note: DataTypes.TEXT,
    is_active: DataTypes.BOOLEAN,
    created_by_user_id: DataTypes.INTEGER,
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { tableName: "ai_external_prompt_versions", timestamps: true, underscored: true }
);

// ─── MELHORIAS APLICADAS AO PROMPT ──────────────────────────────────────────
// Substituições/adições baseadas no feedback da cliente (áudio 26/05/2026):
//   - Problema: IA explicava Crioshaping e já informava o preço (a partir de 399)
//     na mesma resposta, fazendo a pessoa desaparecer.
//   - Solução: Primeiro acolher, perguntar sobre a queixa/dor, só depois do
//     paciente engajar é que o preço pode ser mencionado.
// ─────────────────────────────────────────────────────────────────────────────

const PATCH_INSTRUCTIONS = `

## REGRA CRÍTICA — ACOLHIMENTO ANTES DO PREÇO

Quando o paciente perguntar o valor de qualquer procedimento (Crioshaping, Ultraformer, Botox, etc.), **NUNCA informe o preço imediatamente**. Siga sempre esta sequência:

1. **Acolhimento genuíno**: mostre que você se importa com a situação do paciente. Ex: "Que legal que você está buscando cuidar de você! 🌸"
2. **Pergunta sobre a dor/queixa**: faça UMA pergunta aberta e empática para entender o que incomoda ou o que deseja melhorar. Ex: "Me conta um pouquinho: o que te incomoda mais no momento? É mais na barriga, flancos, papada...?"
3. **Conexão com o procedimento**: só após o paciente revelar a queixa, relacione o procedimento à necessidade específica dele.
4. **Preço somente após qualificação**: o valor deve ser mencionado apenas depois que a conversa já estiver aquecida e o paciente engajado.

### Exemplo de fluxo CORRETO para pergunta de valor:
- Paciente: "Quanto custa o Crioshaping?"
- Yumi: "Adorei que você quer saber mais sobre o Crioshaping! 🥰 Antes de falar dos valores, quero entender melhor o que você está buscando... O que te incomoda mais? É mais barriga, flancos, culote? Assim eu consigo te passar a informação certinha sobre o que faz sentido pra você!"
- [paciente responde com a queixa]
- Yumi: [explica como o Crioshaping resolve especificamente aquela queixa]
- Yumi: "Os valores variam de acordo com a área tratada. Pra te dar uma ideia, os nossos planos partem de R$ 399. Mas o ideal é você fazer uma **avaliação gratuita** aqui na clínica pra a nossa especialista te indicar o melhor protocolo! Que dia ficaria melhor pra você?"

### Por que esta abordagem?
Pessoas que recebem um preço sem contexto tendem a achar caro e sumir. Quando primeiro entendemos a dor delas e mostramos que o procedimento resolve exatamente o problema delas, o valor passa a fazer sentido e a conversão é muito maior.
`;

async function run() {
  try {
    await seq.authenticate();
    console.log("✅ Conectado ao banco de dados");

    // Busca versão ativa atual
    const current = await PromptVersion.findOne({
      where: { company_id: COMPANY_ID, is_active: true },
      order: [["version", "DESC"]],
    });

    if (!current) {
      console.error(`❌ Nenhuma versão ativa encontrada para company_id=${COMPANY_ID}`);
      process.exit(1);
    }

    console.log(`📋 Versão ativa atual: v${current.version} (id=${current.id})`);
    console.log(`📝 Tamanho do prompt atual: ${current.content.length} chars`);

    // Verifica se o patch já foi aplicado
    if (current.content.includes("REGRA CRÍTICA — ACOLHIMENTO ANTES DO PREÇO")) {
      console.log("ℹ️  Patch de humanização já aplicado nesta versão. Nenhuma mudança necessária.");
      process.exit(0);
    }

    // Cria nova versão com o patch aplicado ao final do prompt
    const newContent = current.content.trimEnd() + "\n\n" + PATCH_INSTRUCTIONS.trim();
    const newVersion = (current.version || 1) + 1;

    // Desativa versão atual
    await PromptVersion.update(
      { is_active: false },
      { where: { company_id: COMPANY_ID, is_active: true } }
    );

    // Cria nova versão ativa
    const created = await PromptVersion.create({
      company_id: COMPANY_ID,
      config_id: current.config_id,
      version: newVersion,
      content: newContent,
      change_note: "Humanização do fluxo de preço: acolhimento e qualificação da dor antes de revelar valores (feedback cliente 26/05/2026)",
      is_active: true,
      created_by_user_id: current.created_by_user_id,
    });

    console.log(`✅ Nova versão criada: v${newVersion} (id=${created.id})`);
    console.log(`📝 Tamanho do novo prompt: ${newContent.length} chars`);
    console.log("🎉 Prompt da Vivena (Yumi) atualizado com sucesso!");
  } catch (err) {
    console.error("❌ Erro:", err.message);
    process.exit(1);
  } finally {
    await seq.close();
  }
}

run();
