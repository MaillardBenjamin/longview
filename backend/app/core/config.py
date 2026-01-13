"""
Configuration de l'application.

Charge les paramètres depuis les variables d'environnement ou un fichier .env.
"""

from functools import lru_cache
from typing import List, Union

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configuration de l'application chargée depuis les variables d'environnement.
    
    Les valeurs peuvent être définies dans un fichier .env ou via des variables
    d'environnement système.
    """

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore",
        # Ne pas essayer de parser automatiquement les valeurs complexes comme JSON
        json_schema_extra={
            "cors_origins": {"format": "string", "description": "Comma-separated list of CORS origins"}
        }
    )

    # Configuration de base de l'application
    project_name: str = Field(default="LongView")
    api_v1_str: str = Field(default="/api/v1")

    # Configuration de sécurité (JWT)
    secret_key: str = Field(default="super-secret-change-me")
    access_token_expire_minutes: int = Field(default=60 * 24)  # 24 heures par défaut
    algorithm: str = Field(default="HS256")

    # Configuration de la base de données
    enable_database: bool = Field(
        default=True,
        description="Active ou désactive l'utilisation de la base de données. En production sans gestion de comptes, peut être désactivé."
    )
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/longview"
    )

    # Configuration CORS (origines autorisées)
    # Accepte une chaîne ou une liste pour permettre différents formats dans .env
    cors_origins: Union[str, List[str]] = Field(default="http://localhost:5173")

    # Configuration de l'environnement
    environment: str = Field(default="local")
    debug: bool = Field(default=True)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Union[str, List[str]]) -> List[str]:
        """
        Parse les origines CORS depuis une chaîne de caractères séparée par des virgules.
        
        Permet de définir CORS_ORIGINS comme une chaîne "origin1,origin2" dans le .env
        au lieu d'une liste.
        
        Args:
            value: Valeur à parser (chaîne ou liste)
            
        Returns:
            Liste des origines CORS
        """
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            # Séparer par virgules et nettoyer les espaces
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        # Valeur par défaut si None ou autre type
        return ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    """
    Retourne une instance mise en cache des paramètres de l'application.
    
    Returns:
        Instance de Settings avec les paramètres chargés
    """
    return Settings()


settings = get_settings()

