"""
Module de calculs statistiques pour les simulations Monte Carlo.

Fournit les fonctions pour calculer les percentiles, vérifier la confiance
statistique et analyser les distributions de résultats.
"""

import logging
import math
from typing import List

from statistics import NormalDist

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.statistics")


def compute_percentile_from_sorted(sorted_vals: List[float], p: float) -> float:
    """
    Calcule le percentile p à partir d'une liste triée.

    Args:
        sorted_vals: Liste de valeurs triées par ordre croissant
        p: Percentile souhaité (entre 0 et 1)

    Returns:
        La valeur correspondant au percentile p
    """
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    index = int(p * (len(sorted_vals) - 1))
    index = max(0, min(len(sorted_vals) - 1, index))
    return sorted_vals[index]


def compute_percentile(values: List[float], p: float) -> float:
    """
    Calcule le percentile p d'une liste de valeurs.

    Args:
        values: Liste de valeurs (non nécessairement triée)
        p: Percentile souhaité (entre 0 et 1)

    Returns:
        La valeur correspondant au percentile p
    """
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    return compute_percentile_from_sorted(sorted_vals, p)


def check_confidence_reached(
    values: List[float],
    confidence_level: float,
    tolerance_ratio: float,
) -> bool:
    """
    Vérifie si le niveau de confiance statistique est atteint.

    Utilise l'intervalle de confiance basé sur la distribution normale
    pour déterminer si la marge d'erreur est suffisamment faible.

    Args:
        values: Liste des résultats de simulation
        confidence_level: Niveau de confiance souhaité (ex: 0.9 pour 90%)
        tolerance_ratio: Ratio de tolérance (ex: 0.05 pour 5% de marge)

    Returns:
        True si le niveau de confiance est atteint, False sinon
    """
    n = len(values)
    # Nécessite au moins 200 échantillons pour une estimation fiable
    if n < 200:
        return False

    import statistics

    mean_val = statistics.fmean(values)
    stdev_val = statistics.pstdev(values)

    # Si la moyenne est nulle, on vérifie que l'écart-type est aussi nul
    if mean_val == 0:
        return stdev_val == 0

    z_score = get_z_value(confidence_level)
    if z_score is None:
        return False

    # Calcul de la marge d'erreur avec l'erreur standard
    standard_error = stdev_val / math.sqrt(n)
    margin = z_score * standard_error

    # La marge doit être inférieure ou égale à la tolérance relative
    return margin <= abs(mean_val) * tolerance_ratio


def get_z_value(confidence_level: float) -> float | None:
    """
    Obtient la valeur Z (score standard) pour un niveau de confiance donné.

    Args:
        confidence_level: Niveau de confiance (entre 0.5 et 0.9999)

    Returns:
        La valeur Z correspondante, ou None si le niveau est invalide
    """
    if not (0.5 < confidence_level < 0.9999):
        return None
    # Calcul de la valeur Z pour un intervalle bilatéral
    return NormalDist().inv_cdf(0.5 + confidence_level / 2)

