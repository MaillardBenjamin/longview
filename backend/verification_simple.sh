#!/bin/bash
# Vérification simple et rapide

echo "🔍 VÉRIFICATION RAPIDE"
echo "======================"
echo ""

# Trouver le processus
PID=$(ps aux | grep "train_general_rl_model" | grep -v grep | awk '{print $2}' | head -1)

if [ -z "$PID" ]; then
    echo "❌ Aucun processus trouvé"
    exit 1
fi

echo "✅ Processus actif: PID $PID"
echo ""

# 1. Threads
THREADS=$(ps -p $PID -M 2>/dev/null | wc -l)
echo "📊 Threads: $THREADS"
[ "$THREADS" -gt 10 ] && echo "   ✅ BON (parallélisation probable)" || echo "   ⚠️  Peu de threads"

# 2. CPU processus
CPU=$(ps -p $PID -o %cpu= | xargs)
echo "💻 CPU processus: ${CPU}%"
[ "$(echo "$CPU > 50" | bc -l 2>/dev/null || echo 0)" -eq 1 ] && echo "   ✅ BON" || echo "   ⚠️  Faible"

# 3. Logs récents
echo ""
echo "📋 Vérification des logs:"
cd "$(dirname "$0")"

# Chercher dans les 100 dernières lignes
if tail -100 train_general_model.log 2>/dev/null | grep -q "SubprocVecEnv"; then
    echo "   ✅ SubprocVecEnv trouvé → Parallélisation ACTIVÉE"
elif tail -100 train_general_model.log 2>/dev/null | grep -q "DummyVecEnv"; then
    echo "   ❌ DummyVecEnv trouvé → Parallélisation DÉSACTIVÉE"
else
    echo "   ⚠️  Aucun environnement trouvé dans les logs récents"
    echo "   (Les logs peuvent être dans un autre fichier ou pas encore écrits)"
fi

echo ""
echo "💡 Pour voir les logs en temps réel:"
echo "   tail -f train_general_model.log | grep -E '(PARALLÉLISATION|SubprocVecEnv|DummyVecEnv)'"




