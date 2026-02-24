#!/bin/bash
# ============================================
# AtendzAppy - Script de Atualização Automática
# Este script deve ser executado dentro do seu VPS.
# ============================================

# CORES
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

TOKEN="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"
REPO_URL="github.com/williamprado/atendzappy.git"

echo -e "${BLUE}[1/4] Configurando autenticação segura...${NC}"
# Configura o remote para usar o token (não pedirá mais senha)
git remote set-url origin "https://x-access-token:${TOKEN}@${REPO_URL}"

echo -e "${BLUE}[2/4] Puxando atualizações do GitHub...${NC}"
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}[ERRO] Falha ao baixar atualizações. Verifique sua conexão ou o token.${NC}"
    exit 1
fi

echo -e "${BLUE}[3/4] Construindo Imagens Versão 1.1...${NC}"
# Backend Build
cd backend
docker build -t atendzappy/backend:1.1 .
cd ..

# Frontend Build
cd frontend
docker build -t atendzappy/frontend:1.1 .
cd ..

echo -e "${BLUE}[4/4] Atualizando Stack e Rodando Migrations...${NC}"
# Atualiza o arquivo da stack para usar 1.1
sed -i 's/backend:1.0/backend:1.1/g' stack-swarm.yml
sed -i 's/frontend:1.0/frontend:1.1/g' stack-swarm.yml

# Deploy
docker stack deploy -c stack-swarm.yml atendzappy

# Migrations
echo -e "${YELLOW}Aguardando container estabilizar para rodar migrations...${NC}"
sleep 15
BACKEND_CONTAINER=$(docker ps -q -f name=atendzappy_backend)
if [ -z "$BACKEND_CONTAINER" ]; then
    echo -e "${RED}[ERRO] Container backend não encontrado.${NC}"
else
    docker exec $BACKEND_CONTAINER npx sequelize db:migrate
    echo -e "${GREEN}Migrations finalizadas!${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   SISTEMA ATUALIZADO COM SUCESSO!      ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Dica: Caso ocorra erro de permissão, execute:${NC}"
echo -e "${BLUE}chmod +x vps_update.sh${NC}"
