"""
Agent de Reinforcement Learning pour l'optimisation de stratégies d'épargne.

Utilise l'algorithme PPO (Proximal Policy Optimization) via stable-baselines3.
"""

import logging
from typing import Optional, Tuple

import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import DummyVecEnv, SubprocVecEnv

from app.services.monte_carlo.rl.config import RLConfig
from app.services.monte_carlo.rl.environment import RetirementEnvironment

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.rl.agent")


class TrainingProgressCallback(BaseCallback):
    """
    Callback pour suivre la progression de l'entraînement.
    
    Log les métriques importantes pendant l'entraînement.
    """
    
    def __init__(self, verbose: int = 0, total_timesteps: Optional[int] = None):
        super().__init__(verbose)
        self.episode_rewards = []
        self.episode_lengths = []
        self.total_timesteps = total_timesteps
        self.rollout_count = 0
        self.n_steps_per_rollout = 2048  # Valeur par défaut de PPO
    
    def _on_step(self) -> bool:
        """
        Appelé à chaque step de l'environnement.
        
        Returns:
            True pour continuer l'entraînement, False pour l'arrêter
        """
        return True
    
    def _on_rollout_end(self) -> None:
        """Appelé à la fin de chaque rollout."""
        self.rollout_count += 1
        
        if self.locals.get("infos"):
            for info in self.locals["infos"]:
                if "episode" in info:
                    episode_reward = info["episode"]["r"]
                    episode_length = info["episode"]["l"]
                    self.episode_rewards.append(episode_reward)
                    self.episode_lengths.append(episode_length)
        
        # Afficher la progression globale tous les 10 rollouts
        if self.rollout_count % 10 == 0 and self.total_timesteps:
            completed_timesteps = self.rollout_count * self.n_steps_per_rollout
            progress_percent = min(100.0, (completed_timesteps / self.total_timesteps) * 100)
            remaining_timesteps = max(0, self.total_timesteps - completed_timesteps)
            
            logger.info(
                f"📈 Rollout {self.rollout_count} | "
                f"Progression globale: {progress_percent:.1f}% | "
                f"Timesteps: {completed_timesteps:,}/{self.total_timesteps:,} | "
                f"Reste: {remaining_timesteps:,}"
            )
        
        # Afficher les statistiques des épisodes tous les 50
        if len(self.episode_rewards) > 0 and len(self.episode_rewards) % 50 == 0:
            avg_reward = np.mean(self.episode_rewards[-50:])
            total_episodes = len(self.episode_rewards)
            logger.info(
                f"📊 {total_episodes} épisodes complétés | "
                f"Récompense moyenne (50 derniers): {avg_reward:.3f}"
            )


class RLAgent:
    """
    Agent de Reinforcement Learning utilisant PPO.
    
    Cet agent apprend à optimiser les stratégies d'épargne en interagissant
    avec l'environnement de simulation de retraite.
    """
    
    def __init__(
        self,
        env: RetirementEnvironment,
        config: Optional[RLConfig] = None,
        model: Optional[PPO] = None,
    ):
        """
        Initialise l'agent RL.
        
        Args:
            env: Environnement de simulation
            config: Configuration RL
            model: Modèle pré-entraîné (optionnel)
        """
        self.env = env
        self.config = config or RLConfig()
        self.model = model
        self.callback = TrainingProgressCallback(verbose=1)
        
        if self.model is None:
            self._create_model()
    
    def _create_model(self):
        """Crée un nouveau modèle PPO avec la configuration spécifiée."""
        # Architecture du réseau de neurones
        policy_kwargs = dict(
            net_arch=[
                dict(
                    pi=self.config.hidden_layers,
                    vf=self.config.hidden_layers,
                )
            ]
        )
        
        # Créer le modèle PPO
        self.model = PPO(
            policy="MlpPolicy",
            env=self.env,
            learning_rate=self.config.learning_rate,
            n_steps=2048,  # Nombre de steps avant mise à jour
            batch_size=64,
            n_epochs=10,  # Nombre d'époques pour optimiser la politique
            gamma=self.config.gamma,
            gae_lambda=0.95,
            clip_range=0.2,
            ent_coef=0.01,  # Coefficient d'entropie pour l'exploration
            vf_coef=0.5,    # Coefficient pour la fonction de valeur
            max_grad_norm=0.5,
            tensorboard_log=None,  # Peut être activé pour visualisation
            policy_kwargs=policy_kwargs,
            verbose=1,
            device=self.config.device,
        )
        
        logger.info(
            f"Modèle PPO créé avec {self._count_parameters()} paramètres "
            f"sur device: {self.config.device}"
        )
    
    def _count_parameters(self) -> int:
        """Compte le nombre de paramètres du modèle."""
        if self.model is None:
            return 0
        
        total_params = sum(
            param.numel()
            for param in self.model.policy.parameters()
            if param.requires_grad
        )
        return total_params
    
    def train(self, total_timesteps: Optional[int] = None) -> None:
        """
        Entraîne l'agent.
        
        Args:
            total_timesteps: Nombre total de timesteps d'entraînement.
                           Si None, utilise config.episodes * max_steps_per_episode
        """
        if self.model is None:
            raise ValueError("Le modèle n'a pas été initialisé")
        
        if total_timesteps is None:
            total_timesteps = (
                self.config.episodes * self.config.max_steps_per_episode
            )
        
        # Calculer le nombre approximatif de rollouts
        n_steps_per_rollout = 2048  # Valeur par défaut de PPO
        num_rollouts = total_timesteps // n_steps_per_rollout
        
        logger.info("=" * 70)
        logger.info(f"🎯 DÉBUT DE L'ENTRAÎNEMENT")
        logger.info(f"   • Timesteps totaux: {total_timesteps:,}")
        logger.info(f"   • Épisodes approximatifs: ~{self.config.episodes}")
        logger.info(f"   • Nombre de rollouts estimés: ~{num_rollouts}")
        logger.info("=" * 70)
        logger.info("")
        logger.info("ℹ️  NOTE: La barre de progression affiche chaque rollout (batch)")
        logger.info(f"   Chaque cycle 0%→100% = 1 rollout sur ~{num_rollouts} au total")
        logger.info("   C'est normal qu'elle passe plusieurs fois par 100% !")
        logger.info("")
        
        # Réinitialiser le callback avec le nombre total de timesteps
        self.callback = TrainingProgressCallback(verbose=1, total_timesteps=total_timesteps)
        
        # Entraîner le modèle
        # Désactiver progress_bar si tqdm/rich ne sont pas disponibles
        try:
            import tqdm
            import rich
            use_progress_bar = True
        except ImportError:
            use_progress_bar = False
            logger.warning("tqdm/rich non disponibles, barre de progression désactivée")
        
        import time
        start_time = time.time()
        
        self.model.learn(
            total_timesteps=total_timesteps,
            callback=self.callback,
            progress_bar=use_progress_bar,
        )
        
        elapsed_time = time.time() - start_time
        logger.info("")
        logger.info("=" * 70)
        logger.info(f"✅ ENTRAÎNEMENT TERMINÉ")
        logger.info(f"   • Temps écoulé: {elapsed_time/60:.2f} minutes ({elapsed_time/3600:.2f} heures)")
        logger.info(f"   • Timesteps effectués: {total_timesteps:,}")
        logger.info("=" * 70)
    
    def predict(
        self,
        observation: np.ndarray,
        deterministic: bool = True,
    ) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """
        Prédit une action à partir d'un état.
        
        Args:
            observation: État observé
            deterministic: Si True, utilise l'action la plus probable
        
        Returns:
            Action prédite et valeur estimée (optionnelle)
        """
        if self.model is None:
            raise ValueError("Le modèle n'a pas été entraîné")
        
        return self.model.predict(observation, deterministic=deterministic)
    
    def save(self, path: str) -> None:
        """
        Sauvegarde le modèle entraîné.
        
        Args:
            path: Chemin où sauvegarder le modèle
        """
        if self.model is None:
            raise ValueError("Aucun modèle à sauvegarder")
        
        self.model.save(path)
        logger.info(f"Modèle sauvegardé dans {path}")
    
    def load(self, path: str) -> None:
        """
        Charge un modèle pré-entraîné.
        
        Args:
            path: Chemin vers le modèle à charger
        """
        self.model = PPO.load(path, env=self.env, device=self.config.device)
        logger.info(f"Modèle chargé depuis {path}")
    
    def get_training_stats(self) -> dict:
        """
        Retourne les statistiques d'entraînement.
        
        Returns:
            Dictionnaire avec les métriques d'entraînement
        """
        if not self.callback.episode_rewards:
            return {}
        
        rewards = np.array(self.callback.episode_rewards)
        lengths = np.array(self.callback.episode_lengths)
        
        return {
            "total_episodes": len(rewards),
            "mean_reward": float(np.mean(rewards)),
            "std_reward": float(np.std(rewards)),
            "min_reward": float(np.min(rewards)),
            "max_reward": float(np.max(rewards)),
            "mean_episode_length": float(np.mean(lengths)),
            "recent_mean_reward": float(np.mean(rewards[-100:])) if len(rewards) >= 100 else float(np.mean(rewards)),
        }

