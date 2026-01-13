#!/bin/bash

# Script de vérification de la connexion Frontend/Backend
# Usage: ./check-connection.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Vérification Frontend/Backend${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

ERRORS=0

# 1. Vérifier que le backend est lancé
echo -e "${BLUE}1. Vérification du backend...${NC}"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend accessible sur http://localhost:8000"
else
    echo -e "${RED}✗${NC} Backend non accessible sur http://localhost:8000"
    echo -e "${YELLOW}   → Lancez le backend avec : cd backend && python -m app${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Vérifier la configuration CORS du backend
echo -e "${BLUE}2. Vérification de la configuration CORS...${NC}"
if [ -f "backend/.env" ]; then
    CORS_ORIGINS=$(grep "CORS_ORIGINS" backend/.env | cut -d'=' -f2)
    if echo "$CORS_ORIGINS" | grep -q "localhost:5173"; then
        echo -e "${GREEN}✓${NC} CORS_ORIGINS contient localhost:5173 : $CORS_ORIGINS"
    else
        echo -e "${RED}✗${NC} CORS_ORIGINS ne contient pas localhost:5173"
        echo -e "${YELLOW}   → Valeur actuelle : $CORS_ORIGINS${NC}"
        echo -e "${YELLOW}   → Devrait être : http://localhost:5173${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} Fichier backend/.env non trouvé"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Vérifier la configuration du frontend
echo -e "${BLUE}3. Vérification de la configuration du frontend...${NC}"
if [ -f "frontend/.env" ]; then
    API_URL=$(grep "VITE_API_BASE_URL" frontend/.env | cut -d'=' -f2)
    if echo "$API_URL" | grep -q "localhost:8000"; then
        echo -e "${GREEN}✓${NC} VITE_API_BASE_URL pointe vers localhost:8000 : $API_URL"
    else
        echo -e "${RED}✗${NC} VITE_API_BASE_URL ne pointe pas vers localhost:8000"
        echo -e "${YELLOW}   → Valeur actuelle : $API_URL${NC}"
        echo -e "${YELLOW}   → Devrait être : http://localhost:8000/api/v1${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} Fichier frontend/.env non trouvé"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 4. Tester une requête CORS
echo -e "${BLUE}4. Test de requête CORS...${NC}"
CORS_TEST=$(curl -s -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -X OPTIONS \
    http://localhost:8000/api/v1/ \
    -w "%{http_code}" -o /dev/null 2>&1)

if [ "$CORS_TEST" = "200" ] || [ "$CORS_TEST" = "204" ]; then
    echo -e "${GREEN}✓${NC} Requête CORS acceptée (code : $CORS_TEST)"
else
    echo -e "${RED}✗${NC} Requête CORS rejetée (code : $CORS_TEST)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Résumé
echo -e "${BLUE}========================================${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Toutes les vérifications sont passées !${NC}"
    echo ""
    echo -e "${BLUE}Prochaines étapes :${NC}"
    echo "1. Redémarrez le backend si vous avez modifié backend/.env"
    echo "2. Redémarrez le frontend si vous avez modifié frontend/.env"
    echo "3. Ouvrez http://localhost:5173 dans votre navigateur"
else
    echo -e "${RED}✗ $ERRORS problème(s) détecté(s)${NC}"
    echo ""
    echo -e "${BLUE}Actions à effectuer :${NC}"
    echo "1. Corrigez les problèmes ci-dessus"
    echo "2. Redémarrez le backend et le frontend"
    echo "3. Réexécutez ce script pour vérifier"
fi
echo -e "${BLUE}========================================${NC}"

exit $ERRORS
