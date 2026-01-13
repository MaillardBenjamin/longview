#!/bin/bash
# Script pour lancer un entraînement de ~12 heures avec prévention de veille

echo "🚀 LANCEMENT DE L'ENTRAÎNEMENT (12 heures)"
echo "=========================================="
echo ""
echo "Configuration :"
echo "  • Profils : 15"
echo "  • Épisodes par profil : 3000"
echo "  • Réseau : solid"
echo "  • Temps estimé : ~12-13 heures"
echo "  • Prévention de veille : ACTIVÉE"
echo ""

# Activer l'environnement virtuel
cd "$(dirname "$0")"
source .venv/bin/activate

# Lancer caffeinate en arrière-plan pour empêcher la veille
echo "🔋 Activation de la prévention de veille..."
caffeinate -d -i -m -s -u &
CAFFEINATE_PID=$!

# Fonction pour nettoyer à la fin
cleanup() {
    echo ""
    echo "Arrêt de la prévention de veille..."
    kill $CAFFEINATE_PID 2>/dev/null
    exit 0
}

# Capturer Ctrl+C pour nettoyer proprement
trap cleanup SIGINT SIGTERM

# Lancer l'entraînement
echo "🚀 Démarrage de l'entraînement..."
python train_general_rl_model.py \
    --profiles 15 \
    --episodes 3000 \
    --network solid \
    --yes

# Arrêter caffeinate à la fin
kill $CAFFEINATE_PID 2>/dev/null

echo ""
echo "✅ Entraînement terminé !"
echo ""
echo "Le modèle est sauvegardé dans :"
echo "  app/models/rl/rl_model_general_solid.zip"




