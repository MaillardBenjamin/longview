"""create initial tables

Revision ID: d3ef4073169c
Revises: 
Create Date: 2025-11-10 09:07:07.239194

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "d3ef4073169c"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "simulations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("current_age", sa.Integer(), nullable=False),
        sa.Column("retirement_age", sa.Integer(), nullable=False),
        sa.Column("life_expectancy", sa.Integer(), nullable=True),
        sa.Column("target_monthly_income", sa.Float(), nullable=True),
        sa.Column("state_pension_monthly_income", sa.Float(), nullable=True),
        sa.Column("housing_loan_end_age", sa.Integer(), nullable=True),
        sa.Column("dependents_departure_age", sa.Integer(), nullable=True),
        sa.Column("savings_allocation", sa.JSON(), nullable=True),
        sa.Column("additional_income_streams", sa.JSON(), nullable=True),
        sa.Column("inputs_snapshot", sa.JSON(), nullable=True),
        sa.Column("results_snapshot", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_simulations_user_id_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_simulations"),
    )
    op.create_index("ix_simulations_id", "simulations", ["id"], unique=False)
    op.create_index("ix_simulations_user_id", "simulations", ["user_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index("ix_simulations_user_id", table_name="simulations")
    op.drop_index("ix_simulations_id", table_name="simulations")
    op.drop_table("simulations")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
