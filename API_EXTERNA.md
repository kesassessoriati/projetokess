# API Externa — AtendZappy

Documentação completa dos endpoints disponíveis para integrações externas (n8n, ERPs, automações).

---

## Autenticação

Todas as rotas exigem uma **API Key** gerada no painel:

> **Painel → Configurações → API Keys → Gerar nova chave**

### Header obrigatório

```
Authorization: Bearer sua-chave-aqui
```

### Base URL

```
https://seu-dominio.com/api/external
```

---

## Índice

- [Contatos](#contatos)
- [Tickets (Conversas)](#tickets-conversas)
- [Mensagens via API](#mensagens-via-api)
- [WhatsApp (Conexões)](#whatsapp-conexões)
- [Filas](#filas)
- [Usuários](#usuários)
- [Tags](#tags)
- [CRM — Leads](#crm--leads) ⭐ novo
- [CRM — Clientes](#crm--clientes)
- [Pipeline / Funil de Vendas](#pipeline--funil-de-vendas) ⭐ novo
- [Negócios](#negócios)
- [Produtos](#produtos)
- [Serviços](#serviços)
- [Projetos](#projetos)
- [Tarefas de Projeto](#tarefas-de-projeto)
- [Faturas Financeiras](#faturas-financeiras)
- [Tags Kanban (legado)](#tags-kanban-legado-deprecated)

---

## Contatos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/contacts` | Listar contatos |
| GET | `/contacts/:id` | Detalhes de um contato |
| POST | `/contacts` | Criar contato |
| PUT | `/contacts/:id` | Atualizar contato |
| DELETE | `/contacts/:id` | Remover contato |

### POST /contacts

```json
{
  "name": "João Silva",
  "number": "5511999999999",
  "email": "joao@empresa.com",
  "isGroup": false
}
```

---

## Tickets (Conversas)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/tickets` | Listar tickets |
| GET | `/tickets/:id` | Detalhes do ticket |
| GET | `/tickets/:id/messages` | Mensagens do ticket |
| PUT | `/tickets/:id` | Atualizar ticket |
| POST | `/tickets/:id/close` | Encerrar ticket |
| POST | `/tickets/:id/reopen` | Reabrir ticket |
| POST | `/tickets/:id/transfer` | Transferir para fila/usuário |

### POST /tickets/:id/transfer

```json
{
  "queueId": 2,
  "userId": 5
}
```

---

## Mensagens via API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/external/messages/send` | Enviar mensagem de texto/mídia (rota recomendada) |
| POST | `/api/external/messages/send/linkImage` | Enviar imagem por URL |
| POST | `/api/external/messages/check-number` | Validar número |
| POST | `/api/messages/send` | Enviar mensagem (legado, compatibilidade) |

### POST /api/external/messages/send

```json
{
  "number": "5511999999999",
  "body": "Olá, tudo bem?",
  "whatsappId": 1
}
```

---

## WhatsApp (Conexões)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/whatsapps` | Listar conexões |
| GET | `/whatsapps/:id` | Detalhes da conexão |
| GET | `/whatsapps/:id/status` | Status da conexão |
| GET | `/whatsapps/:id/qrcode` | QR Code para conexão |
| POST | `/whatsapps` | Criar conexão |
| PUT | `/whatsapps/:id` | Atualizar conexão |
| DELETE | `/whatsapps/:id` | Remover conexão |
| POST | `/whatsapps/:id/restart` | Reiniciar conexão |
| POST | `/whatsapps/:id/disconnect` | Desconectar |

### GET /whatsapps

Retorna as conexões WhatsApp da empresa. O campo `token` é o token da instância/conexão exibido no painel em **Token para integração externa**.

```json
{
  "whatsapps": [
    {
      "id": 1,
      "name": "Atendimento",
      "token": "token-da-instancia",
      "number": "5511999999999",
      "status": "CONNECTED",
      "channel": "whatsapp"
    }
  ]
}
```

### GET /whatsapps/:id

Retorna os detalhes de uma conexão específica, incluindo o campo `token` da instância/conexão.

---

## Filas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/queues` | Listar filas |
| GET | `/queues/:id` | Detalhes da fila |
| POST | `/queues` | Criar fila |
| PUT | `/queues/:id` | Atualizar fila |
| DELETE | `/queues/:id` | Remover fila |

---

## Usuários

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/users` | Listar usuários |
| GET | `/users/:id` | Detalhes do usuário |
| POST | `/users` | Criar usuário |
| PUT | `/users/:id` | Atualizar usuário |
| DELETE | `/users/:id` | Remover usuário |
| GET | `/users/:id/services` | Serviços do usuário |
| POST | `/users/:id/services` | Adicionar serviços |
| PUT | `/users/:id/services` | Definir serviços |
| DELETE | `/users/:id/services` | Remover serviços |
| GET | `/users/:id/schedule` | Agenda do usuário |
| POST | `/users/:id/schedule` | Criar agenda |
| PUT | `/users/:id/schedule` | Atualizar agenda |
| GET | `/users/:id/appointments` | Compromissos do usuário |
| POST | `/users/:id/appointments` | Criar compromisso |
| PUT | `/users/:id/appointments/:appointmentId` | Atualizar compromisso |
| DELETE | `/users/:id/appointments/:appointmentId` | Remover compromisso |
| PATCH | `/users/:id/appointments/:appointmentId/status` | Atualizar status do compromisso |

---

## Tags

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/tags` | Listar tags |
| GET | `/tags/:id` | Detalhes da tag |
| POST | `/tags` | Criar tag |
| PUT | `/tags/:id` | Atualizar tag |
| DELETE | `/tags/:id` | Remover tag |

---

## CRM — Leads ⭐

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/crm-leads` | Listar leads |
| GET | `/crm-leads/:id` | Detalhes do lead |
| POST | `/crm-leads` | Criar lead |
| PUT | `/crm-leads/:id` | Atualizar lead |
| POST | `/crm-leads/:id/convert` | Converter lead em cliente |

### GET /crm-leads — Query params

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `searchParam` | string | Busca por nome, email, telefone |
| `status` | string | Filtrar por status |
| `ownerUserId` | number | Filtrar por responsável |
| `pageNumber` | number | Página (padrão: 1) |
| `limit` | number | Itens por página (padrão: 20) |

### POST /crm-leads — Criar lead em estágio do funil

```json
{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "phone": "11999999999",
  "companyName": "Empresa Ltda",
  "pipelineId": 1,
  "stageId": 3,
  "ownerUserId": 5,
  "source": "site",
  "temperature": "quente",
  "status": "novo",
  "notes": "Interesse no plano Pro",
  "contactId": 42
}
```

**Campos obrigatórios:** `name`

**Valores de `status`:** `novo`, `em_contato`, `negociando`, `reuniao_agendada`, `proposta_enviada`, `convertido`, `perdido`

**Valores de `temperature`:** `frio`, `morno`, `quente`

> Se `pipelineId`/`stageId` não forem informados, o sistema usa o pipeline e estágio padrão da empresa.

### PUT /crm-leads/:id — Atualizar lead

```json
{
  "status": "negociando",
  "temperature": "quente",
  "stageId": 4,
  "notes": "Reunião agendada para sexta"
}
```

### POST /crm-leads/:id/convert — Converter em cliente

```json
{
  "contactId": 42,
  "phone": "11999999999"
}
```

---

## CRM — Clientes

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/clients` | Listar clientes |
| GET | `/clients/:id` | Detalhes do cliente |
| POST | `/clients` | Criar cliente |
| PUT | `/clients/:id` | Atualizar cliente |
| DELETE | `/clients/:id` | Remover cliente |

---

## Pipeline / Funil de Vendas ⭐

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/pipelines` | Listar pipelines com estágios |
| GET | `/pipelines/:id/board` | Board completo com oportunidades |
| GET | `/opportunities` | Listar oportunidades |
| GET | `/opportunities/:id` | Detalhes de uma oportunidade |
| POST | `/opportunities` | Criar oportunidade |
| PUT | `/opportunities/:id` | Atualizar oportunidade |
| POST | `/opportunities/:id/move` | Mover para outro estágio |

### GET /pipelines — Resposta

```json
{
  "pipelines": [
    {
      "id": 1,
      "name": "Vendas",
      "isDefault": true,
      "stages": [
        { "id": 1, "name": "Prospecção", "order": 1, "color": "#2196F3" },
        { "id": 2, "name": "Qualificação", "order": 2, "color": "#FF9800" },
        { "id": 3, "name": "Proposta", "order": 3, "color": "#9C27B0" },
        { "id": 4, "name": "Fechamento", "order": 4, "color": "#4CAF50" }
      ]
    }
  ]
}
```

### GET /pipelines/:id/board — Query params

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `stageId` | number | Carregar apenas um estágio |
| `limit` | number | Oportunidades por estágio (padrão: 50) |
| `cursor` | string | Cursor para paginação |
| `sort` | string | `CREATED_AT` ou `AI_PRIORITY` |

### GET /opportunities — Query params

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `pipelineId` | number | Filtrar por pipeline |
| `stageId` | number | Filtrar por estágio |
| `contactId` | number | Filtrar por contato |

### POST /opportunities — Criar oportunidade

```json
{
  "pipelineId": 1,
  "stageId": 2,
  "title": "Proposta Empresa XYZ",
  "value": 5000.00,
  "contactId": 42,
  "leadId": 10,
  "assignedUserId": 3
}
```

**Campos obrigatórios:** `pipelineId`, `stageId`, `title`

### PUT /opportunities/:id — Atualizar

```json
{
  "title": "Proposta revisada",
  "value": 7500.00,
  "assignedUserId": 4,
  "stageId": 3
}
```

> Ao informar `stageId` diferente do atual, o sistema move a oportunidade e registra o histórico de movimento automaticamente.

### POST /opportunities/:id/move — Mover estágio

```json
{
  "toStageId": 4,
  "reason": "Cliente aprovou proposta"
}
```

---

## Negócios

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/negocios` | Listar negócios |
| GET | `/negocios/:id` | Detalhes do negócio |
| POST | `/negocios` | Criar negócio |
| PUT | `/negocios/:id` | Atualizar negócio |
| DELETE | `/negocios/:id` | Remover negócio |

---

## Produtos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/products` | Listar produtos |
| GET | `/products/:id` | Detalhes do produto |
| POST | `/products` | Criar produto |
| PUT | `/products/:id` | Atualizar produto |
| DELETE | `/products/:id` | Remover produto |

---

## Serviços

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/services` | Listar serviços |
| GET | `/services/:id` | Detalhes do serviço |
| POST | `/services` | Criar serviço |
| PUT | `/services/:id` | Atualizar serviço |
| DELETE | `/services/:id` | Remover serviço |

---

## Projetos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/projects` | Listar projetos |
| GET | `/projects/:id` | Detalhes do projeto |
| POST | `/projects` | Criar projeto |
| PUT | `/projects/:id` | Atualizar projeto |
| DELETE | `/projects/:id` | Remover projeto |

---

## Tarefas de Projeto

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/project-tasks` | Listar tarefas |
| GET | `/project-tasks/:id` | Detalhes da tarefa |
| POST | `/project-tasks` | Criar tarefa |
| PUT | `/project-tasks/:id` | Atualizar tarefa |
| DELETE | `/project-tasks/:id` | Remover tarefa |

---

## Faturas Financeiras

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/faturas` | Listar faturas |
| GET | `/faturas/:id` | Detalhes da fatura |
| POST | `/faturas` | Criar fatura |
| PUT | `/faturas/:id` | Atualizar fatura |
| DELETE | `/faturas/:id` | Remover fatura |
| POST | `/faturas/:id/pay` | Marcar como paga |
| POST | `/faturas/:id/cancel` | Cancelar fatura |
| GET | `/faturas/project/:projectId` | Faturas de um projeto |
| GET | `/faturas/client/:clientId` | Faturas de um cliente |

---

## Tags Kanban (legado) — DEPRECATED

> ⚠️ **Endpoints marcados como deprecated.** Todas as respostas incluem o header:
>
> ```
> X-Deprecated: true
> X-Deprecated-Message: Use /api/external/pipelines instead of /api/external/tags-kanban
> ```
>
> Migre para os endpoints de [Pipeline / Funil de Vendas](#pipeline--funil-de-vendas).

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/tags-kanban` | Listar tags kanban |
| GET | `/tags-kanban/:id` | Detalhes |
| POST | `/tags-kanban` | Criar tag kanban |
| PUT | `/tags-kanban/:id` | Atualizar |
| DELETE | `/tags-kanban/:id` | Remover |

---

## Exemplos de uso — n8n HTTP Request

### Criar lead no funil (POST /crm-leads)

```json
{
  "method": "POST",
  "url": "https://seu-dominio.com/api/external/crm-leads",
  "headers": {
    "Authorization": "Bearer sua-chave-aqui",
    "Content-Type": "application/json"
  },
  "body": {
    "name": "{{ $json.name }}",
    "email": "{{ $json.email }}",
    "phone": "{{ $json.phone }}",
    "pipelineId": 1,
    "stageId": 3,
    "source": "n8n"
  }
}
```

### Listar pipelines para descobrir IDs (GET /pipelines)

```json
{
  "method": "GET",
  "url": "https://seu-dominio.com/api/external/pipelines",
  "headers": {
    "Authorization": "Bearer sua-chave-aqui"
  }
}
```

### Mover oportunidade de estágio (POST /opportunities/:id/move)

```json
{
  "method": "POST",
  "url": "https://seu-dominio.com/api/external/opportunities/{{ $json.opportunityId }}/move",
  "headers": {
    "Authorization": "Bearer sua-chave-aqui",
    "Content-Type": "application/json"
  },
  "body": {
    "toStageId": 4,
    "reason": "Aprovado pelo cliente"
  }
}
```

---

## Webhooks de eventos (saída)

O sistema pode **enviar** eventos para URLs externas (n8n, ERPs) quando ações ocorrem.

Configure em: **Painel → Configurações → Integrações → Adicionar n8n/Webhook**

### Eventos disponíveis

| Evento | Descrição |
|--------|-----------|
| `MESSAGE_RECEIVED` | Nova mensagem recebida |
| `TICKET_CREATED` | Nova conversa criada |
| `TICKET_ASSIGNED` | Conversa atribuída a agente |
| `TICKET_QUEUE_CHANGED` | Conversa transferida de fila |
| `TICKET_RESOLVED` | Conversa resolvida |
| `TICKET_CLOSED` | Conversa encerrada |
| `CONTACT_CREATED` | Novo contato criado |
| `LEAD_CREATED` | Lead criado |
| `LEAD_UPDATED` | Lead atualizado |
| `LEAD_STATUS_CHANGED` | Status do lead alterado |
| `LEAD_CONVERTED` | Lead convertido em cliente |
| `LEAD_LOST` | Lead marcado como perdido |
| `OPPORTUNITY_CREATED` | Oportunidade criada |
| `OPPORTUNITY_MOVED` | Oportunidade movida no pipeline |
| `OPPORTUNITY_WON` | Oportunidade ganha |
| `OPPORTUNITY_LOST` | Oportunidade perdida |

### Formato do payload enviado

```json
{
  "event": "LEAD_CREATED",
  "timestamp": "2026-03-04T10:30:00.000Z",
  "companyId": 1,
  "data": { ... }
}
```
