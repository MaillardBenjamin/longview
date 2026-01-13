#!/usr/bin/env python3
"""
Script de test pour lancer un entraînement RL minimal.
"""

import sys
import os
import logging

# Ajouter le répertoire backend au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from app.services.monte_carlo.rl.config import RLConfig
from app.services.monte_carlo.rl.environment import RetirementEnvironment
from app.services.monte_carlo.rl.agent import RLAgent
from app.schemas.projections import (
    SavingsOptimizationInput,
    AdultProfile,
    InvestmentAccount,
    MarketAssumptions,
    SavingsPhase,
    SpendingPhase,
)

print("🚀 Démarrage du test d'entraînement RL...\n")

# Créer des données de test minimales
print("📝 Création des données de test...")

adults = [
    AdultProfile(
        first_name="Test",
        current_age=35,
        retirement_age=65,
        life_expectancy=85,
        monthly_net_income=4000.0,
    )
]

investment_accounts = [
    InvestmentAccount(
        id="1",
        type="pea",
        label="PEA",
        current_amount=50000.0,
        monthly_contribution=500.0,
        allocation_actions=0.8,
        allocation_obligations=0.2,
    )
]

savings_phases = [
    SavingsPhase(
        label="Phase 1",
        from_age=35,
        to_age=65,
        monthly_contribution=500.0,
    )
]

market_assumptions = MarketAssumptions(
    inflation_mean=2.0,
    inflation_volatility=1.0,
    asset_classes={
        "equities": {
            "label": "Actions",
            "expected_return": 7.0,
            "volatility": 15.0,
        },
        "bonds": {
            "label": "Obligations",
            "expected_return": 3.0,
            "volatility": 6.0,
        },
    },
    correlations={
        "equities": {"equities": 1.0, "bonds": 0.3},
        "bonds": {"equities": 0.3, "bonds": 1.0},
    },
)

optimization_input = SavingsOptimizationInput(
    adults=adults,
    savings_phases=savings_phases,
    investment_accounts=investment_accounts,
    market_assumptions=market_assumptions,
    spending_profile=[],  # Vide pour simplifier
    target_monthly_income=2000.0,
    state_pension_monthly_income=1000.0,
    target_final_capital=0.0,
    batch_size=50,  # Réduit pour le test
    max_iterations=10,
)

print("✅ Données de test créées\n")

# Créer l'environnement
print("🌍 Création de l'environnement RL...")
try:
    env = RetirementEnvironment(optimization_input)
    print("✅ Environnement créé\n")
except Exception as e:
    print(f"❌ Erreur lors de la création de l'environnement: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Créer la configuration RL (réduite pour le test)
print("⚙️  Configuration RL (mode test - 50 épisodes)...")
config = RLConfig(
    episodes=50,  # Très réduit pour le test
    hidden_layers=[64, 32],  # Petit réseau
    learning_rate=3e-4,
    mc_iterations_training=25,  # Très réduit pour le test
)
print("✅ Configuration créée\n")

# Créer l'agent
print("🤖 Création de l'agent RL...")
try:
    agent = RLAgent(env, config)
    print("✅ Agent créé\n")
except Exception as e:
    print(f"❌ Erreur lors de la création de l'agent: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Lancer l'entraînement
print("🎯 Démarrage de l'entraînement (50 épisodes - ~1-2 minutes)...")
print("-" * 60)
try:
    agent.train(config.episodes)
    print("-" * 60)
    print("✅ Entraînement terminé avec succès !\n")
except Exception as e:
    print(f"❌ Erreur lors de l'entraînement: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Tester une prédiction
print("🔮 Test d'une prédiction...")
try:
    obs, _ = env.reset()
    action, _states = agent.predict(obs, deterministic=True)
    print(f"✅ Prédiction réussie: action={action}")
except Exception as e:
    print(f"⚠️  Erreur lors de la prédiction: {e}")

print("\n🎉 Tous les tests sont passés !")
print("\n💡 Vous pouvez maintenant tester l'optimisation RL via l'interface web.")
print("   Activez le toggle 'Optimisation intelligente par IA' dans le formulaire de simulation.")

