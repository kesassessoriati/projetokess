# AtendZappy

AtendZappy e uma plataforma web multi-tenant para atendimento, CRM, automacoes e canais de comunicacao, com foco em WhatsApp, tickets, campanhas, pipeline comercial, financeiro e integracoes externas.

Este projeto esta em producao. Qualquer alteracao deve ser pequena, rastreavel, validada e compatível com o ambiente atual.

## Stack principal

- Backend: Node.js, TypeScript, Express e Sequelize.
- Frontend: React, CRACO/react-scripts, Material UI v4/v5, styled-components, React Query e Zustand.
- Banco de dados: PostgreSQL, com uso documentado de instancia `pgvector` em producao.
- Filas/background jobs: Bull sobre Redis.
- Tempo real: Socket.io.
- WhatsApp: Baileys/Whaileys e camada de provider em `backend/src/services/whatsapp/providers`.
- Docker: imagens separadas para backend e frontend.
- Producao: Docker Swarm, Portainer, Traefik, Redis, PostgreSQL/pgvector e volumes persistentes.

## Objetivo do sistema

O sistema centraliza atendimento e operacao comercial em um ambiente multi-tenant:

- Atendimento por tickets e mensagens.
- Contatos, filas, usuarios e conexoes WhatsApp.
- Campanhas, disparos, agendamentos e automacoes.
- CRM com leads, clientes, pipeline, oportunidades, projetos, tarefas e financeiro.
- API externa para integracoes como n8n, ERPs e automacoes.
- Modulos adicionais documentados, como Chips, Asterisk/WebRTC, mobile notifications, WhatsApp Warmup e Gestor Financeiro IA.

## Estrutura geral do repositorio

```text
.
|-- backend/                 # API, workers, models, services, rotas e filas
|-- frontend/                # SPA React
|-- asterisk/                # Stack e templates relacionados ao Asterisk/WebRTC
|-- docs/                    # Documentacao adicional por modulo
|-- whatsapp-go-service/     # Servico Go identificado no repositorio
|-- whisper_service/         # Servico de transcricao identificado no compose
|-- docker-compose.yml       # Compose/Swarm de referencia
|-- atendzappy_stack.yml     # Stack de producao Portainer identificada
|-- stack-swarm.example.yml  # Exemplo de stack Swarm
|-- DEPLOY.md                # Guia de deploy geral
|-- DEPLOY_KES.md            # Guia de deploy KES
|-- API_EXTERNA.md           # Documentacao da API externa
```

## Backend

O backend fica em `backend/` e usa TypeScript. As pastas principais identificadas em `backend/src` incluem:

- `controllers/`: camada HTTP.
- `services/`: regras de negocio e integracoes.
- `models/`: modelos Sequelize.
- `database/`: migrations, seeders e configuracao de banco.
- `routes/`: registro das rotas internas, externas e publicas.
- `middleware/`: autenticacao e validacoes.
- `libs/`: bibliotecas internas, incluindo Socket.io e conexoes.
- `queues/`, `jobs/`, `workers/` e `queues.ts`: rotinas de background.
- `__tests__/`: testes existentes.

Comandos identificados em `backend/package.json`:

```bash
npm run build
npm run lint
npm test
npm run db:migrate
npm run db:seed
npm run dev:server
```

## Frontend

O frontend fica em `frontend/` e usa React. As pastas principais identificadas em `frontend/src` incluem:

- `pages/`: telas.
- `components/`: componentes reutilizaveis.
- `layout/`: estrutura da aplicacao.
- `services/`: clientes HTTP e Socket.
- `context/`: contextos React.
- `stores/`: estado global.
- `routes/`: rotas do SPA.
- `modules/`: modulos especificos.

Comandos identificados em `frontend/package.json`:

```bash
npm start
npm run build
npm run builddev
npm test
```

## Banco de dados

O projeto usa Sequelize com PostgreSQL. A producao documentada usa `pgvector` como instancia PostgreSQL compartilhada.

As migrations ficam em `backend/src/database/migrations`. Foram identificadas migrations para indices multi-tenant, TicketNotes, ChatModels, pipeline, automacoes, chips e outros modulos.

## Redis e Bull

Redis e usado para Bull, limitadores e rotinas de background. O compose/stack identifica um Redis dedicado `atendzappy_redis` com volume persistente.

## Socket.io

Socket.io e usado para eventos em tempo real no frontend e backend. Rotinas de socket devem respeitar isolamento por `companyId` e rooms por empresa quando aplicavel.

## Docker e producao

O ambiente documentado roda em Docker Swarm gerenciado pelo Portainer, com Traefik como reverse proxy e SSL. Imagens Docker sao versionadas e publicadas por automacao apos push autorizado para o GitHub.

O agente de codigo nao deve fazer deploy, reiniciar containers, criar imagens manualmente, fazer push para Docker Hub ou alterar stacks de producao sem autorizacao explicita do Tech Lead.

## Fluxo basico de desenvolvimento

1. Verificar Git antes da tarefa.
2. Entender o escopo e localizar arquivos envolvidos.
3. Avaliar impacto em multi-tenant, rotas, filas, jobs, banco e frontend.
4. Fazer a menor alteracao possivel.
5. Validar com comandos leves e inspeção tecnica.
6. Criar commit local.
7. Aguardar autorizacao explicita para push.

## Observacoes para novos devs e agentes de IA

- O sistema e multi-tenant. `companyId` e obrigatorio em qualquer fluxo de dados sensiveis.
- Hooks globais do Sequelize ajudam no isolamento, mas `sequelize.query()` nao passa por esses hooks.
- Nao remova filtros por `companyId`.
- Nao crie query raw sem `companyId` e parametros seguros.
- `backend/src/queues.ts` e area critica.
- Campanhas, disparos, WhatsApp, filas Bull/Redis, financeiro, agendamentos, tickets, mensagens, API externa e autenticacao devem receber atencao extra.
- Nao exponha secrets em commits, logs ou documentacao.

## Pontos de atencao

- Ha documentacao antiga com diferenca entre URL do frontend injetada em runtime e embutida no build. O codigo atual possui `frontend/public/env.sh` e `frontend/src/config.js`, que priorizam `window._env_` em runtime e usam `process.env` como fallback.
- Alguns arquivos de stack/deploy existentes podem conter valores reais ou historicos. Nao copie secrets para novas documentacoes ou commits.
