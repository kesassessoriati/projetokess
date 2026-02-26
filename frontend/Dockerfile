# --- Estágio 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências de sistema
RUN apk add --no-cache python3 make g++ git

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar dependências (usando legacy-peer-deps para evitar conflitos de versão)
RUN npm install --legacy-peer-deps

COPY . .

# Variáveis para BUILD (serão usadas apenas como fallback)
ENV NODE_OPTIONS=--openssl-legacy-provider \
    GENERATE_SOURCEMAP=false \
    SKIP_PREFLIGHT_CHECK=true

# Build da aplicação
RUN npm run build

# --- Estágio 2: Produção com Nginx ---
FROM nginx:1.25-alpine AS production

# Instalar dependências para o script de runtime
RUN apk add --no-cache curl

# Remover configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar arquivos estáticos do build
COPY --from=builder /app/build /usr/share/nginx/html

# Copiar script de variáveis de ambiente
COPY public/env.sh /usr/share/nginx/html/env.sh
RUN chmod +x /usr/share/nginx/html/env.sh

# Expor porta
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Comando de inicialização com injeção de variáveis em runtime
CMD ["/bin/sh", "-c", "/usr/share/nginx/html/env.sh && nginx -g 'daemon off;'"]