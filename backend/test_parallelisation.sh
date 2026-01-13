#!/bin/bash
# Script de test pour vérifier que la parallélisation fonctionne correctement

echo "🧪 TEST DE PARALLÉLISATION"
echo "=========================="
echo ""
echo "Ce script va lancer un entraînement très court (2 profils, 100 épisodes)"
echo "pour vérifier que la parallélisation est bien activée."
echo ""

# Activer l'environnement virtuel
cd "$(dirname "$0")"
source .venv/bin/activate

echo "📊 Configuration du test :"
echo "   • Profils: 2"
echo "   • Épisodes par profil: 100"
echo "   • Réseau: solid (rapide)"
echo "   • Temps estimé: 5-10 minutes"
echo ""
echo "🚀 Lancement du test..."
echo ""

# Lancer le test avec une configuration minimale
python train_general_rl_model.py \
    --profiles 2 \
    --episodes 100 \
    --network solid \
    --yes

echo ""
echo "✅ Test terminé !"
echo ""
echo "Vérifiez les logs pour confirmer :"
echo "  • 'SubprocVecEnv' doit apparaître (pas 'DummyVecEnv')"
echo "  • 'PARALLÉLISATION ACTIVÉE' doit apparaître"
echo "  • L'utilisation CPU doit être élevée (80-90%)"
echo ""
echo "Pour voir les logs :"
echo "  tail -50 train_general_model.log | grep -E '(PARALLÉLISATION|SubprocVecEnv|Workers)'"




