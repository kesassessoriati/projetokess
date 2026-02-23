# 🔍 ANÁLISE DE IMPACTO: CORREÇÕES P0 MULTI-TENANT

## Refatoração de Isolamento no `queues.ts`

**Data:** 22/02/2026  
**Status:** Análise Pré-Implementação  

---

## 1. 🔍 MAPA DE DEPENDÊNCIA

### Fluxo de Execução

- **`handleVerifyCampaigns`**: Ponto de entrada crítico. Invocado a cada 20 segundos pelo `campaignQueue.VerifyCampaignsDaatabase`. Sua única função é identificar campanhas `PROGRAMADA` e movê-las para a fila de processamento.
- **`handleProcessCampaign`**: Consome os registros gerados pela verificação. Aqui reside a chamada para `getSettings`.
- **`getSettings`**: Busca configurações de intervalo e variáveis. É o "motor" que dita o tempo entre as mensagens.
- **`checkerWeek` / `checkTime`**: Atualmente comentadas no código, mas possuem lógica de `pause/resume` na fila global `messageQueue`.

### Localização de Uso

- **Apenas Worker**: Sim, estas funções são exclusivas do ecossistema de filas (Bull/Cron). Não são chamadas diretamente por Controllers HTTP (estas usam Services dedicados).

---

## 2. ⚠️ RISCO DE REGRESSÃO

| Função | Risco Identificado | Impacto |
|---|---|---|
| `handleVerifyCampaigns` | Erro na query filtrada ou SQL bruto mal formatado. | **Total**: Nenhuma campanha de nenhuma empresa será iniciada. |
| `getSettings` | Falha ao encontrar configurações para empresas novas/sem dados. | **Parcial**: Crash do worker para aquela campanha específica. |
| `checkerWeek / checkTime` | Ativação acidental ou erro no `resume`. | **Crítico**: Bloqueio de todas as mensagens do sistema (todos os tenants). |
| `Sync de Banco` | Inconsistência entre ID de Job e Database. | **Médio**: Duplicação de envios ou jobs "perdidos" no Redis. |

---

## 3. 🧪 ESTRATÉGIA SEGURA DE IMPLEMENTAÇÃO

### Abordagem Incremental (NÃO quebra o fluxo atual)

1. **Assinatura de Função**: Alterar `getSettings(campaign)` para utilizar o `campaign.companyId` que já existe no objeto.
2. **Payload do Bull**: Atualmente, o job `ProcessCampaign` envia apenas `{ id: campaign.id }`. Devemos enriquecer para `{ id: campaign.id, companyId: campaign.companyId }` para evitar buscas desnecessárias ou inseguras no worker.
3. **Sanitização de Query Bruta**: Transformar o `SELECT` global de campanhas em uma iteração por Company (mais lento, porém 100% isolado) ou garantir que o `companyId` seja retornado no result set para uso posterior.
4. **Refatoração de Pause/Resume**: A lógica de pausar a fila inteira (`messageQueue.pause()`) deve ser **ABANDONADA**. Devemos mover a validação de horário para dentro do `handlePrepareContact`, onde se o horário for inválido, o job é reagendado (delay) em vez de parar o motor global.

---

## 📦 4. NECESSIDADE DE MIGRAÇÃO E AUDITORIA DE DADOS

### Ponto Crítico de Dados

Antes de aplicar as travas de código (`where: { companyId }`), precisamos garantir a saúde dos dados existentes:

1. **Registros Órfãos**: Verificar se existem `Campaigns` ou `CampaignSettings` com `companyId` nulo. Se existirem, o código novo irá ignorá-los, causando "desaparecimento" de campanhas em produção.
2. **Scripts de Correção**:
    - Recomenda-se uma migration SQL simples:
      `UPDATE "Campaigns" SET "companyId" = 1 WHERE "companyId" IS NULL;` (Ajustar ID conforme a realidade do cliente principal).

---

## 🔁 5. PLANO DE ROLLBACK

1. **Código**: Reversão imediata do commit no `queues.ts`.
2. **Estado da Fila**: O Bull persiste jobs no Redis. Se inserirmos jobs com payload novo e precisarmos voltar, os jobs antigos podem falhar por falta de campos ou vice-versa.
    - **Ação**: O plano de rollback deve incluir o comando `FLUSHDB` (ou limpeza seletiva das keys da `CampaignQueue` via `redis-cli`) para evitar inconsistência de formato de dado.

---

**Nível de Risco da Operação: 🟠 MÉDIO-ALTO**  
**Recomendação**: Proceder com a atualização de `getSettings` e `VerifyCampaigns` primeiro, mantendo as funções de horário comentadas até a refatoração completa do modelo de pausa de fila.
