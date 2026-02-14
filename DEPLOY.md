# 🐳 AtendzAppy - Guia Completo de Deploy (Docker Swarm + Portainer)

> **Última atualização:** 14/02/2026
> **Testado e validado em:** Ubuntu 24.04 LTS, Docker Swarm, Portainer CE

---

## 📋 Resumo do Ambiente

| Item | Valor |
|------|-------|
| **Servidor** | `62.169.17.13` (Contabo, Ubuntu 24.04 LTS) |
| **Rede Docker** | `waianet` (overlay, externa) |
| **PostgreSQL** | `pgvector` (instância compartilhada) |
| **Redis** | `atendzappy_redis` (dedicado) |
| **Traefik** | Já rodando com `letsencryptresolver` (SSL automático) |
| **Gerenciador** | Portainer (`https://portainer.waiasolutions.site`) |
| **Frontend URL** | `https://atendzappy.waiasolutions.site` |
| **Backend URL** | `https://apiatendzappy.waiasolutions.site` |
| **Node.js** | v20 (Alpine) nos Dockerfiles |

---

## 🚀 PASSO A PASSO COMPLETO

---

### PASSO 1: Configurar o Repositório Git

No seu computador local, inicialize o repositório e envie para o GitHub:

```bash
# Na pasta do projeto
cd /caminho/para/atendzappy

# Inicializar Git
git init
git remote add origin https://github.com/williamprado/atendzappy.git

# Configurar Git
git config user.email "seuemail@exemplo.com"
git config user.name "Seu Nome"

# Adicionar e commitar
git add .
git commit -m "Initial commit"

# Enviar para o GitHub
git push -u origin master
```

> ⚠️ **IMPORTANTE sobre o .gitignore:**
> Certifique-se de que o `.gitignore` exclui:
>
> - `node_modules/`
> - `.env` (arquivos com credenciais reais)
> - Arquivos grandes (`.mp4`, `.zip`, etc.)
> - Não commite credenciais reais no repositório!

---

### PASSO 2: Conectar ao Servidor via SSH

```bash
ssh -o StrictHostKeyChecking=no root@62.169.17.13
```

---

### PASSO 3: Clonar o Repositório no Servidor

```bash
cd /opt
git clone https://github.com/williamprado/atendzappy.git
cd /opt/atendzappy
```

> 💡 Se o repositório já existe, atualize com:
>
> ```bash
> cd /opt/atendzappy && git pull
> ```

---

### PASSO 4: Criar os Volumes Docker (Externos)

Os volumes precisam existir **ANTES** do deploy da stack:

```bash
docker volume create atendzappy_public
docker volume create atendzappy_logs
docker volume create atendzappy_redis
```

Verificar se foram criados:

```bash
docker volume ls | grep atendzappy
```

Resultado esperado:

```
local     atendzappy_logs
local     atendzappy_public
local     atendzappy_redis
```

---

### PASSO 5: Criar o Banco de Dados no PostgreSQL

O AtendzAppy utiliza a instância compartilhada do PostgreSQL (`pgvector`):

```bash
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -c "CREATE DATABASE atendzappy;"
```

Verificar se foi criado:

```bash
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -c "\l" | grep atendzappy
```

---

### PASSO 6: Importar o Schema do Banco de Dados

O arquivo `empresa.sql` contém toda a estrutura de tabelas e dados iniciais. Ele deve ser importado **antes** do primeiro start do backend.

```bash
# Copiar o arquivo SQL para dentro do container pgvector
docker cp /opt/atendzappy/empresa.sql $(docker ps -q -f name=pgvector):/tmp/empresa.sql

# Importar o SQL no banco atendzappy
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -d atendzappy -f /tmp/empresa.sql
```

Verificar se as tabelas foram criadas (deve retornar ~102 tabelas):

```bash
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -d atendzappy -c "\dt" | tail -5
```

> ⚠️ **NOTA:** O comando pode exibir um erro `invalid command \unrestrict` no final — isso é inofensivo e pode ser ignorado.

> 💡 Se você não tem o `empresa.sql`, o backend pode criar as tabelas via migrations:
>
> ```bash
> docker exec $(docker ps -q -f name=atendzappy_atendzappy_backend) npx sequelize db:migrate
> docker exec $(docker ps -q -f name=atendzappy_atendzappy_backend) npx sequelize db:seed:all
> ```
>
> Porém o `empresa.sql` já inclui tudo (tabelas + dados iniciais).

---

### PASSO 7: Buildar as Imagens Docker

> ⚠️ **IMPORTANTE:** Os Dockerfiles do backend e frontend utilizam **Node.js 20** (Alpine).
> A versão 18 causa erros de compatibilidade com `@whiskeysockets/baileys` e `@mui/icons-material`.
> Além disso, o comando `npm ci` foi substituído por `npm install --legacy-peer-deps` para resolver
> conflitos de peer dependencies.

#### 7.1 - Build do Backend

```bash
cd /opt/atendzappy

docker build --no-cache -t atendzappy-backend:latest ./backend
```

⏱️ **Tempo estimado:** 5-10 minutos

> **O que o Dockerfile do backend faz:**
>
> 1. Usa `node:20-alpine` como base
> 2. Instala dependências com `npm install --legacy-peer-deps`
> 3. Compila o TypeScript (`npm run build`)
> 4. Cria uma imagem de produção apenas com os artefatos compilados
> 5. Imagem final: ~1.67 GB

#### 7.2 - Build do Frontend

```bash
docker build --no-cache \
  --build-arg REACT_APP_BACKEND_URL=https://apiatendzappy.waiasolutions.site \
  --build-arg REACT_APP_HOURS_CLOSE_TICKETS_AUTO=24 \
  -t atendzappy-frontend:latest ./frontend
```

⏱️ **Tempo estimado:** 10-15 minutos (o build do React é pesado)

> **O que o Dockerfile do frontend faz:**
>
> 1. Usa `node:20-alpine` como base para o builder
> 2. Instala dependências com `npm install --legacy-peer-deps`
> 3. Compila o React (`npm run build`)
> 4. Copia os arquivos estáticos para `nginx:alpine`
> 5. Imagem final: ~65 MB

> ⚠️ **ATENÇÃO:** A `REACT_APP_BACKEND_URL` é embutida **no momento do build**.
> Se mudar o domínio do backend, é necessário **rebuildar** o frontend.

#### 7.3 - Verificar se as Imagens Foram Criadas

```bash
docker images | grep atendzappy
```

Resultado esperado:

```
atendzappy-backend    latest    ac03644185b7    2 min ago    1.67GB
atendzappy-frontend   latest    3e51e8a90102    1 min ago    65.1MB
```

---

### PASSO 8: Configurar o DNS

Acesse seu painel de DNS (Cloudflare, Route53, etc.) e crie os registros:

| Registro | Tipo | Destino |
|----------|------|---------|
| `apiatendzappy.waiasolutions.site` | A | `62.169.17.13` |
| `atendzappy.waiasolutions.site` | A | `62.169.17.13` |

Verificar se o DNS está propagado:

```bash
dig +short apiatendzappy.waiasolutions.site
dig +short atendzappy.waiasolutions.site
```

Ambos devem retornar `62.169.17.13`.

---

### PASSO 9: Deploy da Stack via Portainer

#### 9.1 - Acesse o Portainer

- Abra: `https://portainer.waiasolutions.site`

#### 9.2 - Criar nova Stack

1. No menu lateral, clique em **Stacks**
2. Clique em **+ Add stack**
3. Nome da stack: `atendzappy`

#### 9.3 - Colar o docker-compose.yml

Selecione **"Web editor"** e cole o conteúdo a seguir (ajuste as credenciais conforme necessário):

```yaml
version: "3.7"

services:

## --------------------------- ATENDZAPPY BACKEND --------------------------- ##

  atendzappy_backend:
    image: atendzappy-backend:latest

    volumes:
      - atendzappy_public:/app/public
      - atendzappy_logs:/app/logs

    networks:
      - waianet

    environment:
      - NODE_ENV=production
      - PORT=8080
      - TZ=America/Sao_Paulo

      - APP_URL=https://apiatendzappy.waiasolutions.site
      - BACKEND_URL=https://apiatendzappy.waiasolutions.site
      - FRONTEND_URL=https://atendzappy.waiasolutions.site

      - DB_DIALECT=postgres
      - DB_HOST=pgvector
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASS=SUA_SENHA_POSTGRES
      - DB_NAME=atendzappy

      - JWT_SECRET=GERE_UM_HASH_SEGURO_COM_openssl_rand_hex_32
      - JWT_REFRESH_SECRET=GERE_OUTRO_HASH_SEGURO_COM_openssl_rand_hex_32

      - REDIS_URI=redis://:atendzappy123@atendzappy_redis:6379
      - REDIS_OPT_LIMITER_MAX=1
      - REGIS_OPT_LIMITER_DURATION=3000

      - USER_LIMIT=999
      - CONNECTIONS_LIMIT=999
      - CLOSED_SEND_BY_ME=true

      - VERIFY_TOKEN=whaticket

      - FACEBOOK_APP_ID=SEU_FACEBOOK_APP_ID
      - FACEBOOK_APP_SECRET=SEU_FACEBOOK_APP_SECRET

      - GOOGLE_CLIENT_ID=SEU_GOOGLE_CLIENT_ID
      - GOOGLE_CLIENT_SECRET=SEU_GOOGLE_CLIENT_SECRET
      - GOOGLE_REDIRECT_URI=https://apiatendzappy.waiasolutions.site/google-calendar/oauth/callback

      - UAZAPI_ADMIN_TOKEN=SEU_UAZAPI_TOKEN
      - UAZAPI_BASE_URL=https://free.uazapi.com
      - UAZAPI_WEBHOOK_URL=https://apiatendzappy.waiasolutions.site/webhook/uazapi

    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: "1"
          memory: 1024M
      labels:
        - traefik.enable=true
        - traefik.http.routers.atendzappy_backend.rule=Host(`apiatendzappy.waiasolutions.site`)
        - traefik.http.routers.atendzappy_backend.entrypoints=websecure
        - traefik.http.routers.atendzappy_backend.tls.certresolver=letsencryptresolver
        - traefik.http.routers.atendzappy_backend.priority=1
        - traefik.http.routers.atendzappy_backend.service=atendzappy_backend
        - traefik.http.services.atendzappy_backend.loadbalancer.server.port=8080
        - traefik.http.services.atendzappy_backend.loadbalancer.passHostHeader=true
        - traefik.http.middlewares.atendzappy_sslheader.headers.customrequestheaders.X-Forwarded-Proto=https
        - traefik.http.routers.atendzappy_backend.middlewares=atendzappy_sslheader

## --------------------------- ATENDZAPPY FRONTEND --------------------------- ##

  atendzappy_frontend:
    image: atendzappy-frontend:latest

    networks:
      - waianet

    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
      labels:
        - traefik.enable=true
        - traefik.http.routers.atendzappy_frontend.rule=Host(`atendzappy.waiasolutions.site`)
        - traefik.http.routers.atendzappy_frontend.entrypoints=websecure
        - traefik.http.routers.atendzappy_frontend.tls.certresolver=letsencryptresolver
        - traefik.http.routers.atendzappy_frontend.priority=1
        - traefik.http.routers.atendzappy_frontend.service=atendzappy_frontend
        - traefik.http.services.atendzappy_frontend.loadbalancer.server.port=80
        - traefik.http.services.atendzappy_frontend.loadbalancer.passHostHeader=true

## --------------------------- ATENDZAPPY REDIS --------------------------- ##

  atendzappy_redis:
    image: redis:7-alpine
    command:
      - "redis-server"
      - "--appendonly"
      - "yes"
      - "--port"
      - "6379"
      - "--maxmemory"
      - "512mb"
      - "--maxmemory-policy"
      - "allkeys-lru"
      - "--requirepass"
      - "atendzappy123"

    healthcheck:
      test: ["CMD", "redis-cli", "-a", "atendzappy123", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

    volumes:
      - atendzappy_redis:/data

    networks:
      - waianet

    deploy:
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: "0.5"
          memory: 512M

## --------------------------- VOLUMES --------------------------- ##

volumes:
  atendzappy_public:
    external: true
    name: atendzappy_public
  atendzappy_logs:
    external: true
    name: atendzappy_logs
  atendzappy_redis:
    external: true
    name: atendzappy_redis

## --------------------------- NETWORK --------------------------- ##

networks:
  waianet:
    external: true
    name: waianet
```

#### 9.4 - Deploy

- Clique em **"Deploy the stack"**
- Aguarde todos os serviços ficarem verdes ✅

---

### PASSO 10: Verificar o Deploy

```bash
# Ver status dos serviços (todos devem estar 1/1)
docker service ls | grep atendzappy

# Ver logs do backend (procurar "Server started on port: 8080")
docker service logs --tail 30 atendzappy_atendzappy_backend

# Ver logs do frontend
docker service logs --tail 10 atendzappy_atendzappy_frontend

# Testar acesso via curl
curl -sk https://apiatendzappy.waiasolutions.site
# Resultado esperado: {"message":"Forbidden"} (precisa autenticação)

curl -sk -o /dev/null -w "%{http_code}" https://atendzappy.waiasolutions.site
# Resultado esperado: 200
```

---

### PASSO 11: Resetar Senha do Admin (se necessário)

O usuário padrão do sistema é:

| Campo | Valor |
|-------|-------|
| **Email** | `user@faedeveloper.com.br` |
| **Perfil** | `admin` (Super Admin) |

Se a senha não funcionar, gere um novo hash e atualize:

```bash
# Gerar hash bcrypt para a senha "123456"
docker exec $(docker ps -q -f name=atendzappy_atendzappy_backend) \
  node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('123456', 8).then(h => console.log(h));"

# Copie o hash gerado (ex: $2a$08$xxxxx...) e atualize no banco:
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -d atendzappy \
  -c "UPDATE \"Users\" SET \"passwordHash\" = 'HASH_GERADO_AQUI' WHERE id = 1;"
```

Depois faça login em `https://atendzappy.waiasolutions.site` com:

- **Email:** `user@faedeveloper.com.br`
- **Senha:** `123456`

---

## 🔄 ATUALIZAR A APLICAÇÃO (FUTURO)

Quando precisar atualizar o código:

```bash
# 1. Conectar ao servidor
ssh root@62.169.17.13
cd /opt/atendzappy

# 2. Atualizar o código
git pull

# 3. Rebuildar as imagens
docker build --no-cache -t atendzappy-backend:latest ./backend

docker build --no-cache \
  --build-arg REACT_APP_BACKEND_URL=https://apiatendzappy.waiasolutions.site \
  --build-arg REACT_APP_HOURS_CLOSE_TICKETS_AUTO=24 \
  -t atendzappy-frontend:latest ./frontend

# 4. Forçar atualização no Swarm
docker service update --force atendzappy_atendzappy_backend
docker service update --force atendzappy_atendzappy_frontend
```

> 💡 **Via Portainer:** Também pode ir em Services → selecionar o serviço →
> clicar em **"Force service update"**

---

## 🛠️ COMANDOS ÚTEIS

```bash
# ====== LOGS ======
docker service logs atendzappy_atendzappy_backend -f --tail 100
docker service logs atendzappy_atendzappy_frontend -f --tail 50
docker service logs atendzappy_atendzappy_redis -f --tail 50

# ====== BANCO DE DADOS ======
# Acessar o banco do atendzappy
docker exec -it $(docker ps -q -f name=pgvector) psql -U postgres -d atendzappy

# Listar tabelas
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -d atendzappy -c "\dt"

# Listar usuários
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -d atendzappy \
  -c "SELECT id, name, email, profile, super FROM \"Users\";"

# Backup do banco
docker exec $(docker ps -q -f name=pgvector) \
  pg_dump -U postgres atendzappy > backup_atendzappy_$(date +%Y%m%d).sql

# Restaurar backup
docker cp backup.sql $(docker ps -q -f name=pgvector):/tmp/backup.sql
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -d atendzappy -f /tmp/backup.sql

# ====== CONTAINER ======
# Acessar terminal do backend
docker exec -it $(docker ps -q -f name=atendzappy_atendzappy_backend) sh

# Acessar terminal do frontend
docker exec -it $(docker ps -q -f name=atendzappy_atendzappy_frontend) sh

# ====== REDIS ======
docker exec -it $(docker ps -q -f name=atendzappy_redis) redis-cli -a atendzappy123

# ====== ESCALAR ======
docker service scale atendzappy_atendzappy_backend=2

# ====== REINICIAR ======
docker service update --force atendzappy_atendzappy_backend
docker service update --force atendzappy_atendzappy_frontend

# ====== REMOVER TUDO (cuidado!) ======
docker stack rm atendzappy
```

---

## 🐛 PROBLEMAS ENCONTRADOS E SOLUÇÕES

### Problema 1: `npm ci` falha com conflitos de peer dependencies

**Erro:**

```
npm error ERESOLVE could not resolve dependency
npm error EBADENGINE Unsupported engine { node: '>=20' }
```

**Causa:** Os pacotes `@whiskeysockets/baileys`, `@mui/icons-material` e outros exigem Node.js 20+ e têm conflitos de peer dependencies.

**Solução aplicada nos Dockerfiles:**

1. Alterar a base de `node:18-alpine` para `node:20-alpine`
2. Substituir `RUN npm ci` por `RUN npm install --legacy-peer-deps`
3. Substituir `RUN npm prune --production` por `RUN npm prune --production --legacy-peer-deps`

### Problema 2: Stack criada via terminal aparece como "Limited" no Portainer

**Causa:** Stacks criadas via `docker stack deploy` no terminal são gerenciadas pelo Docker Swarm, não pelo Portainer.

**Solução:**

1. Remover a stack via terminal: `docker stack rm atendzappy`
2. Recriar a stack pelo Portainer (Stacks → + Add stack)
3. Isso dá controle **Total** ao Portainer (logs, restart, escalar, etc.)

> ⚠️ A remoção causa uma breve interrupção (~30 segundos). Os volumes, banco de dados e imagens são preservados.

### Problema 3: `relation "Companies" does not exist`

**Causa:** O banco de dados está vazio. O backend tenta acessar tabelas que ainda não existem.

**Solução:** Importar o `empresa.sql` ANTES de iniciar o backend (veja Passo 6).

### Problema 4: Senha do admin não funciona

**Causa:** O hash da senha no banco pode estar corrompido ou desconhecido.

**Solução:** Resetar a senha via banco de dados (veja Passo 11).

### Problema 5: `image not found`

**Causa:** A imagem Docker não foi buildada ou o nome está diferente.

**Solução:**

```bash
docker images | grep atendzappy
# Se não aparecer, faça o build novamente (Passo 7)
```

### Problema 6: Frontend mostra erro de conexão com a API

**Causa:** A `REACT_APP_BACKEND_URL` é embutida no build do React. Se a URL estiver errada, precisa rebuildar.

**Solução:**

```bash
docker build --no-cache \
  --build-arg REACT_APP_BACKEND_URL=https://apiatendzappy.waiasolutions.site \
  -t atendzappy-frontend:latest ./frontend

docker service update --force atendzappy_atendzappy_frontend
```

### Problema 7: SSL não funciona / certificado inválido

**Causa:** DNS não está apontando para o IP correto ou Traefik ainda não gerou o certificado.

**Solução:**

```bash
# Verificar DNS
dig +short apiatendzappy.waiasolutions.site
dig +short atendzappy.waiasolutions.site
# Ambos devem retornar o IP do servidor

# Verificar logs do Traefik
docker service logs $(docker service ls -q -f name=traefik) --tail 50 | grep atendzappy
```

### Problema 8: Push para GitHub bloqueado por credenciais no código

**Causa:** GitHub Secret Scanning detecta credenciais reais no código.

**Solução:**

- Nunca commite credenciais reais (senhas, tokens, API keys)
- Use placeholders nos arquivos versionados (`.env.example`, `docker-compose.yml`)
- Insira as credenciais reais **apenas** no Portainer ao fazer o deploy

---

## 📁 ESTRUTURA DE ARQUIVOS

### No Servidor (`/opt/atendzappy/`)

```
/opt/atendzappy/
├── docker-compose.yml         ← Stack para o Portainer (com placeholders)
├── empresa.sql                ← Schema completo do banco de dados
├── DEPLOY.md                  ← Este documento
├── backend/
│   ├── Dockerfile             ← Build da imagem (Node 20 + legacy-peer-deps)
│   ├── .dockerignore
│   ├── .env.example           ← Variáveis de ambiente (apenas exemplos)
│   ├── .sequelizerc
│   ├── package.json
│   ├── tsconfig.json
│   └── src/                   ← Código fonte TypeScript
└── frontend/
    ├── Dockerfile             ← Build da imagem (Node 20 + Nginx)
    ├── .dockerignore
    ├── nginx.conf             ← Config do Nginx (SPA routing)
    ├── package.json
    └── src/                   ← Código fonte React
```

### Volumes Docker

| Volume | Caminho no Container | Função |
|--------|---------------------|--------|
| `atendzappy_public` | `/app/public` (backend) | Uploads, avatares, mídia |
| `atendzappy_logs` | `/app/logs` (backend) | Logs da aplicação |
| `atendzappy_redis` | `/data` (redis) | Dados persistentes do Redis |

---

## 🔐 INFORMAÇÕES DE ACESSO

| Recurso | URL/Endereço |
|---------|-------------|
| **Frontend** | `https://atendzappy.waiasolutions.site` |
| **Backend API** | `https://apiatendzappy.waiasolutions.site` |
| **Portainer** | `https://portainer.waiasolutions.site` |
| **SSH** | `ssh root@62.169.17.13` |
| **PostgreSQL** | Via pgvector (rede interna Docker) |
| **Redis** | `redis://:atendzappy123@atendzappy_redis:6379` (rede interna) |
| **Admin Email** | `user@faedeveloper.com.br` |
| **Admin Perfil** | Super Admin (`super = true`) |
