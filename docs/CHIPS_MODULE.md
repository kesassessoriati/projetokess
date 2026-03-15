# Modulo Chips

## Visao geral

O modulo `Chips` adiciona gestao de infraestrutura SIM para sessoes WhatsApp, com monitoramento assincrono, integracao com aquecimento e suporte a rotacao de chips em disparos.

## Endpoints criados

Todos os endpoints abaixo exigem autenticacao via `isAuth`.

| Metodo | Rota | Descricao | Observacoes |
| --- | --- | --- | --- |
| `GET` | `/chips/dashboard` | Retorna cards, alertas e lista monitorada de chips | Inclui alertas de recarga e presets de aquecimento |
| `GET` | `/chips` | Lista chips da empresa | Suporta filtros `search` e `status` |
| `GET` | `/chips/:id` | Retorna detalhes completos do chip | Inclui status atualizado e historico |
| `GET` | `/chips/:id/logs` | Retorna logs de atividade do chip | Query opcional `limit` |
| `POST` | `/chips` | Cadastra um novo chip | Escrita restrita a admin |
| `PUT` | `/chips/:id` | Atualiza um chip | Escrita restrita a admin |
| `DELETE` | `/chips/:id` | Exclui um chip | Escrita restrita a admin |
| `POST` | `/chips/:id/recharge` | Registra recarga do chip | Escrita restrita a admin |
| `POST` | `/chips/:id/link-whatsapp` | Associa ou desassocia chip de uma sessao WhatsApp | Escrita restrita a admin |
| `POST` | `/chips/monitoring/refresh` | Forca sincronizacao manual de monitoramento | Escrita restrita a admin |

## Endpoints existentes estendidos

Nenhuma rota existente foi quebrada. Os contratos abaixo receberam extensoes compativeis:

| Metodo | Rota | Extensao |
| --- | --- | --- |
| `POST` | `/whatsapp-warmup/:whatsappId` | Aceita `chipId` e, quando informado, herda automaticamente `messagesPerDay`, `minInterval` e `maxInterval` do chip |
| `GET` | `/whatsapp-warmup/:whatsappId` | Retorna `chip` associado |
| `GET` | `/whatsapp-warmup/summary` | Retorna `chips` disponiveis e `chip` do aquecimento |
| `GET` | `/whatsapp-warmup/:whatsappId/stats` | Retorna `chip` associado ao aquecimento |
| `POST` | `/button-campaigns` | Aceita `dispatchMode` e `chipIds` para rotacao opcional |
| `PUT` | `/button-campaigns/:id` | Aceita `dispatchMode` e `chipIds` para rotacao opcional |
| `POST` | `/scheduled-dispatchers` | Aceita `dispatchMode` e `chipIds` para rotacao opcional |
| `PUT` | `/scheduled-dispatchers/:id` | Aceita `dispatchMode` e `chipIds` para rotacao opcional |

## Tabelas criadas

### `chips`

Tabela principal de gestao dos chips SIM.

Campos principais:

- `id`
- `company_id`
- `number`
- `carrier`
- `plan_type`
- `last_recharge_at`
- `recharge_periodicity_days`
- `recharge_value`
- `predicted_block_at`
- `whatsapp_id`
- `device`
- `responsible`
- `status`
- `health_score`
- `warmup_level`
- `warmup_message_limit`
- `warmup_min_interval`
- `warmup_max_interval`
- `messages_sent_today`
- `total_messages_sent`
- `connected_minutes`
- `disconnect_count`
- `blocking_risk_level`
- `blocking_risk_reason`
- `activation_date`
- `last_connected_at`
- `last_disconnected_at`
- `session_status`
- `notes`
- `created_at`
- `updated_at`

Indices:

- `chips_company_id`
- `chips_company_id_status`
- `chips_company_id_predicted_block_at`
- `chips_whatsapp_id`
- `chips_company_id_number`
- `chips_company_id_number_unique`

### `chip_activity_logs`

Tabela de auditoria de eventos do chip.

Campos:

- `id`
- `company_id`
- `chip_id`
- `event_type`
- `description`
- `event_date`
- `metadata`
- `created_at`
- `updated_at`

Indices:

- `chip_activity_logs_company_id`
- `chip_activity_logs_chip_id`
- `chip_activity_logs_event_type`
- `chip_activity_logs_event_date`

## Colunas adicionadas em tabelas existentes

- `WhatsappWarmups.chipId`
- `ButtonCampaigns.dispatchMode`
- `ButtonCampaigns.chipIds`
- `ButtonCampaigns.rotationCursor`
- `scheduled_dispatchers.dispatch_mode`
- `scheduled_dispatchers.chip_ids`
- `scheduled_dispatchers.rotation_cursor`

## Rotas frontend

| Rota | Tela |
| --- | --- |
| `/chips` | Dashboard e gestao completa de chips |
| `/aquecimento-whatsapp` | Tela existente de aquecimento, agora com seletor de chip |
| `/connections` | Tela existente de sessoes WhatsApp, exposta no grupo `Infraestrutura` |

## Regras operacionais

- Apenas usuarios com perfil `admin` podem criar, atualizar, recarregar, vincular ou excluir chips.
- Usuarios comuns podem visualizar dashboard, lista, detalhes e logs.
- O monitoramento assincrono roda via job agendado a cada 15 minutos em `backend/src/queues.ts`.
- O nivel de aquecimento do chip define presets automaticos de limite de mensagens e intervalo.
- A rotacao de chips em disparos usa apenas chips ativos com sessao WhatsApp conectada.

## Eventos registrados em `chip_activity_logs`

- `recarga`
- `conexao`
- `desconexao`
- `inicio_aquecimento`
- `pausa`
- `risco_detectado`
