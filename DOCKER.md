# Docker

## Visao geral

O projeto usa Docker para empacotar backend, frontend e servicos auxiliares. A producao documentada usa Docker Swarm com Portainer e Traefik.

Arquivos Docker identificados:

- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `atendzappy_stack.yml`
- `stack-swarm.example.yml`
- `stack-swarm.yml`
- `asterisk/asterisk-stack.yml`

Aviso: nao copiar credenciais reais de arquivos de stack. Use somente placeholders e variaveis seguras.

## Backend Dockerfile

O backend usa build multi-stage com Node 20:

- Base: `node:20-bookworm-slim`.
- Instala dependencias de build como `python3`, `make`, `g++` e `git`.
- Instala dependencias com `npm install --legacy-peer-deps`.
- Compila TypeScript com `npm run build`.
- Imagem final inclui runtime com `ffmpeg`, `chromium`, bibliotecas para Puppeteer, `curl`, `public/` e `logs/`.
- Expõe porta `8080`.
- Comando final: `node dist/server.js`.

## Frontend Dockerfile

O frontend usa build multi-stage:

- Builder: `node:20-alpine`.
- Instala dependencias com `npm install --legacy-peer-deps`.
- Executa `npm run build`.
- Runtime: `nginx:1.25-alpine`.
- Copia `frontend/nginx.conf`.
- Copia `frontend/public/env.sh` para gerar `env-config.js` em runtime.
- Expõe porta `80`.
- Possui `HEALTHCHECK` HTTP.

## Variaveis de ambiente do frontend

O codigo atual em `frontend/src/config.js` prioriza `window._env_`, gerado pelo `frontend/public/env.sh`, e usa `process.env` como fallback.

Isso significa que variaveis `REACT_APP_*` podem ser injetadas no container em runtime, desde que o script `env.sh` seja executado pelo comando do container.

Ponto de atencao: documentacoes antigas tambem mencionam build args para `REACT_APP_BACKEND_URL`. Antes de alterar esse fluxo, conferir Dockerfile, stack usada e `frontend/src/config.js`.

## Compose de referencia

`docker-compose.yml` define:

- `atendzappy_backend`
- `atendzappy_frontend`
- `whisper_api`
- `atendzappy_redis`
- Volumes externos:
  - `atendzappy_public`
  - `atendzappy_logs`
  - `atendzappy_redis`
- Rede externa:
  - `waianet`

## Servicos dependentes

Servicos identificados na documentacao e stacks:

- PostgreSQL/pgvector: banco principal.
- Redis: filas Bull, limitadores e cache operacional.
- Traefik: reverse proxy e TLS.
- Whisper service: servico de transcricao identificado no compose.
- Asterisk: stack separada para WebRTC/SIP, documentada em `asterisk/README.md`.

## Variaveis de ambiente relevantes

Exemplos seguros, sem valores reais:

```env
NODE_ENV=production
PORT=8080
TZ=America/Sao_Paulo

APP_URL=https://api.exemplo.com
BACKEND_URL=https://api.exemplo.com
FRONTEND_URL=https://app.exemplo.com

DB_DIALECT=postgres
DB_HOST=pgvector
DB_PORT=5432
DB_USER=postgres
DB_PASS=alterar-em-producao
DB_NAME=atendzappy

JWT_SECRET=gerar-com-openssl-rand-hex-32
JWT_REFRESH_SECRET=gerar-com-openssl-rand-hex-32

REDIS_URI=redis://redis:6379
REDIS_OPT_LIMITER_MAX=1
REDIS_OPT_LIMITER_DURATION=3000

REACT_APP_BACKEND_URL=https://api.exemplo.com
```

## Volumes

Volumes identificados:

- `atendzappy_public`: arquivos de midia/uploads do backend.
- `atendzappy_logs`: logs da aplicacao.
- `atendzappy_redis`: persistencia do Redis.

## Cuidados com secrets

- Nunca commitar `.env` com valores reais.
- Nunca copiar secrets reais para documentacao.
- Nunca expor valores reais de `DB_PASS`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, tokens Meta/Google/UAZAPI, SMTP, Redis ou Portainer.
- Preferir placeholders em arquivos versionados.
- Em producao, usar Portainer/Swarm secrets ou variaveis de ambiente gerenciadas fora do Git, conforme estrategia aprovada pelo Tech Lead.

## O que nao deve ser feito manualmente

Sem autorizacao explicita:

- Nao criar imagem Docker manualmente.
- Nao fazer push para Docker Hub.
- Nao alterar stack de producao.
- Nao reiniciar containers.
- Nao rodar migrations em producao.
- Nao alterar Traefik labels.
- Nao mudar volumes ou redes.
- Nao executar comandos destrutivos.

## Validacao local segura

Quando necessario e seguro:

```bash
cd backend
npm run build
npm run lint

cd ../frontend
npm run build
```

Se o build for pesado ou inviavel no ambiente local, registrar a limitacao na resposta final da tarefa.
