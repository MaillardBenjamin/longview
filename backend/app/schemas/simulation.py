from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, NonNegativeInt, PositiveInt


class SimulationBase(BaseModel):
    name: str = Field(max_length=255)
    current_age: PositiveInt
    retirement_age: PositiveInt
    life_expectancy: PositiveInt | None = None
    target_monthly_income: float | None = Field(default=None, ge=0)
    state_pension_monthly_income: float | None = Field(default=None, ge=0)
    housing_loan_end_age: NonNegativeInt | None = None
    dependents_departure_age: NonNegativeInt | None = None
    savings_allocation: dict[str, float] | None = None
    additional_income_streams: dict[str, float] | None = None
    inputs_snapshot: dict[str, Any] | None = None
    results_snapshot: dict[str, Any] | None = None
    is_active: bool | None = True


class SimulationCreate(SimulationBase):
    pass


class SimulationUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    target_monthly_income: float | None = Field(default=None, ge=0)
    state_pension_monthly_income: float | None = Field(default=None, ge=0)
    housing_loan_end_age: NonNegativeInt | None = None
    dependents_departure_age: NonNegativeInt | None = None
    savings_allocation: dict[str, float] | None = None
    additional_income_streams: dict[str, float] | None = None
    inputs_snapshot: dict[str, Any] | None = None
    results_snapshot: dict[str, Any] | None = None
    is_active: bool | None = None


class SimulationRead(SimulationBase):
    id: int
    user_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


