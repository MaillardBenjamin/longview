"""
Services pour la gestion des projets de simulation.

Fournit les opérations CRUD pour les projets de simulation.
"""

from collections.abc import Sequence

from sqlalchemy.orm import Session, selectinload

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


def get_project(db: Session, project_id: int, *, load_simulations: bool = False) -> Project | None:
    """
    Récupère un projet par son ID.
    
    Args:
        db: Session de base de données
        project_id: Identifiant du projet
        load_simulations: Si True, charge les simulations associées
        
    Returns:
        Projet trouvé ou None
    """
    query = db.query(Project).filter(Project.id == project_id)
    if load_simulations:
        query = query.options(selectinload(Project.simulations))
    return query.first()


def get_user_projects(db: Session, user_id: int) -> Sequence[Project]:
    """
    Récupère tous les projets d'un utilisateur.
    
    Les projets sont triés par date de création décroissante
    (les plus récents en premier).
    
    Args:
        db: Session de base de données
        user_id: Identifiant de l'utilisateur
        
    Returns:
        Liste des projets de l'utilisateur
    """
    return (
        db.query(Project)
        .filter(Project.user_id == user_id)
        .order_by(Project.created_at.desc())
        .all()
    )


def create_project(
    db: Session,
    *,
    user_id: int,
    project_in: ProjectCreate,
) -> Project:
    """
    Crée un nouveau projet.
    
    Args:
        db: Session de base de données
        user_id: Identifiant de l'utilisateur propriétaire
        project_in: Données du nouveau projet
        
    Returns:
        Projet créé avec son ID généré
    """
    project = Project(
        user_id=user_id,
        **project_in.model_dump(exclude_unset=True),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_project(
    db: Session,
    project: Project,
    project_in: ProjectUpdate,
) -> Project:
    """
    Met à jour un projet existant.
    
    Seuls les champs fournis dans project_in sont mis à jour.
    
    Args:
        db: Session de base de données
        project: Projet à mettre à jour
        project_in: Données de mise à jour
        
    Returns:
        Projet mis à jour
    """
    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project: Project) -> None:
    """
    Supprime un projet.
    
    Les simulations associées seront également supprimées
    grâce à la cascade définie dans le modèle.
    
    Args:
        db: Session de base de données
        project: Projet à supprimer
    """
    db.delete(project)
    db.commit()

