# --- Estágio 1: Instalação de dependências ---
FROM node:20-alpine AS deps

WORKDIR /app

# Instalar dependências de sistema
RUN apk add --no-cache python3 make g++ git

COPY package.json package-lock.json* ./

# Instalar TODAS as dependências
RUN npm install --legacy-peer-deps

# --- Estágio 2: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compilar TypeScript
RUN npm run build

# --- Estágio 3: Produção ---
FROM node:20-alpine AS production

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

# Configurar Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copiar dependências instaladas no estágio deps e podas no builder ou deps? 
# Vou simplificar para garantir que não falte nada.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json .sequelizerc ./

# Criar diretórios necessários
RUN mkdir -p public logs

# Variáveis padrão
ENV NODE_ENV=production \
    PORT=8080 \
    TZ=America/Sao_Paulo

EXPOSE 8080

CMD ["node", "dist/server.js"]
