#!/bin/bash

# 1. Encontrar o container do backend para gerar o hash da senha (bcrypt)
# Tentamos encontrar pelo nome da stack ou pelo nome comum 'backend'
BACKEND_CONTAINER=$(docker ps -q -f name=backend | head -1)

if [ -z "$BACKEND_CONTAINER" ]; then
    echo "❌ Container do backend não encontrado."
    exit 1
fi

echo "🔐 Gerando hash para a senha '123456'..."
# Gera o hash usando bcryptjs que já está nas dependências do backend
HASH=$(docker exec $BACKEND_CONTAINER node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('123456', 8));")

if [ -z "$HASH" ]; then
    echo "❌ Falha ao gerar hash da senha."
    exit 1
fi

# 2. Encontrar o container do banco de dados (PostgreSQL/pgvector)
DB_CONTAINER=$(docker ps -q -f name=pgvector | head -1)

if [ -z "$DB_CONTAINER" ]; then
    # Tenta um nome alternativo comum em stacks
    DB_CONTAINER=$(docker ps -q -f name=postgres | head -1)
fi

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Container do banco de dados não encontrado."
    exit 1
fi

# 3. Atualizar o usuário administrador (ID 1) no banco de dados
echo "👤 Atualizando super admin para 'user@faedeveloper.com.br'..."

docker exec $DB_CONTAINER psql -U postgres -d atendzappy -c "UPDATE \"Users\" SET email = 'user@faedeveloper.com.br', \"passwordHash\" = '$HASH' WHERE id = 1;"

# 4. Validar a alteração
echo "🔍 Verificando atualização no banco:"
docker exec $DB_CONTAINER psql -U postgres -d atendzappy -c "SELECT id, email, name FROM \"Users\" WHERE id = 1;"

echo "✅ Script finalizado com sucesso!"
