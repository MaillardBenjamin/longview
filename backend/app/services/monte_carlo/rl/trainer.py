"""
Trainer pour l'entraînement du modèle RL.

Orchestre l'entraînement complet, gère la parallélisation et les optimisations.
"""

import logging
import os
import time
from multiprocessing import cpu_count
from pathlib import Path
from typing import Optional, Callable

import numpy as np
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import DummyVecEnv, SubprocVecEnv

from app.schemas.projections import SavingsOptimizationInput
from app.services.monte_carlo.rl.agent import RLAgent
from app.services.monte_carlo.rl.config import RLConfig
from app.services.monte_carlo.rl.environment import RetirementEnvironment

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.rl.trainer")


class RLTrainer:
    """
    Trainer pour l'entraînement du modèle RL.
    
    Gère la création de l'environnement, l'agent et l'orchestration
    de l'entraînement avec optimisations pour le M4 Pro.
    """
    
    def __init__(
        self,
        optimization_input: SavingsOptimizationInput,
        config: Optional[RLConfig] = None,
        model_path: Optional[str] = None,
    ):
        """
        Initialise le trainer.
        
        Args:
            optimization_input: Paramètres d'optimisation
            config: Configuration RL (utilise les défauts si None)
            model_path: Chemin pour sauvegarder/charger le modèle
        """
        self.optimization_input = optimization_input
        self.config = config or RLConfig()
        self.model_path = model_path
        
        # Créer l'environnement vectorisé pour l'entraînement (parallélisé)
        self.env = self._create_vectorized_env()
        
        # Créer un environnement simple pour l'évaluation
        self.eval_env = RetirementEnvironment(
            optimization_input=optimization_input,
            config=self.config,
            simplified_simulation=True,
        )
        
        # Créer ou charger l'agent
        self.agent = None
        if model_path and os.path.exists(model_path):
            logger.info(f"Chargement du modèle depuis {model_path}")
            self._load_agent()
        else:
            logger.info("Création d'un nouvel agent")
            self._create_agent()
        
        # Statistiques d'entraînement
        self.training_start_time = None
        self.training_end_time = None
    
    def _create_vectorized_env(self):
        """
        Crée un environnement vectorisé pour la parallélisation.
        
        Utilise SubprocVecEnv pour le vrai multiprocessing si configuré,
        sinon DummyVecEnv pour un environnement unique.
        """
        def make_env() -> RetirementEnvironment:
            """Factory function pour créer un nouvel environnement."""
            return RetirementEnvironment(
                optimization_input=self.optimization_input,
                config=self.config,
                simplified_simulation=True,
            )
        
        # Si la parallélisation est activée et qu'on a plus d'un worker
        if self.config.use_parallel and self.config.num_workers > 1:
            logger.info(
                f"✅ PARALLÉLISATION: Création d'un environnement vectorisé avec "
                f"{self.config.num_workers} workers (SubprocVecEnv - multiprocessing réel)"
            )
            # Utiliser SubprocVecEnv pour le vrai multiprocessing
            # Utiliser 'fork' sur Unix (plus rapide) sauf si on utilise MPS
            # Dans ce cas, 'spawn' peut être nécessaire pour éviter des problèmes
            start_method = None  # Laisser stable-baselines3 choisir la meilleure méthode
            try:
                import torch
                if torch.backends.mps.is_available() and self.config.device == "mps":
                    # Avec MPS, 'spawn' peut être plus stable
                    start_method = 'spawn'
                    logger.info("Utilisation de 'spawn' pour compatibilité avec PyTorch MPS")
            except ImportError:
                pass
            
            env = SubprocVecEnv(
                [make_env for _ in range(self.config.num_workers)],
                start_method=start_method
            )
        else:
            logger.info("Création d'un environnement unique (DummyVecEnv)")
            # Utiliser DummyVecEnv pour un seul environnement
            env = DummyVecEnv([make_env])
        
        return env
    
    def _create_agent(self):
        """Crée un nouvel agent."""
        self.agent = RLAgent(
            env=self.env,
            config=self.config,
        )
    
    def _load_agent(self):
        """Charge un agent depuis un fichier."""
        self.agent = RLAgent(
            env=self.env,
            config=self.config,
        )
        if self.model_path:
            self.agent.load(self.model_path)
    
    def train(
        self,
        episodes: Optional[int] = None,
        progress_callback: Optional[callable] = None,
    ) -> dict:
        """
        Entraîne le modèle.
        
        Args:
            episodes: Nombre d'épisodes (utilise config.episodes si None)
            progress_callback: Fonction appelée avec les statistiques de progression
        
        Returns:
            Dictionnaire avec les statistiques d'entraînement
        """
        if episodes is not None:
            self.config.episodes = episodes
        
        # Afficher des informations claires sur la parallélisation
        if self.config.use_parallel and self.config.num_workers > 1:
            logger.info("=" * 70)
            logger.info(f"🚀 PARALLÉLISATION ACTIVÉE")
            logger.info(f"   • Nombre de workers: {self.config.num_workers}")
            logger.info(f"   • Type: SubprocVecEnv (multiprocessing réel)")
            logger.info(f"   • Device: {self.config.device}")
            logger.info(f"   • Épisodes: {self.config.episodes}")
            logger.info("=" * 70)
        else:
            logger.info("=" * 70)
            logger.info(f"⚠️  PARALLÉLISATION DÉSACTIVÉE (environnement unique)")
            logger.info(f"   • Device: {self.config.device}")
            logger.info(f"   • Épisodes: {self.config.episodes}")
            logger.info("=" * 70)
        
        self.training_start_time = time.time()
        
        # Calculer le nombre total de timesteps
        total_timesteps = (
            self.config.episodes * self.config.max_steps_per_episode
        )
        
        # Entraîner l'agent
        try:
            self.agent.train(total_timesteps=total_timesteps)
        except Exception as e:
            logger.error(f"Erreur lors de l'entraînement: {e}")
            raise
        
        self.training_end_time = time.time()
        
        # Récupérer les statistiques
        stats = self.agent.get_training_stats()
        training_time = self.training_end_time - self.training_start_time
        
        stats.update({
            "training_time_seconds": training_time,
            "training_time_minutes": training_time / 60.0,
            "episodes_per_minute": self.config.episodes / (training_time / 60.0) if training_time > 0 else 0,
            "device_used": self.config.device,
        })
        
        logger.info(
            f"Entraînement terminé en {training_time/60:.2f} minutes. "
            f"Récompense moyenne finale: {stats.get('mean_reward', 0):.3f}"
        )
        
        # Sauvegarder le modèle si un chemin est fourni
        if self.model_path:
            self.save_model(self.model_path)
        
        # Appeler le callback de progression
        if progress_callback:
            progress_callback(stats)
        
        return stats
    
    def save_model(self, path: Optional[str] = None) -> None:
        """
        Sauvegarde le modèle entraîné.
        
        Args:
            path: Chemin où sauvegarder (utilise self.model_path si None)
        """
        save_path = path or self.model_path
        if not save_path:
            raise ValueError("Aucun chemin de sauvegarde spécifié")
        
        # Créer le répertoire si nécessaire
        os.makedirs(os.path.dirname(save_path) or ".", exist_ok=True)
        
        self.agent.save(save_path)
        logger.info(f"Modèle sauvegardé dans {save_path}")
    
    def evaluate(
        self,
        num_episodes: int = 10,
        deterministic: bool = True,
    ) -> dict:
        """
        Évalue le modèle entraîné.
        
        Args:
            num_episodes: Nombre d'épisodes pour l'évaluation
            deterministic: Si True, utilise des actions déterministes
        
        Returns:
            Dictionnaire avec les métriques d'évaluation
        """
        if self.agent is None or self.agent.model is None:
            raise ValueError("Le modèle doit être entraîné avant l'évaluation")
        
        logger.info(f"Évaluation du modèle sur {num_episodes} épisodes")
        
        episode_rewards = []
        episode_lengths = []
        final_capitals = []
        
        for episode in range(num_episodes):
            obs, info = self.eval_env.reset()
            episode_reward = 0.0
            episode_length = 0
            done = False
            
            while not done:
                action, _ = self.agent.predict(obs, deterministic=deterministic)
                obs, reward, terminated, truncated, info = self.eval_env.step(action)
                
                episode_reward += reward
                episode_length += 1
                done = terminated or truncated
            
            episode_rewards.append(episode_reward)
            episode_lengths.append(episode_length)
            final_capitals.append(info.get("capital", 0.0))
        
        stats = {
            "mean_reward": float(np.mean(episode_rewards)),
            "std_reward": float(np.std(episode_rewards)),
            "min_reward": float(np.min(episode_rewards)),
            "max_reward": float(np.max(episode_rewards)),
            "mean_episode_length": float(np.mean(episode_lengths)),
            "mean_final_capital": float(np.mean(final_capitals)),
            "std_final_capital": float(np.std(final_capitals)),
        }
        
        logger.info(
            f"Évaluation terminée - Récompense moyenne: {stats['mean_reward']:.3f}, "
            f"Capital moyen: {stats['mean_final_capital']:.2f}€"
        )
        
        return stats


def optimize_rl_config_for_m4_pro(config: RLConfig) -> RLConfig:
    """
    Optimise la configuration pour le M4 Pro.
    
    Ajuste automatiquement les paramètres pour tirer parti du M4 Pro :
    - Augmente le nombre de workers pour la parallélisation
    - Configure le device pour Metal Performance Shaders
    - Ajuste les hyperparamètres pour la vitesse
    
    Args:
        config: Configuration de base
    
    Returns:
        Configuration optimisée
    """
    # Détecter le nombre de cores disponibles
    num_cores = cpu_count()
    
    # Pour le M4 Pro, on peut utiliser jusqu'à tous les cores disponibles
    if config.use_parallel:
        # Utiliser tous les cores disponibles pour maximiser l'utilisation CPU
        # Le M4 Pro peut gérer tous ses cores sans problème
        config.num_workers = num_cores  # Utiliser tous les cores
    
    # S'assurer que Metal est utilisé si disponible
    if config.device == "cpu":
        try:
            import torch
            if torch.backends.mps.is_available():
                config.device = "mps"
                logger.info("Metal Performance Shaders détecté, utilisation du GPU")
        except ImportError:
            pass
    
    logger.info("=" * 70)
    logger.info(f"🔧 CONFIGURATION OPTIMISÉE POUR M4 PRO")
    logger.info(f"   • Cores disponibles: {num_cores}")
    logger.info(f"   • Workers configurés: {config.num_workers}")
    logger.info(f"   • Device: {config.device}")
    logger.info(f"   • Parallélisation: {'✅ ACTIVÉE' if config.use_parallel and config.num_workers > 1 else '❌ DÉSACTIVÉE'}")
    logger.info("=" * 70)
    
    return config

