"""
Schémas Pydantic pour les projets de simulation.

Définit les structures de données pour la création, la mise à jour
et la lecture des projets via l'API.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.schemas.simulation import SimulationRead


class ProjectBase(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = Field(default=None, max_length=1000)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool | None = None


class ProjectRead(ProjectBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectWithSimulations(ProjectRead):
    """Projet avec ses simulations associées."""
    simulations: list["SimulationRead"] = []

    model_config = {"from_attributes": True}


# Résolution des références forward après l'import de simulation
# Cette fonction est appelée après que tous les modules soient chargés
def _update_forward_refs() -> None:
    """Met à jour les références forward pour ProjectWithSimulations."""
    # Import ici pour éviter les imports circulaires au moment de la définition
    # mais permettre la résolution au moment de l'appel
    from app.schemas.simulation import SimulationRead  # noqa: F401
    
    # Rebuild le modèle pour résoudre les références forward
    # Pydantic v2 résoudra automatiquement SimulationRead maintenant qu'il est importé
    ProjectWithSimulations.model_rebuild()



