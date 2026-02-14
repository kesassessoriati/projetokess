# 🐳 AtendzAppy - Guia de Deploy via Portainer

## 📋 Resumo do Ambiente

| Item | Valor |
|------|-------|
| **Rede** | `waianet` (overlay, externa) |
| **PostgreSQL** | `pgvector` (compartilhado) |
| **Traefik** | Já rodando com `letsencryptresolver` |
| **Gerenciador** | Portainer |
| **Frontend URL** | `https://atendzappy.waiasolutions.site` |
| **Backend URL** | `https://apiatendzappy.waiasolutions.site` |

---

## 🚀 PASSO A PASSO COMPLETO

### PASSO 1: Enviar o projeto para o servidor

Envie a pasta do projeto para o servidor via SCP, SFTP ou Git:

```bash
# Opção A: Via SCP (do seu PC para o servidor)
scp -r ./atendzappy root@SEU_IP_SERVIDOR:/opt/atendzappy

# Opção B: Via Git (clone no servidor)
ssh root@SEU_IP_SERVIDOR
cd /opt
git clone SEU_REPOSITORIO atendzappy
```

> 💡 **Dica:** Certifique-se de que os arquivos `Dockerfile`, `.dockerignore` e `nginx.conf`
> estão presentes nas pastas `backend/` e `frontend/`.

---

### PASSO 2: Conectar ao servidor via SSH

```bash
ssh root@SEU_IP_SERVIDOR
cd /opt/atendzappy
```

---

### PASSO 3: Criar os Volumes Externos

Os volumes precisam existir ANTES do deploy. Execute no servidor:

```bash
docker volume create atendzappy_public
docker volume create atendzappy_logs
docker volume create atendzappy_redis
```

Verifique se foram criados:

```bash
docker volume ls | grep atendzappy
```

---

### PASSO 4: Criar o banco de dados no PostgreSQL (pgvector)

Acesse o PostgreSQL compartilhado para criar o banco do AtendzAppy:

```bash
# Encontrar o container do pgvector
docker ps | grep pgvector

# Acessar o PostgreSQL
docker exec -it $(docker ps -q -f name=pgvector) psql -U postgres

# Dentro do psql, execute:
CREATE DATABASE atendzappy;
\q
```

---

### PASSO 5: Buildar as imagens Docker

#### 5.1 - Build do Backend

```bash
cd /opt/atendzappy

# Buildar a imagem do backend
docker build -t atendzappy-backend:latest ./backend
```

⏱️ **Tempo estimado:** 5-10 minutos (primeira vez)

#### 5.2 - Build do Frontend

```bash
# Buildar a imagem do frontend
# A URL do backend é passada como argumento de build
docker build \
  --build-arg REACT_APP_BACKEND_URL=https://apiatendzappy.waiasolutions.site \
  --build-arg REACT_APP_HOURS_CLOSE_TICKETS_AUTO=24 \
  --build-arg REACT_APP_FACEBOOK_APP_ID=776874187723945 \
  -t atendzappy-frontend:latest ./frontend
```

⏱️ **Tempo estimado:** 5-15 minutos (primeira vez)

#### 5.3 - Verificar se as imagens foram criadas

```bash
docker images | grep atendzappy
```

Resultado esperado:

```
atendzappy-backend    latest    abc123    2 minutes ago    800MB
atendzappy-frontend   latest    def456    1 minute ago     50MB
```

---

### PASSO 6: Configurar o DNS

Acesse seu painel de DNS e crie os registros:

| Registro | Tipo | Destino |
|----------|------|---------|
| `apiatendzappy.waiasolutions.site` | A | IP do servidor |
| `atendzappy.waiasolutions.site` | A | IP do servidor |

---

### PASSO 7: Deploy via Portainer

#### 7.1 - Acesse o Portainer

- Abra: `https://portainer.waiasolutions.site` (ou o endereço do seu Portainer)

#### 7.2 - Criar nova Stack

1. No menu lateral, clique em **Stacks**
2. Clique em **+ Add stack**
3. Nome da stack: `atendzappy`

#### 7.3 - Colar o conteúdo do docker-compose.yml

- Selecione **"Web editor"**
- Cole o conteúdo completo do arquivo `docker-compose.yml`

> ⚠️ **IMPORTANTE:** Antes de colar, ajuste os seguintes valores:
>
> - `DB_PASS` → Mesma senha do seu PostgreSQL (`c2ff57d28b649ef109556e732aff336e`)
> - `JWT_SECRET` → Gere um hash seguro: `openssl rand -hex 32`
> - `JWT_REFRESH_SECRET` → Gere outro hash: `openssl rand -hex 32`
> - Os domínios → Se forem diferentes de `waiasolutions.site`

#### 7.4 - Deploy

- Clique em **"Deploy the stack"**
- Aguarde todos os serviços ficarem verdes ✅

---

### PASSO 8: Executar Migrations do Banco

Após o backend estar rodando, execute as migrations:

```bash
# Encontrar o container do backend
docker ps | grep atendzappy_backend

# Executar migrations
docker exec -it $(docker ps -q -f name=atendzappy_backend) npx sequelize db:migrate

# Executar seeds (dados iniciais)
docker exec -it $(docker ps -q -f name=atendzappy_backend) npx sequelize db:seed:all
```

---

### PASSO 9: Verificar se tudo está rodando

```bash
# Ver status dos serviços
docker service ls | grep atendzappy

# Ver logs do backend
docker service logs atendzappy_atendzappy_backend --tail 50

# Ver logs do frontend
docker service logs atendzappy_atendzappy_frontend --tail 50

# Testar acesso
curl -I https://apiatendzappy.waiasolutions.site
curl -I https://atendzappy.waiasolutions.site
```

---

## 🔄 ATUALIZAR A APLICAÇÃO (FUTURO)

Quando precisar atualizar o código:

### Via SSH + Portainer

```bash
# 1. Conectar ao servidor
ssh root@SEU_IP_SERVIDOR
cd /opt/atendzappy

# 2. Atualizar o código (se usa git)
git pull

# 3. Rebuildar as imagens
docker build -t atendzappy-backend:latest ./backend

docker build \
  --build-arg REACT_APP_BACKEND_URL=https://apiatendzappy.waiasolutions.site \
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

# Backup do banco
docker exec $(docker ps -q -f name=pgvector) \
  pg_dump -U postgres atendzappy > backup_atendzappy_$(date +%Y%m%d).sql

# ====== CONTAINER ======
# Acessar terminal do backend
docker exec -it $(docker ps -q -f name=atendzappy_backend) sh

# Acessar terminal do frontend
docker exec -it $(docker ps -q -f name=atendzappy_frontend) sh

# ====== REDIS ======
docker exec -it $(docker ps -q -f name=atendzappy_redis) redis-cli -a atendzappy123

# ====== ESCALAR ======
docker service scale atendzappy_atendzappy_backend=2

# ====== REINICIAR ======
docker service update --force atendzappy_atendzappy_backend

# ====== REMOVER TUDO ======
docker stack rm atendzappy
```

---

## 🐛 PROBLEMAS COMUNS

### "image not found"

A imagem não foi buildada ou o nome está diferente:

```bash
docker images | grep atendzappy
# Se não aparecer, faça o build novamente (Passo 5)
```

### "database does not exist"

O banco não foi criado no PostgreSQL:

```bash
docker exec -it $(docker ps -q -f name=pgvector) psql -U postgres -c "CREATE DATABASE atendzappy;"
```

### "connection refused" no Redis

O Redis pode não ter iniciado ainda. Verifique:

```bash
docker service logs atendzappy_atendzappy_redis --tail 20
```

### Frontend mostra erro de conexão

O `REACT_APP_BACKEND_URL` pode estar errado. A URL é definida no momento do BUILD:

```bash
# Rebuildar com a URL correta
docker build \
  --build-arg REACT_APP_BACKEND_URL=https://apiatendzappy.waiasolutions.site \
  -t atendzappy-frontend:latest ./frontend

# Forçar update
docker service update --force atendzappy_atendzappy_frontend
```

### SSL não funciona

Verifique se o DNS aponta para o IP correto:

```bash
dig apiatendzappy.waiasolutions.site
dig atendzappy.waiasolutions.site
```

---

## 📁 ESTRUTURA DE ARQUIVOS NO SERVIDOR

```
/opt/atendzappy/
├── docker-compose.yml         ← Stack para o Portainer
├── backend/
│   ├── Dockerfile             ← Build da imagem do backend
│   ├── .dockerignore
│   ├── package.json
│   ├── src/                   ← Código fonte TypeScript
│   └── ...
└── frontend/
    ├── Dockerfile             ← Build da imagem do frontend
    ├── .dockerignore
    ├── nginx.conf             ← Config do Nginx (SPA routing)
    ├── package.json
    ├── src/                   ← Código fonte React
    └── ...
```
