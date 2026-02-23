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

echo -e "${BLUE}[3/4] Iniciando Build e Deploy da nova versão...${NC}"
# Verifica se o script de deploy existe e é executável
if [ -f "./backend/deploy.sh" ]; then
    chmod +x ./backend/deploy.sh
    cd backend
    ./deploy.sh update
else
    echo -e "${RED}[ERRO] Arquivo ./backend/deploy.sh não encontrado.${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   SISTEMA ATUALIZADO COM SUCESSO!      ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Dica: Caso ocorra erro de permissão, execute:${NC}"
echo -e "${BLUE}chmod +x vps_update.sh${NC}"
