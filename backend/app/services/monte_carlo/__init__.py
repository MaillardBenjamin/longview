"""
Module Monte Carlo pour la simulation financière.

Ce module fournit des fonctions de simulation Monte Carlo pour :
- La phase de capitalisation (accumulation de capital)
- La phase de retraite (décumulation)
- L'optimisation des plans d'épargne

Les simulations utilisent des tirages aléatoires corrélés pour modéliser
l'incertitude des rendements financiers.
"""

from app.services.monte_carlo.optimization import optimize_savings_plan
from app.services.monte_carlo.retirement import simulate_retirement_monte_carlo
from app.services.monte_carlo.simulation import simulate_monte_carlo

__all__ = [
    "simulate_monte_carlo",
    "simulate_retirement_monte_carlo",
    "optimize_savings_plan",
]

