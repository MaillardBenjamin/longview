#!/bin/bash
# Script pour empêcher la mise en veille pendant l'entraînement

echo "🔋 Prévention de la mise en veille activée"
echo "=========================================="
echo ""
echo "Le système ne se mettra PAS en veille pendant l'entraînement."
echo "L'écran peut s'éteindre mais le système restera actif."
echo ""
echo "Pour arrêter la prévention de veille, appuyez sur Ctrl+C"
echo ""

# Activer caffeinate pour empêcher la veille
# Options :
#   -d : Empêche l'écran de s'éteindre
#   -i : Empêche le système de se mettre en veille
#   -m : Empêche le disque de se mettre en veille
#   -s : Empêche le système de se mettre en veille lors de la fermeture du clapet (MacBook)
#   -u : Empêche le système de se mettre en veille quand il n'y a pas d'utilisateur connecté
caffeinate -d -i -m -s -u

echo ""
echo "Prévention de veille désactivée."




