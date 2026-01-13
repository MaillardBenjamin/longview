#!/bin/bash
# Script pour lancer l'entraînement avec l'environnement virtuel

cd "$(dirname "$0")"
source .venv/bin/activate
python train_general_rl_model.py "$@"





