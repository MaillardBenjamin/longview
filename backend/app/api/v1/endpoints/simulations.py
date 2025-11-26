"""
Endpoints pour la gestion des simulations et les calculs de projections.

Gère les opérations CRUD sur les simulations sauvegardées et les calculs
de projections (capitalisation, Monte Carlo, retraite, optimisation).
"""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db_session
from app.models.simulation import Simulation
from app.models.user import User
from app.schemas.simulation import SimulationCreate, SimulationRead, SimulationUpdate
from app.schemas.projections import (
    CapitalizationInput,
    CapitalizationResult,
    MonteCarloInput,
    MonteCarloResult,
    RecommendedSavingsResult,
    RetirementMonteCarloInput,
    RetirementMonteCarloResult,
    SavingsOptimizationInput,
)
from app.services import capitalization as capitalization_service
from app.services import monte_carlo as monte_carlo_service
from app.services import simulations as simulation_service
from app.services.progress import create_progress_task, get_progress

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.get("/", response_model=list[SimulationRead])
def list_simulations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
) -> list[SimulationRead]:
    """
    Liste toutes les simulations de l'utilisateur authentifié.
    
    Args:
        current_user: Utilisateur authentifié (via dépendance)
        db: Session de base de données
        
    Returns:
        Liste des simulations de l'utilisateur, triées par date de création décroissante
    """
    simulations = simulation_service.get_user_simulations(db, user_id=current_user.id)
    return [SimulationRead.model_validate(simulation) for simulation in simulations]


@router.post("/", response_model=SimulationRead, status_code=status.HTTP_201_CREATED)
def create_simulation(
    simulation_in: SimulationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
) -> SimulationRead:
    """
    Crée une nouvelle simulation pour l'utilisateur authentifié.
    
    Si un project_id est fourni, vérifie que le projet appartient à l'utilisateur.
    Si aucun project_id n'est fourni, crée automatiquement un projet avec le nom de la simulation.
    
    Args:
        simulation_in: Données de la nouvelle simulation
        current_user: Utilisateur authentifié (via dépendance)
        db: Session de base de données
        
    Returns:
        Simulation créée avec son ID généré
        
    Raises:
        HTTPException: Si le projet n'existe pas ou n'appartient pas à l'utilisateur
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Création de simulation - Utilisateur: {current_user.id if current_user else None}")
    logger.info(f"Données reçues: name={simulation_in.name}, current_age={simulation_in.current_age}, "
                f"retirement_age={simulation_in.retirement_age}, project_id={simulation_in.project_id}")
    
    from app.services import projects as project_service
    from app.schemas.project import ProjectCreate
    
    # Si l'utilisateur est connecté et qu'aucun projet n'est spécifié, créer un projet automatiquement
    project_id = simulation_in.project_id
    if current_user and project_id is None:
        logger.info(f"Création automatique d'un projet pour la simulation '{simulation_in.name}'")
        project = project_service.create_project(
            db,
            user_id=current_user.id,
            project_in=ProjectCreate(
                name=simulation_in.name,
                description=f"Projet créé automatiquement pour la simulation '{simulation_in.name}'",
            ),
        )
        # Créer une nouvelle instance avec le project_id mis à jour
        project_id = project.id
        simulation_in = simulation_in.model_copy(update={"project_id": project_id})
        logger.info(f"Projet créé avec ID: {project_id}")
    # Vérification de sécurité : s'assurer que le projet appartient à l'utilisateur
    elif project_id is not None:
        logger.info(f"Utilisation du projet existant: {project_id}")
        project = project_service.get_project(db, project_id)
        if not project or project.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied",
            )
    
    logger.info(f"Création de la simulation avec project_id={simulation_in.project_id}")
    simulation = simulation_service.create_simulation(
        db,
        user_id=current_user.id,
        simulation_in=simulation_in,
    )
    logger.info(f"Simulation créée avec succès - ID: {simulation.id}, project_id: {simulation.project_id}")
    return SimulationRead.model_validate(simulation)


@router.get("/{simulation_id}", response_model=SimulationRead)
def read_simulation(
    simulation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
) -> SimulationRead:
    """
    Récupère une simulation spécifique appartenant à l'utilisateur authentifié.
    
    Args:
        simulation_id: Identifiant de la simulation
        current_user: Utilisateur authentifié (via dépendance)
        db: Session de base de données
        
    Returns:
        Simulation trouvée
        
    Raises:
        HTTPException: Si la simulation n'existe pas ou n'appartient pas à l'utilisateur
    """
    simulation = _get_owned_simulation_or_404(db, simulation_id, current_user)
    return SimulationRead.model_validate(simulation)


@router.put("/{simulation_id}", response_model=SimulationRead)
def update_simulation(
    simulation_id: int,
    simulation_in: SimulationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
) -> SimulationRead:
    """
    Met à jour une simulation existante appartenant à l'utilisateur authentifié.
    
    Si un project_id est fourni, vérifie que le projet appartient à l'utilisateur.
    
    Args:
        simulation_id: Identifiant de la simulation
        simulation_in: Données de mise à jour
        current_user: Utilisateur authentifié (via dépendance)
        db: Session de base de données
        
    Returns:
        Simulation mise à jour
        
    Raises:
        HTTPException: Si la simulation n'existe pas, n'appartient pas à l'utilisateur,
                       ou si le projet n'existe pas ou n'appartient pas à l'utilisateur
    """
    simulation = _get_owned_simulation_or_404(db, simulation_id, current_user)
    
    # Vérification de sécurité : s'assurer que le projet appartient à l'utilisateur
    if simulation_in.project_id is not None:
        from app.services import projects as project_service
        project = project_service.get_project(db, simulation_in.project_id)
        if not project or project.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied",
            )
    
    simulation = simulation_service.update_simulation(db, simulation, simulation_in)
    return SimulationRead.model_validate(simulation)


@router.delete("/{simulation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_simulation(
    simulation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
) -> None:
    """
    Supprime une simulation appartenant à l'utilisateur authentifié.
    
    Args:
        simulation_id: Identifiant de la simulation
        current_user: Utilisateur authentifié (via dépendance)
        db: Session de base de données
        
    Raises:
        HTTPException: Si la simulation n'existe pas ou n'appartient pas à l'utilisateur
    """
    simulation = _get_owned_simulation_or_404(db, simulation_id, current_user)
    simulation_service.delete_simulation(db, simulation)


@router.post("/capitalization-preview", response_model=CapitalizationResult)
def compute_capitalization_preview(payload: CapitalizationInput) -> CapitalizationResult:
    """
    Calcule une prévisualisation déterministe de la phase de capitalisation.
    
    Simulation rapide sans aléa pour donner une estimation rapide de l'évolution
    du capital jusqu'à la retraite.
    
    Args:
        payload: Paramètres de la simulation de capitalisation
        
    Returns:
        Résultat de la simulation déterministe avec séries mensuelles
    """
    return capitalization_service.simulate_capitalization_phase(payload)


@router.post("/monte-carlo", response_model=MonteCarloResult)
def compute_monte_carlo_projection(payload: MonteCarloInput) -> MonteCarloResult:
    """
    Calcule une simulation Monte Carlo de la phase de capitalisation jusqu'à la retraite.
    
    Effectue de multiples tirages aléatoires pour estimer la distribution
    du capital à la retraite avec des percentiles (pessimiste, médian, optimiste).
    
    Args:
        payload: Paramètres de la simulation Monte Carlo
        
    Returns:
        Résultat de la simulation avec percentiles mensuels et statistiques
    """
    return monte_carlo_service.simulate_monte_carlo(payload)


@router.post("/retirement-monte-carlo", response_model=RetirementMonteCarloResult)
def compute_retirement_monte_carlo(payload: RetirementMonteCarloInput) -> RetirementMonteCarloResult:
    """
    Calcule une simulation Monte Carlo de la phase de retraite (décumulation).
    
    Simule l'évolution du capital pendant la retraite avec des retraits mensuels
    proportionnels aux allocations d'actifs, en tenant compte des revenus
    (pension d'État, revenus additionnels) et des profils de dépenses.
    
    Args:
        payload: Paramètres de la simulation de retraite
        
    Returns:
        Résultat de la simulation avec percentiles mensuels et scénarios
    """
    import logging
    logger = logging.getLogger("uvicorn.error")
    
    result = monte_carlo_service.simulate_retirement_monte_carlo(payload)
    
    # Log pour vérifier les taxes dans le résultat
    logger.info(
        f"Résultat retirement Monte Carlo: "
        f"nb_taxes={len(result.total_taxes_by_account_type)}, "
        f"total_IR={result.cumulative_total_income_tax:.2f}, "
        f"total_PS={result.cumulative_total_social_contributions:.2f}"
    )
    if result.total_taxes_by_account_type:
        for acc_type, tax_data in result.total_taxes_by_account_type.items():
            logger.info(
                f"  {acc_type}: IR={tax_data.income_tax:.2f}, "
                f"PS={tax_data.social_contributions:.2f}"
            )
    
    return result


@router.get("/progress/{task_id}")
async def stream_progress(task_id: str):
    """
    Stream de progression en temps réel via Server-Sent Events (SSE).
    
    Args:
        task_id: Identifiant de la tâche de progression
        
    Yields:
        Événements SSE avec les mises à jour de progression
    """
    async def event_generator():
        last_update_time = 0.0
        initial_sent = False
        
        # Créer la tâche si elle n'existe pas encore (le frontend peut commencer à écouter avant le POST)
        if get_progress(task_id) is None:
            create_progress_task(total_steps=3, initial_step="initialisation", task_id=task_id)
            logger.info(f"Tâche de progression créée dans GET: {task_id}")
        
        while True:
            progress_state = get_progress(task_id)
            
            if progress_state is None:
                # Tâche introuvable (ne devrait plus arriver maintenant)
                yield f"data: {json.dumps({'error': 'Tâche introuvable'})}\n\n"
                break
            
            # Envoyer l'état initial immédiatement, puis les mises à jour
            if not initial_sent or progress_state.updated_at > last_update_time:
                data = {
                    "task_id": progress_state.task_id,
                    "current_step": progress_state.current_step,
                    "step_description": progress_state.step_description,
                    "progress_percent": progress_state.progress_percent,
                    "total_steps": progress_state.total_steps,
                    "current_step_index": progress_state.current_step_index,
                    "message": progress_state.message,
                    "is_complete": progress_state.is_complete,
                    "error": progress_state.error,
                }
                yield f"data: {json.dumps(data)}\n\n"
                last_update_time = progress_state.updated_at
                initial_sent = True
                
                logger.info(f"[SSE] Événement envoyé pour {task_id}: {progress_state.progress_percent}% - {progress_state.current_step} - {progress_state.message}")
                
                # Si la tâche est terminée, arrêter le stream
                if progress_state.is_complete:
                    break
            
            # Attendre un peu avant de vérifier à nouveau
            await asyncio.sleep(0.3)  # Réduire à 0.3s pour plus de réactivité
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Désactiver le buffering pour nginx
        },
    )


@router.post("/recommended-savings", response_model=RecommendedSavingsResult)
def compute_recommended_savings(
    payload: SavingsOptimizationInput,
    task_id: Optional[str] = Query(None, description="Identifiant de la tâche de progression (optionnel)"),
) -> RecommendedSavingsResult:
    """
    Optimise l'épargne mensuelle nécessaire pour atteindre un capital cible à l'âge de décès.
    
    Utilise un algorithme de recherche par bissection pour trouver le facteur
    d'épargne mensuelle qui permet au capital médian d'atteindre le capital cible
    (généralement 0) à l'âge de décès, en combinant les phases de capitalisation
    et de retraite.
    
    Args:
        payload: Paramètres d'optimisation (inclut les paramètres de capitalisation et retraite)
        task_id: Identifiant optionnel de la tâche de progression (pour le suivi en temps réel)
        
    Returns:
        Résultat de l'optimisation avec l'épargne mensuelle recommandée, les résultats
        des simulations optimisées, et les étapes de convergence
    """
    # Créer la tâche de progression si task_id fourni (si elle n'existe pas déjà)
    if task_id and get_progress(task_id) is None:
        create_progress_task(total_steps=3, initial_step="initialisation", task_id=task_id)
        logger.info(f"Tâche de progression créée dans POST: {task_id}")
    
    return monte_carlo_service.optimize_savings_plan(payload, task_id=task_id)


def _get_owned_simulation_or_404(db: Session, simulation_id: int, user: User) -> Simulation:
    """
    Récupère une simulation et vérifie qu'elle appartient à l'utilisateur.
    
    Fonction utilitaire pour s'assurer qu'un utilisateur ne peut accéder
    qu'à ses propres simulations.
    
    Args:
        db: Session de base de données
        simulation_id: Identifiant de la simulation
        user: Utilisateur authentifié
        
    Returns:
        Simulation trouvée et appartenant à l'utilisateur
        
    Raises:
        HTTPException: Si la simulation n'existe pas ou n'appartient pas à l'utilisateur
    """
    simulation = simulation_service.get_simulation(db, simulation_id)
    if not simulation or simulation.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found")
    return simulation

