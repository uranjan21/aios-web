#!/usr/bin/env bash
# AIOS Web — first-time setup script
set -e

echo "=== AIOS Web Setup ==="

# 1. Copy env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env — fill in your values before continuing."
  echo ""
  echo "Required:"
  echo "  APP_SECRET_KEY  — run: openssl rand -hex 32"
  echo "  APP_PASSWORD    — your login password"
  echo "  VAULT_PATH      — absolute path to your Obsidian vault"
  echo "  ANTHROPIC_API_KEY"
  echo "  OPENAI_API_KEY  — for RAG embeddings (text-embedding-3-small)"
  echo "  TOKEN_ENCRYPTION_KEY — run: python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
  echo ""
  read -p "Press Enter after filling .env to continue..."
fi

# 2. Start DB
echo "Starting PostgreSQL with pgvector..."
docker-compose up -d db
echo "Waiting for DB to be ready..."
sleep 5

# 3. Run migrations
echo "Running Alembic migrations..."
docker-compose run --rm backend alembic upgrade head

# 4. Start all services
echo "Starting all services..."
docker-compose up -d

echo ""
echo "✓ AIOS Web is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
