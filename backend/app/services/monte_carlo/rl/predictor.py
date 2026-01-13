"""
Predictor pour générer des stratégies d'épargne optimisées avec le modèle RL.

Utilise un modèle entraîné pour prédire la stratégie optimale (épargne et allocation)
sur toute la durée de capitalisation.
"""

import logging
from typing import List, Optional, Tuple

import numpy as np

from app.schemas.projections import (
    InvestmentAccount,
    SavingsOptimizationInput,
    SavingsPhase,
)
from app.services.monte_carlo.rl.agent import RLAgent
from app.services.monte_carlo.rl.config import RLConfig
from app.services.monte_carlo.rl.environment import RetirementEnvironment

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.rl.predictor")


class RLStrategyPoint:
    """Point de la stratégie RL à un moment donné."""
    
    def __init__(
        self,
        age: float,
        monthly_savings: float,
        stock_allocation: float,
        bond_allocation: float,
    ):
        self.age = age
        self.monthly_savings = monthly_savings
        self.stock_allocation = stock_allocation
        self.bond_allocation = bond_allocation


class RLStrategyPredictor:
    """
    Predictor pour générer des stratégies d'épargne optimisées.
    
    Utilise un modèle RL entraîné pour générer une stratégie adaptative
    (épargne et allocation variables dans le temps).
    """
    
    def __init__(
        self,
        agent: RLAgent,
        optimization_input: SavingsOptimizationInput,
        config: Optional[RLConfig] = None,
    ):
        """
        Initialise le predictor.
        
        Args:
            agent: Agent RL entraîné
            optimization_input: Paramètres d'optimisation
            config: Configuration RL
        """
        self.agent = agent
        self.optimization_input = optimization_input
        self.config = config or RLConfig()
        
        # Créer un environnement pour la prédiction (simulation complète)
        self.env = RetirementEnvironment(
            optimization_input=optimization_input,
            config=self.config,
            simplified_simulation=False,  # Simulation complète pour la prédiction
        )
        
        # Informations du profil
        self.primary_adult = (
            optimization_input.adults[0]
            if optimization_input.adults
            else None
        )
        if not self.primary_adult:
            raise ValueError("Au moins un profil adulte est requis")
        
        self.current_age = self.primary_adult.current_age
        self.retirement_age = self.primary_adult.retirement_age
    
    def predict_strategy(
        self,
        deterministic: bool = True,
    ) -> List[RLStrategyPoint]:
        """
        Prédit la stratégie optimale sur toute la période de capitalisation.
        
        Args:
            deterministic: Si True, utilise des actions déterministes
        
        Returns:
            Liste des points de stratégie (âge, épargne, allocation)
        """
        logger.info(
            f"Génération de la stratégie RL de {self.current_age} à {self.retirement_age} ans"
        )
        
        strategy_points: List[RLStrategyPoint] = []
        
        # Réinitialiser l'environnement
        obs, info = self.env.reset()
        done = False
        step_count = 0
        
        while not done:
            # Prédire l'action
            action, _ = self.agent.predict(obs, deterministic=deterministic)
            
            # Dénormaliser l'action pour obtenir les valeurs réelles
            monthly_savings, stock_allocation = self._denormalize_action(action, info)
            
            # Créer un point de stratégie
            point = RLStrategyPoint(
                age=self.env.current_age_float,
                monthly_savings=monthly_savings,
                stock_allocation=stock_allocation,
                bond_allocation=1.0 - stock_allocation,
            )
            strategy_points.append(point)
            
            # Exécuter l'action dans l'environnement
            obs, reward, terminated, truncated, info = self.env.step(action)
            done = terminated or truncated
            
            step_count += 1
            
            # Log périodique
            if step_count % 12 == 0:  # Tous les ans
                logger.debug(
                    f"Âge {point.age:.1f} ans - "
                    f"Épargne: {monthly_savings:.2f}€/mois - "
                    f"Allocation: {stock_allocation*100:.1f}% actions"
                )
        
        logger.info(
            f"Stratégie générée avec {len(strategy_points)} points "
            f"({len(strategy_points)/12:.1f} ans)"
        )
        
        return strategy_points
    
    def _denormalize_action(
        self,
        action: np.ndarray,
        info: dict,
    ) -> Tuple[float, float]:
        """
        Dénormalise une action pour obtenir les valeurs réelles.
        
        Args:
            action: Action normalisée [épargne (0-1), allocation actions (0-1)]
            info: Informations de l'environnement
        
        Returns:
            Tuple (épargne mensuelle en €, allocation actions 0-1)
        """
        # Clamper savings_normalized entre 0 et 1 pour éviter les valeurs négatives
        savings_normalized = float(np.clip(action[0], 0.0, 1.0))
        stock_allocation = float(np.clip(action[1], 0.0, 1.0))
        
        # Dénormaliser l'épargne
        # L'épargne est normalisée par rapport aux revenus disponibles
        monthly_income = self.env._get_current_income()
        monthly_charges = self.env._get_current_charges()
        available_income = monthly_income - monthly_charges
        
        # L'épargne peut aller de 0 à 50% des revenus disponibles
        # S'assurer que max_savings est toujours >= 0
        max_savings = max(0.0, available_income * 0.5)
        monthly_savings = savings_normalized * max_savings
        
        # S'assurer que monthly_savings est toujours >= 0 (sécurité supplémentaire)
        monthly_savings = max(0.0, monthly_savings)
        
        return monthly_savings, stock_allocation
    
    def strategy_to_savings_phases(
        self,
        strategy_points: List[RLStrategyPoint],
        min_phase_duration_months: int = 12,
    ) -> List[SavingsPhase]:
        """
        Convertit une stratégie RL en phases d'épargne.
        
        Agrège les points de stratégie en phases pour faciliter l'utilisation
        avec le système existant.
        
        Args:
            strategy_points: Points de stratégie
            min_phase_duration_months: Durée minimum d'une phase en mois
        
        Returns:
            Liste des phases d'épargne
        """
        if not strategy_points:
            return []
        
        phases: List[SavingsPhase] = []
        current_phase_start_age = strategy_points[0].age
        current_phase_savings = strategy_points[0].monthly_savings
        current_phase_allocation = strategy_points[0].stock_allocation
        
        for i, point in enumerate(strategy_points[1:], start=1):
            # Vérifier si on doit créer une nouvelle phase
            age_diff = point.age - current_phase_start_age
            savings_diff = abs(point.monthly_savings - current_phase_savings)
            allocation_diff = abs(point.stock_allocation - current_phase_allocation)
            
            # Créer une nouvelle phase si :
            # - La durée est suffisante ET
            # - (l'épargne change significativement OU l'allocation change)
            should_create_phase = (
                age_diff * 12 >= min_phase_duration_months
                and (
                    savings_diff > current_phase_savings * 0.1  # Changement > 10%
                    or allocation_diff > 0.05  # Changement > 5%
                )
            )
            
            if should_create_phase or i == len(strategy_points) - 1:
                # Créer la phase précédente
                # S'assurer que monthly_contribution est toujours >= 0
                phase_savings = max(0.0, current_phase_savings)
                phase = SavingsPhase(
                    label=f"Phase RL {len(phases) + 1}",
                    from_age=current_phase_start_age,
                    to_age=point.age if i < len(strategy_points) - 1 else point.age,
                    monthly_contribution=phase_savings,
                )
                phases.append(phase)
                
                # Commencer une nouvelle phase
                current_phase_start_age = point.age
                current_phase_savings = point.monthly_savings
                current_phase_allocation = point.stock_allocation
        
        logger.info(f"Stratégie convertie en {len(phases)} phases d'épargne")
        
        return phases
    
    def strategy_to_investment_allocation(
        self,
        strategy_points: List[RLStrategyPoint],
        accounts: List[InvestmentAccount],
    ) -> List[InvestmentAccount]:
        """
        Applique l'allocation recommandée par la stratégie RL aux comptes.
        
        Args:
            strategy_points: Points de stratégie
            accounts: Comptes d'investissement existants
        
        Returns:
            Liste des comptes avec allocation mise à jour
        """
        if not strategy_points:
            return accounts
        
        # Utiliser l'allocation moyenne de la stratégie
        avg_stock_allocation = np.mean([p.stock_allocation for p in strategy_points])
        avg_bond_allocation = 1.0 - avg_stock_allocation
        
        # Appliquer aux comptes (simplifié : même allocation pour tous)
        updated_accounts = []
        for account in accounts:
            updated_account = account.model_copy(
                update={
                    "allocation_actions": avg_stock_allocation * 100,
                    "allocation_obligations": avg_bond_allocation * 100,
                }
            )
            updated_accounts.append(updated_account)
        
        logger.info(
            f"Allocation appliquée: {avg_stock_allocation*100:.1f}% actions, "
            f"{avg_bond_allocation*100:.1f}% obligations"
        )
        
        return updated_accounts




