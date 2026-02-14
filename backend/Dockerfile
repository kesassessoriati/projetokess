# ============================================
# Backend Dockerfile - AtendzAppy
# Otimizado para Docker Swarm + Portainer
# ============================================

# --- Estágio 1: Instalação de dependências ---
FROM node:18-alpine AS deps

WORKDIR /app

# Instalar dependências de sistema necessárias para compilação nativa
RUN apk add --no-cache python3 make g++ git

COPY package.json package-lock.json* ./

# Instalar TODAS as dependências (incluindo devDependencies para build)
RUN npm ci

# --- Estágio 2: Build ---
FROM node:18-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compilar TypeScript
RUN npm run build

# Remover devDependencies após o build
RUN npm prune --production

# --- Estágio 3: Produção ---
FROM node:18-alpine AS production

# Instalar dependências de runtime
RUN apk add --no-cache \
    ffmpeg \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl

# Configurar Puppeteer para usar Chromium do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copiar dependências de produção
COPY --from=builder /app/node_modules ./node_modules

# Copiar aplicação compilada
COPY --from=builder /app/dist ./dist

# Copiar package.json e .sequelizerc (necessário para migrations)
COPY package.json .sequelizerc ./

# Copiar arquivos de treinamento OCR (Tesseract)
COPY *.traineddata ./

# Criar diretórios necessários
RUN mkdir -p public logs

# Variáveis de ambiente padrão
ENV NODE_ENV=production \
    PORT=8080 \
    TZ=America/Sao_Paulo

# Expor porta
EXPOSE 8080

# Comando de inicialização
CMD ["node", "dist/server.js"]
