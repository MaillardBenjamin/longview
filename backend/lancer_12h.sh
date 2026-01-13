#!/bin/bash
# Script pour lancer un entraînement de ~12 heures

echo "🚀 LANCEMENT DE L'ENTRAÎNEMENT (12 heures)"
echo "=========================================="
echo ""
echo "Configuration :"
echo "  • Profils : 15"
echo "  • Épisodes par profil : 3000"
echo "  • Réseau : solid"
echo "  • Temps estimé : ~12-13 heures"
echo ""
echo "La parallélisation sera automatiquement activée."
echo ""

# Activer l'environnement virtuel
cd "$(dirname "$0")"
source .venv/bin/activate

# Lancer l'entraînement
python train_general_rl_model.py \
    --profiles 15 \
    --episodes 3000 \
    --network solid \
    --yes

echo ""
echo "✅ Entraînement terminé !"
echo ""
echo "Le modèle est sauvegardé dans :"
echo "  app/models/rl/rl_model_general_solid.zip"




