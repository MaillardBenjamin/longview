"""
Configuration de l'application.

Charge les paramètres depuis les variables d'environnement ou un fichier .env.
"""

from functools import lru_cache
from typing import List

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configuration de l'application chargée depuis les variables d'environnement.
    
    Les valeurs peuvent être définies dans un fichier .env ou via des variables
    d'environnement système.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Configuration de base de l'application
    project_name: str = Field(default="LongView")
    api_v1_str: str = Field(default="/api/v1")

    # Configuration de sécurité (JWT)
    secret_key: str = Field(default="super-secret-change-me")
    access_token_expire_minutes: int = Field(default=60 * 24)  # 24 heures par défaut
    algorithm: str = Field(default="HS256")

    # Configuration de la base de données
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/longview"
    )

    # Configuration CORS (origines autorisées)
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    # Configuration de l'environnement
    environment: str = Field(default="local")
    debug: bool = Field(default=True)

    @model_validator(mode="before")
    @classmethod
    def parse_cors_origins(cls, values: dict) -> dict:
        """
        Parse les origines CORS depuis une chaîne de caractères séparée par des virgules.
        
        Permet de définir CORS_ORIGINS comme une chaîne "origin1,origin2" dans le .env
        au lieu d'une liste.
        
        Args:
            values: Dictionnaire des valeurs de configuration
            
        Returns:
            Dictionnaire avec cors_origins converti en liste si nécessaire
        """
        origins = values.get("cors_origins")
        if isinstance(origins, str):
            values["cors_origins"] = [origin.strip() for origin in origins.split(",") if origin.strip()]
        return values


@lru_cache
def get_settings() -> Settings:
    """
    Retourne une instance mise en cache des paramètres de l'application.
    
    Returns:
        Instance de Settings avec les paramètres chargés
    """
    return Settings()


settings = get_settings()

