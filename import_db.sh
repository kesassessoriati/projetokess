#!/bin/bash
CONTAINER=$(docker ps -q -f name=pgvector | head -1)
if [ -z "$CONTAINER" ]; then
  echo "❌ Container pgvector não encontrado!"
  exit 1
fi
echo "📦 Copiando SQL para container $CONTAINER..."
docker cp /opt/atendzappy/empresa.sql $CONTAINER:/tmp/empresa.sql

echo "📥 Importando SQL (pode demorar um pouco)..."
docker exec $CONTAINER psql -U postgres -d atendzappy -f /tmp/empresa.sql > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Importação concluída com sucesso!"
else
    echo "⚠️ Houve erros na importação (alguns podem ser normais se as tabelas já existirem)."
fi
