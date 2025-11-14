"""
Module de gestion des corrélations entre classes d'actifs.

Gère la construction de matrices de covariance et la décomposition de Cholesky
pour générer des rendements corrélés entre différentes classes d'actifs.
"""

import logging
import math
from typing import Dict, List

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.correlations")

# Corrélations par défaut entre classes d'actifs
# Ces valeurs reflètent les corrélations historiques observées sur les marchés
DEFAULT_CORRELATIONS = {
    "equities": {"bonds": 0.3, "livrets": 0.05, "crypto": 0.4, "other": 0.6},
    "bonds": {"equities": 0.3, "livrets": 0.2, "crypto": 0.1, "other": 0.4},
    "livrets": {"equities": 0.05, "bonds": 0.2, "crypto": -0.05, "other": 0.1},
    "crypto": {"equities": 0.4, "bonds": 0.1, "livrets": -0.05, "other": 0.5},
    "other": {"equities": 0.6, "bonds": 0.4, "livrets": 0.1, "crypto": 0.5},
}

# Ordre des classes d'actifs pour les calculs matriciels
ASSET_KEYS = ["equities", "bonds", "livrets", "crypto", "other"]


def get_correlation_value(
    key_i: str,
    key_j: str,
    correlations: Dict[str, Dict[str, float]],
) -> float:
    """
    Récupère la valeur de corrélation entre deux classes d'actifs.

    Recherche dans l'ordre :
    1. Les corrélations fournies par l'utilisateur
    2. Les corrélations par défaut
    3. Retourne 0.0 si aucune corrélation n'est trouvée

    Args:
        key_i: Première classe d'actif
        key_j: Deuxième classe d'actif
        correlations: Dictionnaire des corrélations personnalisées

    Returns:
        Coefficient de corrélation (entre -1 et 1)
    """
    # Une classe d'actif est parfaitement corrélée avec elle-même
    if key_i == key_j:
        return 1.0

    # Recherche dans les corrélations personnalisées
    if key_i in correlations and key_j in correlations[key_i]:
        return correlations[key_i][key_j]
    if key_j in correlations and key_i in correlations[key_j]:
        return correlations[key_j][key_i]

    # Recherche dans les corrélations par défaut
    if key_i in DEFAULT_CORRELATIONS and key_j in DEFAULT_CORRELATIONS[key_i]:
        return DEFAULT_CORRELATIONS[key_i][key_j]
    if key_j in DEFAULT_CORRELATIONS and key_i in DEFAULT_CORRELATIONS[key_j]:
        return DEFAULT_CORRELATIONS[key_j][key_i]

    # Par défaut, pas de corrélation
    return 0.0


def build_covariance_matrix(
    keys: List[str],
    stds: List[float],
    correlations: Dict[str, Dict[str, float]],
) -> List[List[float]]:
    """
    Construit la matrice de covariance à partir des écarts-types et corrélations.

    La matrice de covariance est utilisée pour générer des rendements corrélés.
    Formule : Cov(i,j) = ρ(i,j) * σ(i) * σ(j)

    Args:
        keys: Liste des classes d'actifs (dans l'ordre)
        stds: Liste des écarts-types correspondants
        correlations: Dictionnaire des corrélations entre actifs

    Returns:
        Matrice de covariance (liste de listes)
    """
    matrix: List[List[float]] = []
    for i, key_i in enumerate(keys):
        row: List[float] = []
        for j, key_j in enumerate(keys):
            if i == j:
                # Variance = écart-type au carré
                row.append(stds[i] ** 2)
            else:
                # Covariance = corrélation * σ(i) * σ(j)
                corr = get_correlation_value(key_i, key_j, correlations)
                row.append(corr * stds[i] * stds[j])
        matrix.append(row)
    return matrix


def cholesky_decomposition(matrix: List[List[float]]) -> List[List[float]]:
    """
    Effectue la décomposition de Cholesky d'une matrice définie positive.

    La décomposition de Cholesky permet de générer des variables aléatoires
    corrélées à partir de variables indépendantes.

    Args:
        matrix: Matrice carrée symétrique définie positive

    Returns:
        Matrice triangulaire inférieure L telle que L * L^T = matrix

    Raises:
        ValueError: Si la matrice n'est pas définie positive
    """
    n = len(matrix)
    lower = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(i + 1):
            # Calcul de la somme des produits L[i][k] * L[j][k]
            sum_value = sum(lower[i][k] * lower[j][k] for k in range(j))

            if i == j:
                # Élément diagonal : L[i][i] = sqrt(M[i][i] - somme)
                value = matrix[i][i] - sum_value
                if value <= 0:
                    raise ValueError("La matrice n'est pas définie positive")
                lower[i][j] = math.sqrt(value)
            else:
                # Élément non-diagonal : L[i][j] = (M[i][j] - somme) / L[j][j]
                if lower[j][j] == 0:
                    raise ValueError("La matrice n'est pas définie positive")
                lower[i][j] = (matrix[i][j] - sum_value) / lower[j][j]

    return lower

