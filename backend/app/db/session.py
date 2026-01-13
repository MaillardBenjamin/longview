"""
Configuration de la connexion à la base de données et gestion des sessions.

Configure SQLAlchemy pour se connecter à la base de données PostgreSQL
et fournit une fonction pour obtenir des sessions de base de données.
La base de données peut être désactivée via ENABLE_DATABASE=false.
"""

from collections.abc import Generator
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# Moteur SQLAlchemy pour la connexion à la base de données (optionnel)
# Ne sera créé que si enable_database est True
engine: Optional[create_engine] = None
SessionLocal: Optional[sessionmaker] = None

if settings.enable_database:
    # pool_pre_ping: Vérifie la validité des connexions avant de les utiliser
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        future=True,
    )
    
    # Factory pour créer des sessions de base de données
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """
    Fournit une session de base de données pour le traitement d'une requête.
    
    Si la base de données est désactivée (ENABLE_DATABASE=false), 
    lève une RuntimeError.
    
    Utilise un générateur pour s'assurer que la session est correctement
    fermée après utilisation, même en cas d'erreur.
    
    Yields:
        Session SQLAlchemy
        
    Raises:
        RuntimeError: Si la base de données est désactivée
        
    Note:
        La session est automatiquement fermée dans le bloc finally.
    """
    if not settings.enable_database or engine is None or SessionLocal is None:
        raise RuntimeError(
            "Base de données désactivée. Activez ENABLE_DATABASE=true dans le .env pour utiliser cette fonctionnalité."
        )
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

