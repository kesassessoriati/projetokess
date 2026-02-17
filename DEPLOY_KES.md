# 🐳 AtendzAppy - Deploy KES Assessoria (Docker Swarm + Portainer)

> **Atualizado em:** 17/02/2026
> **Ambiente alvo:** Portainer CE, Docker Swarm, Traefik com SSL

---

## 📋 Resumo do Ambiente

| Item | Valor |
|------|-------|
| **Rede Docker** | `kesnet` (overlay, externa) |
| **PostgreSQL** | `pgvector` (instância compartilhada na rede `kesnet`) |
| **Redis** | `atendzappy_redis` (dedicado na stack) |
| **Traefik** | Com `letsencryptresolver` (SSL automático) |
| **Frontend URL** | `https://chat.kesassessoria.com` |
| **Backend URL** | `https://apichat.kesassessoria.com` |
| **Imagem Backend** | `williamprado/atendzappy-backend:latest` |
| **Imagem Frontend** | `williamprado/atendzappy-frontend:latest` |

---

## 🚀 PASSO A PASSO

---

### PASSO 1: Pré-requisitos no Servidor

Antes de iniciar, certifique-se de que:

1. A rede `kesnet` existe:

```bash
docker network ls | grep kesnet
# Se não existir:
docker network create --driver overlay --attachable kesnet
```

1. O container `pgvector` está rodando e acessível na rede `kesnet`:

```bash
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -c "\l"
```

1. Os volumes externos existem:

```bash
docker volume create atendzappy_public
docker volume create atendzappy_logs
docker volume create atendzappy_redis
```

1. O DNS está apontando para o IP do servidor:

```bash
dig +short chat.kesassessoria.com
dig +short apichat.kesassessoria.com
# Ambos devem retornar o IP do servidor
```

---

### PASSO 2: Criar o Banco de Dados

```bash
# Criar o banco
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -c "CREATE DATABASE atendzappy;"

# Verificar
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -c "\l" | grep atendzappy
```

#### 2.1 - Importar Schema (se tiver o empresa.sql)

```bash
# Copiar SQL para o container
docker cp empresa.sql $(docker ps -q -f name=pgvector):/tmp/empresa.sql

# Importar
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -d atendzappy -f /tmp/empresa.sql
```

> 💡 Se não tiver o `empresa.sql`, o backend criará as tabelas automaticamente via migrations ao iniciar.

---

### PASSO 3: Build e Push das Imagens Docker

No servidor onde o Docker está instalado (ou localmente com Docker):

```bash
# Clonar o repositório
git clone https://github.com/williamprado/atendzappy.git
cd atendzappy

# Login no Docker Hub
docker login

# ========================
# Build do BACKEND
# ========================
docker build --no-cache -t williamprado/atendzappy-backend:latest ./backend

# ========================
# Build do FRONTEND
# ========================
docker build --no-cache \
  --build-arg REACT_APP_BACKEND_URL=https://apichat.kesassessoria.com \
  -t williamprado/atendzappy-frontend:latest \
  ./frontend

# ========================
# Push para Docker Hub
# ========================
docker push williamprado/atendzappy-backend:latest
docker push williamprado/atendzappy-frontend:latest
```

> ⏱️ **Tempo estimado:** Backend ~10min, Frontend ~15min
>
> 💡 **Alternativa:** Use o script `build_and_push.sh` incluído no repositório:
>
> ```bash
> bash build_and_push.sh
> ```

---

### PASSO 4: Deploy da Stack via Portainer

1. Acesse o **Portainer**
2. Vá em **Stacks** → **+ Add stack**
3. Nome da stack: `atendzappy`
4. Selecione **"Web editor"**
5. Cole o conteúdo do arquivo `atendzappy_stack.yml` (incluído no repositório)
6. Clique em **"Deploy the stack"**

> A stack está configurada com as imagens do Docker Hub (`williamprado/atendzappy-backend:latest`
> e `williamprado/atendzappy-frontend:latest`), então o Portainer fará o pull automaticamente.

---

### PASSO 5: Verificar o Deploy

```bash
# Ver status dos serviços
docker service ls | grep atendzappy

# Logs do backend
docker service logs --tail 30 atendzappy_atendzappy_backend

# Logs do frontend
docker service logs --tail 10 atendzappy_atendzappy_frontend

# Testar acesso
curl -sk https://apichat.kesassessoria.com
# Esperado: {"message":"Forbidden"}

curl -sk -o /dev/null -w "%{http_code}" https://chat.kesassessoria.com
# Esperado: 200
```

---

### PASSO 6: Configurar Acesso Admin

O usuário padrão é:

| Campo | Valor |
|-------|-------|
| **Email** | `user@faedeveloper.com.br` |
| **Perfil** | Super Admin |

Se a senha não funcionar, resete:

```bash
# Gerar hash bcrypt para a senha "123456"
docker exec $(docker ps -q -f name=atendzappy_atendzappy_backend) \
  node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('123456', 8).then(h => console.log(h));"

# Atualizar no banco (substitua HASH_AQUI pelo hash gerado)
docker exec $(docker ps -q -f name=pgvector) psql -U postgres -d atendzappy \
  -c "UPDATE \"Users\" SET \"passwordHash\" = 'HASH_AQUI' WHERE id = 1;"
```

---

## 🔄 ATUALIZAR A APLICAÇÃO

```bash
# No servidor com Docker:
cd /caminho/para/atendzappy
git pull

# Rebuildar e push
docker build --no-cache -t williamprado/atendzappy-backend:latest ./backend
docker build --no-cache -t williamprado/atendzappy-frontend:latest ./frontend
docker push williamprado/atendzappy-backend:latest
docker push williamprado/atendzappy-frontend:latest

# Forçar atualização no Swarm
docker service update --force --image williamprado/atendzappy-backend:latest atendzappy_atendzappy_backend
docker service update --force --image williamprado/atendzappy-frontend:latest atendzappy_atendzappy_frontend
```

> 💡 **Via Portainer:** Services → serviço → **"Force service update"**

---

## 🛠️ COMANDOS ÚTEIS

```bash
# Logs
docker service logs atendzappy_atendzappy_backend -f --tail 100
docker service logs atendzappy_atendzappy_frontend -f --tail 50

# Acessar banco
docker exec -it $(docker ps -q -f name=pgvector) psql -U postgres -d atendzappy

# Backup do banco
docker exec $(docker ps -q -f name=pgvector) \
  pg_dump -U postgres atendzappy > backup_atendzappy_$(date +%Y%m%d).sql

# Redis
docker exec -it $(docker ps -q -f name=atendzappy_redis) redis-cli -a atendzappy123

# Reiniciar serviços
docker service update --force atendzappy_atendzappy_backend
docker service update --force atendzappy_atendzappy_frontend
```

---

## 📁 ARQUIVOS DO REPOSITÓRIO

```
atendzappy/
├── atendzappy_stack.yml       ← Stack para o Portainer (KES Assessoria)
├── build_and_push.sh          ← Script automatizado de build + push
├── docker-compose.yml         ← Stack de desenvolvimento/referência
├── DEPLOY.md                  ← Documentação de deploy (geral)
├── DEPLOY_KES.md              ← Este documento (KES Assessoria)
├── empresa.sql                ← Schema do banco de dados
├── backend/
│   ├── Dockerfile             ← Multi-stage build (Node 20 Alpine)
│   ├── .dockerignore
│   ├── .sequelizerc
│   └── src/
└── frontend/
    ├── Dockerfile             ← Multi-stage build (Node 20 + Nginx)
    ├── .dockerignore
    ├── nginx.conf             ← Config Nginx (SPA routing + cache)
    ├── public/env.sh          ← Injeção de variáveis em runtime
    └── src/
```
