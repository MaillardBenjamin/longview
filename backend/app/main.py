"""
Point d'entrée principal de l'application FastAPI.

Configure l'application FastAPI, le middleware CORS, et les routes principales.
"""

import logging
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings

logger = logging.getLogger(__name__)

# Import de l'API router (qui importe tous les endpoints et schémas)
from app.api.api_v1_router import api_router

# Import explicite du module simulation pour s'assurer que SimulationRead est disponible
# avant la résolution des références forward
from app.schemas import simulation  # noqa: F401

# Résolution des références forward dans les schémas Pydantic
# Doit être fait après l'import de tous les modules
try:
    from app.schemas.project import _update_forward_refs
    _update_forward_refs()
except Exception as e:
    # Si le rebuild échoue, on log l'erreur mais on continue
    # Pydantic résoudra automatiquement lors de la première utilisation si nécessaire
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Could not rebuild forward refs: {e}")

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


# Handler pour les erreurs de validation Pydantic
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handler personnalisé pour les erreurs de validation Pydantic.
    Log les erreurs et retourne une réponse JSON détaillée.
    """
    body = await request.body()
    logger.error(f"Erreur de validation pour {request.method} {request.url}")
    logger.error(f"Détails de l'erreur: {exc.errors()}")
    logger.error(f"Corps de la requête (premiers 500 caractères): {body[:500]}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body_preview": body[:500].decode("utf-8", errors="ignore")},
    )


# Inclusion du routeur API v1
app.include_router(api_router, prefix=settings.api_v1_str)

