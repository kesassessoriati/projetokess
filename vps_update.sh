#!/bin/bash
# ============================================
# AtendzAppy - Script de Atualização Automática
# Este script deve ser executado dentro do seu VPS.
# ============================================

# CORES
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOKEN="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"
REPO_URL="github.com/williamprado/atendzappy.git"

# ─── Versão atual e próxima ───────────────────────────────────────────────────
CURRENT_VERSION=$(grep -oP 'backend:\K[\d.]+' stack-swarm.yml | head -1)
# Incrementa o minor version: 1.1 → 1.2
NEXT_VERSION=$(echo "$CURRENT_VERSION" | awk -F. '{printf "%s.%d", $1, $2+1}')

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AtendzAppy Update - v${CURRENT_VERSION} → v${NEXT_VERSION}${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${BLUE}[1/5] Configurando autenticação segura...${NC}"
git remote set-url origin "https://x-access-token:${TOKEN}@${REPO_URL}"

echo -e "${BLUE}[2/5] Puxando atualizações do GitHub...${NC}"
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}[ERRO] Falha ao baixar atualizações. Verifique sua conexão ou o token.${NC}"
    exit 1
fi

echo -e "${BLUE}[3/5] Construindo imagens v${NEXT_VERSION}...${NC}"
# Backend Build
cd backend
docker build -t atendzappy/backend:${NEXT_VERSION} . --no-cache
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERRO] Falha no build do backend.${NC}"
    exit 1
fi
cd ..

# Frontend Build
cd frontend
docker build -t atendzappy/frontend:${NEXT_VERSION} . --no-cache
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERRO] Falha no build do frontend.${NC}"
    exit 1
fi
cd ..

echo -e "${BLUE}[4/5] Atualizando Stack para v${NEXT_VERSION}...${NC}"
# Substitui versão atual pela próxima no stack-swarm.yml
sed -i "s/backend:${CURRENT_VERSION}/backend:${NEXT_VERSION}/g" stack-swarm.yml
sed -i "s/frontend:${CURRENT_VERSION}/frontend:${NEXT_VERSION}/g" stack-swarm.yml

# Deploy
docker stack deploy -c stack-swarm.yml atendzappy

echo -e "${BLUE}[5/5] Rodando Migrations...${NC}"
echo -e "${YELLOW}Aguardando container estabilizar (20s)...${NC}"
sleep 20

BACKEND_CONTAINER=$(docker ps -q -f name=atendzappy_backend)
if [ -z "$BACKEND_CONTAINER" ]; then
    echo -e "${RED}[ERRO] Container backend não encontrado. Tente novamente em 30s.${NC}"
else
    docker exec $BACKEND_CONTAINER npx sequelize db:migrate
    echo -e "${GREEN}Migrations finalizadas!${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   SISTEMA ATUALIZADO: v${NEXT_VERSION}!      ${NC}"
echo -e "${GREEN}========================================${NC}"
