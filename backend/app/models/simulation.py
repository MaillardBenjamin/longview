"""
Modèle de données pour les simulations de retraite.

Représente une simulation sauvegardée avec tous ses paramètres et résultats.
"""

from __future__ import annotations
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class Simulation(Base):
    """
    Modèle de simulation de retraite.
    
    Stocke les paramètres d'entrée et les résultats d'une simulation
    pour permettre leur sauvegarde et réutilisation.
    Une simulation appartient à un projet et peut aussi être liée directement à un utilisateur.
    """
    __tablename__ = "simulations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    current_age: Mapped[int] = mapped_column(Integer, nullable=False)
    retirement_age: Mapped[int] = mapped_column(Integer, nullable=False)
    life_expectancy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_monthly_income: Mapped[float | None] = mapped_column(Float, nullable=True)
    state_pension_monthly_income: Mapped[float | None] = mapped_column(Float, nullable=True)
    housing_loan_end_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dependents_departure_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    savings_allocation: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    additional_income_streams: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    inputs_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    results_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    owner: Mapped["User | None"] = relationship(back_populates="simulations")
    project: Mapped["Project | None"] = relationship(back_populates="simulations")

