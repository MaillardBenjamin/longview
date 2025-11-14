"""
Module de sécurité pour l'authentification et le hachage des mots de passe.

Gère la création de tokens JWT et le hachage/vérification des mots de passe
avec bcrypt.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

# Contexte de hachage de mots de passe avec bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    """
    Génère un token JWT d'accès.
    
    Args:
        subject: Identifiant du sujet (généralement l'ID utilisateur)
        expires_delta: Durée de validité du token (optionnel)
        
    Returns:
        Token JWT encodé en chaîne de caractères
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifie un mot de passe en clair contre son hash.
    
    Args:
        plain_password: Mot de passe en clair
        hashed_password: Hash du mot de passe stocké
        
    Returns:
        True si le mot de passe correspond, False sinon
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash un mot de passe pour le stockage.
    
    Args:
        password: Mot de passe en clair
        
    Returns:
        Hash bcrypt du mot de passe
    """
    return pwd_context.hash(password)


