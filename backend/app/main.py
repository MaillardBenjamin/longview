"""
Point d'entrée principal de l'application FastAPI.

Configure l'application FastAPI, le middleware CORS, et les routes principales.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api_v1_router import api_router
from app.core.config import settings

# Initialisation de l'application FastAPI
app = FastAPI(
    title=settings.project_name,
    openapi_url=f"{settings.api_v1_str}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configuration du middleware CORS pour autoriser les requêtes depuis le frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """
    Endpoint de vérification de santé de l'application.
    
    Returns:
        Dictionnaire avec le statut de l'application
    """
    return {"status": "ok"}


@app.get("/", tags=["root"])
def read_root() -> dict[str, str]:
    """
    Endpoint racine de l'API.
    
    Returns:
        Message de bienvenue
    """
    return {"message": "Welcome to LongView"}


# Inclusion du routeur API v1
app.include_router(api_router, prefix=settings.api_v1_str)

