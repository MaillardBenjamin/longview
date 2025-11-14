"""
Dépendances FastAPI pour l'authentification et l'accès à la base de données.

Fournit des dépendances réutilisables pour :
- L'accès à la session de base de données
- L'authentification des utilisateurs via JWT
- La récupération de l'utilisateur actuel
"""

from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import TokenPayload

# Schéma OAuth2 pour l'authentification par token Bearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_str}/auth/login")


def get_db_session() -> Generator[Session, None, None]:
    """
    Fournit une session de base de données pour la requête actuelle.
    
    Yields:
        Session SQLAlchemy
        
    Note:
        La session est automatiquement fermée après la requête grâce au contexte.
    """
    yield from get_db()


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


def get_current_user(
    db: Annotated[Session, Depends(get_db_session)],
    token: Annotated[str, Depends(oauth2_scheme)],
) -> User:
    """
    Récupère l'utilisateur actuel à partir du token JWT.
    
    Décode le token JWT, valide ses informations et récupère l'utilisateur
    correspondant depuis la base de données.
    
    Args:
        db: Session de base de données
        token: Token JWT d'authentification
        
    Returns:
        Utilisateur authentifié
        
    Raises:
        HTTPException: Si le token est invalide ou l'utilisateur n'existe pas
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        token_data = TokenPayload.model_validate(payload)
    except JWTError as exc:
        raise credentials_exception from exc
    if token_data.sub is None:
        raise credentials_exception
    try:
        user_id = int(token_data.sub)
    except ValueError as exc:
        raise credentials_exception from exc
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """
    Vérifie que l'utilisateur actuel est actif.
    
    Args:
        current_user: Utilisateur récupéré via get_current_user
        
    Returns:
        Utilisateur actif
        
    Raises:
        HTTPException: Si l'utilisateur est inactif
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

