#!/usr/bin/env python3
"""
Script d'entraînement pour créer un modèle RL généralisé.

Entraîne un modèle unique qui peut être utilisé par tous les utilisateurs
grâce à la normalisation des états.
"""

import sys
import os
import random
import logging
import time
from pathlib import Path
from typing import List

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.monte_carlo.rl.config import RLConfig
from app.services.monte_carlo.rl.trainer import RLTrainer, optimize_rl_config_for_m4_pro
# RetirementEnvironment n'est plus nécessaire ici, c'est RLTrainer qui le gère
from app.schemas.projections import (
    SavingsOptimizationInput,
    AdultProfile,
    InvestmentAccount,
    MarketAssumptions,
    SavingsPhase,
    SpendingPhase,
    InvestmentAccountType,
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def generate_varied_profiles(num_profiles: int = 50) -> List[SavingsOptimizationInput]:
    """
    Génère une variété de profils pour l'entraînement.
    
    Args:
        num_profiles: Nombre de profils à générer
    
    Returns:
        Liste de profils d'optimisation variés
    """
    profiles = []
    
    # Varier les paramètres
    ages = list(range(25, 61, 5))  # 25, 30, 35, ..., 60
    retirement_ages = [60, 62, 65, 67, 70]
    initial_capitals = [0, 10000, 50000, 100000, 200000, 500000]
    monthly_incomes = [2000, 3000, 4000, 5000, 6000, 8000]
    target_incomes = [1500, 2000, 2500, 3000, 4000]
    
    # Hypothèses de marché standard
    market_assumptions = MarketAssumptions(
        inflation_mean=2.0,
        inflation_volatility=1.0,
        asset_classes={
            "equities": {
                "label": "Actions mondiales",
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
    
    for i in range(num_profiles):
        # Sélectionner des paramètres variés
        age = random.choice(ages)
        # S'assurer qu'il y a un retirement_age valide
        valid_retirement_ages = [a for a in retirement_ages if a > age + 10]
        if not valid_retirement_ages:
            # Si aucun retirement_age valide, utiliser l'âge + 15 comme minimum
            retirement_age = age + 15
        else:
            retirement_age = random.choice(valid_retirement_ages)
        life_expectancy = retirement_age + random.choice([15, 20, 25])
        initial_capital = random.choice(initial_capitals)
        monthly_income = random.choice(monthly_incomes)
        target_income = random.choice(target_incomes)
        pension = target_income * random.uniform(0.3, 0.6)
        
        # Créer le profil adulte
        adult = AdultProfile(
            first_name=f"Profile_{i+1}",
            current_age=float(age),
            retirement_age=float(retirement_age),
            life_expectancy=float(life_expectancy),
        )
        
        # Phases d'épargne
        savings_phases = [
            SavingsPhase(
                label="Capitalisation",
                from_age=float(age),
                to_age=float(retirement_age),
                monthly_contribution=monthly_income * random.uniform(0.1, 0.3),
            )
        ]
        
        # Comptes d'investissement
        allocation_actions = random.uniform(0.5, 0.9)
        investment_accounts = [
            InvestmentAccount(
                id=f"account_{i}",
                type=InvestmentAccountType.PEA if random.random() > 0.5 else InvestmentAccountType.ASSURANCE_VIE,
                label="Compte principal",
                current_amount=initial_capital,
                monthly_contribution=0.0,  # Géré par les phases
                allocation_actions=allocation_actions * 100,
                allocation_obligations=(1.0 - allocation_actions) * 100,
            )
        ]
        
        # Profil de dépenses
        spending_profile = [
            SpendingPhase(
                label="Retraite",
                from_age=float(retirement_age),
                to_age=float(life_expectancy),
                spending_ratio=random.uniform(0.7, 0.9),
            )
        ]
        
        # Créer le profil d'optimisation
        profile = SavingsOptimizationInput(
            adults=[adult],
            savings_phases=savings_phases,
            investment_accounts=investment_accounts,
            market_assumptions=market_assumptions,
            spending_profile=spending_profile,
            target_monthly_income=target_income,
            state_pension_monthly_income=pension,
            target_final_capital=0.0,
            batch_size=50,
            max_iterations=10,
        )
        
        profiles.append(profile)
    
    return profiles


def train_general_model(
    num_profiles: int = 50,
    episodes_per_profile: int = 3000,
    model_name: str = "general",
    network_size: str = "solid",
) -> str:
    """
    Entraîne un modèle généralisé sur plusieurs profils variés.
    
    Args:
        num_profiles: Nombre de profils variés à utiliser
        episodes_per_profile: Nombre d'épisodes par profil
        model_name: Nom du modèle à sauvegarder
        network_size: Taille du réseau ("standard", "solid", "robust", "enterprise")
    
    Returns:
        Chemin du modèle sauvegardé
    """
    logger.info("=" * 70)
    logger.info("ENTRAÎNEMENT DU MODÈLE RL GÉNÉRALISÉ")
    logger.info("=" * 70)
    logger.info(f"Profils: {num_profiles}")
    logger.info(f"Épisodes par profil: {episodes_per_profile}")
    logger.info(f"Total d'épisodes: {num_profiles * episodes_per_profile:,}")
    logger.info(f"Taille du réseau: {network_size}")
    
    # Générer les profils variés
    logger.info(f"\n📝 Génération de {num_profiles} profils variés...")
    profiles = generate_varied_profiles(num_profiles)
    logger.info(f"✅ {len(profiles)} profils générés")
    
    # Configuration du réseau selon la taille
    network_configs = {
        "standard": [128, 64, 32],
        "solid": [256, 128, 64, 32],
        "robust": [512, 256, 128, 64],
        "enterprise": [512, 512, 256, 128, 64],
    }
    
    # Configuration RL
    config = RLConfig(
        episodes=episodes_per_profile,
        hidden_layers=network_configs.get(network_size, network_configs["solid"]),
        mc_iterations_training=50,
        use_parallel=True,
    )
    
    # Optimiser pour M4 Pro
    config = optimize_rl_config_for_m4_pro(config)
    
    logger.info("=" * 70)
    logger.info(f"⚙️  CONFIGURATION DE L'ENTRAÎNEMENT")
    logger.info(f"   • Workers: {config.num_workers} (multiprocessing réel)")
    logger.info(f"   • Device: {config.device}")
    logger.info(f"   • Réseau: {config.hidden_layers}")
    logger.info(f"   • Parallélisation: {'✅ ACTIVÉE' if config.use_parallel and config.num_workers > 1 else '❌ DÉSACTIVÉE'}")
    logger.info("=" * 70)
    
    # Chemin de sauvegarde du modèle général
    models_dir = Path(__file__).parent / "app" / "models" / "rl"
    models_dir.mkdir(parents=True, exist_ok=True)
    model_path = models_dir / f"rl_model_{model_name}_{network_size}.zip"
    
    logger.info(f"\n🎯 Début de l'entraînement...")
    logger.info(f"   Modèle sera sauvegardé: {model_path}")
    
    start_time = time.time()
    total_episodes = 0
    previous_model_path = None
    
    # Entraîner sur chaque profil
    for profile_idx, profile in enumerate(profiles):
        logger.info(f"\n{'='*70}")
        logger.info(f"📊 Profil {profile_idx + 1}/{len(profiles)}")
        logger.info(f"   Âge: {profile.adults[0].current_age} → {profile.adults[0].retirement_age} ans")
        logger.info(f"   Capital initial: {sum(acc.current_amount for acc in profile.investment_accounts):,.0f}€")
        
        # Créer un nouveau trainer avec l'environnement vectorisé pour ce profil
        # Le trainer gérera automatiquement la vectorisation avec les workers configurés
        trainer = RLTrainer(
            optimization_input=profile,
            config=config,
            model_path=None,  # Pas de sauvegarde automatique pendant l'entraînement
        )
        
        # Charger le modèle précédent si on n'est pas au premier profil
        if previous_model_path and os.path.exists(previous_model_path):
            try:
                trainer.agent.load(previous_model_path)
                logger.info(f"   🔄 Modèle précédent chargé pour continuité d'entraînement")
            except Exception as e:
                logger.warning(f"   ⚠️  Impossible de charger le modèle précédent: {e}")
        
        # Entraîner sur ce profil (sans sauvegarde automatique)
        profile_start = time.time()
        stats = trainer.train(episodes=episodes_per_profile)
        profile_time = time.time() - profile_start
        total_episodes += episodes_per_profile
        
        logger.info(
            f"   ✅ Terminé en {profile_time/60:.1f} min - "
            f"Récompense moyenne: {stats.get('mean_reward', 0):.3f}"
        )
        
        # Sauvegarder périodiquement dans un fichier temporaire pour la continuité
        temp_model_path = str(model_path.parent / f"rl_model_{model_name}_{network_size}_temp.zip")
        trainer.agent.save(temp_model_path)
        previous_model_path = temp_model_path
        
        # Sauvegarder le checkpoint final périodiquement
        if (profile_idx + 1) % 10 == 0 or profile_idx == len(profiles) - 1:
            trainer.agent.save(str(model_path))
            previous_model_path = str(model_path)
            logger.info(f"   💾 Checkpoint sauvegardé ({profile_idx + 1}/{len(profiles)} profils)")
        
        # Fermer proprement l'environnement vectorisé
        if hasattr(trainer.env, 'close'):
            trainer.env.close()
    
    # Sauvegarder le modèle final
    if previous_model_path and os.path.exists(previous_model_path):
        import shutil
        shutil.copy(previous_model_path, str(model_path))
        logger.info(f"   💾 Modèle final sauvegardé")
    
    total_time = time.time() - start_time
    
    logger.info(f"\n{'='*70}")
    logger.info("✅ ENTRAÎNEMENT TERMINÉ")
    logger.info(f"{'='*70}")
    logger.info(f"⏱️  Temps total: {total_time/60:.1f} minutes ({total_time/3600:.2f} heures)")
    logger.info(f"📊 Total d'épisodes: {total_episodes:,}")
    logger.info(f"📁 Modèle sauvegardé: {model_path}")
    if model_path.exists():
        logger.info(f"💾 Taille du modèle: {model_path.stat().st_size / (1024*1024):.2f} MB")
    
    return str(model_path)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Entraîner un modèle RL généralisé")
    parser.add_argument(
        "--profiles",
        type=int,
        default=50,
        help="Nombre de profils variés (défaut: 50)"
    )
    parser.add_argument(
        "--episodes",
        type=int,
        default=3000,
        help="Nombre d'épisodes par profil (défaut: 3000, total = profiles × episodes)"
    )
    parser.add_argument(
        "--network",
        type=str,
        default="solid",
        choices=["standard", "solid", "robust", "enterprise"],
        help="Taille du réseau (défaut: solid)"
    )
    parser.add_argument(
        "--name",
        type=str,
        default="general",
        help="Nom du modèle (défaut: general)"
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Ne pas demander de confirmation"
    )
    
    args = parser.parse_args()
    
    print("\n🚀 Configuration:")
    print(f"   Profils: {args.profiles}")
    print(f"   Épisodes par profil: {args.episodes}")
    print(f"   Total: {args.profiles * args.episodes:,} épisodes")
    print(f"   Réseau: {args.network}")
    
    # Estimation du temps
    # Base: ~5 épisodes/seconde avec 12 workers
    estimated_time_min = (args.profiles * args.episodes) / (5 * 12) / 60
    print(f"   Temps estimé: ~{estimated_time_min:.0f}-{estimated_time_min*1.5:.0f} minutes")
    
    if not args.yes:
        response = input("\n▶️  Continuer? (o/n): ")
        if response.lower() != 'o':
            print("Annulé.")
            sys.exit(0)
    
    model_path = train_general_model(
        num_profiles=args.profiles,
        episodes_per_profile=args.episodes,
        model_name=args.name,
        network_size=args.network,
    )
    
    print(f"\n🎉 Modèle général sauvegardé: {model_path}")
    print("\n💡 Tous les utilisateurs peuvent maintenant utiliser ce modèle!")

