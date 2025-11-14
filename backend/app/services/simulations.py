"""
Services pour la gestion des simulations.

Fournit les opérations CRUD pour les simulations de retraite.
"""

from collections.abc import Sequence

from sqlalchemy.orm import Session

from app.models.simulation import Simulation
from app.schemas.simulation import SimulationCreate, SimulationUpdate


def get_simulation(db: Session, simulation_id: int) -> Simulation | None:
    """
    Récupère une simulation par son ID.
    
    Args:
        db: Session de base de données
        simulation_id: Identifiant de la simulation
        
    Returns:
        Simulation trouvée ou None
    """
    return db.get(Simulation, simulation_id)


def get_user_simulations(db: Session, user_id: int) -> Sequence[Simulation]:
    """
    Récupère toutes les simulations d'un utilisateur.
    
    Les simulations sont triées par date de création décroissante
    (les plus récentes en premier).
    
    Args:
        db: Session de base de données
        user_id: Identifiant de l'utilisateur
        
    Returns:
        Liste des simulations de l'utilisateur
    """
    return (
        db.query(Simulation)
        .filter(Simulation.user_id == user_id)
        .order_by(Simulation.created_at.desc())
        .all()
    )


def create_simulation(
    db: Session,
    *,
    user_id: int | None,
    simulation_in: SimulationCreate,
) -> Simulation:
    """
    Crée une nouvelle simulation.
    
    Args:
        db: Session de base de données
        user_id: Identifiant de l'utilisateur propriétaire (peut être None pour simulations anonymes)
        simulation_in: Données de la nouvelle simulation
        
    Returns:
        Simulation créée avec son ID généré
    """
    simulation = Simulation(
        user_id=user_id,
        **simulation_in.model_dump(exclude_unset=True),
    )
    db.add(simulation)
    db.commit()
    db.refresh(simulation)
    return simulation


def update_simulation(
    db: Session,
    simulation: Simulation,
    simulation_in: SimulationUpdate,
) -> Simulation:
    """
    Met à jour une simulation existante.
    
    Seuls les champs fournis dans simulation_in sont mis à jour.
    
    Args:
        db: Session de base de données
        simulation: Simulation à mettre à jour
        simulation_in: Données de mise à jour
        
    Returns:
        Simulation mise à jour
    """
    update_data = simulation_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(simulation, field, value)
    db.add(simulation)
    db.commit()
    db.refresh(simulation)
    return simulation


def delete_simulation(db: Session, simulation: Simulation) -> None:
    """
    Supprime une simulation.
    
    Args:
        db: Session de base de données
        simulation: Simulation à supprimer
    """
    db.delete(simulation)
    db.commit()


