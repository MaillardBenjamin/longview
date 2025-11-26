"""
Module de génération des rendements mensuels pour les simulations Monte Carlo.

Gère la génération de rendements aléatoires corrélés pour différentes classes d'actifs,
en tenant compte de l'inflation et des ajustements spécifiques à chaque type de compte.
"""

import logging
import math
import random
from typing import Dict

from app.schemas.projections import (
    InvestmentAccount,
    MarketAssetAssumption,
    MarketAssumptions,
)
from app.services.capitalization import (
    _account_gross_monthly_return,
    _asset_expected_return,
)
from app.services.monte_carlo.correlations import (
    ASSET_KEYS,
    build_covariance_matrix,
    cholesky_decomposition,
)

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.returns")

# Volatilités annuelles par défaut (en pourcentage)
DEFAULT_VOLATILITIES = {
    "equities": 15.0,  # Actions : volatilité élevée
    "bonds": 6.0,  # Obligations : volatilité modérée
    "livrets": 0.5,  # Livrets : très faible volatilité
    "crypto": 80.0,  # Cryptomonnaies : très haute volatilité
    "other": 10.0,  # Autres supports : volatilité moyenne
}


def compute_asset_monthly_mean(
    asset_classes: Dict[str, MarketAssetAssumption],
    key: str,
) -> float:
    """
    Calcule la moyenne mensuelle attendue pour une classe d'actif.

    Args:
        asset_classes: Dictionnaire des hypothèses de marché
        key: Clé de la classe d'actif

    Returns:
        Rendement mensuel attendu (décimal, ex: 0.005 pour 0.5%)
    """
    annual = _asset_expected_return(asset_classes, key)
    return annual / 12


def compute_asset_monthly_std(
    asset_classes: Dict[str, MarketAssetAssumption],
    key: str,
) -> float:
    """
    Calcule l'écart-type mensuel pour une classe d'actif.

    Convertit la volatilité annuelle en volatilité mensuelle en divisant
    par la racine carrée de 12 (approximation de la volatilité temporelle).

    Args:
        asset_classes: Dictionnaire des hypothèses de marché
        key: Clé de la classe d'actif

    Returns:
        Écart-type mensuel (décimal)
    """
    assumption = asset_classes.get(key)
    if assumption and assumption.volatility is not None:
        annual_vol = assumption.volatility / 100
    else:
        annual_vol = DEFAULT_VOLATILITIES[key] / 100
    # Conversion annuelle → mensuelle : σ_mensuel = σ_annuel / √12
    return annual_vol / math.sqrt(12)


def sample_monthly_asset_returns(
    market_assumptions: MarketAssumptions | None,
) -> Dict[str, float]:
    """
    Génère un échantillon de rendements mensuels corrélés pour toutes les classes d'actifs.

    Utilise la décomposition de Cholesky pour générer des rendements corrélés
    à partir de variables aléatoires indépendantes.

    Args:
        market_assumptions: Hypothèses de marché (rendements, volatilités, corrélations)

    Returns:
        Dictionnaire des rendements mensuels par classe d'actif
    """
    asset_classes = market_assumptions.asset_classes if market_assumptions else {}
    correlations = market_assumptions.correlations if market_assumptions else {}

    # Calcul des moyennes et écarts-types mensuels
    means = [compute_asset_monthly_mean(asset_classes, key) for key in ASSET_KEYS]
    stds = [compute_asset_monthly_std(asset_classes, key) for key in ASSET_KEYS]

    # Construction de la matrice de covariance
    covariance = build_covariance_matrix(ASSET_KEYS, stds, correlations)

    try:
        # Décomposition de Cholesky pour générer des variables corrélées
        cholesky = cholesky_decomposition(covariance)
        # Génération de variables aléatoires indépendantes (normales standard)
        normals = [random.gauss(0.0, 1.0) for _ in ASSET_KEYS]
        # Transformation en variables corrélées : X = μ + L * Z
        correlated = [
            means[i] + sum(cholesky[i][k] * normals[k] for k in range(len(ASSET_KEYS)))
            for i in range(len(ASSET_KEYS))
        ]
    except ValueError:
        # Si la matrice n'est pas définie positive, on utilise des rendements indépendants
        logger.warning(
            "La matrice de corrélation n'est pas définie positive ; "
            "utilisation de tirages indépendants."
        )
        correlated = [random.gauss(means[i], stds[i]) for i in range(len(ASSET_KEYS))]

    returns = dict(zip(ASSET_KEYS, correlated))

    # Ajustement pour l'inflation
    inflation_mean = (market_assumptions.inflation_mean if market_assumptions else 0.0) or 0.0
    inflation_vol = (market_assumptions.inflation_volatility if market_assumptions else 0.0) or 0.0
    if inflation_mean != 0.0 or inflation_vol != 0.0:
        # Conversion de l'inflation annuelle en mensuelle
        monthly_mean = inflation_mean / 100 / 12
        monthly_std = inflation_vol / 100 / math.sqrt(12)
        # Tirage d'un choc d'inflation mensuel
        inflation_sample = random.gauss(monthly_mean, monthly_std)
        # Soustraction de l'inflation aux rendements (rendements réels)
        for key in returns:
            returns[key] -= inflation_sample

    return returns


def compute_account_return_from_asset_sample(
    account: InvestmentAccount,
    base_returns: Dict[str, float],
    asset_classes: Dict[str, MarketAssetAssumption],
) -> float:
    """
    Calcule le rendement net d'un compte à partir des rendements d'actifs de base.

    Applique les ajustements spécifiques au type de compte et la fiscalité.

    Args:
        account: Compte d'investissement
        base_returns: Rendements de base par classe d'actif
        asset_classes: Hypothèses de marché

    Returns:
        Rendement net mensuel après fiscalité (décimal)
    """
    from app.services.capitalization import _account_tax_rate

    gross = compute_account_gross_return_from_sample(account, base_returns, asset_classes)
    tax_rate = _account_tax_rate(account)
    return gross * (1 - tax_rate)


def compute_account_gross_return_from_sample(
    account: InvestmentAccount,
    base_returns: Dict[str, float],
    asset_classes: Dict[str, MarketAssetAssumption],
) -> float:
    """
    Calcule le rendement brut d'un compte à partir des rendements d'actifs de base.

    Ajuste les rendements pour correspondre aux caractéristiques spécifiques
    du compte (type, allocation, performance attendue).

    Args:
        account: Compte d'investissement
        base_returns: Rendements de base par classe d'actif
        asset_classes: Hypothèses de marché

    Returns:
        Rendement brut mensuel avant fiscalité (décimal)
    """
    def adjust_return(sample: float, base_mean: float, target_mean: float) -> float:
        """
        Ajuste un rendement échantillonné pour correspondre à une moyenne cible.

        Cette fonction recentre le rendement aléatoire pour qu'il corresponde
        à la performance attendue du compte.
        """
        adjusted = sample + (target_mean - base_mean)
        # Protection contre les valeurs aberrantes (limite à ±30% par mois)
        # Cette limite doit correspondre à celle dans retirement.py
        return max(-0.3, min(0.3, adjusted))

    account_type = account.type.value if hasattr(account.type, "value") else str(account.type)

    # PEA et CTO : 100% actions
    if account_type in {"pea", "cto"}:
        base_key = "equities"
        base_mean = compute_asset_monthly_mean(asset_classes, base_key)
        target_mean = _account_gross_monthly_return(account, asset_classes)
        return adjust_return(base_returns[base_key], base_mean, target_mean)

    # PER et Assurance-vie : allocation mixte
    if account_type in {"per", "assurance_vie"}:
        actions = (account.allocation_actions or 0.0) / 100
        obligations = (account.allocation_obligations or 0.0) / 100
        remaining = max(0.0, 1.0 - actions - obligations)

        # Rendement pondéré selon l'allocation
        base_return = (
            actions * base_returns["equities"]
            + obligations * base_returns["bonds"]
            + remaining * base_returns["other"]
        )
        base_mean = (
            actions * compute_asset_monthly_mean(asset_classes, "equities")
            + obligations * compute_asset_monthly_mean(asset_classes, "bonds")
            + remaining * compute_asset_monthly_mean(asset_classes, "other")
        )
        target_mean = _account_gross_monthly_return(account, asset_classes)
        return adjust_return(base_return, base_mean, target_mean)

    # Livret : rendement fixe
    if account_type == "livret":
        base_key = "livrets"
        base_mean = compute_asset_monthly_mean(asset_classes, base_key)
        target_mean = _account_gross_monthly_return(account, asset_classes)
        return adjust_return(base_returns[base_key], base_mean, target_mean)

    # Crypto : volatilité très élevée
    if account_type == "crypto":
        base_key = "crypto"
        base_mean = compute_asset_monthly_mean(asset_classes, base_key)
        target_mean = _account_gross_monthly_return(account, asset_classes)
        return adjust_return(base_returns[base_key], base_mean, target_mean)

    # Autres supports : par défaut
    base_key = "other"
    base_mean = compute_asset_monthly_mean(asset_classes, base_key)
    target_mean = _account_gross_monthly_return(account, asset_classes)
    return adjust_return(base_returns[base_key], base_mean, target_mean)

