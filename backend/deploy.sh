#!/bin/bash
# ============================================
# Script de Deploy - AtendzAppy
# Docker Swarm com Portainer
# ============================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Nome da stack
STACK_NAME="atendzappy"
PORTAINER_STACK="portainer"

# ============================================
# Funções auxiliares
# ============================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# ============================================
# Verificações
# ============================================
check_requirements() {
    log_step "Verificando requisitos..."

    # Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker não encontrado. Instale o Docker primeiro."
        exit 1
    fi
    log_success "Docker encontrado: $(docker --version)"

    # Docker Swarm
    SWARM_STATUS=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null)
    if [ "$SWARM_STATUS" != "active" ]; then
        log_warn "Docker Swarm não está ativo."
        read -p "Deseja inicializar o Swarm? (s/n): " INIT_SWARM
        if [ "$INIT_SWARM" = "s" ] || [ "$INIT_SWARM" = "S" ]; then
            docker swarm init
            log_success "Docker Swarm inicializado!"
        else
            log_error "Docker Swarm é necessário. Abortando."
            exit 1
        fi
    else
        log_success "Docker Swarm está ativo"
    fi

    # .env
    if [ ! -f ".env" ]; then
        log_warn "Arquivo .env não encontrado."
        if [ -f ".env.production" ]; then
            log_info "Copiando .env.production para .env..."
            cp .env.production .env
            log_warn "⚠️  EDITE o arquivo .env com suas credenciais reais antes de continuar!"
            read -p "Pressione ENTER após editar o .env ou Ctrl+C para cancelar..."
        else
            log_error "Nenhum arquivo .env encontrado. Crie um baseado no .env.production"
            exit 1
        fi
    fi
    log_success "Arquivo .env encontrado"

    # Carregar variáveis
    source .env
}

# ============================================
# Build das imagens
# ============================================
build_images() {
    log_step "Construindo imagens Docker..."

    log_info "Construindo imagem do Backend..."
    docker build -t ${DOCKER_REGISTRY:-}atendzappy-backend:${TAG:-latest} ./backend
    log_success "Imagem do Backend construída!"

    log_info "Construindo imagem do Frontend..."
    docker build \
        --build-arg REACT_APP_BACKEND_URL=${BACKEND_URL:-http://localhost:8080} \
        --build-arg REACT_APP_HOURS_CLOSE_TICKETS_AUTO=${REACT_APP_HOURS_CLOSE_TICKETS_AUTO:-24} \
        --build-arg REACT_APP_FACEBOOK_APP_ID=${FACEBOOK_APP_ID:-} \
        -t ${DOCKER_REGISTRY:-}atendzappy-frontend:${TAG:-latest} ./frontend
    log_success "Imagem do Frontend construída!"
}

# ============================================
# Push para registry (opcional)
# ============================================
push_images() {
    if [ -n "$DOCKER_REGISTRY" ]; then
        log_step "Enviando imagens para registry: $DOCKER_REGISTRY"
        docker push ${DOCKER_REGISTRY}atendzappy-backend:${TAG:-latest}
        docker push ${DOCKER_REGISTRY}atendzappy-frontend:${TAG:-latest}
        log_success "Imagens enviadas!"
    else
        log_info "Sem registry configurado. Usando imagens locais."
    fi
}

# ============================================
# Deploy Portainer
# ============================================
deploy_portainer() {
    log_step "Fazendo deploy do Portainer..."

    # Verificar se a rede do Traefik existe
    if ! docker network ls | grep -q "${STACK_NAME}_frontend_network"; then
        log_info "Criando rede do Traefik..."
        docker network create --driver overlay --attachable ${STACK_NAME}_frontend_network 2>/dev/null || true
    fi

    docker stack deploy -c docker-compose.portainer.yml $PORTAINER_STACK
    log_success "Portainer deployado!"
    log_info "Acesse: https://${PORTAINER_DOMAIN:-portainer.atendzappy.com.br}:9443"
}

# ============================================
# Deploy Stack Principal
# ============================================
deploy_stack() {
    log_step "Fazendo deploy da stack principal..."

    docker stack deploy -c stack-swarm.yml --with-registry-auth $STACK_NAME
    log_success "Stack deployada!"
}

# ============================================
# Verificar status
# ============================================
check_status() {
    log_step "Verificando status dos serviços..."

    echo ""
    log_info "Serviços da stack ${STACK_NAME}:"
    docker stack services $STACK_NAME
    echo ""

    log_info "Serviços do Portainer:"
    docker stack services $PORTAINER_STACK 2>/dev/null || log_warn "Portainer não está rodando"
    echo ""

    log_info "Containers rodando:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# ============================================
# Logs
# ============================================
show_logs() {
    local SERVICE=$1
    if [ -z "$SERVICE" ]; then
        log_error "Especifique o serviço. Ex: ./deploy.sh logs backend"
        echo "Serviços disponíveis:"
        docker stack services $STACK_NAME --format "{{.Name}}"
        exit 1
    fi
    docker service logs ${STACK_NAME}_${SERVICE} --tail 100 -f
}

# ============================================
# Rollback
# ============================================
rollback_service() {
    local SERVICE=$1
    if [ -z "$SERVICE" ]; then
        log_error "Especifique o serviço. Ex: ./deploy.sh rollback backend"
        exit 1
    fi
    log_step "Fazendo rollback do serviço: $SERVICE"
    docker service rollback ${STACK_NAME}_${SERVICE}
    log_success "Rollback realizado!"
}

# ============================================
# Escalar serviço
# ============================================
scale_service() {
    local SERVICE=$1
    local REPLICAS=$2
    if [ -z "$SERVICE" ] || [ -z "$REPLICAS" ]; then
        log_error "Uso: ./deploy.sh scale <serviço> <replicas>"
        log_error "Ex: ./deploy.sh scale backend 3"
        exit 1
    fi
    log_step "Escalando ${SERVICE} para ${REPLICAS} réplicas..."
    docker service scale ${STACK_NAME}_${SERVICE}=${REPLICAS}
    log_success "Serviço escalado!"
}

# ============================================
# Remover Stack
# ============================================
remove_stack() {
    log_step "Removendo stack ${STACK_NAME}..."
    read -p "Tem certeza? Isso vai parar todos os serviços! (s/n): " CONFIRM
    if [ "$CONFIRM" = "s" ] || [ "$CONFIRM" = "S" ]; then
        docker stack rm $STACK_NAME
        log_success "Stack removida!"
    else
        log_info "Operação cancelada."
    fi
}

# ============================================
# Menu principal
# ============================================
show_help() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   AtendzAppy - Deploy Docker Swarm           ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Uso: ./deploy.sh [comando]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  setup         - Configuração inicial completa (build + deploy tudo)"
    echo "  build         - Construir imagens Docker"
    echo "  deploy        - Deploy da stack principal"
    echo "  portainer     - Deploy do Portainer"
    echo "  update        - Rebuild + redeploy (atualização)"
    echo "  status        - Verificar status dos serviços"
    echo "  logs <svc>    - Ver logs de um serviço"
    echo "  rollback <svc>- Rollback de um serviço"
    echo "  scale <s> <n> - Escalar serviço para N réplicas"
    echo "  remove        - Remover stack"
    echo "  help          - Mostrar esta ajuda"
    echo ""
}

# ============================================
# Execução
# ============================================
case "${1:-help}" in
    setup)
        check_requirements
        build_images
        push_images
        deploy_portainer
        deploy_stack
        echo ""
        log_step "🚀 Setup completo!"
        echo ""
        log_success "Frontend: https://${FRONTEND_DOMAIN:-app.atendzappy.com.br}"
        log_success "Backend:  https://${BACKEND_DOMAIN:-api.atendzappy.com.br}"
        log_success "Portainer: https://${PORTAINER_DOMAIN:-portainer.atendzappy.com.br}:9443"
        log_success "Traefik:  https://${TRAEFIK_DOMAIN:-traefik.atendzappy.com.br}"
        echo ""
        log_warn "Aguarde alguns minutos para todos os serviços estarem prontos."
        log_info "Use './deploy.sh status' para verificar o status."
        ;;
    build)
        check_requirements
        build_images
        push_images
        ;;
    deploy)
        check_requirements
        deploy_stack
        ;;
    portainer)
        check_requirements
        deploy_portainer
        ;;
    update)
        check_requirements
        build_images
        push_images
        deploy_stack
        log_success "Atualização deployada! O Swarm fará rolling update automaticamente."
        ;;
    status)
        check_status
        ;;
    logs)
        show_logs "$2"
        ;;
    rollback)
        rollback_service "$2"
        ;;
    scale)
        scale_service "$2" "$3"
        ;;
    remove)
        remove_stack
        ;;
    help|*)
        show_help
        ;;
esac
