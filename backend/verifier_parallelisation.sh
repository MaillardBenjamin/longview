#!/bin/bash
# Script pour vérifier rapidement si la parallélisation fonctionne

echo "🔍 VÉRIFICATION DE LA PARALLÉLISATION"
echo "======================================"
echo ""

# Trouver le PID du processus
PID=$(ps aux | grep "train_general_rl_model" | grep -v grep | awk '{print $2}' | head -1)

if [ -z "$PID" ]; then
    echo "❌ Aucun processus d'entraînement trouvé"
    exit 1
fi

echo "📊 Processus trouvé: PID $PID"
echo ""

# 1. Vérifier les threads
THREADS=$(ps -p $PID -M 2>/dev/null | wc -l)
echo "1️⃣  Nombre de threads: $THREADS"
if [ "$THREADS" -gt 10 ]; then
    echo "   ✅ BON: Plusieurs threads actifs (parallélisation probable)"
else
    echo "   ⚠️  ATTENTION: Peu de threads (parallélisation peut-être inactive)"
fi
echo ""

# 2. Vérifier l'utilisation CPU du processus
CPU=$(ps -p $PID -o %cpu= | xargs)
echo "2️⃣  Utilisation CPU du processus: ${CPU}%"
if (( $(echo "$CPU > 50" | bc -l) )); then
    echo "   ✅ BON: Utilisation CPU élevée"
else
    echo "   ⚠️  ATTENTION: Utilisation CPU faible"
fi
echo ""

# 3. Vérifier les logs
echo "3️⃣  Vérification des logs:"
echo ""

cd "$(dirname "$0")"
if [ -f "train_general_model.log" ]; then
    # Chercher SubprocVecEnv
    if grep -q "SubprocVecEnv" train_general_model.log 2>/dev/null; then
        echo "   ✅ SubprocVecEnv trouvé (parallélisation activée)"
    else
        echo "   ❌ SubprocVecEnv NON trouvé"
    fi
    
    # Chercher DummyVecEnv
    if grep -q "DummyVecEnv" train_general_model.log 2>/dev/null; then
        echo "   ⚠️  DummyVecEnv trouvé (parallélisation DÉSACTIVÉE)"
    else
        echo "   ✅ DummyVecEnv NON trouvé (bon signe)"
    fi
    
    # Chercher les messages de configuration
    if grep -q "PARALLÉLISATION ACTIVÉE" train_general_model.log 2>/dev/null; then
        echo "   ✅ Message 'PARALLÉLISATION ACTIVÉE' trouvé"
    else
        echo "   ⚠️  Message 'PARALLÉLISATION ACTIVÉE' NON trouvé"
    fi
    
    # Afficher les dernières lignes de configuration
    echo ""
    echo "   📋 Dernières lignes de configuration:"
    grep -E "(PARALLÉLISATION|Workers|SubprocVecEnv|DummyVecEnv|CONFIGURATION OPTIMISÉE)" train_general_model.log 2>/dev/null | tail -5 | sed 's/^/      /'
else
    echo "   ⚠️  Fichier train_general_model.log non trouvé"
fi

echo ""
echo "4️⃣  Utilisation CPU système:"
CPU_SYSTEM=$(top -l 1 | grep "CPU usage" | awk '{print $7}' | sed 's/%//')
IDLE=$(top -l 1 | grep "CPU usage" | awk '{print $9}' | sed 's/%//')
USED=$((100 - ${IDLE%.*}))
echo "   CPU utilisé: ${USED}%"
echo "   CPU inactif: ${IDLE}%"
if [ "$USED" -gt 50 ]; then
    echo "   ✅ BON: CPU système bien utilisé"
else
    echo "   ⚠️  ATTENTION: CPU système peu utilisé (${USED}%)"
fi

echo ""
echo "======================================"
echo "💡 RÉSUMÉ:"
echo ""

if [ "$THREADS" -gt 10 ] && grep -q "SubprocVecEnv" train_general_model.log 2>/dev/null && [ "$USED" -gt 50 ]; then
    echo "✅ La parallélisation semble FONCTIONNER correctement !"
    echo "   • Plusieurs threads actifs"
    echo "   • SubprocVecEnv détecté"
    echo "   • CPU bien utilisé"
else
    echo "⚠️  La parallélisation peut ne PAS fonctionner correctement"
    echo "   Vérifiez les détails ci-dessus"
fi




