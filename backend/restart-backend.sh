#!/bin/bash

# Script pour redémarrer proprement le backend

echo "🛑 Arrêt des processus existants..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
ps aux | grep -E "uvicorn|python.*app" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
sleep 1

echo "✅ Port 8000 libéré"
lsof -ti:8000 || echo "✓ Aucun processus sur le port 8000"

echo ""
echo "🚀 Démarrage du backend..."
cd "$(dirname "$0")"
python -m app
