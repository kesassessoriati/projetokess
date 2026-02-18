#!/bin/bash
set -e

echo "=== [1/5] Verificando Banco de Dados ==="
if docker exec $(docker ps -q -f name=pgvector) psql -U postgres -lqt | cut -d \| -f 1 | grep -qw atendzappy; then
    echo "✅ Banco 'atendzappy' já existe."
else
    echo "🚧 Criando banco 'atendzappy'..."
    docker exec $(docker ps -q -f name=pgvector) psql -U postgres -c "CREATE DATABASE atendzappy;"
    echo "✅ Banco criado com sucesso."
fi

echo "=== [2/5] Atualizando Código ==="
cd /opt/atendzappy || { echo "❌ Diretório /opt/atendzappy não encontrado!"; exit 1; }
git pull
echo "✅ Repositório atualizado."

echo "=== [3/5] Build Backend ==="
echo "Building williamprado/atendzappy-backend:latest..."
docker build --no-cache -t williamprado/atendzappy-backend:latest ./backend
echo "✅ Backend build concluído."

echo "=== [4/5] Build Frontend ==="
echo "Building williamprado/atendzappy-frontend:latest..."
# O frontend precisa da URL correta injetada, mas o env.sh cuida disso em runtime.
# Mesmo assim, usamos o build-arg para garantir defaults.
docker build --no-cache \
  --build-arg REACT_APP_BACKEND_URL=https://apichat.kesassessoria.com \
  -t williamprado/atendzappy-frontend:latest \
  ./frontend
echo "✅ Frontend build concluído."

echo "=== [5/5] Finalizado ==="
echo "As imagens foram criadas localmente no servidor."
echo "Agora você pode fazer o deploy da stack no Portainer."
