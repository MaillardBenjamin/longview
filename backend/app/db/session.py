"""
Configuration de la connexion à la base de données et gestion des sessions.

Configure SQLAlchemy pour se connecter à la base de données PostgreSQL
et fournit une fonction pour obtenir des sessions de base de données.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Moteur SQLAlchemy pour la connexion à la base de données
# pool_pre_ping: Vérifie la validité des connexions avant de les utiliser
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
)

# Factory pour créer des sessions de base de données
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator:
    """
    Fournit une session de base de données pour le traitement d'une requête.
    
    Utilise un générateur pour s'assurer que la session est correctement
    fermée après utilisation, même en cas d'erreur.
    
    Yields:
        Session SQLAlchemy
        
    Note:
        La session est automatiquement fermée dans le bloc finally.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

