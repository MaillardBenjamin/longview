#!/usr/bin/env python3
"""
Script de test pour vérifier que les imports RL fonctionnent correctement.
"""

import sys
import os

# Ajouter le répertoire backend au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("🔍 Test des imports ML...")

try:
    print("  - Import de torch...")
    import torch
    print(f"     ✅ PyTorch {torch.__version__}")
    if torch.backends.mps.is_available():
        print("     ✅ Metal Performance Shaders (MPS) disponible")
    else:
        print("     ⚠️  MPS non disponible (normal si pas sur Mac)")
except ImportError as e:
    print(f"     ❌ Erreur: {e}")
    sys.exit(1)

try:
    print("  - Import de gymnasium...")
    import gymnasium as gym
    print(f"     ✅ Gymnasium {gym.__version__}")
except ImportError as e:
    print(f"     ❌ Erreur: {e}")
    sys.exit(1)

try:
    print("  - Import de stable-baselines3...")
    from stable_baselines3 import PPO
    print("     ✅ stable-baselines3 disponible")
except ImportError as e:
    print(f"     ❌ Erreur: {e}")
    sys.exit(1)

try:
    print("  - Import de mlx...")
    import mlx.core as mx
    print("     ✅ MLX disponible (Apple Silicon)")
except ImportError as e:
    print(f"     ⚠️  MLX non disponible: {e} (normal si pas sur Apple Silicon)")

print("\n🔍 Test des imports RL LongView...")

try:
    print("  - Import du module RL...")
    from app.services.monte_carlo.rl.config import RLConfig
    from app.services.monte_carlo.rl.environment import RetirementEnvironment
    from app.services.monte_carlo.rl.agent import RLAgent
    from app.services.monte_carlo.rl.trainer import RLTrainer
    print("     ✅ Tous les modules RL sont importables")
except ImportError as e:
    print(f"     ❌ Erreur d'import: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n✅ Tous les tests d'import sont passés !")
print("\n🚀 Prêt pour l'entraînement RL !")

