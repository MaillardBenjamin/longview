"""
Environnement Gymnasium pour l'optimisation de stratégies d'épargne avec RL.

Cet environnement encapsule la simulation Monte Carlo et définit l'espace d'état,
l'espace d'action et la fonction de récompense pour l'apprentissage par renforcement.
"""

import logging
from typing import Any, Optional, Tuple

import gymnasium as gym
import numpy as np
from gymnasium import spaces

from app.schemas.projections import (
    AdultProfile,
    InvestmentAccount,
    MarketAssumptions,
    MonteCarloInput,
    SavingsOptimizationInput,
)
from app.services.monte_carlo.simulation import simulate_monte_carlo

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.rl.environment")


class RetirementEnvironment(gym.Env):
    """
    Environnement de simulation de retraite pour l'apprentissage par renforcement.
    
    L'agent apprend à optimiser l'épargne mensuelle et l'allocation d'actifs
    pour maximiser le capital final tout en préservant la qualité de vie.
    
    État (State):
        - age: Âge actuel (normalisé)
        - current_capital: Capital actuel (normalisé)
        - monthly_income: Revenus mensuels nets (normalisés)
        - monthly_charges: Charges mensuelles (normalisées)
        - current_savings: Épargne mensuelle actuelle (normalisée)
        - stock_allocation: Allocation en actions (0-1)
        - bond_allocation: Allocation en obligations (0-1)
    
    Action:
        - monthly_savings: Épargne mensuelle (normalisée 0-1, dénormalisée selon revenus disponibles)
        - stock_allocation: Allocation en actions (0-1)
    
    Récompense:
        - Capital final (normalisé)
        - Pénalité si épargne trop élevée (sacrifice qualité de vie)
        - Pénalité si risque trop important
    """
    
    metadata = {"render_modes": ["human"], "render_fps": 4}
    
    def __init__(
        self,
        optimization_input: SavingsOptimizationInput,
        config: Optional[Any] = None,
        simplified_simulation: bool = True,
    ):
        """
        Initialise l'environnement avec les paramètres de simulation.
        
        Args:
            optimization_input: Paramètres d'optimisation (profils, comptes, objectifs)
            config: Configuration RL (optionnel)
            simplified_simulation: Si True, utilise une simulation simplifiée (annuelle) pour la vitesse
        """
        super().__init__()
        
        self.optimization_input = optimization_input
        self.simplified_simulation = simplified_simulation
        
        # Extraire les informations de base
        self.primary_adult = optimization_input.adults[0] if optimization_input.adults else None
        if not self.primary_adult:
            raise ValueError("Au moins un profil adulte est requis")
        
        self.current_age = self.primary_adult.current_age
        self.retirement_age = self.primary_adult.retirement_age
        self.life_expectancy = self.primary_adult.life_expectancy or 85.0
        
        # Calculer les valeurs de normalisation
        self._compute_normalization_factors()
        
        # Définir l'espace d'état (7 dimensions)
        self.observation_space = spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(7,),
            dtype=np.float32,
        )
        
        # Définir l'espace d'action (2 dimensions : épargne normalisée, allocation actions)
        self.action_space = spaces.Box(
            low=np.array([0.0, 0.0], dtype=np.float32),
            high=np.array([1.0, 1.0], dtype=np.float32),
            dtype=np.float32,
        )
        
        # État actuel
        self.current_step = 0
        self.current_capital = self._get_initial_capital()
        self.current_age_float = float(self.current_age)
        self.episode_reward = 0.0
        
        # Statistiques
        self.total_savings_made = 0.0
        self.savings_rate_history = []
        
    def _compute_normalization_factors(self):
        """Calcule les facteurs de normalisation pour l'état."""
        # Estimation des valeurs maximales pour la normalisation
        # Ces valeurs seront utilisées pour normaliser l'état entre -1 et 1 approximativement
        
        # Capital : estimer un capital max réaliste (ex: 5M€)
        self.max_capital = 5_000_000.0
        
        # Revenus : utiliser le revenu net mensuel ou une estimation
        monthly_income = getattr(self.primary_adult, "monthly_net_income", None)
        if monthly_income:
            self.monthly_income = monthly_income
        else:
            # Estimation basée sur l'âge moyen
            self.monthly_income = 3000.0
        
        self.max_monthly_income = self.monthly_income * 2.0  # Marge pour variations
        
        # Charges : estimation
        self.max_monthly_charges = self.monthly_income * 0.8
        
        # Épargne maximale possible (100% des revenus disponibles)
        self.max_monthly_savings = self.monthly_income * 0.5
        
        # Âge : normalisé par rapport à la durée totale (0 à 1)
        self.age_range = self.retirement_age - self.current_age
        
    def _get_initial_capital(self) -> float:
        """Calcule le capital initial total."""
        total = 0.0
        for account in self.optimization_input.investment_accounts:
            total += account.current_amount
        return total
    
    def _get_current_income(self) -> float:
        """Retourne le revenu mensuel net actuel."""
        return getattr(self.primary_adult, "monthly_net_income", self.monthly_income) or self.monthly_income
    
    def _get_current_charges(self) -> float:
        """Calcule les charges mensuelles actuelles."""
        # Simplification : somme des charges du foyer
        total_charges = 0.0
        
        if hasattr(self.optimization_input, "household_charges") and self.optimization_input.household_charges:
            for charge in self.optimization_input.household_charges:
                # Vérifier si la charge est encore active
                if charge.until_age is None or self.current_age_float < charge.until_age:
                    total_charges += charge.monthly_amount
        
        return total_charges
    
    def _normalize_state(self) -> np.ndarray:
        """
        Construit et normalise l'état actuel.
        
        Returns:
            État normalisé sous forme de numpy array
        """
        age_normalized = (self.current_age_float - self.current_age) / self.age_range
        capital_normalized = self.current_capital / self.max_capital
        income_normalized = self._get_current_income() / self.max_monthly_income
        charges_normalized = self._get_current_charges() / self.max_monthly_charges
        
        # Épargne actuelle (dernière action)
        current_savings_normalized = getattr(self, "last_savings", 0.0) / self.max_monthly_savings
        
        # Allocation actuelle (moyenne des comptes)
        stock_allocation = self._get_current_stock_allocation()
        bond_allocation = 1.0 - stock_allocation
        
        state = np.array([
            age_normalized,
            capital_normalized,
            income_normalized,
            charges_normalized,
            current_savings_normalized,
            stock_allocation,
            bond_allocation,
        ], dtype=np.float32)
        
        return state
    
    def _get_current_stock_allocation(self) -> float:
        """Calcule l'allocation moyenne en actions des comptes."""
        if not self.optimization_input.investment_accounts:
            return 0.7  # Valeur par défaut
        
        total_capital = self._get_initial_capital()
        if total_capital == 0:
            return 0.7
        
        weighted_allocation = 0.0
        for account in self.optimization_input.investment_accounts:
            weight = account.current_amount / total_capital
            allocation = account.allocation_actions or 0.0
            weighted_allocation += weight * (allocation / 100.0 if allocation > 1.0 else allocation)
        
        return max(0.0, min(1.0, weighted_allocation))
    
    def reset(
        self,
        seed: Optional[int] = None,
        options: Optional[dict] = None,
    ) -> Tuple[np.ndarray, dict]:
        """
        Réinitialise l'environnement pour un nouvel épisode.
        
        Args:
            seed: Graine aléatoire
            options: Options de réinitialisation
        
        Returns:
            État initial et dictionnaire d'informations
        """
        super().reset(seed=seed)
        
        self.current_step = 0
        self.current_capital = self._get_initial_capital()
        self.current_age_float = float(self.current_age)
        self.episode_reward = 0.0
        self.total_savings_made = 0.0
        self.savings_rate_history = []
        self.last_savings = 0.0
        
        state = self._normalize_state()
        info = {
            "age": self.current_age_float,
            "capital": self.current_capital,
        }
        
        return state, info
    
    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, bool, dict]:
        """
        Exécute une étape de l'environnement.
        
        Args:
            action: Action de l'agent [épargne normalisée, allocation actions]
        
        Returns:
            État suivant, récompense, terminated, truncated, info
        """
        # Dénormaliser l'action
        savings_normalized = float(action[0])
        stock_allocation = float(action[1])
        
        # Dénormaliser l'épargne selon les revenus disponibles
        available_income = self._get_current_income() - self._get_current_charges()
        monthly_savings = savings_normalized * min(available_income * 0.5, self.max_monthly_savings)
        monthly_savings = max(0.0, monthly_savings)  # Pas d'épargne négative
        
        self.last_savings = monthly_savings
        self.total_savings_made += monthly_savings
        
        # Calculer le taux d'épargne
        savings_rate = monthly_savings / self._get_current_income() if self._get_current_income() > 0 else 0.0
        self.savings_rate_history.append(savings_rate)
        
        # Simulation simplifiée : avancer d'un an (12 mois) à la fois pour la vitesse
        if self.simplified_simulation:
            months_to_simulate = 12
        else:
            months_to_simulate = 1
        
        # Avancer dans le temps
        self.current_step += months_to_simulate
        self.current_age_float += months_to_simulate / 12.0
        
        # Simuler l'évolution du capital (simplifié)
        # En réalité, cela devrait utiliser la simulation Monte Carlo complète
        # Pour l'instant, on utilise une approximation simple
        self.current_capital = self._simulate_capital_step(
            monthly_savings,
            stock_allocation,
            months_to_simulate,
        )
        
        # Vérifier si l'épisode est terminé
        terminated = self.current_age_float >= self.retirement_age
        truncated = self.current_step >= 360  # 30 ans max
        
        # Calculer la récompense
        reward = 0.0
        if terminated or truncated:
            # Récompense finale basée sur le capital atteint
            reward = self._calculate_final_reward()
        else:
            # Récompense intermédiaire (incitation à épargner)
            reward = self._calculate_step_reward(monthly_savings, savings_rate)
        
        self.episode_reward += reward
        
        # État suivant
        next_state = self._normalize_state()
        
        info = {
            "age": self.current_age_float,
            "capital": self.current_capital,
            "monthly_savings": monthly_savings,
            "savings_rate": savings_rate,
            "total_savings": self.total_savings_made,
            "step_reward": reward,
            "episode_reward": self.episode_reward,
        }
        
        return next_state, reward, terminated, truncated, info
    
    def _simulate_capital_step(
        self,
        monthly_savings: float,
        stock_allocation: float,
        months: int,
    ) -> float:
        """
        Simule l'évolution du capital sur plusieurs mois (simplifié).
        
        Pour l'entraînement rapide, on utilise une approximation.
        Pour la prédiction finale, on utilisera la simulation Monte Carlo complète.
        """
        # Rendement annuel moyen selon l'allocation
        bond_allocation = 1.0 - stock_allocation
        
        # Rendements moyens estimés (à améliorer avec les vraies hypothèses de marché)
        stock_return = 0.07  # 7% annuel
        bond_return = 0.03   # 3% annuel
        
        annual_return = stock_allocation * stock_return + bond_allocation * bond_return
        monthly_return = annual_return / 12.0
        
        # Simulation simplifiée
        capital = self.current_capital
        for _ in range(months):
            capital += monthly_savings
            capital *= (1.0 + monthly_return)
        
        return max(0.0, capital)
    
    def _calculate_step_reward(self, monthly_savings: float, savings_rate: float) -> float:
        """
        Calcule la récompense pour une étape intermédiaire.
        
        Incite à épargner sans sacrifier la qualité de vie.
        """
        reward = 0.0
        
        # Récompense pour l'épargne (mais avec décroissance)
        if 0.15 <= savings_rate <= 0.30:  # Zone idéale : 15-30%
            reward += 0.1
        elif savings_rate > 0.30:
            reward += 0.05  # Moins de récompense si trop élevé
            if savings_rate > 0.40:
                reward -= 0.05  # Pénalité si trop sacrificiel
        
        return reward
    
    def _calculate_final_reward(self) -> float:
        """
        Calcule la récompense finale basée sur le capital atteint.
        
        La récompense est normalisée et prend en compte :
        - Le capital final
        - La qualité de vie (taux d'épargne moyen)
        - La régularité de l'épargne
        """
        target_capital = self.optimization_input.target_final_capital
        if target_capital <= 0:
            # Pas d'objectif défini, récompense basée sur le capital absolu
            capital_reward = self.current_capital / self.max_capital
        else:
            # Récompense basée sur l'atteinte de l'objectif
            if self.current_capital >= target_capital:
                capital_reward = 1.0 + (self.current_capital - target_capital) / target_capital * 0.5
            else:
                capital_reward = self.current_capital / target_capital * 0.5
        
        # Pénalité pour qualité de vie (épargne trop élevée en moyenne)
        avg_savings_rate = np.mean(self.savings_rate_history) if self.savings_rate_history else 0.0
        if avg_savings_rate > 0.40:
            quality_penalty = (avg_savings_rate - 0.40) * 0.5
        else:
            quality_penalty = 0.0
        
        # Récompense finale
        final_reward = capital_reward - quality_penalty
        
        return float(final_reward)
    
    def render(self):
        """Affiche l'état actuel (pour le debugging)."""
        print(f"Step: {self.current_step}, Age: {self.current_age_float:.1f}, Capital: {self.current_capital:.2f}€")





