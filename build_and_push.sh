#!/bin/bash
## ============================================================================
## ATENDZAPPY - Script de Build e Push das Imagens Docker
## ============================================================================
## Executar no servidor que contem Docker instalado
## Uso: bash build_and_push.sh
## ============================================================================

set -euo pipefail

## ========================= CONFIGURACOES ========================= ##

DOCKER_USER="${DOCKER_USERNAME:-kesassessoria}"
BACKEND_REPOSITORY="atendzappy-backend"
FRONTEND_REPOSITORY="atendzappy-frontend"
BACKEND_IMAGE="${DOCKER_USER}/${BACKEND_REPOSITORY}"
FRONTEND_IMAGE="${DOCKER_USER}/${FRONTEND_REPOSITORY}"
MIN_VERSION="1.0.0"
VERSION_FILE=".docker_version"
DOCKER_HUB_PAGE_SIZE="${DOCKER_HUB_PAGE_SIZE:-100}"
DOCKER_HUB_MAX_PAGES="${DOCKER_HUB_MAX_PAGES:-50}"

## URL do backend para build do frontend (fallback embutido na imagem)
REACT_APP_BACKEND_URL="${REACT_APP_BACKEND_URL:-https://apichat.kesassessoria.com}"

## ========================= CORES PARA OUTPUT ========================= ##

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

## ========================= FUNCOES ========================= ##

version_max() {
    printf "%s\n" "$@" \
        | sed '/^$/d' \
        | sed 's/^v//' \
        | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' \
        | sort -V \
        | tail -1 || true
}

increment_patch_version() {
    local version="$1"
    local major minor patch

    IFS='.' read -r major minor patch <<< "$version"
    echo "${major}.${minor}.$((patch + 1))"
}

fetch_dockerhub_versions() {
    local repository="$1"
    local page=1
    local payload names

    if ! command -v curl >/dev/null 2>&1; then
        return 0
    fi

    while [ "$page" -le "$DOCKER_HUB_MAX_PAGES" ]; do
        payload=$(
            curl -fsSL \
                "https://hub.docker.com/v2/namespaces/${DOCKER_USER}/repositories/${repository}/tags?page_size=${DOCKER_HUB_PAGE_SIZE}&page=${page}" \
                2>/dev/null
        ) || return 0

        names=$(
            printf "%s" "$payload" \
                | tr -d '\r\n' \
                | grep -oE '"name"[[:space:]]*:[[:space:]]*"v[0-9]+\.[0-9]+\.[0-9]+"' \
                | sed -E 's/.*"v([^"]+)".*/\1/' || true
        )

        [ -n "$names" ] || break
        printf "%s\n" "$names"

        page=$((page + 1))
    done
}

fetch_latest_remote_version() {
    local repository="$1"
    version_max "$(fetch_dockerhub_versions "$repository")"
}

dockerhub_tag_exists() {
    local repository="$1"
    local tag="$2"
    local http_code

    if ! command -v curl >/dev/null 2>&1; then
        return 1
    fi

    http_code=$(
        curl -fsS -o /dev/null -w "%{http_code}" \
            "https://hub.docker.com/v2/namespaces/${DOCKER_USER}/repositories/${repository}/tags/${tag}" \
            2>/dev/null || true
    )

    [ "$http_code" = "200" ]
}

# Verifica direto no REGISTRY (registry-1.docker.io, autenticado): reflete o
# push na hora. A API do hub.docker.com e eventualmente consistente e sofre
# rate-limit — derrubou build com push ja concluido (v1.9.737: digest publicado,
# API demorou >120s para expor a tag e o job falhou sem atualizar latest).
registry_tag_exists() {
    local repository="$1"
    local tag="$2"

    docker manifest inspect "${DOCKER_USER}/${repository}:${tag}" >/dev/null 2>&1
}

wait_for_dockerhub_tag() {
    local repository="$1"
    local tag="$2"
    local max_attempts="${3:-12}"
    local sleep_seconds="${4:-10}"
    local attempt

    for attempt in $(seq 1 "$max_attempts"); do
        if registry_tag_exists "$repository" "$tag"; then
            echo -e "${GREEN}OK: Tag confirmada no registry: ${repository}:${tag}${NC}"
            return 0
        fi
        if dockerhub_tag_exists "$repository" "$tag"; then
            echo -e "${GREEN}OK: Tag disponivel no Docker Hub: ${repository}:${tag}${NC}"
            return 0
        fi
        echo -e "${YELLOW}[!] Tag ainda nao visivel (registry/API): ${repository}:${tag} (tentativa ${attempt}/${max_attempts}, aguardando ${sleep_seconds}s...)${NC}"
        sleep "$sleep_seconds"
    done

    echo -e "${RED}ERRO: Tag ${repository}:${tag} nao ficou disponivel apos $((max_attempts * sleep_seconds))s.${NC}"
    return 1
}

ensure_dockerhub_authenticated() {
    local docker_config="${DOCKER_CONFIG:-$HOME/.docker}"

    if docker info 2>/dev/null | grep -qi "Username"; then
        return 0
    fi

    if [ -f "${docker_config}/config.json" ] && grep -q '"auths"' "${docker_config}/config.json"; then
        return 0
    fi

    if [ -n "${DOCKER_USERNAME:-}" ] && [ -n "${DOCKER_PASSWORD:-}" ]; then
        echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin >/dev/null 2>&1
        return $?
    fi

    return 1
}

resolve_current_version() {
    local remote_backend_version remote_frontend_version remote_version

    remote_backend_version=$(fetch_latest_remote_version "$BACKEND_REPOSITORY")
    remote_frontend_version=$(fetch_latest_remote_version "$FRONTEND_REPOSITORY")
    remote_version=$(version_max "$remote_backend_version" "$remote_frontend_version")

    if [ -n "$remote_version" ]; then
        echo -e "${YELLOW}[!] Docker Hub backend: ${remote_backend_version:-nao encontrada} | frontend: ${remote_frontend_version:-nao encontrada}${NC}" >&2
        echo -e "${YELLOW}[!] Usando Docker Hub como unica referencia de versionamento.${NC}" >&2
        version_max "$MIN_VERSION" "$remote_version"
        return
    fi

    ## Bootstrap: conta/repositorio novo no Docker Hub, sem nenhuma tag publicada.
    echo -e "${YELLOW}[!] Nenhuma tag vX.Y.Z encontrada no Docker Hub para ${DOCKER_USER}.${NC}" >&2
    echo -e "${YELLOW}[!] Iniciando versionamento a partir de v${MIN_VERSION}.${NC}" >&2
    echo "$MIN_VERSION"
}

ensure_tag_is_new() {
    local tag="$1"

    if dockerhub_tag_exists "$BACKEND_REPOSITORY" "$tag" || dockerhub_tag_exists "$FRONTEND_REPOSITORY" "$tag"; then
        echo -e "${RED}ERRO: A tag ${tag} ja existe no Docker Hub. Rode o script novamente para calcular a proxima versao.${NC}"
        exit 1
    fi
}

find_next_available_tag() {
    local current_version next_version candidate_tag

    current_version=$(resolve_current_version)

    while true; do
        next_version=$(increment_patch_version "$current_version")
        candidate_tag="v${next_version}"

        if ! dockerhub_tag_exists "$BACKEND_REPOSITORY" "$candidate_tag" && ! dockerhub_tag_exists "$FRONTEND_REPOSITORY" "$candidate_tag"; then
            NEXT_VERSION="$next_version"
            TAG="$candidate_tag"
            return
        fi

        current_version="$next_version"
    done
}

retag_built_images_if_needed() {
    local previous_tag="$TAG"

    if ! dockerhub_tag_exists "$BACKEND_REPOSITORY" "$TAG" && ! dockerhub_tag_exists "$FRONTEND_REPOSITORY" "$TAG"; then
        return
    fi

    echo -e "${YELLOW}[!] A tag ${TAG} apareceu no Docker Hub durante o build.${NC}"
    echo -e "${YELLOW}[!] Recalculando proxima tag livre sem reconstruir as imagens...${NC}"

    find_next_available_tag

    echo -e "${YELLOW}[!] Retagueando imagens locais: ${previous_tag} -> ${TAG}${NC}"

    docker tag "${BACKEND_IMAGE}:${previous_tag}" "${BACKEND_IMAGE}:${TAG}"
    docker tag "${FRONTEND_IMAGE}:${previous_tag}" "${FRONTEND_IMAGE}:${TAG}"
    docker tag "${BACKEND_IMAGE}:${previous_tag}" "${BACKEND_IMAGE}:latest"
    docker tag "${FRONTEND_IMAGE}:${previous_tag}" "${FRONTEND_IMAGE}:latest"

    echo -e "${GREEN}OK: Build reaproveitado para a nova TAG: ${TAG}${NC}"
}

## ========================= INICIO ========================= ##

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  ATENDZAPPY - Build & Push Docker Images   ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

## ========================= PRE-REQUISITOS ========================= ##

echo -e "${YELLOW}[1/7] Verificando pre-requisitos...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERRO: Docker nao encontrado. Instale o Docker primeiro.${NC}"
    exit 1
fi

echo -e "${GREEN}OK: Docker encontrado${NC}"

## Verificar login no Docker Hub
if ! ensure_dockerhub_authenticated; then
    echo -e "${RED}ERRO: Voce nao esta logado no Docker Hub. Execute 'docker login' primeiro.${NC}"
    exit 1
fi

echo -e "${GREEN}OK: Docker Hub autenticado${NC}"
echo ""

## ========================= VERSIONAMENTO ========================= ##

echo -e "${YELLOW}[2/7] Calculando proxima versao...${NC}"

CURRENT_VERSION=$(resolve_current_version)
NEXT_VERSION=$(increment_patch_version "$CURRENT_VERSION")
TAG="v$NEXT_VERSION"

echo -e "${YELLOW}[!] Ultima versao encontrada: v${CURRENT_VERSION}${NC}"
echo -e "${GREEN}OK: Preparando build para a TAG: ${TAG}${NC}"

ensure_tag_is_new "$TAG"

echo ""

## ========================= BUILD BACKEND ========================= ##

echo -e "${YELLOW}[3/7] Construindo imagem do BACKEND...${NC}"
echo -e "       Imagem: ${BACKEND_IMAGE}:${TAG}"
echo ""

docker build \
    -t "${BACKEND_IMAGE}:${TAG}" \
    -t "${BACKEND_IMAGE}:latest" \
    -f backend/Dockerfile \
    ./backend

echo ""
echo -e "${GREEN}OK: Backend construido com sucesso!${NC}"
echo ""

## ========================= BUILD FRONTEND ========================= ##

echo -e "${YELLOW}[4/7] Construindo imagem do FRONTEND...${NC}"
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
echo -e "${GREEN}OK: Frontend construido com sucesso!${NC}"
echo ""

## Revalida antes do push para reduzir risco de sobrescrever tag criada por outro servidor.
## Se a tag apareceu durante o build, reaproveita as imagens locais e avanca para a proxima tag livre.
retag_built_images_if_needed

## ========================= PUSH TAGS VERSIONADAS ========================= ##

echo -e "${YELLOW}[5/7] Enviando tags versionadas para Docker Hub...${NC}"
echo -e "${YELLOW}[!] Publicando frontend primeiro para evitar tag de backend sem par correspondente.${NC}"

docker push "${FRONTEND_IMAGE}:${TAG}"
docker push "${BACKEND_IMAGE}:${TAG}"

if ! wait_for_dockerhub_tag "$FRONTEND_REPOSITORY" "$TAG" || ! wait_for_dockerhub_tag "$BACKEND_REPOSITORY" "$TAG"; then
    echo -e "${RED}ERRO: Tag ${TAG} nao ficou disponivel nos dois repositorios Docker Hub apos retries.${NC}"
    echo -e "${RED}ERRO: Nao atualizaremos latest nem ${VERSION_FILE}. Verifique manualmente o Docker Hub.${NC}"
    exit 1
fi

echo -e "${GREEN}OK: Tags versionadas enviadas para backend e frontend!${NC}"
echo ""

## ========================= PUSH LATEST ========================= ##

echo -e "${YELLOW}[6/7] Atualizando tags latest no Docker Hub...${NC}"

docker push "${FRONTEND_IMAGE}:latest"
docker push "${BACKEND_IMAGE}:latest"

echo -e "${GREEN}OK: Tags latest atualizadas!${NC}"
echo ""

## Persistir somente depois que tudo foi publicado com sucesso.
echo "$NEXT_VERSION" > "$VERSION_FILE"

## ========================= RESUMO ========================= ##

echo -e "${YELLOW}[7/7] Resumo${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}Imagens construidas e publicadas:${NC}"
echo -e "   - ${BACKEND_IMAGE}:${TAG}"
echo -e "   - ${FRONTEND_IMAGE}:${TAG}"
echo ""
echo -e "${BLUE}Proximos passos:${NC}"
echo -e "   1. No Portainer, crie/atualize a stack com o arquivo ${YELLOW}atendzappy_stack.yml${NC}"
echo -e "   2. Crie os volumes externos antes do deploy:"
echo -e "      ${YELLOW}docker volume create atendzappy_public${NC}"
echo -e "      ${YELLOW}docker volume create atendzappy_logs${NC}"
echo -e "      ${YELLOW}docker volume create atendzappy_redis${NC}"
echo -e "   3. Verifique que a rede ${YELLOW}kesnet${NC} existe:"
echo -e "      ${YELLOW}docker network ls | grep kesnet${NC}"
echo -e "   4. Verifique que o banco ${YELLOW}pgvector${NC} esta acessivel na rede ${YELLOW}kesnet${NC}"
echo -e "   5. Deploy via Portainer: cole o conteudo de ${YELLOW}atendzappy_stack.yml${NC}"
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}  Build finalizado com sucesso!${NC}"
echo -e "${BLUE}============================================${NC}"
