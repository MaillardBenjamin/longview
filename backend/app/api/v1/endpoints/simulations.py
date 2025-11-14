"""
Endpoints pour la gestion des simulations et les calculs de projections.

Gère les opérations CRUD sur les simulations sauvegardées et les calculs
de projections (capitalisation, Monte Carlo, retraite, optimisation).
"""

from fastapi import APIRouter, Depends, HTTPException, status
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
    
    Args:
        simulation_in: Données de la nouvelle simulation
        current_user: Utilisateur authentifié (via dépendance)
        db: Session de base de données
        
    Returns:
        Simulation créée avec son ID généré
    """
    simulation = simulation_service.create_simulation(
        db,
        user_id=current_user.id,
        simulation_in=simulation_in,
    )
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
    
    Args:
        simulation_id: Identifiant de la simulation
        simulation_in: Données de mise à jour
        current_user: Utilisateur authentifié (via dépendance)
        db: Session de base de données
        
    Returns:
        Simulation mise à jour
        
    Raises:
        HTTPException: Si la simulation n'existe pas ou n'appartient pas à l'utilisateur
    """
    simulation = _get_owned_simulation_or_404(db, simulation_id, current_user)
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
    return monte_carlo_service.simulate_retirement_monte_carlo(payload)


@router.post("/recommended-savings", response_model=RecommendedSavingsResult)
def compute_recommended_savings(payload: SavingsOptimizationInput) -> RecommendedSavingsResult:
    """
    Optimise l'épargne mensuelle nécessaire pour atteindre un capital cible à l'âge de décès.
    
    Utilise un algorithme de recherche par bissection pour trouver le facteur
    d'épargne mensuelle qui permet au capital médian d'atteindre le capital cible
    (généralement 0) à l'âge de décès, en combinant les phases de capitalisation
    et de retraite.
    
    Args:
        payload: Paramètres d'optimisation (inclut les paramètres de capitalisation et retraite)
        
    Returns:
        Résultat de l'optimisation avec l'épargne mensuelle recommandée, les résultats
        des simulations optimisées, et les étapes de convergence
    """
    return monte_carlo_service.optimize_savings_plan(payload)


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

