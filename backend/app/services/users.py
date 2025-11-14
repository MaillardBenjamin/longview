"""
Services pour la gestion des utilisateurs.

Fournit les opérations CRUD et d'authentification pour les utilisateurs.
"""

from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def get_user(db: Session, user_id: int) -> User | None:
    """
    Récupère un utilisateur par son ID.
    
    Args:
        db: Session de base de données
        user_id: Identifiant de l'utilisateur
        
    Returns:
        Utilisateur trouvé ou None
    """
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    """
    Récupère un utilisateur par son adresse email.
    
    Args:
        db: Session de base de données
        email: Adresse email de l'utilisateur
        
    Returns:
        Utilisateur trouvé ou None
    """
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user_in: UserCreate) -> User:
    """
    Crée un nouvel utilisateur.
    
    Le mot de passe est automatiquement hashé avant stockage.
    
    Args:
        db: Session de base de données
        user_in: Données du nouvel utilisateur
        
    Returns:
        Utilisateur créé avec son ID généré
    """
    db_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """
    Authentifie un utilisateur avec son email et son mot de passe.
    
    Args:
        db: Session de base de données
        email: Adresse email de l'utilisateur
        password: Mot de passe en clair
        
    Returns:
        Utilisateur authentifié ou None si les identifiants sont incorrects
    """
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def update_user(db: Session, user: User, user_in: UserUpdate) -> User:
    """
    Met à jour un utilisateur existant.
    
    Seules les champs fournis dans user_in sont mis à jour.
    Le mot de passe est automatiquement hashé s'il est fourni.
    
    Args:
        db: Session de base de données
        user: Utilisateur à mettre à jour
        user_in: Données de mise à jour
        
    Returns:
        Utilisateur mis à jour
    """
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.password is not None:
        user.hashed_password = get_password_hash(user_in.password)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

