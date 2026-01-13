from fastapi import APIRouter

from app.core.config import settings
from app.api.v1.endpoints import simulations

api_router = APIRouter()

# Inclure toujours les endpoints de calcul (ils ne nécessitent pas la base de données)
api_router.include_router(simulations.calculations_router)

# Inclure les routeurs d'authentification, de gestion et les endpoints CRUD de simulations
# seulement si la base de données est activée
if settings.enable_database:
    from app.api.v1.endpoints import auth, projects
    
    api_router.include_router(auth.router)
    api_router.include_router(projects.router)
    # Inclure les endpoints CRUD de simulations (nécessitent la base de données)
    api_router.include_router(simulations.router)


