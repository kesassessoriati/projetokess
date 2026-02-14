# ============================================
# Frontend Dockerfile - Otimizado para Docker Swarm
# ============================================

# --- Estágio 1: Build ---
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências de sistema
RUN apk add --no-cache python3 make g++ git

COPY package.json package-lock.json* ./

# Instalar dependências
RUN npm ci

COPY . .

# Build args para configuração dinâmica
ARG REACT_APP_BACKEND_URL=http://localhost:8080
ARG REACT_APP_HOURS_CLOSE_TICKETS_AUTO=24
ARG REACT_APP_FACEBOOK_APP_ID=776874187723945

ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL} \
    REACT_APP_HOURS_CLOSE_TICKETS_AUTO=${REACT_APP_HOURS_CLOSE_TICKETS_AUTO} \
    REACT_APP_FACEBOOK_APP_ID=${REACT_APP_FACEBOOK_APP_ID} \
    NODE_OPTIONS=--openssl-legacy-provider \
    GENERATE_SOURCEMAP=false

# Build da aplicação
RUN npm run build

# --- Estágio 2: Produção com Nginx ---
FROM nginx:1.25-alpine AS production

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Remover configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar arquivos estáticos do build
COPY --from=builder /app/build /usr/share/nginx/html

# Expor porta
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Comando padrão
CMD ["nginx", "-g", "daemon off;"]