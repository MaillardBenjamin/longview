"""
Module d'optimisation des plans d'épargne.

Utilise une recherche par dichotomie (bisection) pour trouver le facteur d'échelle
optimal des épargnes mensuelles permettant d'atteindre un capital cible à la fin de vie.
"""

import logging
from typing import Dict, List, NamedTuple

from app.schemas.projections import (
    InvestmentAccount,
    MonteCarloInput,
    MonteCarloPercentilePoint,
    MonteCarloResult,
    OptimizationStep,
    RecommendedSavingsResult,
    RetirementMonteCarloInput,
    RetirementMonteCarloResult,
    RetirementScenarioResults,
    SavingsOptimizationInput,
    SavingsPhase,
)
from app.services.monte_carlo.retirement import simulate_retirement_monte_carlo
from app.services.monte_carlo.simulation import simulate_monte_carlo
from app.services.progress import (
    complete_progress,
    create_progress_task,
    fail_progress,
    update_progress,
)

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.optimization")

# Configuration du logger de débogage fichier
import os
debug_logger = logging.getLogger("debug_optimization")
debug_logger.setLevel(logging.DEBUG)
# Éviter d'ajouter plusieurs handlers si le module est rechargé
if not debug_logger.handlers:
    # Utiliser un chemin absolu ou relatif simple
    # Si on est dans backend/, on écrit juste debug_optimization.log
    log_path = "debug_optimization.log"
    file_handler = logging.FileHandler(log_path, mode='a', encoding='utf-8')
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    debug_logger.addHandler(file_handler)

def log_debug(message: str, *args):
    """Log un message dans le fichier de débogage et dans la console si nécessaire."""
    try:
        debug_logger.info(message, *args)
        # logger.info(message, *args) # Décommenter pour aussi voir dans la console standard
    except Exception:
        pass  # Ne jamais faire planter l'appli pour un log



class EvaluationResult(NamedTuple):
    """
    Résultat de l'évaluation d'un facteur d'échelle.

    Attributes:
        scale: Facteur d'échelle appliqué aux épargnes
        total_savings: Épargne mensuelle totale après mise à l'échelle
        final_capital: Capital final brut (avant pénalités)
        effective_final_capital: Capital final effectif (après pénalités)
        error: Erreur par rapport au capital cible
        depletion_months: Nombre de mois manquants si le capital s'épuise tôt
        accumulation: Résultat de la simulation de capitalisation
        retirement: Résultats des scénarios de retraite
        sufficient: True si le scénario est suffisant (pas d'épuisement précoce)
    """

    scale: float
    total_savings: float
    final_capital: float
    effective_final_capital: float
    error: float
    depletion_months: int
    accumulation: MonteCarloResult
    retirement: RetirementScenarioResults
    sufficient: bool


def optimize_savings_plan(
    payload: SavingsOptimizationInput,
    task_id: str | None = None,
) -> RecommendedSavingsResult:
    """
    Optimise le plan d'épargne pour atteindre un capital cible à la fin de vie.

    Nouvelle approche :
    1. Calcule d'abord avec les versements réels (scale=1.0) pour obtenir les courbes réelles
    2. Calcule le capital qui sera atteint à la retraite avec ces versements
    3. Calcule le capital minimum nécessaire à la retraite pour atteindre l'objectif
    4. Si insuffisant, calcule un versement supplémentaire minimum nécessaire

    Args:
        payload: Paramètres d'optimisation (profils, comptes, objectifs)

    Returns:
        Résultat de l'optimisation avec les courbes réelles et l'épargne minimum supplémentaire
    """
    logger.info(
        "=== DÉBUT OPTIMISATION === Objectif: %.2f € en fin de vie",
        payload.target_final_capital
    )
    log_debug("=== NOUVELLE DEMANDE OPTIMISATION ===")
    log_debug("Cible: %.2f", payload.target_final_capital)
    if payload.adults:
        adult = payload.adults[0]
        log_debug("Adulte 1 - Âge: %s, Retraite: %s, Espérance: %s", 
                  adult.current_age, adult.retirement_age, adult.life_expectancy)
    
    # Mettre à jour la progression si task_id fourni (la tâche est déjà créée dans l'endpoint)
    if task_id:
        update_progress(
            task_id,
            current_step="initialisation",
            step_description="Initialisation de l'optimisation",
            progress_percent=0.0,
            message="Préparation des calculs...",
        )
    
    # Étape 1 : Calcul avec les versements réels (scale=1.0) pour les courbes
    real_phases = payload.savings_phases
    real_accounts = payload.investment_accounts
    
    # Récupération des paramètres depuis market_assumptions ou valeurs par défaut
    market = payload.market_assumptions
    confidence_level = getattr(market, "confidence_level", None) or payload.confidence_level
    tolerance_ratio = getattr(market, "tolerance_ratio", None) or payload.tolerance_ratio
    max_iterations_mc = getattr(market, "max_iterations", None) or max(payload.max_iterations, 100)
    batch_size = getattr(market, "batch_size", None) or payload.batch_size
    
    mc_input_real = MonteCarloInput(
        adults=payload.adults,
        savings_phases=real_phases,
        investment_accounts=real_accounts,
        market_assumptions=payload.market_assumptions,
        confidence_level=confidence_level,
        tolerance_ratio=tolerance_ratio,
        max_iterations=max_iterations_mc,
        batch_size=batch_size,
    )
    
    logger.info("Étape 1/3: Simulation avec versements réels...")
    if task_id:
        update_progress(
            task_id,
            current_step="capitalisation",
            step_description="Simulation de capitalisation avec versements réels",
            step_index=1,  # Étape 1 sur 3 = 33.3%
            message="Calcul de la phase de capitalisation...",
        )
    accumulation_real = simulate_monte_carlo(mc_input_real, task_id=task_id)
    
    # Capital médian à la retraite avec les versements réels
    capital_at_retirement_real = accumulation_real.median_final_capital
    
    # Si mode capitalisation uniquement, on saute la phase retraite
    retirement_real = None
    capital_at_end_real = capital_at_retirement_real
    
    if not payload.capitalization_only:
        if task_id:
            update_progress(
                task_id,
                current_step="retraite",
                step_description="Simulation de retraite avec versements réels",
                progress_percent=50.0,  # ~50% car on a fini la capitalisation (qui va de 33% à 50%)
                message="Calcul des scénarios de retraite (pessimiste, médian, optimiste)...",
            )
        retirement_real = run_retirement_scenarios(
            payload, real_accounts, accumulation_real, task_id=task_id
        )
        # Capital médian en fin de vie avec les versements réels
        capital_at_end_real = retirement_real.median.median_final_capital
    else:
        logger.info("Mode capitalisation uniquement : phase de retraite ignorée")
        if task_id:
            update_progress(
                task_id,
                current_step="capitalisation",
                step_description="Simulation de capitalisation terminée",
                progress_percent=50.0,
                message="Phase de capitalisation terminée (mode capitalisation uniquement)",
            )
    
    logger.info(
        "✓ Étape 1 terminée - Capital à la retraite: %.2f € | Capital en fin de vie: %.2f € (objectif: %.2f €)",
        capital_at_retirement_real,
        capital_at_end_real,
        payload.target_final_capital
    )

    # Étape 2 : Calculer l'épargne minimum nécessaire via l'algorithme d'optimisation complet
    # On exécute l'algorithme complet seulement si l'option est activée
    if payload.calculate_minimum_savings:
        logger.info("Étape 2/3: Recherche de l'épargne minimum nécessaire...")
        if task_id:
            update_progress(
                task_id,
                current_step="optimisation",
                step_description="Recherche de l'épargne minimum nécessaire",
                progress_percent=63.0,  # Début de l'étape 2 = 63% (après la retraite)
                message="Optimisation en cours...",
            )
        
        # Calcul de la tolérance en capital (minimum 100€ ou % du capital cible)
        tolerance_capital = max(100.0, abs(payload.target_final_capital) * payload.tolerance_ratio)
        
        max_iterations = max(payload.max_iterations, 5)
        steps: List[OptimizationStep] = []

        best_candidate: EvaluationResult | None = None
        best_sufficient: EvaluationResult | None = None

        def register_candidate(result: EvaluationResult) -> None:
            """
            Enregistre un candidat comme meilleur selon différents critères.

            - Meilleur candidat global : celui avec le moins de mois manquants
            - Meilleur candidat suffisant : celui avec le moins d'épargne mensuelle
            """
            nonlocal best_candidate, best_sufficient

            # Meilleur candidat global : priorité au moins de mois manquants
            if best_candidate is None or (
                result.depletion_months < best_candidate.depletion_months
                or (
                    result.depletion_months == best_candidate.depletion_months
                    and result.effective_final_capital > best_candidate.effective_final_capital
                )
            ):
                best_candidate = result

            # Meilleur candidat suffisant : celui avec le moins d'épargne mensuelle
            if result.sufficient and (
                best_sufficient is None or result.total_savings < best_sufficient.total_savings
            ):
                best_sufficient = result

        iteration_counter = -1
        # Variables pour suivre la progression de la recherche dichotomique
        search_range_width: float | None = None
        initial_range_width: float | None = None

        def calculate_adaptive_iterations() -> int:
            """
            Calcule le nombre d'itérations Monte Carlo adaptatif selon la précision de la recherche.
            
            Au début de la recherche (grande plage), on utilise moins d'itérations pour aller vite.
            À mesure qu'on se rapproche de la solution (petite plage), on augmente progressivement.
            
            Returns:
                Nombre d'itérations Monte Carlo à utiliser
            """
            nonlocal search_range_width, initial_range_width
            
            if search_range_width is None or initial_range_width is None:
                # Première itération : utiliser 100 itérations pour un bon équilibre vitesse/précision
                return 100
            
            # Calculer le ratio de réduction de la plage de recherche
            reduction_ratio = search_range_width / initial_range_width
            
            # Au début (réduction > 50%), utiliser 100 itérations pour un bon équilibre
            # Entre 50% et 25%, utiliser 100-200 itérations
            # Entre 25% et 10%, utiliser 200-500 itérations
            # Entre 10% et 1%, utiliser 500-1000 itérations
            # En dessous de 1%, utiliser le maximum
            if reduction_ratio > 0.5:
                return 100
            elif reduction_ratio > 0.25:
                # Interpolation linéaire entre 100 et 200
                progress = (0.5 - reduction_ratio) / 0.25  # 0 à 1 quand reduction_ratio passe de 0.5 à 0.25
                return int(100 + progress * 100)
            elif reduction_ratio > 0.1:
                # Interpolation linéaire entre 200 et 500
                progress = (0.25 - reduction_ratio) / 0.15  # 0 à 1 quand reduction_ratio passe de 0.25 à 0.1
                return int(200 + progress * 300)
            elif reduction_ratio > 0.01:
                # Interpolation linéaire entre 500 et 1000
                progress = (0.1 - reduction_ratio) / 0.09  # 0 à 1 quand reduction_ratio passe de 0.1 à 0.01
                return int(500 + progress * 500)
            else:
                # Utiliser le maximum pour la précision finale
                return max_iterations_mc

        def evaluate(scale: float, mc_iterations_override: int | None = None) -> EvaluationResult:
            """
            Évalue un facteur d'échelle en exécutant les simulations complètes.

            Args:
                scale: Facteur d'échelle à appliquer aux épargnes
                mc_iterations_override: Nombre d'itérations Monte Carlo à utiliser (None pour calcul adaptatif)

            Returns:
                Résultat de l'évaluation
            """
            nonlocal iteration_counter
            iteration_counter += 1

            logger.info("  [OPTIMISATION] Évaluation itération %d avec scale=%.4f", iteration_counter, scale)

            # Calculer le nombre d'itérations à utiliser
            if mc_iterations_override is not None:
                iterations_to_use = mc_iterations_override
            else:
                iterations_to_use = calculate_adaptive_iterations()
            
            logger.info("  [OPTIMISATION] Utilisation de %d itérations Monte Carlo pour cette évaluation", iterations_to_use)

            # Ajuster le batch_size pour être cohérent avec le nombre d'itérations
            # Si on utilise peu d'itérations, on réduit aussi le batch_size
            adaptive_batch_size = min(batch_size, max(100, iterations_to_use))

            # Mise à l'échelle des phases d'épargne et des comptes
            scaled_phases = scale_savings_phases(payload.savings_phases, scale)
            scaled_accounts = scale_investment_accounts(payload.investment_accounts, scale)

            # Simulation de capitalisation
            mc_input = MonteCarloInput(
                adults=payload.adults,
                savings_phases=scaled_phases,
                investment_accounts=scaled_accounts,
                market_assumptions=payload.market_assumptions,
                confidence_level=confidence_level,
                tolerance_ratio=tolerance_ratio,
                max_iterations=iterations_to_use,
                batch_size=adaptive_batch_size,
            )

            logger.info("  [OPTIMISATION] Début simulation capitalisation (scale=%.4f, %d itérations MC)", scale, iterations_to_use)
            
            # Mettre à jour la progression avant la capitalisation
            # Note: Le pourcentage global sera mis à jour dans la boucle principale de recherche dichotomique
            # Ici, on met juste à jour le message pour indiquer qu'on est en train de calculer
            if task_id:
                # On récupère la progression actuelle pour ne pas la faire reculer
                from app.services.progress import get_progress
                current_progress = get_progress(task_id)
                if current_progress:
                    current_percent = current_progress.progress_percent
                    update_progress(
                        task_id,
                        current_step="optimisation",
                        step_description=f"Évaluation scale={scale:.4f} - Capitalisation",
                        progress_percent=current_percent,  # Conserver le pourcentage actuel
                        message=f"Simulation de capitalisation en cours...",
                    )
            
            accumulation_result = simulate_monte_carlo(mc_input, task_id=None)  # Pas de progression détaillée pendant l'optimisation
            
            # Si mode capitalisation uniquement, on saute la phase retraite
            retirement_results = None
            if payload.capitalization_only:
                logger.info("  [OPTIMISATION] Mode capitalisation uniquement : phase de retraite ignorée")
                final_capital = accumulation_result.median_final_capital
            else:
                logger.info("  [OPTIMISATION] Capitalisation terminée, début scénarios retraite")
                
                # Mettre à jour la progression avant les scénarios de retraite
                if task_id:
                    from app.services.progress import get_progress
                    current_progress = get_progress(task_id)
                    if current_progress:
                        current_percent = current_progress.progress_percent
                        update_progress(
                            task_id,
                            current_step="optimisation",
                            step_description=f"Évaluation scale={scale:.4f} - Scénarios retraite",
                            progress_percent=current_percent,  # Conserver le pourcentage actuel
                            message=f"Calcul des scénarios de retraite...",
                        )
                
                retirement_results = run_retirement_scenarios(
                    payload, scaled_accounts, accumulation_result, task_id=None  # Pas de progression pendant l'optimisation
                )
                logger.info("  [OPTIMISATION] Scénarios retraite terminés")
                final_capital = retirement_results.median.median_final_capital
            # Total des versements mensuels : uniquement les comptes d'investissement
            # Les phases d'épargne sont indicatives et ne sont pas incluses dans l'épargne minimum
            total_savings = sum(
                account.monthly_contribution or 0.0 for account in scaled_accounts
            )

            # Détection de l'épuisement précoce du capital médian (uniquement si phase retraite)
            early_penalty = 0.0
            months_remaining_penalty = 0
            if retirement_results:
                median_series = retirement_results.median.monthly_percentiles or []
                if median_series:
                    final_index = len(median_series) - 1
                    for idx, point in enumerate(median_series[:-1]):
                        if point.percentile_50 <= 0:
                            # Le capital médian s'épuise avant la fin
                            months_remaining_penalty = final_index - idx
                            penalty_base = (
                                payload.target_monthly_income
                                or payload.state_pension_monthly_income
                                or 1000.0
                            )
                            # Pénalité proportionnelle aux mois manquants
                            early_penalty = max(1.0, penalty_base) * max(1, months_remaining_penalty)
                            break

            # Capital effectif = capital brut - pénalité pour épuisement précoce
            effective_final_capital = final_capital - early_penalty
            error = effective_final_capital - payload.target_final_capital
            # Un scénario est suffisant si :
            # 1. Pas d'épuisement précoce du capital (ou mode capitalisation uniquement)
            # 2. Le capital atteint au moins l'objectif (error >= -tolerance_capital)
            # Note : On accepte un dépassement de l'objectif, car l'algorithme ne peut que augmenter
            # l'épargne (facteur >= 0). Si le capital initial dépasse déjà l'objectif, c'est acceptable.
            sufficient = (payload.capitalization_only or months_remaining_penalty == 0) and error >= -tolerance_capital

            # Enregistrement de l'étape d'optimisation
            steps.append(
                OptimizationStep(
                    iteration=iteration_counter,
                    scale=scale,
                    monthly_savings=total_savings,
                    final_capital=final_capital,
                    effective_final_capital=effective_final_capital,
                    depletion_months=months_remaining_penalty,
                )
            )

            # Créer un résultat de retraite factice si mode capitalisation uniquement
            if retirement_results is None:
                # Créer un résultat factice avec les mêmes valeurs que la capitalisation
                dummy_retirement = RetirementMonteCarloResult(
                    iterations=accumulation_result.iterations,
                    confidence_level=accumulation_result.confidence_level,
                    tolerance_ratio=accumulation_result.tolerance_ratio,
                    confidence_reached=accumulation_result.confidence_reached,
                    error_margin=accumulation_result.error_margin,
                    error_margin_ratio=accumulation_result.error_margin_ratio,
                    mean_final_capital=accumulation_result.mean_final_capital,
                    median_final_capital=accumulation_result.median_final_capital,
                    percentile_10=accumulation_result.percentile_10,
                    percentile_50=accumulation_result.percentile_50,
                    percentile_90=accumulation_result.percentile_90,
                    percentile_min=accumulation_result.percentile_min,
                    percentile_max=accumulation_result.percentile_max,
                    standard_deviation=accumulation_result.standard_deviation,
                    monthly_percentiles=[],
                )
                retirement_results = RetirementScenarioResults(
                    pessimistic=dummy_retirement,
                    median=dummy_retirement,
                    optimistic=dummy_retirement,
                )
            
            result = EvaluationResult(
                scale=scale,
                total_savings=total_savings,
                final_capital=final_capital,
                effective_final_capital=effective_final_capital,
                error=error,
                depletion_months=months_remaining_penalty,
                accumulation=accumulation_result,
                retirement=retirement_results,
                sufficient=sufficient,
            )
            register_candidate(result)
            return result

        # Étape 3 : Calculer l'épargne minimum totale nécessaire
        # On cherche le facteur d'échelle optimal pour atteindre l'objectif
        # Les courbes affichées seront toujours celles avec les versements réels (scale=1.0)
        # mais l'épargne minimum sera le montant total nécessaire
        
        # Calculer l'épargne mensuelle réelle totale (uniquement les comptes d'investissement)
        # Les phases d'épargne sont indicatives et ne sont pas incluses dans l'épargne minimum
        total_real_savings = sum(
            account.monthly_contribution or 0.0 for account in real_accounts
        )
        
        # Évaluation initiale avec facteur 0 (épargnes existantes uniquement)
        if task_id:
            update_progress(
                task_id,
                current_step="optimisation",
                step_description="Évaluation initiale",
                progress_percent=63.0,  # Début de l'étape 2 = 63% (après la retraite)
                message="Test avec les épargnes existantes (scale=0.0)...",
            )
        low = evaluate(0.0)
        if low.sufficient:
            final_choice = low
            if task_id:
                update_progress(
                    task_id,
                    current_step="optimisation",
                    step_description="Optimisation terminée",
                    progress_percent=95.0,
                    message="Épargnes existantes suffisantes",
                )
        else:
            # Recherche d'une borne supérieure suffisante
            if task_id:
                update_progress(
                    task_id,
                    current_step="optimisation",
                    step_description="Recherche d'une borne supérieure",
                    progress_percent=65.0,
                    message="Test avec scale=1.0...",
                )
            high_scale = 1.0
            high = evaluate(high_scale)
            attempts = 0
            # Doublement du facteur jusqu'à trouver une solution suffisante
            while not high.sufficient and attempts < 12 and high_scale < 512:
                low = high
                high_scale *= 2
                if task_id:
                    # Progression limitée pendant la recherche de borne (65% à 70%)
                    search_progress = 65.0 + min(5.0, (attempts + 1) * 0.5)
                    update_progress(
                        task_id,
                        current_step="optimisation",
                        step_description=f"Recherche d'une borne supérieure (tentative {attempts + 2})",
                        progress_percent=search_progress,
                        message=f"Test avec scale={high_scale:.4f}...",
                    )
                high = evaluate(high_scale)
                attempts += 1

            if not high.sufficient:
                logger.warning(
                    "Impossible d'atteindre l'objectif même avec un facteur de %.2f. "
                    "Retour du meilleur scénario disponible.",
                    high_scale,
                )
                final_choice = best_candidate or high
                if task_id:
                    update_progress(
                        task_id,
                        current_step="optimisation",
                        step_description="Optimisation terminée",
                        progress_percent=95.0,
                        message=f"Impossible d'atteindre l'objectif (meilleur scale={high_scale:.2f})",
                    )
            else:
                # Recherche par dichotomie entre low et high
                low_result = low
                high_result = high
                
                # Initialiser la largeur de l'intervalle pour le calcul adaptatif
                # (les variables sont déjà dans la portée externe)
                initial_range_width = high_result.scale - low_result.scale
                search_range_width = initial_range_width
                
                if task_id:
                    update_progress(
                        task_id,
                        current_step="optimisation",
                        step_description="Début recherche dichotomique",
                        progress_percent=70.0,
                        message=f"Intervalle initial: scale=[{low.scale:.6f}, {high.scale:.6f}] (largeur: {initial_range_width:.6f}) | Convergence: 0.0%",
                    )
                
                iterations_remaining = max(0, max_iterations - len(steps))

                # Estimer le nombre total d'évaluations (déjà faites + restantes)
                total_evaluations_estimate = len(steps) + iterations_remaining
                
                # Largeur initiale de l'intervalle pour le calcul de convergence
                initial_interval_width = high_result.scale - low_result.scale
                
                for opt_iter in range(iterations_remaining):
                    # Mettre à jour la largeur de l'intervalle pour le calcul adaptatif
                    search_range_width = high_result.scale - low_result.scale
                    
                    # Arrêt si la précision est suffisante
                    if search_range_width < 1e-4:
                        logger.info("  [OPTIMISATION] Précision suffisante atteinte, arrêt de la recherche")
                        if task_id:
                            # Calculer le pourcentage de convergence (réduction de l'intervalle)
                            convergence_percent = ((initial_interval_width - search_range_width) / initial_interval_width) * 100 if initial_interval_width > 0 else 100.0
                            update_progress(
                                task_id,
                                current_step="optimisation",
                                step_description="Convergence atteinte",
                                progress_percent=95.0,
                                message=f"✓ Convergence: intervalle [{low_result.scale:.6f}, {high_result.scale:.6f}] (largeur: {search_range_width:.6f}, précision: {convergence_percent:.1f}%)",
                            )
                        break
                    
                    # Calculer le pourcentage de convergence (réduction de l'intervalle)
                    convergence_percent = ((initial_interval_width - search_range_width) / initial_interval_width) * 100 if initial_interval_width > 0 else 0.0
                    
                    logger.info("  [OPTIMISATION] Itération recherche %d/%d: intervalle [%.4f, %.4f] (largeur: %.6f, convergence: %.1f%%)", 
                               opt_iter + 1, iterations_remaining, low_result.scale, high_result.scale, search_range_width, convergence_percent)

                    # Test du point médian
                    mid_scale = (low_result.scale + high_result.scale) / 2
                    logger.info("  [OPTIMISATION] Test du point médian: scale=%.4f", mid_scale)
                    
                    # Mettre à jour la progression avant l'évaluation
                    if task_id:
                        # On progresse dans la recherche dichotomique
                        # On a déjà fait len(steps) évaluations, on va en faire opt_iter + 1 de plus
                        # On estime qu'il y aura au maximum total_evaluations_estimate évaluations au total
                        # La progression va de 70% (début dichotomie) à 95% (fin optimisation)
                        evaluations_done = len(steps) + opt_iter
                        opt_progress = 70.0 + (evaluations_done / max(total_evaluations_estimate, 1)) * 25.0  # 95% - 70% = 25%
                        opt_progress = max(70.0, min(95.0, opt_progress))
                        # Calculer le pourcentage de convergence
                        convergence_percent = ((initial_interval_width - search_range_width) / initial_interval_width) * 100 if initial_interval_width > 0 else 0.0
                        update_progress(
                            task_id,
                            current_step="optimisation",
                            step_description=f"Recherche dichotomique (itération {opt_iter + 1}/{iterations_remaining})",
                            progress_percent=opt_progress,
                            message=f"Convergence: {convergence_percent:.1f}% | Test scale={mid_scale:.6f} | Intervalle: [{low_result.scale:.6f}, {high_result.scale:.6f}] (largeur: {search_range_width:.6f})",
                        )
                    
                    mid = evaluate(mid_scale)

                    if mid.sufficient:
                        # Le point médian est suffisant, on peut réduire la borne supérieure
                        old_high = high_result.scale
                        high_result = mid
                        new_range_width = high_result.scale - low_result.scale
                        convergence_improvement = ((search_range_width - new_range_width) / search_range_width) * 100 if search_range_width > 0 else 0.0
                        
                        if task_id:
                            # Mettre à jour avec le résultat et la convergence
                            from app.services.progress import get_progress
                            current_progress = get_progress(task_id)
                            if current_progress:
                                current_percent = current_progress.progress_percent
                                new_convergence = ((initial_interval_width - new_range_width) / initial_interval_width) * 100 if initial_interval_width > 0 else 0.0
                                update_progress(
                                    task_id,
                                    current_step="optimisation",
                                    step_description=f"Recherche dichotomique (itération {opt_iter + 1}/{iterations_remaining})",
                                    progress_percent=current_percent,
                                    message=f"✓ Scale={mid_scale:.6f} suffisant | Convergence: {new_convergence:.1f}% (+{convergence_improvement:.1f}%) | Nouvel intervalle: [{low_result.scale:.6f}, {high_result.scale:.6f}]",
                                )
                        if abs(mid.error) <= tolerance_capital:
                            if task_id:
                                final_convergence = ((initial_interval_width - new_range_width) / initial_interval_width) * 100 if initial_interval_width > 0 else 100.0
                                update_progress(
                                    task_id,
                                    current_step="optimisation",
                                    step_description="Solution optimale trouvée",
                                    progress_percent=95.0,
                                    message=f"✓ Solution optimale: scale={mid_scale:.6f} | Convergence: {final_convergence:.1f}% | Erreur résiduelle: {abs(mid.error):.2f} €",
                                )
                            break
                    else:
                        # Le point médian n'est pas suffisant, on augmente la borne inférieure
                        old_low = low_result.scale
                        low_result = mid
                        new_range_width = high_result.scale - low_result.scale
                        convergence_improvement = ((search_range_width - new_range_width) / search_range_width) * 100 if search_range_width > 0 else 0.0
                        
                        if task_id:
                            # Mettre à jour avec le résultat et la convergence
                            from app.services.progress import get_progress
                            current_progress = get_progress(task_id)
                            if current_progress:
                                current_percent = current_progress.progress_percent
                                new_convergence = ((initial_interval_width - new_range_width) / initial_interval_width) * 100 if initial_interval_width > 0 else 0.0
                                update_progress(
                                    task_id,
                                    current_step="optimisation",
                                    step_description=f"Recherche dichotomique (itération {opt_iter + 1}/{iterations_remaining})",
                                    progress_percent=current_percent,
                                    message=f"✗ Scale={mid_scale:.6f} insuffisant | Convergence: {new_convergence:.1f}% (+{convergence_improvement:.1f}%) | Nouvel intervalle: [{low_result.scale:.6f}, {high_result.scale:.6f}]",
                                )

                # Sélectionner le meilleur candidat
                final_choice = best_sufficient or high_result
                
                # Réévaluer avec le maximum d'itérations pour la solution finale
                # Cela garantit la précision maximale pour le résultat final
                final_scale = final_choice.scale
                final_choice = evaluate(final_scale, mc_iterations_override=max_iterations_mc)

        # Recherche du capital minimum à la retraite par dichotomie
        # On cherche le capital initial qui fait que la simulation de retraite finit à ~0€
        minimum_capital_at_retirement = find_minimum_retirement_capital(
            payload=payload,
            real_accounts=real_accounts,
            capital_at_retirement_real=capital_at_retirement_real,
            capital_at_end_real=capital_at_end_real,
        )

        logger.info(
            "✓ Étape 2 terminée - Facteur optimal: %.4f | Épargne minimum: %.2f €/mois | Capital final: %.2f €",
            final_choice.scale,
            final_choice.total_savings,
            final_choice.effective_final_capital
        )
    else:
        # Si le calcul de l'épargne minimum est désactivé, on utilise les résultats de l'étape 1
        # Créer un résultat factice avec scale=1.0 (versements réels)
        from app.schemas.projections import RetirementMonteCarloResult
        
        # Créer un résultat de retraite factice si mode capitalisation uniquement
        if retirement_real is None:
            dummy_retirement = RetirementMonteCarloResult(
                iterations=accumulation_real.iterations,
                confidence_level=accumulation_real.confidence_level,
                tolerance_ratio=accumulation_real.tolerance_ratio,
                confidence_reached=accumulation_real.confidence_reached,
                error_margin=accumulation_real.error_margin,
                error_margin_ratio=accumulation_real.error_margin_ratio,
                mean_final_capital=accumulation_real.mean_final_capital,
                median_final_capital=accumulation_real.median_final_capital,
                percentile_10=accumulation_real.percentile_10,
                percentile_50=accumulation_real.percentile_50,
                percentile_90=accumulation_real.percentile_90,
                percentile_min=accumulation_real.percentile_min,
                percentile_max=accumulation_real.percentile_max,
                standard_deviation=accumulation_real.standard_deviation,
                monthly_percentiles=[],
            )
            retirement_real = RetirementScenarioResults(
                pessimistic=dummy_retirement,
                median=dummy_retirement,
                optimistic=dummy_retirement,
            )
        
        final_choice = EvaluationResult(
            scale=1.0,  # Pas de mise à l'échelle, on utilise les versements réels
            total_savings=sum(account.monthly_contribution or 0.0 for account in real_accounts),
            final_capital=capital_at_end_real,
            effective_final_capital=capital_at_end_real,
            error=capital_at_end_real - payload.target_final_capital,
            depletion_months=0,  # Pas d'épuisement précoce détecté dans l'étape 1
            accumulation=accumulation_real,
            retirement=retirement_real,
            sufficient=True,  # On considère que c'est suffisant si on ne calcule pas le minimum
        )
        # Recherche du capital minimum à la retraite par dichotomie
        minimum_capital_at_retirement = find_minimum_retirement_capital(
            payload=payload,
            real_accounts=real_accounts,
            capital_at_retirement_real=capital_at_retirement_real,
            capital_at_end_real=capital_at_end_real,
        )
        steps = []  # Pas d'étapes d'optimisation
        
        logger.info(
            "✓ Étape 2 ignorée - Utilisation des versements réels uniquement | Épargne: %.2f €/mois | Capital final: %.2f € | Capital min retraite: %.2f €",
            final_choice.total_savings,
            final_choice.effective_final_capital,
            minimum_capital_at_retirement
        )

    # Toujours retourner les courbes avec les versements réels (scale=1.0)
    # Le facteur optimal trouvé (final_choice.scale) sert à calculer l'épargne minimum recommandée,
    # mais les courbes affichées sont toujours celles avec les versements actuels de l'utilisateur
    logger.info("Étape 3/3: Préparation des résultats...")
    if task_id:
        update_progress(
            task_id,
            current_step="finalisation",
            step_description="Préparation des résultats",
            progress_percent=90.0,
            message="Génération des courbes pour le capital minimum...",
        )
    
    if not accumulation_real:
        logger.error("ERREUR : accumulation_real est None !")
    if not retirement_real:
        logger.error("ERREUR : retirement_real est None !")
    
    # Générer une vraie simulation pour la courbe "Capital minimum à la retraite"
    # Cette simulation part du capital minimum trouvé par dichotomie
    minimum_capital_accumulation = None
    minimum_capital_retirement = None
    
    if not payload.capitalization_only and minimum_capital_at_retirement > 0:
        logger.info("Génération des courbes finales pour le capital minimum: %.2f €", minimum_capital_at_retirement)
        
        # Pour la phase de capitalisation, on ajuste la courbe réelle proportionnellement
        # pour qu'elle atteigne le capital minimum à la retraite
        if accumulation_real and accumulation_real.median_final_capital > 0:
            ratio = minimum_capital_at_retirement / accumulation_real.median_final_capital
            
            # Créer des percentiles mensuels ajustés
            adjusted_monthly_percentiles = []
            for point in accumulation_real.monthly_percentiles:
                adjusted_point = MonteCarloPercentilePoint(
                    month_index=point.month_index,
                    age=point.age,
                    percentile_min=point.percentile_min * ratio,
                    percentile_10=point.percentile_10 * ratio,
                    percentile_50=point.percentile_50 * ratio,
                    percentile_90=point.percentile_90 * ratio,
                    percentile_max=point.percentile_max * ratio,
                    cumulative_contribution=point.cumulative_contribution * ratio,
                )
                adjusted_monthly_percentiles.append(adjusted_point)
            
            minimum_capital_accumulation = MonteCarloResult(
                iterations=accumulation_real.iterations,
                confidence_level=accumulation_real.confidence_level,
                tolerance_ratio=accumulation_real.tolerance_ratio,
                confidence_reached=accumulation_real.confidence_reached,
                error_margin=accumulation_real.error_margin * ratio if accumulation_real.error_margin else None,
                error_margin_ratio=accumulation_real.error_margin_ratio,
                mean_final_capital=accumulation_real.mean_final_capital * ratio,
                median_final_capital=minimum_capital_at_retirement,
                percentile_10=accumulation_real.percentile_10 * ratio,
                percentile_50=minimum_capital_at_retirement,
                percentile_90=accumulation_real.percentile_90 * ratio,
                percentile_min=accumulation_real.percentile_min * ratio,
                percentile_max=accumulation_real.percentile_max * ratio,
                standard_deviation=accumulation_real.standard_deviation * ratio,
                monthly_percentiles=adjusted_monthly_percentiles,
            )
            
            logger.info("Courbe de capitalisation ajustée (ratio: %.4f)", ratio)
        
        # Pour la phase de retraite, générer une vraie simulation avec le capital minimum
        # Cette simulation devrait naturellement finir proche de 0€
        minimum_accounts = build_retirement_accounts(real_accounts, minimum_capital_at_retirement)
        
        minimum_retirement_result = run_single_retirement_scenario(
            payload=payload,
            retirement_accounts=minimum_accounts,
            initial_capital=minimum_capital_at_retirement,
            scenario_name="minimum_final",
            task_id=None,
            iterations_override=200,  # Plus d'itérations pour la courbe finale
        )
        
        logger.info(
            "Simulation retraite avec capital minimum: %.2f € → %.2f €",
            minimum_capital_at_retirement,
            minimum_retirement_result.median_final_capital
        )
        
        # Créer un RetirementScenarioResults avec les 3 scénarios identiques
        minimum_capital_retirement = RetirementScenarioResults(
            pessimistic=minimum_retirement_result,
            median=minimum_retirement_result,
            optimistic=minimum_retirement_result,
        )
    
    logger.info(
        "=== FIN OPTIMISATION === Épargne recommandée: %.2f €/mois | Capital final projeté: %.2f €",
        final_choice.total_savings,
        final_choice.effective_final_capital
    )
    
    # Marquer la progression comme terminée
    if task_id:
        complete_progress(task_id, message="Optimisation terminée avec succès")
    
    # Retourner le résultat de l'optimisation
    result_to_return = RecommendedSavingsResult(
        scale=final_choice.scale,  # Facteur optimal trouvé par l'algorithme
        recommended_monthly_savings=max(0.0, final_choice.total_savings),  # Épargne minimum nécessaire
        minimum_capital_at_retirement=minimum_capital_at_retirement,
        monte_carlo_result=accumulation_real,  # Toujours les courbes avec versements réels
        retirement_results=retirement_real if not payload.capitalization_only else None,  # None si capitalisation uniquement
        optimal_monte_carlo_result=minimum_capital_accumulation or final_choice.accumulation,  # Courbes pour capital minimum
        optimal_retirement_results=minimum_capital_retirement if minimum_capital_retirement else (final_choice.retirement if not payload.capitalization_only else None),  # Courbes pour capital minimum
        steps=steps,
        residual_error=final_choice.error,
        residual_error_ratio=(
            final_choice.error / max(abs(payload.target_final_capital), 1.0)
            if payload.target_final_capital != 0
            else final_choice.error
            / max(abs(final_choice.effective_final_capital), 1.0)
        ),
    )
    
    log_debug("=== FIN OPTIMISATION ===")
    log_debug("Scale: %.4f", result_to_return.scale)
    log_debug("Rec. Savings: %.2f", result_to_return.recommended_monthly_savings)
    log_debug("Min Capital Ret: %.2f", result_to_return.minimum_capital_at_retirement)
    log_debug("Has Optimal Ret: %s", result_to_return.optimal_retirement_results is not None)
    if result_to_return.optimal_retirement_results:
        final_med = result_to_return.optimal_retirement_results.median.median_final_capital
        log_debug("Optimal Ret Median Final: %.2f", final_med)

    return result_to_return


def scale_savings_phases(phases: List[SavingsPhase], scale: float) -> List[SavingsPhase]:
    """
    Met à l'échelle les contributions mensuelles des phases d'épargne.

    Args:
        phases: Liste des phases d'épargne
        scale: Facteur d'échelle à appliquer

    Returns:
        Liste des phases avec contributions mises à l'échelle
    """
    return [
        phase.model_copy(
            update={
                "monthly_contribution": max(0.0, phase.monthly_contribution * scale),
            }
        )
        for phase in phases
    ]


def scale_investment_accounts(
    accounts: List[InvestmentAccount], scale: float
) -> List[InvestmentAccount]:
    """
    Met à l'échelle les contributions mensuelles des comptes d'investissement.

    Args:
        accounts: Liste des comptes d'investissement
        scale: Facteur d'échelle à appliquer

    Returns:
        Liste des comptes avec contributions mises à l'échelle
    """
    return [
        account.model_copy(
            update={
                "monthly_contribution": max(
                    0.0, (account.monthly_contribution or 0.0) * scale
                ),
            }
        )
        for account in accounts
    ]


def run_retirement_scenarios(
    payload: SavingsOptimizationInput,
    scaled_accounts: List[InvestmentAccount],
    accumulation_result: MonteCarloResult,
    task_id: str | None = None,
) -> RetirementScenarioResults:
    """
    Exécute les simulations de retraite pour les trois scénarios (pessimiste, médian, optimiste).

    Construit des comptes de retraite à partir des percentiles de capitalisation
    et exécute une simulation de retraite pour chaque scénario.

    Args:
        payload: Paramètres d'optimisation
        scaled_accounts: Comptes avec contributions mises à l'échelle
        accumulation_result: Résultat de la simulation de capitalisation

    Returns:
        Résultats des trois scénarios de retraite
    """
    logger.info("Exécution des 3 scénarios de retraite (pessimiste, médian, optimiste)...")
    
    # Log des hypothèses une seule fois au début des 3 scénarios
    logger.info("=== HYPOTHÈSES DE SIMULATION RETRAITE ===")
    market = payload.market_assumptions
    if market:
        logger.info("  Inflation: %.2f%%/an | Classes d'actifs: %d | Revenu cible: %.2f €/mois | Pension État: %.2f €/mois",
                   market.inflation_mean or 0.0, len(market.asset_classes),
                   payload.target_monthly_income or 0.0, payload.state_pension_monthly_income or 0.0)
    
    # Calcul des soldes agrégés (sans logger chaque compte individuellement)
    balances_by_type: dict[str, float] = {}
    count_by_type: dict[str, int] = {}
    for account in scaled_accounts:
        account_type = (
            account.type.value
            if hasattr(account.type, "value")
            else str(account.type)
        )
        if account_type not in balances_by_type:
            balances_by_type[account_type] = 0.0
            count_by_type[account_type] = 0
        balances_by_type[account_type] += account.current_amount
        count_by_type[account_type] += 1
    
    total_capital_retirement = sum(balances_by_type.values())
    logger.info("  Capital initial total: %.2f €", total_capital_retirement)
    
    # Construction des comptes de retraite pour chaque scénario
    pessimistic_accounts = build_retirement_accounts(
        scaled_accounts, accumulation_result.percentile_10
    )
    median_accounts = build_retirement_accounts(
        scaled_accounts, accumulation_result.percentile_50
    )
    optimistic_accounts = build_retirement_accounts(
        scaled_accounts, accumulation_result.percentile_90
    )

    # Récupération des paramètres depuis market_assumptions ou valeurs par défaut
    market = payload.market_assumptions
    confidence_level_ret = getattr(market, "confidence_level", None) or payload.confidence_level
    tolerance_ratio_ret = getattr(market, "tolerance_ratio", None) or payload.tolerance_ratio
    max_iterations_ret = getattr(market, "max_iterations", None) or max(payload.max_iterations, 100)
    batch_size_ret = getattr(market, "batch_size", None) or payload.batch_size
    
    # Paramètres communs pour toutes les simulations de retraite
    base_kwargs = dict(
        adults=payload.adults,
        market_assumptions=payload.market_assumptions,
        spending_profile=payload.spending_profile,
        target_monthly_income=payload.target_monthly_income,
        state_pension_monthly_income=payload.state_pension_monthly_income,
        additional_income_streams=payload.additional_income_streams,
        household_charges=getattr(payload, "household_charges", None),
        child_charges=getattr(payload, "child_charges", None),
        confidence_level=confidence_level_ret,
        tolerance_ratio=tolerance_ratio_ret,
        max_iterations=max_iterations_ret,
        batch_size=batch_size_ret,
    )

    # Exécution des simulations pour chaque scénario
    # On passe task_id à tous les scénarios pour afficher la progression
    if task_id:
        update_progress(
            task_id,
            current_step="retraite",
            step_description="Scénario pessimiste",
            message="Calcul du scénario pessimiste...",
        )
    # Exécution des 3 scénarios avec verbose=False pour éviter les répétitions
    pessimistic_result = simulate_retirement_monte_carlo(
        RetirementMonteCarloInput(investment_accounts=pessimistic_accounts, **base_kwargs),
        task_id=task_id,
        verbose=False,  # Pas de logs détaillés pour chaque scénario
    )
    if task_id:
        update_progress(
            task_id,
            current_step="retraite",
            step_description="Scénario médian",
            message="Calcul du scénario médian...",
        )
    median_result = simulate_retirement_monte_carlo(
        RetirementMonteCarloInput(investment_accounts=median_accounts, **base_kwargs),
        task_id=task_id,
        verbose=False,  # Pas de logs détaillés pour chaque scénario
    )
    if task_id:
        update_progress(
            task_id,
            current_step="retraite",
            step_description="Scénario optimiste",
            message="Calcul du scénario optimiste...",
        )
    optimistic_result = simulate_retirement_monte_carlo(
        RetirementMonteCarloInput(investment_accounts=optimistic_accounts, **base_kwargs),
        task_id=task_id,
        verbose=False,  # Pas de logs détaillés pour chaque scénario
    )

    logger.info(
        "Scénarios de retraite terminés - Pessimiste: %.2f € | Médian: %.2f € | Optimiste: %.2f €",
        pessimistic_result.median_final_capital,
        median_result.median_final_capital,
        optimistic_result.median_final_capital
    )
    
    # Résumé synthétique global des 3 scénarios
    logger.info("=== RÉSUMÉ GLOBAL DES 3 SCÉNARIOS DE RETRAITE ===")
    
    # Calculer les totaux pour chaque scénario avec capital initial réel du scénario
    def get_scenario_summary(result: RetirementMonteCarloResult, scenario_name: str, scenario_accounts: List[InvestmentAccount]):
        initial_capital = sum(account.current_amount for account in scenario_accounts)
        total_taxes = result.cumulative_total_taxes or 0.0
        total_gross_withdrawals = sum(
            tax_breakdown.gross_withdrawal
            for tax_breakdown in (result.total_taxes_by_account_type or {}).values()
        )
        total_net_withdrawals = sum(
            tax_breakdown.net_withdrawal
            for tax_breakdown in (result.total_taxes_by_account_type or {}).values()
        )
        final_capital = result.median_final_capital
        gains = final_capital + total_gross_withdrawals - initial_capital
        
        logger.info("  %s: Initial=%.2f € | Retraits bruts=%.2f € | Retraits nets=%.2f € | Taxes=%.2f € | Gains=%.2f € | Final=%.2f € | Consommation=%.1f%%",
                   scenario_name, initial_capital, total_gross_withdrawals, total_net_withdrawals, 
                   total_taxes, gains, final_capital,
                   (total_gross_withdrawals / initial_capital * 100) if initial_capital > 0 else 0.0)
    
    get_scenario_summary(pessimistic_result, "Pessimiste (P10)", pessimistic_accounts)
    get_scenario_summary(median_result, "Médian (P50)", median_accounts)
    get_scenario_summary(optimistic_result, "Optimiste (P90)", optimistic_accounts)
    
    # Détail par placement pour le scénario médian
    logger.info("=== DÉTAIL PAR PLACEMENT - SCÉNARIO MÉDIAN ===")
    
    # Calculer les soldes initiaux et finaux par type de placement
    median_final_capital = median_result.median_final_capital
    median_initial_capital = sum(account.current_amount for account in median_accounts)
    
    # Agréger les soldes initiaux par type de placement
    placement_initial: Dict[str, float] = {}
    for account in median_accounts:
        account_type = account.type.value if hasattr(account.type, "value") else str(account.type)
        if account_type not in placement_initial:
            placement_initial[account_type] = 0.0
        placement_initial[account_type] += account.current_amount
    
    # Calculer les soldes finaux par type de placement
    # Approche : solde_final = solde_initial + gains_pendant_retraite - retraits_bruts
    # Mais comme on n'a pas les gains par type, on utilise une répartition proportionnelle du capital final
    # en tenant compte des retraits effectués
    placement_final: Dict[str, float] = {}
    total_initial = sum(placement_initial.values())
    
    for account_type in placement_initial.keys():
        initial = placement_initial[account_type]
        tax_breakdown = median_result.total_taxes_by_account_type.get(account_type)
        
        if tax_breakdown:
            # Calculer les gains pendant la retraite pour ce type
            # gains = retraits_bruts - solde_initial (si retraits > initial) ou gains estimés
            # Approche simplifiée : solde_final ≈ solde_initial - retraits_bruts + gains_estimés
            # On utilise la répartition proportionnelle du capital final restant
            gross_withdrawal = tax_breakdown.gross_withdrawal
            
            # Estimation : le solde final est proportionnel au capital final médian
            # mais ajusté pour tenir compte des retraits effectués
            if total_initial > 0:
                weight = initial / total_initial
                # Le capital final est réparti proportionnellement, mais on doit tenir compte
                # que certains comptes ont été plus retirés que d'autres
                # Approche : solde_final = capital_final * (solde_initial / capital_initial_total)
                final_estimated = median_final_capital * weight
            else:
                final_estimated = 0.0
            
            placement_final[account_type] = final_estimated
        else:
            # Pas de retraits, le solde final est proportionnel au capital final
            if total_initial > 0:
                weight = initial / total_initial
                placement_final[account_type] = median_final_capital * weight
            else:
                placement_final[account_type] = 0.0
    
    # Afficher le détail par placement
    for account_type in sorted(placement_initial.keys()):
        initial = placement_initial[account_type]
        final = placement_final[account_type]
        
        # Récupérer les taxes pour ce type de placement
        tax_breakdown = median_result.total_taxes_by_account_type.get(account_type)
        if tax_breakdown:
            capital_gain = tax_breakdown.capital_gain
            total_taxes = tax_breakdown.income_tax + tax_breakdown.social_contributions
            gross_withdrawal = tax_breakdown.gross_withdrawal
            
            logger.info("  %s:", account_type)
            logger.info("    Solde en entrée: %.2f €", initial)
            logger.info("    Solde en sortie: %.2f €", final)
            logger.info("    Retraits bruts: %.2f €", gross_withdrawal)
            logger.info("    Plus-values réalisées: %.2f €", capital_gain)
            logger.info("    Impôts sur plus-values: %.2f € (IR: %.2f €, PS: %.2f €)", 
                       total_taxes, tax_breakdown.income_tax, tax_breakdown.social_contributions)
            evolution = final - initial
            evolution_pct = (evolution / initial * 100) if initial > 0 else 0.0
            logger.info("    Évolution nette: %.2f € (%.1f%%)", evolution, evolution_pct)
        else:
            logger.info("  %s:", account_type)
            logger.info("    Solde en entrée: %.2f €", initial)
            logger.info("    Solde en sortie: %.2f €", final)
            logger.info("    Retraits bruts: 0.00 €")
            logger.info("    Plus-values réalisées: 0.00 €")
            logger.info("    Impôts sur plus-values: 0.00 €")
            evolution = final - initial
            evolution_pct = (evolution / initial * 100) if initial > 0 else 0.0
            logger.info("    Évolution nette: %.2f € (%.1f%%)", evolution, evolution_pct)
    
    # Mettre à jour la progression après les scénarios de retraite (si task_id fourni)
    if task_id:
        update_progress(
            task_id,
            current_step="retraite",
            step_description="Scénarios de retraite terminés",
            progress_percent=63.0,  # Fin de l'étape retraite = 63%
            message="Tous les scénarios de retraite calculés",
        )

    return RetirementScenarioResults(
        pessimistic=pessimistic_result,
        median=median_result,
        optimistic=optimistic_result,
    )


def build_retirement_accounts(
    accounts: List[InvestmentAccount],
    total_capital: float,
) -> List[InvestmentAccount]:
    """
    Construit des comptes de retraite à partir d'un capital total.

    Répartit le capital total entre les comptes selon leurs poids relatifs
    (basés sur les contributions ou les montants actuels).

    Args:
        accounts: Liste des comptes d'investissement
        total_capital: Capital total à répartir

    Returns:
        Liste des comptes configurés pour la retraite (sans contributions mensuelles)
    """
    if total_capital <= 0:
        return [
            account.model_copy(
                update={
                    "current_amount": 0.0,
                    "monthly_contribution": 0.0,
                    "monthly_contribution_share": 0.0,
                }
            )
            for account in accounts
        ]

    weights = compute_account_weights(accounts)
    retirement_accounts: List[InvestmentAccount] = []
    for account, weight in zip(accounts, weights):
        new_amount = total_capital * weight
        # Calcul du PMP proportionnel : si le compte avait un PMP initial,
        # on le préserve proportionnellement au nouveau montant
        # Si pas de PMP initial, on estime qu'une partie du capital est de la plus-value
        # On utilise une estimation conservatrice : 70% du capital = PMP (30% de plus-value)
        if account.initial_cost_basis is not None and account.initial_cost_basis > 0:
            # Si PMP initial fourni, on le préserve proportionnellement
            # Ratio = nouveau_montant / ancien_montant
            if account.current_amount > 0:
                ratio = new_amount / account.current_amount
                new_cost_basis = account.initial_cost_basis * ratio
            else:
                new_cost_basis = new_amount  # Pas de PMP si pas de solde initial
        else:
            # Si pas de PMP initial, on estime qu'il y a eu des gains
            # Estimation : 70% du capital = PMP (30% de plus-value estimée)
            # Cela permet d'avoir des taxes même si l'utilisateur n'a pas fourni le PMP
            new_cost_basis = new_amount * 0.7
        
        retirement_accounts.append(
            account.model_copy(
                update={
                    "current_amount": new_amount,
                    "monthly_contribution": 0.0,  # Plus de contributions en retraite
                    "monthly_contribution_share": weight * 100,
                    "initial_cost_basis": new_cost_basis,  # Préserver le PMP calculé
                }
            )
        )
    return retirement_accounts


def run_single_retirement_scenario(
    payload: SavingsOptimizationInput,
    retirement_accounts: List[InvestmentAccount],
    initial_capital: float,
    scenario_name: str = "custom",
    task_id: str | None = None,
    iterations_override: int | None = None,
) -> RetirementMonteCarloResult:
    """
    Exécute une simulation de retraite unique pour un capital donné.

    Args:
        payload: Paramètres d'optimisation
        retirement_accounts: Comptes configurés pour la retraite
        initial_capital: Capital initial pour la simulation
        scenario_name: Nom du scénario (pour les logs)
        task_id: ID de tâche pour la progression (optionnel)
        iterations_override: Nombre d'itérations à utiliser (optionnel)

    Returns:
        Résultat de la simulation de retraite
    """
    # Récupération des paramètres depuis market_assumptions ou valeurs par défaut
    market = payload.market_assumptions
    confidence_level_ret = getattr(market, "confidence_level", None) or payload.confidence_level
    tolerance_ratio_ret = getattr(market, "tolerance_ratio", None) or payload.tolerance_ratio
    max_iterations_ret = iterations_override or getattr(market, "max_iterations", None) or max(payload.max_iterations, 100)
    batch_size_ret = getattr(market, "batch_size", None) or payload.batch_size
    
    # Paramètres pour la simulation de retraite
    base_kwargs = dict(
        adults=payload.adults,
        market_assumptions=payload.market_assumptions,
        spending_profile=payload.spending_profile,
        target_monthly_income=payload.target_monthly_income,
        state_pension_monthly_income=payload.state_pension_monthly_income,
        additional_income_streams=payload.additional_income_streams,
        household_charges=getattr(payload, "household_charges", None),
        child_charges=getattr(payload, "child_charges", None),
        confidence_level=confidence_level_ret,
        tolerance_ratio=tolerance_ratio_ret,
        max_iterations=max_iterations_ret,
        batch_size=batch_size_ret,
    )
    
    # Exécuter la simulation
    result = simulate_retirement_monte_carlo(
        RetirementMonteCarloInput(investment_accounts=retirement_accounts, **base_kwargs),
        task_id=task_id,
        verbose=False,
    )
    
    return result


def find_minimum_retirement_capital(
    payload: SavingsOptimizationInput,
    real_accounts: List[InvestmentAccount],
    capital_at_retirement_real: float,
    capital_at_end_real: float,
    tolerance: float = 1000.0,  # Tolérance de 1000€
    max_iterations: int = 20,
) -> float:
    """
    Trouve le capital minimum à la retraite par recherche dichotomique.
    
    Le capital minimum est le capital initial qui fait que la simulation
    de retraite finit à ~0€ (dans la tolérance).

    Args:
        payload: Paramètres d'optimisation
        real_accounts: Comptes d'investissement réels
        capital_at_retirement_real: Capital réel au début de la retraite
        capital_at_end_real: Capital réel à la fin de vie
        tolerance: Tolérance pour le capital final (défaut: 1000€)
        max_iterations: Nombre maximum d'itérations (défaut: 20)

    Returns:
        Capital minimum à la retraite
    """
    logger.info("=== Recherche du capital minimum à la retraite ===")
    log_debug("=== DEBUT RECHERCHE CAPITAL MINIMUM ===")
    log_debug("Capital réel: %.2f, Final réel: %.2f", capital_at_retirement_real, capital_at_end_real)
    
    # Déterminer si le capital réel est suffisant ou insuffisant
    # Si capital_at_end_real > tolerance : capital réel est PLUS que suffisant, chercher le minimum (inférieur)
    # Si capital_at_end_real <= tolerance : capital réel est INSUFFISANT ou juste suffisant
    #   - Si 0 <= capital_at_end_real <= tolerance : juste suffisant, le capital réel EST le minimum
    #   - Si capital_at_end_real < 0 ou s'épuise prématurément : insuffisant, chercher le minimum (supérieur)
    
    # Pour détecter si le capital s'épuise prématurément, on doit simuler et vérifier
    # Mais ici on utilise une heuristique : si le capital final est très proche de 0 ET
    # que les besoins totaux sont élevés, le capital s'est probablement épuisé.
    
    # Calcul des besoins mensuels approximatifs
    primary_adult = payload.adults[0] if payload.adults else None
    retirement_age = primary_adult.retirement_age if primary_adult else 65
    life_expectancy = primary_adult.life_expectancy if primary_adult else 85
    retirement_months = int((life_expectancy - retirement_age) * 12) if life_expectancy and retirement_age else 240
    
    target_monthly = payload.target_monthly_income or 0
    pension_monthly = payload.state_pension_monthly_income or 0
    need_monthly = max(0, target_monthly - pension_monthly)
    total_needs_estimate = need_monthly * retirement_months
    
    log_debug("Besoins mensuels estimés: %.2f, Durée retraite: %d mois, Total besoins: %.2f", 
              need_monthly, retirement_months, total_needs_estimate)
    
    # Si le capital final est positif et > tolérance, le capital réel est plus que suffisant
    # On cherche le minimum qui sera INFÉRIEUR au capital réel
    if capital_at_end_real > tolerance:
        logger.info("Capital final positif (%.2f€), recherche du minimum (inférieur au capital réel)", capital_at_end_real)
        # Estimation initiale basée sur la consommation nette
        consumption_net = capital_at_retirement_real - capital_at_end_real
        low = max(0.0, consumption_net * 0.5)
        high = capital_at_retirement_real
    else:
        # Le capital final est <= tolerance (proche de 0 ou négatif)
        # Le capital réel pourrait être insuffisant (s'épuise prématurément) ou juste suffisant
        
        # Heuristique : si le capital réel est significativement inférieur aux besoins totaux estimés
        # et que le capital final est ~0, le capital s'est probablement épuisé prématurément
        capital_covers_needs_ratio = capital_at_retirement_real / total_needs_estimate if total_needs_estimate > 0 else float('inf')
        
        if capital_covers_needs_ratio > 1.5:
            # Le capital couvre largement les besoins, probablement juste suffisant
            logger.info("Capital final proche de 0 (%.2f€) mais capital réel couvre %.1fx les besoins. Capital réel est le minimum.",
                       capital_at_end_real, capital_covers_needs_ratio)
            log_debug("Capital final proche de 0 mais suffisant. Ratio couverture: %.2f", capital_covers_needs_ratio)
            return capital_at_retirement_real
        else:
            # Le capital ne couvre pas largement les besoins, probablement insuffisant
            # On cherche le minimum qui sera SUPÉRIEUR au capital réel
            logger.info("Capital final proche de 0 (%.2f€) et ratio couverture faible (%.1fx). Recherche du minimum (supérieur au capital réel)",
                       capital_at_end_real, capital_covers_needs_ratio)
            log_debug("Capital probablement insuffisant. Ratio couverture: %.2f. Recherche minimum supérieur.", capital_covers_needs_ratio)
            
            # Estimation : le minimum est environ (besoins totaux) / facteur_rendement
            # Avec un rendement moyen de 3-4% pendant la retraite, facteur ~= 0.7-0.8
            estimated_min = total_needs_estimate * 0.75
            low = capital_at_retirement_real
            high = max(capital_at_retirement_real * 2, estimated_min * 1.5)
    
    log_debug("Bornes initiales: low=%.2f, high=%.2f", low, high)
    
    def evaluate_retirement_capital(test_capital: float) -> float:
        """Simule la retraite avec un capital donné et retourne le capital final."""
        if test_capital <= 0:
            return -float('inf')
        
        # Construire les comptes de retraite avec le capital test
        test_accounts = build_retirement_accounts(real_accounts, test_capital)
        
        # Simulation un peu plus précise (100 itérations)
        result = run_single_retirement_scenario(
            payload=payload,
            retirement_accounts=test_accounts,
            initial_capital=test_capital,
            scenario_name=f"dichotomy_{test_capital:.0f}",
            task_id=None,
            iterations_override=100,
        )
        
        return result.median_final_capital
    
    # Recherche dichotomique
    best_capital = high
    best_final = capital_at_end_real
    
    for iteration in range(max_iterations):
        mid = (low + high) / 2
        final_capital = evaluate_retirement_capital(mid)
        
        log_debug("Iter %d: capital=%.2f -> final=%.2f (low=%.2f, high=%.2f)", 
                 iteration, mid, final_capital, low, high)
        
        # Si le capital final est proche de 0, on a trouvé une bonne approximation
        if abs(final_capital) <= tolerance:
            log_debug("Trouvé! Différence dans la tolérance.")
            return mid
        
        # Logique standard de dichotomie pour une fonction croissante f(capital) = final_capital
        # On veut final_capital = 0
        if final_capital > tolerance:
            # Capital trop élevé -> on réduit la borne haute
            high = mid
            # On garde en mémoire le meilleur résultat positif (au cas où on ne trouve pas 0)
            # Ou le meilleur résultat absolu ?
            # On préfère finir légèrement au dessus de 0 que dessous
            if 0 < final_capital < best_final:
                best_capital = mid
                best_final = final_capital
        else:
            # Capital trop faible (final < 0) -> on augmente la borne basse
            low = mid
        
        # Vérifier la convergence
        if high - low < tolerance / 10: # Convergence sur le capital d'entrée
            log_debug("Convergence des bornes atteinte.")
            break
    
    # Si on n'a pas trouvé exactement 0, on retourne la dernière meilleure approximation "sûre" (high)
    # ou mid si on veut être au plus proche.
    # Prenons 'high' pour garantir qu'on est >= 0 (si possible)
    final_res = high
    log_debug("Fin recherche. Retourne %.2f", final_res)
    return final_res


def compute_account_weights(accounts: List[InvestmentAccount]) -> List[float]:
    """
    Calcule les poids relatifs des comptes pour la répartition du capital.

    Les poids sont basés sur (dans l'ordre de priorité) :
    1. Les contributions mensuelles
    2. Les parts de contribution
    3. Les montants actuels
    4. Répartition égale si aucun indicateur n'est disponible

    Args:
        accounts: Liste des comptes d'investissement

    Returns:
        Liste des poids normalisés (somme = 1.0)
    """
    if not accounts:
        return []

    raw_weights: List[float] = []
    for account in accounts:
        # Priorité 1 : contribution mensuelle
        contribution = account.monthly_contribution or 0.0
        if contribution > 0:
            raw_weights.append(contribution)
            continue
        # Priorité 2 : part de contribution
        share = account.monthly_contribution_share or 0.0
        if share > 0:
            raw_weights.append(share)
            continue
        # Priorité 3 : montant actuel
        current = account.current_amount or 0.0
        if current > 0:
            raw_weights.append(current)
            continue
        # Par défaut : poids unitaire
        raw_weights.append(1.0)

    # Normalisation des poids
    total = sum(raw_weights)
    if total <= 0:
        # Répartition égale si tous les poids sont nuls
        equal_weight = 1.0 / len(accounts)
        return [equal_weight for _ in accounts]
    return [weight / total for weight in raw_weights]

