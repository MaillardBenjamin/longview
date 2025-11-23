"""add projects table and link to simulations

Revision ID: a1b2c3d4e5f6
Revises: d3ef4073169c
Create Date: 2025-01-15 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "d3ef4073169c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    
    # Créer la table projects
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
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
            name="fk_projects_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_projects"),
    )
    op.create_index("ix_projects_id", "projects", ["id"], unique=False)
    op.create_index("ix_projects_user_id", "projects", ["user_id"], unique=False)
    
    # Ajouter la colonne project_id à la table simulations
    op.add_column("simulations", sa.Column("project_id", sa.Integer(), nullable=True))
    op.create_index("ix_simulations_project_id", "simulations", ["project_id"], unique=False)
    op.create_foreign_key(
        "fk_simulations_project_id_projects",
        "simulations",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""
    
    # Supprimer la contrainte de clé étrangère et l'index pour project_id
    op.drop_constraint("fk_simulations_project_id_projects", "simulations", type_="foreignkey")
    op.drop_index("ix_simulations_project_id", table_name="simulations")
    op.drop_column("simulations", "project_id")
    
    # Supprimer la table projects
    op.drop_index("ix_projects_user_id", table_name="projects")
    op.drop_index("ix_projects_id", table_name="projects")
    op.drop_table("projects")


