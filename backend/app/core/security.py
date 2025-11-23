"""
Module de sécurité pour l'authentification et le hachage des mots de passe.

Gère la création de tokens JWT et le hachage/vérification des mots de passe
avec bcrypt.
"""

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

# Contexte de hachage de mots de passe avec bcrypt
# Note: bcrypt a une limite de 72 bytes, donc on utilise une approche
# qui hash d'abord avec SHA-256 pour les mots de passe plus longs
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
    
    Gère les mots de passe qui ont été hashés avec SHA-256 avant bcrypt
    si leur longueur dépassait 72 bytes. Essaie d'abord la méthode normale,
    puis la méthode avec SHA-256 si nécessaire.
    
    Args:
        plain_password: Mot de passe en clair
        hashed_password: Hash du mot de passe stocké
        
    Returns:
        True si le mot de passe correspond, False sinon
    """
    # Essayer d'abord avec le mot de passe tel quel (cas normal)
    try:
        if pwd_context.verify(plain_password, hashed_password):
            return True
    except Exception:
        pass
    
    # Si ça n'a pas fonctionné et que le mot de passe est trop long,
    # essayer avec SHA-256 d'abord (pour compatibilité avec les anciens mots de passe)
    password_bytes = plain_password.encode("utf-8")
    if len(password_bytes) > 72:
        try:
            password_hash = hashlib.sha256(password_bytes).hexdigest()
            return pwd_context.verify(password_hash, hashed_password)
        except Exception:
            pass
    
    return False


def get_password_hash(password: str) -> str:
    """
    Hash un mot de passe pour le stockage.
    
    Bcrypt a une limite de 72 bytes. Pour les mots de passe plus longs,
    on les hash d'abord avec SHA-256 pour obtenir exactement 32 bytes,
    puis on applique bcrypt sur ce hash.
    
    Args:
        password: Mot de passe en clair
        
    Returns:
        Hash bcrypt du mot de passe (ou du hash SHA-256 si le mot de passe est trop long)
    """
    # Bcrypt limite à 72 bytes
    password_bytes = password.encode("utf-8")
    
    if len(password_bytes) > 72:
        # Si le mot de passe est trop long, on le hash d'abord avec SHA-256
        # Cela donne toujours 32 bytes, ce qui est bien en dessous de la limite
        password_hash = hashlib.sha256(password_bytes).hexdigest()
        return pwd_context.hash(password_hash)
    
    return pwd_context.hash(password)


