"""
Endpoints d'authentification.

Gère l'inscription, la connexion et la récupération des informations
de l'utilisateur actuel.
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db_session
from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import Token
from app.schemas.user import UserCreate, UserRead
from app.services import users as user_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db_session),
) -> UserRead:
    """
    Enregistre un nouvel utilisateur.
    
    Args:
        user_in: Données du nouvel utilisateur (email, password, full_name)
        db: Session de base de données
        
    Returns:
        Utilisateur créé
        
    Raises:
        HTTPException: Si l'email est déjà enregistré
    """
    existing_user = user_service.get_user_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = user_service.create_user(db, user_in=user_in)
    return UserRead.model_validate(user)


@router.post("/login", response_model=Token)
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db_session),
) -> Token:
    """
    Authentifie un utilisateur et retourne un token JWT.
    
    Args:
        form_data: Formulaire OAuth2 avec username (email) et password
        db: Session de base de données
        
    Returns:
        Token JWT d'accès
        
    Raises:
        HTTPException: Si les identifiants sont incorrects
    """
    user = user_service.authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(user.id, expires_delta=access_token_expires)
    return Token(access_token=access_token)


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_active_user)) -> UserRead:
    """
    Récupère les informations de l'utilisateur actuellement authentifié.
    
    Args:
        current_user: Utilisateur authentifié (via dépendance)
        
    Returns:
        Informations de l'utilisateur actuel
    """
    return UserRead.model_validate(current_user)

