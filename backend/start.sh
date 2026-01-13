#!/bin/bash

# Script de démarrage du backend LongView
# Usage: ./start.sh [port]

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Port par défaut
PORT=${1:-8000}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Démarrage du backend LongView${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "app/main.py" ]; then
    echo -e "${YELLOW}⚠️  Erreur: Ce script doit être exécuté depuis le répertoire backend${NC}"
    exit 1
fi

# Vérifier que le fichier .env existe
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Attention: Le fichier .env n'existe pas${NC}"
    echo -e "${YELLOW}   Copiez env.example vers .env et configurez-le${NC}"
    read -p "Continuer quand même ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Vérifier si Python est disponible
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Erreur: Python 3 n'est pas installé${NC}"
    exit 1
fi

# Vérifier si uvicorn est installé
if ! python3 -c "import uvicorn" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  uvicorn n'est pas installé${NC}"
    echo -e "${BLUE}   Installation des dépendances...${NC}"
    pip install -r requirements.txt
fi

echo -e "${GREEN}✓${NC} Dépendances vérifiées"
echo ""

# Vérifier la connexion à la base de données (optionnel)
if python3 -c "from app.core.config import settings; print(settings.database_url)" 2>/dev/null; then
    DB_URL=$(python3 -c "from app.core.config import settings; print(settings.database_url)")
    echo -e "${BLUE}Base de données:${NC} ${DB_URL}"
    echo ""
fi

echo -e "${GREEN}Démarrage du serveur sur le port ${PORT}...${NC}"
echo -e "${BLUE}Documentation: http://localhost:${PORT}/docs${NC}"
echo -e "${BLUE}Endpoint de santé: http://localhost:${PORT}/health${NC}"
echo ""
echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter le serveur${NC}"
echo ""

# Lancer le serveur
python3 -m app
