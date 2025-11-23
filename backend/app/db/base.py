"""Import all SQLAlchemy models here so Alembic can detect them."""

from app.db.base_class import Base  # noqa: F401
from app.models import project, simulation, user  # noqa: F401

__all__ = ["Base", "project", "simulation", "user"]

