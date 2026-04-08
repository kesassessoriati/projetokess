#!/bin/bash
## ============================================================================
## ATENDZAPPY - Script de Build e Push das Imagens Docker
## ============================================================================
## Executar no servidor que contém Docker instalado
## Uso: bash build_and_push.sh
## ============================================================================

set -e

## ========================= CONFIGURAÇÕES ========================= ##

DOCKER_USER="${DOCKER_USERNAME:-williamwilmer10}"
BACKEND_IMAGE="${DOCKER_USER}/atendzappy-backend"
FRONTEND_IMAGE="${DOCKER_USER}/atendzappy-frontend"
MIN_VERSION="1.9.200"

version_max() {
    printf "%s\n" "$@" | sed '/^$/d' | sed 's/^v//' | sort -V | tail -1
}

fetch_latest_remote_version() {
    local repository="$1"
    local api_url="https://hub.docker.com/v2/namespaces/${DOCKER_USER}/repositories/${repository}/tags?page_size=100"

    if ! command -v curl >/dev/null 2>&1; then
        return 0
    fi

    curl -fsSL "$api_url" 2>/dev/null \
        | tr -d '\r\n' \
        | grep -oE '"name":"v[0-9]+\.[0-9]+\.[0-9]+"' \
        | sed -E 's/.*"v([^"]+)"/\1/' \
        | sort -V \
        | tail -1
}

## Gerenciamento de Versão
VERSION_FILE=".docker_version"
if [ -f "$VERSION_FILE" ]; then
    LOCAL_VERSION=$(cat "$VERSION_FILE")
else
    LOCAL_VERSION=""
fi

REMOTE_BACKEND_VERSION=$(fetch_latest_remote_version "atendzappy-backend")
REMOTE_FRONTEND_VERSION=$(fetch_latest_remote_version "atendzappy-frontend")

CURRENT_VERSION=$(version_max "$MIN_VERSION" "$LOCAL_VERSION" "$REMOTE_BACKEND_VERSION" "$REMOTE_FRONTEND_VERSION")

IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
NEXT_PATCH=$((patch + 1))
NEXT_VERSION="$major.$minor.$NEXT_PATCH"

echo -e "\033[1;33m[!] Última versão encontrada: v$CURRENT_VERSION\033[0m"
if [ -n "$REMOTE_BACKEND_VERSION" ] || [ -n "$REMOTE_FRONTEND_VERSION" ]; then
    echo -e "\033[1;33m[!] Docker Hub backend: ${REMOTE_BACKEND_VERSION:-não encontrada} | frontend: ${REMOTE_FRONTEND_VERSION:-não encontrada}\033[0m"
else
    echo -e "\033[1;33m[!] Docker Hub indisponível, usando fallback local em ${VERSION_FILE}\033[0m"
fi
TAG="v$NEXT_VERSION"

# Salva a nova versão sem o 'v'
echo "${TAG#v}" > "$VERSION_FILE"

echo -e "\033[0;32m✓ Preparando build para a TAG: ${TAG}\033[0m"
echo ""

## URL do backend para build do frontend (fallback embutido na imagem)
REACT_APP_BACKEND_URL="https://apichat.kesassessoria.com"

## ========================= CORES PARA OUTPUT ========================= ##

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  ATENDZAPPY - Build & Push Docker Images   ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

## ========================= PRÉ-REQUISITOS ========================= ##

echo -e "${YELLOW}[1/6] Verificando pré-requisitos...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERRO: Docker não encontrado. Instale o Docker primeiro.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker encontrado${NC}"

## Verificar login no Docker Hub
if ! docker info 2>/dev/null | grep -q "Username"; then
    echo -e "${RED}ERRO: Você não está logado no Docker Hub. Execute 'docker login' primeiro.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker Hub autenticado${NC}"
echo ""

## ========================= BUILD BACKEND ========================= ##

echo -e "${YELLOW}[2/6] Construindo imagem do BACKEND...${NC}"
echo -e "       Imagem: ${BACKEND_IMAGE}:${TAG}"
echo ""

docker build \
    -t "${BACKEND_IMAGE}:${TAG}" \
    -t "${BACKEND_IMAGE}:latest" \
    -f backend/Dockerfile \
    ./backend

echo ""
echo -e "${GREEN}✓ Backend construído com sucesso!${NC}"
echo ""

## ========================= BUILD FRONTEND ========================= ##

echo -e "${YELLOW}[3/6] Construindo imagem do FRONTEND...${NC}"
echo -e "       Imagem: ${FRONTEND_IMAGE}:${TAG}"
echo -e "       REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}"
echo ""

docker build \
    --build-arg REACT_APP_BACKEND_URL="${REACT_APP_BACKEND_URL}" \
    -t "${FRONTEND_IMAGE}:${TAG}" \
    -t "${FRONTEND_IMAGE}:latest" \
    -f frontend/Dockerfile \
    ./frontend

echo ""
echo -e "${GREEN}✓ Frontend construído com sucesso!${NC}"
echo ""

## ========================= PUSH BACKEND ========================= ##

echo -e "${YELLOW}[4/6] Enviando imagem do BACKEND para Docker Hub...${NC}"

docker push "${BACKEND_IMAGE}:${TAG}"
docker push "${BACKEND_IMAGE}:latest"

echo -e "${GREEN}✓ Backend enviado!${NC}"
echo ""

## ========================= PUSH FRONTEND ========================= ##

echo -e "${YELLOW}[5/6] Enviando imagem do FRONTEND para Docker Hub...${NC}"

docker push "${FRONTEND_IMAGE}:${TAG}"
docker push "${FRONTEND_IMAGE}:latest"

echo -e "${GREEN}✓ Frontend enviado!${NC}"
echo ""

## ========================= RESUMO ========================= ##

echo -e "${YELLOW}[6/6] Resumo${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}✅ Imagens construídas e publicadas:${NC}"
echo -e "   • ${BACKEND_IMAGE}:${TAG}"
echo -e "   • ${FRONTEND_IMAGE}:${TAG}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo -e "   1. No Portainer, crie/atualize a stack com o arquivo ${YELLOW}atendzappy_stack.yml${NC}"
echo -e "   2. Crie os volumes externos antes do deploy:"
echo -e "      ${YELLOW}docker volume create atendzappy_public${NC}"
echo -e "      ${YELLOW}docker volume create atendzappy_logs${NC}"
echo -e "      ${YELLOW}docker volume create atendzappy_redis${NC}"
echo -e "   3. Verifique que a rede ${YELLOW}kesnet${NC} existe:"
echo -e "      ${YELLOW}docker network ls | grep kesnet${NC}"
echo -e "   4. Verifique que o banco ${YELLOW}pgvector${NC} está acessível na rede ${YELLOW}kesnet${NC}"
echo -e "   5. Deploy via Portainer: Cole o conteúdo de ${YELLOW}atendzappy_stack.yml${NC}"
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}  Build finalizado com sucesso! 🚀${NC}"
echo -e "${BLUE}============================================${NC}"
