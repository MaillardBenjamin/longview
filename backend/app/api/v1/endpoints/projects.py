"""
Endpoints pour la gestion des projets de simulation.

Gère les opérations CRUD sur les projets qui regroupent les simulations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db_session
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate, ProjectWithSimulations
from app.services import projects as project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=list[ProjectRead])
def list_projects(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
) -> list[ProjectRead]:
    """
    Liste tous les projets de l'utilisateur authentifié.
    
    Args:
        current_user: Utilisateur authentifié (via dépendance)
        db: Session de base de données
        
    Returns:
        Liste des projets de l'utilisateur, triés par date de création décroissante
    """
    projects = project_service.get_user_projects(db, user_id=current_user.id)
    return [ProjectRead.model_validate(project) for project in projects]


@router.post("/", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
) -> ProjectRead:
    """
    Crée un nouveau projet pour l'utilisateur authentifié.
    
    Args:
        project_in: Données du nouveau projet
        current_user: Utilisateur authentifié (via dépendance)
        db: Session de base de données
        
    Returns:
        Projet créé avec son ID généré
    """
    project = project_service.create_project(
        db,
        user_id=current_user.id,
        project_in=project_in,
    )
    return ProjectRead.model_validate(project)


@router.get("/{project_id}", response_model=ProjectWithSimulations)
def read_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
) -> ProjectWithSimulations:
    """
    Récupère un projet spécifique appartenant à l'utilisateur authentifié
    avec ses simulations associées.
    
    Args:
        project_id: Identifiant du projet
        current_user: Utilisateur authentifié (via dépendance)
        db: Session de base de données
        
    Returns:
        Projet trouvé avec ses simulations
        
    Raises:
        HTTPException: Si le projet n'existe pas ou n'appartient pas à l'utilisateur
    """
    project = _get_owned_project_or_404(db, project_id, current_user, load_simulations=True)
    return ProjectWithSimulations.model_validate(project)


@router.put("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
) -> ProjectRead:
    """
    Met à jour un projet existant appartenant à l'utilisateur authentifié.
    
    Args:
        project_id: Identifiant du projet
        project_in: Données de mise à jour
        current_user: Utilisateur authentifié (via dépendance)
        db: Session de base de données
        
    Returns:
        Projet mis à jour
        
    Raises:
        HTTPException: Si le projet n'existe pas ou n'appartient pas à l'utilisateur
    """
    project = _get_owned_project_or_404(db, project_id, current_user)
    project = project_service.update_project(db, project, project_in)
    return ProjectRead.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
) -> None:
    """
    Supprime un projet appartenant à l'utilisateur authentifié.
    
    Les simulations associées seront également supprimées.
    
    Args:
        project_id: Identifiant du projet
        current_user: Utilisateur authentifié (via dépendance)
        db: Session de base de données
        
    Raises:
        HTTPException: Si le projet n'existe pas ou n'appartient pas à l'utilisateur
    """
    project = _get_owned_project_or_404(db, project_id, current_user)
    project_service.delete_project(db, project)


def _get_owned_project_or_404(
    db: Session, project_id: int, user: User, *, load_simulations: bool = False
) -> Project:
    """
    Récupère un projet et vérifie qu'il appartient à l'utilisateur.
    
    Fonction utilitaire pour s'assurer qu'un utilisateur ne peut accéder
    qu'à ses propres projets.
    
    Args:
        db: Session de base de données
        project_id: Identifiant du projet
        user: Utilisateur authentifié
        load_simulations: Si True, charge les simulations associées
        
    Returns:
        Projet trouvé et appartenant à l'utilisateur
        
    Raises:
        HTTPException: Si le projet n'existe pas ou n'appartient pas à l'utilisateur
    """
    project = project_service.get_project(db, project_id, load_simulations=load_simulations)
    if not project or project.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project

