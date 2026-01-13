"""
Configuration pour l'entraînement du modèle RL.

Définit les hyperparamètres, les paramètres d'environnement et les options d'optimisation.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class RLConfig:
    """
    Configuration pour l'entraînement du modèle de Reinforcement Learning.
    
    Attributes:
        episodes: Nombre d'épisodes d'entraînement
        max_steps_per_episode: Nombre maximum de steps (mois) par épisode
        learning_rate: Taux d'apprentissage pour l'agent
        gamma: Facteur de discount pour les récompenses futures
        epsilon_start: Valeur initiale d'epsilon pour exploration
        epsilon_end: Valeur finale d'epsilon
        epsilon_decay: Taux de décroissance d'epsilon
        batch_size: Taille du batch pour l'entraînement
        hidden_layers: Configuration des couches cachées du réseau
        mc_iterations_training: Nombre d'itérations Monte Carlo pendant l'entraînement
        mc_iterations_prediction: Nombre d'itérations Monte Carlo pour la prédiction finale
        use_parallel: Utiliser le parallélisme pour l'entraînement
        num_workers: Nombre de workers pour le parallélisme
        device: Device à utiliser ('cpu', 'mps' pour Metal, 'cuda' pour GPU NVIDIA)
    """
    
    # Paramètres d'entraînement
    episodes: int = 1000
    max_steps_per_episode: int = 360  # 30 ans × 12 mois
    
    # Hyperparamètres de l'agent
    learning_rate: float = 3e-4
    gamma: float = 0.99  # Discount factor
    epsilon_start: float = 1.0
    epsilon_end: float = 0.01
    epsilon_decay: float = 0.995
    
    # Configuration du réseau
    hidden_layers: list[int] = None
    
    # Paramètres Monte Carlo
    mc_iterations_training: int = 50  # Réduit pendant l'entraînement pour la vitesse
    mc_iterations_prediction: int = 1000  # Plus précis pour la prédiction finale
    
    # Optimisations
    use_parallel: bool = True
    num_workers: int = 8  # Sera automatiquement ajusté par optimize_rl_config_for_m4_pro
    device: Optional[str] = None  # Auto-détection si None
    
    # Poids pour la fonction de récompense
    reward_capital_weight: float = 1.0
    reward_quality_of_life_weight: float = 0.3
    reward_risk_penalty_weight: float = 0.2
    
    def __post_init__(self):
        """Initialise les valeurs par défaut si non spécifiées."""
        if self.hidden_layers is None:
            self.hidden_layers = [128, 64, 32]
        
        # Auto-détection du device si non spécifié
        if self.device is None:
            try:
                import torch
                if torch.backends.mps.is_available():
                    self.device = "mps"  # Metal Performance Shaders pour Mac
                elif torch.cuda.is_available():
                    self.device = "cuda"
                else:
                    self.device = "cpu"
            except ImportError:
                self.device = "cpu"
    
    def get_state_dim(self) -> int:
        """
        Retourne la dimension de l'espace d'état.
        
        État: [âge, capital, revenus, charges, épargne actuelle, allocation actions, allocation obligations]
        """
        return 7
    
    def get_action_dim(self) -> int:
        """
        Retourne la dimension de l'espace d'action.
        
        Action: [épargne mensuelle (normalisée), allocation actions (0-1)]
        """
        return 2


