"""
Gestion du stockage des modèles RL.

Gère la sauvegarde, le chargement et la réutilisation des modèles entraînés.
"""

import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Optional

from app.schemas.projections import SavingsOptimizationInput

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.rl.model_storage")

# Répertoire par défaut pour stocker les modèles RL
DEFAULT_MODELS_DIR = Path(__file__).parent.parent.parent.parent / "models" / "rl"


def get_model_directory() -> Path:
    """
    Retourne le répertoire pour stocker les modèles RL.
    
    Crée le répertoire s'il n'existe pas.
    """
    models_dir = os.getenv("RL_MODELS_DIR", str(DEFAULT_MODELS_DIR))
    path = Path(models_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def generate_model_hash(payload: SavingsOptimizationInput, episodes: int) -> str:
    """
    Génère un hash unique basé sur les paramètres d'entrée.
    
    Ce hash permet d'identifier si un modèle peut être réutilisé
    pour des paramètres similaires.
    
    Args:
        payload: Paramètres d'optimisation
        episodes: Nombre d'épisodes d'entraînement
    
    Returns:
        Hash hexadécimal unique
    """
    # Créer un dictionnaire avec les paramètres pertinents pour le hash
    # Note: monthly_net_income n'existe pas dans AdultProfile, on l'omet du hash
    hash_data = {
        "adults": [
            {
                "current_age": a.current_age,
                "retirement_age": a.retirement_age,
                "life_expectancy": a.life_expectancy,
            }
            for a in payload.adults
        ],
        "retirement_age": payload.adults[0].retirement_age if payload.adults else 65,
        "target_final_capital": payload.target_final_capital,
        "episodes": episodes,
        "batch_size": payload.batch_size,
    }
    
    # Convertir en JSON et hasher
    json_str = json.dumps(hash_data, sort_keys=True)
    hash_obj = hashlib.sha256(json_str.encode())
    return hash_obj.hexdigest()[:16]  # Utiliser les 16 premiers caractères


def get_model_path(
    payload: SavingsOptimizationInput,
    episodes: int,
    model_hash: Optional[str] = None,
) -> str:
    """
    Génère un chemin pour sauvegarder un modèle.
    
    Args:
        payload: Paramètres d'optimisation
        episodes: Nombre d'épisodes d'entraînement
        model_hash: Hash optionnel (généré si None)
    
    Returns:
        Chemin complet pour sauvegarder le modèle
    """
    models_dir = get_model_directory()
    
    if model_hash is None:
        model_hash = generate_model_hash(payload, episodes)
    
    model_filename = f"rl_model_{model_hash}_{episodes}ep.zip"
    return str(models_dir / model_filename)


def find_existing_model(
    payload: SavingsOptimizationInput,
    episodes: int,
    min_episodes: int = 500,
) -> Optional[str]:
    """
    Cherche un modèle existant qui pourrait être réutilisé.
    
    Args:
        payload: Paramètres d'optimisation
        episodes: Nombre d'épisodes souhaité
        min_episodes: Nombre minimum d'épisodes pour considérer un modèle
    
    Returns:
        Chemin vers le modèle existant ou None
    """
    models_dir = get_model_directory()
    
    # Générer le hash pour les paramètres
    model_hash = generate_model_hash(payload, episodes)
    
    # Chercher un modèle avec ce hash
    pattern = f"rl_model_{model_hash}_*.zip"
    
    matching_models = list(models_dir.glob(pattern))
    
    if not matching_models:
        logger.info(f"Aucun modèle existant trouvé pour hash {model_hash}")
        return None
    
    # Trier par nombre d'épisodes (descendant) et prendre le plus proche
    def extract_episodes(path: Path) -> int:
        try:
            # Format: rl_model_{hash}_{episodes}ep.zip
            parts = path.stem.split("_")
            if len(parts) >= 3:
                ep_str = parts[-1].replace("ep", "")
                return int(ep_str)
        except (ValueError, IndexError):
            pass
        return 0
    
    sorted_models = sorted(
        matching_models,
        key=extract_episodes,
        reverse=True,
    )
    
    # Prendre le modèle avec le plus d'épisodes (mais au moins min_episodes)
    for model_path in sorted_models:
        model_episodes = extract_episodes(model_path)
        if model_episodes >= min_episodes:
            logger.info(
                f"Modèle existant trouvé: {model_path.name} "
                f"({model_episodes} épisodes)"
            )
            return str(model_path)
    
    logger.info("Aucun modèle existant avec assez d'épisodes")
    return None


def find_general_model(
    network_size: str = "solid",
    model_name: str = "general",
) -> Optional[str]:
    """
    Cherche le modèle général pré-entraîné.
    
    Args:
        network_size: Taille du réseau ("standard", "solid", "robust", "enterprise")
        model_name: Nom du modèle général (défaut: "general")
    
    Returns:
        Chemin vers le modèle général ou None s'il n'existe pas
    """
    models_dir = get_model_directory()
    
    # Chercher les modèles généraux (format: rl_model_general_{network_size}.zip)
    pattern = f"rl_model_{model_name}_{network_size}.zip"
    general_model = models_dir / pattern
    
    if general_model.exists():
        logger.info(f"Modèle général trouvé: {general_model.name}")
        return str(general_model)
    
    # Chercher n'importe quel modèle général (n'importe quelle taille)
    general_patterns = [
        f"rl_model_{model_name}_*.zip",
        f"rl_model_{model_name}_*.zip",
    ]
    
    for pattern in general_patterns:
        matching_models = list(models_dir.glob(pattern))
        if matching_models:
            # Prendre le premier trouvé (ou le plus récent)
            model_path = sorted(matching_models, key=lambda p: p.stat().st_mtime, reverse=True)[0]
            logger.info(f"Modèle général trouvé: {model_path.name}")
            return str(model_path)
    
    logger.info("Aucun modèle général trouvé")
    return None


def cleanup_old_models(max_age_days: int = 30) -> int:
    """
    Nettoie les anciens modèles (plus de max_age_days jours).
    
    Args:
        max_age_days: Nombre maximum de jours avant suppression
    
    Returns:
        Nombre de modèles supprimés
    """
    import time
    
    models_dir = get_model_directory()
    cutoff_time = time.time() - (max_age_days * 24 * 60 * 60)
    
    deleted_count = 0
    for model_file in models_dir.glob("rl_model_*.zip"):
        if model_file.stat().st_mtime < cutoff_time:
            try:
                model_file.unlink()
                deleted_count += 1
                logger.info(f"Modèle ancien supprimé: {model_file.name}")
            except Exception as e:
                logger.warning(f"Erreur lors de la suppression de {model_file}: {e}")
    
    return deleted_count

