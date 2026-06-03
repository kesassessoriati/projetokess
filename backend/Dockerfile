# --- Estágio 1: Instalação de dependências ---
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# Instalar dependências de sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY patches ./patches
COPY scripts ./scripts

# Instalar TODAS as dependências
RUN npm install --legacy-peer-deps

# --- Estágio 2: Build ---
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compilar TypeScript
RUN npm run build

# --- Estágio 3: Produção ---
FROM node:20-bookworm-slim AS production

# Instalar dependências de runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    chromium \
    libnss3 \
    libfreetype6 \
    libharfbuzz0b \
    ca-certificates \
    fonts-freefont-ttf \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configurar Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

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
