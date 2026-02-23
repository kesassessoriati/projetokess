# 🔐 AUDITORIA TÉCNICA: ISOLAMENTO MULTI-TENANT (`queues.ts`)

## Relatório de Integridade e Riscos de Vazamento de Dados

**Data:** 22/02/2026  
**Escopo:** `backend/src/queues.ts` e modelos relacionados.  
**Nível Geral de Isolamento:** 🔴 **VULNERÁVEL**

---

## 🔬 1️⃣ AUDITORIA DE QUERIES (VULNERABILIDADES IDENTIFICADAS)

Identificamos múltiplos pontos onde o isolamento por `companyId` é inexistente ou insuficiente, permitindo que uma empresa afete o comportamento de outra.

### 🔴 RISCO CRÍTICO: Vazamento de Configurações Operacionais

As funções de controle de horário e dias de envio (`checkerWeek` e `checkTime`) realizam consultas globais:

- **Queries:** `CampaignSetting.findOne({ where: { key: "sabado" } })`, `startHour`, etc. (Lines 618-676).
- **Impacto:** O sistema utiliza a primeira configuração que encontrar na tabela (provavelmente da Empresa ID 1) e aplica a regra para **TODAS** as empresas do sistema. Se a Empresa A desabilita envios no sábado, a Empresa B também para de enviar.

### 🔴 RISCO CRÍTICO: Seleção Global de Campanhas

A verificação de banco de dados para iniciar campanhas utiliza SQL bruto sem filtro de tenant.

- **Query:** `SELECT id, "scheduledAt" FROM "Campaigns" c WHERE "scheduledAt" BETWEEN ...` (Line 377).
- **Impacto:** O worker busca campanhas de qualquer empresa sem contexto, aumentando o risco de processamento cruzado se houver colisão de IDs ou falha no serviço descendente.

### 🟠 RISCO ALTO: Consultas por PrimaryKey Sem Contexto

Vários pontos do arquivo confiam apenas no ID global (PK), sem validar se o registro pertence ao tenant processado:

- `Whatsapp.findByPk(data.whatsappId)` (Line 104)
- `Schedule.findByPk(schedule.id)` (Line 163)
- `Campaign.findOne({ where: { id } })` em `getCampaign` (Line 423)
- `Contact.findByPk(t.ticket.contactId)` (Line 1576)

---

## 🔗 2️⃣ PROPAGAÇÃO DE `companyId`

O fluxo de dados entre as filas do Bull apresenta falhas de contexto:

1. **Perda de Contexto no Job**: O job `ProcessCampaign` recebe apenas o `id` da campanha. Se o worker buscar o registro usando o serviço `getCampaign` (vulnerável), ele pode carregar dados de outra empresa se o ID for manipulado.
2. **Fallback Perigoso**: Em `handleSendScheduledMessage` (Line 177), existe um fallback para `GetDefaultWhatsApp` que, se falhar na lógica de ID, pode retornar o WhatsApp padrão de outra empresa se não houver sanitização rigorosa.

---

## 🧠 3️⃣ ANÁLISE ESTRUTURAL DE MODELOS (SEQUELIZE)

Validamos os modelos `Campaign`, `Ticket`, `Whatsapp`, `Schedule` e `Setting`:

- **Ausência de Restrição**: O campo `companyId` **não possui** `allowNull: false` na definição do modelo. Isso permite a criação acidental de registros "órfãos" (sem dono).
- **Falta de Índices**: Não existem índices compostos `(id, companyId)`. Em bancos de dados grandes, isso torna as queries de isolamento lentas, incentivando desenvolvedores a buscar apenas pelo `id` (PK).
- **Tabelas de Junção Vuneráveis**: A tabela `UserQueue` (Line 1416) não possui `companyId`. A query `UserQueue.findAll({ where: { queueId } })` confia que o `queueId` já foi isolado anteriormente, o que é um risco de segurança por "confiança implícita".

---

## 🔐 4️⃣ CLASSIFICAÇÃO DE RISCO FINANCEIRO E JURÍDICO

| Risco | Impacto | Classificação |
|---|---|---|
| **Vazamento de Configuração** | Configurações de uma empresa ditam o funcionamento de outras. | 🔴 CRÍTICO |
| **Acesso Indevido** | Possibilidade teórica de um tenant disparar mensagens usando o WhatsApp de outro (via manipulação de JOB ID). | 🟠 ALTO |
| **Interrupção de Serviço** | Erro em um job global de faturamento (`handleInvoiceCreate`) pode parar o motor de vendas de todo o SaaS. | 🟠 ALTO |
| **Risco Jurídico (LGPD)** | Alto. O processamento de dados sem isolamento explícito em todas as camadas viola princípios de *Privacy by Design*. | 🔴 CRÍTICO |

---

## 📊 RECOMENDAÇÕES PRIORIZADAS

1. **Imediato (P0)**: Corrigir `checkerWeek` e `checkTime` para aceitar `companyId` como parâmetro e filtrar a query `CampaignSetting`.
2. **Imediato (P0)**: Corrigir a query bruta de `handleVerifyCampaigns` (Line 377) para iterar sobre empresas ativas ou incluir `companyId` no SELECT.
3. **Curto Prazo (P1)**: Adicionar `allowNull: false` em todos os campos `companyId` dos Models para forçar o erro no momento da criação, impedindo dados órfãos.
4. **Arquitetura (P2)**: Implementar um **Middleware de Escopo no Sequelize** ou usar o padrão *Repository* que injeta automaticamente o `where: { companyId }` em todas as chamadas.

---
**Conclusão da Auditoria:** O sistema encontra-se em estado **Vulnerável**. O isolamento existe em partes da regra de negócio (Tickets/Mensagens), mas falha criticamente na camada de infraestrutura de filas e configurações globais.
