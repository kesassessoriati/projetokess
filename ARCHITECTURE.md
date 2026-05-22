# Arquitetura Tecnica

## Visao geral

AtendZappy e uma aplicacao web multi-tenant composta por backend Node.js/TypeScript, frontend React, banco PostgreSQL, Redis/Bull para jobs e Socket.io para tempo real.

O sistema roda em producao em Docker Swarm com Portainer e Traefik. A aplicacao atende multiplas empresas no mesmo ambiente, portanto o isolamento por `companyId` e uma regra arquitetural obrigatoria.

## Separacao backend/frontend

### Backend

O backend em `backend/` concentra:

- API HTTP Express.
- Autenticacao JWT e rotas com Bearer/API Key.
- Models Sequelize.
- Services de negocio.
- Rotas internas e externas.
- Jobs Bull/Redis.
- Integracoes WhatsApp, email, Google, IA, financeiro e webhooks.
- Socket.io.

Pastas principais:

```text
backend/src/controllers
backend/src/services
backend/src/models
backend/src/database
backend/src/routes
backend/src/middleware
backend/src/libs
backend/src/jobs
backend/src/workers
backend/src/queues
```

### Frontend

O frontend em `frontend/` e uma SPA React. A comunicacao com o backend usa Axios em `frontend/src/services/api.js`, com base URL obtida por `getBackendUrl()` em `frontend/src/config.js`.

Pastas principais:

```text
frontend/src/pages
frontend/src/components
frontend/src/layout
frontend/src/services
frontend/src/context
frontend/src/stores
frontend/src/routes
frontend/src/modules
```

## Autenticacao e APIs

O projeto usa JWT em rotas internas e Bearer/API Key em rotas externas. A documentacao `API_EXTERNA.md` indica que as rotas externas usam header:

```http
Authorization: Bearer <api-key>
```

Rotas externas ficam principalmente sob `/api/external` e sao registradas em `backend/src/routes/index.ts`.

Ponto a confirmar: a politica exata de expiracao/revogacao de tokens deve ser confirmada no codigo atual antes de qualquer mudanca em autenticacao.

## Modelo multi-tenant

O isolamento por empresa usa `companyId` como eixo central.

Regras obrigatorias:

- Dados sensiveis ou operacionais devem possuir `companyId`.
- Services e controllers nao devem confiar em `companyId` recebido pelo body quando houver usuario autenticado.
- Use `req.user.companyId` ou contexto autenticado como fonte de verdade.
- Jobs Bull devem carregar e revalidar `companyId` no payload.
- Rotas publicas nunca devem expor dados privados de tenant.

## AsyncLocalStorage

O documento `MULTI_TENANT_SHIELDING.md` identifica `backend/src/context.ts` como responsavel por contexto usando `AsyncLocalStorage`.

Objetivo:

- Criar contexto por request.
- Propagar `companyId` durante a execucao de services, models e hooks.

## Hooks globais Sequelize

O documento `MULTI_TENANT_SHIELDING.md` identifica `backend/src/database/tenantIsolation.ts` como responsavel por hooks globais no Sequelize:

- `beforeFind`: injeta `companyId` automaticamente quando ha contexto.
- `beforeCreate`: garante `companyId` na criacao.
- `beforeBulkUpdate`: protege atualizacoes em lote.

Esses hooks ajudam, mas nao substituem validacao explicita em fluxos criticos.

## Queries raw com sequelize.query()

`sequelize.query()` nao passa pelos hooks globais de isolamento. Toda query raw que acessar dados multi-tenant deve:

- Ter filtro explicito por `companyId`.
- Usar `replacements` ou `bind`.
- Evitar concatenacao de strings.
- Respeitar status, permissao e escopo da entidade.
- Ser justificada tecnicamente quando adicionada.

Exemplo seguro:

```ts
await sequelize.query(
  'SELECT * FROM "Tickets" WHERE "companyId" = :companyId AND id = :id',
  { replacements: { companyId, id } }
);
```

## Modulos principais

### Tickets e mensagens

Tickets, mensagens, contatos, filas e usuarios sao parte do nucleo operacional. Alteracoes nesses fluxos podem afetar atendimento em tempo real, API externa, webhooks, Socket.io e relatorios.

### Campanhas e disparos

Campanhas, disparos em massa, follow-up e scheduled dispatchers sao areas de risco alto. Delays, limites, ordem de envio e selecao de WhatsApp nao devem ser alterados sem analise de impacto.

### WhatsApp/Baileys/providers

O projeto usa Baileys/Whaileys e possui camada de providers em `backend/src/services/whatsapp/providers`. A documentacao `PLANO_MIGRACAO_WHATSMEOW.md` indica que parte do codigo legado ainda chama `getWbot()` diretamente.

Ponto a confirmar: antes de alterar envio de mensagens, validar se o fluxo usa provider abstraction ou acesso direto ao Wbot.

### CRM, pipeline e oportunidades

Rotas e services de CRM incluem leads, clientes, pipeline, oportunidades, projetos, tarefas e automacoes. Esses dados devem sempre ser isolados por `companyId`.

### Financeiro e faturamento

Financeiro, faturas, pagamentos, invoices e cobrancas sao areas criticas. Alteracoes devem preservar contratos de dados e evitar efeitos colaterais como cobranca duplicada ou inativacao indevida.

### Agendamentos e automacoes

Agendamentos, schedules, mensagens programadas, automacoes e jobs dependem de Bull/Redis e do estado do banco. Jobs devem carregar `companyId` e ser idempotentes quando possivel.

### API externa e webhooks

A API externa documentada em `API_EXTERNA.md` expõe contatos, tickets, mensagens, WhatsApp, filas, usuarios, CRM, pipeline e financeiro para integracoes. Contratos de rota nao devem ser alterados sem validacao.

## Filas Bull/Redis

Bull e Redis sao usados para processamento em background. O arquivo `backend/src/queues.ts` foi documentado como ponto central e critico, acumulando campanhas, schedules, financeiro, tickets, automacoes e monitoramento.

Ao alterar jobs:

- Verificar payload.
- Incluir/revalidar `companyId`.
- Evitar query global sem tenant.
- Evitar mudancas amplas em concorrencia e delays.
- Validar rollback.

## Socket.io

Socket.io e usado para eventos em tempo real. Eventos e rooms devem respeitar empresa, usuario e permissao.

Ponto a confirmar: a estrategia exata de rooms por modulo deve ser confirmada em `backend/src/libs/socket.ts` e nos contexts do frontend antes de alteracoes.

## Pontos criticos do sistema

Arquivos/areas que exigem cautela extra:

- `backend/src/queues.ts`
- Campanhas e disparos em massa.
- WhatsApp/Baileys/Wbot/providers.
- Bull/Redis.
- Agendamentos e automacoes.
- Financeiro/faturamento.
- Tickets/mensagens.
- API externa.
- Autenticacao Bearer/API Key.
- Rotas publicas.
- Socket.io.
- Migrations.

## Regras criticas para agentes de IA e LLMs

- Nao alterar arquitetura sem autorizacao.
- Nao remover filtros por `companyId`.
- Nao criar query raw sem filtro por `companyId` quando houver dado multi-tenant.
- Nao usar SQL concatenado; usar `replacements` ou `bind`.
- Nao refatorar arquivos criticos sem necessidade.
- Nao alterar contratos de API sem validacao do Tech Lead.
- Nao alterar migrations antigas sem justificativa tecnica e autorizacao.
- Nao expor secrets, tokens, senhas, API keys ou dados de clientes.
- Nao fazer alteracoes amplas em producao.
- Nao executar deploy, reiniciar containers ou alterar stack sem comando explicito.
- Antes de finalizar tarefa com banco, informar impacto em `companyId`, tenant isolation e queries raw.
