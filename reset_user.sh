#!/bin/bash
# 1. Encontrar container do backend para gerar o hash da senha
BACKEND_CONTAINER=$(docker ps -q -f name=atendzappy_atendzappy_backend | head -1)

if [ -z "$BACKEND_CONTAINER" ]; then
    echo "❌ Container do backend não encontrado."
    exit 1
fi

echo "🔐 Gerando hash para a senha..."
# Gera o hash usando bcryptjs dentro do container do backend
HASH=$(docker exec $BACKEND_CONTAINER node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('123456', 8));")

if [ -z "$HASH" ]; then
    echo "❌ Falha ao gerar hash da senha."
    exit 1
fi

echo "🔑 Hash gerado: $HASH"

# 2. Encontrar container do banco de dados
DB_CONTAINER=$(docker ps -q -f name=pgvector | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Container do banco de dados (pgvector) não encontrado."
    exit 1
fi

# 3. Atualizar o usuário no banco
echo "👤 Atualizando usuário 'kesassessoria.ti@gmail.com' (ID 1)..."

docker exec $DB_CONTAINER psql -U postgres -d atendzappy -c "UPDATE \"Users\" SET email = 'kesassessoria.ti@gmail.com', \"passwordHash\" = '$HASH' WHERE id = 1;"

# 4. Confirmar mudança
echo "🔍 Verificando dados atualizados:"
docker exec $DB_CONTAINER psql -U postgres -d atendzappy -c "SELECT id, email FROM \"Users\" WHERE id = 1;"

echo "✅ Concluído!"
