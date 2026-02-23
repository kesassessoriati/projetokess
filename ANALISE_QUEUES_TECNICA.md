# 📊 ANÁLISE PRÉ-REFATORAÇÃO: `queues.ts`

## AtendZappy v2 — Mapeamento Técnico de Riscos e Responsabilidades

**Arquivo:** `backend/src/queues.ts`  
**Tamanho:** ~1.859 linhas  
**Status:** God Object Crítico

---

## 🔍 1️⃣ MAPEAMENTO DE RESPONSABILIDADES

O arquivo é o "coração" operacional do sistema, mas sofre de falta de coesão extrema, acumulando funções que deveriam estar em pelo menos 6 módulos diferentes.

| Categoria | Responsabilidades Detectadas |
|---|---|
| **Infra de Fila** | Inicialização de 6 instâncias Bull e definição de processadores. |
| **Messaging** | Disparo de mensagens WhatsApp (Texto, Mídia, Áudio), integração com Wbot. |
| **Schedules** | Monitoramento e execução de mensagens agendadas individuais. |
| **Campanhas** | Fluxo completo: Verificação DB → Processamento → Preparação de Contato → Disparo. |
| **Financeiro** | **Geração de Faturas (Invoices)** e Inativação de empresas por débito (Lines 1635-1729). |
| **Tickets/CRM** | Recuperação de tickets perdidos, atribuição randômica de atendentes, movimentação de Kanban. |
| **System Monitor** | Monitoramento de status online de usuários e saúde das sessões WhatsApp. |
| **Automations** | Jobs de aniversário, falta de resposta e automações de fluxo. |

---

## 🔗 2️⃣ MAPEAMENTO DE DEPENDÊNCIAS (Resumo)

### Dependências Principais (Diagrama Textual)

```text
[HTTP Server / App Startup]
      │
      ▼
[queues.ts] ──────────────────┐
      │                       │
      ├─► [Helpers] ──────────┼─► SendMessage, GetDefaultWhatsApp, Mustache
      │                       │
      ├─► [Services] ─────────┼─► TicketServices, WbotServices, ContactServices
      │                       │
      ├─► [Models] ───────────┼─► User, Company, Ticket, Campaign, Whatsapp, Invoices
      │                       │
      └─► [External] ─────────┴─► Bull (Redis), Cron, Socket.IO, Sequelize
```

**Módulos que dependem de `queues.ts`:**

- `server.ts`: Chama `startQueueProcess()` no boot.
- `SendMessage` (indireto via dependência circular ou lógica de fila).

---

## 🧠 3️⃣ ESTADO EM MEMÓRIA

| Objeto | Uso | Classificação de Risco |
|---|---|---|
| `isProcessing` (let) | Trava global para verificação de campanhas (Line 98). | 🔴 **Crítico (SaaS)**: Não funciona em múltiplas instâncias. |
| `BullQueue` (consts) | Instâncias globais de conexão com Redis. | 🟢 Seguro (Bull gerencia conexão). |
| `CronJob` (instâncias) | Múltiplos cron jobs criados no escopo global e dentro de funções. | 🟠 **Risco Médio**: Se o server reiniciar mal, pode haver jobs órfãos. |

---

## ⚠️ 4️⃣ PONTOS DE CONCORRÊNCIA E RESILIÊNCIA

1. **Race Conditions no Startup**: Uso de `.map(async ...)` sem controle de concorrência em diversos loops (ex: Lines 137, 386, 1132, 1240).
2. **Overlap de Cron e Bull**: Algumas tarefas rodam via `CronJob` que adicionam tarefas ao `Bull`. Se o Cron for muito rápido para o processamento, a fila enche exponencialmente.
3. **Idempotência**: Não há verificação se um job já está em processamento por outra instância do Bull em `handleVerifyCampaigns` (apenas a flag local `isProcessing`).
4. **Promise.all sem limite**: Disparar `Promise.all` em arrays de centenas de campanhas (Line 410) pode sobrecarregar o pool de conexões do banco de dados (Sequelize).

---

## 🔐 5️⃣ MULTI-TENANCY (ISOLAMENTO DE DADOS)

### 🚨 VULNERABILIDADE CRÍTICA ENCONTRADA 🚨

**Vazamento de Configuração Cross-Tenant:**
No arquivo original, a função `checkerWeek` (Line 618) e `checkHour` fazem buscas de configuração **SEM FILTRO DE COMPANYID**:

```typescript
const sabado = await CampaignSetting.findOne({ where: { key: "sabado" } });
```

**Impacto:** O sistema pegará a configuração da primeira empresa que encontrar no banco, aplicando a regra de "Não enviar sábado" de uma empresa para todas as outras do sistema.

**Classificação: 🔴 VULNERÁVEL**

---

## 📦 6️⃣ ACOPLAMENTO E COESÃO

- **God Object**: O arquivo tenta ser um "micro-serviço" completo dentro de um arquivo TS.
- **Complexidade**: A lógica de `handleSendScheduledMessage` e `handleInvoiceCreate` mistura regras de negócio complexas com código de infraestrutura de transporte.
- **Fragilidade**: Qualquer erro de sintaxe ou crash em um `CronJob` de fatura pode parar o processamento de mensagens de todos os clientes.

---

## 🚨 PONTOS SENSÍVEIS (NÃO TOCAR SEM CAUTELA)

1. **Lógica de Envio de Campanhas**: As funções `handleProcessCampaign` e `handlePrepareContact` gerenciam delays complexos para evitar banimentos do WhatsApp. Qualquer alteração no cálculo de `delay` pode causar banimentos em massa de clientes.
2. **Interação com Wbot**: O uso de `getWbot` e `GetWhatsappWbot` depende de sessões ativas na memória do Node.js.
3. **Geração de Faturas**: Alterar `handleInvoiceCreate` sem testes extensivos pode gerar cobranças duplicadas ou inativação indevida de clientes legítimos.

---

## 📊 RECOMENDAÇÕES DE ABORDAGEM

**Nível de Risco da Refatoração: 🔴 ALTO**

### Estratégia Recomendada

1. **Fase 1 (Isolamento)**: Mover cada `handleX` para um service especializado (ex: `CampaignQueueService`, `InvoicingService`).
2. **Fase 2 (Correção Multi-Tenancy)**: Adicionar `companyId` em todas as queries de `CampaignSetting`.
3. **Fase 3 (Instanciamento)**: Transformar as variáveis globais e flags em uma classe singleton com controle de estado via Redis (para suporte multi-instância real).
4. **Fase 4 (Idempotência)**: Implementar travas via Redis (Redlock) para garantir que apenas um worker processe a verificação de campanhas por vez.

---
*Relatório de Análise Técnica — 22/02/2026*
