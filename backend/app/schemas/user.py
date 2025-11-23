from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(
        min_length=8,
        max_length=72,  # Limite de bcrypt en bytes (72 bytes ≈ 72 caractères ASCII)
        description="Le mot de passe doit contenir entre 8 et 72 caractères"
    )


class UserUpdate(BaseModel):
    email: EmailStr | None = Field(default=None, description="Nouvelle adresse email")
    full_name: str | None = Field(default=None, max_length=255)
    password: str | None = Field(
        default=None,
        min_length=8,
        max_length=72,  # Limite de bcrypt en bytes
        description="Le mot de passe doit contenir entre 8 et 72 caractères"
    )


class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


